# Terraform and provider versions.
#
# There is deliberately no `backend` block: state is kept in a local
# `terraform.tfstate` file next to these files. That file is gitignored and
# must be kept safe (see README.md).

terraform {
  required_version = ">= 1.9.0"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 9.14"
    }
  }
}
