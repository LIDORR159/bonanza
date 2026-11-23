# Guardrails against cost.
#
# Two mechanisms, and they are not equally strong:
#
#  1. Compartment quotas (hard cap). OCI refuses any request that would take
#     the tenancy over the quota, whoever makes it and with whatever tool.
#     This is the real guard.
#  2. A budget with alert emails (warning only). Budgets are evaluated about
#     once every 24 hours, so an alert can arrive up to a day after the spend
#     started, and a budget never stops or blocks anything.
#
# Both need rights at the tenancy level: creating quotas and budgets in the
# root compartment requires a tenancy administrator (or a policy that grants
# `manage quotas` and `manage usage-budgets` in the tenancy). If the apply
# fails here with an authorization error (OCI usually reports it as
# "NotAuthorizedOrNotFound"), either sign in as an administrator or set
# manage_quotas = false / budget_alert_email = "" and create them by hand
# later. Without the quota there is no hard cap.

# ── Hard caps ────────────────────────────────────────────────────────────────

resource "oci_limits_quota" "always_free" {
  count = var.manage_quotas ? 1 : 0

  # Quotas that apply "in tenancy" must be created in the root compartment.
  compartment_id = var.tenancy_ocid
  name           = "${var.name_prefix}-always-free-caps"
  description    = "Caps Ampere A1 compute and block storage at the Always Free allowance for the whole tenancy"
  freeform_tags  = local.tags

  statements = [
    "set compute-core quota standard-a1-core-count to 2 in tenancy",
    "set compute-memory quota standard-a1-memory-count to 12 in tenancy",
    "set block-storage quota total-storage-gb to 200 in tenancy",
    "set block-storage quota backup-count to 5 in tenancy",
  ]
}

# ── Spend alerts (optional, lagging) ─────────────────────────────────────────

locals {
  budget_enabled = var.budget_alert_email != ""
}

# The amount is in the tenancy's billing currency (the currency of its rate
# card), which is not necessarily US dollars. Expected spend is zero, so the
# smallest whole budget is used and the alerts fire as early as possible.
resource "oci_budget_budget" "zero_spend" {
  count = local.budget_enabled ? 1 : 0

  compartment_id = var.tenancy_ocid # budgets live in the root compartment
  display_name   = "${var.name_prefix}-zero-spend"
  description    = "Expected spend is zero. Any alert from this budget means something is being billed."
  amount         = 1
  reset_period   = "MONTHLY"
  target_type    = "COMPARTMENT"
  targets        = [var.tenancy_ocid] # the root compartment covers every compartment
  freeform_tags  = local.tags
}

# Fires once actual spend this month reaches 0.01.
resource "oci_budget_alert_rule" "actual" {
  count = local.budget_enabled ? 1 : 0

  budget_id      = oci_budget_budget.zero_spend[0].id
  display_name   = "${var.name_prefix}-actual-spend"
  description    = "Actual spend this month is above zero"
  type           = "ACTUAL"
  threshold_type = "ABSOLUTE"
  threshold      = 0.01
  recipients     = var.budget_alert_email
  message        = "BONANZA / Oracle Cloud: actual spend this month is above zero. This tenancy is meant to cost nothing. Find what is being billed (Billing > Cost Analysis) and remove it."
}

# Fires once the forecast for the month reaches the whole budget (100% of 1).
resource "oci_budget_alert_rule" "forecast" {
  count = local.budget_enabled ? 1 : 0

  budget_id      = oci_budget_budget.zero_spend[0].id
  display_name   = "${var.name_prefix}-forecast-spend"
  description    = "Forecast spend for this month reaches the budget"
  type           = "FORECAST"
  threshold_type = "PERCENTAGE"
  threshold      = 100
  recipients     = var.budget_alert_email
  message        = "BONANZA / Oracle Cloud: spend is forecast to reach the monthly budget. This tenancy is meant to cost nothing. Find what is being billed (Billing > Cost Analysis) and remove it."
}
