# Hosting the backend on Oracle Cloud

The backend is designed to run on one Oracle Cloud "Always Free" virtual machine at $0 per month. This guide is the procedure for creating that machine and preparing it to run the store.

**Nothing described here exists yet.** No Oracle resource has been created. The files under `infrastructure/oracle` and `infrastructure/ops` are ready to be used; creating anything waits for the owner's approval in [step 4](#4-approval-gate).

Three kinds of steps need a person and are marked like this throughout:

- **[Sign-in]** opens a browser and asks you to sign in to Oracle Cloud.
- **[Credentials]** needs a secret that only the owner has (a key, a token, a password).
- **[Owner approval]** must not be done until the owner has said yes.

## The steps at a glance

| # | Step | Needs |
|---|---|---|
| 1 | Install the tools and prepare an SSH key | |
| 2 | Sign in to Oracle Cloud from the command line | **[Sign-in]** |
| 3 | Run the discovery script and read its verdict | |
| 4 | Approve the resource and cost plan | **[Owner approval]** |
| 5 | Create the resources with Terraform | **[Sign-in]** |
| 6 | Check the first boot | |
| 7 | Install the application files and the ops timers | **[Credentials]** |
| 8 | Choose how web traffic gets in (tunnel or direct) | |

Steps 1 to 3 change nothing in the cloud account. Step 5 is the first one that creates anything.

## 1. Prerequisites

On your own machine:

```bash
brew install oci-cli jq      # Terraform 1.9 or newer is also required
```

An SSH key for administering the VM. Create one if you do not have one you want to use:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/bonanza_admin -C "bonanza-admin"
```

You will also need:

- An Oracle Cloud account. The user you sign in with should be a tenancy administrator; the quota and budget guardrails cannot be created otherwise.
- Your current public IPv4 address, because SSH will be allowed from that address only: `curl -4 https://ifconfig.me`

## 2. Sign in

**[Sign-in]**

```bash
oci session authenticate --profile-name DEFAULT --region <region>
```

A browser window opens. After you sign in, the command stores a session token under `~/.oci`. No long-lived API key is created.

- For `<region>`, use the region shown at the top of the Oracle Cloud console, for example `il-jerusalem-1`. The discovery script tells you whether it is your home region.
- The token lasts one hour. `oci session refresh --profile DEFAULT` extends it, for up to 24 hours in total. After that, sign in again.

## 3. Run discovery and read the verdict

```bash
./infrastructure/oracle/oci-discovery.sh DEFAULT
```

The script only reads. It contains nothing but `list`, `get` and `search` calls.

It prints the tenancy name, the home region, the availability domains, every instance, volume and public IP that already exists in any compartment, the Ampere A1 limits, and the block storage in use. Then it gives a verdict:

| Verdict | Meaning | What to do |
|---|---|---|
| `YES` | The planned VM fits inside the Always Free allowance according to the limits and what is already in the tenancy. | Go to step 4. |
| `NO` | Something already uses the allowance, or the limits leave no room. The reason is printed. | Stop. Remove what is named, or change the plan, and run the script again. |
| `UNKNOWN` | Some facts could not be read, usually because the signed-in user lacks permission. Each one is listed. | Stop. Sign in as a tenancy administrator and run it again. |

Three things in the report matter beyond the verdict:

- **The home region is permanent.** It was fixed when the account was created. Always Free Ampere A1 instances can be created only there. Note it; Terraform needs it.
- **Anything already listed under instances or volumes** counts against the same allowance. A forgotten test VM is the usual reason for a `NO`.
- **`YES` is about limits, not capacity.** Oracle can still refuse the launch with "Out of host capacity". See [Risks](#risks-and-what-to-do-about-them).

If the script says the session has expired, repeat step 2.

## 4. Approval gate

**[Owner approval]** Nothing is created until the owner has read this section and agreed.

### What would be created

| Resource | Size | Expected monthly cost | Why it is free |
|---|---|---|---|
| 1 virtual machine, `VM.Standard.A1.Flex` (ARM64), Ubuntu 24.04 | 2 OCPU, 12 GB memory | $0 | The Always Free Ampere A1 allowance is 2 OCPU and 12 GB in total. This uses all of it. |
| 1 boot volume | 100 GB, Balanced performance | $0 | Always Free covers 200 GB of boot and block volumes in total. |
| 1 VCN, public subnet, internet gateway, route table, network security group | | $0 | These have no price-list item. |
| 1 ephemeral public IPv4 address | | $0 expected | No charge was found for it, but this was not verified against 2026 pricing. Check the first invoice or Cost Analysis after a few days. |
| 1 quota policy | | $0 | Caps the whole tenancy at the free amounts. See below. |
| 1 budget with two alert rules (optional) | 1 per month in the tenancy's billing currency | $0 | Created only if you give an email address. |
| Outbound data | | $0 up to 10 TB per month | |

**Expected total: $0 per month**, as long as this VM is the only Ampere A1 instance and its boot volume the only volume in the tenancy.

Not created: block volumes, load balancers, reserved public IP addresses, volume backups, managed databases, object storage.

Costs outside Oracle (Cloudflare, the domain) are covered in `cost-estimate.md`.

### What would cause a charge

- A second Ampere A1 instance, or more than 2 OCPU / 12 GB of A1 in total.
- Any instance with a shape that is not Always Free.
- More than 200 GB of boot and block volumes in total, or a volume set to a higher performance level than Balanced.
- More than 5 volume backups.
- Any resource created outside the home region.
- Anything not in the table above: load balancers, reserved IPs, databases and so on.
- More than 10 TB of outbound data in a month.
- Removing the quota policy on a Pay As You Go tenancy.

On a Pay As You Go tenancy everything above the free amounts is billed automatically, which is why the quota policy matters most there.

### The two guardrails

| Guardrail | What it does | How strong |
|---|---|---|
| Quota policy (`manage_quotas = true`, the default) | Oracle refuses any request that would take the tenancy above 2 A1 OCPUs, 12 GB of A1 memory, 200 GB of block storage or 5 volume backups. | A hard cap. It applies to every user and every tool. |
| Budget alerts (`budget_alert_email`) | Emails you when actual spend goes above 0.01, or when the forecast for the month reaches the budget of 1. | A warning only. Oracle evaluates budgets about once every 24 hours, so the email can arrive a day late, and a budget stops nothing. |

Both need tenancy-administrator rights.

### What the owner confirms

- [ ] The discovery verdict is `YES`.
- [ ] The resource table above is what should be created, in the home region.
- [ ] `ingress_mode`: `tunnel` (no public web ports) or `direct` (ports 80 and 443 open, for temporary testing). See [step 8](#8-the-two-ingress-modes).
- [ ] The IP address that may use SSH (`admin_cidr`).
- [ ] Whether to create budget alerts, and to which email address.

## 5. Create the resources with Terraform

**[Owner approval]** required first. **[Sign-in]**: the session from step 2 must still be valid.

```bash
cd infrastructure/oracle/terraform
cp terraform.tfvars.example terraform.tfvars
```

Fill in `terraform.tfvars`:

| Variable | Value |
|---|---|
| `tenancy_ocid` | Printed by the discovery script. |
| `region` | The home region printed by the discovery script. |
| `admin_cidr` | Your public IPv4 address followed by `/32`. `0.0.0.0/0` is rejected. |
| `ssh_public_key` | The contents of `~/.ssh/bonanza_admin.pub`. Never the private key. |
| `ingress_mode` | `tunnel` or `direct`, as approved. |
| `budget_alert_email` | The approved address, or empty. |

Then:

```bash
terraform init
terraform plan -out=bonanza.tfplan
```

Read the plan before going on. With `ingress_mode = "tunnel"`, quotas on and no budget it must say **10 to add, 0 to change, 0 to destroy**: the VCN, internet gateway, route table, default security list, subnet, network security group, two security rules (SSH in, everything out), the quota policy and the instance. A budget adds 3 (the budget and two alert rules). `direct` mode adds 2 (the rules for ports 80 and 443). If the plan lists anything else, stop.

```bash
terraform apply bonanza.tfplan
terraform output
```

`terraform output` shows the public IP address, the SSH command and a summary of what was created and its expected cost.

The configuration cannot create a larger or different machine by mistake: more than 2 OCPUs, more than 12 GB, a boot volume outside 50–200 GB, or a region other than the home region are rejected before anything is sent to Oracle, and the shape is not configurable.

**Keep `terraform.tfstate` safe.** It appears in this directory after the apply. It is gitignored and exists only on your machine, and it is what lets Terraform change or remove these resources later. Store a copy somewhere that is not this laptop.

If the apply fails, see the table in `infrastructure/oracle/terraform/README.md`. For "Out of host capacity", see [Risks](#risks-and-what-to-do-about-them).

## 6. Check the first boot

The VM configures itself on first boot from `infrastructure/oracle/cloud-init.yaml`. Give it a few minutes, then sign in from the address you set as `admin_cidr`:

```bash
ssh -i ~/.ssh/bonanza_admin bonanza@<public ip>
cloud-init status --wait        # waits until the first-boot setup has finished
```

Check the result:

| Command | Expected |
|---|---|
| `cloud-init status --long` | `status: done`, no errors |
| `sudo tail -n 3 /var/log/cloud-init-output.log` | A line saying `BONANZA first-boot setup complete` |
| `docker --version && docker compose version` | Both print a version |
| `docker info --format '{{.LoggingDriver}} live-restore={{.LiveRestoreEnabled}}'` | `json-file live-restore=true` |
| `id` | The groups include `sudo` and `docker` |
| `ls -ld /opt/bonanza` | `drwx------ ... bonanza bonanza` |
| `swapon --show` | `/swapfile`, 2G |
| `sysctl vm.overcommit_memory` | `vm.overcommit_memory = 1` |
| `timedatectl \| grep "Time zone"` | `Asia/Jerusalem` |
| `sudo sshd -T \| grep -E "^(passwordauthentication\|permitrootlogin)"` | Both `no` |
| `systemctl is-active docker fail2ban unattended-upgrades` | `active` three times |
| `restic version && jq --version` | Both print a version |
| `sudo iptables -S INPUT` | In `tunnel` mode: no rule for port 80 or 443. In `direct` mode: an `ACCEPT` for each, above the final `REJECT`. |

If `cloud-init status` reports an error, read `/var/log/cloud-init-output.log`. The setup script is on the VM at `/usr/local/sbin/bonanza-first-boot.sh` and can be run again with `sudo`; each step checks before it changes anything.

What the first boot sets up:

- The admin user `bonanza`, with your SSH key, passwordless `sudo` and membership of the `docker` group. The image's own user `ubuntu` is kept with the same key as a second way in.
- SSH without passwords and without root sign-in; fail2ban on SSH.
- Docker Engine and the Compose plugin from Docker's own apt repository. Container logs are rotated (10 MB, 5 files). Docker listens on its local socket only.
- restic, jq, a 2 GB swap file, `vm.overcommit_memory=1` (for Redis), the `Asia/Jerusalem` time zone.
- Automatic Ubuntu security updates, with a reboot at 03:30 when one is needed.
- `/opt/bonanza`, owned by `bonanza`, mode 700.
- The host firewall is left as Oracle ships it, except in `direct` mode, where ports 80 and 443 are opened. **UFW is not used and must never be enabled on this VM**: Oracle's Ubuntu images manage the firewall with iptables rules in `/etc/iptables/rules.v4`, and enabling UFW on them can make the instance unbootable.

## 7. Install the application files and the ops timers

Everything on the VM lives in `/opt/bonanza` and belongs to the user `bonanza`.

### Application files

| File on the VM | Comes from |
|---|---|
| `/opt/bonanza/compose.yaml` | `infrastructure/docker/compose.prod.yaml` |
| `/opt/bonanza/Caddyfile` | The Caddy configuration kept with the Compose file |
| `/opt/bonanza/.env` | **[Credentials]** Application secrets and settings, mode 600. Also holds `COMPOSE_PROFILES` (`tunnel` or `direct`). |
| `/opt/bonanza/images.env` | Written by `deploy.sh`. Do not create it by hand. |

```bash
scp -i ~/.ssh/bonanza_admin infrastructure/docker/compose.prod.yaml bonanza@<public ip>:/opt/bonanza/compose.yaml
# copy the Caddyfile and create .env the same way, then on the VM:
chmod 600 /opt/bonanza/.env
```

### Ops scripts and timers

From your machine:

```bash
scp -i ~/.ssh/bonanza_admin -r infrastructure/ops bonanza@<public ip>:/tmp/ops
```

On the VM, as `bonanza`:

```bash
bash /tmp/ops/systemd/install.sh
rm -r /tmp/ops
```

The installer **uses `sudo`** for the systemd part. It copies the scripts to `/opt/bonanza/ops`, creates `/opt/bonanza/ops.env` and `/opt/bonanza/backup.env` from the examples if they do not exist (mode 600), and enables four timers:

| Timer | When | Runs |
|---|---|---|
| `bonanza-backup` | Daily, 02:30 Israel time | `backup.sh` |
| `bonanza-restore-verify` | Sunday, 04:30 | `restore-verify.sh` |
| `bonanza-healthwatch` | Every 5 minutes | `healthwatch.sh` |
| `bonanza-docker-prune` | Saturday, 05:30 | Removes unused images and build cache older than 7 days |

Run the installer again whenever the scripts change; it never overwrites the two settings files.

### Settings

**[Credentials]**

1. Fill in `/opt/bonanza/backup.env` and create the restic password file. This is described in [backup-and-restore.md](backup-and-restore.md#one-time-setup).
2. Put the alert webhook URL in `/opt/bonanza/ops.env` (`ALERT_WEBHOOK_URL`), then check that an alert arrives:

   ```bash
   /opt/bonanza/ops/healthwatch.sh --test-alert
   ```

### First deployment

```bash
/opt/bonanza/ops/deploy.sh <backend-image-ref> <storefront-image-ref>
```

Both references must be pinned by digest or by a commit tag, for example `ghcr.io/lidorr159/bonanza-backend@sha256:<digest>`. The script pulls the images, runs the database migrations, starts the stack and waits until every service is healthy. If the images are private, Docker on the VM has to be signed in to the registry first (**[Credentials]**: `docker login ghcr.io`).

Then take the first backup and prove it restores:

```bash
/opt/bonanza/ops/backup.sh
/opt/bonanza/ops/restore-verify.sh
systemctl list-timers 'bonanza-*'
```

### Deployments from CI

CI deploys over SSH with its own key, which is locked to a single script. Add one line to `/home/bonanza/.ssh/authorized_keys` (**[Credentials]**: the public half of the CI deploy key):

```
command="/opt/bonanza/ops/ssh-deploy-entrypoint.sh",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding ssh-ed25519 AAAA...the-deploy-public-key... bonanza-ci-deploy
```

With that key a client can do exactly two things:

```bash
ssh bonanza@<host> deploy ghcr.io/lidorr159/bonanza-backend@sha256:<digest> ghcr.io/lidorr159/bonanza-storefront@sha256:<digest>
ssh bonanza@<host> rollback
```

Anything else is refused, including other image names, the tag `latest`, and any attempt to get a shell.

**Open point.** The network rules in this repository allow SSH only from `admin_cidr`. A GitHub-hosted runner does not come from that address, so as things stand CI cannot reach port 22. How CI reaches the VM is settled in `github-actions.md`. Until then, run `deploy.sh` yourself over SSH.

## 8. The two ingress modes

| | `tunnel` (default) | `direct` |
|---|---|---|
| Meant for | Production | Temporary testing before the domain is on Cloudflare |
| How visitors reach the store | Cloudflare Tunnel: `cloudflared` on the VM connects out to Cloudflare | Straight to the VM's public IP address |
| Inbound web ports | None. Ports 80 and 443 are closed in the cloud network. | 80 and 443 open to the internet |
| Needs | The domain to be on Cloudflare | Nothing. A hostname such as `203-0-113-7.sslip.io` resolves to the IP address written in it, so no DNS setup is required. |
| Public IP address used for | SSH only | SSH and web traffic |

The mode is set in three places, which must agree:

| Where | Setting | Effect |
|---|---|---|
| `terraform.tfvars` | `ingress_mode` | Whether the cloud network security group has rules for 80 and 443. |
| The VM's host firewall | Set on first boot from the same variable | In `direct` mode, 80 and 443 are accepted in `/etc/iptables/rules.v4`. |
| `/opt/bonanza/.env` | `COMPOSE_PROFILES` | Which ingress containers Compose starts. |

Ports published by Docker containers are forwarded by the kernel and do not pass through the host's `INPUT` rules. For those ports the cloud network security group is the only barrier. This is why `tunnel` mode closes 80 and 443 there and not just on the host.

### Switching an existing VM

The first-boot setup does not run again by itself, so changing the mode later is done by hand.

From `tunnel` to `direct`:

1. **[Sign-in]** Set `ingress_mode = "direct"` in `terraform.tfvars`, then `terraform plan` and `terraform apply`. The plan must show 2 security rules to add and nothing else. The VM itself is not touched.
2. On the VM: `sudo /usr/local/sbin/bonanza-first-boot.sh direct`. This adds the two rules to the host firewall, reloads it and restarts the Docker daemon. Expect a few seconds of interruption. The script also repeats its other steps; they find everything in place, apart from restarting sshd and fail2ban, which does not end your session.
3. On the VM: set `COMPOSE_PROFILES=direct` in `/opt/bonanza/.env`, then from `/opt/bonanza`:

   ```bash
   docker compose --env-file .env --env-file images.env up -d --remove-orphans
   ```

4. Compose does not stop a container whose profile has been switched off, so `cloudflared` is still running. Remove it:

   ```bash
   docker compose --env-file .env --env-file images.env --profile tunnel rm --stop --force cloudflared
   ```

From `direct` back to `tunnel`: set `ingress_mode = "tunnel"` and apply (2 rules to destroy), which closes the ports at once. Then set `COMPOSE_PROFILES=tunnel` and run the same `docker compose ... up -d`. If the Compose file has services that exist only in the `direct` profile, remove them the same way with `--profile direct`. The two host firewall rules may stay; with the cloud rules gone they let nothing in.

## SSH access model

- Port 22 is open only to `admin_cidr`. It is the only inbound port in `tunnel` mode.
- Sign-in is by key only. Passwords and root sign-in are disabled. fail2ban bans an address for an hour after 5 failed attempts in 10 minutes.
- `bonanza` is the administrator: passwordless `sudo`, member of the `docker` group (which is equivalent to root on this machine). `ubuntu` is the image's default user and has the same key.
- The CI deploy key belongs to `bonanza` too, but can only run `ssh-deploy-entrypoint.sh` (see step 7).
- **If your IP address changes** you can no longer connect. **[Sign-in]** Update `admin_cidr` in `terraform.tfvars` and run `terraform apply`; only one security rule changes.
- The public IP address is ephemeral: it stays with the VM for as long as the VM exists, and changes if the VM is ever recreated.

## Security updates and reboots

- Ubuntu security updates are installed automatically every day (`unattended-upgrades`).
- When an update needs a reboot, the VM reboots at **03:30 Israel time**. The store is unavailable while it restarts. The containers come back on their own only if the services in the Compose file have a restart policy.
- The backup runs at 02:30, before that window.
- `healthwatch.sh` raises a warning if a required reboot is still pending after 26 hours.
- Docker Engine is not upgraded automatically. To upgrade it:

  ```bash
  sudo apt-get update && sudo apt-get install --only-upgrade docker-ce docker-ce-cli containerd.io docker-compose-plugin
  ```

- `deploy.sh` runs `docker compose pull` for every service. Third-party images whose tags move (PostgreSQL, Redis, Caddy) are therefore refreshed during a deployment, and a rollback does not undo that. Pin those images by digest in the Compose file if you want deployments to change only the application.

## Risks and what to do about them

### "Out of host capacity"

Oracle often has no free Ampere A1 host at the moment you ask. `terraform apply` then fails on the instance; the network and the quota policy may already have been created, which costs nothing.

1. Wait and run `terraform plan -out=bonanza.tfplan` and `terraform apply bonanza.tfplan` again. Capacity comes and goes.
2. If the region has more than one availability domain, set `availability_domain_index` to another value. `il-jerusalem-1` has only one.
3. Oracle's other documented remedy is upgrading the account to Pay As You Go; Always Free resources stay free after the upgrade. **[Owner approval]**: that is the owner's decision, because from then on anything above the free amounts is billed. Keep the quota policy in place.

If none of this works, **stop and report**. Do not substitute a paid shape. The Terraform configuration has no setting for one.

### Idle reclamation

Oracle may reclaim an Always Free instance when, over 7 days, all three of these are true: CPU use (95th percentile) below 20%, network use below 20%, and memory use below 20%.

A store with little traffic could meet all three. Staying above 20% on any one of them is enough to avoid it, and a running database, two Medusa processes and the storefront keep memory in use, but whether that exceeds 20% of 12 GB has not been measured. Watch the instance's metrics in the Oracle console during the first weeks. Nothing in these files generates artificial load.

Treat a reclaimed instance as a lost VM: rebuild it and restore from backup ([backup-and-restore.md](backup-and-restore.md#disaster-recovery-after-losing-the-vm)).

### No high availability

There is one VM, one disk and no standby. If the VM, its disk or its availability domain fails, the store is down until the VM is rebuilt and the last backup restored. See [backup-and-restore.md](backup-and-restore.md).

### The watcher runs on the machine it watches

`healthwatch.sh` runs on the VM. If the whole VM is down or gone, it cannot send an alert. These files do not include an outside uptime check; add one that requests the storefront from somewhere else.

## Tearing everything down

**[Owner approval]** **[Sign-in]** This deletes the VM and all data on it.

1. Make sure a recent backup exists and has been verified, if the data matters.
2. Run:

   ```bash
   cd infrastructure/oracle/terraform
   terraform destroy
   ```

   This removes the instance and its boot volume, the network, the quota policy and the budget.
3. Run `./infrastructure/oracle/oci-discovery.sh DEFAULT` again and confirm that no instance, volume or public IP is left.

Not removed by this: the backups in Cloudflare R2, anything configured at Cloudflare, and the local `terraform.tfstate` file.
