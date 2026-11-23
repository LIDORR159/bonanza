#!/usr/bin/env bash
# shellcheck shell=bash
#
# lib.sh - shared helpers for the BONANZA ops scripts.
#
# This file is sourced by the other scripts in this directory. It is not meant
# to be run on its own.
#
# Paths. Every one can be overridden by an environment variable, so the
# scripts can be pointed at a throwaway stack on a development machine:
#
#   BONANZA_DIR           /opt/bonanza                  application directory
#   BONANZA_STATE_DIR     $BONANZA_DIR/state            stamps, locks, logs
#   BONANZA_TMP_DIR       $BONANZA_DIR/tmp              private scratch space
#   BONANZA_COMPOSE_FILE  $BONANZA_DIR/compose.yaml     production Compose file
#   BONANZA_ENV_FILE      $BONANZA_DIR/.env             application settings
#   BONANZA_IMAGES_ENV    $BONANZA_DIR/images.env       pinned image references
#   OPS_ENV_FILE          $BONANZA_DIR/ops.env          settings for these scripts
#   BACKUP_ENV_FILE       $BONANZA_DIR/backup.env       restic repository and keys
#
# Settings files (ops.env, backup.env) are plain shell: KEY=value, one per
# line. A value set in one of those files wins over the same variable in the
# calling environment. To test with different values, point OPS_ENV_FILE or
# BACKUP_ENV_FILE at another file.
#
# Written for bash 3.2 and later, with no GNU-only tools, so the scripts also
# run on macOS for local testing.

# Everything these scripts create (dumps, stamps, logs) is private to the user.
umask 077

BONANZA_DIR="${BONANZA_DIR:-/opt/bonanza}"
OPS_ENV_FILE="${OPS_ENV_FILE:-$BONANZA_DIR/ops.env}"

# ops.env is optional. Load it before the defaults below so it can set them.
if [[ -f "$OPS_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$OPS_ENV_FILE"
  set +a
fi

BONANZA_STATE_DIR="${BONANZA_STATE_DIR:-$BONANZA_DIR/state}"
BONANZA_TMP_DIR="${BONANZA_TMP_DIR:-$BONANZA_DIR/tmp}"
BONANZA_COMPOSE_FILE="${BONANZA_COMPOSE_FILE:-$BONANZA_DIR/compose.yaml}"
BONANZA_ENV_FILE="${BONANZA_ENV_FILE:-$BONANZA_DIR/.env}"
BONANZA_IMAGES_ENV="${BONANZA_IMAGES_ENV:-$BONANZA_DIR/images.env}"
BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-$BONANZA_DIR/backup.env}"
DEPLOYMENTS_LOG="${DEPLOYMENTS_LOG:-$BONANZA_STATE_DIR/deployments.log}"

# PostgreSQL inside the Compose stack.
PG_SERVICE="${PG_SERVICE:-postgres}"
PG_USER="${PG_USER:-bonanza}"
PG_DATABASE="${PG_DATABASE:-bonanza}"

# restic. RESTIC_HOST is fixed on purpose: snapshots are grouped by host, and
# a rebuilt VM must continue the same series whatever its hostname is.
RESTIC_BIN="${RESTIC_BIN:-restic}"
RESTIC_HOST="${RESTIC_HOST:-bonanza}"
RESTIC_RETRY_LOCK="${RESTIC_RETRY_LOCK:-5m}"
DUMP_FILENAME="${DUMP_FILENAME:-bonanza.dump}"

# The Compose command, exactly as the runtime contract defines it. Kept as an
# array so it can also be handed to another program as an argument list.
COMPOSE=(docker compose
  --project-directory "$BONANZA_DIR"
  -f "$BONANZA_COMPOSE_FILE"
  --env-file "$BONANZA_ENV_FILE"
  --env-file "$BONANZA_IMAGES_ENV")

compose() { "${COMPOSE[@]}" "$@"; }

# ── Logging ──────────────────────────────────────────────────────────────────
# Plain lines on stdout/stderr. Under systemd they land in the journal, which
# adds its own timestamps. Writes never abort the script (a closed terminal
# must not stop a deployment half way).

LOG_TAG="${LOG_TAG:-$(basename "${0:-ops}" .sh)}"

log() { printf '[%s] %s\n' "$LOG_TAG" "$*" || true; }
warn() { printf '[%s] WARNING: %s\n' "$LOG_TAG" "$*" >&2 || true; }
die() {
  printf '[%s] ERROR: %s\n' "$LOG_TAG" "$*" >&2 || true
  exit 1
}

require_cmd() {
  local cmd
  for cmd in "$@"; do
    command -v "$cmd" >/dev/null 2>&1 || die "'$cmd' is not installed or not in PATH"
  done
}

# ── Time and files (portable between Linux and macOS) ────────────────────────

now_epoch() { date +%s; }
now_iso() { date -u +%Y-%m-%dT%H:%M:%SZ; }

epoch_to_iso() {
  date -u -d "@$1" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -r "$1" +%Y-%m-%dT%H:%M:%SZ
}

file_mode() { stat -c '%a' "$1" 2>/dev/null || stat -f '%Lp' "$1"; }
file_mtime() { stat -c '%Y' "$1" 2>/dev/null || stat -f '%m' "$1"; }

# Dies unless the file exists and only its owner can read it (600 or 400).
require_private_file() {
  local file="$1" mode
  [[ -f "$file" ]] || die "$file does not exist"
  mode="$(file_mode "$file")"
  if (((8#$mode & 8#077) != 0)); then
    die "$file is readable by other users (mode $mode). Fix it with: chmod 600 $file"
  fi
}

ensure_dirs() {
  mkdir -p "$BONANZA_STATE_DIR" "$BONANZA_TMP_DIR"
}

# A stamp file holds one line: "<unix seconds> <UTC time>". The first field is
# what healthwatch.sh reads; the second is for people.
write_stamp() {
  local file="$1"
  printf '%s %s\n' "$(now_epoch)" "$(now_iso)" >"$file.tmp"
  mv "$file.tmp" "$file"
}

# Prints the age of a stamp in seconds, or nothing if it is missing or unreadable.
stamp_age_seconds() {
  local file="$1" epoch
  [[ -f "$file" ]] || return 0
  epoch="$(awk 'NR==1 {print $1}' "$file" 2>/dev/null || true)"
  [[ "$epoch" =~ ^[0-9]+$ ]] || return 0
  echo $(($(now_epoch) - epoch))
}

# ── Locks ────────────────────────────────────────────────────────────────────
# A lock is a directory in the state directory; creating a directory is atomic.
# The owner's process id is kept inside so a lock left behind by a crashed run
# is recognised and replaced. Call release_locks from the script's EXIT trap.

BONANZA_HELD_LOCKS=()

lock_holder() {
  local dir="$BONANZA_STATE_DIR/$1.lock" pid
  [[ -d "$dir" ]] || return 0
  pid="$(cat "$dir/pid" 2>/dev/null || true)"
  if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
    echo "$pid"
  fi
}

acquire_lock() {
  local name="$1" dir="$BONANZA_STATE_DIR/$1.lock" holder
  mkdir -p "$BONANZA_STATE_DIR"
  if ! mkdir "$dir" 2>/dev/null; then
    holder="$(lock_holder "$name")"
    if [[ -n "$holder" ]]; then
      die "another '$name' operation is running (process $holder). Try again when it has finished."
    fi
    warn "replacing a stale '$name' lock left by a run that did not finish"
    rm -f "$dir/pid"
    rmdir "$dir" 2>/dev/null || true
    mkdir "$dir" || die "cannot create lock directory $dir"
  fi
  echo "$$" >"$dir/pid"
  BONANZA_HELD_LOCKS+=("$dir")
}

release_locks() {
  local dir
  for dir in ${BONANZA_HELD_LOCKS[@]+"${BONANZA_HELD_LOCKS[@]}"}; do
    rm -f "$dir/pid"
    rmdir "$dir" 2>/dev/null || true
  done
  BONANZA_HELD_LOCKS=()
}

# ── Backup settings ──────────────────────────────────────────────────────────

# Loads backup.env and checks that restic has what it needs.
load_backup_env() {
  require_private_file "$BACKUP_ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  . "$BACKUP_ENV_FILE"
  set +a

  local var
  for var in RESTIC_REPOSITORY RESTIC_PASSWORD_FILE; do
    [[ -n "${!var:-}" ]] || die "$var is not set in $BACKUP_ENV_FILE"
  done
  require_private_file "$RESTIC_PASSWORD_FILE"
  [[ -s "$RESTIC_PASSWORD_FILE" ]] || die "$RESTIC_PASSWORD_FILE is empty"

  # S3-compatible storage (Cloudflare R2, MinIO) needs an access key pair. A
  # repository on local disk (used in tests) does not.
  case "$RESTIC_REPOSITORY" in
    s3:*)
      for var in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
        [[ -n "${!var:-}" ]] || die "$var is not set in $BACKUP_ENV_FILE"
      done
      ;;
  esac
  export RESTIC_REPOSITORY RESTIC_PASSWORD_FILE
}

# restic with the options every call needs. --retry-lock waits for another
# restic process to finish instead of failing at once.
restic_cmd() {
  "$RESTIC_BIN" --retry-lock "$RESTIC_RETRY_LOCK" "$@"
}

# ── Compose service health ───────────────────────────────────────────────────

# The services that should be running: every service enabled by the active
# profiles (COMPOSE_PROFILES in .env). One-shot services such as "migrate"
# live in a profile that is not active, so they are not listed.
expected_services() {
  compose config --services
}

# Prints one line "<service>: <what is wrong>" for every expected service that
# is not up. Prints nothing when everything is fine.
#
#   service_problems strict    running AND healthy is required (deploy gate)
#   service_problems lenient   a container still in its health-check start
#                              period ("starting") is tolerated (monitoring)
#
# A service without a health check counts as healthy once it is running.
service_problems() {
  local mode="${1:-strict}" services svc ids id line state health
  if ! services="$(expected_services 2>/dev/null)" || [[ -z "$services" ]]; then
    echo "compose: cannot read the list of services (is $BONANZA_COMPOSE_FILE valid and are the env files present?)"
    return 0
  fi
  for svc in $services; do
    ids="$(compose ps -a -q "$svc" 2>/dev/null || true)"
    if [[ -z "$ids" ]]; then
      echo "$svc: no container"
      continue
    fi
    for id in $ids; do
      line="$(docker inspect --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$id" 2>/dev/null || echo "unknown unknown")"
      state="${line%% *}"
      health="${line##* }"
      if [[ "$state" != "running" ]]; then
        echo "$svc: container is $state"
      elif [[ "$health" == "healthy" || "$health" == "none" ]]; then
        :
      elif [[ "$health" == "starting" && "$mode" == "lenient" ]]; then
        :
      else
        echo "$svc: health check is $health"
      fi
    done
  done
}

# Waits until every expected service is running and healthy.
#   wait_healthy <timeout seconds> [poll seconds]
# Returns 0 when healthy. On timeout prints what is still wrong and returns 1.
wait_healthy() {
  local timeout="$1" interval="${2:-5}" deadline problems
  deadline=$(($(now_epoch) + timeout))
  while :; do
    problems="$(service_problems strict)"
    if [[ -z "$problems" ]]; then
      return 0
    fi
    if (($(now_epoch) >= deadline)); then
      printf '%s\n' "$problems"
      return 1
    fi
    sleep "$interval"
  done
}

# Appends one line to the deployment log.
#   record_deployment action=deploy result=ok backend=... storefront=...
record_deployment() {
  mkdir -p "$(dirname "$DEPLOYMENTS_LOG")"
  printf '%s %s\n' "$(now_iso)" "$*" >>"$DEPLOYMENTS_LOG"
}
