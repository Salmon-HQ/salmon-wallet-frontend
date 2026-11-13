# Implementation Plan: Solana Pay transaction requests

**Branch**: `feat/043-solana-pay-transaction-request` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/043-solana-pay-transaction-request/spec.md` (Linear DEV-209), with the owner's rule of 2026-11-12 "Hay que asumir lo que la documentación indica" recorded in the spec's §Clarifications: sponsor signs first and the wallet last, the wallet submits, Salmon runs its own devnet merchant, the implementer writes the Spanish copy.

## Summary

A `solana:https://…` link stops being refused. The shared classifier turns it into a transaction request; a shared module fetches the merchant's label and icon, posts the user's address, and checks the returned transaction by the standard's rules (verify every present signature, fill nothing but the user's slot, refuse a missing co-signer, set fee payer and blockhash only on an unsigned one, refuse a blockhash the active network does not know). The review is core's confirmation screen, fed by the same preview, display and hold rules the mobile dApp review uses, plus the merchant's identity, message and who pays the fee. Core signs it through a new "received" proposal kind that sends the bytes exactly as previewed, behind the existing phrase gate, wait and receipt. A small sheet on each twin shows the merchant while the payment is prepared. A dev-only script serves a devnet merchant, with Kora as sponsor, for every case the spec lists. No new dependency, no permission change, no backend change.

## Technical Context

**Language/Version**: TypeScript 5 strict, React 19; React Native / Expo (`apps/mobile`), DOM via WXT MV3 (`apps/extension`) over `@salmon/ui`. Dev script: Node 24 ESM.

**Primary Dependencies**: `@solana/kit` 8.4.0 (`getTransactionDecoder`, `getCompiledTransactionMessageDecoder/Encoder`, `decompileTransactionMessageFetchingLookupTables`, `setTransactionMessageFeePayer`, `setTransactionMessageLifetimeUsingBlockhash`, `compileTransaction`, `verifySignature`, `getPublicKeyFromAddress`, RPC `isBlockhashValid`/`getBlockHeight`), `expo-image` (mobile icon). All present. Platform `fetch`.

**Storage**: none (data-model: nothing persists; Activity reads the chain).

**Testing**: Vitest (`packages/shared`, `packages/ui`), Jest (`apps/mobile`); gates `check:parity`, `check:i18n`, `check:no-secrets`, `check:manifest`, coverage ratchets. Manual devnet matrix in quickstart §3.

**Target Platform**: iOS/Android (JS-only, OTA-able: no native config) and the extension side panel (Chrome; Firefox build shares the code).

**Project Type**: pnpm + turbo monorepo, two apps on two shared packages.

**Performance Goals**: SC-002: scan → review < 5 s (GET + POST, ≤ 10 s timeout each, then four RPC reads and one simulation, in parallel where independent); scan → confirmed < 30 s.

**Constraints**: untrusted third-party bytes (threat section); MV3 extension pages are CORS-bound without host permissions; Powerups must not reach the new signing path; twins on one contract; tokens only; the DOM clone ceiling only goes down.

**Scale/Scope**: 2 new shared modules + 1 hook, ~6 changed shared files, 1 new contract type, 1 sheet per twin, 2 confirmation twins and 2 hosts touched, 2 Send entries, 1 dev script, ~25 translation keys.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Ownership boundaries             | PASS   | Link parsing, HTTP, checks, display, hook, core signing: `packages/shared`. Sheet contract: `packages/shared/src/types/ui`. DOM sheet: `packages/ui`. RN sheet: `apps/mobile`. Entries: each app's Send step. Merchant: `scripts/` (dev tool, no package imports it).                                                                                                                                                                                                                        |
| II. Consumers named                 | PASS   | `classifyScanPayload`: mobile `QRScanner.tsx`, `scan-payload.ts` re-export. `readSettledPaymentLink`: mobile `send/index.tsx`, DOM `StepRecipient.tsx`. `dappTransactionDisplay`: mobile `MwaRequest.tsx` (new inputs optional, output unchanged when absent). `TransactionProposal`/`signProposal`/`useSignatureRequestHost`: both `ConfirmationHost`s, Swap and Memo Powerups (Powerup type unchanged). `TransactionConfirmation` DOM: `ConfirmationHost` only. Barrels gain exports only. |
| III. Wallet safety (NON-NEGOTIABLE) | HOLD   | New signing path in `core/broadcast` + `core/signing` + `core/confirmation`, and new transaction preparation in `blockchain/solana`. Lands as its own commit with tests (contracts/received-proposal.md) and waits for the owner's explicit sign-off. Nothing in `crypto/` or `storage/` changes.                                                                                                                                                                                            |
| IV. Bilingual strings               | PASS   | Keys in ui-contracts.md; English and Spanish written by the implementer (owner decision 2026-11-12, spec §Clarifications), which replaces AGENTS.md's "never guess" for this feature only; the owner reviews them in the PR.                                                                                                                                                                                                                                                                 |
| V. Functional coverage first        | PASS   | Vectors for parser, HTTP rules, every refusal, received signing, host refresh, Powerup-door guard; one render test per sheet twin and for the confirmation changes. Devnet matrix by hand; no new e2e.                                                                                                                                                                                                                                                                                       |
| VI. Ask rather than guess           | PASS   | Placement, contract shape and copy settled in research; the CORS limitation and the UI changes are listed for the owner (quickstart §4).                                                                                                                                                                                                                                                                                                                                                     |
| Platform constraints                | PASS   | No `app.json`, plugin or permission change; `check:manifest` must show no diff. No identifier renamed.                                                                                                                                                                                                                                                                                                                                                                                       |
| Design tokens                       | PASS   | Sheet and identity row use kit blocks and tokens; timeouts and size cap are named constants, not tokens.                                                                                                                                                                                                                                                                                                                                                                                     |

Post-design re-check: unchanged. One kit gap closed rather than opened: the DOM `TransactionConfirmation` implements `requiresHold`/`confirmDisabled`, which its shared contract already declared.

## Architecture decisions

| Piece                                             | Lives in                                                                                                        | Reuses                                                                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Link recognition                                  | `blockchain/solana/transfer-request.ts` (reason split), `utils/scan-payload.ts` (new `transactionRequest` kind) | Existing classifier and settled-link reader, so camera + paste on both apps get it at once (R1)                                           |
| Merchant HTTP                                     | `blockchain/solana/transaction-request.ts`                                                                      | Platform `fetch`; the reference wallet's request shape (R2)                                                                               |
| Transaction checks/preparation                    | `blockchain/solana/transaction-request-checks.ts`                                                               | `buildTransactionFromEncodedMessage` (size/version), the compiled-message lifetime patch from `core/broadcast/solana.ts`, kit verify (R3) |
| Review content                                    | `utils/dapp-transaction-display.ts` (+ `requester`, `message`, `feePayer` inputs)                               | `loadSolanaTransactionApprovalDetails`, `previewSolanaApprovalEffects`, `dappTransactionGate` — the mobile dApp review's pieces (R5)      |
| Review screen, phrase gate, wait, receipt, banner | `core/confirmation` (`ReceivedTransactionProposal`, `useRequestReceivedSignature`), both `ConfirmationHost`s    | `SignatureRequestProvider` already mounted in both apps; `requireBackup` inside its `confirm` (R4)                                        |
| Signing                                           | `core/broadcast/solana.ts` `sendReceivedSolanaTransaction`, routed by `core/signing`                            | `signTransactionWith` (own slot only), `sendExpectingOutcome`, `confirmSolanaSignature` (R4)                                              |
| Expiry                                            | `isStale`/`refresh` on the proposal, rule in `useSignatureRequestHost`                                          | The host's existing "never sign a stale build" rule (R7)                                                                                  |
| Flow state                                        | `hooks/useSolanaPayTransactionRequest.ts`                                                                       | —                                                                                                                                         |
| Preparing UI                                      | `SolanaPayRequestSheet` twins + `SolanaPayRequestSheetPropsBase`                                                | Kit `BottomSheetContainer`, `ListRow`, `IconBubble`, `WarningNotice`, `Spinner`                                                           |
| Test merchant                                     | `scripts/devnet-solana-pay-merchant.mjs`                                                                        | Root-hoisted kit; wallet B of `devnet-fixtures.cjs`; Kora via its own JSON-RPC (R10)                                                      |

What is deliberately not reused: `core/verify` (declared-effects allow-list, built for backend transactions whose fee payer is the wallet; a merchant's transaction has a foreign fee payer and arbitrary programs, so its protection is the preview) and the extension's `DAppTransactionApprovalPage` (bound to the dApp popup window and background channel).

## Threats and mitigations

| Threat                                                                                | Mitigation                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Malicious merchant builds a transaction that drains other assets or grants a delegate | Strict effect preview on the active network (every SOL/token movement of the user, approvals named, unreadable programs flagged) and the dApp hold rules; review never opens before the preview answers; rent shows as SOL leaving. The label is the merchant's claim; the domain (punycode) is shown beside it. |
| Not HTTPS / redirect to `http`                                                        | Link refused unless absolute `https:` (no request made); `redirect: 'error'` on both apps (mobile through `expo/fetch`); `response.url` must stay `https:` on the same host; platform cleartext bans in release builds. `http:` icons are not loaded.                                                            |
| Requests to the local network                                                         | IP-literal, `localhost`, `.local` and single-label hosts refused before any request.                                                                                                                                                                                                                             |
| Oversized or slow responses                                                           | 64 KiB cap (header check + counted stream where available), 10 s timeout per request, transaction size limit from the decoder.                                                                                                                                                                                   |
| Signature-slot confusion                                                              | Sign only if the POSTed address is an expected signer with an empty slot; `signTransactionWith` refuses foreign slots; core refuses when the active account differs from the POSTed one.                                                                                                                         |
| Forged or missing co-signer                                                           | Every present signature verified on device; any other empty slot → refused ("malicious" in the standard).                                                                                                                                                                                                        |
| Wrong network                                                                         | The transaction's blockhash must be valid on the active network (`isBlockhashValid`) before review and again right before signing; the wallet never switches network.                                                                                                                                            |
| Blockhash or bytes swapped between review and signing                                 | One immutable base64 string is previewed, shown and signed; no second source; signed bytes are never re-stamped; stale → refetch → re-review unless the display is identical and the preview vouched for it (a held review with new bytes always asks for a new press).                                          |
| A Powerup reusing the received path to skip its declared-effects check                | Powerup door rejects `source: 'received'`; the received entry is lint-blocked for `powerups/**`, with a boundary fixture.                                                                                                                                                                                        |
| Durable-nonce transaction (signature never expires)                                   | Its lifetime is not a valid blockhash → refused.                                                                                                                                                                                                                                                                 |
| Untrusted SVG icon                                                                    | Rendered only as an image (`<img>`, `expo-image`), never parsed as a document; placeholder on any failure.                                                                                                                                                                                                       |
| Merchant-supplied text (label, message, error message)                                | Plain text only, no links, no markup; control and bidi characters removed; label ≤ 64, message ≤ 256 characters.                                                                                                                                                                                                 |
| Identity leakage on GET                                                               | No wallet-added headers, `credentials: 'omit'`, no referrer. Residual: platform `User-Agent` and the extension's `Origin`.                                                                                                                                                                                       |
| Watch-only account                                                                    | Refused before any request.                                                                                                                                                                                                                                                                                      |

## Open risks and departures

- **Extension needs merchant CORS.** Merchants without `Access-Control-Allow-Origin` (and preflight for the JSON POST) cannot be paid from the extension; mobile is unaffected. The standard does not mention CORS; the reference wallet code uses CORS mode. Not mitigated in this feature (a broad host permission was rejected).
- **Spec text corrected** (2026-11-12, in this commit): wrong network is caught by the blockhash check, not by the simulation, because the shared simulation replaces the blockhash; FR-011 gains the standard's rule that an unsigned transaction still expecting another signer is refused.
- **Departures from the standard, all stricter**: `redirect` in the POST response is ignored ("should"); IP-literal/localhost hosts refused; `http:` icons accepted as valid but not rendered; durable-nonce transactions refused.
- **Unverified until the devnet run**: Kora `signTransaction` on a transaction whose user slot is empty; RN `fetch` behaviour on redirects; `expo-image` SVG on Android (research marks each).
- **AGENTS.md "never guess a translation"**: overridden for this feature by the owner's decision; flagged so the reviewer reads the Spanish.

## Project Structure

### Documentation (this feature)

```text
specs/043-solana-pay-transaction-request/
├── plan.md              # this file
├── spec.md              # + §Clarifications (2026-11-12)
├── research.md          # R1–R11, sources
├── data-model.md        # link, merchant details/response, prepared transaction, states, refusals
├── quickstart.md        # checks, devnet merchant, hand test, sign-offs
├── contracts/
│   ├── transaction-request.md   # wallet ↔ merchant wire contract + shared API + vectors
│   ├── received-proposal.md     # core signing changes
│   └── ui-contracts.md          # sheet, confirmation changes, Send entries, copy keys
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared/src/
├── blockchain/solana/
│   ├── transfer-request.ts               # http(s) split: 'transactionRequest' | 'transactionRequestMalformed'
│   ├── transaction-request.ts            # NEW: parseTransactionRequestLink, fetchMerchantDetails, fetchMerchantTransaction
│   └── transaction-request-checks.ts     # NEW: prepareMerchantTransaction, assertReceivedTransactionSignable
├── utils/
│   ├── scan-payload.ts                   # + { kind: 'transactionRequest', link } in classify + readSettledPaymentLink
│   └── dapp-transaction-display.ts       # + requester, message, feePayer inputs
├── core/
│   ├── confirmation/types.ts             # ProposalBase, ReceivedTransactionProposal, display.requester/requiresHold/confirmDisabled, isStale
│   ├── confirmation/SignatureRequestContext.tsx  # union parking; Powerup door rejects 'received'
│   ├── confirmation/received.ts          # NEW: useRequestReceivedSignature
│   ├── confirmation/useSignatureRequestHost.ts   # isStale → refresh → continue if display unchanged
│   ├── signing/index.ts                  # route by proposal kind
│   └── broadcast/solana.ts               # + sendReceivedSolanaTransaction
├── hooks/useSolanaPayTransactionRequest.ts  # NEW: state machine, builds the received proposal
├── types/ui/solana-pay-request-sheet.ts  # NEW: SolanaPayRequestSheetPropsBase
└── locales/{en,es}/translation.json      # solanaPay.*; remove send.request.errors.transactionRequest

packages/ui/src/components/
├── SolanaPayRequestSheet/                # NEW: sheet, types.ts, test
├── TransactionConfirmation/              # requester row; requiresHold/confirmDisabled; host forwards them
└── SendPage/{StepRecipient,SendPage}.tsx # transactionRequest → sheet; NFT flow: paymentLinkNotHere

apps/mobile/
├── src/components/SolanaPayRequestSheet/ # NEW: sheet, types.ts, test
├── src/components/TransactionConfirmation/  # requester row; host forwards hold/disabled
├── src/components/QRScanner/             # acceptTransactionRequests; rejection copy elsewhere
└── app/(app)/send/index.tsx              # scan/paste → sheet → core review → home

eslint.config.js                          # Powerups block: + '**/core/confirmation/received'
scripts/devnet-solana-pay-merchant.mjs    # NEW: dev-only devnet merchant (never shipped)
CLAUDE.md                                 # SPECKIT pointer → this plan
```

**Structure Decision**: everything that decides — parsing, HTTP rules, transaction checks, the review's content, the flow's states, signing — is one shared implementation in `packages/shared`, so the twins only draw: one sheet each, and small changes to the confirmation twins they already share. The signing path is core (`core/*`), not a Powerup, because it signs bytes no declaration describes and must stay out of a Powerup's reach.

## Complexity Tracking

| Violation                                              | Why Needed                                                                                                                                                                                               | Simpler Alternative Rejected Because                                                                                                                                                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A second proposal kind in core's signing path          | A merchant transaction arrives signed by its sponsor; the existing path re-stamps the blockhash (breaks the sponsor's signature) and requires a declared-effects expectation the merchant cannot provide | Re-using `approveSolanaTransactionRequest` gives no wait/receipt and answers a dApp bridge; building a parallel review + wait + receipt for one flow duplicates core's host on two twins                                                 |
| A lint-restricted entry (`core/confirmation/received`) | Keeps the no-expectation path out of every Powerup's reach                                                                                                                                               | Accepting both kinds through `requestSignature` would hand every Powerup a door that skips its declared-effects check; the runtime guard on that door plus a separate, lint-blocked entry keeps it shut at both review time and run time |
