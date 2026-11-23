#!/usr/bin/env bash
#
# install.sh - put the ops scripts in place on the VM and switch on their timers.
#
# Usage (on the VM, as user "bonanza", from a copy of infrastructure/ops):
#   ./systemd/install.sh
#   ./systemd/install.sh --help
#
# NEEDS SUDO. Copying the scripts does not, but installing unit files into
# /etc/systemd/system and enabling timers does; the script calls `sudo` for
# exactly those commands. On the VM the "bonanza" user has passwordless sudo.
#
# What it does:
#   1. Copies the scripts from infrastructure/ops to $BONANZA_DIR/ops (mode 750)
#      and creates $BONANZA_DIR/state and $BONANZA_DIR/tmp (mode 700).
#   2. Creates $BONANZA_DIR/ops.env and $BONANZA_DIR/backup.env from the
#      examples, mode 600, ONLY if they do not exist yet. Existing files are
#      never overwritten.
#   3. Copies the unit and timer files to /etc/systemd/system, reloads systemd,
#      and enables and starts the four timers:
#        bonanza-backup          daily 02:30 Asia/Jerusalem
#        bonanza-restore-verify  Sunday 04:30 Asia/Jerusalem
#        bonanza-healthwatch     every 5 minutes
#        bonanza-docker-prune    Saturday 05:30 Asia/Jerusalem
#
# Safe to run again after updating the scripts: it overwrites the scripts and
# unit files with the new versions and leaves the settings files alone.
#
# The backup timer starts working once backup.env is filled in. Until then
# the nightly run fails and healthwatch reports that no backup exists, which
# is the reminder to finish the setup.
#
# Settings (environment; defaults in brackets):
#   BONANZA_DIR       [/opt/bonanza] the unit files assume this path; with any
#                     other value only steps 1 and 2 are done
#   INSTALL_SYSTEMD   [1] set 0 to skip step 3 (for a local test without systemd)
#   SYSTEMD_DIR       [/etc/systemd/system]

set -euo pipefail

BONANZA_DIR="${BONANZA_DIR:-/opt/bonanza}"
INSTALL_SYSTEMD="${INSTALL_SYSTEMD:-1}"
SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"

SYSTEMD_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_SRC="$(cd "$SYSTEMD_SRC/.." && pwd)"

SCRIPTS=(lib.sh backup.sh restore-verify.sh restore.sh healthwatch.sh deploy.sh rollback.sh ssh-deploy-entrypoint.sh)
UNITS=(bonanza-backup bonanza-restore-verify bonanza-healthwatch bonanza-docker-prune)

case "${1:-}" in
  "") ;;
  -h | --help)
    sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
    exit 0
    ;;
  *)
    echo "unknown argument: $1 (try --help)" >&2
    exit 2
    ;;
esac

say() { printf '==> %s\n' "$*"; }

for script in "${SCRIPTS[@]}"; do
  [[ -f "$OPS_SRC/$script" ]] || {
    echo "ERROR: $OPS_SRC/$script is missing; run this from a complete copy of infrastructure/ops" >&2
    exit 1
  }
done
[[ -d "$BONANZA_DIR" && -w "$BONANZA_DIR" ]] || {
  echo "ERROR: $BONANZA_DIR does not exist or is not writable by $(id -un)" >&2
  exit 1
}

# ── 1. Scripts and working directories ───────────────────────────────────────

install -d -m 0750 "$BONANZA_DIR/ops"
install -d -m 0700 "$BONANZA_DIR/state" "$BONANZA_DIR/tmp"
if [[ "$OPS_SRC" == "$(cd "$BONANZA_DIR/ops" && pwd)" ]]; then
  say "running from $BONANZA_DIR/ops itself: scripts are already in place"
else
  say "installing scripts to $BONANZA_DIR/ops"
  for script in "${SCRIPTS[@]}"; do
    install -m 0750 "$OPS_SRC/$script" "$BONANZA_DIR/ops/$script"
  done
fi

# ── 2. Settings files (created once, never overwritten) ──────────────────────

for name in ops.env backup.env; do
  if [[ -e "$BONANZA_DIR/$name" ]]; then
    say "$BONANZA_DIR/$name already exists; left as it is"
  else
    install -m 0600 "$OPS_SRC/$name.example" "$BONANZA_DIR/$name"
    say "created $BONANZA_DIR/$name from the example (mode 600): edit it before relying on it"
  fi
done

# ── 3. systemd units and timers (sudo) ───────────────────────────────────────

if [[ "$INSTALL_SYSTEMD" != "1" ]]; then
  say "INSTALL_SYSTEMD=$INSTALL_SYSTEMD: unit files and timers were not installed"
  exit 0
fi
if [[ "$BONANZA_DIR" != "/opt/bonanza" ]]; then
  say "BONANZA_DIR is not /opt/bonanza, which the unit files assume: unit files and timers were not installed"
  exit 0
fi
if ! command -v systemctl >/dev/null 2>&1; then
  echo "ERROR: systemctl not found; this step only works on the VM. Use INSTALL_SYSTEMD=0 for a local test." >&2
  exit 1
fi

as_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

say "installing unit files to $SYSTEMD_DIR (sudo)"
for unit in "${UNITS[@]}"; do
  as_root install -m 0644 -o root -g root "$SYSTEMD_SRC/$unit.service" "$SYSTEMD_DIR/$unit.service"
  as_root install -m 0644 -o root -g root "$SYSTEMD_SRC/$unit.timer" "$SYSTEMD_DIR/$unit.timer"
done
as_root systemctl daemon-reload

say "enabling and starting the timers (sudo)"
for unit in "${UNITS[@]}"; do
  as_root systemctl enable --now "$unit.timer"
done

echo
systemctl list-timers 'bonanza-*' --no-pager || true
echo
say "done. Next: fill in $BONANZA_DIR/backup.env and $BONANZA_DIR/ops.env, then run $BONANZA_DIR/ops/backup.sh once by hand."
