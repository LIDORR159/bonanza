# ── Account ──────────────────────────────────────────────────────────────────

variable "tenancy_ocid" {
  description = "OCID of the tenancy (root compartment). Printed by infrastructure/oracle/oci-discovery.sh."
  type        = string

  validation {
    condition     = can(regex("^ocid1\\.tenancy\\.", var.tenancy_ocid))
    error_message = "tenancy_ocid must start with \"ocid1.tenancy.\"."
  }
}

variable "compartment_ocid" {
  description = "Compartment to create the resources in. Leave null to use the root compartment (the tenancy)."
  type        = string
  default     = null

  validation {
    condition     = var.compartment_ocid == null || can(regex("^ocid1\\.(compartment|tenancy)\\.", var.compartment_ocid))
    error_message = "compartment_ocid must start with \"ocid1.compartment.\" or \"ocid1.tenancy.\"."
  }
}

variable "region" {
  description = "Region identifier, for example il-jerusalem-1. It must be the tenancy's HOME region: Always Free Ampere A1 capacity exists only there. compute.tf refuses to create the VM anywhere else."
  type        = string

  validation {
    condition     = can(regex("^[a-z]{2,3}(-[a-z]+)+-[0-9]+$", var.region))
    error_message = "region must be a region identifier such as il-jerusalem-1."
  }
}

variable "oci_profile" {
  description = "Profile in ~/.oci/config that holds the session token created by `oci session authenticate`."
  type        = string
  default     = "DEFAULT"
}

# ── Naming ───────────────────────────────────────────────────────────────────

variable "name_prefix" {
  description = "Prefix for resource names. Also used as the VM's hostname."
  type        = string
  default     = "bonanza"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,14}$", var.name_prefix))
    error_message = "name_prefix must be 2-15 characters: lowercase letters, digits and hyphens, starting with a letter."
  }
}

# ── Network ──────────────────────────────────────────────────────────────────

variable "vcn_cidr" {
  description = "IPv4 range of the VCN. The default avoids the ranges Docker allocates container networks from (172.16.0.0/12 and 192.168.0.0/16)."
  type        = string
  default     = "10.20.0.0/16"

  validation {
    condition     = can(cidrhost(var.vcn_cidr, 0))
    error_message = "vcn_cidr must be a valid IPv4 CIDR block."
  }
}

variable "subnet_cidr" {
  description = "IPv4 range of the public subnet. Must sit inside vcn_cidr."
  type        = string
  default     = "10.20.1.0/24"

  validation {
    condition     = can(cidrhost(var.subnet_cidr, 0))
    error_message = "subnet_cidr must be a valid IPv4 CIDR block."
  }
}

variable "admin_cidr" {
  description = "The only IPv4 range allowed to reach SSH (port 22). Use your own public address as a /32, for example 203.0.113.7/32. The whole internet (0.0.0.0/0) is rejected."
  type        = string

  validation {
    condition     = can(regex("^[0-9]{1,3}(\\.[0-9]{1,3}){3}/[0-9]{1,2}$", var.admin_cidr)) && can(cidrhost(var.admin_cidr, 0))
    error_message = "admin_cidr must be a valid IPv4 CIDR block such as 203.0.113.7/32."
  }

  validation {
    # Catches 0.0.0.0/0 and every other spelling of "any address" (x.x.x.x/0).
    condition     = try(tonumber(split("/", var.admin_cidr)[1]), 0) > 0
    error_message = "admin_cidr must not be 0.0.0.0/0 (or any /0 range): SSH is never opened to the whole internet. Use your own address as a /32."
  }
}

variable "ingress_mode" {
  description = "How web traffic reaches the VM. \"tunnel\" (default): Cloudflare Tunnel, no inbound web ports at all. \"direct\": TCP 80 and 443 open to the internet, for temporary testing before the domain is on Cloudflare."
  type        = string
  default     = "tunnel"

  validation {
    condition     = contains(["tunnel", "direct"], var.ingress_mode)
    error_message = "ingress_mode must be \"tunnel\" or \"direct\"."
  }
}

# ── Compute (Always Free limits are enforced here) ───────────────────────────

variable "ocpus" {
  description = "OCPUs for the VM. The Always Free Ampere A1 allowance is 2 OCPUs in total, so anything above 2 is rejected."
  type        = number
  default     = 2

  validation {
    condition     = var.ocpus >= 1 && var.ocpus <= 2 && floor(var.ocpus) == var.ocpus
    error_message = "ocpus must be 1 or 2. More than 2 OCPUs exceeds the Always Free Ampere A1 allowance and would be billed or refused."
  }
}

variable "memory_in_gbs" {
  description = "Memory for the VM in GB. The Always Free Ampere A1 allowance is 12 GB in total, so anything above 12 is rejected."
  type        = number
  default     = 12

  validation {
    condition     = var.memory_in_gbs >= 1 && var.memory_in_gbs <= 12
    error_message = "memory_in_gbs must be between 1 and 12. More than 12 GB exceeds the Always Free Ampere A1 allowance and would be billed or refused."
  }
}

variable "boot_volume_size_in_gbs" {
  description = "Boot volume size in GB. Always Free covers 200 GB of boot and block volumes in total across the tenancy; the image needs about 50 GB at least."
  type        = number
  default     = 100

  validation {
    condition     = var.boot_volume_size_in_gbs >= 50 && var.boot_volume_size_in_gbs <= 200 && floor(var.boot_volume_size_in_gbs) == var.boot_volume_size_in_gbs
    error_message = "boot_volume_size_in_gbs must be a whole number between 50 and 200. Above 200 GB exceeds the Always Free block storage allowance."
  }
}

variable "availability_domain_index" {
  description = "Which availability domain to use, counted from 0 in the order OCI lists them. Change it if the launch fails with \"Out of host capacity\" and the region has more than one."
  type        = number
  default     = 0

  validation {
    condition     = var.availability_domain_index >= 0 && floor(var.availability_domain_index) == var.availability_domain_index
    error_message = "availability_domain_index must be a whole number, 0 or greater."
  }
}

variable "image_ocid" {
  description = "Pin the VM image by OCID. Leave null to use the newest Canonical Ubuntu 24.04 aarch64 platform image available for VM.Standard.A1.Flex."
  type        = string
  default     = null

  validation {
    condition     = var.image_ocid == null || can(regex("^ocid1\\.image\\.", var.image_ocid))
    error_message = "image_ocid must start with \"ocid1.image.\"."
  }
}

variable "ssh_public_key" {
  description = "One SSH PUBLIC key (the contents of an id_ed25519.pub file). Installed for the admin user \"bonanza\" and for the image's default user \"ubuntu\"."
  type        = string

  validation {
    condition = can(regex(
      "^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp(256|384|521)|sk-ssh-ed25519@openssh\\.com|sk-ecdsa-sha2-nistp256@openssh\\.com) [A-Za-z0-9+/=]+( [A-Za-z0-9@._+-]+)*$",
      trimspace(var.ssh_public_key)
    ))
    error_message = "ssh_public_key must be a single OpenSSH public key on one line, for example \"ssh-ed25519 AAAA... you@laptop\". Never paste a private key here."
  }
}

variable "enable_pv_encryption_in_transit" {
  description = "Encrypt traffic between the VM and its boot volume. Leave true unless the launch is rejected because the image or shape does not support it."
  type        = bool
  default     = true
}

# ── Guardrails ───────────────────────────────────────────────────────────────

variable "manage_quotas" {
  description = "Create compartment quotas that cap Ampere A1 at 2 OCPU / 12 GB and block storage at 200 GB / 5 backups for the whole tenancy. Needs tenancy-administrator rights."
  type        = bool
  default     = true
}

variable "budget_alert_email" {
  description = "Email address for budget alerts. Empty (default) creates no budget. When set, a budget of 1 per month (in the tenancy's billing currency) is created on the tenancy with one alert on actual spend and one on forecast spend."
  type        = string
  default     = ""

  validation {
    condition     = var.budget_alert_email == "" || can(regex("^[^@\\s,;]+@[^@\\s,;]+\\.[^@\\s,;]+$", var.budget_alert_email))
    error_message = "budget_alert_email must be empty or a single email address."
  }
}
