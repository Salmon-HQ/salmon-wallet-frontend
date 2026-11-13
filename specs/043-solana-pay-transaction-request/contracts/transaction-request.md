# Contract: the transaction request, link to wallet to merchant

The external contract this feature honours: Solana Pay spec 1.1, §Transaction Request (source text: `solana-foundation/solana-pay` `typescript/packages/solana-pay/spec/SPEC1.1.md`). What Salmon does at each step, and where it is stricter than the standard.

## Link

```
solana:<link>
solana:https://merchant.example/pay                      # unencoded, no query
solana:https%3A%2F%2Fmerchant.example%2Fpay%3Forder%3D42 # encoded because it carries a query
```

- Decoded once with `decodeURIComponent`; must parse with `new URL` and have protocol `https:` → else `malformedLink`, no request (FR-001/002).
- Query string kept and sent on GET and POST.
- Salmon is stricter: host must not be an IP literal or `localhost`.

## Shared API (`packages/shared/src/blockchain/solana/transaction-request.ts`)

```ts
export interface TransactionRequestLink { url: string; host: string }
export function parseTransactionRequestLink(raw: string):
  { ok: true; link: TransactionRequestLink } | { ok: false; reason: 'malformedLink' };

export interface MerchantDetails { label: string; icon: string; iconToRender: string | null; domain: string }
export function fetchMerchantDetails(link: TransactionRequestLink, opts?: { signal?: AbortSignal }): Promise<MerchantDetails>;

export interface MerchantTransactionResponse { transaction: string; message?: string }
export function fetchMerchantTransaction(link: TransactionRequestLink, account: string, opts?: { signal?: AbortSignal }): Promise<MerchantTransactionResponse>;

export class TransactionRequestError extends Error {
  constructor(readonly reason: TransactionRequestRefusal, readonly merchantMessage?: string);
}
```

`packages/shared/src/blockchain/solana/transaction-request-checks.ts`:

```ts
export function prepareMerchantTransaction(
  rpc: SolanaRpc,
  signer: string,
  transactionBase64: string
): Promise<PreparedMerchantTransaction>; // throws TransactionRequestError

/** The signed-case rules alone, on exact bytes; reused by core right before signing. */
export function assertReceivedTransactionSignable(
  transaction: Transaction,
  signer: string
): Promise<void>; // throws TransactionRequestError
```

## GET

```
GET <url> HTTP/1.1
Accept: application/json
```

`credentials: 'omit'`, `referrerPolicy: 'no-referrer'`, `cache: 'no-store'`, `redirect: 'error'` (extension; mobile checks `response.url` afterwards), 10 s timeout, 64 KiB cap. The wallet adds no other header (platform `User-Agent`, and `Origin` on the extension, remain; research R2).

200 → `{"label": string, "icon": string}`; `label` non-empty; `icon` absolute `http(s)` ending `.svg|.png|.webp` → else `malformedIcon`. Any other field ignored. Non-2xx, redirect, timeout, CORS failure → `unreachable` / `merchantError`.

## POST

```
POST <url> HTTP/1.1
Accept: application/json
Content-Type: application/json

{"account":"<user's base58 address>"}
```

Same transport rules. 200 → `{"transaction": base64, "message"?: string}`; others ignored (`redirect` included). 4xx/5xx → `merchantError`, with `message` (first 80 characters) when the body has one.

## Transaction rules

| Arrives with  | Salmon does                                                                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| no signatures | fee payer := user, lifetime := latest blockhash (compiled-message patch when only the lifetime changes; decompile with lookup tables fetched, otherwise); then any other expected signer → `missingSignature` |
| any signature | nothing changed; every signature verified; user must be a signer with an empty slot; every other slot filled; lifetime valid on the active network                                                            |
| any case      | legacy, v0 (lookup tables resolved for the preview) and v1 read; oversize or unknown version refused                                                                                                          |

Salmon signs only with the POSTed account, only in its own slot, and sends the bytes it previewed, unchanged.

## Test vectors (Vitest)

`transaction-request.test.ts` (mocked `fetch`): unencoded link; encoded link with query kept on both requests; `http://` link; IP-literal host; GET 404; GET non-JSON; GET `icon` relative / `.gif` / `data:`; GET `http:` icon accepted with `iconToRender: null`; oversized body; timeout; redirect to `http:` (mobile path via `response.url`); POST 500 with `{"message"}` truncated to 80; POST missing `transaction`; extra fields ignored.

`transaction-request-checks.test.ts` (keys generated in the test, kit-built transactions): sponsored legacy and v0 pass with the sponsor signature byte-identical; tampered sponsor signature → `invalidSignature`; sponsor slot empty → `missingSignature`; user not a signer → `notForThisAccount`; user slot pre-filled → `alreadySigned`; unsigned with fee payer = user → only lifetime changes, every other byte equal; unsigned with another fee payer, legacy and v0 with a lookup table → fee payer and lifetime set, instructions unchanged; unsigned with a second signer → `missingSignature`; invalid blockhash (mocked RPC) → `staleOrWrongNetwork`.
