# Data Model: Mobile on Expo SDK 57

The upgrade adds no data. It must leave three existing things unchanged, and
moves one on purpose.

## Invariants (must not move)

### Recovery phrase → accounts

- **What**: the deterministic mapping from a BIP-39 phrase to account
  addresses per chain and index (Solana `m/44'/501'/{i}'/0'`, Bitcoin and
  Ethereum on their existing paths).
- **Check**: the public test phrase (`abandon … about`) recovered on the
  SDK 55 build and on the SDK 57 build yields identical addresses for
  indexes 0–2 on every chain (SC-001).
- **Owner of the logic**: `packages/shared/src/crypto/mnemonic.ts`, with PBKDF2
  accelerated by the native module behind `crypto/fastCrypto.native.ts`.

### Stored vault and unlock state

- **What**: the encrypted vault, password verifier, biometric secret and the
  unlock-throttle record, in AsyncStorage / expo-secure-store.
- **Check**: install the SDK 55 build, create a wallet, install the SDK 57
  build over it (same package, no uninstall), unlock with password and with
  biometrics; wrong-password throttling behaves the same.

### Locked identifiers

- Bundle id / Android package `io.salmonwallet.app`, Expo slug and EAS
  `projectId`, the `salmonwallet://` scheme — untouched.

## Changes on purpose

### App version and native fingerprint

- `apps/mobile/app.json → expo.version` is already `1.2.0`, a version that
  has not shipped (the last binary is `1.1.0`, the fingerprint baseline), so
  the native fingerprint check already treats the next release as a binary.
  No bump is needed unless `1.2.0` ships before this lot does.
- `apps/mobile/native-fingerprint.json` is refreshed with
  `fingerprint:write` when the store binary is built, not before.

### iOS deployment target

- 15.1 → 16.4, set by the SDK through CNG; not edited by hand.
