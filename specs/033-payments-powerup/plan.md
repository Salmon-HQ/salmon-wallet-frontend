# Implementation Plan: Payments — ask for USDC, pay what you scanned

**Branch**: `feat/powerups-foundations` | **Date**: 2026-09-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/033-payments-powerup/spec.md`, the owner's UI decisions of 2026-09-15 (amount input = Send's `AmountEntryCard` with the fiat line; the request QR is a bottom sheet with the request's facts under it; DESIGN.md and the existing layouts are not renegotiated; both twins, logic in shared), and the defaults the owner did not overrule (scan on Send's first step, the ordinary Send review with locked fields plus "who" and "for what" lines, paste on the extension, kit `ListRow` rows, remove from the detail only, watch-only accounts get the tab). No PR, no merge: the owner reviews the branch.

## Summary

Two halves on one standard. **Asking** is the Powerup `payments`: a Home sub-tab where the account builds a Solana Pay transfer-request URI on the device (own address, USDC, amount, a fresh reference, note, expiry), shows it as a QR in a sheet, keeps its requests in device storage per account and network, and decides "paid" by reading the network itself at `finalized`. **Paying** is core Send: the scanner and a paste field learn the whole transfer-request grammar, a request with an amount opens the review with recipient, token and amount locked, and the transfer carries the reference keys and the memo so any Solana Pay receiver recognises it. No server record, no new dependency, no fee. The backend changes by one read-only registry entry so the per-network switch can list it.

## Technical Context

**Language/Version**: TypeScript 5 strict, React 19 on both twins; React Native / Expo (`apps/mobile`), DOM via WXT (`apps/extension`) over the `@salmon/ui` kit.

**Primary Dependencies**: `@solana/kit` ^8.2 (RPC reads, `createSolanaRpc`, `generateKeyPair`, `getAddressFromPublicKey`, `AccountRole`), `@solana-program/token-2022` + `@solana-program/memo` (already the transfer builders), `react-native-qrcode-svg` / `qrcode.react` (already the QR twins), `expo-camera` (already the scanner). **No new dependency**: `@solana/pay` was evaluated and declined (research §R1).

**Storage**: the wallet's own `TypedStorage` under a new `STORAGE_KEYS.POWERUP_STATE` map, written through a core hook the Powerup may import (research §R3). No backend persistence.

**Testing**: Vitest in `packages/shared` and `packages/ui`, Jest in `apps/mobile`; the repo gates `pnpm check:parity`, `check:i18n`, `check:no-secrets`, `check:manifest`, `check:powerups-bundle`, coverage ratchets.

**Target Platform**: iOS/Android (Expo, JS-only change, OTA-able) and the browser side panel (Chrome/Firefox). No native config touched: the camera permission already exists for the address scanner.

**Project Type**: pnpm + turbo monorepo, two apps on two shared packages.

**Performance Goals**: a pending request refreshes its status every 5 s while on screen (one `getSignaturesForAddress` per tick, one `getTransaction` only when a signature appears); the list refreshes pending rows once when opened. SC-003 (paid within 10 s of finality) follows.

**Constraints**: the Powerups boundary lint (no `storage`, `crypto`, `core/signing`, `core/broadcast`, account classes, kit signing inside `powerups/**`); "core signs, core waits, core receipts"; twins on one contract; tokens only; every string in en + es with es from the owner; the DOM clone ceiling only goes down.

**Scale/Scope**: one Powerup folder, two new component folders per twin, one Send extension across four files, one parser, one settlement reader, one storage seam, one backend registry entry, ~15 translation keys.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status | How                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Ownership boundaries             | PASS   | Parser, encoder, settlement reader, storage seam, Send state: `packages/shared` (core). Powerup logic: `packages/shared/src/powerups/payments`. DOM components: `packages/ui`. RN components: `apps/mobile`. Extension paste entry: `packages/ui` SendPage (DOM kit), no extension-only code.                                                         |
| II. Shared code has consumers named | PASS   | Touched shared exports and their consumers are listed in research §R7 (Send flow state, `useSendTransaction`, `SolanaTransferOptions`, `transfer.ts`, `scan-payload.ts`, `QRCode`). Barrels keep their paths; only additive fields.                                                                                                                   |
| III. Wallet safety (NON-NEGOTIABLE) | HOLD   | `packages/shared/src/blockchain/solana/transfer.ts` gains two additive options (`references`, memo on the SOL path) — a change in the transaction-building path, so it lands as its own commit with tests and the owner signs it off explicitly before merge. Nothing in `crypto/` or `storage/` changes behaviour (one key added to `STORAGE_KEYS`). |
| IV. Bilingual strings               | PASS   | Every string is a key under `payments.*` (Powerup) or `send.request.*` (core). English written in this lot; Spanish comes from the owner before the i18n gate can pass (quickstart §Copy).                                                                                                                                                            |
| V. Functional coverage first        | PASS   | Parser/encoder vectors, settlement decision table, store, screen logic, Send request state: Vitest in shared. Twins: one render test each on their states. No E2E in this lot (Maestro deprecated; Playwright only if the owner asks).                                                                                                                |
| VI. Ask rather than guess           | PASS   | Placement, contract shape and the Spanish copy are resolved or explicitly parked for the owner (quickstart §Copy, §Owner sign-offs). Watch-only, scan entry, review shape are the owner's stated defaults.                                                                                                                                            |
| Platform constraints                | PASS   | JS-only. No `app.json`, no plugin, no permission change. No identifier renamed.                                                                                                                                                                                                                                                                       |
| Design tokens                       | PASS   | No literal colour/spacing/duration; the poll interval is a named constant in the Powerup, not a token (it is not motion).                                                                                                                                                                                                                             |

Post-design re-check (after Phase 1): unchanged. One runbook gap opened (research §R6): the QR-in-a-sheet block and the brand knockout become kit-level (`QRCode.brandKnockout`), which is a kit change inside this lot rather than a Powerup-local drawing.

## Project Structure

### Documentation (this feature)

```text
specs/033-payments-powerup/
├── plan.md              # this file
├── spec.md
├── research.md          # Phase 0: decisions R1–R9
├── data-model.md        # Phase 1: PaymentRequest, TransferRequest, Settlement, store shape
├── quickstart.md        # Phase 1: how to run it, what to hand-test, what the owner signs off
├── contracts/
│   ├── transfer-request-uri.md   # the grammar Send reads and the Powerup writes
│   ├── send-request.md           # what Send's flow state and transfer options gain
│   ├── ui-contracts.md           # PaymentsScreenPropsBase, PaymentRequestSheetPropsBase, QRCode.brandKnockout
│   └── backend-registry.md       # the one backend change
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared/src/
├── blockchain/solana/
│   ├── networks.ts                     # + solanaRpcFor(networkId) (thin: createSolanaRpc over the merged nodeUrl)
│   ├── known-mints.ts                  # NEW: USDC_MINT_BY_NETWORK
│   ├── transfer.ts                     # + TransferOptions.references (read-only metas on the transfer ix), memo on the SOL path
│   ├── transfer-request.ts             # NEW: parseTransferRequest / encodeTransferRequest (Solana Pay grammar)
│   └── transfer-request-settlement.ts  # NEW: findTransferRequestSettlement(rpc, query) — finalized, reference, mint, owner, exact delta
├── types/
│   ├── send.ts                         # + SendTransactionParams.memo / references
│   ├── blockchain.ts                   # + SolanaTransferOptions.references
│   └── ui/
│       ├── payments-screen.ts          # NEW: PaymentsScreenPropsBase, PaymentRequestSheetPropsBase
│       ├── qr-code.ts                  # + brandKnockout?: boolean
│       └── send-sheet.ts               # + SendRequest (the locked fields Send carries)
├── storage/types.ts                    # + STORAGE_KEYS.POWERUP_STATE
├── hooks/
│   ├── usePowerupState.ts              # NEW: per-Powerup persisted state seam (module store + useSyncExternalStore)
│   ├── useSendFlowState.ts             # + request: SendRequest | null, setRequest, review-from-request
│   └── useSendTransaction.ts           # forwards memo/references to account.transfer
├── utils/scan-payload.ts               # NEW (hoisted from mobile): classifyScanPayload over parseTransferRequest
└── powerups/payments/                  # NEW: manifest, types, constants, usePaymentsScreenLogic, usePaymentRequestStatus, locales/{en,es}.json, index
    (+ registry.ts, locales.ts, index.ts entries; scripts/check-i18n.mjs POWERUP_LOCALES; scripts/check-powerups-bundle.mjs MARKERS; scripts/check-dom-parity.mjs MAP)

packages/ui/src/
├── components/PaymentsPage/            # NEW: PaymentsPage.tsx, PaymentRequestSheet.tsx, types.ts, tests
├── components/QRCode/                  # + brandKnockout (the overlay ReceiveSheet draws today, hoisted)
├── components/SendPage/                # StepRecipient: paste field accepting a transfer request; StepReview: locked rows + who/for-what
└── powerups.ts / powerups.off.ts       # + PaymentsPage

apps/mobile/
├── src/components/PaymentsScreen/      # NEW: PaymentsScreen.tsx, PaymentRequestSheet.tsx, types.ts, tests
├── src/components/QRCode/              # + brandKnockout
├── src/components/QRScanner/           # scan-payload.ts becomes a re-export of the shared classifier; QRScanResult carries the parsed request
├── src/screens/PaymentsTab.tsx         # NEW
├── src/powerups/index.ts               # + 'payments' branch
└── app/(app)/send/{index,review}.tsx   # scan → request → review; locked rows + who/for-what

apps/extension/src/pages/home/powerupBodies.tsx   # + 'payments' branch (+ HomePage.test mock)

../salmon-wallet-backend/src/services/solana/powerups/registry.js   # + payments (read-only entry) + stage configs
```

**Structure Decision**: the Solana Pay grammar, the settlement reader and the Send extension are **core** (`blockchain/solana`, `hooks`, `types`) because Send consumes them and `powerups/**` may not own transaction-building or storage. The Powerup folder holds only what is the Powerup's: manifest, request list logic, status polling, copy. Storage reaches the Powerup through one generic core seam (`usePowerupState`) so that the boundary lint stays exactly as it is and the next stateful Powerup reuses the seam instead of asking for a second exception.

## Complexity Tracking

| Violation                                                         | Why Needed                                                                                                                                                   | Simpler Alternative Rejected Because                                                                                                                                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A kit change (`QRCode.brandKnockout`) inside a Powerup lot        | The owner wants the request QR in a sheet like Receive; Receive's brand knockout is drawn inside `ReceiveSheet`, so a second QR sheet would have to copy it. | Copying the overlay into the Powerup breaks runbook §2 ("anything two would share climbs into the kit") and raises the clone ceiling. Extending `ReceiveSheet` to take an arbitrary `value` overloads a one-state sheet with a second meaning. |
| A generic `usePowerupState` seam instead of a Payments-only store | `powerups/**` cannot import `storage`; the Powerup must persist a list.                                                                                      | A Payments-specific core hook would put Powerup vocabulary in core and would be copied for Stake positions later. A lint exception for `storage` would weaken the boundary the foundation exists to hold.                                      |
