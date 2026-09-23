# Research: Mobile on Expo SDK 57

Phase 0 of [plan.md](./plan.md). The starting inventory is
`docs/EXPO-SDK-57-UPGRADE.md`; this file resolves what that document left
unverified or got wrong, against primary sources, on 2026-09-23.

## R1. Does `react-native-fast-crypto` survive React Native 0.85+?

- **Finding**: v3.0.0 (the latest, 2025-10-27) is a legacy native module:
  `RCT_EXPORT_MODULE` / `RCT_REMAP_METHOD` on iOS, a Java
  `ReactContextBaseJavaModule` on Android, called through `NativeModules`,
  no `codegenConfig`. Today it runs through the New Architecture's interop
  layer for legacy modules.
- **Correction to the upgrade doc**: the doc states RN 0.85 "removes the
  Bridge outright — no interop shim". The RN 0.85 release notes
  (reactnative.dev/blog/2026/04/07/react-native-0.85) say no such thing; they
  list only specific Android legacy classes removed or deprecated
  (`CatalystInstanceImpl`, `NativeViewHierarchyManager`, …). Whether the
  interop layer still serves this module is therefore an empirical question.
- **Decision**: keep it through the SDK 56 checkpoint and prove it on a
  build: the Android dev build must compile, and a recovery must take the
  native path (not the WebCrypto/JS fallback in `mnemonic.ts`). If either
  fails, replace it with `react-native-quick-crypto` (owner decision), which
  is a JSI/New-Architecture module with a `pbkdf2` implementation.
- **Rationale**: replacing a module on the seed-derivation path is a
  constitution §III change; not doing it when it still works is the safer
  default. The known-vector test (SC-001) guards either outcome.
- **Alternatives**: replace now (rejected: security-sensitive churn without
  evidence it is needed); drop the accelerator and accept the fallback
  (rejected by the owner).

## R2. Is the `expo-camera` barcode patch still needed on SDK 57?

- **Finding**: on the `sdk-57` branch, `packages/expo-camera/expo-module.config.json`
  still lists only `ios/ExpoCamera.podspec`, while `ExpoCamera.podspec`
  still excludes `barcode-scanning/**` and `ios/ExpoCameraBarcodeScanning.podspec`
  still exists. The defect the patch fixes (expo/expo#44491: no QR decoding
  on iOS) is still present upstream.
- **Decision**: rebase the patch onto the SDK 57 `expo-camera` version and
  re-key `pnpm.patchedDependencies` to it.
- **Alternatives**: drop the patch (rejected: iOS QR scanning silently stops
  decoding).

## R3. Versions SDK 57 pins that the repo pins locally

From `bundledNativeModules.json` on `sdk-57`:

| Package                | Repo today             | SDK 57     | Decision                                                                       |
| ---------------------- | ---------------------- | ---------- | ------------------------------------------------------------------------------ |
| `@expo/fingerprint`    | `0.16.6`               | `~0.20.13` | Take `~0.20.13` with the SDK (this is the bump deferred from Dependabot #138). |
| `@expo/dom-webview`    | `55.0.5` (+ override)  | `~57.0.1`  | Bump; drop the override.                                                       |
| `expo-manifests`       | override `55.0.10`     | `~57.0.2`  | Drop the override.                                                             |
| `@expo/metro-runtime`  | `55.0.10` (+ override) | `~57.0.16` | Bump; drop the override.                                                       |
| `@expo/log-box`        | override `55.0.10`     | not pinned | Drop the override; let `expo` resolve it.                                      |
| `react-native-webview` | not a dependency       | `13.16.1`  | Stay without it: SDK 56 makes `@expo/dom-webview` the default.                 |

- **Rationale for dropping overrides**: they existed to hold SDK-55
  artifacts together; with every Expo package on 57, `expo install --fix`
  is the source of truth. If resolution splits a package into two versions,
  an override comes back pinned to the SDK 57 value, not SDK 55.

## R4. Unused native dependencies

- **Finding**: `react-native-encrypted-storage` and `react-native-permissions`
  have zero import sites in `apps/` and `packages/`, are not config plugins in
  `app.json`, and the legacy-vault migration reads only the shared storage
  layer (AsyncStorage / SecureStore), never encrypted-storage.
- **Decision**: remove both, and their entries in
  `expo.doctor.reactNativeDirectoryCheck.exclude`, before the SDK bump.

## R5. Android API levels on SDK 57

- **Finding**: `expo-modules-core` on `sdk-57` defaults `minSdkVersion 24`
  (Android 7.0), `compileSdkVersion 36`, `targetSdkVersion 36`.
- **Decision**: accept the defaults; no `expo-build-properties` override.
  Android 7 remains supported, matching Expo's "SDK 56 can build apps for
  Android 7+".

## R6. Node

- **Finding**: RN 0.85 supports Node ≥ 20.19.4, 22 and 24+. The repo is on
  Node 24.21.0 (commit `c411eded`).
- **Decision**: nothing to do.

## R7. `expo/fetch` becomes the global `fetch`

- **Finding**: beyond the raw `fetch` calls the upgrade doc lists (Bitcoin and
  Ethereum services), `@solana/kit`'s HTTP transport also uses global
  `fetch`, so every Solana RPC call from mobile moves to `expo/fetch`.
  WebSocket subscriptions (receive detection) do not.
- **Decision**: keep the default; verify on device that balances, history,
  sends and NFT actions work and that request cancellation (Bitcoin service's
  `AbortSignal`) still aborts. The documented opt-out,
  `EXPO_PUBLIC_USE_RN_FETCH=1`, is the fallback if a provider misbehaves.

## R8. React Navigation import

- **Finding**: one import site, `apps/mobile/app/_layout.tsx`
  (`DarkTheme`, `DefaultTheme`, `ThemeProvider` from `@react-navigation/native`),
  maps to `expo-router/react-navigation` per the SDK 55 → 56 router
  migration guide.
- **Decision**: edit by hand (the codemod is reported to miss sites and there
  is one), drop the dependency and its `expo.install.exclude` entry, and drop
  the dead `react-navigation` entries from `jest.config.js`
  `transformIgnorePatterns`.

## R9. Toolchain on this machine

- **Finding**: Xcode 26.2 installed; SDK 56+ needs 26.4. JDK 17 present.
  `eas-cli` 19.1.0 installed, 24.7.0 current.
- **Decision**: Android verification proceeds now with `expo run:android`
  (no EAS needed). iOS verification waits for the owner's Xcode update.
  `eas-cli` is not needed for local dev builds; updating it is left to the
  release step.

## R10. TypeScript

- **Finding**: SDK 56 templates move to TypeScript 6.0.3; `expo install --fix`
  would try to align it.
- **Decision**: add `typescript` to `expo.install.exclude` so this lot keeps
  TypeScript 5.9; TypeScript moves in its own lot (TS 7).
