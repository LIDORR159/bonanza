#!/usr/bin/env bash
#
# deploy.sh - roll out a new pair of application images, and put the previous
# pair back if anything goes wrong.
#
# Usage:
#   deploy.sh <backend-image-ref> <storefront-image-ref>
#   deploy.sh --rollback <backend-image-ref> <storefront-image-ref>
#   deploy.sh --help
#
# --rollback is what rollback.sh uses: the same steps without the migration
# step, recorded in the log as a rollback.
#
# Each reference must be pinned by digest or tag, for example:
#   deploy.sh ghcr.io/lidorr159/bonanza-backend@sha256:<64 hex> \
#             ghcr.io/lidorr159/bonanza-storefront@sha256:<64 hex>
#
# Run as user "bonanza". CI reaches it through ssh-deploy-entrypoint.sh.
#
# What it does, in order:
#   1. Saves images.env as images.env.previous and writes the new images.env.
#   2. docker compose pull
#   3. Runs the one-shot "migrate" service (database migrations).
#   4. docker compose up -d --remove-orphans
#   5. Waits, for a bounded time, until every service is running and healthy.
#   6. Appends the outcome to $BONANZA_STATE_DIR/deployments.log.
#
# If any step fails, images.env is restored from images.env.previous, the
# previous version is brought back up, and the script exits non-zero. Both
# files end up exactly as they were before the attempt.
#
# ┌──────────────────────────────────────────────────────────────────────────┐
# │ DATABASE MIGRATIONS ARE NOT ROLLED BACK.                                 │
# │                                                                          │
# │ The automatic rollback (and rollback.sh) only switches the container     │
# │ images back. If step 3 changed the database schema and a later step      │
# │ failed, the PREVIOUS application version is now running against the NEW  │
# │ schema. That is safe only when the migration is backward compatible      │
# │ (it adds tables or columns the old code ignores). A migration that       │
# │ drops, renames or re-types something the old code uses will leave the    │
# │ old version broken, and the only ways out are to deploy a fixed version  │
# │ or to restore the database from a backup (restore.sh), which loses       │
# │ everything written since that backup.                                    │
# │                                                                          │
# │ So: ship destructive schema changes in two releases (first stop using    │
# │ the column, then remove it), and run backup.sh before a deployment that  │
# │ carries a risky migration.                                               │
# └──────────────────────────────────────────────────────────────────────────┘
#
# Exit codes:
#   0   deployed and healthy
#   10  deployment failed; the previous version was restored and is healthy
#   11  deployment failed and the previous version could NOT be confirmed
#       healthy (or there was no previous version). Needs attention now.
#   1   could not start (bad arguments are 2, a lock held by another run, ...)
#
# Settings (environment or ops.env; defaults in brackets):
#   DEPLOY_HEALTH_TIMEOUT   [300] seconds to wait for all services to be healthy
#   DEPLOY_PULL             [1] set 0 to skip `docker compose pull` (local images)
#   DEPLOY_RUN_MIGRATIONS   [1] set 0 to skip the migrate step
#   MIGRATE_SERVICE         [migrate] name of the one-shot migration service
#   plus the paths described in lib.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$SCRIPT_DIR/lib.sh"

DEPLOY_HEALTH_TIMEOUT="${DEPLOY_HEALTH_TIMEOUT:-300}"
DEPLOY_PULL="${DEPLOY_PULL:-1}"
DEPLOY_RUN_MIGRATIONS="${DEPLOY_RUN_MIGRATIONS:-1}"
MIGRATE_SERVICE="${MIGRATE_SERVICE:-migrate}"
DEPLOY_ACTION="deploy"

usage() { sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    --rollback)
      DEPLOY_ACTION="rollback"
      DEPLOY_RUN_MIGRATIONS=0
      shift
      ;;
    -*)
      usage >&2
      exit 2
      ;;
    *) break ;;
  esac
done
if [[ $# -ne 2 ]]; then
  usage >&2
  exit 2
fi

BACKEND_IMAGE="$1"
STOREFRONT_IMAGE="$2"

# A reference must name a repository and pin a tag or a digest. (Which
# registry and repository are acceptable is decided by
# ssh-deploy-entrypoint.sh for remote callers; this check only catches typos.)
REF_PATTERN='^[A-Za-z0-9][A-Za-z0-9._/:-]*(:[A-Za-z0-9_][A-Za-z0-9_.-]*|@sha256:[a-f0-9]{64})$'
valid_ref() { [[ "$1" =~ $REF_PATTERN ]]; }
valid_ref "$BACKEND_IMAGE" || die "'$BACKEND_IMAGE' is not an image reference with a tag or a sha256 digest"
valid_ref "$STOREFRONT_IMAGE" || die "'$STOREFRONT_IMAGE' is not an image reference with a tag or a sha256 digest"
case "$BACKEND_IMAGE $STOREFRONT_IMAGE" in
  *:latest*) warn "a ':latest' tag is not pinned: a rollback cannot bring back what it pointed to before" ;;
esac

IMAGES="$BONANZA_IMAGES_ENV"
PREVIOUS="$IMAGES.previous"
WORK_DIR=""
INTERRUPTED=0
FAILED_STEP=""
STARTED_AT="$(now_epoch)"

# shellcheck disable=SC2329 # called by the EXIT trap
cleanup() {
  if [[ -n "$WORK_DIR" && -d "$WORK_DIR" && "$WORK_DIR" == "$BONANZA_TMP_DIR"/deploy.* ]]; then
    rm -rf "$WORK_DIR"
  fi
  release_locks
}
trap cleanup EXIT
# Signals never leave a deployment half done:
#  - Ctrl-C or `kill` (INT, TERM): the step in progress ends, then the previous
#    version is restored, exactly as for any other failure.
#  - a hang-up (HUP, a lost SSH session): ignored. The deployment carries on
#    to its normal end.
trap 'INTERRUPTED=1' INT TERM
trap '' HUP

require_cmd docker
ensure_dirs
[[ -f "$BONANZA_COMPOSE_FILE" ]] || die "$BONANZA_COMPOSE_FILE does not exist"
[[ -f "$BONANZA_ENV_FILE" ]] || die "$BONANZA_ENV_FILE does not exist"
acquire_lock deploy
WORK_DIR="$(mktemp -d "$BONANZA_TMP_DIR/deploy.XXXXXX")"

write_images_env() {
  local target="$1"
  {
    printf 'BACKEND_IMAGE=%s\n' "$BACKEND_IMAGE"
    printf 'STOREFRONT_IMAGE=%s\n' "$STOREFRONT_IMAGE"
  } >"$target.tmp"
  mv "$target.tmp" "$target"
}

interrupted() {
  if [[ "$INTERRUPTED" -eq 1 ]]; then
    FAILED_STEP="${FAILED_STEP:-interrupted}"
    return 0
  fi
  return 1
}

# Steps 2-5. Returns non-zero at the first failure, with FAILED_STEP set.
roll_out() {
  if [[ "$DEPLOY_PULL" == "1" ]]; then
    log "pulling images"
    compose pull --quiet || {
      FAILED_STEP="pull"
      return 1
    }
  fi
  if interrupted; then return 1; fi

  if [[ "$DEPLOY_RUN_MIGRATIONS" == "1" ]]; then
    log "running database migrations (one-shot service '$MIGRATE_SERVICE')"
    compose run --rm -T "$MIGRATE_SERVICE" || {
      FAILED_STEP="migrate"
      return 1
    }
  fi
  if interrupted; then return 1; fi

  log "starting the new version"
  compose up -d --remove-orphans || {
    FAILED_STEP="up"
    return 1
  }
  if interrupted; then return 1; fi

  log "waiting up to $DEPLOY_HEALTH_TIMEOUT seconds for every service to be healthy"
  local problems
  if ! problems="$(wait_healthy "$DEPLOY_HEALTH_TIMEOUT")"; then
    printf '%s\n' "$problems" | while IFS= read -r line; do log "not healthy: $line"; done
    FAILED_STEP="health"
    return 1
  fi
  # Healthy: the deployment is complete, and an interrupt that arrived this
  # late no longer undoes it.
  return 0
}

# Puts images.env and images.env.previous back as they were before this run
# and brings the previous version up. Returns 0 only if it ends up healthy.
restore_previous() {
  if [[ "$HAD_CURRENT" -ne 1 ]]; then
    warn "there was no images.env before this run, so there is no previous version to return to"
    return 1
  fi
  cp -p "$WORK_DIR/images.env.before" "$IMAGES"
  if [[ "$HAD_PREVIOUS" -eq 1 ]]; then
    cp -p "$WORK_DIR/images.env.previous.before" "$PREVIOUS"
  else
    rm -f "$PREVIOUS"
  fi
  log "images.env restored; bringing the previous version back up"
  compose up -d --remove-orphans || return 1
  local problems
  if ! problems="$(wait_healthy "$DEPLOY_HEALTH_TIMEOUT")"; then
    printf '%s\n' "$problems" | while IFS= read -r line; do log "not healthy after rollback: $line"; done
    return 1
  fi
  return 0
}

# ── 1. Remember the current state, write the new images.env ──────────────────

HAD_CURRENT=0
HAD_PREVIOUS=0
if [[ -f "$IMAGES" ]]; then
  HAD_CURRENT=1
  cp -p "$IMAGES" "$WORK_DIR/images.env.before"
fi
if [[ -f "$PREVIOUS" ]]; then
  HAD_PREVIOUS=1
  cp -p "$PREVIOUS" "$WORK_DIR/images.env.previous.before"
fi

log "$DEPLOY_ACTION: backend=$BACKEND_IMAGE storefront=$STOREFRONT_IMAGE"
if [[ "$HAD_CURRENT" -eq 1 ]]; then
  cp -p "$IMAGES" "$PREVIOUS"
fi
write_images_env "$IMAGES"

# ── 2-5. Roll out, or roll back ──────────────────────────────────────────────

refs="backend=$BACKEND_IMAGE storefront=$STOREFRONT_IMAGE"

if roll_out; then
  record_deployment "action=$DEPLOY_ACTION result=ok $refs seconds=$(($(now_epoch) - STARTED_AT))"
  log "$DEPLOY_ACTION complete: every service is healthy"
  exit 0
fi

warn "$DEPLOY_ACTION FAILED at step '$FAILED_STEP'"
if [[ "$FAILED_STEP" != "pull" && "$DEPLOY_RUN_MIGRATIONS" == "1" ]]; then
  warn "database migrations may have been applied and are NOT rolled back (see the header of this script)"
fi

# The rollback itself must not be cut short by a second signal.
trap '' INT TERM
if restore_previous; then
  record_deployment "action=$DEPLOY_ACTION result=failed step=$FAILED_STEP rolled_back=yes $refs seconds=$(($(now_epoch) - STARTED_AT))"
  log "the previous version is running and healthy"
  exit 10
fi

record_deployment "action=$DEPLOY_ACTION result=failed step=$FAILED_STEP rolled_back=NO $refs seconds=$(($(now_epoch) - STARTED_AT))"
warn "the previous version could NOT be confirmed healthy. The stack needs attention now."
warn "inspect it with: docker compose --env-file .env --env-file images.env ps   (from $BONANZA_DIR)"
exit 11
