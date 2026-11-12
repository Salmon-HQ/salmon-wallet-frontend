# Tasks: Solana Pay transaction requests — pay a merchant that builds the transaction

**Input**: Design documents from `specs/043-solana-pay-transaction-request/` (Linear DEV-209)

**Prerequisites**: plan.md, spec.md (incl. §Clarifications, owner decisions 2026-11-12), research.md, data-model.md, contracts/, quickstart.md

**Tests**: test-first for every non-trivial rule (link parsing, merchant response validation, signature checks, blockhash handling, received-proposal signing, the Powerup door). A test task is written and seen failing before its implementation task starts.

**Owner condition on the signing-path change** (spec §Clarifications): "testea antes y después para ver que no se haya roto nada". T001–T002 record the baseline on the untouched branch; T068 repeats the suite and compares. New tests for the received path go in NEW files so the existing signing test files stay byte-identical (list in T002).

**Placement rule**: every decision (parsing, HTTP, checks, review content, flow state, signing) lives in `packages/shared`; the twins (`packages/ui`, `apps/mobile`) only render. `CROSS_PLATFORM_CLONE_LINES_MAX` in `scripts/check-dom-parity.mjs` must not go up.

**Node**: every command runs with `export PATH="$HOME/Library/Application Support/Herd/config/nvm/versions/node/v24.21.0/bin:$PATH"`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US5 from spec.md

## Phase 1: Setup — baseline before any change

**Purpose**: the owner's "before" half. Nothing in the source tree changes until this phase is committed.

- [x] T001 Run the full check suite on the untouched branch (HEAD `7894953d` plus the spec/tasks commit, no source change) and record it in NEW `specs/043-solana-pay-transaction-request/verification/baseline.md`: HEAD hash, `node -v`, and for each command its exit code; for each of `@salmon/shared`, `@salmon/ui`, `@salmon/extension`, `@salmon/mobile` the test files and tests passed / skipped / failed as printed by Vitest/Jest. Commands: `pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/ui --filter=@salmon/extension --filter=@salmon/mobile`, `node scripts/check-i18n.mjs`, `node scripts/check-dom-parity.mjs`, `pnpm -s check:no-secrets`, `npx prettier --check .`, `node scripts/check-e2e-selectors.mjs`. Raw logs go to the session scratchpad, not the repo. A gate already red on the untouched branch is written down as pre-existing, not fixed here.
- [x] T002 Record the per-test inventory and the frozen files in `specs/043-solana-pay-transaction-request/verification/`: run each package's tests with a machine-readable reporter (`pnpm --filter @salmon/shared test -- --reporter=json --outputFile=<scratch>/shared.json`, same for `@salmon/ui` and `@salmon/extension`; `pnpm --filter @salmon/mobile test -- --json --outputFile=<scratch>/mobile.json`) and write the sorted `<file> › <full test name> › <status>` lines to NEW `baseline-tests-shared.txt`, `baseline-tests-ui.txt`, `baseline-tests-extension.txt`, `baseline-tests-mobile.txt`. In `baseline.md` list the frozen signing test files with `git hash-object` of each: `packages/shared/src/utils/dapp-approval.test.ts`, `packages/shared/src/utils/dapp-transaction-display.test.ts`, `packages/shared/src/blockchain/solana/signing.test.ts`, `packages/shared/src/blockchain/solana/solana-transfer.test.ts`, `packages/shared/src/blockchain/solana/prepared-transactions.test.ts`, `packages/shared/src/blockchain/solana/prepared-transactions.golden.test.ts`, `packages/shared/src/blockchain/solana/prepared-transactions.outcome.test.ts`, `packages/shared/src/blockchain/solana/confirm.test.ts`, `packages/shared/src/core/broadcast/solana.test.ts`, `packages/shared/src/core/broadcast/solana-swap.test.ts`, `packages/shared/src/core/signing/index.test.ts`, `packages/shared/src/core/confirmation/SignatureRequestContext.test.tsx`, `packages/shared/src/core/confirmation/SignatureRequestContext.outcome.test.tsx`, `packages/shared/src/hooks/useSendTransaction.test.tsx`, `packages/shared/src/hooks/useNftTransfer.test.tsx`, `packages/ui/src/components/SendPage/SendPage.test.tsx`, `apps/mobile/__tests__/app/send-screens.test.tsx`, `apps/mobile/src/mwa/MwaRequest.test.tsx`, `apps/mobile/src/mwa/MwaRequestDetails.test.tsx`. Commit `docs(spec): 043 baseline checks (DEV-209)`.

**Checkpoint**: baseline committed; source changes may start.

---

## Phase 2: Foundational — link recognition, contract types, copy (blocks every story)

- [x] T003 [P] Add a failing Vitest case to `packages/shared/src/blockchain/solana/transfer-request.test.ts`: `solana:http://merchant.example/pay` (and its encoded form) → `{ ok: false, reason: 'transactionRequestMalformed' }`. The existing "refuses a transaction request in v1" case (`https%3A…` → `transactionRequest`) stays as is and keeps passing.
- [x] T004 Split the web-address branch in `packages/shared/src/blockchain/solana/transfer-request.ts` (`parseTransferRequest`, line ~81): `https://` → `transactionRequest`, any other `scheme://` web address → `transactionRequestMalformed`; add the reason to `TransferRequestParseReason`.
- [x] T005 [P] Write failing vectors for `parseTransactionRequestLink` in NEW `packages/shared/src/blockchain/solana/transaction-request.test.ts`: unencoded link; percent-encoded link whose query string survives verbatim; decoded only once (`%2541` stays `%41`); `http://` → `malformedLink`; IPv4 literal, IPv6 literal (`[::1]`) and `localhost` hosts → `malformedLink`; undecodable percent sequence → `malformedLink`; an international domain yields the punycode `host`.
- [x] T006 Create NEW `packages/shared/src/blockchain/solana/transaction-request.ts` with `TransactionRequestLink`, `parseTransactionRequestLink`, the `TransactionRequestRefusal` union (the 14 codes of data-model.md §TransactionRequestRefusal) and `TransactionRequestError(reason, merchantMessage?)`; export them from `packages/shared/src/blockchain/solana/index.ts`. Depends on T005.
- [x] T007 Update `packages/shared/src/utils/scan-payload.test.ts`: replace the assertion at lines 76–81 (`invalidRequest`/`transactionRequest`) with `{ kind: 'transactionRequest', link }` — the one intended change to a previously passing test, named in T068; add `solana:http://…` and an HTTPS link to an IP literal or `localhost` → `invalidRequest`/`transactionRequestMalformed`; `readSettledPaymentLink` returns `{ kind: 'transactionRequest', link }` for an HTTPS link and the generic `error` key `send.request.errors.transactionRequestMalformed` for a malformed one; a transfer request and a non-Solana chain keep today's outcomes. Depends on T004, T006.
- [x] T008 Implement the new classification in `packages/shared/src/utils/scan-payload.ts` (`classifySolanaPay`, `ScanClassification`, `readSettledPaymentLink` and its outcome type) and re-export the new types from `apps/mobile/src/components/QRScanner/scan-payload.ts`. Depends on T007.
- [x] T009 [P] Add the copy to `packages/shared/src/locales/en/translation.json` and `packages/shared/src/locales/es/translation.json` (English and Spanish written by the implementer, owner decision 2026-11-12): `solanaPay.{contacting,preparing,reviewTitle,paying,receiptTitle,merchantMessage,message,feePaidBy,notEnoughSolForFee,refreshed,retry}`, `solanaPay.errors.{watchOnly,malformedLink,unreachable,merchantError,unreadable,malformedIcon,malformedTransaction,invalidSignature,notForThisAccount,alreadySigned,missingSignature,staleOrWrongNetwork,expired,accountChanged}`, `send.request.errors.paymentLinkNotHere`, `send.request.errors.transactionRequestMalformed`, `qrScanner.paymentLinkOnlyInSend`, `transaction.errors.proposalKind`. `solanaPay.errors.unreachable` covers a CORS refusal on the extension (owner decision 2). Keep `send.request.errors.transactionRequest` until T064. `check-i18n` fails on definite orphans, so a key without a consumer yet is expected to be reported until its consumer task lands; the gate must be green at each story checkpoint and in T064. Refusal keys are read as `solanaPay.errors.${reason}` (a dynamic prefix the gate accepts).
- [x] T010 [P] Add the types of contracts/received-proposal.md to `packages/shared/src/core/confirmation/types.ts`: `ProposalBase` (with `isStale?`), `TransactionProposal` re-based on it with no field change, `ReceivedTransactionProposal`, and `ProposalDisplay.requester` / `requiresHold` / `confirmDisabled`. Export the `ReceivedTransactionProposal` type (type only) from `packages/shared/src/core/confirmation/index.ts`. No behaviour change; `pnpm --filter @salmon/shared typecheck` passes.
- [x] T011 [P] UI contracts: add `requester?: { name: string; icon?: string | null; domain: string }` to `TransactionConfirmationPropsBase` in `packages/shared/src/types/ui/transaction-confirmation.ts`; create NEW `packages/shared/src/types/ui/solana-pay-request-sheet.ts` with `SolanaPayRequestSheetPropsBase` exactly as contracts/ui-contracts.md; export it from `packages/shared/src/types/ui/index.ts`.

**Checkpoint**: `pnpm turbo run typecheck test --filter=@salmon/shared` green; a transaction-request link is classified but no screen reacts yet.

---

## Phase 3: User Story 1 — pay a merchant whose fee is sponsored (P1) 🎯 MVP

**Goal**: scan or paste a sponsored merchant link, see merchant + review, confirm, the wallet adds only the user's signature and sends.

**Independent test**: quickstart §3 steps 1–3 with `/pay/sponsored` and `/pay/sponsored-v0`.

### Tests first (US1)

- [x] T012 [P] [US1] Add failing happy-path vectors to `packages/shared/src/blockchain/solana/transaction-request.test.ts` (mocked `fetch`): GET sends only `Accept: application/json` with `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`, `cache: 'no-store'`, `redirect: 'error'`; `{label, icon}` parsed, `domain` = link host, `iconToRender` = icon for `https:` and `null` for `http:`; POST to the same URL with the query kept, body exactly `{"account":"<address>"}`, `Content-Type` + `Accept` JSON; `message` passed through; extra fields (`redirect` included) ignored.
- [x] T013 [P] [US1] Write failing cases in NEW `packages/shared/src/blockchain/solana/transaction-request-checks.test.ts` (keypairs generated inside the test, kit-built transactions, `isBlockhashValid` mocked true): a sponsored legacy and a sponsored v0 transaction pass `prepareMerchantTransaction`; the result's `wire` equals the input bytes, the sponsor signature is byte-identical, `sponsored: true`, `feePayer` = sponsor, `signer` = user, `lifetime` = the merchant's blockhash; `getLatestBlockhash` is never called.
- [x] T014 [P] [US1] Write failing cases in NEW `packages/shared/src/utils/dapp-transaction-display.requester.test.ts`: `requester` sets the identity (replacing the requesting-site row); `message` adds a plain-text "Message" row shown in full; a `feePayer` other than the signing account turns the fee row into `solanaPay.feePaidBy` with the shortened address; with none of the three inputs the output deep-equals today's for the same fixture (MWA unchanged).
- [x] T015 [P] [US1] Write failing cases in NEW `packages/shared/src/core/broadcast/solana-received.test.ts` for `sendReceivedSolanaTransaction`: the sent bytes equal the received bytes plus the user's signature in the user's slot only, the sponsor signature byte-identical (legacy and v0); lifetime untouched and `getLatestBlockhash` never called; `confirmSolanaSignature` gets `lastValidBlockHeight = getBlockHeight() + 150`; active signer ≠ `signer` → `solanaPay.errors.accountChanged` and nothing sent; `isBlockhashValid` false → `solanaPay.errors.expired` and nothing signed; an unknown outcome throws `SolanaOutcomeUnknownError` as the existing path does.
- [x] T016 [P] [US1] Write failing cases in NEW `packages/shared/src/core/signing/received.test.ts`: `signProposal` routes a `ReceivedTransactionProposal` to `sendReceivedSolanaTransaction(account, transaction, signer)` and a `TransactionProposal` to `signAndSendSolanaTransaction` with `{ feePayer, ...expect }` exactly as today.
- [x] T017 [P] [US1] Write failing cases in NEW `packages/shared/src/core/confirmation/received.test.tsx`: `requestSignature` (the Powerup door) rejects any proposal carrying `source` with `transaction.errors.proposalKind`, also when cast; `useRequestReceivedSignature` parks the proposal, one at a time, calls `requireBackup` before signing and signs nothing when it fails (FR-018), signs through the received route, shows the receipt and resolves with the signature; cancel rejects with `SignatureRequestCancelledError` and signs nothing.
- [x] T018 [P] [US1] Add failing fixtures to `packages/shared/src/powerups/boundary.test.ts`: from a Powerup, `import { useRequestReceivedSignature } from '../core/confirmation/received'` and `import { useSolanaPayTransactionRequest } from '../hooks/useSolanaPayTransactionRequest'` both raise `no-restricted-imports`; the existing allowed import of `requestSignature` stays quiet.
- [ ] T019 [P] [US1] Write failing happy-path cases in NEW `packages/shared/src/hooks/useSolanaPayTransactionRequest.test.tsx` (mocked HTTP module, RPC and `useRequestReceivedSignature`): `start(link)` goes `loadingDetails` → `loadingTransaction` → preparing, with the merchant (domain at once, label and icon after GET) exposed for the sheet; the received proposal is requested only after `previewSolanaApprovalEffects` resolved; it carries `transaction` = prepared `wire`, `signer` = POSTed address, `networkId`, and a `display` built by `dappTransactionDisplay` with `requester`, `message`, `feePayer`, title `solanaPay.reviewTitle`, pending `solanaPay.paying`, receipt `solanaPay.receiptTitle`, `requiresHold` from `dappTransactionGate`; cancel on the review → `idle`, nothing signed; receipt dismissed → `done`.

### Shared implementation (US1)

- [x] T020 [US1] Implement `fetchMerchantDetails` and `fetchMerchantTransaction` (request shape, JSON parsing, field checks for the happy path) in `packages/shared/src/blockchain/solana/transaction-request.ts`. Depends on T012.
- [x] T021 [US1] Implement `prepareMerchantTransaction` (decode via `getTransactionDecoder` + `buildTransactionFromEncodedMessage` from `packages/shared/src/utils/dapp-approval.ts`, signed-case pass-through, `isBlockhashValid`) and export `assertReceivedTransactionSignable` in NEW `packages/shared/src/blockchain/solana/transaction-request-checks.ts`; export both from `packages/shared/src/blockchain/solana/index.ts`. Depends on T013.
- [x] T022 [P] [US1] Add the optional `requester`, `message`, `feePayer` inputs to `DAppTransactionDisplayInput` / `dappTransactionDisplay` in `packages/shared/src/utils/dapp-transaction-display.ts`. Depends on T014.

### Core signing path (US1) — owner-approved change, its own commit

- [x] T023 [US1] Add `sendReceivedSolanaTransaction` to `packages/shared/src/core/broadcast/solana.ts` (steps 1–6 of contracts/received-proposal.md, using `signTransactionWith` from `packages/shared/src/blockchain/solana/signing.ts` and `sendExpectingOutcome` / `confirmSolanaSignature` from `packages/shared/src/blockchain/solana/confirm.ts`); `signAndSendSolanaTransaction` is not touched. Depends on T015, T021.
- [x] T024 [US1] Route by proposal kind in `signProposal` (`packages/shared/src/core/signing/index.ts`); `SignProposalFn` accepts both kinds. Depends on T016, T023.
- [x] T025 [US1] In `packages/shared/src/core/confirmation/SignatureRequestContext.tsx` park either kind, make `requestSignature` reject a proposal with `source` (`transaction.errors.proposalKind`), and add the received entry in NEW `packages/shared/src/core/confirmation/received.ts` (`useRequestReceivedSignature`). Do NOT re-export `useRequestReceivedSignature` from `SignatureRequestContext.tsx`, `packages/shared/src/core/confirmation/index.ts` or any barrel: Powerups import `../../core/confirmation/SignatureRequestContext` and the barrel, so a re-export would bypass the lint pattern. Depends on T017, T024.
- [x] T026 [US1] Add `'**/core/confirmation/received'` and `'**/hooks/useSolanaPayTransactionRequest'` to the restricted patterns of the Powerups block in `eslint.config.js` (lines ~222–244). Depends on T018.
- [x] T027 [US1] Core checkpoint: run `pnpm turbo run typecheck lint test --filter=@salmon/shared`; every frozen file of T002 passes unchanged (`git diff --exit-code 7894953d -- <frozen list>`); T015–T018 pass. Commit only the core files and their new tests as `feat(core): received transaction proposals for Solana Pay (DEV-209)`.

### Flow hook (US1)

- [ ] T028 [US1] Implement NEW `packages/shared/src/hooks/useSolanaPayTransactionRequest.ts` (state machine of data-model.md §MerchantPaymentState, happy path; builds the `DAppSignAndSendTransactionRequest` from the prepared bytes and calls `loadSolanaTransactionApprovalDetails`, `previewSolanaApprovalEffects`, `dappTransactionGate`, then `useRequestReceivedSignature`) and export it from `packages/shared/src/hooks/index.ts`. Depends on T019, T020, T021, T022, T025.

### Twins: render only (US1)

- [ ] T029 [P] [US1] DOM confirmation in `packages/ui/src/components/TransactionConfirmation/`: identity row from `requester` in `TransactionConfirmation.tsx`, `requiresHold` through the kit `HoldToApproveButton` and `confirmDisabled` in `ConfirmationButtons.tsx`, props in `types.ts`; `ConfirmationHost.tsx` forwards `display.requester` / `requiresHold` / `confirmDisabled`. Tests first in `TransactionConfirmation.test.tsx` and `ConfirmationHost.test.tsx`: without `requester` the screen renders as today; held confirm; disabled confirm. Depends on T010, T011.
- [ ] T030 [P] [US1] Mobile confirmation in `apps/mobile/src/components/TransactionConfirmation/`: identity row from `requester` in `TransactionConfirmation.tsx` (icon through `expo-image`, `https:` only, globe placeholder on failure) and `types.ts`; `ConfirmationHost.tsx` forwards `requester` / `requiresHold` / `confirmDisabled`. Tests first in `TransactionConfirmation.test.tsx` and `ConfirmationHost.test.tsx`. Depends on T010, T011.
- [ ] T031 [P] [US1] DOM sheet NEW `packages/ui/src/components/SolanaPayRequestSheet/` (`SolanaPayRequestSheet.tsx`, `types.ts`, `index.ts`, `SolanaPayRequestSheet.test.tsx`) on `BottomSheetContainer`: identity row (`<img referrerPolicy="no-referrer" alt="">`, `https:` only, placeholder on error), `contacting` / `preparing` status with the kit spinner, Close; stable `data-testid`s; export from `packages/ui/src/components/index.ts`. Test first: domain before label, label/icon after, `http:` icon not loaded. Depends on T011.
- [ ] T032 [P] [US1] Mobile sheet NEW `apps/mobile/src/components/SolanaPayRequestSheet/` (`SolanaPayRequestSheet.tsx`, `types.ts`, `index.ts`, `SolanaPayRequestSheet.test.tsx`) on `apps/mobile/src/components/BottomSheetContainer`, `expo-image` for the icon, same `testID`s as the DOM twin; export from `apps/mobile/src/components/index.ts`. Same tests as T031. Depends on T011.
- [ ] T033 [US1] DOM entry: new `onTransactionRequest` prop on `packages/ui/src/components/SendPage/StepRecipient.tsx`; `packages/ui/src/components/SendPage/SendPage.tsx` (and `types.ts`) runs `useSolanaPayTransactionRequest`, shows the sheet, closes the Send flow through `onBack` after the receipt, returns to the recipient step with the field cleared on cancel. In the NFT send (no handler) any payment link — transfer or transaction request — shows `send.request.errors.paymentLinkNotHere`. Tests first in NEW `packages/ui/src/components/SendPage/StepRecipient.test.tsx` (transaction request → handler with the link; NFT → `paymentLinkNotHere`; transfer request unchanged). Depends on T008, T028, T029, T031.
- [ ] T034 [US1] Mobile entry: `acceptTransactionRequests` prop on `apps/mobile/src/components/QRScanner/QRScanner.tsx` (+ `types.ts`); without it a transaction-request code shows `qrScanner.paymentLinkOnlyInSend` (callers `apps/mobile/src/components/AddressForm/AddressForm.tsx` and `apps/mobile/app/(app)/nft/[id]/send.tsx` pass nothing); `apps/mobile/app/(app)/send/index.tsx` passes the prop and wires scan and paste → hook → sheet → core review → `router.replace('/')` after the receipt. Tests first: cases in `apps/mobile/src/components/QRScanner/QRScanner.test.tsx` and NEW `apps/mobile/__tests__/app/send-solana-pay.test.tsx` (scan and paste open the sheet; transfer request still opens the locked review). Depends on T008, T028, T030, T032.
- [ ] T035 [US1] Create NEW `scripts/devnet-solana-pay-merchant.mjs` (dev-only, imported by nothing): `node:http` on `PORT` (default 8787), `Access-Control-Allow-Origin: *` and `OPTIONS` on every route, a request log (method, path, `Origin`, `User-Agent`, POST body), devnet RPC fixed, prints each route's `solana:` link and a terminal QR (root-hoisted `qrcode`, `type: 'terminal'`) for `PUBLIC_URL`; routes `/pay/sponsored` (SOL transfer user→`MERCHANT_ADDR` + memo, SVG icon, sponsor = wallet B from `SALMON_TEST_SEED_B`, or Kora `signTransaction` via JSON-RPC `fetch` when `KORA_RPC_URL` is set) and `/pay/sponsored-v0`. Imports only `@solana/kit`, `@solana-program/system`, `@solana-program/memo`, `qrcode`; never prints a key. Run `pnpm -s check:no-secrets`.
- [ ] T036 [US1] Manual check, quickstart §3 steps 1–3 on devnet (mobile scan, extension paste) with `/pay/sponsored` and `/pay/sponsored-v0`, plus step 2 (phrase gate first); note results for T069.

**Checkpoint**: US1 works end to end on both apps on devnet.

---

## Phase 4: User Story 2 — refuse a transaction that cannot be trusted (P1)

**Goal**: every unsafe or broken answer stops with its own message before any confirm button; nothing is signed.

**Independent test**: each failure route of quickstart §2; server log shows no second POST unless Retry was pressed.

### Tests first (US2)

- [ ] T037 [P] [US2] Add failing failure vectors to `packages/shared/src/blockchain/solana/transaction-request.test.ts`: GET 404 → `merchantError`; GET non-JSON → `unreadable`; GET `label` empty → `unreadable`; icon relative / `.gif` / `data:` → `malformedIcon` and no POST; `Content-Length` > 64 KiB and a streamed body > 64 KiB → `unreadable`; no answer in 10 s → `unreachable` (fake timers); `fetch` rejecting (network error or CORS refusal, indistinguishable) → `unreachable`; `response.url` off `https:` or on another host → `unreachable`; POST 500 `{"message": <120 chars>}` → `merchantError` with the first 80 characters; POST 200 without `transaction` or with a non-string one → `unreadable`.
- [ ] T038 [P] [US2] Add failing refusals to `packages/shared/src/blockchain/solana/transaction-request-checks.test.ts`: bad base64, undecodable bytes, oversize or unknown version → `malformedTransaction`; one flipped byte in the sponsor signature → `invalidSignature`; sponsor slot empty while another signature is present → `missingSignature`; user not a signer → `notForThisAccount`; user slot already filled → `alreadySigned`; `isBlockhashValid` false (expired or other network) → `staleOrWrongNetwork`; durable-nonce lifetime → `staleOrWrongNetwork`; `assertReceivedTransactionSignable` throws the same reasons on the same bytes.
- [ ] T039 [P] [US2] Add failing cases to `packages/shared/src/hooks/useSolanaPayTransactionRequest.test.tsx`: each refusal ends in `failed(reason)` and never calls the received entry; once the GET succeeded the failure keeps the merchant; Retry is offered for `unreachable`, `merchantError`, `unreadable` and repeats only the failed request; never offered for malformed or unsafe reasons; a preview that would fail or is undetermined still opens the review with the dApp warning and `requiresHold` (same rule as `dappTransactionGate`).

### Implementation (US2)

- [ ] T040 [US2] Transport hardening in `packages/shared/src/blockchain/solana/transaction-request.ts`: 10 s `AbortController` timeout per request (the pattern in `packages/shared/src/hooks/useAddressValidation.ts`), 64 KiB cap (header check + counted `body.getReader()` where present, else `text()` + length), `response.url` host/protocol check, error-body `message` truncated to 80, every failure mapped to its `TransactionRequestError`. Depends on T037.
- [ ] T041 [US2] Implement each refusal in `packages/shared/src/blockchain/solana/transaction-request-checks.ts` (Ed25519 `verifySignature` with `getPublicKeyFromAddress`, signer slots, empty/filled slots, lifetime check). Re-run T015's file: the core path now refuses through the same function. Depends on T038.
- [ ] T042 [US2] Failure, retry and merchant-kept states in `packages/shared/src/hooks/useSolanaPayTransactionRequest.ts`. Depends on T039, T040, T041.
- [ ] T043 [P] [US2] Failed phase in the DOM sheet `packages/ui/src/components/SolanaPayRequestSheet/SolanaPayRequestSheet.tsx`: `WarningNotice` with the reason, "The merchant says: …" as plain text, Retry only when `onRetry` is given. Tests first in `SolanaPayRequestSheet.test.tsx` (markup in `merchantMessage` renders as text). Depends on T031.
- [ ] T044 [P] [US2] Same failed phase in `apps/mobile/src/components/SolanaPayRequestSheet/SolanaPayRequestSheet.tsx` with tests in its `SolanaPayRequestSheet.test.tsx`. Depends on T032.
- [ ] T045 [US2] Add the failure routes to `scripts/devnet-solana-pay-merchant.mjs`: `/pay/http-error`, `/pay/not-json`, `/pay/bad-icon`, `/pay/bad-signature`, `/pay/missing-sponsor`, `/pay/not-for-you`, `/pay/fails`, `/pay/slow`, `/pay/redirect-http`, `/pay/huge`, the printed-only `solana:http://…` link, and `/pay/no-cors` (sponsored, but no CORS headers and no `OPTIONS` answer) for owner decision 2.
- [ ] T046 [US2] Manual check, quickstart §3 step 4 for every failure route on both apps; `/pay/no-cors` pays on mobile and shows `solanaPay.errors.unreachable` on the extension; note results for T069.

**Checkpoint**: US1 + US2 = MVP. Every case of SC-003 refused with its own message, nothing signed.

---

## Phase 5: User Story 3 — pay a merchant without a fee sponsor (P2)

**Goal**: an unsigned merchant transaction becomes the user's to pay: fee payer and blockhash set, fee shown as the user's cost.

**Independent test**: `/pay/unsigned` and `/pay/unsigned-broke`.

- [ ] T047 [P] [US3] Add failing unsigned cases to `packages/shared/src/blockchain/solana/transaction-request-checks.test.ts`: fee payer already the user → only the lifetime changes, every other byte equal; another fee payer, legacy and v0 with an address lookup table (mocked lookup fetch) → fee payer = user and lifetime = latest blockhash, instructions unchanged; a second signer left after preparation → `missingSignature`; `sponsored: false`.
- [ ] T048 [P] [US3] Add failing cases to `packages/shared/src/hooks/useSolanaPayTransactionRequest.test.tsx`: user is fee payer → the fee row is a cost to the user; SOL balance below fee + SOL the preview shows leaving → `display.confirmDisabled` with `solanaPay.notEnoughSolForFee`.
- [ ] T049 [US3] Implement the unsigned branch of `prepareMerchantTransaction` in `packages/shared/src/blockchain/solana/transaction-request-checks.ts` (compiled-message lifetime patch as `packages/shared/src/core/broadcast/solana.ts` lines ~103–107 do; otherwise `decompileTransactionMessageFetchingLookupTables` → `setTransactionMessageFeePayer` → `setTransactionMessageLifetimeUsingBlockhash` → `compileTransaction`). Depends on T047.
- [ ] T050 [US3] Implement the fee and balance rule in `packages/shared/src/hooks/useSolanaPayTransactionRequest.ts`. Depends on T048, T049.
- [ ] T051 [US3] Add `/pay/unsigned` and `/pay/unsigned-broke` to `scripts/devnet-solana-pay-merchant.mjs`; manual check on both apps; note results for T069.

---

## Phase 6: User Story 4 — recover when the merchant's transaction goes stale (P2)

**Goal**: an expired blockhash at confirm triggers a refetch; a changed review asks again; a failed refetch says "expired"; stale bytes are never signed.

**Independent test**: open `/pay/sponsored`, wait > 90 s, confirm → refetch and land; `/pay/stale`.

- [ ] T052 [P] [US4] Write failing cases in NEW `packages/shared/src/core/confirmation/useSignatureRequestHost.test.tsx`: `isStale` true + refreshed `display` deep-equal → one press signs once; changed display → no signature, note `solanaPay.refreshed`; refresh throws → the review keeps the error (e.g. `solanaPay.errors.expired`), no signature; a proposal without `isStale` behaves exactly as today (the `expiresAt` path untouched).
- [ ] T053 [P] [US4] Add failing cases to `packages/shared/src/hooks/useSolanaPayTransactionRequest.test.tsx`: the proposal's `isStale` asks `isBlockhashValid` on the active RPC; `refresh` repeats the POST (not the GET) → check → preview against the same link and account and returns a new proposal; a failed refresh throws `expired`.
- [ ] T054 [US4] Implement the stale rule in `confirmOrRefresh` of `packages/shared/src/core/confirmation/useSignatureRequestHost.ts` and the received-kind `refresh` in `packages/shared/src/core/confirmation/SignatureRequestContext.tsx`; re-run the core checkpoint of T027 (frozen files unchanged and green). Depends on T052.
- [ ] T055 [US4] Implement `isStale` / `refresh` in `packages/shared/src/hooks/useSolanaPayTransactionRequest.ts`. Depends on T053, T054.
- [ ] T056 [US4] Add `/pay/stale` (first POST ~2-minute-old blockhash, later POSTs fresh) to `scripts/devnet-solana-pay-merchant.mjs`; manual check on both apps; note results for T069.

---

## Phase 7: User Story 5 — accounts that cannot sign stay out (P3)

**Independent test**: watch-only account opens a link → refusal, server log shows no request.

- [ ] T057 [US5] Add failing cases to `packages/shared/src/hooks/useSolanaPayTransactionRequest.test.tsx`: a watch-only account (`isSignableAccount` false) → `refused('watchOnly')` and the mocked `fetch` is never called; a non-Solana active chain never reaches the hook (`wrongChain` from `classifyScanPayload`).
- [ ] T058 [US5] Implement the watch-only refusal before any request in `packages/shared/src/hooks/useSolanaPayTransactionRequest.ts` using `isSignableAccount` from `packages/shared/src/utils/account.ts`. Depends on T057.
- [ ] T059 [US5] Manual check, quickstart §3 step 5 (and step 6, account switch mid-review → `accountChanged`); note results for T069.

---

## Phase 8: Polish and the "after" half

- [ ] T060 [P] Coverage ratchet: `pnpm test:coverage`; raise `thresholds` in `packages/shared` / `packages/ui` vitest configs and `coverageThreshold` in the `apps/mobile` jest config where coverage went up.
- [ ] T061 [P] Parity: `pnpm check:parity:report`; `CROSS_PLATFORM_CLONE_LINES_MAX` in `scripts/check-dom-parity.mjs` stays at or below its baseline value; if the sheet twins push it up, move the shared part into `packages/shared` rather than raise it.
- [ ] T062 [P] `pnpm --filter @salmon/extension build && pnpm check:manifest`: no permission change (owner decision 2).
- [ ] T063 [P] e2e selectors: `node scripts/check-e2e-selectors.mjs` with the new sheet and identity-row test ids traced through `apps/mobile/.maestro` and the extension Playwright suite (no new e2e flow required).
- [ ] T064 Remove `send.request.errors.transactionRequest` from `packages/shared/src/locales/en/translation.json` and `packages/shared/src/locales/es/translation.json` after confirming no reference is left (`grep -rn "errors.transactionRequest" packages apps`); `node scripts/check-i18n.mjs`.
- [ ] T065 Security review of the diff (`typescript-reviewer` + `security-reviewer`, ask-pattern) focused on the threats table of plan.md; fix findings with a test each.
- [ ] T066 `npx prettier --check .` and `pnpm -s check:no-secrets` clean.
- [ ] T067 Run quickstart §2 Kora mode once (real Kora node, `KORA_RPC_URL`): confirm Kora signs a transaction whose user slot is empty and the payment lands; record whether `expo-image` drew the SVG icon on Android and how RN `fetch` handled `/pay/redirect-http` (the three items plan.md marks unverified).
- [ ] T068 Final verification, the owner's "after" half: run exactly the T001 suite and the T002 inventory again; write NEW `specs/043-solana-pay-transaction-request/verification/final.md` with the same fields plus the comparison: (a) every gate green; (b) every test line in `baseline-tests-*.txt` exists in the new inventory and passes — the only allowed difference is the scan-payload assertion replaced in T007, which keeps its test name and passes; (c) `git diff --exit-code 7894953d -- <frozen list of T002>` is empty and those tests pass; (d) per-package counts before → after. Any failure here blocks the PR.
- [ ] T069 Manual quickstart verification on devnet, both apps: §3 steps 1–7 (incl. SC-002 timing scan → review < 5 s and scan → confirmed < 30 s, and the spec 033 transfer-request QR still opening the locked Send review, SC-006); record results in `specs/043-solana-pay-transaction-request/verification/final.md`. Commit `feat: pay Solana Pay transaction requests (DEV-209)` with the verification files.

---

## Dependencies

- Phase 1 (T001–T002) before any source change.
- Phase 2: T003→T004; T005→T006; (T004, T006)→T007→T008; T009, T010, T011 independent. Phase 2 blocks every story.
- US1: tests T012–T019 first (parallel); T020←T012; T021←T013; T022←T014; T023←(T015, T021); T024←(T016, T023); T025←(T017, T024); T026←T018; T027 after T023–T026; T028←(T019–T022, T025); T029–T032 after Phase 2 (parallel); T033←(T008, T028, T029, T031); T034←(T008, T028, T030, T032); T035 any time after Phase 2; T036 last.
- US2 builds on US1's modules (same files): T040←(T020, T037); T041←(T021, T038); T042←(T028, T039–T041); T043←T031; T044←T032; T045←T035.
- US3 ← US1 (T021, T028). US4 ← US1 (T025, T028). US5 ← US1 (T028). US3, US4, US5 can run in any order after US2; they touch the same hook file, so run them one at a time.
- Phase 8 after every story; T068 and T069 last.

## Parallel examples

- Phase 2: T003, T005, T009, T010, T011 together.
- US1 tests: T012, T013, T014, T015, T016, T017, T018, T019 together (all different files).
- US1 twins: T029, T030, T031, T032 together.
- US2 tests: T037, T038, T039 together; T043 with T044.
- Polish: T060, T061, T062, T063 together.

## Implementation strategy

1. Baseline (Phase 1), then Phase 2.
2. MVP = US1 + US2 (both P1): a sponsored payment works and every unsafe answer is refused. The core signing change lands in its own commit (T027) with the frozen signing tests unchanged and green.
3. US3, then US4, then US5, each verified on devnet as it lands.
4. Polish, then T068 (before/after comparison) and T069 (manual quickstart) before the PR.
