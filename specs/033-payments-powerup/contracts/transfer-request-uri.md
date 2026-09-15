# Contract: the transfer-request URI

The one thing that crosses between devices. Written by the Payments Powerup, read by core Send, interoperable with every Solana Pay wallet.

## Grammar (Solana Pay transfer request, SPEC.md + SPEC1.1)

```
solana:<recipient>[?amount=<decimal>][&spl-token=<mint>][&reference=<key>]*[&label=<text>][&message=<text>][&memo=<text>]
```

- `recipient`: base58 Solana address. Refused if invalid (`reason: 'recipient'`).
- `amount`: decimal in user units. `0` allowed by the grammar but the Powerup never writes it; absent ⇒ the payer is asked. Refused on exponent, missing leading zero, more decimals than the token has (`reason: 'amount'`).
- `spl-token`: base58 mint. Absent ⇒ native SOL. Refused if not an address (`reason: 'splToken'`).
- `reference`: repeatable, order kept, base58 32-byte each (`reason: 'reference'`).
- `label`, `message`, `memo`: percent-decoded UTF-8. `memo` longer than `MEMO_MAX_BYTES` bytes → `reason: 'memoTooLong'`.
- `solana:https://…` (a transaction request) → `reason: 'transactionRequest'` in v1.
- Anything else (`bitcoin:`, a bare address, garbage) → not a transfer request; the bare-address path of the scanner still applies.

## What the Powerup writes

```
solana:<own address>?amount=<display>&spl-token=<USDC mint>&reference=<fresh key>&label=<account name>&message=<note>&memo=<request id>
```

`message` omitted when the note is empty. `label` is the account's name at render time (never a merchant identity). Encoding is `URLSearchParams`-style percent-encoding; the QR carries exactly this string; "Copy" copies exactly this string.

## What Send does with it

| Request has                      | Send does                                                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| recipient only                   | recipient step prefilled, user picks token and amount (today's behaviour)                                              |
| recipient + amount, no token     | token = SOL locked, amount locked, straight to review                                                                  |
| recipient + spl-token + amount   | token resolved from holdings by mint (else "you don't hold this token", no confirm), amount locked, straight to review |
| recipient + spl-token, no amount | token locked, amount step shown, recipient locked                                                                      |
| references                       | attached to the transfer instruction as read-only non-signers, in order                                                |
| memo                             | one memo instruction immediately before the transfer instruction                                                       |
| label / message                  | shown on the review as "Requested by" / "For"                                                                          |

## Test vectors (Vitest, `transfer-request.test.ts`)

1. The spec's own example: `solana:mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN?amount=1&label=Michael&message=Thanks%20for%20all%20the%20fish&memo=OrderId12345` → all fields.
2. USDC with reference: `solana:<r>?amount=0.01&spl-token=EPjF…&reference=<k>` → `splToken`, one reference.
3. Two references keep order.
4. `amount=1e3`, `amount=.5`, `amount=-1` → `reason: 'amount'`.
5. `solana:https%3A%2F%2Fexample.com%2Fpay` → `reason: 'transactionRequest'`.
6. `encode(parse(v)) === v` for vectors 1–3 modulo key order.
7. A bare `solana:<address>` and a bare `<address>` classify as `valid` with no `request`.
