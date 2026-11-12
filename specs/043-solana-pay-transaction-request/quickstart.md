# Quickstart: Solana Pay transaction requests (spec 043)

## 1. Automated checks

```bash
pnpm turbo run test --filter=@salmon/shared     # parser, HTTP, checks, received signing, host, display
pnpm turbo run test --filter=@salmon/ui         # sheet, confirmation hold/requester, StepRecipient
pnpm turbo run test --filter=@salmon/mobile     # sheet, send/index, QRScanner, ConfirmationHost
pnpm typecheck && pnpm lint && pnpm check:parity && pnpm check:i18n && pnpm check:no-secrets
pnpm --filter @salmon/extension build && pnpm check:manifest   # must show NO permission change
```

Tests that need a keypair generate one inside the test (AGENTS.md, no-secrets gate).

## 2. Devnet test merchant (`scripts/devnet-solana-pay-merchant.mjs`)

Dev-only; imported by nothing, shipped in nothing. Devnet RPC is fixed in the script.

```bash
# terminal 1 — the merchant (port 8787 by default)
SALMON_TEST_SEED_B="…" MERCHANT_ADDR="<any devnet address that receives>" \
  [KORA_RPC_URL=http://localhost:8080/] node scripts/devnet-solana-pay-merchant.mjs
# terminal 2 — public HTTPS in front of it (no account needed)
cloudflared tunnel --url http://localhost:8787
```

The script prints, for each route, the `solana:` link and a terminal QR for it, using the tunnel URL passed as `PUBLIC_URL`. Every response sends `Access-Control-Allow-Origin: *` and answers `OPTIONS` (the extension needs CORS; research R2).

| Route                    | Serves                                                                                                                                      | Expected in Salmon                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/pay/sponsored`         | SOL transfer user→merchant + memo, fee payer = sponsor, sponsor signed (Kora when `KORA_RPC_URL`, else wallet B), user slot empty, SVG icon | Review: −amount, "Paid by …", lands with both signatures, user pays no fee (US1)                 |
| `/pay/sponsored-v0`      | Same, v0 message                                                                                                                            | Same                                                                                             |
| `/pay/unsigned`          | Same transfer, no signatures, fee payer = merchant address                                                                                  | Review shows the user as fee payer and the fee (US3)                                             |
| `/pay/unsigned-broke`    | Unsigned, amount ≥ user balance                                                                                                             | Confirm disabled, "not enough SOL" (US3 AC2)                                                     |
| `/pay/http-error`        | GET 200, POST 500 `{"message":"Out of stock"}`                                                                                              | `merchantError` + "The merchant says: Out of stock", retry                                       |
| `/pay/not-json`          | POST 200 `text/html`                                                                                                                        | `unreadable`                                                                                     |
| `/pay/bad-icon`          | GET icon `/logo.gif`                                                                                                                        | `malformedIcon`, no POST                                                                         |
| `/pay/bad-signature`     | Sponsored with one byte of the sponsor signature flipped                                                                                    | `invalidSignature`                                                                               |
| `/pay/missing-sponsor`   | Fee payer = sponsor, sponsor slot empty                                                                                                     | `missingSignature`                                                                               |
| `/pay/not-for-you`       | Sponsored transaction that never names the user                                                                                             | `notForThisAccount`                                                                              |
| `/pay/fails`             | Sponsored transfer of more SOL than the user holds                                                                                          | Review with the "would fail" warning, hold to confirm                                            |
| `/pay/stale`             | First POST: sponsored with a blockhash ~2 minutes old; later POSTs: fresh                                                                   | First: `staleOrWrongNetwork`. Open `/pay/sponsored`, wait > 90 s, confirm → refetch, lands (US4) |
| `/pay/slow`              | POST answers after 15 s                                                                                                                     | `unreachable` after 10 s                                                                         |
| `/pay/redirect-http`     | POST 302 to `http://…`                                                                                                                      | `unreachable`; on mobile, `response.url` check                                                   |
| `/pay/huge`              | POST body 200 KiB                                                                                                                           | `unreadable`                                                                                     |
| (link) `solana:http://…` | printed only                                                                                                                                | `malformedLink`, no request reaches the server log                                               |

The server logs every request (method, path, `Origin`, `User-Agent`, body for POST), which is how the "no request for watch-only" and "no request for a malformed link" checks are read.

### Kora mode (the guide's setup)

Follow https://solana.com/docs/tools/kora/guides/full-demo for the Kora node itself, with these settings in its `kora.toml`: devnet RPC, `[validation.price] type = "free"`, the System and Memo programs in `allowed_programs`, Lighthouse off. Fund its signer with devnet SOL. Then start the merchant with `KORA_RPC_URL`. The `sponsored` route builds the transaction with Kora's address (`getPayerSigner`) as fee payer and calls Kora `signTransaction`; Kora sets the blockhash and signs its slot, and the route returns that transaction unchanged. This route is the check that Kora signs a transaction whose user slot is still empty (research, Kora facts).

## 3. Hand test (both platforms, devnet, a funded test account)

1. Mobile: Send → scan the `/pay/sponsored` QR. Extension: Send → paste the link. Sheet shows domain at once, then label and icon; review opens within 5 s (SC-002).
2. Confirm on a wallet whose phrase check is pending: the phrase sheet appears first (FR-018).
3. After the receipt: Activity lists the payment; the explorer shows two signatures and the sponsor as fee payer; the user's SOL changed by exactly the transfer.
4. Each failure route above: its own message, nothing signed, server log shows no second POST unless Retry was pressed.
5. Watch-only account: open the link → refusal, server log shows no request (US5).
6. Switch account while the review is open, confirm → `accountChanged`, nothing sent.
7. A transfer-request QR from spec 033's Payments still opens the locked Send review (SC-006).

## 4. Owner sign-offs before merge

- Signing path change in `packages/shared/src/core` (constitution III): `ReceivedTransactionProposal`, `sendReceivedSolanaTransaction`, the Powerup-door guard.
- UI: the sheet, the identity row and hold on the confirmation screen (contracts/ui-contracts.md).
- The extension limitation: merchants without CORS headers fail on the extension (research R2).
