# Oracle Cloud infrastructure (Terraform)

Creates the one Always Free VM the backend runs on, its network, and the guardrails that keep the tenancy at $0. Nothing has been created yet; `terraform apply` is run only after the owner has approved the resource and cost plan. The full walkthrough is [docs/oracle-deployment.md](../../../docs/oracle-deployment.md).

## What `terraform apply` would create

| Resource | File | Notes |
|---|---|---|
| VCN, public subnet, internet gateway, route table | `network.tf` | The VCN's default security list is cut down to ICMP only. |
| Network security group | `network.tf` | SSH (22) from `admin_cidr` only. 80 and 443 only when `ingress_mode = "direct"`. Never 5432 or 6379. All egress. |
| One `VM.Standard.A1.Flex` instance | `compute.tf` | 2 OCPU, 12 GB, 100 GB boot volume, Ubuntu 24.04 ARM64, ephemeral public IP. First boot is set up by `../cloud-init.yaml`. |
| Quota policy | `guardrails.tf` | Caps A1 at 2 OCPU / 12 GB and block storage at 200 GB / 5 backups for the whole tenancy. On by default. |
| Budget and two alert rules | `guardrails.tf` | Only when `budget_alert_email` is set. |

Not created: block volumes, load balancers, reserved public IPs, backups.

The limits are enforced in `variables.tf`: more than 2 OCPUs, more than 12 GB of memory, a boot volume outside 50–200 GB, or `admin_cidr = "0.0.0.0/0"` are rejected before anything is sent to Oracle. The shape is fixed in `compute.tf` and is not a variable. The VM is refused in any region other than the tenancy's home region.

## Before you start

1. Terraform 1.9 or newer and the OCI CLI (`brew install oci-cli`).
2. A browser sign-in, which creates a one-hour session token (**needs your Oracle Cloud credentials**):

   ```bash
   oci session authenticate --profile-name DEFAULT --region <home region>
   ```

3. A discovery report that ends in **YES**:

   ```bash
   ../oci-discovery.sh DEFAULT
   ```

4. **The owner's approval** of the resource list at the end of that report.

## Steps

```bash
cd infrastructure/oracle/terraform
cp terraform.tfvars.example terraform.tfvars   # then fill it in
terraform init
terraform plan -out=bonanza.tfplan             # read it: it must list only the resources above
terraform apply bonanza.tfplan                 # creates the resources
terraform output                               # public IP, SSH command, cost summary
```

`terraform.tfvars` needs the tenancy OCID and home region (both printed by the discovery script), your public IP address as `admin_cidr`, and your SSH public key.

If the session token expires in the middle (after one hour), run `oci session refresh --profile DEFAULT` and repeat the command.

## State

State is local: there is no `backend` block. After the first apply, `terraform.tfstate` appears in this directory.

- It is gitignored (`*.tfstate`, `*.tfstate.*`, `*.tfvars`, `*.tfplan`, `.terraform/`). Do not commit it.
- It is the only record that ties this configuration to the real resources. Keep a copy somewhere safe, for example in a password manager or an encrypted backup. If it is lost, Terraform can no longer manage or destroy what it created; the resources would have to be removed by hand in the Oracle console or re-imported.
- `.terraform.lock.hcl` is not secret and should be committed. It pins the provider version.

## If the apply fails

| Message | What to do |
|---|---|
| `Out of host capacity` | Oracle has no free A1 host right now. Try again later, or set `availability_domain_index` to another value if the region has more than one availability domain. Do not change the shape. Stop and report if it keeps failing. |
| Authorization error on `oci_limits_quota` or `oci_budget_budget` | Quotas and budgets need tenancy-administrator rights. Sign in as an administrator, or set `manage_quotas = false` / `budget_alert_email = ""` and create them later. Without the quota there is no hard cap. |
| `region must be the tenancy's home region` | Set `region` to the home region shown by the discovery script. |
| `401` / `NotAuthenticated` | The session token expired. `oci session refresh --profile DEFAULT`, or sign in again. |
| Launch rejected because of in-transit encryption | Set `enable_pv_encryption_in_transit = false` and apply again. |

## Changing things later

- **Opening or closing web ports:** change `ingress_mode` and apply. Only the network security group rules change; the VM is not touched. The host firewall and the Compose profile are changed on the VM (see the deployment guide).
- **Your IP address changed:** update `admin_cidr` and apply.
- **Image and cloud-init:** the VM ignores later changes to both on purpose (`lifecycle.ignore_changes` in `compute.tf`), because applying them means replacing the VM, and the VM holds the database.

## Rebuilding the VM

Replacing the instance deletes its boot volume and everything on it, including the database. Do it only with a verified backup ([docs/backup-and-restore.md](../../../docs/backup-and-restore.md)):

```bash
terraform apply -replace=oci_core_instance.vm
```

The new VM gets a new public IP address.

## Tearing everything down

```bash
terraform destroy
```

This deletes the VM, its boot volume and all data on it, the network, the quota policy and the budget. Off-site backups in Cloudflare R2 are not affected.

## Validation

```bash
terraform fmt -check
terraform init -backend=false && terraform validate
```
