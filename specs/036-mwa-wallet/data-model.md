# Data Model: Mobile Wallet Adapter wallet

## TrustedApp (existing, `packages/shared/src/types/trusted-app.ts`) — one optional field added

| Field | Type | Notes |
|---|---|---|
| name | string? | existing — dApp's declared `identityName` |
| icon | string? | existing — absolute icon URL (`identityUri` + `iconRelativeUri`) |
| address | string? | existing — the account the user approved |
| **authToken** | string? | **new** — bs58 of the random 32-byte `authorizationScope` returned to an MWA dApp. Absent for extension-trusted sites. |

Stored as today: `TrustedApps[origin][networkId]`. `origin` = origin of `identityUri` (`https://jup.ag`), the same key the extension uses.

**Validation (every non-authorize request)**: entry exists for `domain` on the active network, `authToken` equals the request's `authorizationScope`, and `address` equals the active account's address. Any mismatch → `AuthorizationNotValid`.

**Transitions**
- authorize approved → entry written (new token each time).
- reauthorize with valid token → unchanged (token re-issued as the same value).
- deauthorize, or user revokes in Settings → entry removed → token invalid.

## MwaRequest (in memory only)

The bridge's request as received (`AuthorizeDapp`, `ReauthorizeDapp`, `DeauthorizeDapp`, `SignMessages`, `SignTransactions`, `SignAndSendTransactions`), queued one at a time. Never persisted.

## Network mapping

| MWA `chain` | Salmon network |
|---|---|
| `solana:mainnet`, `mainnet-beta` | `solana-mainnet` |
| `solana:devnet`, `devnet` | `solana-devnet` |
| anything else | refused |

## Limits advertised to dApps

| Setting | Value |
|---|---|
| maxTransactionsPerSigningRequest | 10 |
| maxMessagesPerSigningRequest | 10 |
| supportedTransactionVersions | `0`, `'legacy'` |
| supportsSignAndSendTransactions | true |
| optionalFeatures | `solana:signInWithSolana` |
