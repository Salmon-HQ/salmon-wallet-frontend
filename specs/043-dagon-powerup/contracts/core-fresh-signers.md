# Contract: core fresh-signer capability

The interface core offers a Powerup that needs co-signers it must never hold. Exported from `packages/shared/src/core/confirmation` (the Powerup's one door); the key generation behind it lives in `core/signing`, which `powerups/**` cannot import.

## Types (additions to `core/confirmation/types.ts`)

```ts
/** What the Powerup receives: public keys only, base58. */
export interface FreshSignerKeys {
  /** The N co-signers core generated for this request, in order. */
  freshSigners: readonly string[];
  /** The off-chain reader's public key, when the request asked for one. */
  viewer?: string;
}

export interface FreshSignatureRequest {
  /** The calling Powerup's manifest id; must declare `freshSigners: true`. */
  powerupId: string;
  /** Must be 'solana-devnet'. */
  networkId: SolanaNetworkId;
  /** 0..MAX_FRESH_SIGNERS (1). */
  count: number;
  /** Also generate a viewer key; requires count === 1 (the read names freshSigners[0]). */
  viewer?: boolean;
  /** Build the transaction naming these keys; called again by core on refresh, same keys. */
  build: (keys: FreshSignerKeys) => Promise<TransactionProposal>;
}

/** The Encrypt read authorization, signed by the viewer key core already discarded. */
export interface ReadAuthorization {
  message: Uint8Array;   // 43 bytes, research R6
  signature: Uint8Array; // 64 bytes
  signer: Uint8Array;    // 32 bytes, the viewer's public key
}

export interface SignedResult {
  signature: string;
  /** Present only for a request with `viewer: true` whose transaction confirmed. */
  readAuthorization?: ReadAuthorization;
}

export type FreshSignersRefusal = 'undeclared' | 'network' | 'count';

export class FreshSignersRefusedError extends Error {
  readonly reason: FreshSignersRefusal; // message: 'transaction.errors.buildFailed'
}
```

Context value: `requestFreshSignature(request: FreshSignatureRequest): Promise<SignedResult>`; hook `useRequestFreshSignature()`.

Provider prop: `freshSigning?: { powerupIds: readonly string[]; networkId: string | null }`. Absent means every request is refused with `undeclared`.

## Behaviour

| Situation | Result | Keys generated? |
| --- | --- | --- |
| Another request parked | rejects `Error('transaction.errors.confirmationBusy')` | no |
| `powerupId` not declared | rejects `FreshSignersRefusedError('undeclared')` | no |
| request or active network not `solana-devnet` | rejects `FreshSignersRefusedError('network')` | no |
| `count` outside `0..1`, or `viewer` with `count !== 1` | rejects `FreshSignersRefusedError('count')` | no |
| watch-only or no account | rejects `NoSigningAccountError` | no |
| `build` throws | rejects with that same error | yes, dropped |
| built `networkId` differs, fee payer is not the user, signer set ≠ {user} ∪ `freshSigners` (count or members), or a program outside `expect.allowedPrograms` | rejects `SolanaTransactionMismatchError` before the screen | yes, dropped |
| user cancels | rejects `SignatureRequestCancelledError` | dropped |
| active network changed to non-devnet before confirm | rejects `FreshSignersRefusedError('network')` | dropped |
| sent, outcome unknown | screen offers Close; rejects `SolanaOutcomeUnknownError` on close | dropped at once |
| signing or sending failed (retryable) | error on the screen, request stays parked | kept for the retry, dropped on cancel |
| confirmed | receipt; resolves `{ signature, readAuthorization? }` on dismissal | dropped at confirmation |

Signing order at confirm: fresh blockhash onto the compiled message (`core/broadcast/solana.ts:104-110`), then every fresh signer, then the user, in one `signAndSendSolanaTransaction` call; nothing is signed before the user confirms.

Guarantees (tested): no `CryptoKey`, `KeyPairSigner` or secret bytes reach `build`'s argument or the resolved value; the user's signer never signs a message (`signMessages` not called); keys never touch storage or logs; a request without this capability (`requestSignature`) runs the unchanged path.
