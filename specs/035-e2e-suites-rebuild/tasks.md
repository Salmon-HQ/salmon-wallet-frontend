# Tasks: End-to-end suites rebuilt on the definitive layout

Commits go to `feat/powerups-foundations` and are pushed; no pull request.

## Phase 1: Drift guard (US3)

- [ ] T001 [US3] `scripts/check-e2e-selectors.mjs`: extract Maestro `id:`/text anchors and Playwright `getByTestId`, resolve against source and copy, allowlist external strings, fail `file:line selector`; `scripts/check-e2e-selectors.test.mjs`
- [ ] T002 [US3] Add `check:e2e-selectors` to root `package.json` and to `.github/workflows/ci.yml` next to DOM parity; confirm it is red on today's stale selectors

## Phase 2: Mobile suite (US1, US2)

- [ ] T003 [US2] `subflows/onboard-walletA.yaml` / `onboard-walletB.yaml`: biometric, Congratulations and consent each optional and condition-waited; end on `home-screen`
- [ ] T004 [US2] Fix `smoke/receive/sheet.yaml`, `smoke/home/shell.yaml`, `smoke/nft/detail.yaml`, `subflows/send-nft.yaml`, `actions/reveal/private-key.yaml`, `store/capture-shots.yaml` per research R1
- [ ] T005 [US2] Replace the four `point:` taps with testIDs, adding testIDs to the components that lack them
- [ ] T006 [US1] `run.sh`: device booted, Metro bundle prewarmed (`apps/mobile/index.bundle`), installed SDK matches checkout, single-run lock; each stops within 30 s naming the cause
- [ ] T007 [US2] Unattended smoke suite on the gesture emulator, then the 3-button emulator; fix every failure at its cause

## Phase 3: Extension suite (US1, US2)

- [ ] T008 [US2] `helpers.ts` and the analytics specs: fixed sleeps → condition waits; stale `tab-collectibles`, `tab-home`, `settings-close-button`, `balance-carousel-next` → current testIDs
- [ ] T009 [US2] Port behaviour drivers into specs (research R3); delete obsolete drivers; keep capture tools under `scripts/` documented as tools
- [ ] T010 [US1] Preflight in `global-setup.ts`: dist built from the current source, Chromium present for the pinned Playwright, backend reachable
- [ ] T011 [US2] Unattended extension run; fix every failure at its cause

## Phase 4: Guidance (US4)

- [ ] T012 [P] [US4] Global `maestro-mobile-testing` and `playwright-web-testing` skills: the traps and their fixes
- [ ] T013 [P] Suite READMEs match the rebuilt contents; spec 034 T018a closed
