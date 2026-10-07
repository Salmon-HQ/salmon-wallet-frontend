# Research: Seed Vault accounts

Sources: solana-mobile/seed-vault-sdk (`WalletContractV1.java`, `SeedVault.java`, `Wallet.java`, `docs/integration_guide.md`, `js/packages/seed-vault`), issues #126 #548 #626 #637 #693, docs.solanamobile.com Seed Vault pages, Solflare/Phantom help. Read 2026-10-07.

## Access level
- Decision: standard `com.solanamobile.seedvault.ACCESS_SEED_VAULT` (runtime, dangerous) only.
- Rationale: the privileged permission is a signature permission granted only to certificates Seed Vault knows; the dApp Store CLI warns on it. Standard access can authorize, create and import seeds, sign transactions and messages, and read public keys.
- Not available to us: seed settings, backup status.

## Bridge
- Decision: `@solana-mobile/seed-vault-lib` 0.4.1 behind an app adapter (owner decision 1 in plan.md).
- Rationale: official repo, Apache-2.0, exposes availability, authorize/create/import, getAccounts, signTransaction(s), signMessage(s), getPublicKey, deauthorize; 0.4.1 fixed Expo issues (#626).
- Risk: legacy bridge module, "community maintained"; unverified on RN 0.86. Fallback: own Expo module over `com.solanamobile:seedvault-wallet-sdk:0.4.0`.

## Signing payload
- Decision: send the transaction's message bytes, not the wire transaction (issue #126); merge the returned signature into the transaction.
- Signatures are ed25519 (64 bytes); confirmed by test on the simulator before relying on it.
- Transaction v1 support landed upstream 2026-09-26; v0 and legacy are what Salmon signs today.

## Derivation
- Decision: `m/44'/501'/X'/0'`. Seed Vault pre-derives it on authorization (no extra prompt) and it is Salmon's default path.

## Limits and failures
- At least 3 signing requests and 3 signatures per request guaranteed; real limit read from `implementationlimits`. Chunk above it.
- `RESULT_INVALID_AUTH_TOKEN` after the user revokes → treat as revoked access.
- Issue #548: create/import may return an invalid auth token on real hardware → call authorize after create/import.

## Availability
- `isSeedVaultAvailable(allowSimulated)`: production `false`, development `true`.
- Simulator: `SeedVaultSimulator` (package `com.solanamobile.seedvaultimpl`), Android 12+, built from the SDK repo; test seeds only.

## Open (needs a real Seeker)
- Whether the seed created during Seeker setup is offered to a third-party wallet (Solflare/Phantom/Backpack flows suggest yes).
