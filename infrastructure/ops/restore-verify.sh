#!/usr/bin/env bash
#
# restore-verify.sh - prove that the newest database backup can be restored.
#
# Usage:
#   restore-verify.sh                 verify the newest "postgres" snapshot
#   restore-verify.sh <snapshot-id>   verify one specific snapshot
#   restore-verify.sh --help
#
# Run as user "bonanza". The systemd timer bonanza-restore-verify.timer runs
# it once a week.
#
# What it does:
#   1. Restores the dump from the restic repository into a private temporary
#      directory (restic re-reads and verifies the restored file).
#   2. Starts a throwaway PostgreSQL container on its own internal Docker
#      network: no published port, no route to the internet, no connection to
#      the application's network.
#   3. Loads the dump into it with pg_restore, stopping at the first error.
#   4. Checks the result: the core tables exist, the migrations table is not
#      empty. Row counts are printed so a person can judge them.
#   5. Removes the container, its data volume, the network and the temporary
#      directory, whether the run succeeded or not.
#   6. On success writes $BONANZA_STATE_DIR/last-restore-verify, which
#      healthwatch.sh watches.
#
# The live database is never touched: this script does not run a single
# command against the Compose stack.
#
# Settings (environment, ops.env or backup.env; defaults in brackets):
#   VERIFY_PG_IMAGE          [postgres:17-alpine] must match the live major version
#   VERIFY_EXPECTED_TABLES   [product order customer region] tables that must exist
#   VERIFY_MIGRATIONS_TABLE  [mikro_orm_migrations] must exist and hold rows
#   VERIFY_PG_MEMORY         [1g] memory limit of the throwaway container; empty = none
#   VERIFY_START_TIMEOUT     [90] seconds to wait for the throwaway PostgreSQL
#   PG_USER / PG_DATABASE    [bonanza / bonanza] names used inside the throwaway container
#   plus the restic settings in backup.env and the paths described in lib.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$SCRIPT_DIR/lib.sh"

VERIFY_PG_IMAGE="${VERIFY_PG_IMAGE:-postgres:17-alpine}"
VERIFY_EXPECTED_TABLES="${VERIFY_EXPECTED_TABLES:-product order customer region}"
VERIFY_MIGRATIONS_TABLE="${VERIFY_MIGRATIONS_TABLE:-mikro_orm_migrations}"
VERIFY_PG_MEMORY="${VERIFY_PG_MEMORY-1g}"
VERIFY_START_TIMEOUT="${VERIFY_START_TIMEOUT:-90}"

usage() { sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'; }

SNAPSHOT="latest"
case "${1:-}" in
  "") ;;
  -h | --help)
    usage
    exit 0
    ;;
  -*)
    usage >&2
    exit 2
    ;;
  *) SNAPSHOT="$1" ;;
esac

# Docker object names must be lowercase.
NAME="bonanza-restore-verify-$(date -u +%Y%m%d%H%M%S)-$$"
WORK_DIR=""

cleanup() {
  local rc=$?
  docker rm -f -v "$NAME" >/dev/null 2>&1 || true
  docker network rm "$NAME" >/dev/null 2>&1 || true
  if [[ -n "$WORK_DIR" && -d "$WORK_DIR" && "$WORK_DIR" == "$BONANZA_TMP_DIR"/restore-verify.* ]]; then
    rm -rf "$WORK_DIR"
  fi
  release_locks
  if [[ "$rc" -ne 0 ]]; then
    log "RESTORE VERIFICATION FAILED (exit code $rc). The last-restore-verify stamp was not updated."
  fi
}
trap cleanup EXIT

sql() {
  docker exec -i "$NAME" psql -U "$PG_USER" -d "$PG_DATABASE" -v ON_ERROR_STOP=1 -At -c "$1"
}

valid_identifier() { [[ "$1" =~ ^[a-z_][a-z0-9_]*$ ]]; }

# ── Preparation ──────────────────────────────────────────────────────────────

require_cmd docker "$RESTIC_BIN"
ensure_dirs
load_backup_env
acquire_lock restic

for table in $VERIFY_EXPECTED_TABLES $VERIFY_MIGRATIONS_TABLE; do
  valid_identifier "$table" || die "'$table' is not a valid table name (lowercase letters, digits and underscores only)"
done

WORK_DIR="$(mktemp -d "$BONANZA_TMP_DIR/restore-verify.XXXXXX")"

# ── 1. Fetch the dump from the repository ────────────────────────────────────

log "restoring snapshot '$SNAPSHOT' (tag postgres, host $RESTIC_HOST) from the repository"
restic_cmd restore "$SNAPSHOT" --host "$RESTIC_HOST" --tag postgres --target "$WORK_DIR" --verify

DUMP="$WORK_DIR/$DUMP_FILENAME"
[[ -s "$DUMP" ]] || die "the snapshot does not contain a non-empty $DUMP_FILENAME (is '$SNAPSHOT' a postgres snapshot?)"
log "dump restored: $(wc -c <"$DUMP" | tr -d ' ') bytes"

# ── 2. Throwaway PostgreSQL ──────────────────────────────────────────────────

password="$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')"
run_args=(-d --name "$NAME" --network "$NAME"
  -e "POSTGRES_USER=$PG_USER" -e "POSTGRES_PASSWORD=$password" -e "POSTGRES_DB=$PG_DATABASE")
if [[ -n "$VERIFY_PG_MEMORY" ]]; then
  run_args+=(--memory "$VERIFY_PG_MEMORY")
fi

log "starting a throwaway $VERIFY_PG_IMAGE on an internal network (no published port)"
docker network create --internal "$NAME" >/dev/null
docker run "${run_args[@]}" "$VERIFY_PG_IMAGE" >/dev/null

# The image starts a temporary server while it initialises, then restarts.
# That temporary server does not listen on TCP, so asking over TCP
# (-h 127.0.0.1) reports "ready" only for the final server.
deadline=$(($(now_epoch) + VERIFY_START_TIMEOUT))
until docker exec "$NAME" pg_isready -q -h 127.0.0.1 -U "$PG_USER" -d "$PG_DATABASE" >/dev/null 2>&1; do
  if [[ "$(docker inspect --format '{{.State.Running}}' "$NAME" 2>/dev/null || echo false)" != "true" ]]; then
    docker logs --tail 30 "$NAME" >&2 || true
    die "the throwaway PostgreSQL container stopped while starting"
  fi
  if (($(now_epoch) >= deadline)); then
    docker logs --tail 30 "$NAME" >&2 || true
    die "the throwaway PostgreSQL was not ready after $VERIFY_START_TIMEOUT seconds"
  fi
  sleep 2
done

# ── 3. Load the dump ─────────────────────────────────────────────────────────

log "loading the dump with pg_restore"
docker exec -i "$NAME" pg_restore -U "$PG_USER" -d "$PG_DATABASE" \
  --exit-on-error --no-owner --no-privileges <"$DUMP"

# ── 4. Sanity checks ─────────────────────────────────────────────────────────

failures=0

table_count="$(sql "select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'")"
log "tables in schema public: $table_count"
if [[ "$table_count" -lt 1 ]]; then
  warn "the restored database has no tables"
  failures=$((failures + 1))
fi

table_exists() {
  [[ "$(sql "select count(*) from information_schema.tables where table_schema = 'public' and table_name = '$1'")" == "1" ]]
}

for table in $VERIFY_EXPECTED_TABLES; do
  if table_exists "$table"; then
    log "table $table: $(sql "select count(*) from public.\"$table\"") rows"
  else
    warn "expected table '$table' is missing from the restored database"
    failures=$((failures + 1))
  fi
done

if table_exists "$VERIFY_MIGRATIONS_TABLE"; then
  migrations="$(sql "select count(*) from public.\"$VERIFY_MIGRATIONS_TABLE\"")"
  log "table $VERIFY_MIGRATIONS_TABLE: $migrations rows"
  if [[ "$migrations" -lt 1 ]]; then
    warn "the migrations table '$VERIFY_MIGRATIONS_TABLE' is empty"
    failures=$((failures + 1))
  fi
else
  warn "the migrations table '$VERIFY_MIGRATIONS_TABLE' is missing from the restored database"
  failures=$((failures + 1))
fi

log "database size after restore: $(sql "select pg_size_pretty(pg_database_size(current_database()))")"

if [[ "$failures" -ne 0 ]]; then
  die "$failures sanity check(s) failed: this backup would not give a working store"
fi

# ── 5. Result (the EXIT trap removes the container, network and files) ───────

write_stamp "$BONANZA_STATE_DIR/last-restore-verify"
log "restore verification passed for snapshot '$SNAPSHOT'"
