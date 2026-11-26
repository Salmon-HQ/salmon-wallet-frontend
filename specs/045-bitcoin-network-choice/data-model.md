# Data model: Bitcoin network choice (spec 045)

One thing is stored: whether the user wants Bitcoin shown, inside the settings record the device already keeps. Everything else is derived on each render.

## Bitcoin choice (stored)

A new optional field of `UserConfig` (`packages/shared/src/types/account.ts`), saved under the existing `STORAGE_KEYS.SETTINGS` record. No new storage key; `packages/shared/src/storage` and `crypto` are not touched.

| Field            | Type                   | Rule                                                           |
| ---------------- | ---------------------- | -------------------------------------------------------------- |
| `bitcoinEnabled` | `boolean \| undefined` | `false` = "Solana only". `true` or absent = "Solana + Bitcoin" |

- **Absent** (every install set up before this feature; a fresh install set up by Seed Vault, private key or watch-only) reads as on (FR-003, decision 2). Loading writes nothing.
- **Anything but `false`** reads as on (`config.bitcoinEnabled !== false`). A damaged record can only show more, never hide funds.
- **Scope**: one per install, every wallet (FR-001). Not synced (FR-004).
- **Writers**: the onboarding step (`saveBitcoinChoice`), the Settings switch (`setBitcoinEnabled`). Both go through `persistPatch`'s read-merge-write queue, so the choice never erases another setting and no other setting erases it (FR-013, FR-018).
- **Survives "Remove all wallets"**: the settings record is not cleared; the next phrase setup asks again and overwrites it (FR-009).

## Offered networks (derived, never stored)

`visibleNetworkIds({ enabled, held, developerNetworks, activeNetworkId, bitcoinEnabled })`, per network id in the backend's order:

1. Not enabled by the backend → out (unchanged; the choice never adds a network).
2. Not held by the active wallet (when `held` is given) → out (unchanged).
3. **`isNetworkChosen(id, bitcoinEnabled)` is false → out.** True for every id unless `bitcoinEnabled` is false and the id's family is `bitcoin` (`bitcoin-mainnet`, `bitcoin-testnet`).
4. A mainnet → in. Otherwise in when Developer Networks is on or it is the active network (unchanged).

Step 3 runs before step 4, so neither Developer Networks nor a session standing on Bitcoin brings Bitcoin back (spec edge "Bitcoin test network", FR-016).

## Session network (existing, `STORAGE_KEYS.NETWORK_ID`)

| From                                   | Event                                                                               | To                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------- |
| `bitcoin-mainnet` or `bitcoin-testnet` | Switch turned off and confirmed                                                     | `solana-mainnet`, before the choice is written |
| `bitcoin-*`                            | Unlocked session with the choice off (open, or written in another extension window) | `solana-mainnet`, once the record has loaded   |
| any Solana network                     | Switch turned off or on                                                             | unchanged                                      |

## Bitcoin data that stays (unchanged, listed so nothing is cleaned up by mistake)

| Data                               | Where                                   | While off                                   |
| ---------------------------------- | --------------------------------------- | ------------------------------------------- |
| Bitcoin and Bitcoin-test addresses | each phrase wallet's `networksAccounts` | still derived at create, unlock, add-wallet |
| Bitcoin contacts                   | `STORAGE_KEYS.CONTACTS`                 | kept; not listed (adapter skips them)       |
| Explorer choice for Bitcoin        | `UserConfig.explorers.BITCOIN`          | kept                                        |
| Derived-scan marks                 | `UserConfig.derivedScannedAccountIds`   | kept                                        |

## Settings write path (changed, shared by every setting)

`persistPatch(patch, from?)` in `useUserConfig.ts`: one write at a time; re-read, merge, write; then hand the merged record to every mounted instance except `from`. `commit` passes its own instance as `from`; `saveBitcoinChoice` passes nothing, so every mounted instance (the extension's provider during onboarding) receives it.
