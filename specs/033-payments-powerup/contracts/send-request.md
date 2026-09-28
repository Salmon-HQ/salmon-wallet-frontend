# Contract: what Send gains

Core changes, all additive. Existing callers pass nothing new and behave as today.

## `packages/shared/src/utils/scan-payload.ts` (hoisted from `apps/mobile/src/components/QRScanner/scan-payload.ts`)

```ts
export type ScanClassification =
  | { kind: 'valid'; address: string; request?: TransferRequest }
  | { kind: 'invalidRequest'; reason: TransferRequestParseReason }
  | { kind: 'wrongChain' }
  | { kind: 'notAddress' };

export function classifyScanPayload(raw: string, activeChain: BlockchainType): ScanClassification;
```

The mobile file becomes `export * from '@salmon/shared/utils/scan-payload'` (or the barrel path the package exposes). `QRScanResult` gains `request?: TransferRequest`; the scanner surfaces `invalidRequest` with `t('send.request.errors.<reason>')` exactly as it surfaces `notAddress` today.

## `packages/shared/src/types/ui/send-sheet.ts`

```ts
export interface SendRequest {
  request: TransferRequest;
  token: SendToken;
  locked: { recipient: true; token: true; amount: boolean };
}
```

## `packages/shared/src/hooks/useSendFlowState.ts`

```ts
// added to the state
request: SendRequest | null;
// added to the actions
startFromRequest(request: TransferRequest, holdings: readonly SendToken[]):
  | { ok: true; next: 'review' | 'amount' }
  | { ok: false; reason: 'tokenNotHeld' | 'unknownToken' };
clearRequest(): void;
```

`startFromRequest` sets `recipient` (address; `name` = label when present), `token`, `amount` (when present), and `request`; returns `next: 'amount'` when the request had no amount. Callers navigate. Leaving Send clears `request`.

## `packages/shared/src/types/send.ts` and `types/blockchain.ts`

```ts
export interface SendTransactionParams {
  …existing;
  memo?: string;
  references?: readonly string[];
}
export interface SolanaTransferOptions {
  …existing;
  references?: readonly string[];
}
```

`useSendTransaction` forwards both into `account.transfer(to, tokenAddress, amount, { decimals, symbol, memo, references })`; non-Solana accounts ignore them.

## `packages/shared/src/blockchain/solana/transfer.ts` (HOLD — owner sign-off, constitution III)

```ts
export interface TransferOptions {
  …existing (simulate, version, memo, decimals);
  references?: readonly string[];
}
```

- SPL path: `references` appended to the transfer instruction (both `getTransferInstruction` and `getTransferCheckedWithFeeInstruction` outputs) as `{ address, role: AccountRole.READONLY }`, in order; `memo` unchanged (already immediately before the transfer).
- SOL path: `memo` now honoured (memo instruction immediately before the system transfer); `references` appended to the system transfer instruction the same way.
- Golden vectors: one new prepared-transaction vector per path with two references and a memo, asserting instruction order and account roles.

## Review screens (both twins)

When `request` is set:

- rows above the existing ones: `KeyValueRow label=t('send.request.requestedBy') value=label` (omitted when absent), `KeyValueRow label=t('send.request.for') value=message` (omitted when absent);
- the amount row is read-only (no edit affordance, no tap back to the amount step);
- balance short: the existing insufficient-funds notice + confirm disabled (no new block);
- the transfer call passes `memo: request.memo`, `references: request.references`.

## DOM paste entry (`packages/ui/src/components/SendPage/StepRecipient.tsx`)

A `TextInput mono placeholder=t('send.request.paste')` under the recipient input. On change, if `classifyScanPayload(value, 'solana')` yields `valid` with a `request`, call `startFromRequest`; on `invalidRequest`, show the field's `error` with the reason key. A bare address pasted there behaves as the recipient input does. (The `solana:` protocol handler is a follow-up, not in this lot.)

## Translation keys (core, `send.request.*`)

`paste`, `requestedBy`, `for`, `tokenNotHeld`, `errors.notSolanaPay`, `errors.transactionRequest`, `errors.recipient`, `errors.amount`, `errors.splToken`, `errors.reference`, `errors.memoTooLong`. English in this lot; Spanish from the owner.
