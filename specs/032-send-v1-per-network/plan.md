# Implementation Plan: Send builds v1 transactions where the network runs them

**Branch**: `feat/dev-47-send-v1-per-network` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/032-send-v1-per-network/spec.md`

## Summary

`buildTransactionMessage` in `packages/shared/src/blockchain/solana/transfer.ts` hardcodes `version: 0`. It becomes a function of the network: a table `SOLANA_TRANSACTION_VERSION: Record<SolanaNetworkId, 0 | 1>` next to `SOLANA_NETWORKS` (devnet 1, mainnet 0), read once in `SolanaAccount.transfer` / `estimateTransferFee` and passed down as `opts.version`. SOL, SPL and the fee estimate share the builder, so they share the version. Nothing else moves.

## Technical Context

**Language/Version**: TypeScript 5 (strict), `@solana/kit` 8.2 (`@solana/transaction-messages` 8.2, `@solana/transactions` 8.2)

**Primary Dependencies**: kit's `createTransactionMessage({ version })` accepts `'legacy' | 0 | 1`; `compileTransaction` routes v1 to the v1 compiler (4096-byte limit, `messageFirst` wire layout); `signTransactionMessageWithSigners` and `getBase64EncodedWireTransaction` are version-agnostic. Verified in `node_modules/@solana/transaction-messages/dist/types/{transaction-message,compile/v1/message}.d.ts` and `@solana/transactions/dist/index.node.mjs` (`V1_TRANSACTION_SIZE_LIMIT = 4096`).

**Storage**: N/A

**Testing**: Vitest in `packages/shared` (unit, mocked RPC); opt-in live devnet suite `transfer.devnet.test.ts` (`RUN_DEVNET=1` + `DEVNET_TEST_SECRET_KEY`), key per `docs/QA-RUNBOOK.md`.

**Target Platform**: both apps through `packages/shared`; no app code changes.

**Project Type**: monorepo shared package.

**Performance Goals**: none new; a v1 message for a transfer is the same size class as v0.

**Constraints**: v1 messages carry no address-lookup-table instructions (kit types enforce `InstructionWithoutLookupTables` for `version: 1`); the transfer never used tables. A v1 header must carry `computeUnitLimit` and `loadedAccountsDataSizeLimit` (zero budget otherwise); Send writes the v0-equivalent budget via `v1ResourceBudget`. No priority fee. `getFeeForMessage` accepts the v1 message on the public devnet RPC: proven by the live suite.

**Scale/Scope**: 4 source files, 3 test files.

## Constitution Check

| Principle                 | Status                                                                                                                                                                                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Boundaries             | Pass: all changes in `packages/shared/src/blockchain/solana`; `types/blockchain.ts` gains nothing.                                                                                                                                                                      |
| II. Consumers             | Pass: `createTransfer`, `estimateFee`, `createSolTransaction`, `createSplTransaction` are consumed by `SolanaAccount.ts` and their own tests only (`grep -rn` 2026-09-10). Signatures extend with an optional `version` in the existing `opts`; no export path changes. |
| III. Wallet safety        | Transaction-building path. Owner sign-off 2026-09-10 ("Dale, arrancá con el gate por red"). No key material, no storage, no crypto touched.                                                                                                                             |
| IV. i18n                  | Pass: no copy.                                                                                                                                                                                                                                                          |
| V. Tests first            | Unit pins for the table and for `createSolTransaction` / `createSplTransaction` version per network; live suite asserts the confirmed transaction's version.                                                                                                            |
| VI. Ask rather than guess | Mainnet flip date is an assumption recorded in the spec; the flip is a follow-up, done by hand after checking the cluster.                                                                                                                                              |

## Project Structure

### Documentation (this feature)

```text
specs/032-send-v1-per-network/
├── spec.md
├── plan.md              # this file
├── research.md          # kit v1 surface, RPC behaviour, activation status
└── tasks.md
```

### Source Code (repository root)

```text
packages/shared/src/blockchain/solana/
├── networks.ts                  # + SOLANA_TRANSACTION_VERSION table + transactionVersionFor(networkId)
├── networks.test.ts             # + table pins (devnet 1, mainnet 0)
├── transfer.ts                  # buildTransactionMessage(rpc, signer, instructions, version); opts.version threads through createTransfer / estimateFee / createSolTransaction / createSplTransaction
├── solana-transfer.test.ts      # + version-per-network cases
├── transfer.devnet.test.ts      # + assert confirmed tx version === 1
└── SolanaAccount.ts             # transfer / estimateTransferFee pass transactionVersionFor(this.network.networkId)
packages/shared/src/blockchain/solana/index.ts   # export the table + helper (named)
```

**Structure Decision**: the table lives in `networks.ts` because it is a fact about a cluster, next to the cluster's other facts. `transfer.ts` stays ignorant of network ids: it takes a version. `SolanaAccount` is the one place that holds both the network and the signer, so it is where the two meet.

## Design

```ts
// networks.ts
/** The transaction version a cluster runs. Flip mainnet to 1 once SIMD-0296 is active there. */
export const SOLANA_TRANSACTION_VERSION: Record<SolanaNetworkId, 0 | 1> = {
  'solana-mainnet': 0,
  'solana-devnet': 1,
};
export const transactionVersionFor = (networkId: SolanaNetworkId) =>
  SOLANA_TRANSACTION_VERSION[networkId];
```

```ts
// transfer.ts
export type TransferTransactionVersion = 0 | 1;
interface TransferOptions { …; version?: TransferTransactionVersion }   // default 0
async function buildTransactionMessage(rpc, signer, instructions, version: TransferTransactionVersion) { … createTransactionMessage({ version }) … }
```

`TransferTransactionMessage` becomes the union of the two builder return types; `executeTransaction` and `estimateFee` compile whichever they get (kit's `compileTransaction` is overloaded on the message version).

Default `0` when `version` is omitted keeps every existing caller and test byte-identical in behaviour (FR-006).

## Complexity Tracking

None. No new abstraction beyond one record and one accessor.
