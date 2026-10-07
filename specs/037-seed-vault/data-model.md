# Data model: Seed Vault accounts

## AccountSecret (extended)

| Kind | Fields | Key material in Salmon |
|---|---|---|
| mnemonic | mnemonic | yes |
| privateKey | privateKey, networkId | yes |
| watchOnly | address, networkId | no — cannot sign |
| **seedVault** | authToken, derivationPath, address, networkId | **no — Seed Vault signs** |

- `authToken`: Seed Vault's id for Salmon's access to one seed; string form of a long. Several wallets may share one.
- `derivationPath`: `m/44'/501'/X'/0'`.
- `address`: base58 public key returned by Seed Vault; must equal the signer's address.
- `networkId`: the one Solana network the wallet is on, as for `privateKey` and `watchOnly`; the add flow uses the network selected at that moment.
- Stored as a tagged entry in the existing encrypted secret vault, like `privateKey` and `watchOnly`.

## States of a Seed Vault wallet

```text
added ──sign──▶ confirming ──ok──▶ added
  │                 └──cancel/fail──▶ added (nothing signed)
  └──access revoked (seen on sign)──▶ revoked ──re-authorize same seed──▶ added
removed (last of its authToken) ──▶ Seed Vault access given up
```
