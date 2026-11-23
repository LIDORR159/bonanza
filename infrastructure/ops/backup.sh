#!/usr/bin/env bash
#
# backup.sh - encrypted off-site backup of the database and the server's
# configuration, with restic, to an S3-compatible bucket (Cloudflare R2 in
# production).
#
# Usage:
#   backup.sh              run a backup
#   backup.sh --check      also run `restic check` now, whatever the schedule says
#   backup.sh --help
#
# Run as user "bonanza". The systemd timer bonanza-backup.timer runs it daily.
#
# What it does, in order:
#   1. Opens the repository, creating it on the very first run.
#   2. Dumps PostgreSQL (pg_dump, custom format) straight into a restic
#      snapshot tagged "postgres". Nothing is written to local disk.
#   3. Backs up the files needed to rebuild the server (compose.yaml,
#      Caddyfile, .env, images.env) in a snapshot tagged "config".
#   4. Applies retention (7 daily, 4 weekly, 6 monthly) and prunes.
#   5. Every CHECK_INTERVAL_DAYS, verifies the repository with `restic check`.
#   6. Writes the time of success to $BONANZA_STATE_DIR/last-backup, which
#      healthwatch.sh watches.
#
# Any failure ends the script with a non-zero exit code and step 6 is skipped.
#
# How the dump reaches restic (BACKUP_STDIN_MODE):
#   command  `restic backup --stdin-from-command -- <pg_dump command>`.
#            restic runs pg_dump itself, and if pg_dump fails restic fails and
#            saves no snapshot. Needs restic 0.17 or newer.
#   pipe     `pg_dump | restic backup --stdin`. Works with every restic, but
#            restic cannot see pg_dump's exit code and would save a truncated
#            dump as a normal snapshot. So the snapshot is first saved under a
#            temporary "pending-..." tag, and is re-tagged "postgres" only
#            after pg_dump is known to have exited with 0. A failed dump is
#            therefore never mistaken for a backup; it is deleted. The
#            configuration snapshot is handled the same way.
#   auto     (default) "command" when the installed restic supports it,
#            otherwise "pipe". Ubuntu 24.04 packages restic 0.16, so on the
#            production VM this resolves to "pipe" until restic is upgraded.
#
# Settings (environment, ops.env or backup.env; defaults in brackets):
#   BACKUP_ENV_FILE       [$BONANZA_DIR/backup.env] must be mode 600; provides
#                         RESTIC_REPOSITORY, RESTIC_PASSWORD_FILE,
#                         AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
#   BACKUP_CONFIG_FILES   [compose.yaml Caddyfile .env images.env] relative to
#                         $BONANZA_DIR, separated by spaces
#   BACKUP_STDIN_MODE     [auto] auto | command | pipe
#   KEEP_DAILY / KEEP_WEEKLY / KEEP_MONTHLY   [7 / 4 / 6]
#   BACKUP_PRUNE          [1] set 0 to forget snapshots without pruning data
#   CHECK_INTERVAL_DAYS   [7] how often `restic check` runs; 0 = every run
#   RESTIC_CHECK_ARGS     [--read-data-subset=5%] extra arguments for the check
#   PG_SERVICE / PG_USER / PG_DATABASE        [postgres / bonanza / bonanza]
#   RESTIC_HOST           [bonanza] host name recorded in every snapshot
#   plus the paths described in lib.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$SCRIPT_DIR/lib.sh"

BACKUP_CONFIG_FILES="${BACKUP_CONFIG_FILES:-compose.yaml Caddyfile .env images.env}"
BACKUP_STDIN_MODE="${BACKUP_STDIN_MODE:-auto}"
KEEP_DAILY="${KEEP_DAILY:-7}"
KEEP_WEEKLY="${KEEP_WEEKLY:-4}"
KEEP_MONTHLY="${KEEP_MONTHLY:-6}"
BACKUP_PRUNE="${BACKUP_PRUNE:-1}"
CHECK_INTERVAL_DAYS="${CHECK_INTERVAL_DAYS:-7}"
RESTIC_CHECK_ARGS="${RESTIC_CHECK_ARGS:---read-data-subset=5%}"

usage() { sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'; }

FORCE_CHECK=0
case "${1:-}" in
  "") ;;
  --check) FORCE_CHECK=1 ;;
  -h | --help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
EXIT_CODE=0

on_exit() {
  local rc=$?
  release_locks
  if [[ "$rc" -ne 0 ]]; then
    log "BACKUP FAILED (exit code $rc). The last-backup stamp was not updated."
  fi
}
trap on_exit EXIT

# ── Preparation ──────────────────────────────────────────────────────────────

require_cmd docker jq "$RESTIC_BIN"
ensure_dirs
load_backup_env
# backup, restore and restore-verify share one lock: they use the same repository.
acquire_lock restic

log "repository: opening"
# Clears only locks that are stale (left by a run that was killed). A stale
# lock would otherwise block pruning for ever.
restic_cmd unlock >/dev/null 2>&1 || true
if ! restic_cmd cat config >/dev/null 2>&1; then
  log "repository: not readable, so this is treated as the first run; initialising"
  restic_cmd init \
    || die "cannot open or initialise the restic repository. Check RESTIC_REPOSITORY, the access keys and the password file in $BACKUP_ENV_FILE."
fi

# ── Pending snapshots ────────────────────────────────────────────────────────
# restic saves a snapshot even when its input was incomplete (a pg_dump that
# died half way through a pipe, a file it could not read). To make sure such a
# snapshot is never mistaken for a backup, a step whose outcome restic cannot
# judge saves under a temporary "pending-..." tag. Only when the step is known
# to be good is the snapshot re-tagged "postgres" or "config"; otherwise it is
# deleted. The restore scripts only ever look at the two final tags.

snapshot_ids_tagged() {
  restic_cmd snapshots --host "$RESTIC_HOST" --tag "$1" --json | jq -r '.[]?.id'
}

# promote_pending <pending tag> <final tag>
promote_pending() {
  local ids count
  ids="$(snapshot_ids_tagged "$1")"
  count="$(printf '%s\n' "$ids" | grep -c . || true)"
  [[ "$count" -eq 1 ]] || die "expected exactly one snapshot tagged '$1', found $count"
  restic_cmd tag --set "$2" "$ids" >/dev/null
}

# discard_pending <pending tag>   (best effort)
discard_pending() {
  local ids id
  ids="$(snapshot_ids_tagged "$1" 2>/dev/null || true)"
  for id in $ids; do
    restic_cmd forget "$id" >/dev/null 2>&1 || warn "could not remove the incomplete snapshot $id"
  done
}

# Leftovers from earlier runs that were killed before they could tidy up.
stale_ids="$(restic_cmd snapshots --host "$RESTIC_HOST" --json 2>/dev/null \
  | jq -r '.[]? | select((.tags // []) | any(startswith("pending-"))) | .id' 2>/dev/null || true)"
for stale_id in $stale_ids; do
  warn "removing an incomplete snapshot left by an earlier run ($stale_id)"
  restic_cmd forget "$stale_id" >/dev/null 2>&1 || warn "could not remove $stale_id"
done

# ── PostgreSQL ───────────────────────────────────────────────────────────────

PG_DUMP=("${COMPOSE[@]}" exec -T "$PG_SERVICE" pg_dump -U "$PG_USER" -d "$PG_DATABASE" -Fc)

stdin_mode="$BACKUP_STDIN_MODE"
if [[ "$stdin_mode" == "auto" ]]; then
  if "$RESTIC_BIN" backup --help 2>&1 | grep -q -- '--stdin-from-command'; then
    stdin_mode="command"
  else
    stdin_mode="pipe"
  fi
fi

backup_postgres_command() {
  log "postgres: pg_dump -> restic (restic runs pg_dump and checks its exit code)"
  restic_cmd backup --host "$RESTIC_HOST" --tag postgres \
    --stdin-filename "$DUMP_FILENAME" --stdin-from-command -- "${PG_DUMP[@]}"
}

backup_postgres_pipe() {
  local pending_tag="pending-postgres-$RUN_ID" status
  log "postgres: pg_dump | restic (snapshot is tagged '$pending_tag' until pg_dump is confirmed)"
  set +e
  "${PG_DUMP[@]}" \
    | restic_cmd backup --host "$RESTIC_HOST" --tag "$pending_tag" --stdin --stdin-filename "$DUMP_FILENAME"
  status=("${PIPESTATUS[@]}")
  set -e

  if [[ "${status[0]}" -ne 0 || "${status[1]}" -ne 0 ]]; then
    discard_pending "$pending_tag"
    die "postgres: backup failed (pg_dump exit code ${status[0]}, restic exit code ${status[1]})"
  fi

  # pg_dump succeeded: make it a real backup.
  promote_pending "$pending_tag" postgres
  log "postgres: dump complete, snapshot re-tagged 'postgres'"
}

case "$stdin_mode" in
  command) backup_postgres_command ;;
  pipe) backup_postgres_pipe ;;
  *) die "BACKUP_STDIN_MODE must be auto, command or pipe (got '$BACKUP_STDIN_MODE')" ;;
esac

# ── Configuration files ──────────────────────────────────────────────────────
# Stored with paths relative to $BONANZA_DIR, so they can be restored straight
# into a fresh /opt/bonanza. A problem here does not stop the rest of the run
# (the database is already safe), but it does fail it: an incomplete rebuild
# kit should be noticed, not discovered during a disaster.

config_files=()
for file in $BACKUP_CONFIG_FILES; do
  if [[ -f "$BONANZA_DIR/$file" ]]; then
    config_files+=("$file")
  else
    warn "config: $BONANZA_DIR/$file does not exist and is NOT in this backup"
    EXIT_CODE=1
  fi
done

if [[ "${#config_files[@]}" -gt 0 ]]; then
  log "config: ${config_files[*]}"
  config_pending="pending-config-$RUN_ID"
  config_rc=0
  (cd "$BONANZA_DIR" && restic_cmd backup --host "$RESTIC_HOST" --tag "$config_pending" "${config_files[@]}") || config_rc=$?
  if [[ "$config_rc" -eq 0 ]]; then
    # Kept even when a listed file was missing (the run still fails at the
    # end): the files that do exist, images.env above all, must be current.
    promote_pending "$config_pending" config
  else
    # restic exits non-zero when it could not read a file. It may have saved
    # a snapshot anyway; that one is not complete and is not kept.
    discard_pending "$config_pending"
    warn "config: restic could not back up the configuration files (exit code $config_rc)"
    EXIT_CODE=1
  fi
else
  warn "config: none of the configuration files exist; nothing was backed up"
  EXIT_CODE=1
fi

# ── Retention ────────────────────────────────────────────────────────────────
# Only snapshots tagged "postgres" or "config" are considered, each series on
# its own (grouped by host and tag).

forget_args=(forget --host "$RESTIC_HOST" --tag postgres --tag config --group-by "host,tags"
  --keep-daily "$KEEP_DAILY" --keep-weekly "$KEEP_WEEKLY" --keep-monthly "$KEEP_MONTHLY")
if [[ "$BACKUP_PRUNE" == "1" ]]; then
  forget_args+=(--prune)
fi
log "retention: keep $KEEP_DAILY daily, $KEEP_WEEKLY weekly, $KEEP_MONTHLY monthly"
restic_cmd "${forget_args[@]}"

# ── Periodic integrity check ─────────────────────────────────────────────────

check_stamp="$BONANZA_STATE_DIR/last-restic-check"
check_age="$(stamp_age_seconds "$check_stamp")"
if [[ "$FORCE_CHECK" -eq 1 || -z "$check_age" || "$check_age" -ge $((CHECK_INTERVAL_DAYS * 86400)) ]]; then
  check_args=()
  if [[ -n "$RESTIC_CHECK_ARGS" ]]; then
    read -r -a check_args <<<"$RESTIC_CHECK_ARGS"
  fi
  log "check: restic check ${check_args[*]+"${check_args[*]}"}"
  restic_cmd check ${check_args[@]+"${check_args[@]}"}
  write_stamp "$check_stamp"
else
  log "check: skipped, last run $((check_age / 3600)) hours ago (every $CHECK_INTERVAL_DAYS days)"
fi

# ── Result ───────────────────────────────────────────────────────────────────

if [[ "$EXIT_CODE" -ne 0 ]]; then
  die "backup finished with problems (see the warnings above)"
fi

write_stamp "$BONANZA_STATE_DIR/last-backup"
log "backup complete"
