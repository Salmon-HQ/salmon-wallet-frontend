# Contract: Dagon build (consumed, not designed here)

The backend half is `../salmon-wallet-backend/specs/023-dagon-powerup/spec.md` (commit `46fda57`); its plan is written in parallel. This file states what the client sends and what it relies on. Every name below, the swap's `sideIn` and `sideOut` included, matches the backend contract (`../salmon-wallet-backend/specs/023-dagon-powerup/contracts/dagon-build.md`).

## Request

`GET /v1/solana-devnet/powerups/dagon/build` through `buildPowerup('dagon', 'solana-devnet', params)` (`packages/shared/src/powerups/backend/api.ts:10`).

Every call: `publicKey` (the wallet), `action`, `freshSigners` (comma-separated base58, empty string when N = 0).

| `action` | N | Further params |
| --- | --- | --- |
| `setup` | 1 | `side`, `owner` (default the caller; the recipient when onboarding one) |
| `wrap` | 1 | `side`, `amount` (base units, 2 decimals) |
| `reveal` | 1 | `side`, `viewer` (base58; not a signer) |
| `send` | 0 | `side`, `amount`, `to` |
| `swap` | 1 | `sideIn`, `sideOut`, `amountIn`, `minAmountOut` |
| `unwrapBurn` | 1 | `side`, `amount` |
| `unwrapDecrypt` | 1 | `burnedCt` |
| `unwrapComplete` | 0 | `burnedCt`, `requestAcct` |

## Response

The existing envelope (`powerups/backend/types.ts:25-39`): unsigned transaction (v0, or legacy if backend FR-028 requires it), `expiresAt`, `contributor`, `priorityFeeMicroLamports`, `computeUnitLimit`, `display`. The client relies on:

- signers exactly {`publicKey`} ∪ `freshSigners`, `publicKey` as fee payer (core re-checks);
- programs within the manifest's list (core re-checks);
- `display` claims no outcome; the client never reads an outcome from it.

## Errors the client maps

Shared codes go through `describePowerupBuildError` (`powerups/backend/errors.ts:21-41`). Dagon's own codes, passed as `codes`:

| Status, code | Client behaviour |
| --- | --- |
| 409 `setup_required` | wrap, reveal or swap touching a side without a pc-account (for swap, the output side): offer `setup` for it as its own confirmation, then rebuild |
| 409 `recipient_setup_required` | send: offer `setup` with `owner = to` (sender pays), wait for it to settle, then rebuild the send |
| 409 `already_initialized` | treat the side as activated; re-read positions |
| 409 `balance_settling` | "your earlier hide is still being processed" |
| 409 `receipt_not_found` | withdraw: "this withdrawal cannot continue"; keep the item as "outcome unknown" |
| 409 `already_requested` | withdraw step 2 already on chain: move to step 3 with the stored `requestAcct` |
| 503 `executor_pending`, `executor_unavailable` | busy copy, retry |
| 502 `executor_bad_response`, `provider_signer_mismatch` | build-failed copy |
| 400 `invalid_fresh_signers` | build-failed copy (a fresh key collided; the next attempt generates new ones) |
| `simulation_failed` on `unwrapComplete` | "decryption not posted yet, try again" (O8) |
