#!/usr/bin/env bash
#
# ssh-deploy-entrypoint.sh - the only thing the CI deploy key is allowed to run.
#
# This script is not called by people. sshd runs it, instead of whatever the
# client asked for, for every connection made with the deploy key. It reads the
# client's request from SSH_ORIGINAL_COMMAND and accepts exactly two forms:
#
#   deploy <backend-image-ref> <storefront-image-ref>
#   rollback
#
# Everything else is refused: no shell, no file copy, no other command.
#
# Install the deploy key by adding ONE line to
# /home/bonanza/.ssh/authorized_keys (replace the key and keep it on one line):
#
#   command="/opt/bonanza/ops/ssh-deploy-entrypoint.sh",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding ssh-ed25519 AAAAC3...REPLACE... bonanza-ci-deploy
#
# What CI then runs:
#
#   ssh bonanza@<host> deploy ghcr.io/lidorr159/bonanza-backend@sha256:<64 hex> ghcr.io/lidorr159/bonanza-storefront@sha256:<64 hex>
#   ssh bonanza@<host> rollback
#
# Accepted image references (anything else is refused):
#
#   ghcr.io/lidorr159/bonanza-backend:<tag>        or  ...@sha256:<64 hex digits>
#   ghcr.io/lidorr159/bonanza-storefront:<tag>     or  ...@sha256:<64 hex digits>
#
#   - the first reference must be the backend image, the second the storefront;
#   - a tag is 1-128 characters from [A-Za-z0-9_.-], not starting with . or -;
#   - the tag "latest" is refused, because it is not a pinned version;
#   - words are separated by exactly one space.
#
# The allowed repository names are fixed in this file on purpose. They cannot
# be changed through the environment.
#
# The deployment keeps running if the SSH connection drops (a cancelled CI
# job, a network glitch): its output goes to a file that is streamed back to
# the client, so it never depends on the connection staying open. It always
# ends in one of the states described in deploy.sh. The output of the last run
# is kept in $BONANZA_STATE_DIR/ssh-deploy-last.log.
#
# Exit codes: those of deploy.sh / rollback.sh, or 2 when the request is refused.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

readonly REPOSITORY_PREFIX='ghcr\.io/lidorr159/bonanza'
readonly TAG=':[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}'
readonly DIGEST='@sha256:[a-f0-9]{64}'
readonly BACKEND_PATTERN="^${REPOSITORY_PREFIX}-backend(${TAG}|${DIGEST})\$"
readonly STOREFRONT_PATTERN="^${REPOSITORY_PREFIX}-storefront(${TAG}|${DIGEST})\$"
readonly DEPLOY_PATTERN='^deploy ([^ ]+) ([^ ]+)$'

refuse() {
  echo "refused: $1" >&2
  echo "allowed: 'deploy <backend-image-ref> <storefront-image-ref>' or 'rollback'" >&2
  # Leave a trace in the system log, without echoing arbitrary client input.
  logger -t bonanza-deploy "refused a request from ${SSH_CLIENT:-unknown client}: $1" 2>/dev/null || true
  exit 2
}

request="${SSH_ORIGINAL_COMMAND:-}"

[[ -n "$request" ]] || refuse "no command given (this key cannot open a shell)"
[[ "${#request}" -le 400 ]] || refuse "request too long"

run=()
if [[ "$request" == "rollback" ]]; then
  run=("$SCRIPT_DIR/rollback.sh")
elif [[ "$request" =~ $DEPLOY_PATTERN ]]; then
  backend="${BASH_REMATCH[1]}"
  storefront="${BASH_REMATCH[2]}"
  [[ "$backend" =~ $BACKEND_PATTERN ]] || refuse "the first reference is not an allowed backend image"
  [[ "$storefront" =~ $STOREFRONT_PATTERN ]] || refuse "the second reference is not an allowed storefront image"
  case "$backend" in *:latest) refuse "the tag 'latest' is not a pinned version" ;; esac
  case "$storefront" in *:latest) refuse "the tag 'latest' is not a pinned version" ;; esac
  run=("$SCRIPT_DIR/deploy.sh" "$backend" "$storefront")
else
  refuse "command not allowed"
fi

# ── Run it, detached from the SSH connection ─────────────────────────────────

# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$SCRIPT_DIR/lib.sh"
ensure_dirs

run_log="$(mktemp "$BONANZA_TMP_DIR/ssh-deploy.XXXXXX")"
# A hang-up of the connection must not interrupt the deployment.
trap '' HUP

"${run[@]}" </dev/null >"$run_log" 2>&1 &
run_pid=$!

# Stream the output to the client. If the client has gone, tail simply ends.
tail -n +1 -f "$run_log" 2>/dev/null &
tail_pid=$!

rc=0
wait "$run_pid" || rc=$?

# Give tail a moment to send the last lines, then stop it.
sleep 1
kill "$tail_pid" 2>/dev/null || true
wait "$tail_pid" 2>/dev/null || true

mv "$run_log" "$BONANZA_STATE_DIR/ssh-deploy-last.log" 2>/dev/null || true
exit "$rc"
