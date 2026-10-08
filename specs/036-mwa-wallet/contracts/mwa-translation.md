# Contract: MWA ↔ Salmon dApp approval (`packages/shared`)

Pure functions, no key access, Vitest-covered. Exported from `@salmon/shared` (new module `utils/mwa.ts`).

```ts
/** MWA chain or legacy cluster → Salmon network; null when unsupported. */
function mwaChainToNetworkId(chain: string | undefined): 'solana-mainnet' | 'solana-devnet' | null;

/** Origin of the dApp's declared identity URI (trusted-apps key, same as the extension); null when missing or not http(s). */
function mwaIdentityOrigin(identityUri: string | undefined): string | null;

/** Wire transactions → the existing request shapes. Throws on bytes that are not a transaction. */
function toSignAllTransactionsRequest(
  id: string,
  wires: Uint8Array[]
): DAppSignAllTransactionsRequest;
function toSignAndSendRequest(
  id: string,
  wire: Uint8Array,
  options: MwaSendOptions
): DAppSignAndSendTransactionRequest;

/** Place this wallet's signature into the dApp's wire transaction, keeping every other signature. */
function withSignature(wire: Uint8Array, signer: string, signatureBs58: string): Uint8Array;

/** Authorization token: 32 random bytes; stored bs58 on the trusted app. */
function newMwaAuthToken(): Uint8Array;
function encodeMwaAuthToken(token: Uint8Array): string;

/** Valid only for the trusted app's stored token and the account it was shown. */
function isMwaAuthorizationValid(
  app: TrustedApp | undefined,
  address: string,
  authorizationScope: Uint8Array
): boolean;
```

`MwaSendOptions` = `{ minContextSlot?, commitment?, skipPreflight?, maxRetries? }`, passed through as the existing `params.options`.

## Response mapping (`apps/mobile`)

| Outcome                                                 | Bridge response                                                                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| user declines / back gesture                            | `{ failReason: UserDeclined }`                                                                                                                                      |
| unsupported chain, missing identity, watch-only account | `{ failReason: UserDeclined }` after showing why                                                                                                                    |
| token/domain/network/address mismatch                   | `{ failReason: AuthorizationNotValid }`                                                                                                                             |
| more payloads than advertised                           | `{ failReason: TooManyPayloads }`                                                                                                                                   |
| unreadable transaction, lookalike message               | `{ failReason: InvalidSignatures, valid: boolean[] }` (false at each refused payload)                                                                               |
| sign-and-send: a send fails                             | `{ failReason: InvalidSignatures, valid: boolean[] }` (false from the failed one on; later ones are not sent)                                                       |
| authorize ok                                            | `{ accounts: [{ publicKey, accountLabel, chains, features }], authorizationScope, signInResult? }`                                                                  |
| signTransactions ok                                     | `{ signedPayloads: Uint8Array[] }` (full wire transactions)                                                                                                         |
| signMessages ok                                         | `{ signedPayloads: Uint8Array[] }` — exact byte layout (signature alone or message + signature) to be confirmed against the official fakewallet before implementing |
| signAndSend ok                                          | `{ signedTransactions: Uint8Array[] }` (signatures)                                                                                                                 |

The bridge's `MWARequestFailReason` has exactly four values: `UserDeclined`, `TooManyPayloads`, `InvalidSignatures`, `AuthorizationNotValid` (read from `resolve.ts` 1.4.5). The protocol has no separate "not submitted" reason in this bridge, so send failures use `InvalidSignatures`.
