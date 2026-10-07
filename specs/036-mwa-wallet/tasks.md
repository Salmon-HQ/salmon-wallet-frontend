# Tasks: Salmon answers dApps on Android (Mobile Wallet Adapter)

**Input**: `specs/036-mwa-wallet/` (plan.md, spec.md, research.md, data-model.md, contracts/mwa-translation.md, quickstart.md)

**Tests**: required by the constitution (V) and the plan — logic is written test-first.

**Gate**: Phase 1 ends in a spike; if the bridge does not run under the new architecture, stop and report.

## Phase 1: Setup and spike

- [x] T001 Add `@solana-mobile/mobile-wallet-adapter-walletlib@1.4.5` to `apps/mobile/package.json` and install with pnpm 10 / Node 24
- [x] T002 Write the config plugin `apps/mobile/plugins/withMobileWalletAdapter.js` (style of `withQuietDevMenu.js`): `withAndroidManifest` adds `.MwaActivity` (exported, singleTask, own `taskAffinity`, translucent theme, portrait) with the two `solana-wallet` intent filters (`order=1` VIEW+DEFAULT+BROWSABLE, `order=0` DEFAULT); `withDangerousMod` writes `MwaActivity.kt` next to `MainActivity.kt` (ReactActivity, `getMainComponentName() = "MobileWalletAdapterEntrypoint"`, `ReactActivityDelegateWrapper` + `DefaultReactActivityDelegate` exactly as the generated `MainActivity`)
- [x] T003 Register the plugin in `apps/mobile/app.json` and declare the translucent style it needs (via the plugin's `withAndroidStyles`)
- [x] T004 Register `MobileWalletAdapterEntrypoint` in `apps/mobile/index.js` (Android only) pointing at a stub `apps/mobile/src/mwa/MwaRoot.tsx` that starts the session and declines every request
- [x] T005 Spike: prebuild, `expo run:android` on `Seeker_API35`; check the `solana-wallet:` intent resolves to Salmon and `npx solana-mobile@latest playground` Connect returns "user declined". Record the result in `research.md` R1

## Phase 2: Foundational (blocks every story)

- [ ] T006 [P] Tests for the translator in `packages/shared/src/utils/mwa.test.ts`: chain mapping (incl. legacy names, unsupported → null), identity domain (missing, non-http, host extraction), `toSignAllTransactionsRequest`/`toSignAndSendRequest` round-trip of legacy and v0 transactions, `withSignature` keeps co-signer signatures and rejects a signer not in the message, `isMwaAuthorizationValid` for each mismatch, `newMwaAuthToken` length
- [ ] T007 Implement `packages/shared/src/utils/mwa.ts` per `contracts/mwa-translation.md` until T006 passes; export from `packages/shared/src/utils/index.ts`
- [ ] T008 [P] Add optional `authToken` to `TrustedApp` in `packages/shared/src/types/trusted-app.ts`
- [ ] T009 [P] Remove `packages/shared/src/hooks/useRuntime.ts`, `useRuntime.native.ts`, `useRuntime.shared.ts`, `useRuntime.test.ts` and their exports in `packages/shared/src/hooks/index.ts`; fix the comment in `packages/shared/src/utils/platform.ts`
- [ ] T010 Extract the provider tree of `apps/mobile/app/_layout.tsx` into `apps/mobile/src/providers/AppProviders.tsx` (fonts, `setApiPlatform`, focus manager stay where they are or move with it); `_layout.tsx` uses it; existing mobile tests stay green
- [ ] T011 Tests for the session hook in `apps/mobile/src/mwa/useMwaSession.test.ts` (native module mocked): requests are queued and surfaced one at a time, every request is resolved exactly once, unmount/session end declines the pending one
- [ ] T012 Implement `apps/mobile/src/mwa/useMwaSession.ts` (listener + `initializeMobileWalletAdapterSession('Salmon', config)` with the limits in `data-model.md`; queue; `finish` on session end) until T011 passes
- [ ] T013 `apps/mobile/src/mwa/MwaRoot.tsx`: `AppProviders` + lock gate (show `LockContent` while `state.locked`, unlock via password or `useBiometric().unlock()`), then render the current request's view; watch-only active account → decline with a message

## Phase 3: User Story 1 — Connect a dApp (P1) 🎯 MVP

**Independent test**: playground Connect → address shown; Trusted apps lists the dApp; decline, locked, unsupported network and unverified identity behave per spec.

- [ ] T014 [P] [US1] RN view `apps/mobile/src/components/DAppApproval/DAppConnectApprovalView.tsx` on `DAppConnectApprovalViewPropsBase`, `dapp.*` copy, theme tokens (+ RNTL test)
- [ ] T015 [US1] Authorize handler in `apps/mobile/src/mwa/handlers.ts`: chain → network (refuse unsupported or ≠ active network with `dapp.network_mismatch`), domain from `identityUri` (refuse if missing), `verifyCallingPackage` → `showOriginWarning`, on approve `addTrustedApp(domain, {name, icon, address, authToken}, networkId)` and respond with account + token
- [ ] T016 [US1] Reauthorize and deauthorize handlers in `apps/mobile/src/mwa/handlers.ts` using `isMwaAuthorizationValid`; deauthorize removes the trusted app (covers US4)

## Phase 4: User Story 2 — Sign and send transactions (P1)

**Independent test**: playground Sign transaction and Sign and send on devnet; signature resolves on an explorer; unreadable / too many / unauthorized refused.

- [ ] T017 [P] [US2] RN view `DAppTransactionApprovalView.tsx` on `DAppTransactionApprovalViewPropsBase` using `useSolanaTransactionApproval` for fee and effects (+ RNTL test)
- [ ] T018 [US2] signTransactions handler: auth check, payload count ≤ 10, decode each (unreadable → `InvalidSignatures` with `valid[]`), `approveSolanaTransactionRequest` with `toSignAllTransactionsRequest`, merge with `withSignature`, respond `signedPayloads`
- [ ] T019 [US2] signAndSendTransactions handler: same checks, one `approveSolanaTransactionRequest` per payload via `toSignAndSendRequest` (WYSIWYS check included), stop at the first send failure (`InvalidSignatures`), respond `signedTransactions` with signatures

## Phase 5: User Story 3 — Sign message and sign in (P2)

- [ ] T020 Confirm the `signMessages` response byte layout against the official fakewallet source and record it in `contracts/mwa-translation.md`
- [ ] T021 [P] [US3] RN views `DAppSignMessageApprovalView.tsx` and `DAppSignInApprovalView.tsx` on their `*PropsBase` (+ RNTL tests)
- [ ] T022 [US3] signMessages handler: `approveSolanaSignMessage` per payload with the identity origin (lookalike → refused)
- [ ] T023 [US3] Sign-in inside authorize: map `signInPayload` to `SolanaSignInInputFields`, `approveSolanaSignIn`, return `signInResult`

## Phase 6: User Story 4 — Stay connected and disconnect (P3)

- [ ] T024 [US4] Jest test: approved dApp reauthorizes silently; revoked or wrong-account dApp gets `AuthorizationNotValid`; revoking in `TrustedAppsSelector` shows MWA apps with their name and icon

## Phase 7: Polish and gates

- [ ] T025 [P] New copy keys (unverified app, watch-only, too many payloads) in `packages/shared/src/locales/en/translation.json` and `es/translation.json`; list them for owner review
- [ ] T026 Maestro flow `apps/mobile/.maestro/flows/actions/dapp/mwa-connect.yaml`: send the `solana-wallet:` association intent from a test dApp and approve/decline (follow `.maestro/AGENTS.md`)
- [ ] T027 Run `quickstart.md` hand-test end to end on `Seeker_API35`; record results
- [ ] T028 `pnpm typecheck`, `pnpm lint` (0/0), Vitest in `packages/shared`, `pnpm --filter mobile test`, mobile Maestro smoke
- [ ] T029 Note in `apps/mobile/AGENTS.md`: this feature needs a new binary; fingerprint baseline is refreshed from CI's hash after merge

## Dependencies

- Phase 1 → Phase 2 → stories. US1 before US2–US4 (they need an authorization). US2 and US3 are independent of each other.
- T006 → T007; T011 → T012; T010 → T013.

## Parallel examples

- Phase 2: T006, T008, T009 together.
- US2 + US3 views (T017, T021) while handlers are written.

## Implementation strategy

MVP = Phases 1–3 (Salmon connects to any dApp). Then US2 (the reason dApps exist), US3, US4, polish. Owner sign-off (constitution III) before Phase 2 starts.
