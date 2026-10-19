# Tasks: Analytics catalog v2

**Input**: `specs/042-analytics-v2/` (plan.md, spec.md, research.md, data-model.md, contracts/analytics-events-v2.md, quickstart.md)

**Tests**: required by the constitution (V) and the owner: every changed module gets its unit test task before its implementation task. Runners: `packages/shared` Vitest, co-located, `@vitest-environment jsdom` for hooks (`shared-test-authoring`); `apps/mobile` Jest + `@testing-library/react-native`, `@salmon/shared` mocked locally (`mobile-test-authoring`); `apps/extension` Vitest + jsdom + `@testing-library/react` (DOM rules of `ui-test-authoring`; no `packages/ui` change in this feature). Copy follows `i18n-authoring`; approval and signing edits read `security-context` first.

**Gates**: backend first (FR-019). Phases 3–9 ship in one frontend PR on `feat/042-analytics-v2`; each phase ends green on `pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/mobile --filter=@salmon/extension` (zero warnings). No build of any kind is distributed from an intermediate commit.

## Phase 1: Cross-repo prerequisite — salmon-wallet-backend (plan Phase A)

Repo `salmon-wallet-backend`, branch `feat/analytics-catalog-v2` from `origin/main`. Implemented by the supervising session; listed here so the frontend gates can point at it. Contract: `contracts/analytics-events-v2.md`.

- [x] T001 [P] Backend tests in `src/analytics/__tests__/event-schema.spec.js`: exactly 20 event names and 6 prop keys; each of the 11 new events accepted with its plan props; `powerup: 'jupiter'` rejected; `success: 'true'` (string) rejected
- [x] T002 [P] Backend tests in `src/analytics/__tests__/handler.spec.js`: `extension`, `mobile`, `ios`, `android`, `seeker` pass through; `web` and any other value → `unknown`; move the `platform: 'web'` fixtures (lines 33, 50, 64, 87, 104) to `extension`/`mobile`
- [x] T003 [P] Backend test in `src/analytics/__tests__/sink.spec.js`: `toGa4Event` forwards `powerup` as an event param
- [x] T004 Implement `src/analytics/event-schema.js` until T001 passes: 11 names appended to `ANALYTICS_EVENTS`, exported `POWERUPS = ['swap','payments','memo','skr']`, `powerup` in `ALLOWED_PROP_KEYS`, `PROP_ENUMS.powerup = POWERUPS`, `PROP_ENUMS.success = []`
- [x] T005 Implement `src/analytics/handler.js:26` until T002 passes: `PLATFORMS = extension, mobile, ios, android, seeker`. `src/analytics/sink.js` needs no change (`toGa4Event` spreads `props`); T003 guards it
- [x] T006 Backend `docs/ANALYTICS.md` (20 events, 6 keys, platforms, `powerup` custom dimension, pipeline without `web`), `CHANGELOG.md` and `package.json` `0.25.0` (accepted events, prop, platforms; `success` strings rejected); `npm test` green
- [x] T007 Release `0.25.0`: PR to `main`; staging leg on a branch cut from `origin/staging` with the same diff; `npm run serverless:deploy:staging` with exported AWS credentials — done: backend PR #101 (main) and #102 (staging, merged), staging deployed 2026-10-19
- [x] T008 **GATE G1** — probe staging `https://vdlgzf8qjd.execute-api.us-east-1.amazonaws.com/staging/v1/events` with the quickstart §2 body once per platform (`ios`, `android`, `seeker`, `extension`, `mobile`): each answers `{"accepted":11,"rejected":0}`. Blocks any internal app build that sends v2 values — passed 2026-10-19 for all five platforms
- [x] T009 **GATE G2** — the user merges `main` and tags `prod/v0.25.0`; production is confirmed by the tag's deploy run and a health check of its commit, never by a synthetic event. Blocks any store build and any OTA — done 2026-10-19: PR #101 merged (32e7569), tag `prod/v0.25.0`, Deploy run 39313317029 green; prod `/health`, Powerups availability and `/v1/networks` answer 200 before and after

**Checkpoint**: backend `npm test` green; G1 before internal builds, G2 before store builds and OTA.

## Phase 2: Owner tasks outside code (start now; release gates)

- [x] T010 [P] GA4 property 307622850 → Admin → Custom definitions: create the **event-scoped** custom dimension `powerup` (parameter `powerup`) BEFORE any v2 build or OTA — done 2026-10-19 (verified through the Data API: `customEvent:powerup` registered)
- [x] T011 [P] GA4 property 307622850 → Admin → Events: mark `wallet_created`, `wallet_recovered`, `first_send_completed`, `first_swap_completed` as key events (create by name if not listed yet) — done 2026-10-19 (verified through the Admin API: 4 key events, once per event, no event-create rules on either stream)
- [x] T012 [P] In `apps/mobile`, run `eas env:list` for every EAS environment and confirm `EXPO_PUBLIC_ANALYTICS_URL` is not set (it would override build routing, FR-014); before any EAS build of this branch — done 2026-10-19: no variables in any EAS environment (production, preview, development)
- [ ] T013 [P] Team process: every team member declines analytics on their personal store installs (spec "Owner decisions" 2); the single verification install of T071–T072 is the only exception
- [ ] T014 [P] Lawyer question (spec "Legal and store impact"): must installs that consented under the current copy be asked again after the FR-017 copy change? Answer before release; a "yes" is a separate change that ships with or before this one

## Phase 3: Foundational — shared analytics core (blocks every story; plan Phase B)

**Purpose**: the catalog and the four client fixes every new event depends on (FR-001, FR-002, FR-004, FR-005, FR-015, FR-016). Routing (FR-014) is US5.

- [x] T015 [P] Tests in `packages/shared/src/analytics/events.test.ts` (new): `ANALYTICS_EVENTS` is exactly the 20 names with the 9 existing ones first (append-only); `ALLOWED_PROP_KEYS` is exactly 6 keys; `POWERUP_IDS` is `swap, payments, memo, skr`; every `POWERUPS[].id` from `packages/shared/src/powerups/registry.ts` is in `POWERUP_IDS`
- [x] T016 [P] Extend `packages/shared/src/analytics/schema.test.ts`: `powerup: 'memo'` accepted, `powerup: 'jupiter'` rejected, `success: 'true'` rejected, `success: false` accepted
- [x] T017 Implement `packages/shared/src/analytics/events.ts` until T015–T016 pass: append the 11 names, `POWERUP_IDS`, `powerup` in `ALLOWED_PROP_KEYS`, `PROP_ENUMS.powerup = POWERUP_IDS`
- [x] T018 [P] Tests in `packages/shared/src/analytics/transport.test.ts` (new): `fetch` to `{base}/v1/events` with `method: 'POST'`, `keepalive: true`, `Content-Type: text/plain;charset=UTF-8` and no other header; a 4xx/5xx answer throws; the request aborts after 10 s
- [x] T019 [P] Extend `packages/shared/src/analytics/client.test.ts`: an event tracked before bootstrap is sent when consent is stored and dropped when it is not, and strict mode still throws at the call site (FR-016); with a pending `platform` promise no batch leaves, then the batch carries the resolved value (FR-005); an event tracked during an in-flight send leaves on the next flush, and 150 queued events go out as two requests of at most 100 (FR-015); `startSession()` sends queued events under the old session id and the next event under a new one (FR-004)
- [x] T020 Rewrite `packages/shared/src/analytics/transport.ts` on `fetch` until T018 passes: base URL `getAnalyticsUrl() ?? getApiUrl()` (today's resolution; routing changes in T045), 10 s abort, non-2xx throws
- [x] T021 Implement `packages/shared/src/analytics/types.ts` (`AnalyticsPlatform = 'ios' | 'android' | 'seeker' | 'extension'`; config `platform` accepts a promise; correct the "transports swallow their errors" comment at `:41-44`), `packages/shared/src/analytics/client.ts` (hold until `ready`, await platform in `bootstrap()`, no flush before `ready`, drop the `flushing` guard, chunks of ≤100, `startSession()`), and the usage example in `packages/shared/src/analytics/index.ts:13`, until T019 passes

**Checkpoint**: shared, mobile and extension typecheck/lint/test green. `apps/mobile/index.js` still passes `platform: 'mobile'` (JS, outside `tsc`; still accepted by the backend) until T027.

## Phase 4: User Story 2 — How often Salmon is opened, per platform (P1)

**Goal**: `app_opened` once per open (FR-003), session per open on mobile (FR-004), precise platform (FR-005), consent copy that says opens are measured (FR-017).

**Independent test**: on each platform open, background, reopen → two `app_opened` with the right `platform`; Seed Vault screen, permission dialog, iOS overlay, extension approval window and MWA sheet add none; a Seeker reports `seeker`.

- [x] T022 [P] [US2] Extend `apps/mobile/src/seed-vault/useDeviceCapabilities.test.ts`: the exported `loadDeviceCapabilities()` returns the same memoized answer the hook uses, asked once
- [x] T023 [P] [US2] Tests in `apps/mobile/src/analytics/appAnalytics.test.ts` (new, Jest): platform `ios` on iOS; on Android `seeker` when the capabilities hold `seed-vault`, else `android`; cold open tracked once per process; `noteAppLeft()` then `active` → `startSession()` before one `app_opened`; `inactive` → `active` none; `active` without a noted leave (Seed Vault, overlay) none; `active` while the MWA root is on screen none
- [x] T024 [P] [US2] Tests in `apps/extension/src/analytics.test.ts` (new, Vitest): `isDAppApprovalLaunch(hash)` true only with `origin` and `request`; start-up tracks one `app_opened` without an approval hash and none with one
- [x] T025 [US2] Export the memoized `ask()` as `loadDeviceCapabilities` from `apps/mobile/src/seed-vault/useDeviceCapabilities.ts` until T022 passes
- [x] T026 [US2] Create `apps/mobile/src/analytics/appAnalytics.ts` until T023 passes: `startAnalytics()` (`initAnalytics` with the platform promise and the `app.json` version), `trackColdOpen()`, `noteAppLeft()`, `noteAppActive()`, `setMwaOnScreen(on)` (data-model "Mobile open rule")
- [x] T027 [US2] Wire mobile: `apps/mobile/index.js:182` calls `startAnalytics()`, and the MWA component provider at `:186-191` sets MWA presence; `apps/mobile/app/_layout.tsx` calls `trackColdOpen()` on `RootLayoutNav` mount, `noteAppLeft()` beside both `tryLock()` calls (`:286`, `:293`) and `noteAppActive()` on `active`; `apps/mobile/src/mwa/MwaRoot.tsx` clears presence on unmount. Lock behaviour unchanged (security gate T055)
- [x] T028 [US2] Create `apps/extension/src/analytics.ts` until T024 passes: `isDAppApprovalLaunch` extracted from `apps/extension/src/entrypoints/popup/App.tsx:96-101` (App.tsx reuses it) and `startExtensionAnalytics()`; `apps/extension/src/entrypoints/popup/main.tsx:24` and `apps/extension/src/entrypoints/sidepanel/main.tsx:22` call it instead of `initAnalytics`; existing `App.test.tsx` stays green
- [x] T029 [P] [US2] Consent copy (FR-017): replace `settings.analytics_prompt_body` and `settings.analytics_description` with the owner's confirmed strings verbatim in `packages/shared/src/locales/en/translation.json:229,231` and `packages/shared/src/locales/es/translation.json:229,231`, keys unchanged; `pnpm check:i18n`

**Checkpoint**: three-package gate green; `pnpm check:i18n`.

## Phase 5: User Story 3 — Powerup adoption and use (P1)

**Goal**: `powerup_installed` / `powerup_uninstalled` (FR-006), `swap_completed` + `first_swap_completed` (FR-007, FR-008), `memo_sent` (FR-009), `payment_request_created` / `payment_request_paid` (FR-010).

**Independent test**: install Memo, send a memo, remove Memo → `powerup_installed {powerup: memo}`, `memo_sent {success: true}`, `powerup_uninstalled {powerup: memo}` in order; backing out of a swap sends nothing.

- [x] T030 [P] [US3] Extend `packages/shared/src/core/confirmation/SignatureRequestContext.test.tsx`: `onOutcome(true)` after signing resolves and before `dismissReceipt`; `onOutcome(false)` once per failed attempt; nothing on cancel; a throwing `onOutcome` still shows the receipt (success) and the error (failure)
- [x] T031 [P] [US3] Extend `packages/shared/src/analytics/first-time.test.ts`: `trackFirstSwapCompleted()` fires `first_swap_completed` once; a pre-set `salmon_analytics_first_swap` flag suppresses it
- [x] T032 [P] [US3] Extend `packages/shared/src/hooks/useInstalledPowerups.test.ts`: one `powerup_installed {powerup}` per install and one `powerup_uninstalled {powerup}` per removal; none on a repeated install or removal
- [x] T033 [P] [US3] Extend `packages/shared/src/powerups/swap/useSwapScreenLogic.test.ts`: `buildSwapProposal(...).onOutcome(true)` tracks `swap_completed {from_chain:'solana', to_chain:'solana', success:true}` and calls `trackFirstSwapCompleted`; `onOutcome(false)` tracks `success:false` only
- [x] T034 [P] [US3] Extend `packages/shared/src/powerups/memo/useMemoScreenLogic.test.ts`: `buildMemoProposal(...).onOutcome(b)` tracks `memo_sent {success: b}`
- [x] T035 [P] [US3] Extend `packages/shared/src/powerups/payments/usePaymentsScreenLogic.test.ts`: `payment_request_created` once per saved request; two concurrent checks that find the same settlement report `payment_request_paid` once; an already-`paid` request reports nothing
- [x] T036 [US3] Add `onOutcome?: (success: boolean) => void` to `TransactionProposal` in `packages/shared/src/core/confirmation/types.ts:92`; call it in `confirm` of `packages/shared/src/core/confirmation/SignatureRequestContext.tsx:130-168` (true after `signProposal` resolves, false in the catch, each in its own `try/catch`; cancel and the no-signer branch call nothing) until T030 passes
- [x] T037 [US3] Restore `STORAGE_KEYS.ANALYTICS_FIRST_SWAP = 'salmon_analytics_first_swap'` in `packages/shared/src/storage/types.ts`; add `trackFirstSwapCompleted()` to `packages/shared/src/analytics/first-time.ts` and export it from `packages/shared/src/analytics/index.ts` until T031 passes
- [x] T038 [US3] Track install and removal in `packages/shared/src/hooks/useInstalledPowerups.ts:102,111` after the existing no-change guards until T032 passes
- [x] T039 [US3] Set `onOutcome` in `buildSwapProposal` (`packages/shared/src/powerups/swap/useSwapScreenLogic.ts:205`) until T033 passes; imports stay within the Powerups boundary (`analytics` only)
- [x] T040 [US3] Set `onOutcome` in `buildMemoProposal` (`packages/shared/src/powerups/memo/useMemoScreenLogic.ts:34`) until T034 passes
- [x] T041 [US3] Track in `packages/shared/src/powerups/payments/usePaymentsScreenLogic.ts`: `payment_request_created` in `create` (`:294`) after the request is saved and opened; `payment_request_paid` in `check` (`:355`) guarded by a per-mount `Set` of reported ids plus `status !== 'paid'`, until T035 passes

**Checkpoint**: three-package gate green; `pnpm check:powerups-bundle` on an off build (no Powerup event can fire).

## Phase 6: User Story 5 — Clean data in production (P1)

**Goal**: only store builds reach production (FR-014); no event lost to a closing window or a backgrounded app (FR-015, app half).

**Independent test**: a staging build and an e2e run with consent on post to staging (or local); production GA4 shows none of their events.

- [x] T042 [P] [US5] Extend `packages/shared/src/api/config.test.ts` with the `getAnalyticsUrl(storeBuild)` matrix: explicit `*_ANALYTICS_URL` wins; non-store build on the production API → staging URL; store build → `getApiUrl()`; local and staging modes follow `getApiUrl()`
- [x] T043 [P] [US5] Extend `packages/shared/src/analytics/client.test.ts`: with a pending `storeBuild` promise no request leaves; the request goes to the URL chosen for the resolved value; omitted `storeBuild` behaves as `false`
- [x] T044 [P] [US5] Extend `apps/mobile/src/analytics/appAnalytics.test.ts`: `Updates.channel === 'production'` → store build; `null`, `staging`, `dapp-store-test` → not; `AppState` `background` flushes once
- [x] T045 [US5] Implement `getAnalyticsUrl(storeBuild)` in `packages/shared/src/api/config.ts:229`, `storeBuild?: boolean | Promise<boolean>` in `packages/shared/src/analytics/types.ts`, resolved in `bootstrap()` of `packages/shared/src/analytics/client.ts`, with `packages/shared/src/analytics/transport.ts` taking its base URL once `ready`, until T042–T043 pass; `getAnalyticsUrl` stays out of `packages/shared/src/api/index.ts`
- [x] T046 [US5] In `apps/mobile/src/analytics/appAnalytics.ts` pass `storeBuild` from `Updates.channel` (`expo-updates`) and register one `AppState` listener at start-up that flushes on `background`, until T044 passes
- [x] T047 [US5] Extend `apps/extension/src/analytics.test.ts`: `management.getSelf()` `installType: 'development'` → not a store build, `'normal'` → store build, a rejection → not; `pagehide` and `visibilitychange` to hidden start the send synchronously
- [x] T048 [US5] In `apps/extension/src/analytics.ts` pass `storeBuild` from `browser.management.getSelf()` and register the `pagehide` / `visibilitychange` flush listeners at module start, until T047 passes; no change to `apps/mobile/eas.json`, `apps/extension/wxt.config.ts` or env files

**Checkpoint**: three-package gate green; `pnpm --filter @salmon/extension build && pnpm check:manifest` (no permission change); `pnpm --filter @salmon/mobile fingerprint:check` unchanged.

## Phase 7: User Story 4 — dApp usage without dApp identity (P2)

**Goal**: `dapp_connected`, `dapp_message_signed`, `dapp_transaction_signed` on approval only, no props (FR-011–FR-013), delivered before the approval window closes (FR-015).

**Independent test**: from the test dApp connect, sign a message, sign a transaction, deny one → three events, none with a name, origin, domain or icon; the denial sends nothing.

- [ ] T049 [P] [US4] Extend `apps/extension/src/pages/dapp/DAppSignMessageApprovalPage.test.tsx`, `DAppSignInApprovalPage.test.tsx` and `DAppTransactionApprovalPage.test.tsx`: on approve exactly `trackEvent('dapp_message_signed')` (message, sign-in) or `trackEvent('dapp_transaction_signed')` (sign, sign all, sign and send) with no props, then `flush()`, both before `chrome.runtime.sendMessage` carries the result; nothing on reject, guard error or signing failure
- [ ] T050 [P] [US4] Extend `apps/extension/src/pages/dapp/DAppConnectPage.test.tsx`: `trackEvent('dapp_connected')` and `flush()` before the `connected` answer; nothing on deny or failure
- [ ] T051 [P] [US4] Tests in `apps/mobile/src/mwa/MwaRequest.test.tsx` (new, Jest; walletlib and `@salmon/shared` signers mocked as in `useMwaSession.test.ts`): authorize approve, plain and sign-in → one `dapp_connected` before `respond`; sign messages → one `dapp_message_signed`; sign transactions (`signedPayloads`) and sign and send (`'signatures' in result`) → one `dapp_transaction_signed`; decline, sheet close, signing failure, Seed Vault refusal and partial `invalid` → none
- [ ] T052 [US4] `apps/extension/src/pages/dapp/useDAppApproval.ts`: `approve(run, { guardError, failureError, event })` tracks `event` and calls `flush()` after `run()` resolves and before `sendToBackground({ result })`; the three pages pass their event; until T049 passes
- [ ] T053 [US4] `apps/extension/src/pages/dapp/DAppConnectPage.tsx:34`: same in `handleApprove` before `sendToBackground({ method: 'connected', … })`, until T050 passes
- [ ] T054 [US4] `apps/mobile/src/mwa/MwaRequest.tsx`: track in the success branches of the connect approve (`:241`), the messages approve (`:306`) and the transactions approve (`:380`), before the answer, until T051 passes

**Checkpoint**: three-package gate green.

## Phase 7b: Consent version (FR-021, owner decision 2026-10-19)

**Goal**: no new event is recorded under the v1 consent text, whatever the lawyer answers on LS-006. Runs after US4 and before the wallet-safety review (it touches `storage/types.ts`).

- [ ] T073 [P] Extend `packages/shared/src/analytics/client.test.ts`: a stored consent `true` with no version reads as `v1`; a `v1` install sends the 9 v1 events and drops the 11 new ones (including `app_opened`); granting consent through the client stores `v2`; a `v2` install sends all 20; withdrawing consent clears the version
- [ ] T074 Implement until T073 passes: `ANALYTICS_CONSENT_VERSION` in `packages/shared/src/storage/types.ts`; `V1_EVENTS` (the first 9 names) exported from `analytics/events.ts`; the client reads the version at bootstrap, writes `v2` when consent is granted, filters non-v1 events for `v1` installs and clears the version on withdrawal
- [ ] T075 [P] Update `apps/mobile/src/analytics/appAnalytics.test.ts:33` and `apps/extension/src/analytics.test.ts:44` to store a `v2` consent, and re-check the cold-open expectations
- [ ] T076 Owner + lawyer: answer LS-006 (ask v1 installs to accept the v2 text again, or show a prominent notice with a one-tap off switch)
- [ ] T077 After T076: show the v2 text once to `v1` installs as decided (UI change: the owner confirms the screen before it is built), recording `v2` on acceptance (or on dismissal of the notice)

**Checkpoint**: shared, mobile and extension typecheck/lint/test green.

## Phase 8: Wallet-safety review gate (owner condition, constitution III)

- [ ] T055 Run the `security-reviewer` agent on the branch diff of `packages/shared/src/core/confirmation/SignatureRequestContext.tsx`, `packages/shared/src/core/confirmation/types.ts`, `packages/shared/src/storage/types.ts`, `apps/mobile/app/_layout.tsx` (lock effect), `apps/mobile/src/mwa/MwaRoot.tsx` and `apps/mobile/index.js`, plus the approval path `apps/mobile/src/mwa/MwaRequest.tsx`, `apps/extension/src/pages/dapp/useDAppApproval.ts`, `apps/extension/src/pages/dapp/DAppConnectPage.tsx`. It confirms: signing, broadcast and lock behaviour unchanged; a throwing callback never turns a signed transaction into a failure; tracking cannot delay, alter or drop an answer to a dApp; no dApp identity reaches an event. Findings fixed and re-reviewed before this phase closes; blocks the PR

## Phase 9: User Story 1 — Monthly figures a backer can trust (P1)

**Goal**: `docs/ANALYTICS.md` is the tracking plan and metrics dictionary (FR-018, SC-006). Written last because it documents what US2–US5 built.

**Independent test**: two people compute M1, M4 and M8 for the same month from the document alone and get the same figures (SC-005).

- [ ] T056 [US1] Rewrite `docs/ANALYTICS.md` from the spec: privacy posture, the 20-event tracking plan, props and platforms, metrics dictionary M1–M11 with its conventions, what is not measurable, build routing (contract "Routing"), verification and local testing; remove the 11-event catalog, `web`, the "onboarding not measurable" claim and the wrong NFT detail locations
- [ ] T057 [US1] SC-006 review: diff the event, prop key, prop value and platform lists in `docs/ANALYTICS.md` against `packages/shared/src/analytics/events.ts` and the backend's `src/analytics/event-schema.js` and `src/analytics/handler.js` on `feat/analytics-catalog-v2`; zero differences

## Phase 10: Verification (FR-020, plan Phase G; runbook in quickstart.md)

- [ ] T058 Repo gates from plan "Verification gates": three-package typecheck/lint/test, `pnpm check:i18n`, `pnpm check:parity`, `pnpm check:powerups-bundle` (off build), `pnpm --filter @salmon/mobile fingerprint:check`, `pnpm --filter @salmon/extension build && pnpm check:manifest`
- [ ] T059 Playwright: switch `popup.route` to `context.route` in `apps/extension/.playwright/tests/analytics.spec.ts`, `analytics-consent-prompt.spec.ts`, `analytics-coverage.spec.ts` and `analytics-coverage-onchain.spec.ts`; extend `analytics-coverage.spec.ts` with `app_opened`, Memo installed from the catalogue and removed from the Home tab sheet, `payment_request_created`, `memo_sent` (devnet) and the dApp events from `apps/extension/.playwright/scripts/test-dapp.html` (connect, sign message, sign-in, sign transaction, one denial); every batch has `platform: 'extension'`, no address, no test-dApp origin; `analytics-coverage-onchain.spec.ts` covers `swap_completed` + `first_swap_completed` (the owner confirms before the mainnet run)
- [ ] T060 SC-002 in `apps/extension/.playwright/tests/analytics-coverage.spec.ts`: 10 approvals whose windows close at once → 10 dApp events in the local NDJSON (LIVE mode)
- [ ] T061 [P] Maestro flow `apps/mobile/.maestro/flows/actions/analytics/analytics-v2.yaml` (new, per `apps/mobile/.maestro/AGENTS.md`, run through `./run.sh`): opt in (`subflows/enable-analytics.yaml`), launch, background and reopen, Seed Vault confirmation (`subflows/seed-vault-confirm.yaml`), install and remove Memo
- [ ] T062 Local end to end per quickstart §2–§6 against the backend branch: Chromium LIVE run (create `apps/extension/.env.production.local`, then delete it and rebuild); Android emulator `Seeker_API35` (opens, platform, Powerups, MWA with Salmon backgrounded and with Salmon killed — settles research R4 —, first QR scan); iOS Simulator (Face ID adds no open, `ios`); Seeker device (`seeker`, `payment_request_paid`); NDJSON tally shows every event from each platform where it can fire, none rejected (SC-001)
- [ ] T063 Routing by hand (plan Phase D gate): unpacked `apps/extension/dist/chrome-mv3` posts to the staging host; `dist/firefox-mv2` through `about:debugging` does the same (research R1, unverified until then); a mobile dev client posts to local or staging
- [ ] T064 Staging run per quickstart §7 (needs T008): probe answers `rejected: 0` per platform; the unpacked extension with `SALMON_ANALYTICS_LIVE=1` and no override records `rejected: 0` on every ingest response

## Phase 11: SOT vault follow-ups (supervising session, SOT repo, after the code lands)

- [ ] T065 [P] `03-dev/Frontend Analytics and Privacy Model.md`: describe v2; remove the claim that first-onboarding events cannot be measured
- [ ] T066 [P] `03-dev/Stores/Store Privacy Declarations.md`: D5 → "closed allow-list of 20 events"; categories unchanged; record `seeker` as part of "the platform" (LS-005)
- [ ] T067 [P] `06-operations/Processes/Privacy Policy Evidence.md`: the new events and the platform split
- [ ] T068 [P] Privacy Policy §6.1 adds "and how often the app is opened" in EN, ES and PT (`07-publishing/Website/Salmon Privacy Policy Powerups 1.5 *.md`, the 1.5 draft — owner, 2026-10-19: the published 1.4 is not edited), published before or with the release (LS-002)
- [ ] T069 Owner: update Apple App Privacy and Google Play Data safety answers to match T066 (Chrome Web Store "User activity" answer unchanged) before the release reaches the stores (SC-007)

## Phase 12: After release

- [ ] T070 SC-003: during the verification period production GA4 (stream G-NZ4BZZ1R51) shows no event from simulators, dev clients, internal builds or e2e runs
- [ ] T071 SC-004: within 48 h of the first users updating, GA4 Realtime (property 307622850, stream G-NZ4BZZ1R51; the read-only GA4 MCP realtime report, `eventName` × `customEvent:platform`) shows `app_opened`, a Powerup event with `powerup` filled, and `ios`, `android`, `extension`
- [ ] T072 The single opt-in verification store install withdraws consent right after T071

## Dependencies and gates

- Phase 1 (backend) runs in parallel with Phases 3–9; nothing here waits for it except builds.
- **G1**: T008 (staging answers a v2 batch with `rejected: 0`) before any internal build sends v2 values: EAS `staging`, `testflight`, `dapp-store-test`, local Release builds, and the T064 staging run.
- **G2**: T009 (production deployed) before any store build or OTA (`pnpm --filter @salmon/mobile ota`). T010 (GA4 `powerup` dimension) before any v2 build or OTA. T012 (`eas env:list`) before any EAS build of this branch.
- **Store release**: T065–T069 done and T014 answered (SC-007).
- **PR**: T055 (security review) and T058 green before merge.
- Phase 3 → US2 → US3 → US5 → US4 → Phase 7b → T055 → US1 → Phase 10. US5 follows US2 because both edit `apps/mobile/src/analytics/appAnalytics.ts` and `apps/extension/src/analytics.ts`; US3 and US4 depend only on Phase 3.
- Test → implementation pairs: T015/T016 → T017; T018 → T020; T019 → T021; T022 → T025; T023 → T026 → T027; T024 → T028; T030 → T036; T031 → T037; T032 → T038; T033 → T039 (needs T036, T037); T034 → T040 (needs T036); T035 → T041; T042/T043 → T045; T044 → T046; T047 → T048; T049 → T052; T050 → T053; T051 → T054.
- T059 → T060 (same spec file). T062 needs Phase 1 on the local backend; T064 needs T008.

## Parallel examples

- Phase 1 tests: T001, T002, T003. Phase 2: T010–T014, any time.
- Phase 3 tests: T015, T016, T018, T019.
- US2 tests and copy: T022, T023, T024, T029.
- US3 tests: T030–T035 together; then T036, T037, T038 (different files) before T039–T041.
- US4 tests: T049, T050, T051. SOT: T065–T068.

## Implementation strategy

MVP checkpoint = Phase 1 + Phase 3 + US2 + US5: monthly active wallets, opens and platform mix (M1–M3) on clean data. It is an internal checkpoint, not a release: the plan ships Phases 3–9 in one PR. Then US3 (Powerup evidence for backers), US4, the security gate, the document, verification. The owner tasks in Phase 2 start immediately because T010 and T012 gate every build.
