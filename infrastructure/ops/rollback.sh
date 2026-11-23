#!/usr/bin/env bash
#
# rollback.sh - go back to the previous pair of application images.
#
# Usage:
#   rollback.sh                                          redeploy images.env.previous
#   rollback.sh <backend-image-ref> <storefront-image-ref>   redeploy a specific pair
#   rollback.sh --help
#
# Run as user "bonanza". CI reaches it through ssh-deploy-entrypoint.sh.
#
# It hands the chosen pair to `deploy.sh --rollback`, so the same pull, start,
# health gate and failure handling apply, without the migration step.
# Afterwards it prints the end of the deployment log.
#
# DATABASE MIGRATIONS ARE NOT ROLLED BACK. Only the container images change.
# The older version runs against whatever schema the newer version left
# behind; see the header of deploy.sh for what that means.
#
# After a successful rollback, images.env.previous holds the version you
# rolled back FROM, so running rollback.sh again returns to it.
#
# If the image of the previous version is no longer on the VM (the weekly
# image prune removes unused images older than 7 days), it is pulled again
# from the registry.
#
# Exit codes: the same as deploy.sh (0 ok, 10 failed and restored, 11 failed
# and not restored).
#
# Settings: the same as deploy.sh, plus
#   ROLLBACK_LOG_LINES   [10] how many deployment log lines to print

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$SCRIPT_DIR/lib.sh"

ROLLBACK_LOG_LINES="${ROLLBACK_LOG_LINES:-10}"
PREVIOUS="$BONANZA_IMAGES_ENV.previous"

usage() { sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'; }

# Reads KEY=value from a file without executing it. Surrounding quotes are dropped.
read_env_value() {
  local key="$1" file="$2"
  sed -n "s/^${key}=//p" "$file" | tail -n 1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"
}

case "${1:-}" in
  -h | --help)
    usage
    exit 0
    ;;
esac

case $# in
  0)
    [[ -f "$PREVIOUS" ]] || die "$PREVIOUS does not exist: there is no recorded previous version. Pass the two image references explicitly."
    backend="$(read_env_value BACKEND_IMAGE "$PREVIOUS")"
    storefront="$(read_env_value STOREFRONT_IMAGE "$PREVIOUS")"
    [[ -n "$backend" && -n "$storefront" ]] || die "$PREVIOUS does not contain both BACKEND_IMAGE and STOREFRONT_IMAGE"
    ;;
  2)
    backend="$1"
    storefront="$2"
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

log "rolling back to backend=$backend storefront=$storefront"

rc=0
"$SCRIPT_DIR/deploy.sh" --rollback "$backend" "$storefront" || rc=$?

if [[ -f "$DEPLOYMENTS_LOG" ]]; then
  printf '\nLast %s lines of %s:\n' "$ROLLBACK_LOG_LINES" "$DEPLOYMENTS_LOG"
  tail -n "$ROLLBACK_LOG_LINES" "$DEPLOYMENTS_LOG"
fi

exit "$rc"
