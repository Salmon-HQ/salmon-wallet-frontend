# Data model: Payments (spec 033)

All amounts cross boundaries as atomic-unit strings; display amounts are derived at render.

## TransferRequest (core, `blockchain/solana/transfer-request.ts`)

The parsed Solana Pay transfer request. Produced by `parseTransferRequest(uri)`, consumed by Send and by the Powerup's encoder tests.

| Field        | Type                      | Rule                                                                                     |
| ------------ | ------------------------- | ---------------------------------------------------------------------------------------- |
| `recipient`  | `string` (base58 address) | required; must validate as a Solana address                                              |
| `amount`     | `string \| undefined`     | decimal, user units, `^(0\|[1-9]\d*)(\.\d+)?$`, no exponent; absent ⇒ Send asks the user |
| `splToken`   | `string \| undefined`     | base58 mint; absent ⇒ native SOL                                                         |
| `references` | `readonly string[]`       | each base58 32-byte; order preserved; may be empty                                       |
| `label`      | `string \| undefined`     | URL-decoded UTF-8, trimmed                                                               |
| `message`    | `string \| undefined`     | URL-decoded UTF-8, trimmed                                                               |
| `memo`       | `string \| undefined`     | URL-decoded UTF-8; UTF-8 byte length ≤ `MEMO_MAX_BYTES`                                  |

Parse failure: `{ ok: false, reason: 'notSolanaPay' | 'transactionRequest' | 'recipient' | 'amount' | 'splToken' | 'reference' | 'memoTooLong' }`. Every reason has a translation key under `send.request.errors.*`.

`encodeTransferRequest(fields)` is the inverse and is what the Powerup writes; `encode(parse(x))` is stable for the fields present (test vector).

## PaymentRequest (Powerup, `powerups/payments/types.ts`)

What the receiver stores. Lives only on the device that created it.

| Field            | Type                               | Notes                                                                                  |
| ---------------- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| `id`             | `string`                           | `pr_` + 12 base58 chars of the reference; doubles as the memo (correlation for humans) |
| `accountId`      | `string`                           | the wallet account that asked                                                          |
| `networkId`      | `SolanaNetworkId`                  | `solana-mainnet` \| `solana-devnet`                                                    |
| `recipient`      | `string`                           | the account's address on that network                                                  |
| `mint`           | `string`                           | `USDC_MINT_BY_NETWORK[networkId]`                                                      |
| `decimals`       | `6`                                | from the token list at creation, stored so rendering needs no lookup                   |
| `symbol`         | `'USDC'`                           | stored for the same reason                                                             |
| `amountAtomic`   | `string`                           | integer string; `amountDisplay` is derived                                             |
| `note`           | `string`                           | may be empty; becomes `message`                                                        |
| `reference`      | `string`                           | fresh public key; only the public half exists                                          |
| `createdAt`      | `number` (ms epoch)                |                                                                                        |
| `expiresAt`      | `number` (ms epoch)                | `createdAt` + one of `EXPIRY_OPTIONS_MS` (1 h, 24 h, 7 d)                              |
| `status`         | `'pending' \| 'paid' \| 'expired'` | see transitions                                                                        |
| `settlement`     | `Settlement \| undefined`          | set once, with `status: 'paid'`                                                        |
| `lastCheckedAt`  | `number \| undefined`              | last successful poll                                                                   |
| `lastCheckError` | `boolean \| undefined`             | the last poll failed; the state shown is the last known                                |

Derived, never stored: `uri = encodeTransferRequest({ recipient, amount: display, splToken: mint, references: [reference], label, message: note, memo: id })` where `label` is the account's name at render time.

### Settlement

| Field       | Type             | Notes                                     |
| ----------- | ---------------- | ----------------------------------------- |
| `signature` | `string`         | the finalized transaction                 |
| `payer`     | `string`         | first account key of the transaction      |
| `blockTime` | `number \| null` | seconds, as the RPC gives it; may be null |

### State transitions

```
pending ──(finalized transfer matches reference+mint+owner+exact delta)──▶ paid   (terminal)
pending ──(now > expiresAt, judged on the device)─────────────────────────▶ expired (terminal; a later matching transfer does NOT reopen it)
paid/expired ──(user removes)──▶ deleted from the store
```

A poll that fails leaves `status` untouched and sets `lastCheckError`. A transfer that names the reference but mismatches any of mint / owner / exact amount leaves the request `pending` and is not recorded.

## Powerup state store (core seam, `hooks/usePowerupState.ts`)

`STORAGE_KEYS.POWERUP_STATE = 'salmon_powerup_state'` → `Record<PowerupId, unknown>`.

Payments' slice: `PaymentsState = { requests: Record<string /* `${accountId}:${networkId}` */, PaymentRequest[]> }`, newest first within each list. The hook exposes `[state, setState]` with a functional updater; every write is immutable (new arrays/objects). Removing a Powerup does **not** clear its slice (FR-012: turning it off touches nothing).

## SendRequest (core, `types/ui/send-sheet.ts`)

What Send carries when it was started from a request.

| Field     | Type                                                | Notes                                                |
| --------- | --------------------------------------------------- | ---------------------------------------------------- |
| `request` | `TransferRequest`                                   | as parsed                                            |
| `token`   | `SendToken`                                         | resolved from holdings by `splToken` (or native SOL) |
| `locked`  | `{ recipient: true; token: true; amount: boolean }` | `amount` false when the request had none             |

`SendTransactionParams` gains `memo?: string` and `references?: readonly string[]`; the transfer carries `memo` as its own instruction immediately before the transfer instruction and `references` as read-only, non-signer metas on the transfer instruction, in order.

## Backend registry entry

```js
payments: { tier: 'core', networks: ['solana-mainnet', 'solana-devnet'], contributor: null, endpoints: [] }
```

Listed on `/v1/networks[].powerups`; no build route (404 by absence of an adapter, as `swap` once was).
