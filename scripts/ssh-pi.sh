#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-god@raspberrypi.local}"
shift || true

# Key-based SSH only (no password prompts). Fails fast if not reachable/auth'd.
exec ssh \
  -o BatchMode=yes \
  -o ConnectTimeout=5 \
  -o StrictHostKeyChecking=accept-new \
  "$HOST" \
  "$@"

