# Off-chain message signing (OCMS)

This document describes Salmon Wallet's implementation of OCMS v1 (Off-Chain
Message Signing) for Solana, and the defensive hardening applied to the
legacy `signMessage` path. It is a ground-truth document: it states what is
implemented today and marks explicitly what is not yet wired into the running
apps. It does not promise coverage that does not exist.

Audience: open-source contributors working on this codebase, and reviewers
evaluating it as a security feature.

## Status at a glance

| Layer | Status |
|---|---|
| OCMS v1 build/sign/verify/parse primitive (`packages/shared`) | Implemented |
| Approval-layer functions for `solana:signOffchainMessage` (`packages/shared`) | Implemented |
| Request/payload types for `solana:signOffchainMessage` (`packages/shared`) | Implemented |
| Approval UI for OCMS messages (`packages/ui`) | Implemented |
| tx-lookalike guard on the legacy `signMessage` approval function (`packages/shared`) | Implemented, active on both apps |
| tx-lookalike warning banner rendering in the running apps | Not wired — see [App-surface status](#app-surface-status) |
| `solana:signOffchainMessage` Wallet Standard feature registration (`apps/web`, `apps/extension`) | Not implemented |
| Native `solana:signIn` (SIWS) | Not implemented — heuristic SIWS text parsing remains in place |

## What OCMS is

OCMS v1 is a wire format for signing arbitrary off-chain messages with a
Solana keypair, such that the resulting signature cannot be confused with a
transaction signature. It is specified in
[SRFC 38](https://github.com/solana-foundation/SRFCs/discussions/3) and
implemented by Anza's official `@solana/offchain-messages` package, which
Salmon depends on directly (`@solana/offchain-messages` in
`packages/shared/package.json`) rather than re-implementing the encoding.

Every OCMS v1 buffer is prefixed with a fixed 16-byte signing domain: the
byte `0xff` followed by the 15-byte ASCII string `"solana offchain"`. A real
Solana transaction message cannot begin with those bytes — a versioned
message's first byte is a version-prefix byte, and no version other than `0`
is currently defined, so any high-bit-set first byte (`0xff` included)
already fails to parse as a supported version; a legacy message's first byte
is the literal required-signer count, which no real transaction sets to
`255`. This is what makes an off-chain message signature structurally
impossible to replay as a transaction signature: a signature over an
OCMS-domain-prefixed buffer cannot be resubmitted as a transaction, because
the bytes it was computed over do not parse as a transaction message in the
first place, and vice versa.

The same domain separation is exposed at the Wallet Standard level as the
`solana:signOffchainMessage` feature
([anza-xyz/wallet-standard PR #92](https://github.com/anza-xyz/wallet-standard)),
alongside a related feature, `solana:signIn`
([PR #93](https://github.com/anza-xyz/wallet-standard)) for Sign-In-With-Solana
(SIWS), which is not part of this implementation yet (see
[Backward compatibility](#backward-compatibility)).

## The problem it solves

Wallets historically expose a generic `signMessage(bytes)` call with no
structural constraint on what `bytes` may contain. A dApp can hand the wallet
bytes that are actually a serialized, unsigned Solana transaction message and
ask the wallet to sign them as if they were an arbitrary message (e.g. a
login challenge). If the wallet signs blindly, the resulting `ed25519`
signature is — bit for bit — a valid signature over that transaction
message. The dApp (or anyone who intercepts the signature) can then attach it
to the transaction and submit it on-chain, moving funds or invoking
instructions the user never knowingly approved as a transaction. The user
only ever saw a "sign this message" prompt, typically rendered as opaque
bytes or a hex dump, with no fee, instruction, or recipient information to
raise suspicion.

This is the "transaction-lookalike" or blind-signing attack. It exists
because plain `signMessage` provides no way to distinguish "this dApp wants
me to sign an arbitrary message" from "this dApp wants me to sign a
transaction, but is asking through the message endpoint to bypass the
transaction-approval UI." OCMS's domain-separated buffer removes this
ambiguity for any signer that adopts it: an OCMS signature can never be
reinterpreted as a transaction signature, so there is nothing to disguise.

## How Salmon implements it

### OCMS v1 primitive — `packages/shared/src/blockchain/solana/offchain-message.ts`

| Export | Responsibility |
|---|---|
| `buildOffchainMessageV1(content, signers)` | Builds the domain-separated signing buffer for UTF-8 message `content` and the given `PublicKey[]` signers, via Anza's `compileOffchainMessageV1Envelope`. Rejects non-UTF-8 content (OCMS v1 only supports UTF-8 message content). |
| `signOffchainMessage(account, content, signers)` | Calls `buildOffchainMessageV1`, then signs the resulting buffer with `nacl.sign.detached` over `account.keyPair.secretKey`. Returns `{ signature, buffer }`. |
| `verifyOffchainMessage(buffer, signature, signer)` | Verifies an `ed25519` signature over a buffer produced by `buildOffchainMessageV1`, via `nacl.sign.detached.verify`. |
| `parseOffchainMessageV1(buffer)` | Decodes a signing buffer back into its structured `OffchainMessageV1` (version, required signatories, content) via Anza's `getOffchainMessageV1Decoder`. Throws on a malformed buffer (wrong domain, wrong version, unsorted/duplicate signatories). |

Signing and verification intentionally use `nacl.sign.detached` directly over
the account's `Keypair`, rather than the package's own
`signOffchainMessageEnvelope`/`verifyOffchainMessageEnvelope` helpers — those
operate on WebCrypto `CryptoKeyPair`/`CryptoKey` objects (via `@solana/keys`),
which is not the key representation this wallet derives, stores, or signs
with elsewhere. The domain-separated *encoding* (`compileOffchainMessageV1Envelope`
/ `getOffchainMessageV1Decoder`) still comes from the official package; only
the signing/verification primitive is swapped for the one already used
throughout the codebase.

### Approval layer — `packages/shared/src/utils/dapp-approval.ts`

| Export | Responsibility |
|---|---|
| `approveSolanaSignOffchainMessage(account, data, requiredSigners)` | Approves a `solana:signOffchainMessage` request. Builds and signs the OCMS buffer via `signOffchainMessage`, and returns a payload that is field-name-compatible with the Wallet Standard PR #92 output shape (`signedOffchainMessage`, `signature`, `signatureType`), except `signedOffchainMessage`/`signature` are bs58-encoded strings rather than raw `Uint8Array` — every other payload in this module crosses the postMessage/extension-bridge boundary as JSON, so this keeps the encoding convention consistent. `signatureType` is always `'ed25519'`. |
| `parseOffchainMessageForApproval(data, requiredSigners)` | Rebuilds the OCMS buffer from the raw request (`buildOffchainMessageV1`) and decodes it (`parseOffchainMessageV1`) for the approval screen, so the UI previews exactly the bytes that will be signed rather than a separately derived decode that could drift from it. Throws if `data` is not valid UTF-8 or `requiredSigners` are not well-formed base58 addresses. |
| `isTransactionLookalike(bytes)` | Returns `true` if `bytes` deserialize as a valid Solana `VersionedMessage` or legacy `Message` (tries `VersionedMessage.deserialize` first, then `Message.from`). Used to detect the blind-signing attack on the legacy raw-`signMessage` path, where OCMS's domain separation does not apply. |
| `TransactionLookalikeMessageError` | Thrown by `approveSolanaSignMessage` when `isTransactionLookalike` returns `true` for the requested bytes. Its message explicitly tells the caller to use `signTransaction` or `solana:signOffchainMessage` instead. |
| `approveSolanaSignMessage(account, data)` (existing, hardened) | Now calls `isTransactionLookalike(data)` first and throws `TransactionLookalikeMessageError` instead of signing if the bytes deserialize as a transaction. Previously signed any bytes unconditionally. |

Coverage for this behavior lives in
`packages/shared/src/utils/dapp-approval.test.ts`: `isTransactionLookalike`
is tested against a real versioned message, a real legacy message, plain
UTF-8 text, and an empty buffer; `approveSolanaSignMessage` is tested for
both the normal-signing case and the lookalike-rejection case;
`approveSolanaSignOffchainMessage` is tested for producing a signature that
`verifyOffchainMessage` accepts.

### Request/payload types — `packages/shared/src/types/dapp-approval.ts`

- `DAppSignOffchainMessageRequest` — `{ id, method: 'signOffchain', params: { data?: number[], requiredSigners?: string[] } }`, added to the `DAppApprovalRequest` union. `requiredSigners` are base58 addresses, matching how every other identifier in this module crosses the bridge boundary.
- `DAppSignOffchainMessageApprovalPayload` — `{ signedOffchainMessage: string, signature: string, signatureType: 'ed25519' }`, the return type of `approveSolanaSignOffchainMessage`.

### Approval UI — `packages/ui/src/components/DAppApproval/DAppSignMessageApprovalView.tsx`

This is a single component handling both the legacy `sign` request and the
new OCMS `signOffchain` request; the mode is inferred from whether the
`requiredSigners` prop is set (`isOffchainMessage = requiredSigners !== undefined`).

- **OCMS mode** (`requiredSigners` present): calls `parseOffchainMessageForApproval(data, requiredSigners)` and renders the decoded `content` plus a list of required signer addresses. The card label reads "Off-chain message (OCMS)". If parsing fails, it falls back to the raw message box.
- **Legacy mode** (`requiredSigners` absent): calls `isTransactionLookalike(Uint8Array.from(data))` on the raw bytes. If it returns `true`, the component renders a red "Signing blocked" banner explaining that the app is trying to get a transaction signed as a plain message, and disables the Sign button (`disabled={disabled || loading || isLookalikeTransaction}`). If not lookalike, it falls through to the existing SIWS-aware rendering (`parseSiwsMessage`) with its own domain-mismatch warning.

The `data`/`requiredSigners` props are declared on
`DAppSignMessageApprovalViewProps` in
`packages/ui/src/components/DAppApproval/types.ts`. Component behavior for
both modes is covered by
`packages/ui/src/components/DAppApproval/DAppSignMessageApprovalView.test.tsx`.

## App-surface status

The shared crypto primitive, approval-layer functions, request/payload
types, and approval UI described above are implemented and tested in
`packages/shared` and `packages/ui`. As of this writing, wiring those into
the running web and extension apps is incomplete:

- **No `solana:signOffchainMessage` Wallet Standard feature is registered.**
  The injected providers (`apps/web/src/providers/SalmonWalletProvider.tsx`,
  `apps/extension/src/lib/SolanaProvider.ts`) implement `connect`,
  `signMessage` (legacy `'sign'`), `signTransaction`, `signAllTransactions`,
  and `signAndSendTransaction`. Neither exposes a `signOffchainMessage`
  method or registers the corresponding Wallet Standard feature, so a dApp
  cannot invoke OCMS against Salmon today.
- **No dedicated approval route for `signOffchain` requests.** Both
  `apps/web/src/pages/dapp/SignMessageApprovalPage.tsx` and
  `apps/extension/src/pages/dapp/DAppSignMessageApprovalPage.tsx` only
  listen for `method === 'sign'`; there is no `signOffchain`-handling
  equivalent page yet.
- **The tx-lookalike warning banner is not yet visible in the running
  apps**, even though the underlying guard is active. Both approval pages
  call `approveSolanaSignMessage(account, data)` on approve, so
  `TransactionLookalikeMessageError` is thrown and the request is rejected
  either way — but neither page currently passes the `data` prop into
  `DAppSignMessageApprovalView`, so the proactive warning banner and the
  disabled Sign button (which read `data` to compute
  `isLookalikeTransaction` before the user clicks Sign) do not render yet.
  In practice this means: a disguised-transaction message is still refused,
  the user just sees it surface as a generic signing failure rather than the
  dedicated pre-emptive warning.

In short: the security-relevant logic (domain-separated signing, the
tx-lookalike detector, and the refusal to sign disguised transactions) is
implemented and exercised by tests. The remaining work is app-surface
wiring — exposing OCMS through the injected provider and Wallet Standard
feature registration, adding a `signOffchain` approval route, and passing
`data` through the legacy approval pages so the warning UI renders
proactively.

## Benefits

- **Users**: cannot be tricked into producing a transaction signature by
  approving what looks like an innocuous message. This applies to the OCMS
  path by construction (domain separation), and to the legacy `signMessage`
  path by the added `isTransactionLookalike` guard, which refuses to sign
  outright rather than warning after the fact.
- **dApps**: gain a standardized off-chain signing primitive built on Anza's
  official codec, rather than each wallet inventing its own message format.
  A signature produced this way is verifiable by any party that implements
  the same OCMS v1 decoder.
- **Ecosystem**: once the app-surface wiring above lands, Salmon's
  `solana:signOffchainMessage` support will be interoperable with any dApp
  or wallet adapter written against the Wallet Standard feature (PR #92),
  without wallet-specific integration code.

## Backward compatibility

- The legacy `signMessage` request (`method: 'sign'`) is not removed. The
  OCMS specification itself keeps `signMessage` as a distinct, still-valid
  capability — OCMS is additive, not a replacement. Salmon's change to that
  path is defensive hardening (refusing transaction-lookalike bytes), not a
  behavior removal.
- SIWS (Sign-In-With-Solana) support today is a heuristic text parser,
  `parseSiwsMessage` in `packages/shared/src/utils/dapp-approval.ts`, applied
  to the plain text of a legacy `signMessage` request. The function is
  explicitly marked in its own docstring as a `TODO(OCMS Fase 2b)`: it is
  intended to be removed once native `solana:signIn` (Wallet Standard PR #93)
  replaces SIWS-over-raw-`signMessage`. That native `signIn` support is not
  implemented in this codebase yet — `parseSiwsMessage` remains a best-effort
  parser (returns `null` on any non-matching header rather than throwing) and
  should not be treated as a `solana:signIn` implementation.

## Reference index

| Path | What it is |
|---|---|
| `packages/shared/src/blockchain/solana/offchain-message.ts` | OCMS v1 build/sign/verify/parse primitive |
| `packages/shared/src/utils/dapp-approval.ts` | Approval-layer functions for both the OCMS and legacy `signMessage` paths, plus the tx-lookalike guard |
| `packages/shared/src/utils/dapp-approval.test.ts` | Unit tests for the guard and both approval functions |
| `packages/shared/src/types/dapp-approval.ts` | `DAppSignOffchainMessageRequest` / `DAppSignOffchainMessageApprovalPayload` and the rest of the approval-flow type union |
| `packages/ui/src/components/DAppApproval/DAppSignMessageApprovalView.tsx` | Dual-mode approval UI (OCMS content view, legacy SIWS/plain-text view, tx-lookalike warning) |
| `packages/ui/src/components/DAppApproval/types.ts` | `DAppSignMessageApprovalViewProps`, including the `data`/`requiredSigners` props |
| `packages/ui/src/components/DAppApproval/DAppSignMessageApprovalView.test.tsx` | Component tests for both approval-view modes |
| `apps/web/src/providers/SalmonWalletProvider.tsx` | Injected web provider — not yet wired for `signOffchainMessage` |
| `apps/web/src/pages/dapp/SignMessageApprovalPage.tsx` | Web approval page — handles legacy `sign` only |
| `apps/extension/src/lib/SolanaProvider.ts` | Injected extension provider — not yet wired for `signOffchainMessage` |
| `apps/extension/src/pages/dapp/DAppSignMessageApprovalPage.tsx` | Extension approval page — handles legacy `sign` only |

External references:

- [SRFC 38 — Off-chain message signing](https://github.com/solana-foundation/SRFCs/discussions/3)
- [`@solana/offchain-messages`](https://www.npmjs.com/package/@solana/offchain-messages) (Anza)
- Wallet Standard [`solana:signOffchainMessage`](https://github.com/anza-xyz/wallet-standard) (PR #92)
- Wallet Standard [`solana:signIn`](https://github.com/anza-xyz/wallet-standard) / SIWS (PR #93) — not implemented in Salmon yet
