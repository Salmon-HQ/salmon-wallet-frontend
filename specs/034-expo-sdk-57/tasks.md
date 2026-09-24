# Tasks: Mobile on Expo SDK 57

**Input**: Design documents from `specs/034-expo-sdk-57/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: no new test suites are requested; each story is verified with the
existing suites plus the checks in quickstart.md. The one new check is the
known-vector derivation (SC-001).

Every command runs on Node 24 (`nvm use`) from the repo root unless stated.
Commits go to `feat/powerups-foundations` and are pushed; no pull request.

## Phase 1: Setup — baseline on SDK 55

- [x] T001 Build the current SDK 55 Android dev build (`cd apps/mobile && npx expo run:android`) on the gesture-navigation emulator and keep the APK from `apps/mobile/android/app/build/outputs/apk/debug/` in the scratchpad as the "before" build
- [x] T002 On the SDK 55 build, recover the devnet test Wallet A (`.maestro/.env.test`) and record the receive address of each chain the app shows (Solana, Bitcoin — decoded from the receive QR) and the `[perf] recovery` timings from logcat, in the scratchpad (quickstart §3). Recorded: Solana `7Q3H…as6n` (= `SALMON_TEST_WALLET_A_ADDR`), Bitcoin `1MU9…URyh`; createAccount 460 ms, TOTAL 1655 ms; idle PSS ≈ 666 MB
- [x] T003 On the SDK 55 build, unlock and idle 30 s on Home; record `adb shell dumpsys meminfo io.salmonwallet.app` TOTAL PSS (quickstart §6)

## Phase 2: Foundational — the upgrade itself (blocks every story)

- [x] T004 Remove `react-native-encrypted-storage` and `react-native-permissions` from `apps/mobile/package.json` dependencies and from `expo.doctor.reactNativeDirectoryCheck.exclude`; `pnpm install`; run the repo gates (quickstart §1); commit
- [x] T005 SDK 56: in `apps/mobile/package.json` set `expo` to `^56`, drop `@react-navigation/native` and `react-native-worklets` from `expo.install.exclude`, add `typescript` to it
- [x] T006 SDK 56: drop the SDK-55 pins `@expo/dom-webview`, `@expo/log-box`, `@expo/metro-runtime`, `expo-manifests` from root `package.json` `pnpm.overrides`; run `cd apps/mobile && npx expo install --fix`
- [x] T007 SDK 56: rebase `patches/expo-camera@55.0.21.patch` onto the installed `expo-camera` version (`pnpm patch expo-camera@<v>`, add `ios/ExpoCameraBarcodeScanning.podspec` to `expo-module.config.json` `podspecPath`, `pnpm patch-commit`), re-key root `package.json` `pnpm.patchedDependencies`, delete the old patch file
- [x] T008 SDK 56: in `apps/mobile/app/_layout.tsx` import `DarkTheme`, `DefaultTheme`, `ThemeProvider` from `expo-router/react-navigation`; remove `@react-navigation/native` from `apps/mobile/package.json`; update the matching mock in `apps/mobile/__tests__/root-layout.test.tsx` if it mocks that module
- [x] T009 SDK 56: remove the `react-navigation|@react-navigation/.*` entries from `transformIgnorePatterns` in `apps/mobile/jest.config.js` only if nothing under `node_modules` still needs them (run the mobile suite to decide)
- [x] T010 SDK 56: `npx expo-doctor@latest` in `apps/mobile`; fix every error it reports; run all repo gates (quickstart §1)
- [x] T011 SDK 56 checkpoint: `rm -rf apps/mobile/ios apps/mobile/android`, Android dev build on the emulator; confirm it compiles (research R1) and the app opens; recover the test phrase and compare with T002; commit "SDK 56 checkpoint" (not released)
- [x] T012 (not needed — T011 built and recovered on the native path) If T011 fails to build `react-native-fast-crypto` or recovery takes the fallback path: replace it with `react-native-quick-crypto` in `packages/shared/src/crypto/fastCrypto.native.ts` (same exported `pbkdf2.deriveAsync` shape) and `apps/mobile/package.json`; rerun T011; stop for owner review of the diff (constitution §III)
- [x] T013 SDK 57: set `expo` to `^57` (resolves ≥ 57.0.17, React Native 0.86.3), `npx expo install --fix`, `npx expo-doctor@latest`; take `@expo/fingerprint ~0.20.13`; re-key the camera patch again if `expo-camera` moved; run all repo gates

## Phase 3: User Story 1 — the same wallet after the update (P1)

**Goal**: an existing install updates in place and unlocks to the same accounts.

**Independent test**: quickstart §4.

- [ ] T014 [US1] Install the T001 SDK 55 APK, create a wallet on devnet, enable biometrics (emulator fingerprint); install the SDK 57 dev build over it without uninstalling
- [ ] T015 [US1] Unlock with the password and with biometrics; addresses match; enter wrong passwords until the throttle engages and confirm the "wait" message

## Phase 4: User Story 2 — create and recover derive the same keys (P1)

**Goal**: SC-001 and SC-002.

**Independent test**: quickstart §3.

- [x] T016 [US2] On the SDK 57 build, recover Wallet A the same way; the Solana and Bitcoin receive addresses must equal T002's; `[perf] recovery: createAccount` stays in the same order of magnitude as T002 (hundreds of ms — seconds would mean the JS fallback) and TOTAL ≤ T002 + 10%
- [x] T017 [US2] Confirm the native PBKDF2 path ran on the SDK 57 build: `NativeModules.RNFastCrypto` is present and the createAccount timing matches T002
- [x] T018a [US2] Fix the stale smoke flow `apps/mobile/.maestro/flows/smoke/receive/sheet.yaml`: it asserts `receive-address`, a testID the receive sheet no longer renders (the address is only in the QR and the copy button)
- [ ] T018 [US2] Run the Maestro onboarding and recovery flows in `apps/mobile/.maestro` with `./run.sh --device <emulator>` on the gesture and the 3-button emulators

## Phase 5: User Story 3 — moving money works as before (P1)

**Goal**: SC-003.

**Independent test**: quickstart §5, money flows.

- [ ] T019 [US3] With the local backend up (`docker compose up` in `../salmon-wallet-backend`, `adb reverse` 3001 and 8081): on devnet send SOL and a token; the on-chain result matches review; both appear in activity
- [ ] T020 [US3] Scan a Solana Pay QR with the emulator camera (virtual scene or a QR image) and confirm the send opens prefilled
- [ ] T021 [US3] Send and burn an NFT, a pNFT and a cNFT on devnet; each lands and leaves the list
- [ ] T022 [US3] Receive detection: send to the wallet from another devnet account; the balance updates without a manual refresh

## Phase 6: User Story 4 — looks and moves as before (P2)

**Goal**: SC-005, SC-006.

**Independent test**: quickstart §5 visual, §6 memory.

- [ ] T023 [US4] Visual walk on the gesture and 3-button emulators: Home, tabs, Powerups catalog and Payments tab, bottom sheets, send amount / password / recover keyboards, wait screen, lock overlay — nothing under system bars, no single-frame flash (screen recording + frame check)
- [ ] T024 [US4] Memory: repeat T003 on the SDK 57 build; TOTAL PSS ≤ T003 + 10%

## Phase 7: iOS (all stories, once Xcode ≥ 26.4 is installed)

- [ ] T025 iOS simulator dev build (`npx expo run:ios`); repeat T016, T019–T021 and T023 on it, including a real QR decode (the camera patch, research R2)

## Phase 8: Polish

- [x] T026 [P] Rewrite `docs/EXPO-SDK-57-UPGRADE.md` as the record of what was applied (current platform, removed deps, the camera patch still needed, the fast-crypto outcome), correcting the "Bridge removed" claim per research R1
- [x] T027 [P] Add the mobile entry to `CHANGELOG.md` under Unreleased: Expo SDK 57 / React Native 0.86, iOS minimum 16.4, binary release
- [ ] T028 Final gates on Node 24 (quickstart §1), commit and push to `feat/powerups-foundations`; leave `apps/mobile/native-fingerprint.json` for `fingerprint:write` at store-build time

## Dependencies

- Phase 1 → Phase 2 → Phases 3–6 (any order) → Phase 8. Phase 7 waits only on Xcode and Phase 2.
- T012 runs only if T011 shows it is needed; it blocks T013.
- Within Phase 2 the order is strict (each step changes the lockfile).

## Parallel opportunities

- T026 and T027 (different files).
- Phases 3–6 can run on the two Android emulators side by side, but not with two `maestro test` processes at once (fixed port).

## Implementation strategy

MVP = Phase 2 + US2 (derivation identical) + US1: if keys and vault survive,
the rest is regression hunting. Stop and report at T011 and T012; the
remaining phases are verification of a build that already works.
