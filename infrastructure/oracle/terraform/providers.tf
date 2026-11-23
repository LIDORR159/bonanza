# Authentication uses a short-lived session token, not a long-lived API key.
#
# Create the token with a browser sign-in before running Terraform:
#
#   oci session authenticate --profile-name <profile> --region <home region>
#
# The token lasts one hour. Refresh it with
# `oci session refresh --profile <profile>` (possible for up to 24 hours).

provider "oci" {
  auth                = "SecurityToken"
  config_file_profile = var.oci_profile
  region              = var.region
}
