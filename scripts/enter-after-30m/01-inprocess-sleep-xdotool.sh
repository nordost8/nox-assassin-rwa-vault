#!/usr/bin/env bash
# Approach 1: same shell waits N seconds, then sends Return via xdotool (X11 / XWayland-friendly when focused X window).
# Requires: xdotool, X session with DISPLAY set (often :0).
set -euo pipefail

MINUTES="${1:-30}"
DELAY_SEC=$((MINUTES * 60))

export DISPLAY="${DISPLAY:-:0}"

if ! command -v xdotool >/dev/null 2>&1; then
  echo "xdotool not found. Install: sudo apt install xdotool" >&2
  exit 1
fi

echo "Will press Enter via xdotool in ${MINUTES} minute(s) (${DELAY_SEC}s). Ctrl+C to abort."
sleep "${DELAY_SEC}"

# --clearmodifiers avoids stuck Shift/Ctrl breaking the key
xdotool key --clearmodifiers Return
