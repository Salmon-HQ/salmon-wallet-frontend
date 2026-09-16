# Expo SDK 57 upgrade — what it implies for `apps/mobile`

Research note, written 2026-09-16. Nothing in this document has been applied to
the repo. It exists so the upgrade can be scheduled as its own lot with a known
shape.

Every claim carries a source URL. Anything that could not be verified from a
primary source is marked **UNVERIFIED**.

---

## 1. Where we are

| Thing                 | Pinned here                                                                                                                                                 | Where                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Expo SDK              | `~55.0.16`                                                                                                                                                  | `apps/mobile/package.json`                                                      |
| React Native          | `0.83.6`                                                                                                                                                    | `apps/mobile/package.json`                                                      |
| React                 | `19.2.0` (also a root `pnpm.overrides` pin)                                                                                                                 | `package.json`, `apps/mobile/package.json`                                      |
| Architecture          | New Architecture **already on** — `newArchEnabled=true`, `hermesEnabled=true`, `edgeToEdgeEnabled=true`                                                     | `apps/mobile/android/gradle.properties` (generated)                             |
| Native projects       | CNG — `apps/mobile/ios` and `apps/mobile/android` are gitignored and untracked (`git ls-files` returns 0 files for both); `app.json` is the source of truth | `.specify/memory/constitution.md` §Platform Constraints                         |
| Runtime client        | `expo-dev-client` ~55.0.28 — the app does **not** ship through Expo Go                                                                                      | `apps/mobile/package.json`                                                      |
| Node                  | `22.12.0` (`.nvmrc`), engines `^20.19.0 \|\| ^22.12.0`, EAS `build.base.node = 22.12.0`, guard allows majors 20 and 22                                      | `.nvmrc`, `package.json`, `apps/mobile/eas.json`, `scripts/check-build-env.cjs` |
| pnpm                  | `9.15.9` (`packageManager`), EAS `build.base.pnpm = 9.0.0`                                                                                                  | `package.json`, `apps/mobile/eas.json`                                          |
| iOS deployment target | Podfile default `'15.1'` (generated, not committed)                                                                                                         | `apps/mobile/ios/Podfile`                                                       |
| App version           | `1.1.0`, fingerprint baseline `f327d896…`                                                                                                                   | `apps/mobile/app.json`, `apps/mobile/native-fingerprint.json`                   |

Non-Expo native deps in `apps/mobile/package.json`: `react-native-reanimated
4.2.1`, `react-native-worklets 0.7.4`, `react-native-gesture-handler ~2.30.0`,
`react-native-screens ~4.23.0`, `react-native-safe-area-context ~5.6.0`,
`react-native-svg 15.15.3`, `@react-native-async-storage/async-storage 2.2.0`,
`react-native-get-random-values ^1.11.0`, `react-native-qrcode-svg ^6.3.20`,
`react-native-permissions ^5.6.1`, `phosphor-react-native ^3.0.6`,
`react-native-fast-crypto ^3.0.0`, `react-native-encrypted-storage ^4.0.3`.

Two local pins the upgrade has to revisit:

- `apps/mobile/package.json → expo.install.exclude` holds
  `@react-navigation/native` and `react-native-worklets`, so `expo install --fix`
  will _not_ align them. Both are exactly the packages SDK 56/57 moves.
- `package.json → pnpm.overrides` pins four SDK-55 artifacts by exact version:
  `@expo/dom-webview` `55.0.5`, `@expo/log-box` `55.0.10`,
  `@expo/metro-runtime` `55.0.10`, `expo-manifests` `55.0.10`. These will fight
  the upgrade until they are bumped or dropped.
- `pnpm.patchedDependencies` carries `expo-camera@55.0.21` →
  `patches/expo-camera@55.0.21.patch` (it adds
  `ios/ExpoCameraBarcodeScanning.podspec` to the module's `expo-module.config.json`).
  A patch keyed to an exact version fails install the moment the version moves.

### Why this surfaced

Expo Go only ever supports the latest SDK
([upgrade walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)),
and SDK 56's Expo Go was never published to the App Store or Play Store at all
([SDK 56 changelog](https://expo.dev/changelog/sdk-56)). This repo ships a dev
client, so Expo Go is not on the critical path — it only affects someone trying
to open the project in the store build of Expo Go.

---

## 2. What SDK 56 changed that touches us

SDK 56 = React Native 0.85 + React 19.2, released 2026-05-05.
Source: [Expo SDK 56 changelog](https://expo.dev/changelog/sdk-56).

**This is where all the work is.** Everything below is an SDK 56 item.

- **Expo Router forked React Navigation.** `expo-router` no longer depends on
  `react-navigation`; app code may not import from `@react-navigation/*`.
  Mapping: `@react-navigation/native` → `expo-router/react-navigation`.
  Codemod: `npx expo-codemod sdk-56-expo-router-react-navigation-replace src`.
  A compat layer rewrites `@react-navigation/core` imports coming from
  _node_modules_ for "at least one release cycle".
  Sources: [migration guide](https://docs.expo.dev/router/migrate/sdk-55-to-56/),
  [Expo Router v56 blog](https://expo.dev/blog/expo-router-v56-decoupling-from-react-navigation).
  **Hits:** `apps/mobile/app/_layout.tsx:5-9` (`DarkTheme`, `DefaultTheme`,
  `ThemeProvider`) — the _only_ real import site in the repo.
  Also `apps/mobile/package.json` (drop the `@react-navigation/native`
  dependency and its `expo.install.exclude` entry) and
  `apps/mobile/jest.config.js` (`transformIgnorePatterns` lists
  `react-navigation|@react-navigation/.*`).
  Doc-comment only, no code change:
  `packages/shared/src/hooks/useInactivityTimeout.ts:132`.
  Known codemod defect worth knowing before running it: it has been reported to
  miss ~25% of import sites silently
  ([expo/expo#46481](https://github.com/expo/expo/issues/46481)). With one import
  site here, doing it by hand is cheaper and safer.

- **`expo-router` type renames:** `Router` → `ImperativeRouter`, `Route` →
  `RoutePath`.
  Source: [expo-router CHANGELOG 56.0.0](https://github.com/expo/expo/blob/sdk-57/packages/expo-router/CHANGELOG.md).
  **Hits:** none found — no import of those type names anywhere under
  `apps/mobile` or `packages`.

- **`expo-status-bar` API removals:** `setStatusBarBackgroundColor`,
  `setStatusBarNetworkActivityIndicatorVisible`, `setStatusBarTranslucent`
  removed, and the `backgroundColor`, `networkActivityIndicatorVisible`,
  `translucent` props dropped from `StatusBarProps`. `setStatusBarStyle` /
  `setStatusBarHidden` become `StatusBar.setStyle` / `StatusBar.setHidden`
  (old named exports kept, deprecated).
  Source: [expo-status-bar CHANGELOG 56.0.0](https://github.com/expo/expo/blob/sdk-57/packages/expo-status-bar/CHANGELOG.md).
  **Hits:** four call sites, all using only `style=` —
  `apps/mobile/app/_layout.tsx:301,313`,
  `apps/mobile/app/(app)/(tabs)/_layout.tsx:47`,
  `apps/mobile/app/(auth)/password.tsx:371`,
  `apps/mobile/src/components/LockOverlay/LockContent.tsx:486`.
  No removed prop is used. **No change needed.**

- **`expo/fetch` becomes `globalThis.fetch` by default.** Opt out with
  `EXPO_PUBLIC_USE_RN_FETCH=1`.
  Sources: [SDK 56 changelog](https://expo.dev/changelog/sdk-56),
  [expo CHANGELOG 56.0.0-preview.0](https://github.com/expo/expo/blob/sdk-57/packages/expo/CHANGELOG.md).
  **Hits:** the shared API layer mostly goes through axios (which the Metro
  config already force-resolves to the browser build,
  `apps/mobile/metro.config.js`), but raw `fetch` is used in
  `packages/shared/src/api/services/bitcoin.ts:90,117`,
  `packages/shared/src/api/services/ethereum.ts:189` and
  `packages/shared/src/api/test-backend.ts:45` — including `AbortSignal` use in
  bitcoin.ts. Behaviour should be equivalent (WinterTC-compliant) but this is a
  runtime swap under wallet network calls and deserves a manual pass on device.

- **`@expo/dom-webview` becomes the default WebView for DOM components**;
  `react-native-webview` no longer required.
  Source: [expo CHANGELOG 56.0.0-preview.0](https://github.com/expo/expo/blob/sdk-57/packages/expo/CHANGELOG.md).
  **Hits:** `apps/mobile/package.json` already depends on `@expo/dom-webview`
  `55.0.5` and the root `pnpm.overrides` pins it — both need to move to
  `~57.0.1` or be dropped in favour of the bundled version.

- **`@expo/vector-icons` deprecated** in favour of scoped
  `@react-native-vector-icons/*`; codemod `npx @react-native-vector-icons/codemod`.
  Source: [SDK 56 changelog](https://expo.dev/changelog/sdk-56).
  Note SDK 57's `bundledNativeModules.json` still lists `@expo/vector-icons`
  `^15.0.2`, so it keeps working — deprecated, not removed.
  **Hits:** `apps/mobile/app/_layout.tsx:4,70` (FontAwesome, used only to
  preload `FontAwesome.font`) and the mock in
  `apps/mobile/__tests__/root-layout.test.tsx:48`. Doc reference in
  `packages/shared/src/types/icons.ts:9`. Optional now; the repo's real icon set
  is `phosphor-react-native`.

- **`expo` no longer depends on `@expo/vector-icons`** (landed in
  `57.0.0-preview.10`, listed as a breaking change).
  Source: [expo CHANGELOG](https://github.com/expo/expo/blob/sdk-57/packages/expo/CHANGELOG.md).
  **Hits:** none — `apps/mobile/package.json` already declares it explicitly.

- **`babel-preset-expo` 56.0.0 breaking changes:** `import.meta` transform on by
  default with the option renamed to `transformImportMeta`; the preset forks away
  from `@react-native/babel-preset` and splits Hermes v0/v1 configs; the Hermes v1
  preset drops transforms for syntax Hermes now supports.
  Source: [babel-preset-expo CHANGELOG](https://github.com/expo/expo/blob/sdk-57/packages/babel-preset-expo/CHANGELOG.md).
  **Hits:** `apps/mobile/babel.config.js` passes no options to
  `babel-preset-expo`, so no config edit. The Hermes-v1 preset trimming is the
  item to watch — it changes which syntax reaches the bundle untransformed, and
  this app pulls in a lot of crypto libraries through `metro.config.js`'s
  hand-written `resolveRequest` (axios browser build, `create-hmac`,
  `create-hash`, `rpc-websockets`, `@bonfida/spl-name-service`, `@solana/kit`).
  `pnpm --filter @salmon/mobile export:check` (already a CI step) is the cheap
  smoke test.

- **`process.env.EXPO_OS`:** no breaking change found in `babel-preset-expo` for
  56/57 (the feature was added in v11).
  Source: [babel-preset-expo CHANGELOG](https://github.com/expo/expo/blob/sdk-57/packages/babel-preset-expo/CHANGELOG.md).
  **Hits:** `packages/shared/src/api/config.ts:130-132` reads
  `process.env.EXPO_OS` without optional chaining, on purpose. Expected to keep
  working; `config.test.ts` covers it. Low risk, but verify the value is still
  inlined after the bump.

- **`expo-file-system` `copy()`/`move()` became async.**
  Source: [SDK 56 changelog](https://expo.dev/changelog/sdk-56).
  **Hits:** none — `expo-file-system` is not a dependency.

- **Minimum platform bump: iOS/tvOS 16.4 (from 15.1), macOS 13.4.** This single
  line is the "🛠 Breaking changes" entry in essentially every `expo-*` package
  we use — verified verbatim in the 56.0.0 sections of `expo-camera`,
  `expo-secure-store`, `expo-splash-screen`, `expo-updates` and `expo-router`
  ([sdk-57 branch CHANGELOGs](https://github.com/expo/expo/tree/sdk-57/packages)).
  Beyond that minimum bump, **none of the Expo packages this app uses declares a
  further breaking change in 56.x or 57.x** — checked: `expo-camera`,
  `expo-secure-store`, `expo-splash-screen`, `expo-updates`, `expo-status-bar`
  (listed above), `expo-router` (listed above), `@expo/metro-config`,
  `jest-expo`.
  **UNVERIFIED (not individually read):** `expo-blur`, `expo-clipboard`,
  `expo-constants`, `expo-crypto`, `expo-dev-client`, `expo-font`,
  `expo-glass-effect`, `expo-haptics`, `expo-image`, `expo-linear-gradient`,
  `expo-linking`, `expo-local-authentication`, `expo-localization`,
  `expo-screen-capture`, `expo-system-ui`, `expo-web-browser`. Read these before
  the lot starts; the pattern above suggests iOS-16.4-only, but that is an
  inference, not a fact.

- **Old Architecture is no longer supported; New Architecture is mandatory.**
  Source: [How to upgrade to SDK 56](https://expo.dev/blog/upgrading-to-sdk-56).
  **Hits:** none — this app is already on the New Architecture
  (`newArchEnabled=true`). Expo's own advice, "avoid upgrading the SDK and
  adopting the New Architecture at the same time", does not apply to us. This is
  the single biggest reason the upgrade is smaller than it looks.

- **Known SDK 56 regression:** importing `react-native-worklets` or
  `react-native-reanimated` under Hermes v1 "can increase your app's memory usage
  drastically". Expo's stated fix is to go to SDK 57, where it was resolved in
  `expo@57.0.9` with React Native 0.86.2.
  Sources: [SDK 56 changelog](https://expo.dev/changelog/sdk-56),
  [SDK 57 changelog](https://expo.dev/changelog/sdk-57).
  **Hits:** `apps/mobile/app/_layout.tsx:18` imports `react-native-reanimated`
  at the root. This is a direct argument against _stopping_ at SDK 56.

- Non-breaking but relevant: precompiled iOS XCFrameworks (~16% faster clean iOS
  builds), Android CMake precompiled headers, Hermes bytecode diffing on by
  default (EAS Update payloads ~58% smaller), Kotlin compiler plugin (~40% faster
  cold starts). Source: [SDK 56 changelog](https://expo.dev/changelog/sdk-56).

---

## 3. What SDK 57 changed that touches us

SDK 57 = React Native 0.86 + React 19.2 (React unchanged from 56), released
2026-06-25. Source: [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57).

- **No breaking changes.** Expo's framing: React Native 0.86 "is intended to have
  no breaking changes from 0.85", and SDK 57 is "equivalent to a minor release…
  designed to be an easy upgrade".
  Sources: [SDK 57 changelog](https://expo.dev/changelog/sdk-57),
  [SDK 56 changelog](https://expo.dev/changelog/sdk-56).
  Expo still tells you to check the changelog for breaking changes it did not
  list; the per-package reads above found none in 57.x for the packages checked.

- **Fixes the SDK 56 Hermes v1 memory regression** in `expo@57.0.9` /
  React Native 0.86.2. Source: [SDK 57 changelog](https://expo.dev/changelog/sdk-57).

- **Xcode 27 support**, with opt-in scene lifecycle via `ios.enableSceneSupport`
  in the app config. Source: [SDK 57 changelog](https://expo.dev/changelog/sdk-57).
  **Hits:** `apps/mobile/app.json → expo.ios` — optional, not required.

- Animation/native dep bumps that arrive with 57: `react-native-reanimated`
  4.3 → 4.5, `react-native-worklets` 0.8 → 0.10,
  `react-native-gesture-handler` 2.31 → 2.32.
  Source: [SDK 57 changelog](https://expo.dev/changelog/sdk-57).

- Minor additions: `expo-dev-client` iOS auto-launch setting, `expo-image`
  `writeToCacheAsync` / `readFromCacheAsync`, `expo-router`
  `Stack.Toolbar.Badge` on Android, `expo-navigation-bar` modal compatibility.
  None used here today.

### Exact versions SDK 57 pins

From [`bundledNativeModules.json` on the `sdk-57` branch](https://github.com/expo/expo/blob/sdk-57/packages/expo/bundledNativeModules.json):

| Package                     | Here       | SDK 57                      |
| --------------------------- | ---------- | --------------------------- |
| `react-native`              | `0.83.6`   | `0.86.3`                    |
| `react`                     | `19.2.0`   | `19.2.3`                    |
| `expo`                      | `~55.0.16` | `~57.0.x`                   |
| `expo-blur`                 | `~55.0.14` | `~57.0.3`                   |
| `expo-camera`               | `~55.0.21` | `~57.0.5`                   |
| `expo-clipboard`            | `~55.0.13` | `~57.0.2`                   |
| `expo-constants`            | `~55.0.15` | `~57.0.18`                  |
| `expo-crypto`               | `~55.0.14` | `~57.0.3`                   |
| `expo-dev-client`           | `^55.0.28` | `~57.0.19`                  |
| `expo-font`                 | `~55.0.6`  | `~57.0.4`                   |
| `expo-glass-effect`         | `~55.0.10` | `~57.0.3`                   |
| `expo-haptics`              | `^55.0.14` | `~57.0.3`                   |
| `expo-image`                | `^55.0.9`  | `~57.0.5`                   |
| `expo-linear-gradient`      | `^55.0.13` | `~57.0.2`                   |
| `expo-linking`              | `~55.0.14` | `~57.0.10`                  |
| `expo-local-authentication` | `~55.0.13` | `~57.0.3`                   |
| `expo-localization`         | `^55.0.13` | `~57.0.2`                   |
| `expo-router`               | `~55.0.13` | `~57.0.21`                  |
| `expo-screen-capture`       | `~55.0.16` | `~57.0.3`                   |
| `expo-secure-store`         | `~55.0.13` | `~57.0.4`                   |
| `expo-splash-screen`        | `~55.0.19` | `~57.0.9`                   |
| `expo-status-bar`           | `~55.0.5`  | `~57.0.1`                   |
| `expo-system-ui`            | `^55.0.16` | `~57.0.4`                   |
| `expo-updates`              | `~55.0.21` | `~57.0.22`                  |
| `expo-web-browser`          | `~55.0.14` | `~57.0.3`                   |
| `@expo/dom-webview`         | `55.0.5`   | `~57.0.1`                   |
| `@expo/metro-runtime`       | `55.0.10`  | `~57.0.15`                  |
| `@expo/vector-icons`        | `^15.0.3`  | `^15.0.2` (unchanged major) |
| `jest-expo`                 | `~55.0.16` | `~57.0.5`                   |

TypeScript and `@types/react` are not in `bundledNativeModules.json`; the SDK 56
changelog says templates move TypeScript to `6.0.3` and that you can opt out via
`expo.install.exclude`. The repo pins `typescript ~5.9.2` —
**a TypeScript 5.9 → 6.0 jump is an independent, and probably larger, piece of
work.** Keep it out of this lot; add `typescript` to `expo.install.exclude`.

---

## 4. React Native jumps in between

Three RN releases: 0.83.6 → 0.84 → 0.85 → 0.86.3.

### RN 0.84 — "Hermes V1 by Default" (2026-02-11)

Source: [reactnative.dev/blog/2026/02/11/react-native-0.84](https://reactnative.dev/blog/2026/02/11/react-native-0.84)

- **Hermes V1 is the default engine** on both platforms. No migration needed if
  already on Hermes (we are, `hermesEnabled=true` /
  `expo.jsEngine: "hermes"` in `ios/Podfile.properties.json`). An escape hatch
  exists (`hermes-compiler` override / `hermesV1Enabled=false`) if a crypto
  library misbehaves — worth knowing given this app's dependency mix.
- **Legacy Architecture code excluded from iOS builds by default**
  (`RCT_REMOVE_LEGACY_ARCH`). Android drops a long list of legacy classes
  (`LazyReactPackage`, `CxxModuleWrapper`, `CallbackImpl`,
  `LayoutAnimationController`, …).
  **Hits:** nothing in our code; it is a constraint on third-party native modules
  (see §5).
- **`RCTImage` observer API changed** (`ImageResponseObserverCoordinator`, fixing
  an `EXC_BAD_ACCESS`) — the blog names `react-native-svg` as affected.
  **Hits:** `react-native-svg` is load-bearing here (QR codes, every
  `phosphor-react-native` icon). Handled by taking SDK 57's `15.15.4`.
- Deprecated: `XHRInterceptor`, `WebSocketInterceptor`,
  `TurboModuleProviderFunctionType`. Legacy Perf/Network tabs removed from the
  in-app Element Inspector. **Hits:** none in our code.
- **Node ≥ v22.11** stated in the 0.84 release notes. Note this conflicts with
  0.85's own statement (below) and with Expo's; our `22.12.0` satisfies all of
  them, but `package.json#engines` still allows `^20.19.0`, which 0.84's wording
  would exclude. See §6.

### RN 0.85 — "New Animation Backend, New Jest Preset Package" (2026-04-07)

Source: [reactnative.dev/blog/2026/04/07/react-native-0.85](https://reactnative.dev/blog/2026/04/07/react-native-0.85)

- **The Bridge is removed outright** — no fallback, no interop shim. Every native
  module must be New-Architecture-native. This is the single highest-risk item
  for this repo (§5).
- **Jest preset moved:** `react-native` → `@react-native/jest-preset`.
  **Hits:** `apps/mobile/jest.config.js` uses `preset: 'jest-expo'`, and
  `jest-expo@56.0.1` already switched internally
  ([jest-expo CHANGELOG](https://github.com/expo/expo/blob/sdk-57/packages/jest-expo/CHANGELOG.md)) —
  so no edit is expected. Verify `pnpm --filter @salmon/mobile test` after the bump.
- **`StyleSheet.absoluteFillObject` removed** (use `StyleSheet.absoluteFill`).
  **Hits:** none — no occurrence anywhere under `apps/`, `packages/`.
- Android: `Pressable` no longer unmounts listeners in a hidden Activity;
  `ReactTextUpdate` internal; `CatalystInstanceImpl` removed;
  `NativeViewHierarchyManager` stubbed; `ReactZIndexedViewGroup` and
  `UIManagerHelper` deprecated. iOS: `RCTHostRuntimeDelegate` merged into
  `RCTHostDelegate`. C++: several `ShadowNode::*` aliases removed.
  **Hits:** none in our code — all consequences for native modules.
- **New shared animation backend**, built with Software Mansion, powering both
  `Animated` and Reanimated; layout props become animatable with the native
  driver. Experimental/opt-in in 0.85.1+. **Hits:** none required, but this is
  the substrate under `react-native-reanimated 4.5` — the reason to smoke-test
  every animated surface (bottom sheets, the Powerups sink/float, the FAB).
- Deprecated: `AccessibilityInfo.setAccessibilityFocus`.
- **Node:** drops EOL versions; requires v20 ≥ 20.19.4 or v22+; v21 and v23 not
  supported.
- Metro bumped to `^0.84.0`.

### RN 0.86 — "Edge-to-Edge and DevTools Improvements, no breaking changes" (2026-06-11)

Source: [reactnative.dev/blog/2026/06/11/react-native-0.86](https://reactnative.dev/blog/2026/06/11/react-native-0.86)

- **No user-facing breaking changes.**
- Android 15+ edge-to-edge fixes: `measureInWindow` coordinates,
  `KeyboardAvoidingView` available space, `Dimensions` window values,
  `StatusBar` style/visibility updates while a Modal is open, navigation-bar
  contrast honouring `enforceNavigationBarContrast`.
  **Hits:** this app runs `edgeToEdgeEnabled=true` and has
  `android.predictiveBackGestureEnabled: true` in `app.json`. These are fixes,
  but they _move pixels_ on Android — every screen with a bottom sheet, a
  keyboard (Send amount, password, recover) or a modal needs an Android visual
  pass. Expect `packages/shared/src/theme` insets work, not code work.
- The RN repo moved from the `facebook` to the `react` GitHub org (React
  Foundation). URLs redirect; no action.

---

## 5. Non-Expo native deps

Target versions from SDK 57's `bundledNativeModules.json`
([link](https://github.com/expo/expo/blob/sdk-57/packages/expo/bundledNativeModules.json)):

| Package                                     | Here      | SDK 57    | Note                                                                                                                       |
| ------------------------------------------- | --------- | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| `react-native-reanimated`                   | `4.2.1`   | `4.5.1`   | Pairs with worklets 0.10.1 and RN 0.85's shared animation backend.                                                         |
| `react-native-worklets`                     | `0.7.4`   | `0.10.1`  | **Currently in `expo.install.exclude`** — that exclusion must be removed or the upgrade silently leaves a mismatched pair. |
| `react-native-gesture-handler`              | `~2.30.0` | `~2.32.0` |                                                                                                                            |
| `react-native-screens`                      | `~4.23.0` | `~4.26.0` |                                                                                                                            |
| `react-native-safe-area-context`            | `~5.6.0`  | `~5.7.0`  | Interacts with the 0.86 edge-to-edge fixes.                                                                                |
| `react-native-svg`                          | `15.15.3` | `15.15.4` | Patch bump; covers the RN 0.84 `RCTImage` observer change.                                                                 |
| `@react-native-async-storage/async-storage` | `2.2.0`   | `2.2.0`   | **No change.**                                                                                                             |
| `react-native-get-random-values`            | `^1.11.0` | `~1.11.0` | No change.                                                                                                                 |

Not pinned by Expo — each has to be verified by hand against RN 0.86:

- **`react-native-fast-crypto` `^3.0.0`** — used at
  `packages/shared/src/crypto/fastCrypto.native.ts` (re-exports `pbkdf2`) and
  called from `packages/shared/src/crypto/mnemonic.ts:232` for seed derivation.
  npm metadata shows v3.0.0 last modified 2026-06-30, i.e. it is maintained in the
  post-bridge era, but its declared peer range is `react-native >=0.47.0 <1.0.0`,
  which tells us nothing. **UNVERIFIED: whether v3 is a TurboModule/JSI module.**
  Mitigating fact: the call site is wrapped in `if (pbkdf2?.deriveAsync)` +
  `try/catch` with a WebCrypto and then a JS fallback, so a _missing_ module
  degrades gracefully — but a module that fails to **build** breaks the binary,
  not the runtime. Verify first; `react-native-quick-crypto` is the
  New-Architecture replacement if it does not hold
  ([docs](https://margelo.github.io/react-native-quick-crypto/)).
- **`react-native-encrypted-storage` `^4.0.3`** — last published 2022-11-03, i.e.
  squarely pre-New-Architecture, and listed in `expo.doctor.reactNativeDirectoryCheck.exclude`.
  **It has zero import sites**: the only matches outside the lockfile are
  `apps/mobile/package.json` itself. **Delete this dependency as part of the
  lot** — it removes the most likely build blocker for free. (Deleting it moves
  the native fingerprint; see §7.)
- **`react-native-permissions` `^5.6.1`** (latest 5.6.2, published 2026-09-14) —
  also in the doctor exclude list, and likewise **no import sites found** under
  `apps/mobile` or `packages`. Candidate for deletion; confirm it is not pulled
  in transitively by a config plugin before removing.
- **`phosphor-react-native` `^3.0.6`** (latest 3.0.6, 2026-04-23) — pure JS over
  `react-native-svg`, imported per-icon from `src/` in `apps/mobile/src/icons.ts`.
  Deep `src/` imports are fragile across bundler changes; if `babel-preset-expo`'s
  Hermes-v1 trimming or package-exports handling changes anything, this is where
  it shows. Low risk, cheap to check via `export:check`.
- **`react-native-qrcode-svg` `^6.3.20`** (latest 6.3.24, 2026-09-08) — JS wrapper
  over `react-native-svg >=14`. Used at
  `apps/mobile/src/components/QRCode/QRCode.tsx:13`. No native code of its own.
- **`@solana/webcrypto-ed25519-polyfill`**, `@noble/hashes`, `buffer`,
  `readable-stream` — JS only, installed from `apps/mobile/index.js:113`. Not a
  native concern, but they are the reason `metro.config.js` is full of
  `resolveRequest` special cases, and those cases are the thing most likely to
  need re-tuning after a Metro bump (Metro `^0.84.0` in RN 0.85).

---

## 6. Toolchain and environment

| Requirement              | SDK 56/57 states                                                                                                                                                                                                                                                                   | This repo                                      | Action                                                                                                                                                                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Xcode                    | **26.4+** for SDK 56; SDK 57 additionally supports Xcode 27 ([SDK 56](https://expo.dev/changelog/sdk-56), [SDK 57](https://expo.dev/changelog/sdk-57))                                                                                                                             | not pinned in-repo                             | Check the dev machine and the EAS image before starting.                                                                                                                                                                                                                       |
| iOS deployment target    | **16.4** (up from 15.1) — the 56.0.0 breaking-change line in every `expo-*` package                                                                                                                                                                                                | Podfile default `'15.1'`, generated            | CNG regenerates it. **Drops support for iOS 15 users** — a product decision, not just a build one.                                                                                                                                                                             |
| macOS (for Expo modules) | 13.4                                                                                                                                                                                                                                                                               | —                                              | n/a                                                                                                                                                                                                                                                                            |
| Android                  | API level 36 supported / required to compile for SDK 56; Android SDK Platform 36 and JDK 17 per Expo's environment setup ([SDK 56 upgrade blog](https://expo.dev/blog/upgrading-to-sdk-56), [set up your environment](https://docs.expo.dev/get-started/set-up-your-environment/)) | `android/` generated                           | **UNVERIFIED: the exact `minSdkVersion` SDK 57 sets.** Expo's own wording is "SDK 56 can build apps for Android 7+". Confirm from `expo-modules-core`'s gradle defaults during the lot.                                                                                        |
| Node                     | RN 0.85: v20 ≥ 20.19.4 or v22+ (not v21/v23). RN 0.84's notes say **≥ v22.11**. SDK 56 changelog says 20.19.4.                                                                                                                                                                     | `.nvmrc` `22.12.0`, EAS `node 22.12.0`         | `.nvmrc` and EAS are fine as-is. But `package.json#engines` (`^20.19.0 \|\| ^22.12.0`) and `scripts/check-build-env.cjs` (`SUPPORTED_NODE_MAJORS = [20, 22]`) allow Node 20.19.0–20.19.3, which RN 0.85 explicitly drops. Tighten the floor to `^20.19.4` or drop 20 entirely. |
| pnpm                     | not stated by Expo                                                                                                                                                                                                                                                                 | `packageManager pnpm@9.15.9`, EAS `pnpm 9.0.0` | No stated requirement found. Leave alone unless install breaks.                                                                                                                                                                                                                |
| EAS CLI                  | `>= 14.0.0` in `eas.json`                                                                                                                                                                                                                                                          | —                                              | **UNVERIFIED: the EAS CLI floor SDK 57 wants.** Check before the first build.                                                                                                                                                                                                  |

Also: `apps/mobile/eas.json → build.base` sets node/pnpm but no `image`. The
Xcode version therefore comes from EAS's default image for the resolved SDK —
confirm it is ≥ 26.4 at build time rather than assuming.

---

## 7. Repo gates that move

Ordered by how easy each is to forget. All of these are described in the root
`AGENTS.md` §"Gates that carry a baseline".

1. **`apps/mobile/app.json → expo.version`.** An SDK jump changes every native
   dependency; this ships as a **binary**, never as an OTA update. Bump `1.1.0`
   → whatever the release is. Non-negotiable.
2. **`apps/mobile/native-fingerprint.json`.** The fingerprint will change from
   `f327d896…` the moment any native dep, plugin or patch moves — and it will
   move a lot here. `apps/mobile/scripts/check-native-fingerprint.mjs` passes as
   long as `expo.version` also moved, so CI will stay green during the work; the
   baseline is refreshed with
   `pnpm --filter @salmon/mobile fingerprint:write` **when the binary is built**,
   not before. Also bump `@expo/fingerprint` (`0.16.6`) to whatever SDK 57 pairs
   with — **UNVERIFIED** which version that is.
3. **`pnpm.patchedDependencies` / `patches/expo-camera@55.0.21.patch`.** The key
   is version-exact; install fails against `expo-camera@57.0.5`. Re-check whether
   the `ExpoCameraBarcodeScanning.podspec` entry is still missing upstream — if
   Expo fixed it, **delete the patch** rather than rebasing it.
4. **`package.json → pnpm.overrides`.** Four SDK-55 exact pins
   (`@expo/dom-webview`, `@expo/log-box`, `@expo/metro-runtime`,
   `expo-manifests`) must be bumped to their 57 equivalents or removed. Note
   `@expo/log-box` and `expo-manifests` are **not** in `bundledNativeModules.json`
   — find their SDK 57 versions from the installed tree, or drop the override and
   let resolution decide.
5. **`apps/mobile/package.json → expo.install.exclude`.** Drop
   `@react-navigation/native` (the dependency goes away entirely) and
   `react-native-worklets` (it must track reanimated). Consider **adding**
   `typescript` so `expo install --fix` does not drag TypeScript 6 in.
6. **`apps/mobile/jest.config.js`.** The `jest-expo` preset is unchanged, but the
   `transformIgnorePatterns` entry for `react-navigation|@react-navigation/.*`
   becomes dead once the fork lands. The coverage ratchet
   (`statements 75 / branches 64 / functions 65 / lines 77`) only ever goes up —
   if the upgrade deletes code, coverage may _rise_, and the floor should follow.
7. **CI (`.github/workflows/ci.yml`).** `pnpm --filter @salmon/mobile export:check`
   (an actual Metro export, the best early warning here), `pnpm check:fingerprint`,
   `pnpm check:i18n`, `pnpm check:parity` (+ its own `node --test`).
   `check:parity` compares mobile to the DOM twin: **if the upgrade edits a mobile
   component, the extension twin moves with it.** Only `_layout.tsx` is expected
   to change, which has no twin, so parity should stay quiet — but
   `CROSS_PLATFORM_CLONE_LINES_MAX` in `scripts/check-dom-parity.mjs` is a ratchet
   that only goes down.
8. **`.nvmrc` / `engines` / `eas.json` / `scripts/check-build-env.cjs`** must keep
   saying the same thing (root `AGENTS.md`). If the Node floor moves (§6), all
   four move together.
9. **`CHANGELOG.md`** — a mobile binary release needs its section, and the
   `mobile/v*` tag is checked against `app.json` and the fingerprint baseline.

Not a gate but worth the same discipline: `pnpm check:powerups-bundle <dist>`
after a `EXPO_PUBLIC_POWERUPS=off` build, since `apps/mobile/metro.config.js`'s
`withPowerupsFlag` resolver hooks into `resolveRequest` — the exact API most
likely to be perturbed by a Metro major.

---

## 8. Effort, risk, order of operations

### Honest estimate

**2–4 focused days**, most of it verification rather than editing.

The code diff is genuinely small: one import line in `_layout.tsx`, a
dependency-manifest sweep, a patch decision, and two dead dependencies to delete.
What takes the time is that this app is a **wallet running a large crypto
dependency graph through a hand-written Metro resolver**, and the upgrade moves
Hermes (v0 → v1 default), the Babel preset (forked from
`@react-native/babel-preset`, Hermes-v1 transforms trimmed), Metro (`^0.84.0`),
and the bridge (removed). Any of those can break resolution or syntax handling
for `@solana/kit`, `@bonfida/spl-name-service`, `rpc-websockets`, `create-hmac`,
`create-hash` or `axios` in ways no type check catches. `export:check` catches
bundling failures; only a device run catches the rest.

### Risk register

| Risk                                                                    | Severity   | Why                                                                                                                                         |
| ----------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `react-native-fast-crypto` does not build post-bridge                   | **High**   | It is native and sits on seed derivation. Build failure, not graceful degradation. Verify **first** — it can invalidate the whole schedule. |
| Metro/Babel changes break one of the `resolveRequest` special cases     | **High**   | Six hand-written resolution hacks, all for crypto libraries. Caught by `export:check`, but fixing may mean re-deriving a resolution path.   |
| iOS 16.4 minimum drops iOS 15 users                                     | Medium     | Product decision. Check the App Store install base before the lot, not after.                                                               |
| Android edge-to-edge pixel shifts (RN 0.86)                             | Medium     | `edgeToEdgeEnabled=true` + bottom sheets + keyboards. Visual, not structural.                                                               |
| Reanimated 4.2 → 4.5 on a new animation backend                         | Medium     | Every animated surface needs a manual pass.                                                                                                 |
| Codemod misses import sites                                             | Low        | Only one site exists; do it by hand.                                                                                                        |
| `expo/fetch` replacing global fetch under the bitcoin/ethereum services | Low–Medium | Behaviour should match; `AbortSignal` path deserves a look.                                                                                 |
| Unread `expo-*` CHANGELOGs hide a breaking change                       | Low        | Every one read so far says only "iOS 16.4". Still: read them.                                                                               |

### Suggested order

**Go 55 → 56 → 57 as two commits on one branch, in one lot — not two lots.**

Expo's walkthrough says to upgrade one SDK at a time
([walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)),
and that is right here: all the breaking changes are in 56, and mixing them with
57's bumps makes bisecting a bundling failure miserable. But **do not ship 56**:
the Hermes v1 memory regression with Reanimated is present in 56 and resolved in
57, and Expo itself says to go to 57
([SDK 56 changelog](https://expo.dev/changelog/sdk-56)). Treat 56 as a
verification checkpoint inside the branch, not a release.

0. **Before anything**: verify `react-native-fast-crypto@3` builds on the New
   Architecture without the bridge, and check the iOS 15 install base. Both can
   change the plan.
1. Delete `react-native-encrypted-storage` (unused) and, if confirmed unused,
   `react-native-permissions`. Smallest diff with the largest risk reduction.
2. Branch (`feat/expo-sdk-57`, per the repo's branch-per-ticket rule). Bump to
   SDK 56: `expo@^56`, then `npx expo install --fix` with the `install.exclude`
   list corrected first, then `npx expo-doctor`.
3. Fix `_layout.tsx`'s `@react-navigation/native` import by hand; drop the
   dependency; clean `jest.config.js`'s `transformIgnorePatterns`.
4. Resolve the `expo-camera` patch and the four root `pnpm.overrides`.
5. **Checkpoint**: `pnpm typecheck`, `pnpm test`, `export:check`, then a real dev
   build on an iOS device and an Android device. Exercise: create wallet, recover
   from seed (that is the PBKDF2 path), biometric unlock, camera QR scan, send
   review, activity, NFTs, the Powerups sheet. Do **not** ship this.
6. Bump to SDK 57 (`expo@^57`, ≥ `57.0.9` for the memory fix), `expo install --fix`,
   `expo-doctor`. Expect near-zero code changes.
7. Android visual pass for the 0.86 edge-to-edge fixes; animation pass for
   Reanimated 4.5.
8. Bump `app.json → expo.version`, write the `CHANGELOG.md` section, build the
   binary, then `fingerprint:write`, then tag `mobile/v*`.

Rule for the whole lot: **no gate is ever weakened to get green.** Every failure
above has a named, deliberate fix in §7.

---

## 9. Open questions

1. **Does `react-native-fast-crypto@3.0.0` build without the bridge (RN ≥ 0.85)?**
   Unresolved; blocking. If not: adopt `react-native-quick-crypto`, or drop the
   native fast path and accept the WebCrypto/JS fallback already in
   `mnemonic.ts` — which is a **performance and UX** decision on seed derivation
   (the Jest config already notes real PBKDF2 is slow enough to need a 20s test
   timeout), and arguably a security-adjacent one. Owner's call.
2. **Is dropping iOS 15 acceptable?** SDK 56 forces a 16.4 minimum. Needs the App
   Store install-base number.
3. **Do we take the `@expo/vector-icons` → `@react-native-vector-icons/*`
   migration now, or delete `@expo/vector-icons` entirely?** Its only real use is
   preloading `FontAwesome.font` in `_layout.tsx:70` — is that font still needed
   at all, given `phosphor-react-native` is the icon set?
4. **Is `react-native-permissions` truly unused?** No import sites found, but it
   may be pulled by a config plugin. Confirm before deleting.
5. **TypeScript 6.0.3**: SDK 56 templates move to it. Keep it out of this lot
   (recommended), or take it together? It touches every package, not just mobile.
6. **What `minSdkVersion` does SDK 57 set, and does it drop any Android devices
   we care about?** UNVERIFIED above.
7. **Which EAS build image / Xcode version will the production profile resolve
   to?** `eas.json` pins node and pnpm but not `image`; SDK 56 needs Xcode 26.4+.
8. **Does the `expo-camera` patch still apply upstream?** If Expo fixed
   `expo-module.config.json`, the patch and its `pnpm.patchedDependencies` entry
   should be deleted rather than rebased.
9. **Unread CHANGELOGs**: `expo-blur`, `expo-clipboard`, `expo-constants`,
   `expo-crypto`, `expo-dev-client`, `expo-font`, `expo-glass-effect`,
   `expo-haptics`, `expo-image`, `expo-linear-gradient`, `expo-linking`,
   `expo-local-authentication`, `expo-localization`, `expo-screen-capture`,
   `expo-system-ui`, `expo-web-browser`. Read the 56.x/57.x "🛠 Breaking changes"
   sections of each at
   `https://github.com/expo/expo/blob/sdk-57/packages/<name>/CHANGELOG.md` when
   the lot starts. `expo-glass-effect` and `expo-blur` matter most — they back
   `apps/mobile/hooks/useMembraneMaterial.ts` and the bottom-sheet /
   blur-container components, which are the app's most fragile visuals.
