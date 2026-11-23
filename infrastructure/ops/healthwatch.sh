#!/usr/bin/env bash
#
# healthwatch.sh - check the server and the stack, and raise an alert when
# something changes for the worse (or gets better again).
#
# Usage:
#   healthwatch.sh                run all checks once
#   healthwatch.sh --test-alert   send a test alert to ALERT_WEBHOOK_URL and stop
#   healthwatch.sh --help
#
# Run as user "bonanza". The systemd timer bonanza-healthwatch.timer runs it
# every 5 minutes.
#
# Checks:
#   - every Compose service of the active profile is running and healthy
#     (a container still inside its health-check start period is tolerated);
#   - disk usage of / and of Docker's data directory: warning at 80%,
#     critical at 90%;
#   - the last successful backup is not older than 26 hours;
#   - the last successful restore verification is not older than 8 days;
#   - available memory is not below MEM_MIN_AVAILABLE_MB;
#   - a reboot required by a package update is not overdue (it is expected to
#     happen by itself at 03:30; pending for more than 26 hours means it did not).
#
# Every run prints each result to stdout (the systemd journal).
#
# Alerts are sent only when something changes:
#   - a problem appears, or its severity changes      -> one alert
#   - a problem is still there 24 hours after the last alert about it
#                                                      -> one reminder
#   - a problem goes away                              -> one "resolved" alert
# What has already been reported is kept in $BONANZA_STATE_DIR/healthwatch.state.
# If the alert cannot be delivered, the state is left as it was, so the next
# run tries again. While a deployment or restore holds the "deploy" lock, the
# run is skipped: services are expected to restart then.
#
# Alert delivery: one HTTP POST of a JSON body to ALERT_WEBHOOK_URL. The body
# carries the same text under the field names the common services expect, so
# one shape works for all of them (each service ignores the fields it does
# not know):
#
#   {
#     "text":     "<title>\n<lines>",     Slack incoming webhook
#     "content":  "<title>\n<lines>",     Discord webhook (cut to 1900 characters)
#     "title":    "<title>",              ntfy
#     "message":  "<lines>",              ntfy
#     "priority": 3 | 4 | 5,              ntfy (3 resolved, 4 warning, 5 critical)
#     "tags":     ["warning"],            ntfy ("white_check_mark" when all resolved)
#     "topic":    "<ALERT_NTFY_TOPIC>"    ntfy; only present when that variable is set
#   }
#
#   Slack / Discord: ALERT_WEBHOOK_URL is the webhook URL.
#   ntfy: ALERT_WEBHOOK_URL is the server's root URL (for example
#         https://ntfy.sh) and ALERT_NTFY_TOPIC is the topic. ntfy reads JSON
#         only at the root URL; posted to a topic URL the JSON would be shown
#         as raw text.
#
# Exit code: 0, whatever the checks find. Non-zero only if the script itself
# cannot run (for example the state directory is not writable).
#
# Settings (environment or ops.env; defaults in brackets):
#   ALERT_WEBHOOK_URL            [] empty = log only, send nothing
#   ALERT_NTFY_TOPIC             [] ntfy topic, see above
#   ALERT_NAME                   [bonanza] label at the start of every alert title
#   ALERT_REMINDER_HOURS         [24]
#   ALERT_TIMEOUT_SECONDS        [15]
#   DISK_WARN_PCT / DISK_CRIT_PCT          [80 / 90]
#   DISK_PATHS                   [/ and Docker's data directory] space-separated
#   BACKUP_MAX_AGE_HOURS         [26]
#   RESTORE_VERIFY_MAX_AGE_DAYS  [8]
#   MEM_MIN_AVAILABLE_MB         [1024]
#   REBOOT_REQUIRED_FILE         [/var/run/reboot-required]
#   REBOOT_PENDING_MAX_HOURS     [26]
#   plus the paths described in lib.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$SCRIPT_DIR/lib.sh"

ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
ALERT_NTFY_TOPIC="${ALERT_NTFY_TOPIC:-}"
ALERT_NAME="${ALERT_NAME:-bonanza}"
ALERT_REMINDER_HOURS="${ALERT_REMINDER_HOURS:-24}"
ALERT_TIMEOUT_SECONDS="${ALERT_TIMEOUT_SECONDS:-15}"
DISK_WARN_PCT="${DISK_WARN_PCT:-80}"
DISK_CRIT_PCT="${DISK_CRIT_PCT:-90}"
DISK_PATHS="${DISK_PATHS:-}"
BACKUP_MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-26}"
RESTORE_VERIFY_MAX_AGE_DAYS="${RESTORE_VERIFY_MAX_AGE_DAYS:-8}"
MEM_MIN_AVAILABLE_MB="${MEM_MIN_AVAILABLE_MB:-1024}"
REBOOT_REQUIRED_FILE="${REBOOT_REQUIRED_FILE:-/var/run/reboot-required}"
REBOOT_PENDING_MAX_HOURS="${REBOOT_PENDING_MAX_HOURS:-26}"

STATE_FILE="$BONANZA_STATE_DIR/healthwatch.state"

usage() { sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'; }

# ── Alert delivery ───────────────────────────────────────────────────────────

# send_alert <title> <body> <priority 3|4|5> <ntfy tag>
# Returns 0 when delivered, or when no webhook is configured (log only).
send_alert() {
  local title="$1" body="$2" priority="$3" tag="$4" payload
  if [[ -z "$ALERT_WEBHOOK_URL" ]]; then
    log "ALERT_WEBHOOK_URL is not set: the alert above was logged only"
    return 0
  fi
  payload="$(jq -cn \
    --arg title "$title" \
    --arg body "$body" \
    --arg topic "$ALERT_NTFY_TOPIC" \
    --arg tag "$tag" \
    --argjson priority "$priority" \
    '{
       text: ($title + "\n" + $body),
       content: (($title + "\n" + $body) | .[0:1900]),
       title: $title,
       message: $body,
       priority: $priority,
       tags: [$tag]
     } + (if $topic == "" then {} else {topic: $topic} end)')" || return 1
  # The URL is a secret (anyone who has it can post), so it is never logged.
  curl --fail --silent --show-error --max-time "$ALERT_TIMEOUT_SECONDS" \
    -H 'Content-Type: application/json' -d "$payload" "$ALERT_WEBHOOK_URL" >/dev/null
}

case "${1:-}" in
  "") ;;
  --test-alert)
    require_cmd curl jq
    [[ -n "$ALERT_WEBHOOK_URL" ]] || die "ALERT_WEBHOOK_URL is not set (in $OPS_ENV_FILE or the environment)"
    if send_alert "[$ALERT_NAME] test alert" "This is a test from healthwatch.sh on $(hostname). Nothing is wrong." 3 "white_check_mark"; then
      log "test alert delivered"
      exit 0
    fi
    die "the test alert could not be delivered"
    ;;
  -h | --help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

require_cmd docker jq curl awk df
ensure_dirs

if [[ -n "$(lock_holder deploy)" ]]; then
  log "a deployment or restore is in progress; skipping this run"
  exit 0
fi

WORK_DIR="$(mktemp -d "$BONANZA_TMP_DIR/healthwatch.XXXXXX")"
# shellcheck disable=SC2329 # called by the EXIT trap
cleanup() {
  if [[ -n "$WORK_DIR" && -d "$WORK_DIR" && "$WORK_DIR" == "$BONANZA_TMP_DIR"/healthwatch.* ]]; then
    rm -rf "$WORK_DIR"
  fi
}
trap cleanup EXIT

# One line per problem found in this run: key <TAB> severity <TAB> message.
# The key identifies the problem between runs; severity is "warning" or "critical".
PROBLEMS="$WORK_DIR/problems"
: >"$PROBLEMS"

problem() {
  printf '%s\t%s\t%s\n' "$1" "$2" "$3" >>"$PROBLEMS"
  log "$(printf '%s' "$2" | tr '[:lower:]' '[:upper:]'): $3"
}
fine() { log "ok: $*"; }

# ── Checks ───────────────────────────────────────────────────────────────────
# Each check reports through problem/fine and never stops the script.

check_services() {
  local line svc what found=0
  if ! docker info >/dev/null 2>&1; then
    problem "docker" critical "the Docker daemon is not reachable"
    return 0
  fi
  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    found=1
    svc="${line%%:*}"
    what="${line#*: }"
    problem "service:$svc" critical "service $svc: $what"
  done < <(service_problems lenient)
  if [[ "$found" -eq 0 ]]; then
    fine "all Compose services are running and healthy"
  fi
}

disk_usage_pct() { df -P "$1" 2>/dev/null | awk 'NR==2 {gsub("%", "", $5); print $5}'; }
disk_device() { df -P "$1" 2>/dev/null | awk 'NR==2 {print $1}'; }

check_disks() {
  local paths="$DISK_PATHS" docker_root path pct device seen=" "
  if [[ -z "$paths" ]]; then
    paths="/"
    docker_root="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || true)"
    # On a development machine Docker's directory lives inside a VM and is
    # not visible here; it is then left out.
    if [[ -n "$docker_root" && -d "$docker_root" ]]; then
      paths="$paths $docker_root"
    fi
  fi
  for path in $paths; do
    pct="$(disk_usage_pct "$path")"
    device="$(disk_device "$path")"
    if [[ ! "$pct" =~ ^[0-9]+$ ]]; then
      problem "disk:$path" warning "disk usage of $path could not be read"
      continue
    fi
    # Two paths on the same filesystem are reported once.
    case "$seen" in
      *" $device "*)
        fine "disk $path is on the same filesystem as a path already checked ($device)"
        continue
        ;;
    esac
    seen="$seen$device "
    if [[ "$pct" -ge "$DISK_CRIT_PCT" ]]; then
      problem "disk:$path" critical "disk $path is ${pct}% full (critical at ${DISK_CRIT_PCT}%)"
    elif [[ "$pct" -ge "$DISK_WARN_PCT" ]]; then
      problem "disk:$path" warning "disk $path is ${pct}% full (warning at ${DISK_WARN_PCT}%)"
    else
      fine "disk $path is ${pct}% full"
    fi
  done
}

check_backup_age() {
  local age max=$((BACKUP_MAX_AGE_HOURS * 3600))
  age="$(stamp_age_seconds "$BONANZA_STATE_DIR/last-backup")"
  if [[ -z "$age" ]]; then
    problem "backup-age" critical "no successful backup has been recorded yet (run backup.sh)"
  elif [[ "$age" -gt "$max" ]]; then
    problem "backup-age" critical "the last successful backup is $((age / 3600)) hours old (limit ${BACKUP_MAX_AGE_HOURS} hours)"
  else
    fine "last successful backup $((age / 3600)) hours ago"
  fi
}

check_restore_verify_age() {
  local age max=$((RESTORE_VERIFY_MAX_AGE_DAYS * 86400))
  age="$(stamp_age_seconds "$BONANZA_STATE_DIR/last-restore-verify")"
  if [[ -z "$age" ]]; then
    problem "restore-verify-age" warning "no successful restore verification has been recorded yet (run restore-verify.sh)"
  elif [[ "$age" -gt "$max" ]]; then
    problem "restore-verify-age" warning "the last successful restore verification is $((age / 86400)) days old (limit ${RESTORE_VERIFY_MAX_AGE_DAYS} days)"
  else
    fine "last successful restore verification $((age / 86400)) days ago"
  fi
}

check_memory() {
  local available_kb available_mb
  if [[ ! -r /proc/meminfo ]]; then
    fine "memory check skipped (/proc/meminfo is not available on this system)"
    return 0
  fi
  available_kb="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
  if [[ ! "$available_kb" =~ ^[0-9]+$ ]]; then
    problem "memory" warning "available memory could not be read"
    return 0
  fi
  available_mb=$((available_kb / 1024))
  if [[ "$available_mb" -lt "$MEM_MIN_AVAILABLE_MB" ]]; then
    problem "memory" warning "only ${available_mb} MB of memory is available (minimum ${MEM_MIN_AVAILABLE_MB} MB)"
  else
    fine "${available_mb} MB of memory available"
  fi
}

check_reboot() {
  local since hours
  if [[ ! -e "$REBOOT_REQUIRED_FILE" ]]; then
    fine "no reboot pending"
    return 0
  fi
  since="$(file_mtime "$REBOOT_REQUIRED_FILE" 2>/dev/null || true)"
  if [[ ! "$since" =~ ^[0-9]+$ ]]; then
    problem "reboot" warning "a reboot is pending, since an unknown time"
    return 0
  fi
  hours=$((($(now_epoch) - since) / 3600))
  if [[ "$hours" -ge "$REBOOT_PENDING_MAX_HOURS" ]]; then
    problem "reboot" warning "a reboot has been pending for ${hours} hours; the automatic 03:30 reboot has not happened"
  else
    fine "a reboot is pending (for ${hours} hours); it is expected to happen automatically at 03:30"
  fi
}

check_failed() { problem "healthwatch:$1" warning "the check '$1' could not run"; }

check_services || check_failed services
check_disks || check_failed disks
check_backup_age || check_failed backup-age
check_restore_verify_age || check_failed restore-verify-age
check_memory || check_failed memory
check_reboot || check_failed reboot

# ── Compare with what was already reported ───────────────────────────────────
# State file, one line per known problem:
#   key <TAB> severity <TAB> first seen (unix) <TAB> last alert (unix) <TAB> message

NOW="$(now_epoch)"
REMINDER_SECONDS=$((ALERT_REMINDER_HOURS * 3600))
NEW_STATE="$WORK_DIR/state.new"
NOTICE="$WORK_DIR/notice"
: >"$NEW_STATE"
: >"$NOTICE"
touch "$STATE_FILE"

worst=3 # ntfy priority of the alert: 3 resolved only, 4 warning, 5 critical
raise() {
  if [[ "$1" == "critical" ]]; then
    worst=5
  elif [[ "$worst" -lt 4 ]]; then
    worst=4
  fi
}

state_field() { # state_field <key> <column number>
  awk -F'\t' -v key="$1" -v col="$2" '$1 == key {print $col; exit}' "$STATE_FILE"
}

while IFS=$'\t' read -r key severity message; do
  [[ -n "$key" ]] || continue
  label="$(printf '%s' "$severity" | tr '[:lower:]' '[:upper:]')"
  old_severity="$(state_field "$key" 2)"
  first_seen="$(state_field "$key" 3)"
  last_alert="$(state_field "$key" 4)"
  if [[ -z "$old_severity" ]]; then
    first_seen="$NOW"
    last_alert="$NOW"
    printf 'NEW %s: %s\n' "$label" "$message" >>"$NOTICE"
    raise "$severity"
  elif [[ "$old_severity" != "$severity" ]]; then
    last_alert="$NOW"
    printf 'NOW %s (was %s): %s\n' "$label" "$old_severity" "$message" >>"$NOTICE"
    raise "$severity"
  elif [[ $((NOW - last_alert)) -ge "$REMINDER_SECONDS" ]]; then
    last_alert="$NOW"
    printf 'STILL %s since %s: %s\n' "$label" "$(epoch_to_iso "$first_seen")" "$message" >>"$NOTICE"
    raise "$severity"
  fi
  printf '%s\t%s\t%s\t%s\t%s\n' "$key" "$severity" "$first_seen" "$last_alert" "$message" >>"$NEW_STATE"
done <"$PROBLEMS"

while IFS=$'\t' read -r key severity first_seen last_alert message; do
  [[ -n "$key" ]] || continue
  if ! awk -F'\t' -v key="$key" '$1 == key {found = 1} END {exit !found}' "$PROBLEMS"; then
    printf 'RESOLVED: %s\n' "$message" >>"$NOTICE"
    log "resolved: $message"
  fi
done <"$STATE_FILE"

# ── Report ───────────────────────────────────────────────────────────────────

open_count="$(grep -c . "$NEW_STATE" || true)"

if [[ ! -s "$NOTICE" ]]; then
  # Nothing new to say. The timestamps in the state did not change either.
  log "summary: $open_count open problem(s), nothing new to report"
  exit 0
fi

if [[ "$open_count" -eq 0 ]]; then
  title="[$ALERT_NAME] all clear"
  tag="white_check_mark"
else
  title="[$ALERT_NAME] $open_count open problem(s)"
  tag="warning"
fi

log "alert: $title"
while IFS= read -r line; do log "alert:   $line"; done <"$NOTICE"

if send_alert "$title" "$(cat "$NOTICE")" "$worst" "$tag"; then
  mv "$NEW_STATE" "$STATE_FILE"
else
  # Keep the old state so the same alert is attempted again on the next run.
  warn "the alert could not be delivered to ALERT_WEBHOOK_URL; it will be retried on the next run"
fi

exit 0
