# Compute: exactly one Always Free Ampere A1 virtual machine.
#
# No extra block volumes, no load balancer and no reserved public IP are
# created. The VM gets an ephemeral public IPv4 address, which is released
# when the instance is terminated. In "tunnel" mode that address is used for
# SSH only.

# ── Lookups ──────────────────────────────────────────────────────────────────

data "oci_identity_availability_domains" "all" {
  compartment_id = var.tenancy_ocid
}

# Used to refuse a launch outside the home region (see the precondition below).
data "oci_identity_region_subscriptions" "all" {
  tenancy_id = var.tenancy_ocid
}

# Newest Canonical Ubuntu 24.04 aarch64 platform image that supports the A1
# shape. The display-name filter keeps the "Minimal" variants out.
data "oci_core_images" "ubuntu" {
  compartment_id           = var.tenancy_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04"
  shape                    = local.shape
  state                    = "AVAILABLE"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"

  filter {
    name   = "display_name"
    values = ["^Canonical-Ubuntu-24\\.04-aarch64-[0-9.]+-[0-9]+$"]
    regex  = true
  }
}

locals {
  # The only shape this configuration can create. It is not a variable on
  # purpose: a paid shape must never be substituted when A1 capacity is short.
  shape = "VM.Standard.A1.Flex"

  availability_domain = try(
    data.oci_identity_availability_domains.all.availability_domains[var.availability_domain_index].name,
    null
  )

  home_region = one([
    for r in data.oci_identity_region_subscriptions.all.region_subscriptions : r.region_name if r.is_home_region
  ])

  image_id = var.image_ocid != null ? var.image_ocid : try(data.oci_core_images.ubuntu.images[0].id, null)

  # Name of the first-boot admin user. cloud-init.yaml and the ops scripts
  # assume this name; do not change one without the others.
  admin_user = "bonanza"
}

# ── The VM ───────────────────────────────────────────────────────────────────

resource "oci_core_instance" "vm" {
  compartment_id      = local.compartment_id
  availability_domain = local.availability_domain
  display_name        = "${var.name_prefix}-vm"
  shape               = local.shape
  freeform_tags       = local.tags

  shape_config {
    ocpus         = var.ocpus
    memory_in_gbs = var.memory_in_gbs
  }

  source_details {
    source_type             = "image"
    source_id               = local.image_id
    boot_volume_size_in_gbs = var.boot_volume_size_in_gbs
    # 10 VPUs/GB is the "Balanced" level, the default and the lowest a boot
    # volume can have. Higher performance levels are billed.
    boot_volume_vpus_per_gb = 10
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.public.id
    display_name     = "${var.name_prefix}-vnic"
    hostname_label   = var.name_prefix
    assign_public_ip = true # ephemeral address; no reserved public IP is created
    nsg_ids          = [oci_core_network_security_group.vm.id]
  }

  metadata = {
    # Installed by the image for its default user "ubuntu".
    ssh_authorized_keys = trimspace(var.ssh_public_key)

    # First-boot setup. Creates the admin user with the same key.
    user_data = base64encode(templatefile("${path.module}/../cloud-init.yaml", {
      admin_user     = local.admin_user
      ssh_public_key = trimspace(var.ssh_public_key)
      ingress_mode   = var.ingress_mode
    }))
  }

  is_pv_encryption_in_transit_enabled = var.enable_pv_encryption_in_transit

  # The database lives on the boot volume. When the instance is terminated the
  # boot volume is deleted with it, so nothing is left behind to count against
  # the 200 GB allowance. Recovery is from the off-site backups, not from an
  # orphaned volume.
  preserve_boot_volume = false

  # The guardrails go in first, so the quota caps exist before any compute does.
  depends_on = [oci_limits_quota.always_free]

  lifecycle {
    # This VM holds the store's data, so Terraform must not replace it as a
    # side effect:
    #  - source_id: a newer Ubuntu image is published every few weeks. Without
    #    this, an unpinned image would make the next `terraform apply` destroy
    #    and recreate the VM.
    #  - metadata: cloud-init and the SSH key are read on first boot only.
    #    Changing them later does nothing to a running VM.
    # To apply a new image or a changed cloud-init.yaml on purpose, replace the
    # instance explicitly (README.md, "Rebuilding the VM").
    ignore_changes = [
      source_details[0].source_id,
      metadata,
    ]

    precondition {
      condition     = local.home_region == var.region
      error_message = "region must be the tenancy's home region. Always Free Ampere A1 capacity exists only in the home region; a VM created anywhere else would be refused or billed. Run infrastructure/oracle/oci-discovery.sh to see the home region."
    }

    precondition {
      condition     = local.availability_domain != null
      error_message = "availability_domain_index is out of range: this region has fewer availability domains. Use 0 for a single-AD region such as il-jerusalem-1."
    }

    precondition {
      condition     = local.image_id != null
      error_message = "No Canonical Ubuntu 24.04 aarch64 image was found for VM.Standard.A1.Flex in this region. Set image_ocid to pin one explicitly."
    }
  }
}

# The image the VM was actually launched from (it can differ from the newest
# image once time has passed, because source_id changes are ignored above).
data "oci_core_image" "in_use" {
  image_id = oci_core_instance.vm.source_details[0].source_id
}
