# Expo SDK 57 upgrade — what was applied to `apps/mobile`

The record of the move from Expo SDK 55 (React Native 0.83) to SDK 57 (React
Native 0.86.3), done in two steps through SDK 56 (spec
`specs/034-expo-sdk-57/`). The research that planned it is in this file's git
history.

## Platform now

| Thing                 | Value                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| Expo SDK              | 57 (`expo` 57.0.x), `expo-doctor` 21/21                                   |
| React Native          | 0.86.3, New Architecture, Hermes V1                                       |
| React                 | 19.2.3, one copy in the tree (root override)                              |
| Reanimated / Worklets | 4.5.1 / 0.10.1                                                            |
| iOS minimum           | 16.4 (from 15.1), set by the SDK through CNG; building needs Xcode ≥ 26.4 |
| Android               | minSdk 24, compile/target 36                                              |
| Node                  | 24 (`.nvmrc` 24.21.0, engines `^24.15.0`, EAS image)                      |
| Native projects       | CNG — `ios/` and `android/` are generated, never committed                |
| Version               | 1.2.0 — a binary release; the native fingerprint moved                    |

## What changed, and why

- **Two unused native modules removed first** — `react-native-encrypted-storage`
  and `react-native-permissions` had no import site and were the likeliest
  build blockers.
- **SDK 56 as a checkpoint, not a release** — it carried a Hermes V1 memory
  regression with Reanimated that only SDK 57 fixes.
- **Navigation theme from `expo-router`**, which no longer runs on
  `@react-navigation`; that dependency and its Jest exceptions are gone.
- **`StyleSheet.absoluteFillObject` removed in RN 0.85** — the 17 components
  that cover the screen (lock overlay, seed-reveal cover, QR scanner, sheets)
  use `absoluteFill`.
- **`expo-camera` barcode podspec patch** carried to 57.0.5; the upstream
  config still omits it.
- **AbortSignal gap fill per member** — from SDK 56 Expo patches only
  `AbortSignal.timeout` and `.any`; the polyfill now fills `abort`, `any`,
  `timeout` and `throwIfAborted` each only when missing. Without it every
  mobile transaction threw right after sending.
- **Quiet dev menu** — `plugins/withQuietDevMenu.js` sets expo-dev-menu's own
  defaults (no launch sheet, no floating button) so development builds and the
  Maestro suite open straight on the app.
- **SDK 57 dev launcher** no longer lists local Metro; the Maestro suite opens
  the bundle through the dev client's deep link.

## Verified

On an Android dev build: the test wallets recover to the same Solana and
Bitcoin addresses as on SDK 55, at the same speed, through the native PBKDF2
module; sends, NFT transfers and burns confirm on devnet; the Maestro smoke
suite passes unattended on gesture navigation. Gates green on Node 24:
typecheck, lint, tests, export, fingerprint, i18n, DOM parity.

## Open

- iOS: build and walk on a simulator once Xcode ≥ 26.4 is installed.
- Memory against SDK 55 with release builds on a quiet machine, and an
  in-place update from an SDK 55 install (spec 034, T014–T015, T024).
- A short mainnet pass by the owner before the store build.
