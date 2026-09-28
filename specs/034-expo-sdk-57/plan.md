# Implementation Plan: Mobile on Expo SDK 57

**Branch**: `feat/powerups-foundations` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/034-expo-sdk-57/spec.md`

## Summary

Move `apps/mobile` from Expo SDK 55 (React Native 0.83) to SDK 57 (React
Native 0.86) in two verified steps on the same branch: SDK 56 as a checkpoint
that is built and exercised but never released, then SDK 57. The code diff is
small (one navigation import, a dependency sweep, a patch re-key, two dead
native dependencies removed); the work is verification, because the upgrade
swaps Hermes to v1, forks the Babel preset, bumps Metro, replaces the global
`fetch`, and moves the animation engine under a wallet whose seed derivation
depends on a legacy native module. Research that corrects and completes the
upgrade doc is in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (held; see research R10), Node 24.21.0

**Primary Dependencies**: Expo SDK 55 → 56 → 57; React Native 0.83.10 → 0.85 → 0.86.3; React 19.2.0 → 19.2.3; expo-router 55 → 57; react-native-reanimated 4.2.1 → 4.5.1 with react-native-worklets 0.7.4 → 0.10.1

**Storage**: AsyncStorage + expo-secure-store through `packages/shared/src/storage` (unchanged)

**Testing**: Jest via `jest-expo` (mobile), Vitest (shared, ui, extension), Metro `export:check`, Maestro flows (`apps/mobile/.maestro`) on emulators

**Target Platform**: iOS ≥ 16.4 (from 15.1, owner accepted), Android ≥ 7.0 (API 24), compile/target API 36

**Project Type**: mobile app in a pnpm monorepo (`apps/mobile` + `packages/shared`)

**Performance Goals**: seed recovery no slower than today (+10% max); idle memory on Home no higher than today (+10% max)

**Constraints**: CNG (native dirs generated, never edited); binary release only, never OTA; no quality gate weakened; security-sensitive paths (seed derivation) need owner sign-off on any behavioural diff

**Scale/Scope**: ~60 mobile routes/components touched only through dependencies; code edits expected in `app/_layout.tsx`, `package.json` files, `jest.config.js`, the camera patch, `app.json`, docs

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status   | Note                                                                                                                                                                         |
| ----------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Ownership boundaries             | Pass     | Edits stay in `apps/mobile`, root manifests and `patches/`; nothing moves between packages.                                                                                  |
| II. Shared code has three consumers | Pass     | `packages/shared` is not changed by the plan; if `fastCrypto.native.ts` must switch module (R1), its only consumer is `crypto/mnemonic.ts`, and the export shape stays.      |
| III. Wallet safety                  | Gated    | Seed derivation may change native module (R1). Guard: the known-vector check (SC-001) before and after, and the owner reviews that diff. No signing or storage code changes. |
| IV. Bilingual strings               | Pass     | No new copy.                                                                                                                                                                 |
| V. Functional coverage first        | Pass     | Existing suites + known-vector derivation check + Maestro flows on Android.                                                                                                  |
| VI. Ask rather than guess           | Pass     | Owner answered iOS minimum, accelerator replacement and branch; no open gate.                                                                                                |
| Platform constraints                | Declared | Native change → new binary, `expo.version` bump, fingerprint baseline refreshed at build time. Locked identifiers untouched.                                                 |
| Quality gates                       | Required | typecheck, lint 0/0, all tests, export, fingerprint, i18n, parity, Powerups bundle.                                                                                          |

Post-design re-check: unchanged — the design adds no package, no export and no
new copy.

## Project Structure

### Documentation (this feature)

```text
specs/034-expo-sdk-57/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

No `contracts/`: the upgrade exposes no new interface; the one contract that
must not move (recovery phrase → accounts) is in data-model.md and checked in
quickstart.md.

### Source Code (repository root)

```text
package.json                         # pnpm.overrides (SDK-55 pins), patchedDependencies
patches/expo-camera@<57>.patch       # rebased barcode podspec fix (R2)
apps/mobile/
├── package.json                     # SDK 57 deps, install.exclude, removed native deps
├── app.json                         # expo.version bump
├── app/_layout.tsx                  # navigation theme import (R8)
├── jest.config.js                   # transformIgnorePatterns cleanup
└── native-fingerprint.json          # refreshed when the binary is built
packages/shared/src/crypto/
└── fastCrypto.native.ts             # only if R1 forces the accelerator swap
docs/EXPO-SDK-57-UPGRADE.md          # rewritten to record what was applied
```

**Structure Decision**: all changes land in the existing monorepo layout; no
new directories.

## Execution outline

1. **Baseline** — on SDK 55: record derived addresses for the public BIP-39
   test phrase on each chain, time a recovery on the Android emulator, note
   idle memory on Home.
2. **Prune** — remove `react-native-encrypted-storage` and
   `react-native-permissions` (R4). Gates green.
3. **SDK 56 checkpoint** — `expo@^56`, `expo install --fix` with
   `install.exclude` corrected (drop `@react-navigation/native`,
   `react-native-worklets`; add `typescript`), drop the SDK-55 overrides,
   rebase the camera patch, fix `_layout.tsx`, clean `jest.config.js`.
   Gates green; Android dev build; derivation check; smoke. Commit, not
   released.
4. **SDK 57** — `expo@^57` (≥ 57.0.17 for RN 0.86.3), `expo install --fix`,
   `expo-doctor`. Gates green.
5. **Verify** — Android dev build on the gesture and 3-button emulators:
   known-vector derivation, recovery timing, the device walk of the spec
   (create, recover, biometric, QR, send, activity, NFTs, Powerups), visual
   pass, memory check. iOS simulator the same once Xcode ≥ 26.4.
6. **Close** — `expo.version` bump, CHANGELOG entry, rewrite the upgrade doc
   as the record of what shipped. Fingerprint baseline is refreshed by
   whoever builds the store binary.

## Complexity Tracking

No constitution violations to justify.
