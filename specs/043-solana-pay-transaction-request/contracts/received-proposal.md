# Contract: core signs a received transaction

Changes to `packages/shared/src/core` (constitution principle III: a signing-path change, owner sign-off before merge).

## Types (`core/confirmation/types.ts`)

```ts
interface ProposalBase {
  id: string;
  networkId: SolanaNetworkId;
  display: ProposalDisplay;
  expiresAt?: string;
  /** Asked before confirming; true sends the press to `refresh` instead of signing. */
  isStale?: () => Promise<boolean>;
  pending?: TransactionProposal['pending'];
  onOutcome?: (success: boolean) => void;
}

/** Unchanged for Powerups: unsigned bytes + what they may do. */
export interface TransactionProposal extends ProposalBase {
  transaction: string;
  expect: DeclaredTransactionEffects;
  refresh?: () => Promise<TransactionProposal>;
}

/** A transaction someone else built and may already have signed. Core only. */
export interface ReceivedTransactionProposal extends ProposalBase {
  source: 'received';
  /** Base64 wire transaction, signatures included. Signed byte-for-byte as is. */
  transaction: string;
  /** The only address that may sign: the one the transaction was requested for. */
  signer: string;
  refresh?: () => Promise<ReceivedTransactionProposal>;
}

export interface ProposalDisplay {
  // …existing fields…
  /** Who asks, drawn above the rows: name, icon (https only, else placeholder), domain. */
  requester?: { name: string; icon?: string | null; domain: string };
  /** Confirm must be held (the dApp hold cases). */
  requiresHold?: boolean;
  /** Confirm cannot be pressed (e.g. not enough SOL for the fee). */
  confirmDisabled?: boolean;
}
```

## Entry points

- `useRequestSignature()` (Powerups, `core/confirmation`): unchanged signature; at runtime a proposal carrying `source` is rejected with `transaction.errors.proposalKind`. A Powerup cannot reach the received path by casting.
- `useRequestReceivedSignature()` (new, `core/confirmation/received.ts`): `(proposal: ReceivedTransactionProposal) => Promise<SignedResult>`. Same parking, one-at-a-time and receipt semantics as `requestSignature`. Added to the restricted patterns of the Powerups lint block (`'**/core/confirmation/received'`), with a fixture in `powerups/boundary.test.ts`.

## Signing (`core/signing/index.ts` → `core/broadcast/solana.ts`)

`signProposal(account, proposal)`:

- `TransactionProposal` → `signAndSendSolanaTransaction(account, tx, { feePayer: signer, ...expect })` (unchanged).
- `ReceivedTransactionProposal` → `sendReceivedSolanaTransaction(account, proposal.transaction, proposal.signer)`:
  1. `account.signer.address === signer`, else `solanaPay.errors.accountChanged`.
  2. `assertReceivedTransactionSignable(decoded, signer)` on the exact bytes.
  3. `rpc.isBlockhashValid(lifetime)`, else `solanaPay.errors.expired`.
  4. `signTransactionWith(account.signer, decoded)` — own slot only.
  5. `sendExpectingOutcome(send unchanged bytes, signature)`.
  6. `confirmSolanaSignature(…, lastValidBlockHeight = getBlockHeight() + 150)`.
     Throws `SolanaOutcomeUnknownError` exactly like the existing path, so the host's "may have landed, only close" rule applies unchanged.

## Host (`core/confirmation/useSignatureRequestHost.ts`)

`confirmOrRefresh`: before `confirm()`, `await proposal.isStale?.()`; if stale → `refresh()`; when the refreshed `display` deep-equals the previous one, `confirm()` follows in the same press; otherwise the review stays with the note `solanaPay.refreshed`. A refresh that throws leaves the review with its error (e.g. `solanaPay.errors.expired`); the press never signs stale bytes.

Both `ConfirmationHost` twins forward `display.requiresHold` and `display.confirmDisabled` to `TransactionConfirmation`.

## Tests

- `core/broadcast/solana.test.ts`: received path keeps the sponsor signature byte-identical and sends without touching the lifetime; refuses a changed account, a tampered signature, an invalid blockhash; never calls `getLatestBlockhash`.
- `SignatureRequestContext.test.tsx`: `requestSignature` rejects a `source: 'received'` proposal; the received entry parks, gates on `requireBackup`, signs through the received path, shows the receipt.
- `useSignatureRequestHost` test: stale + identical refresh → one press signs; stale + changed → no sign, note shown; stale + refresh throws → error, no sign.
- `powerups/boundary.test.ts`: importing `core/confirmation/received` from a Powerup fixture fails lint.
