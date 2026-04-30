#!/usr/bin/env python3
"""
Python + at(1): schedules an Enter press at 14:11 local time.
Requires: at, atd running, and either xdotool (X11) or wtype (Wayland) installed.
"""
from __future__ import annotations

import os
import subprocess
import sys
import time


def sh(*args: str) -> None:
    subprocess.run(list(args), check=True)


def main() -> int:
    when = sys.argv[1] if len(sys.argv) > 1 else "14:11"
    display = os.environ.get("DISPLAY", ":0")
    wayland = os.environ.get("WAYLAND_DISPLAY", "wayland-0")

    if subprocess.call(["bash", "-lc", "command -v at >/dev/null 2>&1"]) != 0:
        print("at not found. Install: sudo apt install at && sudo systemctl enable --now atd", file=sys.stderr)
        return 1

    payload = f"""\nexport DISPLAY={display!s}\nexport WAYLAND_DISPLAY={wayland!s}\nif command -v xdotool >/dev/null 2>&1; then\n  xdotool key --clearmodifiers Return\nelif command -v wtype >/dev/null 2>&1; then\n  wtype $'\\n'\nelse\n  echo 'enter-at-1411: neither xdotool nor wtype available' >&2\n  exit 1\nfi\n"""

    # at reads commands from stdin
    print(f"Scheduling via at(1) at {when} (DISPLAY={display}, WAYLAND_DISPLAY={wayland})")
    p = subprocess.Popen(["at", when], stdin=subprocess.PIPE, text=True)
    assert p.stdin is not None
    p.stdin.write(payload)
    p.stdin.close()
    rc = p.wait()
    if rc != 0:
        return rc

    # small delay so atq reflects new job
    time.sleep(0.2)
    print("Verify: atq")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

