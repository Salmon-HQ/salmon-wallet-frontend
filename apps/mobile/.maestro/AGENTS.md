# AGENTS.md instructions for `.maestro/`

## Responsibility

Maestro end-to-end test suite for `apps/mobile`. Drives the Expo dev
build on iOS Simulator / Android emulator. This is the canonical
home for mobile integration tests.

## Layout rules

- `flows/smoke/<category>/<name>.yaml` — read-only walks. Idempotent.
- `flows/actions/<category>/<name>.yaml` — state-modifying. Each leaf
  flow handles its own `clearState + launchApp + recover` so it can
  run stand-alone.
- `suites/<name>.yaml` — orchestrators. Use `runFlow` to chain leaf
  flows in a deterministic order. Destructive flows go last.
- `subflows/<name>.yaml` — reusable building blocks (recovery,
  navigation helpers). No `clearState`.
- `screenshots/` — gitignored runtime output. Path mirrors the flows
  tree (`screenshots/smoke/auth/...`, `screenshots/actions/send/...`).

## Conventions

- **Working directory**: always invoke Maestro from this folder
  (`apps/mobile/.maestro/`). `takeScreenshot` paths in the flow YAML are
  resolved relative to the cwd, so any other invocation creates a stray
  `screenshots/` directory at that location. The repo-root `.gitignore`
  blocks the obvious mis-locations defensively (`/.maestro/`,
  `**/.maestro/screenshots/`), but the rule is: `cd
  apps/mobile/.maestro` first.
- **Selectors**: `id:` (testID) > `text:` > `point:` coords. Add a
  testID upstream when an element keeps requiring point taps.
- **Secrets**: live in `.env.test` (gitignored). Document any new
  variable in `.env.test.example`. Never pin literal seed words,
  passwords, or wallet addresses in a tracked YAML file — assert by
  structural property (e.g. `assertNotVisible: "Tap to Reveal"`)
  instead.
- **Recovery cost**: each action flow re-recovers from seed. Acceptable
  for isolation; the suite orchestrator does not de-dup recoveries.
- **Destructive reset**: `actions/reset/remove-all-wallets.yaml` wipes
  the device. Always last in `suites/actions.yaml`.

## Pre-flight

Before authorizing `actions/*` flows, check the test wallets' actual
state — balance/NFT via a quick RPC query or the app itself — rather than
assuming the last run left them funded. Wallet A funds Send/Swap; Wallet B
holds the NFT the transfer flow moves.

Missing prerequisite → the flow should skip with a clear message, not fail
cryptically mid-flow. Backend reachable but behaving wrong → fail, never
skip. (Mobile has no automatic backend-down gate today, unlike the web and
extension suites' `isBackendUp()` — apply this rule manually until one
exists.)

## When extending the suite

1. Decide smoke vs action by whether the flow modifies persistent or
   chain state.
2. Place the YAML under the matching category folder. Create the
   category folder if none fits.
3. If the flow needs new env vars, update both `.env.test` and
   `.env.test.example`.
4. Mirror the flow path under `screenshots/<smoke|actions>/<category>/`.
5. Add a `runFlow` entry to the matching `suites/<smoke|actions>.yaml`
   so the new flow runs as part of the suite.
