# Network: one VCN, one public subnet, an internet gateway, a route table and
# one network security group (NSG) attached to the VM.
#
# None of these resources has a price-list SKU. Always Free tenancies may hold
# up to two VCNs.
#
# Traffic is allowed if ANY rule in the subnet's security list OR in the VM's
# NSG allows it. Every rule that opens a port therefore lives in the NSG, and
# the VCN's default security list is cut down to ICMP only.

locals {
  compartment_id = var.compartment_ocid != null ? var.compartment_ocid : var.tenancy_ocid

  # DNS labels allow letters and digits only, at most 15 characters.
  dns_label = substr(replace(var.name_prefix, "-", ""), 0, 15)

  tags = {
    project    = var.name_prefix
    managed-by = "terraform"
  }

  # Public web ports. Opened only when ingress_mode = "direct".
  web_ports = {
    http  = 80
    https = 443
  }
}

resource "oci_core_vcn" "main" {
  compartment_id = local.compartment_id
  display_name   = "${var.name_prefix}-vcn"
  cidr_blocks    = [var.vcn_cidr]
  dns_label      = local.dns_label
  freeform_tags  = local.tags
}

resource "oci_core_internet_gateway" "main" {
  compartment_id = local.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.name_prefix}-igw"
  enabled        = true
  freeform_tags  = local.tags
}

resource "oci_core_route_table" "public" {
  compartment_id = local.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.name_prefix}-public-rt"
  freeform_tags  = local.tags

  route_rules {
    description       = "Everything outside the VCN goes through the internet gateway"
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.main.id
  }
}

# Every new VCN comes with a default security list that allows SSH from
# 0.0.0.0/0 and all egress. Taking it under management replaces those rules
# with exactly the ones written here: ICMP for path-MTU discovery and nothing
# else. There is no SSH rule and no egress rule; both come from the NSG below,
# so only instances that are members of the NSG can be reached or reach out.
resource "oci_core_default_security_list" "locked_down" {
  manage_default_resource_id = oci_core_vcn.main.default_security_list_id
  display_name               = "${var.name_prefix}-default-sl-icmp-only"
  freeform_tags              = local.tags

  ingress_security_rules {
    description = "Path MTU discovery: ICMP type 3 code 4 (fragmentation needed)"
    protocol    = "1"
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = false

    icmp_options {
      type = 3
      code = 4
    }
  }

  ingress_security_rules {
    description = "ICMP destination-unreachable from inside the VCN"
    protocol    = "1"
    source      = var.vcn_cidr
    source_type = "CIDR_BLOCK"
    stateless   = false

    icmp_options {
      type = 3
    }
  }
}

# Regional public subnet (not tied to one availability domain).
resource "oci_core_subnet" "public" {
  compartment_id             = local.compartment_id
  vcn_id                     = oci_core_vcn.main.id
  display_name               = "${var.name_prefix}-public-subnet"
  cidr_block                 = var.subnet_cidr
  dns_label                  = "public"
  route_table_id             = oci_core_route_table.public.id
  security_list_ids          = [oci_core_default_security_list.locked_down.id]
  prohibit_public_ip_on_vnic = false
  freeform_tags              = local.tags
}

resource "oci_core_network_security_group" "vm" {
  compartment_id = local.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.name_prefix}-vm-nsg"
  freeform_tags  = local.tags
}

# SSH: from the administrator's address only. variables.tf rejects 0.0.0.0/0.
resource "oci_core_network_security_group_security_rule" "ssh_from_admin" {
  network_security_group_id = oci_core_network_security_group.vm.id
  description               = "SSH from the administrator's address only"
  direction                 = "INGRESS"
  protocol                  = "6" # TCP
  source                    = var.admin_cidr
  source_type               = "CIDR_BLOCK"
  stateless                 = false

  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }
}

# Web ports: created ONLY in "direct" mode. In "tunnel" mode (the default) no
# rule exists, so nothing on the internet can open a connection to 80 or 443;
# cloudflared connects outwards to Cloudflare instead.
resource "oci_core_network_security_group_security_rule" "web_direct" {
  for_each = { for name, port in local.web_ports : name => port if var.ingress_mode == "direct" }

  network_security_group_id = oci_core_network_security_group.vm.id
  description               = "${upper(each.key)} from anywhere (ingress_mode = direct)"
  direction                 = "INGRESS"
  protocol                  = "6" # TCP
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"
  stateless                 = false

  tcp_options {
    destination_port_range {
      min = each.value
      max = each.value
    }
  }
}

# PostgreSQL (5432) and Redis (6379) are never opened: there is no rule for
# them in any mode.

resource "oci_core_network_security_group_security_rule" "egress_all" {
  network_security_group_id = oci_core_network_security_group.vm.id
  description               = "All outbound traffic (package updates, image pulls, Cloudflare Tunnel, backups)"
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
  stateless                 = false
}
