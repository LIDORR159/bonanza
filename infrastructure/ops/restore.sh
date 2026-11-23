#!/usr/bin/env bash
#
# restore.sh - replace the LIVE database with a backup. For disaster recovery.
#
# Usage:
#   restore.sh --list                          show the available snapshots and stop
#   restore.sh                                 restore the newest snapshot (asks first)
#   restore.sh --snapshot <id>                 restore one specific snapshot (asks first)
#   restore.sh --from-file <path>              restore a local pg_dump custom-format file
#   restore.sh ... --yes-i-am-sure             do not ask (for non-interactive use)
#   restore.sh --help
#
# Run as user "bonanza". It refuses to run unless you type RESTORE at the
# prompt or pass --yes-i-am-sure. Without a terminal and without that flag it
# stops before changing anything.
#
# Everything written to the store after the chosen snapshot was taken (orders,
# customers, stock changes) will be missing from the restored database.
#
# What it does, in order:
#   1. Fetches the dump from the restic repository and checks that
#      pg_restore can read it. Nothing has been changed at this point.
#   2. Stops the application services (medusa-server, medusa-worker,
#      storefront) so nothing writes to the database.
#   3. Loads the dump into a NEW database next to the live one. If this fails,
#      the new database is dropped, the application is started again on the
#      untouched live database, and the script exits non-zero.
#   4. Swaps the two databases by renaming them in one transaction. The
#      database that was live is kept as "<name>_before_restore_<time>"; it is
#      your undo and it is yours to drop when you no longer need it.
#   5. Starts the application services that were running before and waits for
#      the stack to become healthy.
#
# Redis is not touched. It holds queues and sessions, not business data.
#
# Settings (environment, ops.env or backup.env; defaults in brackets):
#   APP_SERVICES             [medusa-server medusa-worker storefront]
#   RESTORE_HEALTH_TIMEOUT   [300] seconds to wait for the stack afterwards
#   PG_START_TIMEOUT         [120] seconds to wait for PostgreSQL to accept connections
#   PG_SERVICE / PG_USER / PG_DATABASE   [postgres / bonanza / bonanza]
#   plus the restic settings in backup.env and the paths described in lib.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$SCRIPT_DIR/lib.sh"

APP_SERVICES="${APP_SERVICES:-medusa-server medusa-worker storefront}"
RESTORE_HEALTH_TIMEOUT="${RESTORE_HEALTH_TIMEOUT:-300}"
PG_START_TIMEOUT="${PG_START_TIMEOUT:-120}"

usage() { sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'; }

SNAPSHOT="latest"
FROM_FILE=""
LIST_ONLY=0
ASSUME_YES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --list) LIST_ONLY=1 ;;
    --snapshot)
      [[ $# -ge 2 ]] || die "--snapshot needs a snapshot ID"
      SNAPSHOT="$2"
      shift
      ;;
    --from-file)
      [[ $# -ge 2 ]] || die "--from-file needs a path"
      FROM_FILE="$2"
      shift
      ;;
    --yes-i-am-sure) ASSUME_YES=1 ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 2
      ;;
  esac
  shift
done

valid_identifier() { [[ "$1" =~ ^[a-z_][a-z0-9_]*$ ]]; }
valid_identifier "$PG_DATABASE" || die "PG_DATABASE '$PG_DATABASE' is not a simple lowercase identifier"
valid_identifier "$PG_USER" || die "PG_USER '$PG_USER' is not a simple lowercase identifier"

STAMP="$(date -u +%Y%m%d%H%M%S)"
NEW_DB="${PG_DATABASE}_restore_${STAMP}"
OLD_DB="${PG_DATABASE}_before_restore_${STAMP}"

WORK_DIR=""
STOPPED_APPS=()
NEW_DB_CREATED=0
SWAPPED=0

pg_exec() { compose exec -T "$PG_SERVICE" "$@"; }
# SQL against the maintenance database "postgres", never against the live one.
pg_admin() { pg_exec psql -U "$PG_USER" -d postgres -v ON_ERROR_STOP=1 -At -c "$1"; }

start_apps() {
  if [[ "${#STOPPED_APPS[@]}" -gt 0 ]]; then
    log "starting ${STOPPED_APPS[*]}"
    compose start "${STOPPED_APPS[@]}"
  fi
}

cleanup() {
  local rc=$?
  trap - EXIT
  if [[ "$rc" -ne 0 && "$SWAPPED" -eq 0 ]]; then
    # Failed before the swap: the live database has not been changed.
    if [[ "$NEW_DB_CREATED" -eq 1 ]]; then
      pg_admin "DROP DATABASE IF EXISTS \"$NEW_DB\" WITH (FORCE)" >/dev/null 2>&1 \
        || warn "could not drop the half-loaded database $NEW_DB; drop it by hand"
    fi
    if [[ "${#STOPPED_APPS[@]}" -gt 0 ]]; then
      warn "restore failed before the swap; the live database is unchanged. Starting the application again."
      start_apps || warn "could not start the application services; start them by hand"
    fi
  fi
  if [[ -n "$WORK_DIR" && -d "$WORK_DIR" && "$WORK_DIR" == "$BONANZA_TMP_DIR"/restore.* ]]; then
    rm -rf "$WORK_DIR"
  fi
  release_locks
  if [[ "$rc" -ne 0 ]]; then
    if [[ "$SWAPPED" -eq 1 ]]; then
      log "RESTORE INCOMPLETE (exit code $rc): the database WAS replaced, but the stack is not healthy. The previous database is kept as $OLD_DB."
    else
      log "RESTORE FAILED (exit code $rc): the live database was not changed."
    fi
  fi
  exit "$rc"
}
trap cleanup EXIT

# ── Preparation ──────────────────────────────────────────────────────────────

require_cmd docker
ensure_dirs

if [[ -z "$FROM_FILE" || "$LIST_ONLY" -eq 1 ]]; then
  require_cmd "$RESTIC_BIN" jq
  load_backup_env
fi

if [[ "$LIST_ONLY" -eq 1 ]]; then
  restic_cmd snapshots --host "$RESTIC_HOST" --tag postgres
  exit 0
fi

if [[ -n "$FROM_FILE" ]]; then
  [[ -s "$FROM_FILE" ]] || die "$FROM_FILE does not exist or is empty"
  SOURCE_DESCRIPTION="file $FROM_FILE"
else
  log "snapshots tagged 'postgres' in the repository:"
  restic_cmd snapshots --host "$RESTIC_HOST" --tag postgres --compact
  if [[ "$SNAPSHOT" == "latest" ]]; then
    chosen="$(restic_cmd snapshots --host "$RESTIC_HOST" --tag postgres --json | jq -r '.[-1]? | select(. != null) | "\(.short_id) taken \(.time)"')"
  else
    chosen="$(restic_cmd snapshots --json "$SNAPSHOT" | jq -r '.[0]? | select(. != null) | "\(.short_id) taken \(.time)"')"
  fi
  [[ -n "$chosen" ]] || die "no snapshot found for '$SNAPSHOT'"
  SOURCE_DESCRIPTION="snapshot $chosen"
fi

# ── Confirmation ─────────────────────────────────────────────────────────────

cat <<EOF

  You are about to REPLACE the live database "$PG_DATABASE" with:
      $SOURCE_DESCRIPTION

  Everything written to the store after that backup was taken will be missing
  from the restored database. The application will be stopped while this runs.
  The current database is kept as "$OLD_DB" until you drop it.

EOF

if [[ "$ASSUME_YES" -ne 1 ]]; then
  if [[ ! -t 0 ]]; then
    die "refusing to continue without confirmation: there is no terminal to ask on. Re-run with --yes-i-am-sure if this is intended."
  fi
  printf '  Type RESTORE to continue: '
  read -r answer
  [[ "$answer" == "RESTORE" ]] || die "not confirmed; nothing was changed"
fi

# A restore must not overlap a backup or a deployment.
if [[ -z "$FROM_FILE" ]]; then
  acquire_lock restic
fi
acquire_lock deploy

# ── 1. Get the dump and make sure it is readable ─────────────────────────────

if [[ -n "$FROM_FILE" ]]; then
  DUMP="$FROM_FILE"
else
  WORK_DIR="$(mktemp -d "$BONANZA_TMP_DIR/restore.XXXXXX")"
  log "fetching the dump from the repository"
  restic_cmd restore "$SNAPSHOT" --host "$RESTIC_HOST" --tag postgres --target "$WORK_DIR" --verify
  DUMP="$WORK_DIR/$DUMP_FILENAME"
  [[ -s "$DUMP" ]] || die "the snapshot does not contain a non-empty $DUMP_FILENAME (is '$SNAPSHOT' a postgres snapshot?)"
fi

log "making sure PostgreSQL is running"
compose up -d "$PG_SERVICE"
deadline=$(($(now_epoch) + PG_START_TIMEOUT))
until pg_exec pg_isready -q -h 127.0.0.1 -U "$PG_USER" -d postgres >/dev/null 2>&1; do
  (($(now_epoch) < deadline)) || die "PostgreSQL did not accept connections within $PG_START_TIMEOUT seconds"
  sleep 2
done

log "checking that the dump is a readable pg_dump archive"
pg_exec pg_restore --list <"$DUMP" >/dev/null \
  || die "pg_restore cannot read the dump; nothing was changed"

# ── 2. Stop the application ──────────────────────────────────────────────────

for svc in $APP_SERVICES; do
  if [[ -n "$(compose ps -q --status running "$svc" 2>/dev/null || true)" ]]; then
    STOPPED_APPS+=("$svc")
  fi
done
if [[ "${#STOPPED_APPS[@]}" -gt 0 ]]; then
  log "stopping ${STOPPED_APPS[*]}"
  compose stop "${STOPPED_APPS[@]}"
else
  log "none of the application services ($APP_SERVICES) is running; nothing to stop"
fi

# ── 3. Load the dump into a new database ─────────────────────────────────────

log "loading the dump into a new database ($NEW_DB)"
pg_admin "CREATE DATABASE \"$NEW_DB\" OWNER \"$PG_USER\" TEMPLATE template0" >/dev/null
NEW_DB_CREATED=1
pg_exec pg_restore -U "$PG_USER" -d "$NEW_DB" --exit-on-error --no-owner <"$DUMP"

tables="$(pg_exec psql -U "$PG_USER" -d "$NEW_DB" -v ON_ERROR_STOP=1 -At \
  -c "select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'")"
[[ "$tables" -ge 1 ]] || die "the restored database has no tables; refusing to swap it in"
log "restored database has $tables tables"

# ── 4. Swap ──────────────────────────────────────────────────────────────────
# Both renames happen in one transaction: either the restored database becomes
# live and the old one is kept under a new name, or nothing changes. A rename
# needs the database to have no connections, so remaining ones are closed
# first; the attempt is repeated because a health check may reconnect.

live_exists="$(pg_admin "select count(*) from pg_database where datname = '$PG_DATABASE'")"

swap() {
  pg_admin "select pg_terminate_backend(pid) from pg_stat_activity where datname in ('$PG_DATABASE', '$NEW_DB') and pid <> pg_backend_pid()" >/dev/null || return 1
  if [[ "$live_exists" == "1" ]]; then
    pg_exec psql -U "$PG_USER" -d postgres -v ON_ERROR_STOP=1 -q --single-transaction <<SQL
ALTER DATABASE "$PG_DATABASE" RENAME TO "$OLD_DB";
ALTER DATABASE "$NEW_DB" RENAME TO "$PG_DATABASE";
SQL
  else
    pg_admin "ALTER DATABASE \"$NEW_DB\" RENAME TO \"$PG_DATABASE\"" >/dev/null
  fi
}

log "swapping the restored database in"
attempt=1
until swap; do
  if [[ "$attempt" -ge 5 ]]; then
    die "could not swap the databases after $attempt attempts"
  fi
  attempt=$((attempt + 1))
  sleep 2
done
SWAPPED=1
if [[ "$live_exists" == "1" ]]; then
  log "the database that was live is kept as $OLD_DB"
fi
record_deployment "action=restore result=swapped source=\"$SOURCE_DESCRIPTION\" kept_previous_database=$OLD_DB"

# ── 5. Start the application ─────────────────────────────────────────────────

if [[ "${#STOPPED_APPS[@]}" -gt 0 ]]; then
  start_apps
  log "waiting up to $RESTORE_HEALTH_TIMEOUT seconds for the stack to become healthy"
  if ! problems="$(wait_healthy "$RESTORE_HEALTH_TIMEOUT")"; then
    printf '%s\n' "$problems" >&2
    die "the database was restored but the stack is not healthy"
  fi
  log "stack is healthy"
else
  log "the application services were not running before, so none were started."
  log "start the stack with deploy.sh, or: docker compose --env-file .env --env-file images.env up -d"
fi

cat <<EOF

  Restore complete: "$PG_DATABASE" now holds $SOURCE_DESCRIPTION.

EOF
if [[ "$live_exists" == "1" ]]; then
  cat <<EOF
  The previous database is still there as "$OLD_DB" and uses disk space.
  When you are sure you do not need it, drop it from $BONANZA_DIR:

    docker compose --env-file .env --env-file images.env exec -T $PG_SERVICE \\
      psql -U $PG_USER -d postgres -c 'DROP DATABASE "$OLD_DB"'

EOF
fi
