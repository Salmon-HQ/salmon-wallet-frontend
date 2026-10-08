# Implementation Plan: Seed Vault accounts on Android (Solana Seeker)

**Branch**: `feat/seeker-seed-vault` (spec dir `037-seed-vault`) | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/037-seed-vault/spec.md`

## Summary

A new account kind, `seedVault`, joins `mnemonic`, `privateKey` and `watchOnly`. It carries the Seed Vault authorization, the derivation path and the public address — never a key. Its Solana account is the existing `SolanaAccount` with a different signer: instead of a `KeyPairSigner` holding a `CryptoKey`, a `SeedVaultSigner` that implements kit's `TransactionPartialSigner` and `MessagePartialSigner` by asking Seed Vault. The six places that reach into `account.signer.keyPair` today go through two helpers that accept any such signer, so a key-holding account and a Seed Vault account sign by the same path and every feature (send, swap, NFT, Powerups, Mobile Wallet Adapter, SIWS) works for both without per-feature code. Seed Vault is reached through the React Native bridge Solana Mobile publishes (`@solana-mobile/seed-vault-lib`), wrapped behind a small app-side module so it can be replaced by our own native module if it fails on RN 0.86.

## Technical Context

**Language/Version**: TypeScript 5 (React Native 0.86.3, Expo SDK 57)

**Primary Dependencies**: `@solana-mobile/seed-vault-lib` 0.4.1 (new, pinned); existing `@solana/kit`, `expo/config-plugins`

**Storage**: the existing encrypted secret vault gains one tagged entry kind (`seedVault`); no key material is added

**Testing**: Vitest (`packages/shared`) for the signer, signing helpers and account restore; Jest (`apps/mobile`) for the Seed Vault adapter; Maestro on the `Seeker_API35` emulator with the Seed Vault simulator

**Target Platform**: Android devices with a secure Seed Vault (Seeker). Hidden on every other Android, iOS and the extension.

**Project Type**: mobile app in a pnpm monorepo

**Constraints**: native dependency → new binary, no OTA; fingerprint baseline from CI's Linux hash; the privileged permission must never be declared

**Scale/Scope**: 1 account kind, 1 signer, 2 signing helpers replacing 6 call sites, 1 add-wallet flow (welcome + Add wallet), 1 removal hook, copy

## Constitution Check

| Principle                    | Status                                                                                                                                                                                                                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Ownership boundaries      | ✅ Account kind, signer, signing helpers, restore → `packages/shared` (blockchain + types). Seed Vault bridge, add flow and screens → `apps/mobile`. The signer receives the bridge by injection, so `packages/shared` imports nothing native.                                                 |
| II. Shared code consumers    | ⚠️ `SolanaAccount.signer` widens from `KeyPairSigner` to kit's signer interfaces, and six call sites change from `signer.keyPair` to the helpers. The extension consumes the same code: its accounts keep `KeyPairSigner`, which satisfies the wider type, and its suites must pass unchanged. |
| III. Wallet safety           | ⚠️ Changes the signing path for every account and adds an account kind to the secret vault. Key-holding accounts must sign byte-identically before and after (golden tests already exist for prepared transactions). **Requires owner sign-off before implementation.**                        |
| IV. Bilingual copy           | ✅ New keys under `wallet.seedVault.*`, EN + ES, flagged for owner review.                                                                                                                                                                                                                     |
| V. Functional coverage first | ✅ Vitest for helpers, signer and restore; Jest for the adapter; one Maestro flow.                                                                                                                                                                                                             |
| VI. Ask rather than guess    | ✅ Open decision listed below for the owner.                                                                                                                                                                                                                                                   |

## Decisions for the owner

1. **Bridge.** Use Solana Mobile's `@solana-mobile/seed-vault-lib` (Apache-2.0, labelled "community maintained, not production-tested"; legacy bridge, which the Mobile Wallet Adapter bridge also is and which works on RN 0.86 through interop), behind our adapter; if it fails on the simulator, replace it with our own ~200-line Expo module over the same native SDK. Alternative: write our own module from the start (slower, no third-party JS in the signing path).
2. **Batch size.** Seed Vault guarantees 3 signatures per confirmation; a dApp may send 10. Plan: split into chunks of the implementation's limit, so the user may confirm several times (spec US2 scenario 4).

## Design

### Account kind

`AccountSecret` gains:

```ts
{
  kind: 'seedVault';
  authToken: string;
  derivationPath: string;
  address: string;
}
```

`authToken` is Seed Vault's per-seed authorization id (a long, stored as a string), not a secret. Restore builds one `SolanaAccount` per Solana network with a `SeedVaultSigner` for `address`. `getAccountMnemonic` already returns null for non-mnemonic kinds, so recovery-phrase surfaces need no change; private-key export (`retrieveSecurePrivateKey`) moves off the base class onto key-holding accounts only.

### Signing path

```diff
 SolanaAccount
-  signer: KeyPairSigner            // CryptoKey inside
+  signer: TransactionPartialSigner & MessagePartialSigner
+          // KeyPairSigner (mnemonic, privateKey) or SeedVaultSigner

 core/broadcast/solana.ts, utils/dapp-approval.ts ×3
-  partiallySignTransaction([account.signer.keyPair], tx)
+  signTransactionWith(account.signer, tx)      // merges the signer's signature

 utils/dapp-approval.ts, sign-in.ts, offchain-message.ts
-  signBytes(account.signer.keyPair.privateKey, bytes)
+  signBytesWith(account.signer, bytes)         // 64-byte ed25519 signature
```

`transfer.ts` and every kit `…WithSigners` path already take a signer and need no change.

### Seed Vault signer

`SeedVaultSigner` (shared, pure): `address`, `signTransactions(txs)` sends each transaction's message bytes (Seed Vault signs the message, not the wire transaction) and returns `{ [address]: signature }`; `signMessages(msgs)` likewise for raw bytes. Requests are chunked to the implementation limit. A cancelled confirmation, an invalid authorization or a failure throws a typed error (`SeedVaultCancelled`, `SeedVaultAccessRevoked`, `SeedVaultUnavailable`) that the existing approval and send flows already surface as "not signed". The bridge is injected: `{ signTransactions(authToken, path, payloads), signMessages(authToken, path, payloads) }`.

### App side (`apps/mobile/src/seed-vault/`)

- `bridge.ts`: the only file importing `@solana-mobile/seed-vault-lib`; exposes availability (secure only in production builds, simulator in dev), permission request, authorize/create/import seed, list accounts, sign, deauthorize.
- Add flow: "Use Seed Vault" in the welcome screen and in Add wallet (shown only when available) → permission → authorize → the seed's accounts in the existing derived-accounts sheet → add.
- Removal: removing the last wallet of an `authToken` calls deauthorize.
- Lock: while a Seed Vault confirmation is open, Salmon's own activity goes to the background; the background lock in the Mobile Wallet Adapter root and any app-level lock must not fire during it.
- Manifest: the library merges `ACCESS_SEED_VAULT` and its `<queries>`; a config plugin asserts that `ACCESS_SEED_VAULT_PRIVILEGED` is absent from the final manifest.

## Project Structure

```text
packages/shared/src/
├── types/account.ts                      # + seedVault secret
├── blockchain/solana/
│   ├── SolanaAccount.ts                  # signer type widens; private-key export to key-holding accounts
│   ├── signing.ts                        # NEW signTransactionWith, signBytesWith
│   └── seed-vault-signer.ts              # NEW SeedVaultSigner + errors
├── core/broadcast/solana.ts              # uses signing.ts
├── utils/dapp-approval.ts                # uses signing.ts
├── blockchain/solana/{sign-in,offchain-message}.ts
├── hooks/useAccounts.ts                  # restore seedVault
└── locales/{en,es}                       # wallet.seedVault.*
apps/mobile/
├── src/seed-vault/{bridge.ts,useSeedVault.ts}
├── src/components/AccountAddPanel/       # + Use Seed Vault
├── app/(auth)/index.tsx                  # + Use Seed Vault on welcome
├── plugins/withSeedVaultGuard.js         # NEW: fail the build if the privileged permission appears
└── .maestro/seed-vault.yaml              # NEW
```

## Verification

1. `pnpm typecheck`, `pnpm lint`, shared Vitest, mobile Jest, extension suites unchanged.
2. Golden test: a key-holding account signs every prepared-transaction fixture byte-identically through the new helpers.
3. Simulator on `Seeker_API35`: add a Seed Vault wallet, send on devnet, run the seven MWA request types from the playground, cancel a confirmation, revoke in the simulator and see the refusal.
4. Final manifest contains `ACCESS_SEED_VAULT` and not `ACCESS_SEED_VAULT_PRIVILEGED`.
5. Real Seeker (partner): authorize the setup seed and sign one devnet transaction.

## Owner sign-off

2026-10-07 — Luca approved the plan (signing path change included), chose decision 1 as `@solana-mobile/seed-vault-lib` behind the adapter, and decision 2 as splitting batches into chunks.

## Follow-up

- Replace `@solana-mobile/seed-vault-lib` with an own Expo module over the native `com.solanamobile:seedvault-wallet-sdk`, because Solana Mobile labels the JS package community-maintained and not production-tested. Only `apps/mobile/src/seed-vault/bridge.ts` changes; it needs a new binary, not an OTA.
