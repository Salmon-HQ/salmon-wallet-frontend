# Off-chain message signing (OCMS)

This document describes Salmon Wallet's implementation of OCMS v1 (Off-Chain Message Signing) for Solana, and the defensive hardening applied to the legacy `signMessage` path. It is a ground-truth document: it states what is implemented and wired into the running apps today, and does not promise coverage that does not exist.

Audience: open-source contributors working on this codebase, and reviewers evaluating it as a security feature.

## Status at a glance

| Layer | Status |
|---|---|
| OCMS v1 build/sign/verify/parse primitive (`packages/shared`) | Implemented |
| Approval-layer functions for `solana:signOffchainMessage` (`packages/shared`) | Implemented |
| Request/payload types for `solana:signOffchainMessage` (`packages/shared`) | Implemented |
| Approval UI for OCMS messages (`packages/ui`) | Implemented |
| tx-lookalike guard on the legacy `signMessage` approval function (`packages/shared`) | Implemented, active on both apps |
| tx-lookalike warning banner rendering in the running apps | Implemented — both approval pages pass `data` into the view |
| Required-signatory guard on OCMS signing (`packages/shared`) | Implemented |
| `solana:signOffchainMessage` Wallet Standard feature + injected-provider wiring (`apps/web`, `apps/extension`) | Implemented |
| Native `solana:signIn` (SIWS), replacing the heuristic text parser | Implemented |

## What OCMS is

OCMS v1 is a wire format for signing arbitrary off-chain messages with a Solana keypair, such that the resulting signature cannot be confused with a transaction signature. It is specified in [SRFC 38](https://github.com/solana-foundation/SRFCs/discussions/3) and implemented by Anza's official `@solana/offchain-messages` package, which Salmon depends on directly (`@solana/offchain-messages` in `packages/shared/package.json`) rather than re-implementing the encoding.

Every OCMS v1 buffer is prefixed with a fixed 16-byte signing domain: the byte `0xff` followed by the 15-byte ASCII string `"solana offchain"`. A real Solana transaction message cannot begin with those bytes — a versioned message's first byte is a version-prefix byte, and no version other than `0` is currently defined, so any high-bit-set first byte (`0xff` included) already fails to parse as a supported version; a legacy message's first byte is the literal required-signer count, which no real transaction sets to `255`. This is what makes an off-chain message signature structurally impossible to replay as a transaction signature: a signature over an OCMS-domain-prefixed buffer cannot be resubmitted as a transaction, because the bytes it was computed over do not parse as a transaction message in the first place, and vice versa.

The same domain separation is exposed at the Wallet Standard level as the `solana:signOffchainMessage` feature ([anza-xyz/wallet-standard PR #92](https://github.com/anza-xyz/wallet-standard)), alongside a related feature, `solana:signIn` ([PR #93](https://github.com/anza-xyz/wallet-standard)) for Sign-In-With-Solana (SIWS). Salmon implements both natively; SIWS replaces the previous heuristic that parsed sign-in text out of raw `signMessage` bytes (see [Backward compatibility](#backward-compatibility)).

## The problem it solves

Wallets historically expose a generic `signMessage(bytes)` call with no structural constraint on what `bytes` may contain. A dApp can hand the wallet bytes that are actually a serialized, unsigned Solana transaction message and ask the wallet to sign them as if they were an arbitrary message (e.g. a login challenge). If the wallet signs blindly, the resulting `ed25519` signature is — bit for bit — a valid signature over that transaction message. The dApp (or anyone who intercepts the signature) can then attach it to the transaction and submit it on-chain, moving funds or invoking instructions the user never knowingly approved as a transaction. The user only ever saw a "sign this message" prompt, typically rendered as opaque bytes or a hex dump, with no fee, instruction, or recipient information to raise suspicion.

This is the "transaction-lookalike" or blind-signing attack. It exists because plain `signMessage` provides no way to distinguish "this dApp wants me to sign an arbitrary message" from "this dApp wants me to sign a transaction, but is asking through the message endpoint to bypass the transaction-approval UI." OCMS's domain-separated buffer removes this ambiguity for any signer that adopts it: an OCMS signature can never be reinterpreted as a transaction signature, so there is nothing to disguise.

## How Salmon implements it

### OCMS v1 primitive — `packages/shared/src/blockchain/solana/offchain-message.ts`

| Export | Responsibility |
|---|---|
| `buildOffchainMessageV1(content, signers)` | Builds the domain-separated signing buffer for UTF-8 message `content` and the given `PublicKey[]` signers, via Anza's `compileOffchainMessageV1Envelope`. Rejects non-UTF-8 content (OCMS v1 only supports UTF-8 message content). |
| `signOffchainMessage(account, content, signers)` | Calls `buildOffchainMessageV1`, then signs the resulting buffer with `nacl.sign.detached` over `account.keyPair.secretKey`. Returns `{ signature, buffer }`. **Refuses to sign (throws) when `account` is not among `signers`**, so the wallet never produces a signature over an OCMS message whose required-signatory list omits the actual signer — the `requiredSigners` list is dApp-supplied and therefore untrusted. |
| `verifyOffchainMessage(buffer, signature, signer)` | Verifies an `ed25519` signature over a buffer produced by `buildOffchainMessageV1`, via `nacl.sign.detached.verify`. |
| `parseOffchainMessageV1(buffer)` | Decodes a signing buffer back into its structured `OffchainMessageV1` (version, required signatories, content) via Anza's `getOffchainMessageV1Decoder`. Throws on a malformed buffer (wrong domain, wrong version, unsorted/duplicate signatories). |

Signing and verification intentionally use `nacl.sign.detached` directly over the account's `Keypair`, rather than the package's own `signOffchainMessageEnvelope`/`verifyOffchainMessageEnvelope` helpers — those operate on WebCrypto `CryptoKeyPair`/`CryptoKey` objects (via `@solana/keys`), which is not the key representation this wallet derives, stores, or signs with elsewhere. The domain-separated *encoding* (`compileOffchainMessageV1Envelope` / `getOffchainMessageV1Decoder`) still comes from the official package; only the signing/verification primitive is swapped for the one already used throughout the codebase.

### Approval layer — `packages/shared/src/utils/dapp-approval.ts`

| Export | Responsibility |
|---|---|
| `approveSolanaSignOffchainMessage(account, data, requiredSigners)` | Approves a `solana:signOffchainMessage` request. Builds and signs the OCMS buffer via `signOffchainMessage`, and returns a payload that is field-name-compatible with the Wallet Standard PR #92 output shape (`signedOffchainMessage`, `signature`, `signatureType`), except `signedOffchainMessage`/`signature` are bs58-encoded strings rather than raw `Uint8Array` — every other payload in this module crosses the postMessage/extension-bridge boundary as JSON, so this keeps the encoding convention consistent. `signatureType` is always `'ed25519'`. |
| `parseOffchainMessageForApproval(data, requiredSigners)` | Rebuilds the OCMS buffer from the raw request (`buildOffchainMessageV1`) and decodes it (`parseOffchainMessageV1`) for the approval screen, so the UI previews exactly the bytes that will be signed rather than a separately derived decode that could drift from it. Throws if `data` is not valid UTF-8 or `requiredSigners` are not well-formed base58 addresses. |
| `isTransactionLookalike(bytes)` | Returns `true` if `bytes` deserialize as a valid Solana `VersionedMessage` or legacy `Message` (tries `VersionedMessage.deserialize` first, then `Message.from`). Used to detect the blind-signing attack on the legacy raw-`signMessage` path, where OCMS's domain separation does not apply. |
| `TransactionLookalikeMessageError` | Thrown by `approveSolanaSignMessage` when `isTransactionLookalike` returns `true` for the requested bytes. Its message explicitly tells the caller to use `signTransaction` or `solana:signOffchainMessage` instead. |
| `approveSolanaSignMessage(account, data)` (existing, hardened) | Now calls `isTransactionLookalike(data)` first and throws `TransactionLookalikeMessageError` instead of signing if the bytes deserialize as a transaction. Previously signed any bytes unconditionally. |

Coverage for this behavior lives in `packages/shared/src/utils/dapp-approval.test.ts`: `isTransactionLookalike` is tested against a real versioned message, a real legacy message, plain UTF-8 text, and an empty buffer; `approveSolanaSignMessage` is tested for both the normal-signing case and the lookalike-rejection case; `approveSolanaSignOffchainMessage` is tested for producing a signature that `verifyOffchainMessage` accepts.

### Request/payload types — `packages/shared/src/types/dapp-approval.ts`

- `DAppSignOffchainMessageRequest` — `{ id, method: 'signOffchain', params: { data?: number[], requiredSigners?: string[] } }`, added to the `DAppApprovalRequest` union. `requiredSigners` are base58 addresses, matching how every other identifier in this module crosses the bridge boundary.
- `DAppSignOffchainMessageApprovalPayload` — `{ signedOffchainMessage: string, signature: string, signatureType: 'ed25519' }`, the return type of `approveSolanaSignOffchainMessage`.

### Approval UI — `packages/ui/src/components/DAppApproval/DAppSignMessageApprovalView.tsx`

This is a single component handling both the legacy `sign` request and the new OCMS `signOffchain` request; the mode is inferred from whether the `requiredSigners` prop is set (`isOffchainMessage = requiredSigners !== undefined`).

- **OCMS mode** (`requiredSigners` present): calls `parseOffchainMessageForApproval(data, requiredSigners)` and renders the decoded `content` plus a list of required signer addresses. The card label reads "Off-chain message (OCMS)". If parsing fails, it falls back to the raw message box.
- **Legacy mode** (`requiredSigners` absent): calls `isTransactionLookalike(Uint8Array.from(data))` on the raw bytes. If it returns `true`, the component renders a red "Signing blocked" banner explaining that the app is trying to get a transaction signed as a plain message, and disables the Sign button (`disabled={disabled || loading || isLookalikeTransaction}`). Otherwise it renders the decoded message text for signing. SIWS is no longer recognized on this path — it is handled by the dedicated `solana:signIn` route, so the heuristic SIWS parser that used to run here has been removed.

The `data`/`requiredSigners` props are declared on `DAppSignMessageApprovalViewProps` in `packages/ui/src/components/DAppApproval/types.ts`. Component behavior for both modes is covered by `packages/ui/src/components/DAppApproval/DAppSignMessageApprovalView.test.tsx`.

## App-surface status

The shared crypto primitive, approval-layer functions, request/payload types, and approval UI are implemented and tested in `packages/shared` and `packages/ui`, and are wired end-to-end into both running apps:

- **`solana:signOffchainMessage` and `solana:signIn` are exposed through the
injected providers and registered as Wallet Standard features.** The injected providers (`apps/web/src/providers/SalmonWalletProvider.tsx`, `apps/extension/src/lib/SolanaProvider.ts`) implement `signOffchainMessage` and `signIn` alongside `connect`, `signMessage`, and the transaction methods. On the extension, `apps/extension/src/wallet-standard/wallet.ts` registers the `solana:signOffchainMessage` (v1) and `solana:signIn` (v1.1.0, including PR #93's `useOffchainMessage` input and `signedMessageFormat` output) features, so any Wallet Standard dApp can discover and invoke them.
- **Approval routing handles the new methods.** The message-approval page
(`SignMessageApprovalPage.tsx` / `DAppSignMessageApprovalPage.tsx`) listens for both `'sign'` and `'signOffchain'`, switching the shared view into OCMS mode when `requiredSigners` is present. A dedicated sign-in route (`apps/web/src/pages/dapp/SignInApprovalPage.tsx`, `apps/extension/src/pages/dapp/DAppSignInApprovalPage.tsx`) handles `'signIn'`, previewing the exact SIWS message the wallet builds from the real requesting origin.
- **The tx-lookalike warning banner renders proactively.** Both
message-approval pages pass the raw `data` prop into `DAppSignMessageApprovalView`, so the red "Signing blocked" banner and the disabled Sign button appear before the user acts — in addition to the hard refusal that `approveSolanaSignMessage` already throws.

On the web wallet specifically, the `/dapp/*` approval popups open as standalone windows whose unlock state (an in-memory, per-window stash) does not carry over from the main tab. They are therefore wrapped in `DAppApprovalGate` (`apps/web/src/components/DAppApprovalGate.tsx`), which prompts for the wallet password in the popup before the approval route renders. The extension does not need this: its stash is backed by the background service worker, which preserves the unlock across the popup lifecycle.

## Testing

### Unit tests

The crypto primitives, the tx-lookalike guard, and both approval-view modes are covered by unit tests (Vitest). Run them per package:

```
pnpm --filter @salmon/shared test    # OCMS/SIWS primitives, approval layer, guards
pnpm --filter @salmon/ui test        # approval-view components
```

Key files: `packages/shared/src/blockchain/solana/offchain-message.test.ts`, `sign-in.test.ts`, `packages/shared/src/utils/dapp-approval.test.ts`, and `packages/ui/src/components/DAppApproval/DAppSignMessageApprovalView.test.tsx` / `DAppSignInApprovalView.test.tsx`.

### Manual end-to-end

The repo ships two self-contained dApp harnesses that drive the full flow — connect, `signMessage` (plain text and a transaction-lookalike), `signOffchainMessage`, and `signIn` (including a domain-mismatch case) — against a real running wallet. Signing is local `ed25519`, so no backend is required for the signing itself; you only need an onboarded, unlocked wallet.

Production dApps discover the wallet as a Wallet Standard wallet named "Salmon" (via `getWallets()`); the harnesses call the injected provider directly, which is the simplest way to exercise every method by hand. The harnesses live under each app's `.playwright/scripts/` (see that suite's `README.md` / `AGENTS.md` for conventions) and are development tools, not part of the shipped wallet.

#### Web wallet — `apps/web/.playwright/scripts/test-dapp-web.js`

The web wallet exposes `window.__salmonWallet` only inside its own SPA, and its `/dapp/*` approval popups talk to it over a same-origin `BroadcastChannel`. The harness therefore runs as a console snippet inside the running wallet tab, not as a standalone page.

1. `pnpm --filter @salmon/web dev`, then open the printed local URL.
2. Onboard or unlock a wallet.
3. Open the browser devtools console, paste the entire contents of the harness file, and press Enter — a floating panel appears.
4. Use the buttons. Each approval opens a popup window that starts locked (see [App-surface status](#app-surface-status)) and prompts for the wallet password before showing the approval.

#### Extension — `apps/extension/.playwright/scripts/test-dapp.html`

The extension injects `window.salmon` into pages it matches (`https://*`, `http://localhost`, `http://127.0.0.1` — **not** `file://`), so the harness is a standalone page served over `localhost`.

1. `pnpm --filter @salmon/extension build`.
2. `chrome://extensions` → enable Developer mode → **Load unpacked** → `apps/extension/dist/chrome-mv3`.
3. Open the extension and onboard or unlock a wallet.
4. Serve the harness over http and open it — e.g. `cd apps/extension/.playwright/scripts && python3 -m http.server 8080`, then visit `http://localhost:8080/test-dapp.html`.

Each approval opens in a dedicated popup window that closes automatically after you approve or reject, and the wallet stays unlocked across popups (its stash is background-backed). With another Solana wallet (e.g. Phantom) installed, the harness targets `window.salmon` specifically, so connect always opens Salmon.

#### What to expect

| Action | Expected result |
|---|---|
| Connect | Returns the active account address |
| `signMessage` (text) | Returns a 64-byte `ed25519` signature |
| `signMessage` (transaction bytes) | Blocked: red "Signing blocked" banner, Sign disabled; only Reject is possible |
| `signOffchainMessage` | Returns a signed buffer whose first 16 bytes are the OCMS domain (`ff 73 6f 6c 61 6e 61 20 6f 66 66 63 68 61 69 6e`) |
| `signIn` (real origin) | Returns the signed SIWS message and account; with the OCMS toggle, `signedMessageFormat.kind === 'offchainMessage'` |
| `signIn` (mismatched domain) | Refused: domain-mismatch banner, approval disabled |

## Benefits

- **Users**: cannot be tricked into producing a transaction signature by
approving what looks like an innocuous message. This applies to the OCMS path by construction (domain separation), and to the legacy `signMessage` path by the added `isTransactionLookalike` guard, which refuses to sign outright rather than warning after the fact.
- **dApps**: gain a standardized off-chain signing primitive built on Anza's
official codec, rather than each wallet inventing its own message format. A signature produced this way is verifiable by any party that implements the same OCMS v1 decoder.
- **Ecosystem**: Salmon's `solana:signOffchainMessage` support is interoperable
with any dApp or wallet adapter written against the Wallet Standard feature (PR #92), without wallet-specific integration code.

## Backward compatibility

- The legacy `signMessage` request (`method: 'sign'`) is not removed. The
OCMS specification itself keeps `signMessage` as a distinct, still-valid capability — OCMS is additive, not a replacement. Salmon's change to that path is defensive hardening (refusing transaction-lookalike bytes), not a behavior removal.
- SIWS is now handled by the native `solana:signIn` feature (Wallet Standard PR #93), implemented in `packages/shared/src/blockchain/solana/sign-in.ts`. The previous heuristic `parseSiwsMessage` — a best-effort parser applied to the plain text of a raw `signMessage` request — has been removed. The wallet no longer tries to recognize SIWS text inside `signMessage`; a dApp that wants sign-in must use `solana:signIn`, where the wallet builds the message itself and binds the `domain` line to the real requesting origin (dApp-claimed domains that differ are refused; see `SiwsDomainMismatchError`).

## Reference index

| Path | What it is |
|---|---|
| `packages/shared/src/blockchain/solana/offchain-message.ts` | OCMS v1 build/sign/verify/parse primitive, including the required-signatory guard on `signOffchainMessage` |
| `packages/shared/src/blockchain/solana/sign-in.ts` | Native SIWS (`solana:signIn`) primitive — builds the message, binds `domain` to the real origin, refuses domain/address mismatch |
| `packages/shared/src/utils/dapp-approval.ts` | Approval-layer functions for the OCMS, SIWS, and legacy `signMessage` paths, plus the tx-lookalike guard |
| `packages/shared/src/utils/dapp-approval.test.ts` | Unit tests for the guard and the approval functions |
| `packages/shared/src/types/dapp-approval.ts` | `DAppSignOffchainMessageRequest` / `DAppSignInRequest` and the rest of the approval-flow type union |
| `packages/ui/src/components/DAppApproval/DAppSignMessageApprovalView.tsx` | Dual-mode message approval UI (OCMS content view, legacy plain-text view, tx-lookalike warning) |
| `packages/ui/src/components/DAppApproval/DAppSignInApprovalView.tsx` | SIWS approval UI (message preview + domain-mismatch warning) |
| `packages/ui/src/components/DAppApproval/types.ts` | `DAppSignMessageApprovalViewProps`, including the `data`/`requiredSigners` props |
| `packages/ui/src/components/DAppApproval/DAppSignMessageApprovalView.test.tsx` | Component tests for the message approval-view modes |
| `apps/web/src/providers/SalmonWalletProvider.tsx` | Injected web provider — exposes `signOffchainMessage` and `signIn` |
| `apps/web/src/components/DAppApprovalGate.tsx` | Web-only unlock gate for the standalone `/dapp/*` popups |
| `apps/web/src/pages/dapp/SignMessageApprovalPage.tsx` | Web approval page — handles `sign` and `signOffchain` |
| `apps/web/src/pages/dapp/SignInApprovalPage.tsx` | Web `solana:signIn` approval page |
| `apps/extension/src/lib/SolanaProvider.ts` | Injected extension provider — exposes `signOffchainMessage` and `signIn` |
| `apps/extension/src/wallet-standard/wallet.ts` | Extension Wallet Standard adapter — registers the `solana:signOffchainMessage` and `solana:signIn` features |
| `apps/extension/src/pages/dapp/DAppSignMessageApprovalPage.tsx` | Extension approval page — handles `sign` and `signOffchain` |
| `apps/extension/src/pages/dapp/DAppSignInApprovalPage.tsx` | Extension `solana:signIn` approval page |

External references:

- [SRFC 38 — Off-chain message signing](https://github.com/solana-foundation/SRFCs/discussions/3)
- [`@solana/offchain-messages`](https://www.npmjs.com/package/@solana/offchain-messages) (Anza)
- Wallet Standard [`solana:signOffchainMessage`](https://github.com/anza-xyz/wallet-standard) (PR #92)
- Wallet Standard [`solana:signIn`](https://github.com/anza-xyz/wallet-standard) / SIWS (PR #93)
