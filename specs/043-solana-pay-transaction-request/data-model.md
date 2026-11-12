# Data model: Solana Pay transaction requests (spec 043)

Nothing here is stored. Every entity lives in memory for one payment attempt; the only lasting trace is the transaction itself, which Activity reads from the chain.

## TransactionRequestLink

The merchant's address, read out of a `solana:` link.

| Field  | Type     | Rule                                                                                                                                    |
| ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `url`  | `string` | Percent-decoded once; `new URL(url).protocol === 'https:'`; query string kept verbatim and sent on both requests (FR-001)               |
| `host` | `string` | `new URL(url).hostname` (punycode for international names, so a look-alike domain shows as `xn--…`); not an IP literal, not `localhost` |

Refusals before any request: not HTTPS → `transactionRequestMalformed` (FR-002); IP literal or `localhost` → same.

## MerchantDetails (GET)

| Field          | Type             | Rule                                                                                                      |
| -------------- | ---------------- | --------------------------------------------------------------------------------------------------------- |
| `label`        | `string`         | Required, non-empty after trim; shown as plain text, never as markup                                      |
| `icon`         | `string`         | Required; absolute `http:`/`https:`; path ends `.svg`/`.png`/`.webp` (any case) — else malformed (FR-006) |
| `iconToRender` | `string \| null` | `icon` when `https:`, else `null` (placeholder)                                                           |
| `domain`       | `string`         | `TransactionRequestLink.host` — what the user can actually check                                          |

## MerchantTransactionResponse (POST)

| Field         | Type                  | Rule                                                                                             |
| ------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| `transaction` | `string`              | Required, base64, decodes as a legacy, v0 or v1 transaction within size limits (FR-010)          |
| `message`     | `string \| undefined` | Optional; plain text; shown in full on the review (the standard asks for at least 80 characters) |
| anything else | —                     | Ignored, `redirect` included (FR-008)                                                            |

Error responses (4xx/5xx): optional `{"message"}`, first 80 characters shown as the merchant's words.

## PreparedMerchantTransaction

Output of the checks (research R3); the one set of bytes that is previewed, shown and signed.

| Field       | Type              | Meaning                                                                                      |
| ----------- | ----------------- | -------------------------------------------------------------------------------------------- |
| `wire`      | `string` (base64) | Exact transaction bytes, signatures included                                                 |
| `message`   | `string` (base58) | Its message bytes, for the dApp preview functions                                            |
| `sponsored` | `boolean`         | True when it arrived with signatures (fee payer is someone else, lifetime is the merchant's) |
| `feePayer`  | `string`          | `staticAccounts[0]`                                                                          |
| `signer`    | `string`          | The user's address that was POSTed; the only key that may sign                               |
| `lifetime`  | `string`          | The recent blockhash in the message                                                          |

Invariants (each failure has its own reason, `TransactionRequestRefusal` below):

- `signer` is one of the message's signer slots.
- Signed case: every non-zero signature verifies over the message bytes; every slot except `signer`'s is filled; `signer`'s slot is empty; fee payer and lifetime are as received.
- Unsigned case: fee payer = `signer`; lifetime = latest blockhash at preparation; no other signer remains.
- `isBlockhashValid(lifetime)` on the active network.

## MerchantPaymentState (the hook's state machine)

```
idle
 └─ start(link) ──▶ refused(reason)                         watch-only / malformed link: no request made
 └─ start(link) ──▶ loadingDetails ──▶ failed(reason, merchant?) ──retry──▶ loadingDetails
                         │
                         ▼
                   loadingTransaction ──▶ failed(reason, merchant) ──retry──▶ loadingTransaction
                         │
                         ▼
                   checking+previewing ──▶ failed(reason, merchant)        (malformed / unsafe / expired)
                         │
                         ▼
                   reviewing  (core confirmation host owns the screen)
                     ├─ cancel ──────────────▶ idle            nothing signed
                     ├─ stale ─▶ refresh ─▶ reviewing (same display → confirm continues; changed → "check again")
                     │                    └▶ reviewing + error "expired"
                     └─ signed + receipt dismissed ─▶ done      caller leaves the Send flow
```

`merchant` (label, icon, domain) stays on the failure state once the GET succeeded, so the user knows which counter failed (spec edge case).

## TransactionRequestRefusal (reason codes)

| Reason                 | When                                                         | Spec              |
| ---------------------- | ------------------------------------------------------------ | ----------------- |
| `watchOnly`            | Active account cannot sign                                   | FR-004            |
| `malformedLink`        | Link not absolute HTTPS, or IP-literal / localhost host      | FR-002            |
| `unreachable`          | Network error, timeout, CORS refusal, redirect off HTTPS     | FR-009            |
| `merchantError`        | 4xx/5xx (carries the merchant's `message` when present)      | FR-009            |
| `unreadable`           | Not JSON, too large, missing or wrong-typed field            | FR-009            |
| `malformedIcon`        | Icon not absolute http(s) or not SVG/PNG/WebP                | FR-006            |
| `malformedTransaction` | Base64/decoder/size/version failure                          | FR-010            |
| `invalidSignature`     | A present signature does not verify                          | FR-012            |
| `notForThisAccount`    | User's address is not a signer of the transaction            | FR-013            |
| `alreadySigned`        | User's slot already filled                                   | FR-013            |
| `missingSignature`     | Another signer's slot is empty                               | FR-011/014        |
| `staleOrWrongNetwork`  | Lifetime not valid on the active network                     | FR-019, edge case |
| `expired`              | Went stale during review and the refresh failed              | FR-019            |
| `accountChanged`       | Active signer differs from the address given to the merchant | FR-013            |

Preview outcomes (`TransactionEffects`) are not refusals: they flow into the display and the hold rule exactly as for a dApp (`dappTransactionGate`).

## ReceivedTransactionProposal (core, `core/confirmation/types.ts`)

See `contracts/received-proposal.md`. Fields: `id`, `source: 'received'`, `networkId`, `transaction` (= `PreparedMerchantTransaction.wire`), `signer`, `display`, `isStale`, `refresh`, `pending`, `onOutcome`.
