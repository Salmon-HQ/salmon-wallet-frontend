# Tasks: Send builds v1 transactions where the network runs them

**Input**: `spec.md`, `plan.md`, `research.md` in this directory.

**Tests**: required by the spec (FR-006, SC-002) and the constitution (V): unit pins before the change, live assertion after.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Foundational

- [x] T001 [US2] Pin the table in `packages/shared/src/blockchain/solana/networks.test.ts`: `SOLANA_TRANSACTION_VERSION['solana-devnet'] === 1`, `['solana-mainnet'] === 0`, and `transactionVersionFor` reads it. Fails until T002.
- [x] T002 [US1] Add `SOLANA_TRANSACTION_VERSION` and `transactionVersionFor` to `packages/shared/src/blockchain/solana/networks.ts`; export both from `packages/shared/src/blockchain/solana/index.ts` (named).

## Phase 2: User Story 1 — a devnet send lands as v1 (P1)

- [x] T003 [US1] In `packages/shared/src/blockchain/solana/solana-transfer.test.ts`, add cases: `createSolTransaction(..., { version: 1 })` yields a message with `version === 1`; same for `createSplTransaction`; `estimateFee` with `version: 1` compiles a v1 message. Fails until T004.
- [x] T004 [US1] In `packages/shared/src/blockchain/solana/transfer.ts`: `buildTransactionMessage(rpc, signer, instructions, version)`; `TransferOptions.version?: 0 | 1` (default 0); thread through `createTransfer`, `createSolTransaction`, `createSplTransaction`, `estimateFee`; widen `TransferTransactionMessage` to the union.
- [x] T005 [US1] In `packages/shared/src/blockchain/solana/SolanaAccount.ts`, `transfer` and `estimateTransferFee` pass `version: transactionVersionFor(this.network.networkId)` inside `opts`.

## Phase 3: User Story 2 — mainnet unchanged before activation (P1)

- [x] T006 [US2] In `solana-transfer.test.ts`, pin that omitting `version` and passing `version: 0` both yield `version === 0` (every pre-existing case stays untouched).
- [x] T007 [US2] In `packages/shared/src/blockchain/solana/SolanaAccount.test.ts`, pin that an account on `solana-mainnet` calls `createTransfer` with `version: 0` and one on `solana-devnet` with `version: 1`.

## Phase 4: User Story 3 — the flip is one line (P2)

- [x] T008 [US3] Comment on the table names the flip and the check to make first (`getFeatureActivation` / a v1 send on the cluster), and points at T001 as the test that moves with it.

## Phase 5: Verification

- [ ] T009 [US1] (code done; live run pending owner go) Extend `packages/shared/src/blockchain/solana/transfer.devnet.test.ts`: after confirmation, `getTransaction(sig, { maxSupportedTransactionVersion: 1 })` and assert `transaction.message.version === 1` when built with `version: 1`. Run it once with the QA devnet key (`RUN_DEVNET=1`); record the signature in the PR.
- [x] T010 `pnpm turbo run typecheck lint test:coverage --filter=@salmon/shared`; `pnpm check:no-secrets`; `pnpm check:parity`; `pnpm format:check`.
- [ ] T011 PR `feat(send): build v1 transactions where the network runs them` against `main`, linked to DEV-47; owner tests a devnet send on the extension, checks Activity, then deploys.

## Follow-up (not in this PR)

- [ ] F001 On mainnet activation: confirm on the cluster, flip `'solana-mainnet': 1` in `networks.ts`, update T001's pin, ship. One-value diff.
- [ ] F002 DEV-46: answer the Foundation with the first extension release that carries v1 (`supportedTransactionVersions` already lists `1` since PR #93; not in any `extension/v*` tag yet as of 2026-09-10).

## Dependencies

T001 → T002 → T003 → T004 → T005 → T006/T007 → T008 → T009 → T010 → T011. T006 and T007 are parallel.
