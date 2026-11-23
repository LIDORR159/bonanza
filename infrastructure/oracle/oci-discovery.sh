#!/usr/bin/env bash
#
# oci-discovery.sh - look at an Oracle Cloud tenancy and report whether the
# planned Always Free VM fits, without creating or changing anything.
#
# READ-ONLY. Every `oci` call in this script is a `list`, a `get` or a
# `search`. It contains no create, update, delete, launch, terminate, attach
# or action command, and none may be added. Check for yourself with:
#   grep -nE '(^|[ !])q (iam|os|compute|bv|limits|search) ' oci-discovery.sh
#
# Usage:
#   oci session authenticate --profile-name DEFAULT --region <your region>   # browser sign-in, once
#   ./oci-discovery.sh [PROFILE]                                             # PROFILE defaults to DEFAULT
#   ./oci-discovery.sh --help
#
# The script signs requests with the session token of that profile
# (`--auth security_token`). The token lasts one hour; refresh it with
# `oci session refresh --profile <PROFILE>`.
#
# It prints: the tenancy name and home region, subscribed regions,
# availability domains, every compute instance, boot volume, block volume and
# public IP in every compartment, the Ampere A1 service limits and what is
# still available, block storage in use against the 200 GB allowance, and
# then a verdict (YES / NO / UNKNOWN) with the reason and the list of
# resources that the Terraform configuration would create.
#
# Settings (environment; defaults in brackets):
#   PLAN_OCPUS        [2]    OCPUs of the planned VM
#   PLAN_MEMORY_GB    [12]   memory of the planned VM
#   PLAN_BOOT_GB      [100]  boot volume of the planned VM
#   TENANCY_OCID      []     tenancy OCID; read from the OCI config file when empty
#   OCI_CLI_CONFIG_FILE [~/.oci/config]
#
# Exit codes: 0 report printed (whatever the verdict), 2 not signed in or the
# session has expired, 127 a required tool is missing.

set -euo pipefail

case "${1:-}" in
  -h | --help)
    sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
    exit 0
    ;;
esac

PROFILE="${1:-DEFAULT}"
PLAN_OCPUS="${PLAN_OCPUS:-2}"
PLAN_MEMORY_GB="${PLAN_MEMORY_GB:-12}"
PLAN_BOOT_GB="${PLAN_BOOT_GB:-100}"
CONFIG_FILE="${OCI_CLI_CONFIG_FILE:-$HOME/.oci/config}"

# The Always Free allowance this plan is measured against.
readonly FREE_A1_OCPUS=2
readonly FREE_A1_MEMORY_GB=12
readonly FREE_STORAGE_GB=200
readonly A1_SHAPE="VM.Standard.A1.Flex"

# ── Preconditions ────────────────────────────────────────────────────────────

if ! command -v oci >/dev/null 2>&1; then
  cat >&2 <<EOF
The OCI command line tool is not installed.

  Install it:   brew install oci-cli
  Sign in:      oci session authenticate --profile-name $PROFILE --region <your region>
  Then run this script again.
EOF
  exit 127
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is not installed. Install it (brew install jq) and run this script again." >&2
  exit 127
fi

sign_in_help() {
  cat >&2 <<EOF

You are not signed in with profile "$PROFILE", or the session has expired
(a session token lasts one hour).

  New sign-in (opens a browser):  oci session authenticate --profile-name $PROFILE --region <your region>
  Extend a session that is still valid:  oci session refresh --profile $PROFILE

Then run this script again.
EOF
}

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "No OCI configuration found at $CONFIG_FILE." >&2
  sign_in_help
  exit 2
fi

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
ERR="$WORK_DIR/stderr"

# Reads one key of the chosen profile from the OCI config file.
config_value() {
  awk -v section="[$PROFILE]" -v key="$1" '
    $0 == section { inside = 1; next }
    /^\[/ { inside = 0 }
    inside {
      line = $0
      sub(/^[ \t]+/, "", line)
      if (index(line, key) == 1 && line ~ ("^" key "[ \t]*=")) {
        sub(/^[^=]*=[ \t]*/, "", line)
        print line
        exit
      }
    }' "$CONFIG_FILE"
}

# q <oci arguments...>
# Runs ONE read-only OCI command with the session token and prints its JSON.
# The CLI prints nothing at all for an empty list; that becomes {"data": []}.
# Returns non-zero if the command fails; the error text is left in $ERR.
q() {
  local out
  if out="$(oci "$@" --profile "$PROFILE" --auth security_token 2>"$ERR")"; then
    if [[ -z "$out" ]]; then
      out='{"data": []}'
    fi
    printf '%s\n' "$out"
  else
    return 1
  fi
}

# Things that could not be read. Any entry here turns the verdict into UNKNOWN.
UNKNOWN=()
unknown() {
  UNKNOWN+=("$1")
  printf '  !! %s\n' "$1"
  if [[ -s "$ERR" ]]; then
    grep -E '"message"|"code"|ServiceError|Error' "$ERR" | head -n 3 | sed 's/^/     /' || true
  fi
}

heading() { printf '\n── %s %s\n' "$1" "$(printf '%*s' $((72 - ${#1})) '' | tr ' ' '-')"; }
sum() { awk '{ total += $1 } END { printf "%g", total + 0 }'; }
greater() { awk -v a="$1" -v b="$2" 'BEGIN { exit !(a > b) }'; }

echo "BONANZA - Oracle Cloud discovery (read-only)"
echo "profile: $PROFILE    run at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ── Sign-in check ────────────────────────────────────────────────────────────

if ! q iam region list >"$WORK_DIR/all-regions.json"; then
  echo >&2
  echo "The first request to Oracle Cloud failed:" >&2
  head -n 12 "$ERR" | sed 's/^/  /' >&2
  sign_in_help
  exit 2
fi

TENANCY="${TENANCY_OCID:-$(config_value tenancy)}"
if [[ -z "$TENANCY" ]]; then
  echo "Could not find the tenancy OCID for profile \"$PROFILE\" in $CONFIG_FILE." >&2
  echo "Set it explicitly: TENANCY_OCID=ocid1.tenancy.oc1... $0 $PROFILE" >&2
  exit 2
fi
PROFILE_REGION="$(config_value region)"

# ── Tenancy and regions ──────────────────────────────────────────────────────

heading "Tenancy"
TENANCY_NAME="?"
if q iam tenancy get --tenancy-id "$TENANCY" >"$WORK_DIR/tenancy.json"; then
  TENANCY_NAME="$(jq -r '.data.name // "?"' "$WORK_DIR/tenancy.json")"
else
  unknown "the tenancy details could not be read"
fi
printf '  %-28s %s\n' "Name" "$TENANCY_NAME"
printf '  %-28s %s\n' "Tenancy OCID" "$TENANCY"
if q os ns get >"$WORK_DIR/namespace.json"; then
  printf '  %-28s %s\n' "Object Storage namespace" "$(jq -r '.data // "?"' "$WORK_DIR/namespace.json")"
fi

heading "Regions"
HOME_REGION=""
REGIONS=""
if q iam region-subscription list --tenancy-id "$TENANCY" >"$WORK_DIR/subscriptions.json"; then
  HOME_REGION="$(jq -r '.data[] | select(."is-home-region" == true) | ."region-name"' "$WORK_DIR/subscriptions.json" | head -n 1)"
  REGIONS="$(jq -r '.data[] | ."region-name"' "$WORK_DIR/subscriptions.json")"
  jq -r '.data[] | [."region-name", ."region-key", (if ."is-home-region" then "HOME" else "-" end), ."status"] | @tsv' "$WORK_DIR/subscriptions.json" \
    | while IFS=$'\t' read -r name key home status; do printf '  %-20s %-5s %-6s %s\n' "$name" "$key" "$home" "$status"; done
else
  unknown "the region subscriptions could not be read"
fi

if [[ -n "$HOME_REGION" ]]; then
  cat <<EOF

  Home region: $HOME_REGION

  !! The home region was fixed when the account was created and can never be
     changed. Always Free Ampere A1 instances can be created ONLY in the home
     region, so the VM must be created in $HOME_REGION.
EOF
  if [[ -n "$PROFILE_REGION" && "$PROFILE_REGION" != "$HOME_REGION" ]]; then
    echo "  !! Profile \"$PROFILE\" points at $PROFILE_REGION, not at the home region. Use region = \"$HOME_REGION\" in terraform.tfvars."
  fi
else
  unknown "the home region could not be determined"
  REGIONS="${REGIONS:-$PROFILE_REGION}"
fi

heading "Availability domains (home region)"
HOME_ADS=""
if [[ -n "$HOME_REGION" ]] && q iam availability-domain list --compartment-id "$TENANCY" --region "$HOME_REGION" >"$WORK_DIR/ads.json"; then
  HOME_ADS="$(jq -r '.data[].name' "$WORK_DIR/ads.json")"
  index=0
  while IFS= read -r ad; do
    [[ -n "$ad" ]] || continue
    printf '  [%s] %s\n' "$index" "$ad"
    index=$((index + 1))
  done <<<"$HOME_ADS"
  echo "  (the number in brackets is the value for availability_domain_index in terraform.tfvars)"
else
  unknown "the availability domains of the home region could not be read"
fi

# ── Compartments ─────────────────────────────────────────────────────────────

heading "Compartments"
# One line per compartment: OCID <TAB> name. The root compartment comes first.
printf '%s\t%s\n' "$TENANCY" "(root) $TENANCY_NAME" >"$WORK_DIR/compartments.tsv"
if q iam compartment list --compartment-id "$TENANCY" --compartment-id-in-subtree true --access-level ACCESSIBLE --all >"$WORK_DIR/compartments.json"; then
  jq -r '.data[] | select(."lifecycle-state" == "ACTIVE") | [.id, .name] | @tsv' "$WORK_DIR/compartments.json" >>"$WORK_DIR/compartments.tsv"
else
  unknown "the list of compartments could not be read; only the root compartment was inspected"
fi
while IFS=$'\t' read -r _ name; do printf '  %s\n' "$name"; done <"$WORK_DIR/compartments.tsv"

# ── Existing resources ───────────────────────────────────────────────────────

: >"$WORK_DIR/instances.tsv" # region, compartment, name, shape, ocpus, memory, state, AD
: >"$WORK_DIR/volumes.tsv"   # region, compartment, kind, name, size GB, state, AD
: >"$WORK_DIR/search.tsv"    # region, type, name, state
SEARCH_NOTES=""

for region in $REGIONS; do
  # Cross-compartment search: a second view of the same resources, and the
  # only source used here for public IPs.
  # It does not feed the verdict, so a failure here is only a warning.
  if q search resource structured-search --query-text "query instance, bootvolume, volume, publicip resources" --region "$region" >"$WORK_DIR/search.json"; then
    jq -r --arg region "$region" '(.data.items? // [])[] | [$region, ."resource-type", (."display-name" // "-"), (."lifecycle-state" // "-")] | @tsv' "$WORK_DIR/search.json" >>"$WORK_DIR/search.tsv"
    if jq -e 'has("opc-next-page")' "$WORK_DIR/search.json" >/dev/null 2>&1; then
      SEARCH_NOTES="${SEARCH_NOTES}  !! the search in $region returned only its first page; the lists above it are complete, this summary is not\n"
    fi
  else
    SEARCH_NOTES="${SEARCH_NOTES}  !! the resource search failed in $region; public IPs could not be listed\n"
  fi

  region_ads=""
  if q iam availability-domain list --compartment-id "$TENANCY" --region "$region" >"$WORK_DIR/region-ads.json"; then
    region_ads="$(jq -r '.data[].name' "$WORK_DIR/region-ads.json")"
  else
    unknown "the availability domains of $region could not be read, so its boot volumes were not listed"
  fi

  while IFS=$'\t' read -r compartment compartment_name; do
    if q compute instance list --compartment-id "$compartment" --all --region "$region" >"$WORK_DIR/list.json"; then
      jq -r --arg region "$region" --arg compartment "$compartment_name" '
        .data[] | select(."lifecycle-state" != "TERMINATED")
        | [$region, $compartment, ."display-name", .shape, (."shape-config".ocpus // 0), (."shape-config"."memory-in-gbs" // 0), ."lifecycle-state", ."availability-domain"]
        | @tsv' "$WORK_DIR/list.json" >>"$WORK_DIR/instances.tsv"
    else
      unknown "instances could not be listed in compartment \"$compartment_name\" ($region)"
    fi

    if q bv volume list --compartment-id "$compartment" --all --region "$region" >"$WORK_DIR/list.json"; then
      jq -r --arg region "$region" --arg compartment "$compartment_name" '
        .data[] | select(."lifecycle-state" != "TERMINATED")
        | [$region, $compartment, "block", ."display-name", (."size-in-gbs" // 0), ."lifecycle-state", ."availability-domain"]
        | @tsv' "$WORK_DIR/list.json" >>"$WORK_DIR/volumes.tsv"
    else
      unknown "block volumes could not be listed in compartment \"$compartment_name\" ($region)"
    fi

    while IFS= read -r ad; do
      [[ -n "$ad" ]] || continue
      if q bv boot-volume list --compartment-id "$compartment" --availability-domain "$ad" --all --region "$region" >"$WORK_DIR/list.json"; then
        jq -r --arg region "$region" --arg compartment "$compartment_name" '
          .data[] | select(."lifecycle-state" != "TERMINATED")
          | [$region, $compartment, "boot", ."display-name", (."size-in-gbs" // 0), ."lifecycle-state", ."availability-domain"]
          | @tsv' "$WORK_DIR/list.json" >>"$WORK_DIR/volumes.tsv"
      else
        unknown "boot volumes could not be listed in compartment \"$compartment_name\" ($ad)"
      fi
    done <<<"$region_ads"
  done <"$WORK_DIR/compartments.tsv"
done

heading "Compute instances (all compartments, all subscribed regions)"
if [[ -s "$WORK_DIR/instances.tsv" ]]; then
  printf '  %-16s %-22s %-22s %5s %7s  %-10s %s\n' "REGION" "NAME" "SHAPE" "OCPU" "MEM GB" "STATE" "COMPARTMENT"
  while IFS=$'\t' read -r region compartment name shape ocpus memory state _; do
    printf '  %-16s %-22s %-22s %5s %7s  %-10s %s\n' "$region" "$name" "$shape" "$ocpus" "$memory" "$state" "$compartment"
  done <"$WORK_DIR/instances.tsv"
else
  echo "  none"
fi

heading "Boot and block volumes (all compartments, all subscribed regions)"
if [[ -s "$WORK_DIR/volumes.tsv" ]]; then
  printf '  %-16s %-6s %-34s %7s  %-10s %s\n' "REGION" "KIND" "NAME" "SIZE GB" "STATE" "COMPARTMENT"
  while IFS=$'\t' read -r region compartment kind name size state _; do
    printf '  %-16s %-6s %-34s %7s  %-10s %s\n' "$region" "$kind" "$name" "$size" "$state" "$compartment"
  done <"$WORK_DIR/volumes.tsv"
else
  echo "  none"
fi

heading "Public IP addresses (from the resource search)"
if grep -q "$(printf '\t')PublicIp$(printf '\t')" "$WORK_DIR/search.tsv" 2>/dev/null; then
  printf '  %-16s %-40s %s\n' "REGION" "NAME" "STATE"
  awk -F'\t' '$2 == "PublicIp" { printf "  %-16s %-40s %s\n", $1, $3, $4 }' "$WORK_DIR/search.tsv"
else
  echo "  none found"
fi

heading "Resource search summary (cross-check of the lists above)"
if [[ -s "$WORK_DIR/search.tsv" ]]; then
  awk -F'\t' '{ count[$1 "  " $2 "  " $4]++ } END { for (k in count) printf "  %3d x %s\n", count[k], k }' "$WORK_DIR/search.tsv" | sort -k3
else
  echo "  the search returned no instances, volumes or public IPs"
fi
if [[ -n "$SEARCH_NOTES" ]]; then
  printf '%b' "$SEARCH_NOTES"
fi

# ── Ampere A1 limits and availability (home region) ──────────────────────────

heading "Ampere A1 service limits and availability (home region)"
: >"$WORK_DIR/a1.tsv" # AD, core limit, cores available, memory limit, memory available

limit_value() { # limit_value <limit name> <AD>
  jq -r --arg ad "$2" '[.data[] | select((."availability-domain" // "") == $ad or (."scope-type" // "") == "REGION") | .value] | first // "?"' "$WORK_DIR/limit-$1.json"
}

limits_ok=1
for limit in standard-a1-core-count standard-a1-memory-count; do
  if [[ -z "$HOME_REGION" ]] || ! q limits value list --compartment-id "$TENANCY" --service-name compute --name "$limit" --all --region "$HOME_REGION" >"$WORK_DIR/limit-$limit.json"; then
    unknown "the service limit $limit could not be read"
    limits_ok=0
  fi
done

if [[ "$limits_ok" -eq 1 ]]; then
  while IFS= read -r ad; do
    [[ -n "$ad" ]] || continue
    cores_available="?"
    memory_available="?"
    if q limits resource-availability get --compartment-id "$TENANCY" --service-name compute --limit-name standard-a1-core-count --availability-domain "$ad" --region "$HOME_REGION" >"$WORK_DIR/avail.json"; then
      cores_available="$(jq -r '.data.available // "?"' "$WORK_DIR/avail.json")"
    else
      unknown "A1 core availability could not be read for $ad"
    fi
    if q limits resource-availability get --compartment-id "$TENANCY" --service-name compute --limit-name standard-a1-memory-count --availability-domain "$ad" --region "$HOME_REGION" >"$WORK_DIR/avail.json"; then
      memory_available="$(jq -r '.data.available // "?"' "$WORK_DIR/avail.json")"
    else
      unknown "A1 memory availability could not be read for $ad"
    fi
    printf '%s\t%s\t%s\t%s\t%s\n' "$ad" "$(limit_value standard-a1-core-count "$ad")" "$cores_available" \
      "$(limit_value standard-a1-memory-count "$ad")" "$memory_available" >>"$WORK_DIR/a1.tsv"
  done <<<"$HOME_ADS"

  printf '  %-34s %11s %11s %13s %13s\n' "AVAILABILITY DOMAIN" "CORE LIMIT" "CORES FREE" "MEM LIMIT GB" "MEM FREE GB"
  while IFS=$'\t' read -r ad core_limit cores_free memory_limit memory_free; do
    printf '  %-34s %11s %11s %13s %13s\n' "$ad" "$core_limit" "$cores_free" "$memory_limit" "$memory_free"
  done <"$WORK_DIR/a1.tsv"
  echo
  echo "  \"Free\" here means not yet used against the service limit. It does not"
  echo "  promise that Oracle has a physical host available at launch time."
fi

# ── Totals ───────────────────────────────────────────────────────────────────

a1_ocpus_home="$(awk -F'\t' -v r="$HOME_REGION" -v s="$A1_SHAPE" '$1 == r && $4 == s { print $5 }' "$WORK_DIR/instances.tsv" | sum)"
a1_memory_home="$(awk -F'\t' -v r="$HOME_REGION" -v s="$A1_SHAPE" '$1 == r && $4 == s { print $6 }' "$WORK_DIR/instances.tsv" | sum)"
a1_elsewhere="$(awk -F'\t' -v r="$HOME_REGION" -v s="$A1_SHAPE" '$1 != r && $4 == s' "$WORK_DIR/instances.tsv" | grep -c . || true)"
other_instances="$(awk -F'\t' -v s="$A1_SHAPE" '$4 != s' "$WORK_DIR/instances.tsv" | grep -c . || true)"
storage_home="$(awk -F'\t' -v r="$HOME_REGION" '$1 == r { print $5 }' "$WORK_DIR/volumes.tsv" | sum)"
storage_elsewhere="$(awk -F'\t' -v r="$HOME_REGION" '$1 != r { print $5 }' "$WORK_DIR/volumes.tsv" | sum)"

heading "Usage against the Always Free allowance (home region)"
printf '  %-34s %6s of %s\n' "Ampere A1 OCPUs in use" "$a1_ocpus_home" "$FREE_A1_OCPUS"
printf '  %-34s %6s of %s\n' "Ampere A1 memory in use (GB)" "$a1_memory_home" "$FREE_A1_MEMORY_GB"
printf '  %-34s %6s of %s\n' "Boot + block storage in use (GB)" "$storage_home" "$FREE_STORAGE_GB"
if [[ "$other_instances" -gt 0 ]]; then
  echo "  !! $other_instances instance(s) use a shape other than $A1_SHAPE. Check that each one is an Always Free shape; anything else is billed."
fi
if [[ "$a1_elsewhere" -gt 0 ]]; then
  echo "  !! $a1_elsewhere Ampere A1 instance(s) exist outside the home region. Those are not covered by Always Free."
fi
if greater "$storage_elsewhere" 0; then
  echo "  !! $storage_elsewhere GB of volumes exist outside the home region. Those are not covered by Always Free."
fi
echo "  Volume backups (allowance: 5) are not counted by this script."

# ── Verdict ──────────────────────────────────────────────────────────────────

heading "Verdict"
verdict="YES"
reasons=()

if greater "$(awk -v a="$a1_ocpus_home" -v b="$PLAN_OCPUS" 'BEGIN { print a + b }')" "$FREE_A1_OCPUS" \
  || greater "$(awk -v a="$a1_memory_home" -v b="$PLAN_MEMORY_GB" 'BEGIN { print a + b }')" "$FREE_A1_MEMORY_GB"; then
  verdict="NO"
  reasons+=("Ampere A1 already in use: $a1_ocpus_home OCPU / $a1_memory_home GB. Adding $PLAN_OCPUS OCPU / $PLAN_MEMORY_GB GB would exceed the allowance of $FREE_A1_OCPUS OCPU / $FREE_A1_MEMORY_GB GB.")
fi
if greater "$(awk -v a="$storage_home" -v b="$PLAN_BOOT_GB" 'BEGIN { print a + b }')" "$FREE_STORAGE_GB"; then
  verdict="NO"
  reasons+=("Block storage already in use: $storage_home GB. Adding a $PLAN_BOOT_GB GB boot volume would exceed the allowance of $FREE_STORAGE_GB GB.")
fi

fitting_ad=""
paid_limits=0
if [[ -s "$WORK_DIR/a1.tsv" ]]; then
  while IFS=$'\t' read -r ad core_limit cores_free memory_limit memory_free; do
    if [[ "$cores_free" =~ ^[0-9.]+$ && "$memory_free" =~ ^[0-9.]+$ ]]; then
      if ! greater "$PLAN_OCPUS" "$cores_free" && ! greater "$PLAN_MEMORY_GB" "$memory_free" && [[ -z "$fitting_ad" ]]; then
        fitting_ad="$ad"
      fi
    fi
    if [[ "$core_limit" =~ ^[0-9.]+$ ]] && greater "$core_limit" "$FREE_A1_OCPUS"; then
      paid_limits=1
    fi
    if [[ "$memory_limit" =~ ^[0-9.]+$ ]] && greater "$memory_limit" "$FREE_A1_MEMORY_GB"; then
      paid_limits=1
    fi
  done <"$WORK_DIR/a1.tsv"
  if [[ -z "$fitting_ad" && "${#UNKNOWN[@]}" -eq 0 ]]; then
    verdict="NO"
    reasons+=("No availability domain has $PLAN_OCPUS A1 OCPUs and $PLAN_MEMORY_GB GB of A1 memory left under the service limits (see the table above).")
  fi
fi

if [[ "${#UNKNOWN[@]}" -gt 0 && "$verdict" != "NO" ]]; then
  verdict="UNKNOWN"
fi

echo "  $PLAN_OCPUS OCPU / $PLAN_MEMORY_GB GB A1 fits within Always Free: $verdict"
echo
case "$verdict" in
  YES)
    echo "  Reason: Ampere A1 in use today is $a1_ocpus_home OCPU / $a1_memory_home GB, so the plan stays"
    echo "  within $FREE_A1_OCPUS OCPU / $FREE_A1_MEMORY_GB GB; block storage would be $(awk -v a="$storage_home" -v b="$PLAN_BOOT_GB" 'BEGIN { print a + b }') of $FREE_STORAGE_GB GB;"
    echo "  and the A1 service limits leave room in:"
    echo "    $fitting_ad"
    echo
    echo "  Next: the owner reviews and approves the resource list at the end of this"
    echo "  report. Only then is terraform run (docs/oracle-deployment.md)."
    ;;
  NO)
    for reason in "${reasons[@]}"; do echo "  Reason: $reason"; done
    echo
    echo "  Do not run terraform apply. Free the resources named above first, or"
    echo "  change the plan, and run this script again."
    ;;
  UNKNOWN)
    echo "  Reason: some facts could not be read, so nothing can be promised:"
    for item in "${UNKNOWN[@]}"; do echo "    - $item"; done
    echo
    echo "  This usually means the signed-in user is not a tenancy administrator."
    echo "  Do not run terraform apply until this script reports YES."
    ;;
esac
if [[ "$paid_limits" -eq 1 ]]; then
  cat <<EOF

  Note: an A1 service limit is above the Always Free allowance. That is what a
  Pay As You Go tenancy looks like: only the first $FREE_A1_OCPUS OCPU / $FREE_A1_MEMORY_GB GB are free
  and anything above is billed. The quota in terraform/guardrails.tf caps the
  tenancy at the free amount.
EOF
fi
cat <<EOF

  Service limits are not the same as capacity. Oracle can still answer
  "Out of host capacity" when the VM is launched. If that happens: try
  another availability domain (if the region has more than one), or try
  again later. Never switch to a paid shape.
EOF

# ── What would be created ────────────────────────────────────────────────────

heading "Proposed resources (nothing below exists yet)"
echo "  Created by infrastructure/oracle/terraform in ${HOME_REGION:-<home region>}, and only after"
echo "  the owner has approved this list:"
echo
row() { printf '  %-56s %s\n' "$1" "$2"; }
row "RESOURCE" "EXPECTED MONTHLY COST"
row "1 x $A1_SHAPE, $PLAN_OCPUS OCPU / $PLAN_MEMORY_GB GB, Ubuntu 24.04" "0  (Always Free: $FREE_A1_OCPUS OCPU / $FREE_A1_MEMORY_GB GB in total)"
row "1 x boot volume, $PLAN_BOOT_GB GB, Balanced performance" "0  (Always Free: $FREE_STORAGE_GB GB in total)"
row "1 x VCN, subnet, internet gateway, route table, NSG" "0  (no price-list item)"
row "1 x ephemeral public IPv4 address" "0 expected (no charge found; not verified for 2026)"
row "1 x quota policy capping A1 and block storage" "0"
row "1 x budget with two alert rules (optional)" "0"
row "Outbound data" "0 up to 10 TB per month"
cat <<EOF

  Expected total: 0 per month, while this is the only Ampere A1 instance and
  the only boot or block volume in the tenancy.

  Not created: block volumes, load balancers, reserved public IPs, volume
  backups, databases, object storage buckets.

This script created and changed nothing.
EOF
