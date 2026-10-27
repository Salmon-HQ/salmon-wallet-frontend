#!/usr/bin/env bash
# Unlocks the Android test emulator's screen lock with SALMON_SEED_VAULT_PIN from .env.test, without
# printing it. Until the PIN is entered after a boot, Android keeps app storage sealed and run.sh refuses.
# Usage: apps/mobile/.maestro/android-unlock.sh [--device emulator-5554]
set -euo pipefail
SUITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADB=(adb)
[[ "${1:-}" == "--device" && -n "${2:-}" ]] && ADB=(adb -s "$2")

PIN=$(grep -E '^SALMON_SEED_VAULT_PIN=' "$SUITE_DIR/.env.test" | head -1 | cut -d= -f2- | tr -d "\"' \r")
[[ -n "$PIN" ]] || { echo "SALMON_SEED_VAULT_PIN is missing in .maestro/.env.test" >&2; exit 1; }

state() { "${ADB[@]}" shell dumpsys user 2>/dev/null | grep -m1 -o 'RUNNING_[A-Z_]*' || true; }
"${ADB[@]}" shell svc power stayon true
for _ in 1 2 3; do
  [[ "$(state)" == "RUNNING_UNLOCKED" ]] && break
  "${ADB[@]}" shell input keyevent KEYCODE_WAKEUP
  sleep 1
  # Android 15 shows the PIN pad only after a swipe up on the lock screen.
  SIZE=$("${ADB[@]}" shell wm size | grep -o '[0-9]*x[0-9]*' | tail -1)
  W=${SIZE%x*}; H=${SIZE#*x}
  "${ADB[@]}" shell input swipe $((W / 2)) $((H * 4 / 5)) $((W / 2)) $((H / 5)) 300
  sleep 2
  "${ADB[@]}" shell input text "$PIN"
  "${ADB[@]}" shell input keyevent 66
  sleep 4
done
[[ "$(state)" == "RUNNING_UNLOCKED" ]] || { echo "still locked: check that the emulator's PIN is SALMON_SEED_VAULT_PIN" >&2; exit 1; }
echo "unlocked"
