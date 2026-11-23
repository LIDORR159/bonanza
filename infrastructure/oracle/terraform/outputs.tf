output "instance_ocid" {
  description = "OCID of the VM."
  value       = oci_core_instance.vm.id
}

output "public_ip" {
  description = "Ephemeral public IPv4 address of the VM. It changes if the VM is ever recreated."
  value       = oci_core_instance.vm.public_ip
}

output "availability_domain" {
  description = "Availability domain the VM runs in."
  value       = oci_core_instance.vm.availability_domain
}

output "image_name" {
  description = "Display name of the image the VM was launched from."
  value       = data.oci_core_image.in_use.display_name
}

output "image_ocid" {
  description = "OCID of the image the VM was launched from. Put it in terraform.tfvars as image_ocid to pin it."
  value       = oci_core_instance.vm.source_details[0].source_id
}

output "ssh_command" {
  description = "How to sign in. Works only from an address inside admin_cidr."
  value       = "ssh ${local.admin_user}@${oci_core_instance.vm.public_ip}"
}

output "free_tier_summary" {
  description = "What this configuration created and what it is expected to cost."
  value       = <<-EOT
    Created in ${var.region} (${oci_core_instance.vm.availability_domain}):

      1 x ${oci_core_instance.vm.shape} VM "${oci_core_instance.vm.display_name}", ${var.ocpus} OCPU / ${var.memory_in_gbs} GB
            Always Free allowance: 2 OCPU / 12 GB in total              -> 0 per month
      1 x boot volume, ${var.boot_volume_size_in_gbs} GB, Balanced (10 VPUs/GB)
            Always Free allowance: 200 GB of boot + block volumes       -> 0 per month
      1 x VCN, public subnet, internet gateway, route table, NSG
            No price-list SKU                                           -> 0 per month
      1 x ephemeral public IPv4 address (${oci_core_instance.vm.public_ip})
            No charge found, but not verified against 2026 pricing      -> expected 0
      Quota caps (2 OCPU / 12 GB A1, 200 GB storage, 5 backups): ${var.manage_quotas ? "created" : "NOT created (manage_quotas = false)"}
      Budget alerts: ${local.budget_enabled ? "created, emails go to ${var.budget_alert_email}" : "NOT created (budget_alert_email is empty)"}
      Web ingress: ${var.ingress_mode == "direct" ? "direct - TCP 80 and 443 are open to the internet" : "tunnel - no inbound web ports; SSH from ${var.admin_cidr} only"}

    Expected total: 0 per month, as long as this stays the only Ampere A1
    instance and the only boot/block volume in the tenancy. Not created: block
    volumes, load balancers, reserved public IPs, volume backups.

    A charge becomes possible if anything else is added to the tenancy, if the
    quota caps are removed, or if outbound data exceeds 10 TB in a month.
  EOT
}
