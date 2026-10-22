# Research: Analytics catalog v2

Every fact below was read in this repo, the backend's `origin/main`, or the installed package typings. Items not verified are marked **unverified** with the check that settles them.

## R1. How a build knows it is a store build (FR-014)

- **Decision**: decide at runtime from a signal the store artifact already carries.
  - Mobile: `Updates.channel === 'production'` (`expo-updates` 57.0.24, `build/Updates.d.ts:22-26`: "The channel name of the current build … `null` otherwise", and always `null` in development builds). EAS writes the channel into the binary: `production` (`apps/mobile/eas.json:55`), inherited by `production-apk` and `dapp-store`; `dapp-store-test` sets its own (`:73`); `staging` and `testflight` use `staging` (`:39`). Release builds made without EAS (`xcodebuild`, `expo run --configuration Release`) carry no channel (`app.json` has `updates.url` only, no request headers).
  - Extension: `browser.management.getSelf()` → `installType !== 'development'`. `@types/chrome` (`index.d.ts:7568`): "This function can be used without requesting the 'management' permission"; `ExtensionInstallType.DEVELOPMENT` = "loaded unpacked in developer mode" (`:7452`). Playwright loads the build unpacked.
  - Then `getAnalyticsUrl(storeBuild)`: an explicit `EXPO_PUBLIC_ANALYTICS_URL` / `VITE_ANALYTICS_URL` wins; a non-store build whose API is production posts to the staging URL; everything else follows `getApiUrl()` (local backend in local mode, staging in staging mode, production in store builds).
- **Rationale**: the extension's store package and the Playwright build are the same `wxt build` output (`.github/workflows/build-extension.yml:86`; `.playwright/global-setup.ts:36-46` requires that build), and AMO rebuilds it byte for byte (`build-extension.yml:93-98`). Any build-time switch would either change the reviewed bundle or route e2e to production. On mobile, local Release builds read `.env.production` and talk to the production API even when told otherwise, so the API URL alone cannot tell a team build from a store build.
- **Alternatives considered**: per-profile `EXPO_PUBLIC_ANALYTICS_URL` in `eas.json` (misses local Release builds and needs an override in `dapp-store-test`); a new Vite mode for e2e (e2e would stop testing the shipped bundle); comparing `chrome.runtime.id` with the store id (does not work on Firefox, whose id is fixed in the manifest).
- **Unverified**: Firefox reports `installType: 'development'` for add-ons loaded through `about:debugging`. Check: load the Firefox build temporarily, opt in, read the request host in the network panel.

## R2. Delivery from a closing window (FR-015)

- **Decision**: the shared transport posts with `fetch(…, { keepalive: true })`, `Content-Type: text/plain;charset=UTF-8`, a 10 s abort, and throws on a non-2xx answer. The extension calls `flush()` on `pagehide` and on `visibilitychange` to hidden; dApp approval pages flush right after tracking and before answering the background. Mobile flushes on `AppState` `background`.
- **Rationale**: the current transport goes through axios (XHR), which the browser cancels on unload; the background closes an approval window as soon as it gets the answer (`background.ts:503-522`). `keepalive` requests outlive the page. A `text/plain` body is a CORS "simple" request, so a call to the staging host (not in `host_permissions`, `wxt.config.ts:122-125`) needs no preflight; the ingest parses the body whatever its type (`handler.js:87-93`) and answers `Access-Control-Allow-Origin: *` (`:38-43`). React Native's `fetch` ignores `keepalive`, which is harmless there.
- **Alternatives considered**: `navigator.sendBeacon` (no response, so no re-queue on failure, and unavailable on React Native); keeping axios and flushing earlier (still cancelled on unload).
- **Related fixes in the client**: the `flushing` guard (`client.ts:167`) is removed, because swapping the queue already prevents double sending and the guard stranded events recorded during an in-flight send at hide time; the flush splits into requests of at most 100 events, the backend's cap (`handler.js:27`), which also keeps each body far below the 64 KiB `keepalive` budget.

## R3. Swap and Memo outcomes (FR-007, FR-009)

- **Decision**: `TransactionProposal` gains `onOutcome?: (success: boolean) => void`. `SignatureRequestProvider.confirm` calls it with `true` after `signProposal` resolves and with `false` when it throws, each call wrapped in its own `try/catch`. The Swap and Memo proposal builders set it.
- **Rationale**: the Powerup hears only the receipt's dismissal and the user's cancel (`SignatureRequestContext.tsx:158-185`); a failed attempt stays parked for a retry and never reaches it. FR-007 needs success at network confirmation and one failure per attempt, which only `confirm` sees. A callback keeps Powerup knowledge (event name, props, the first-swap flag) inside the Powerup; core learns no event names.
- **Alternatives considered**: a declarative `analyticsEvent` field read by core (core would have to know Swap's props and first-time rule); emitting from the Powerup after `requestSignature` resolves (fires at receipt close and misses failures). The historical code (commit `54e8355a`) emitted from the Powerup's own submit, which the confirmation host has since replaced.

## R4. App opens and sessions on mobile (FR-003, FR-004)

- **Decision**: count an open at the first mount of `RootLayoutNav` and whenever `AppState` returns to `active` after the lock rule saw the app leave. The leave is noted exactly where `tryLock()` runs (`_layout.tsx:286` and `:293`), so "open" and "lock" share one rule. Each return-open first rotates the session (`startSession()`), then tracks `app_opened`.
- **Rationale**: the spec defines an open as the moment the wallet locks. `RootLayoutNav` mounts after the update gate (`_layout.tsx:74-90`), so an OTA applied at launch does not count twice, and a process started by Mobile Wallet Adapter never mounts it.
- **MWA activity**: `MwaActivity` is a second `ReactActivity` of the same application (`plugins/withMobileWalletAdapter.js:89-100`) and shares the JS runtime and `AppState`. A presence flag set inside the component provider registered in `index.js:186-191` (called by `runApplication` during the activity's `onCreate`, before `onResume` sends `active`) and cleared when `MwaRoot` unmounts lets the return rule skip it. **Unverified ordering**: confirm on the `Seeker_API35` emulator that the provider runs before the `active` event (Maestro, quickstart §4).
- **Alternatives considered**: a separate `AppState` listener with a copy of the lock rule (two copies drift); emitting at `index.js` start (counts MWA cold starts).

## R5. Consent not read yet (FR-016)

- **Decision**: `track` validates at once, then, while bootstrap is unfinished, re-runs itself after `ready` resolves instead of returning on `consent === false`.
- **Rationale**: `consent` starts `false` and is set asynchronously (`client.ts:44,68-82`); `track` returns on it (`:151`). Fixing it in `track` fixes every early event, not only `app_opened`.

## R6. Platform (FR-005)

- **Decision**: config `platform` may be a promise; `bootstrap()` awaits it, and no flush runs before `ready`. iOS passes `'ios'`; Android passes the memoized Seed Vault check from `useDeviceCapabilities.ts:11-17` (exported) mapped to `'seeker'` or `'android'`.
- **Rationale**: one check per session, the same one that offers SKR. It catches native errors as "no Seed Vault" (`bridge.ts:111-118`). Development builds accept the simulator (`__DEV__`), which only affects non-store builds.

## R7. Powerup id list (FR-002)

- **Decision**: a literal `POWERUP_IDS` in `analytics/events.ts`, mirrored by the backend, plus a test that every registry id appears in it.
- **Rationale**: the allow-list must stay a closed literal on both sides; deriving it from the registry would make the off build (Powerups aliased out) send an empty enum and the backend could not mirror it.

## R8. Backend platform list

- **Decision**: accept `extension`, `mobile`, `ios`, `android`, `seeker`; map anything else, `web` included, to `unknown`.
- **Rationale**: the web app is retired; SC-006 wants the document to list exactly what both sides accept. `mobile` stays for builds older than this version.
