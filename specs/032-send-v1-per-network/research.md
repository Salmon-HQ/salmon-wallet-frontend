# Research: v1 transactions from the wallet's own Send

Date: 2026-09-10. Everything below was read from the installed packages and the
repo, not from memory.

## Kit surface for v1 (installed 8.2.0)

- `createTransactionMessage({ version })` is generic over `TransactionVersion = 'legacy' | 0 | 1` (`create-transaction-message.d.ts`).
- A `V1TransactionMessage` is `BaseTransactionMessage<1, InstructionWithoutLookupTables> & { config?: V1TransactionConfig }` (`transaction-message.d.ts`). Lookup tables are excluded at the type level. `config` is optional in the type but not in practice: kit's own doc on `V1TransactionConfig` says a v1 that leaves `computeUnitLimit` or `loadedAccountsDataSizeLimit` unset "is budgeted **zero**" rather than getting v0's defaults, and the first live run confirmed it (preflight: `Transaction exceeded max loaded accounts data size cap`, kit code 7050032). `setTransactionMessageConfig` writes the header. Send sets the v0-equivalent budget: 200k CU × instructions (cap 1.4M), 64 MiB data.
- `compileTransactionMessage` has a v1 overload (`compile/v1/message.d.ts`) producing `V1CompiledTransactionMessage` with `configMask`/`configValues`.
- `@solana/transactions` picks the wire layout by version: `version === 1 ? "messageFirst" : "signaturesFirst"` and a `V1_TRANSACTION_SIZE_LIMIT = 4096` (`dist/index.node.mjs` lines 45, 410, 456).
- `signTransactionMessageWithSigners`, `getBase64EncodedWireTransaction`, `rpc.sendTransaction(..., { encoding: 'base64' })` are the same calls for every version. The wallet already sends dApp-provided v1 through `prepared-transactions.ts` with them.

**Decision**: no new dependency, no version bump. Pass `version` into the one builder; the v1 branch also writes the resource budget.

## Repo surface

- `transfer.ts:161` is the only `createTransactionMessage` call in the repo outside tests (`grep -rln createTransactionMessage packages apps` → `transfer.ts`, `SolanaAccount.ts` only imports the transfer API).
- `estimateFee` (transfer.ts ~403) builds through `createSolTransaction` / `createSplTransaction`, compiles, and calls `rpc.getFeeForMessage`. Same builder → same version as the send.
- `SolanaAccount` holds `network: SolanaNetwork` (`SolanaAccount.ts:38`) and is the only consumer of `createTransfer` / `estimateFee`.
- `useAvailableNetworks.ts` mutates `SOLANA_NETWORKS[id].config.nodeUrl` / `wsUrl` in place from the backend and copies nothing else, so a field on `SolanaNetwork` would survive — but a table keyed by id is simpler and does not touch the `SolanaNetwork` contract, which the backend also shapes.
- Swap (`swap.ts`) receives a serialized transaction from Jupiter; not touched. dApp path (`dapp-approval.ts`, `prepared-transactions.ts`) already decodes/encodes v1; not touched.

**Decision**: `Record<SolanaNetworkId, 0 | 1>` in `networks.ts`; `SolanaAccount` reads it.

## Cluster status

- Devnet: v1 active. Proven by `packages/shared/src/utils/dapp-approval.live.test.ts` ("previews, signs, sends and confirms a >1232-byte v1 transaction", `createTransactionMessage({ version: 1 })` at line 92), part of DEV-42.
- Mainnet: not active as of this writing; owner reports activation announced for 2026-09-15. A v1 sent before activation fails at preflight with `SOLANA_ERROR__TRANSACTION__VERSION_NUMBER_NOT_SUPPORTED`, which `transaction-errors.ts` maps to `transaction.errors.unsupportedVersion` (PR #118).

**Decision**: mainnet stays 0 in the table. The flip is a follow-up task in `tasks.md`, to be done after confirming activation on the cluster, not on the announced date alone.

## Unknowns closed

- _Does `getFeeForMessage` accept a v1 message?_ The RPC method decodes a versioned message; agave with SIMD-0296 handles v1. Verified empirically by the live suite (T009), not assumed.
- _Does the backend's history parser read v1?_ Out of scope here; owner verifies Activity on devnet after the extension deploy (spec, Edge Cases).
