#!/usr/bin/env bash
# Approach 2: same shell waits N seconds, then types newline via wtype (native Wayland on wlroots/sway, etc.).
# Requires: wtype, active Wayland session (WAYLAND_DISPLAY, e.g. wayland-0).
set -euo pipefail

MINUTES="${1:-30}"
DELAY_SEC=$((MINUTES * 60))

export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"

if ! command -v wtype >/dev/null 2>&1; then
  echo "wtype not found. Install: sudo apt install wtype" >&2
  exit 1
fi

echo "Will send Enter (newline) via wtype in ${MINUTES} minute(s) (${DELAY_SEC}s). Ctrl+C to abort."
sleep "${DELAY_SEC}"

# Types a literal newline / Enter in the focused surface
wtype $'\n'
