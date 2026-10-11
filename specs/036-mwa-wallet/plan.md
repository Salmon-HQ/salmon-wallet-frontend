# Implementation Plan: Salmon answers dApps on Android (Mobile Wallet Adapter)

**Branch**: `feat/seeker-dapp-store` (spec dir `036-mwa-wallet`) | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/036-mwa-wallet/spec.md`

## Summary

A second Android activity answers `solana-wallet:` intents through the official React Native bridge (`@solana-mobile/mobile-wallet-adapter-walletlib`). Each request is translated into the dApp-approval request shapes the extension already uses and signed by the existing `approveSolana*` functions; approval screens are React Native twins of the extension's views, fed by the same `*PropsBase` contracts, `useSolanaTransactionApproval` preview and `dapp.*` copy. Authorizations live in the existing trusted-apps list. New logic is limited to encoding, a signature merge, token checks and the session/queue.

## Technical Context

**Language/Version**: TypeScript 5 (React Native 0.86.3, Expo SDK 57), Kotlin for one generated activity

**Primary Dependencies**: `@solana-mobile/mobile-wallet-adapter-walletlib` 1.4.5 (new); existing `@solana/kit`, `expo/config-plugins`

**Storage**: existing trusted-apps storage (`TrustedApp.authToken` added)

**Testing**: Vitest (`packages/shared`), Jest + RNTL (`apps/mobile`), Maestro + `solana-mobile playground` on the `Seeker_API35` emulator

**Target Platform**: Android (API 35 Seeker, any Android the app supports). iOS untouched.

**Project Type**: mobile app in a pnpm monorepo

**Performance Goals**: approval visible within the dApp's no-connection warning window (3 s configured)

**Constraints**: native change → new binary, no OTA; fingerprint baseline from CI's Linux hash

**Scale/Scope**: 6 request types, 4 approval views, 1 config plugin

## Constitution Check

| Principle                    | Status                                                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Ownership boundaries      | ✅ Translation helpers → `packages/shared/src/utils/mwa.ts`; RN views, session and activity → `apps/mobile`; nothing from `@salmon/ui` imported by mobile.                                        |
| II. Shared code consumers    | ✅ `TrustedApp` gains an optional field (extension ignores it). `useRuntime`/`ADAPTER_PREFIXES` removal: consumers checked — only its barrel export and test.                                     |
| III. Wallet safety           | ⚠️ Touches the dApp signing path and the lock flow. No change to `approveSolana*`, crypto or storage; only callers and a pure signature merge. **Requires owner sign-off before implementation.** |
| IV. Bilingual copy           | ✅ Reuse `dapp.*`; new keys EN+ES, flagged for owner review.                                                                                                                                      |
| V. Functional coverage first | ✅ Vitest for translation and token checks, Jest for the session queue, then one Maestro flow.                                                                                                    |
| VI. Ask rather than guess    | ✅ Approval rules and `useRuntime` removal clarified (spec §Clarifications).                                                                                                                      |
| Platform constraints         | ⚠️ Native config (manifest, new activity, new native module) → prebuild + new store binary; called out in the spec. Locked identifiers untouched.                                                 |

## Project Structure

### Documentation (this feature)

```text
specs/036-mwa-wallet/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/mwa-translation.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code

```text
packages/shared/src/
├── utils/mwa.ts (+ mwa.test.ts)          # NEW pure translation, token, signature merge
├── utils/index.ts                         # export
├── types/trusted-app.ts                   # + authToken?
└── hooks/useRuntime*.ts, hooks/index.ts   # REMOVED (clarification)

apps/mobile/
├── plugins/withMobileWalletAdapter.js     # NEW manifest + MwaActivity.kt
├── app.json                               # register plugin
├── index.js                               # registerComponent('MobileWalletAdapterEntrypoint')
├── app/_layout.tsx                        # provider tree moved to AppProviders
└── src/
    ├── providers/AppProviders.tsx         # NEW shared provider tree (both roots)
    ├── mwa/MwaRoot.tsx                    # NEW lock gate + request host
    ├── mwa/useMwaSession.ts (+ test)      # NEW bridge session, one-at-a-time queue, resolve
    └── components/DAppApproval/           # NEW RN views: Connect, SignMessage, SignIn, Transaction
```

**Structure Decision**: follow the existing split — protocol-agnostic logic in shared, Android/RN runtime in the mobile app.

## Phases

0. **Spike (gate)**: add the dependency + plugin + an empty `MwaRoot` that resolves every request as declined; build; confirm with the playground that Salmon is offered and the bridge runs under the new architecture. If it does not, stop and report before any other work.
1. **Shared**: `utils/mwa.ts` test-first; `TrustedApp.authToken`; remove `useRuntime`.
2. **Mobile host**: `AppProviders` extraction (no behavior change, existing tests green), `useMwaSession` queue + lock gate.
3. **Requests**: authorize/reauthorize/deauthorize → sign messages / sign-in → sign transactions → sign and send.
4. **Views**: RN approval views on `*PropsBase` + `dapp.*` copy; new keys EN/ES.
5. **E2E + gates**: Maestro flow, quickstart hand-test, `pnpm typecheck`, `pnpm lint`, all package tests, review agents (owner picks).

## Complexity Tracking

| Item                               | Why needed                                                          | Simpler alternative rejected because                                                                       |
| ---------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Second activity + generated Kotlin | The bridge reads the request from the current activity's intent     | Reusing `MainActivity` depends on unverified `onNewIntent` behaviour and drags the whole app over the dApp |
| `withSignature` helper             | MWA returns full transactions and co-signer signatures must survive | `serializeSignedTransactionFromApproval` rebuilds with empty signatures                                    |
