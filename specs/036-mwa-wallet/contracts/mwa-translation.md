# Contract: MWA ↔ Salmon dApp approval (`packages/shared`)

Pure functions, no key access, Vitest-covered. Exported from `@salmon/shared` (new module `utils/mwa.ts`).

```ts
type SalmonSolanaNetworkId = 'solana-mainnet' | 'solana-devnet';

/** MWA chain or legacy cluster → Salmon network; null when unsupported. */
function mwaChainToNetworkId(chain: string | undefined): SalmonSolanaNetworkId | null;

/** Host of the dApp's declared identity URI; null when missing or not http(s). */
function mwaIdentityDomain(identityUri: string | undefined): string | null;

/** Wire transactions → the existing request shapes. */
function toSignAllTransactionsRequest(id: string, wires: Uint8Array[]): DAppSignAllTransactionsRequest;
function toSignAndSendRequest(id: string, wire: Uint8Array, options: MwaSendOptions): DAppSignAndSendTransactionRequest;

/** Place this wallet's signature into the dApp's wire transaction, keeping every other signature. */
function withSignature(wire: Uint8Array, signer: string, signatureBs58: string): Uint8Array;

/** True when the request's token, domain, network and address match a stored trusted app. */
function isMwaAuthorizationValid(args: {
  trustedApps: TrustedApps; domain: string; networkId: string; address: string; authorizationScope: Uint8Array;
}): boolean;

/** New random authorization token (32 bytes). */
function newMwaAuthToken(): Uint8Array;
```

`MwaSendOptions` = `{ minContextSlot?, commitment?, skipPreflight?, maxRetries? }`, passed through as the existing `params.options`.

## Response mapping (`apps/mobile`)

| Outcome | Bridge response |
|---|---|
| user declines / back gesture | `{ failReason: UserDeclined }` |
| unsupported chain, missing identity, watch-only account | `{ failReason: UserDeclined }` after showing why |
| token/domain/network/address mismatch | `{ failReason: AuthorizationNotValid }` |
| more payloads than advertised | `{ failReason: TooManyPayloads }` |
| unreadable transaction, lookalike message | `{ failReason: InvalidSignatures, valid: boolean[] }` (false at each refused payload) |
| sign-and-send: a send fails | `{ failReason: InvalidSignatures, valid: boolean[] }` (false from the failed one on; later ones are not sent) |
| authorize ok | `{ accounts: [{ publicKey, accountLabel, chains, features }], authorizationScope, signInResult? }` |
| signTransactions ok | `{ signedPayloads: Uint8Array[] }` (full wire transactions) |
| signMessages ok | `{ signedPayloads: Uint8Array[] }` — exact byte layout (signature alone or message + signature) to be confirmed against the official fakewallet before implementing |
| signAndSend ok | `{ signedTransactions: Uint8Array[] }` (signatures) |

The bridge's `MWARequestFailReason` has exactly four values: `UserDeclined`, `TooManyPayloads`, `InvalidSignatures`, `AuthorizationNotValid` (read from `resolve.ts` 1.4.5). The protocol has no separate "not submitted" reason in this bridge, so send failures use `InvalidSignatures`.
