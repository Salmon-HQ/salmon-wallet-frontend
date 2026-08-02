#!/usr/bin/env bash
#
# Runner for the mobile Maestro suite. Does what playwright.config.ts + env.ts
# do for the web and extension suites: load suite-local secrets, refuse to run
# against a half-ready environment, and hand Maestro a fully specified command.
#
#   ./run.sh suites/smoke.yaml
#   ./run.sh flows/smoke/settings/about.yaml
#   ./run.sh --device emulator-5554 suites/smoke.yaml
#   ./run.sh --shard-split=2 suites/smoke.yaml     # split across 2 devices
#
# Any flag it does not recognise is forwarded to `maestro test` untouched.
set -euo pipefail

# Screenshot paths inside the flow YAML are cwd-relative, so the suite only
# behaves when Maestro runs from here. Anchoring to the script's own directory
# means the runner works from anywhere.
SUITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SUITE_DIR"

RED=$'\033[31m'; YELLOW=$'\033[33m'; GREEN=$'\033[32m'; DIM=$'\033[2m'; OFF=$'\033[0m'
die() { printf '%s✖ %s%s\n' "$RED" "$1" "$OFF" >&2; exit 1; }
warn() { printf '%s! %s%s\n' "$YELLOW" "$1" "$OFF" >&2; }
ok() { printf '%s✓ %s%s\n' "$GREEN" "$1" "$OFF"; }

API_URL="${SALMON_API_URL:-http://127.0.0.1:3001}"
API_PORT="${API_URL##*:}"

command -v maestro >/dev/null 2>&1 || die "maestro not on PATH. Install: curl -Ls https://get.maestro.mobile.dev | bash"

# ---------------------------------------------------------------- secrets ----
# Maestro does not inherit the shell environment into flows, so every value has
# to be forwarded with -e. Forgetting one does not fail: the flow interpolates
# the literal string "undefined", types it into the seed field, and dies many
# steps later on an unrelated selector. Fail here instead, naming the variable.
[[ -f .env.test ]] || die ".env.test missing. Copy .env.test.example and fill it in."
set -a; . ./.env.test; set +a

REQUIRED=(
  SALMON_TEST_PASSWORD
  SALMON_TEST_SEED_A
  SALMON_TEST_SEED_B
  SALMON_TEST_WALLET_A_ADDR
  SALMON_TEST_WALLET_B_ADDR
)
MISSING=()
for key in "${REQUIRED[@]}"; do
  [[ -n "${!key:-}" ]] || MISSING+=("$key")
done
[[ ${#MISSING[@]} -eq 0 ]] || die "Missing in .env.test: ${MISSING[*]}"

MAESTRO_ENV=()
for key in "${REQUIRED[@]}"; do
  MAESTRO_ENV+=(-e "$key=${!key}")
done

# ----------------------------------------------------------------- device ----
DEVICE=""
PASSTHROUGH=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --device|--udid) DEVICE="$2"; shift 2 ;;
    --device=*|--udid=*) DEVICE="${1#*=}"; shift ;;
    *) PASSTHROUGH+=("$1"); shift ;;
  esac
done
[[ ${#PASSTHROUGH[@]} -gt 0 ]] || die "Nothing to run. Pass a flow or suite, e.g. ./run.sh suites/smoke.yaml"

# An Android device id is either "emulator-N" or a raw adb serial. Everything
# else (a simulator UDID, or no --device at all with a booted simulator) is iOS.
IS_ANDROID=0
if [[ -n "$DEVICE" ]]; then
  [[ "$DEVICE" == emulator-* ]] && IS_ANDROID=1
elif command -v adb >/dev/null 2>&1 && adb devices 2>/dev/null | grep -q "device$"; then
  IS_ANDROID=1
fi

# The Android emulator resolves 127.0.0.1 to itself, not to this host, so the
# app cannot see the backend without a port mapping — and the mapping does not
# survive an emulator reboot. Re-applying it is idempotent and cheap.
if [[ $IS_ANDROID -eq 1 ]] && command -v adb >/dev/null 2>&1; then
  ADB=(adb)
  [[ -n "$DEVICE" ]] && ADB=(adb -s "$DEVICE")
  if "${ADB[@]}" reverse "tcp:$API_PORT" "tcp:$API_PORT" >/dev/null 2>&1; then
    ok "adb reverse tcp:$API_PORT → host"
  else
    warn "adb reverse failed; the app may not reach the backend from the emulator"
  fi
fi

# ---------------------------------------------------------------- backend ----
# Account creation and recovery call the API, so every flow needs it — including
# the ones that need no funds. Without it the app burns the axios timeout on
# "Recovering Account" and then blames the seed phrase, which reads as a suite
# full of real failures. Refuse to start instead of producing that noise.
#
# Retried and generous: serverless-offline is slow to answer its first request,
# and a false negative here costs a whole confusing run.
backend_up() {
  for _ in 1 2; do
    curl -s -o /dev/null --max-time 10 "$API_URL" 2>/dev/null && return 0
    sleep 1
  done
  return 1
}

if backend_up; then
  ok "backend reachable at $API_URL"
else
  die "backend unreachable at $API_URL.
    Every flow needs it — recovery calls the API and fails without it.
    Start it, or point SALMON_API_URL somewhere that is up."
fi

# ------------------------------------------------------------------ metro ----
# The dev build loads its JS from Metro. When Metro is down the dev launcher has
# no server entry to tap, so every flow dies inside dev-launcher-pass.yaml on a
# selector — which reads as a broken suite rather than a missing bundler.
METRO_URL="${SALMON_METRO_URL:-http://localhost:8081/status}"
if curl -s -m 5 "$METRO_URL" 2>/dev/null | grep -q "packager-status:running"; then
  ok "Metro bundler running"
else
  die "Metro is not running at ${METRO_URL%/status}.
    The dev build loads its JS from it; without it the dev launcher has nothing
    to open and every flow fails on a selector. Start it with:
      pnpm --filter @salmon/mobile start"
fi

# ------------------------------------------------------------------- run -----
CMD=(maestro)
[[ -n "$DEVICE" ]] && CMD+=(--device "$DEVICE")
CMD+=(test "${MAESTRO_ENV[@]}" "${PASSTHROUGH[@]}")

printf '%s→ maestro test %s%s\n' "$DIM" "${PASSTHROUGH[*]}" "$OFF"
exec "${CMD[@]}"
