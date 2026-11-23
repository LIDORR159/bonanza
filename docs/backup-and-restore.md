# Backups, restore drills and disaster recovery

The store's data lives in one PostgreSQL database on one virtual machine. This guide covers how that database is backed up, how to prove a backup works, and how to get the store back after losing the machine.

**Nothing described here is running yet.** The scripts are in `infrastructure/ops`; they start working once the VM exists and the setup below has been done. Creating the VM is covered in [oracle-deployment.md](oracle-deployment.md).

Steps that need a secret only the owner has are marked **[Credentials]**. Steps that must not be done without the owner's say-so are marked **[Owner approval]**.

## What the owner has to do

1. **Do the one-time setup** below, once the VM exists.
2. **Keep three things somewhere that is not the VM**, for example in a password manager:
   - the restic repository password,
   - the contents of `/opt/bonanza/backup.env` (where the backups are and the keys to reach them),
   - a copy of Terraform's `terraform.tfstate`.

   Without the password the backups cannot be decrypted by anyone. There is no recovery path for a lost password.
3. **Act on alerts.** A backup older than 26 hours or a restore check older than 8 days raises one.
4. **Rehearse the disaster recovery procedure once** before the store takes real orders. It has not been timed.

## What is backed up

| What | How | When |
|---|---|---|
| The PostgreSQL database `bonanza`: products, prices, stock, orders, customers, promotions and all site content | `pg_dump` in custom format, sent straight into an encrypted restic snapshot tagged `postgres` | Daily at 02:30 Israel time |
| The files needed to rebuild the server: `compose.yaml`, `Caddyfile`, `.env`, `images.env` | A second restic snapshot tagged `config` | In the same run |

## What is not backed up, and why

| What | Why | What losing the VM means |
|---|---|---|
| Redis | It holds queues, events, locks and admin sessions, not business data. | Staff sign in again. Background jobs that had not run yet are lost. |
| Product and content images | They are stored in Cloudflare R2, not on the VM. | Nothing; they are not on the VM. These scripts do not make a second copy of them. |
| `backup.env`, the restic password, `ops.env` | The keys to the backup cannot be kept only inside the backup. | You re-create them from your password manager. This is why item 2 above matters. |
| Container images | They are in the container registry. `images.env`, which is backed up, records exactly which ones were running. | They are pulled again. |
| The operating system and its setup | Reproducible: Terraform creates the VM and cloud-init configures it. | Rebuilt by `terraform apply`. |
| TLS certificates held by Caddy (`direct` mode) | Caddy obtains them again by itself. | A short delay on first start. |
| Terraform state | It is on the owner's machine, not on the VM. | Keep your own copy (item 2). |

## Where backups go, and why not on Oracle

Backups go to a private Cloudflare R2 bucket through restic. restic encrypts everything on the VM before upload, so the bucket holds only ciphertext; the password never leaves the VM and your password manager.

They are kept off Oracle on purpose. The failures this protects against are losing the VM, its disk, or access to the whole Oracle account: an Always Free instance can be reclaimed, and there is one VM with one disk. A backup stored on the same disk or in the same account would be lost in the same event. Oracle's own volume backups are not used.

## Retention

| Kept | How many |
|---|---|
| Daily snapshots | 7 |
| Weekly snapshots | 4 |
| Monthly snapshots | 6 |

The database and the configuration are counted separately. While fewer snapshots exist than the policy allows (the first six months), restic also keeps the oldest one. Data that no snapshot needs any more is deleted from the bucket in the same run.

Once every 7 days the backup run also checks the repository (`restic check`) and re-reads a random 5% of the stored data.

`pg_dump`'s custom format is compressed, so each daily dump is stored almost in full rather than as a small difference from the previous day. Expect the bucket to hold roughly the size of one dump times the number of snapshots kept.

## How a backup run works

`backup.sh` does the following and exits non-zero if any part fails:

1. Opens the repository. On the very first run it creates it.
2. Dumps the database into a snapshot. Nothing is written to the VM's disk.
3. Backs up the four configuration files.
4. Applies the retention policy and prunes.
5. Runs the weekly check if it is due.
6. Writes the time to `/opt/bonanza/state/last-backup`. This happens only if everything above succeeded, and it is what the alerting watches.

**A failed dump is never kept as a backup.** How that is guaranteed depends on the restic version:

- restic 0.17 and newer can run `pg_dump` itself (`--stdin-from-command`) and saves nothing if `pg_dump` fails.
- Ubuntu 24.04 packages restic 0.16, which cannot. There the dump is piped into restic, and the snapshot is first saved under a temporary `pending-...` tag. It is renamed to `postgres` only after `pg_dump` has reported success. If `pg_dump` fails, the pending snapshot is deleted and the run fails. Restores and restore checks only ever look at snapshots tagged `postgres`.

The script picks the first method when the installed restic supports it and the second otherwise. On the VM as built by cloud-init that is the second.

## One-time setup

On the VM, as `bonanza`, after `infrastructure/ops/systemd/install.sh` has run (see [oracle-deployment.md](oracle-deployment.md#7-install-the-application-files-and-the-ops-timers)).

1. **[Credentials]** At Cloudflare, create a private R2 bucket for backups and an API token that can read and write objects in that bucket only. Do not reuse the key the application uses for product images.

2. Create the repository password and **store it in your password manager now**:

   ```bash
   (umask 077; openssl rand -base64 32 > /opt/bonanza/restic-password)
   cat /opt/bonanza/restic-password
   ```

3. **[Credentials]** Edit `/opt/bonanza/backup.env`. Every variable is explained in the file. The required ones:

   | Variable | Value |
   |---|---|
   | `RESTIC_REPOSITORY` | `s3:https://<ACCOUNT_ID>.r2.cloudflarestorage.com/<bucket>/<path>` |
   | `RESTIC_PASSWORD_FILE` | `/opt/bonanza/restic-password` |
   | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | The R2 API token's key pair |

   The file must stay at mode 600. The scripts refuse to run otherwise. Store a copy of its contents in your password manager too.

4. Take the first backup and prove it restores:

   ```bash
   /opt/bonanza/ops/backup.sh
   /opt/bonanza/ops/restore-verify.sh
   ```

From then on the timers do both: the backup daily at 02:30, the restore check every Sunday at 04:30.

## Everyday commands

All as user `bonanza` on the VM.

| To | Run |
|---|---|
| Take a backup now | `/opt/bonanza/ops/backup.sh` |
| Take a backup and check the repository now | `/opt/bonanza/ops/backup.sh --check` |
| See when the last backup succeeded | `cat /opt/bonanza/state/last-backup` |
| Read the last backup's log | `journalctl -u bonanza-backup.service -n 100` |
| See when the timers run next | `systemctl list-timers 'bonanza-*'` |
| List the database snapshots | `/opt/bonanza/ops/restore.sh --list` |

To use restic directly, load the settings first:

```bash
cd /opt/bonanza
set -a; . ./backup.env; set +a
restic snapshots --host bonanza
```

## Restore drill

```bash
/opt/bonanza/ops/restore-verify.sh
```

This proves that the newest backup can be turned back into a working database. It never touches the live database.

1. It downloads the newest `postgres` snapshot into a private temporary directory.
2. It starts a throwaway PostgreSQL container on a Docker network of its own, with no published port and no connection to the application.
3. It loads the dump, stopping at the first error.
4. It checks that the tables `product`, `order`, `customer` and `region` exist and that the migrations table is not empty, and prints the row counts. Read them: a restore that "works" but shows 0 products is not a good backup.
5. It removes the container, its data and the temporary files, whether it passed or failed.
6. If everything passed, it writes the time to `/opt/bonanza/state/last-restore-verify`.

To check a specific snapshot, pass its ID: `restore-verify.sh <snapshot-id>`.

## Restoring the live database

**[Owner approval]** This replaces the live database. Everything written since the chosen backup was taken (orders, customers, stock changes) will be missing afterwards.

```bash
/opt/bonanza/ops/restore.sh --list                 # see what is available
/opt/bonanza/ops/restore.sh                        # restore the newest snapshot
/opt/bonanza/ops/restore.sh --snapshot <id>        # restore a specific one
```

The script shows what it is about to do and waits for you to type `RESTORE`. It refuses to run without that. For non-interactive use there is `--yes-i-am-sure`.

What it does:

1. Downloads the dump and checks that it is readable. Nothing has changed yet.
2. Stops `medusa-server`, `medusa-worker` and `storefront`.
3. Loads the dump into a new database beside the live one. If that fails, the new database is dropped, the application is started again on the untouched live database, and the script reports failure.
4. Swaps the two databases in one transaction. The database that was live is kept under the name `bonanza_before_restore_<time>`.
5. Starts the application again and waits for it to be healthy.

Afterwards:

- The kept copy is your way back if the restore turns out to be a mistake. It uses disk space and is not backed up. Drop it when you are sure; the script prints the exact command.
- Redis is not touched. If you restored to an earlier point in time, queued jobs may refer to records that no longer exist.
- If payments were taken after the backup, the payment provider has orders that the store no longer knows about. Reconcile them by hand from the provider's records.

## Disaster recovery after losing the VM

Use this when the VM is gone or unusable: terminated, reclaimed, disk lost.

### What you need

- Your Oracle Cloud sign-in and the Terraform directory with its `terraform.tfstate`.
- Your admin SSH key.
- From your password manager: the restic password and the contents of `backup.env`.

### How much is lost, and how long it takes

**Data loss (RPO): up to 24 hours.** Backups are daily. Everything written after the last successful backup is gone: in the worst case a full day of orders, customer registrations and stock changes. If the last night's backup had failed, it is up to 48 hours; the 26-hour alert exists so that this does not go unnoticed. Payments taken in that window still exist at the payment provider and have to be reconciled by hand.

**Time to recover (RTO): not measured, and not guaranteed.** The steps below are short. What decides the real time is:

- **Whether Oracle has Ampere A1 capacity** in the home region when you ask. This can take minutes or days and is outside your control. The home region cannot be changed.
- Whether the person with the credentials is available.
- The size of the database (download and load time).
- Whether the container registry and Cloudflare are reachable.

There is no standby machine. Until the steps are finished, the store is down.

### Steps

1. **[Sign-in]** **Rebuild the VM.** Sign in (`oci session authenticate`), run the discovery script, then from `infrastructure/oracle/terraform`:

   ```bash
   terraform plan -out=bonanza.tfplan     # shows the instance to be created again
   terraform apply bonanza.tfplan
   ```

   If the broken instance still exists in Oracle, replace it instead: `terraform apply -replace=oci_core_instance.vm`. Either way the new VM has a **new public IP address**. Check the first boot as in [oracle-deployment.md](oracle-deployment.md#6-check-the-first-boot).

2. **Install the ops scripts** on the new VM:

   ```bash
   scp -r infrastructure/ops bonanza@<new ip>:/tmp/ops      # from your machine
   /tmp/ops/systemd/install.sh && rm -r /tmp/ops            # on the VM
   ```

3. **[Credentials]** **Put the backup settings back** from your password manager:

   ```bash
   (umask 077; cat > /opt/bonanza/restic-password)    # paste the password, Enter, Ctrl-D
   nano /opt/bonanza/backup.env                       # paste the saved contents
   chmod 600 /opt/bonanza/backup.env /opt/bonanza/restic-password
   ```

4. **Restore the configuration files** from the newest `config` snapshot. They land directly in `/opt/bonanza`:

   ```bash
   cd /opt/bonanza
   set -a; . ./backup.env; set +a
   restic restore latest --host bonanza --tag config --target /opt/bonanza
   ls -la compose.yaml Caddyfile .env images.env
   ```

5. **Restore the database.** The script starts PostgreSQL by itself, loads the newest backup and swaps it in:

   ```bash
   /opt/bonanza/ops/restore.sh
   ```

   It reports that no application services were running; that is expected here.

6. **Redeploy the exact images that were running**, as recorded in the restored `images.env` (**[Credentials]** if the registry needs a sign-in: `docker login ghcr.io` first):

   ```bash
   cd /opt/bonanza
   . ./images.env
   ./ops/deploy.sh "$BACKEND_IMAGE" "$STOREFRONT_IMAGE"
   ```

   This runs the migrations (bringing the restored database up to what those images expect), starts everything and waits for it to be healthy.

7. **Reconnect the outside world.**
   - `tunnel` mode: the tunnel's credentials are in the restored `.env`, so `cloudflared` connects out again from the new VM.
   - `direct` mode: the IP address has changed, so any hostname built from it (such as an `sslip.io` name) has changed too. Update `.env` and start the stack again.
   - Add the CI deploy key to `/home/bonanza/.ssh/authorized_keys` again ([oracle-deployment.md](oracle-deployment.md#deployments-from-ci)).

8. **Confirm that protection is back:**

   ```bash
   /opt/bonanza/ops/backup.sh
   /opt/bonanza/ops/restore-verify.sh
   /opt/bonanza/ops/healthwatch.sh --test-alert
   ```

9. **Clean up.** Step 5 left the new VM's empty starter database behind as `bonanza_before_restore_<time>`. Drop it with the command the script printed. Then work out what was lost between the last backup and the failure, starting with the payment provider's records.

## How alerts work

`healthwatch.sh` runs every 5 minutes and sends alerts to the webhook set as `ALERT_WEBHOOK_URL` in `/opt/bonanza/ops.env` (Slack, Discord and ntfy formats are supported; see the header of the script).

For backups it raises:

| Condition | Severity |
|---|---|
| No successful backup for more than 26 hours, or none recorded at all | Critical |
| No successful restore check for more than 8 days, or none recorded at all | Warning |

It also watches the Compose services, disk space, memory and overdue reboots.

You get one alert when a problem appears, one reminder every 24 hours while it lasts, and one message when it is resolved. It does not repeat itself every 5 minutes. With no webhook configured, results go only to the journal: `journalctl -u bonanza-healthwatch.service -n 50`.

What the alerts cannot tell you:

- **That the whole VM is down or gone.** The watcher runs on the VM. If the VM disappears, nothing is sent. An outside uptime check is needed for that and is not part of these files.
- **That the webhook is wrong.** Test it after setup and after any change: `healthwatch.sh --test-alert`.
- **That a backup is logically wrong** in a way the checks do not look for. The restore check proves the dump loads and the core tables are there; it does not compare the contents with the live store.

## No high availability

Always Free gives one VM, with one disk, in one availability domain. There is no replica, no automatic failover and no second copy of the running database.

- If the VM or its disk fails, the store is down until it is rebuilt and restored, and up to a day of data is lost.
- Planned restarts also take the store down briefly: the 03:30 reboot after a security update, and the moment during a deployment when containers are replaced.

Narrowing either gap (more frequent backups, a standby database, a second machine) means going beyond what this setup provides, and in most cases beyond what is free.
