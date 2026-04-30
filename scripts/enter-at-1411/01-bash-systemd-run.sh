#!/usr/bin/env bash
# Bash + systemd user timer: schedules an Enter press at 14:11 local time.
# Requires: systemd user session, xdotool, focused target window at trigger time.
set -euo pipefail

WHEN="${1:-14:11:00}"
UNIT="enter-at-${WHEN//:/}-xdotool"

if ! command -v systemd-run >/dev/null 2>&1; then
  echo "systemd-run not found." >&2
  exit 1
fi
if ! command -v xdotool >/dev/null 2>&1; then
  echo "xdotool not found. Install: sudo apt install xdotool" >&2
  exit 1
fi

DISPLAY_VAL="${DISPLAY:-:0}"

echo "Scheduling via systemd-run --user at ${WHEN} (unit: ${UNIT}, DISPLAY=${DISPLAY_VAL})"
systemd-run --user \
  --unit="${UNIT}" \
  --on-calendar="*-*-* ${WHEN}" \
  --property=Type=oneshot \
  --setenv="DISPLAY=${DISPLAY_VAL}" \
  /usr/bin/xdotool key --clearmodifiers Return

echo "Verify: systemctl --user list-timers | rg \"${UNIT}\" || systemctl --user status \"${UNIT}\""

