#!/usr/bin/env bash
# Approach 3: delegate timing to the at(1) daemon (job survives closing this shell if atd is running).
# Writes a payload under /tmp — keep it until the job runs (at executes the file by path).
set -euo pipefail

MINUTES="${1:-30}"

if ! command -v at >/dev/null 2>&1; then
  echo "at not found. Install: sudo apt install at && sudo systemctl enable --now atd" >&2
  exit 1
fi

JOB="/tmp/enter-after-30m-${$}-$(date +%s).sh"
{
  cat <<'EOS'
#!/usr/bin/env bash
set -euo pipefail
EOS
  printf 'export DISPLAY=%q\n' "${DISPLAY:-:0}"
  printf 'export WAYLAND_DISPLAY=%q\n' "${WAYLAND_DISPLAY:-wayland-0}"
  cat <<'EOS'
if command -v xdotool >/dev/null 2>&1; then
  xdotool key --clearmodifiers Return && exit 0
fi
if command -v wtype >/dev/null 2>&1; then
  wtype $'\n' && exit 0
fi
echo "enter-after-30m: neither xdotool nor wtype at run time" >&2
exit 1
EOS
} > "${JOB}"

chmod +x "${JOB}"

echo "Scheduling Enter in ${MINUTES} minute(s) via at(1)."
echo "Payload: ${JOB}"
echo "${JOB}" | at "now + ${MINUTES} minutes"
echo "Queue: atq   |   Cancel: atrm <id>"
