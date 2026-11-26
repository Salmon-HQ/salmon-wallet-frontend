# Data model: atomic wallet save (spec 046)

No record changes shape and no key is added. This file lists the records a wallet change touches, their role in the write orders (plan.md §The write orders), and the in-between states the next launch must show correctly.

## Stored records (`storage/types.ts:177-249`)

| Record                       | Key                                                      | Shape                                                 | Role                                                                                                                                                                                      |
| ---------------------------- | -------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wallet list                  | `salmon_accounts`                                        | `StoredAccount[]`                                     | **Deciding write** of add, remove, edit; a thrown write is settled by reading it back (Rule 2). Not an array, or absent/`[]` while memory holds wallets → reject (Rule 1)                 |
| Vault                        | `salmon_mnemonics`                                       | encrypted `LockedVault`; cleartext for unprotected v2 | Before the list on add; after it on remove; a replaced Seed Vault entry leaves after the list. Unparseable, or absent while the list names a wallet or `WALLETS` exists → reject (Rule 1) |
| Name counter                 | `salmon_account_counter`                                 | number                                                | After the list; `max(counter, list length) + 1`                                                                                                                                           |
| Active wallet, network, slot | `salmon_active_account_id`, `_network_id`, `_path_index` | id, network id, number                                | After the list; fallback and healing                                                                                                                                                      |
| Backup pending               | `salmon_unconfirmed_phrases`                             | `string[]`                                            | New mark before the vault; best-effort prune after the list and at launch, only when the list reads as an array                                                                           |
| Unlock penalty               | `salmon_unlock_attempts`                                 | attempts record                                       | Grows on a failed password proof, as on a failed unlock                                                                                                                                   |
| Legacy v2 record             | `salmon_wallets` (+ `salmon_active`, `salmon_endpoints`) | v2 shapes                                             | Present with no vault → reject (Rule 1)                                                                                                                                                   |
| Session key (stash)          | `derived_key_cache`                                      | `DerivedKeyCache`                                     | Removed by a save with no vault key before it encrypts, and by `clearAll` before storage; replaced by the key a supplied password derives                                                 |

## Held positions of a phrase wallet

`StoredAccount.pathIndexes` maps each network id to an array where slot i holds i or `null`. Held positions = every non-null value in every array. Starting position = the smallest held position. Positions grow later through mirror networks and derived-account edits; the duplicate rule tests a new start against the whole held set.

## Secret identity

| Kind        | `DuplicateAccountError` when (own id excluded)                                                                                                            | Replaced when                            | Unlisted copy dropped when |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------- |
| Phrase      | a listed phrase wallet with an equal phrase after normalising holds the new start; or its Solana address at its start is a listed single-address wallet's | —                                        | exactly equal              |
| Private key | its address is a Solana address of a listed wallet                                                                                                        | —                                        | exactly equal              |
| Watched     | a listed watched wallet has the same address, or it is a Solana address of a listed wallet                                                                | —                                        | exactly equal              |
| Seed Vault  | its address is a Solana address of a listed non-Seed-Vault wallet                                                                                         | a listed Seed Vault wallet, same address | exactly equal              |

## States the next launch may meet

| Stored state                                      | Produced by                                                                                                        | Next launch                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Vault, list absent or `[]`                        | first save stopped after its vault; failed "Remove all"; interrupted migration                                     | extension: lock screen, the vault's password opens the setup screens; mobile: welcome, setup needs that password |
| Vault key present but unparseable                 | corruption                                                                                                         | nothing removed; every mutation rejects                                                                          |
| List present, not an array                        | corruption                                                                                                         | no prune; loader error as today                                                                                  |
| Unlisted vault entry                              | save stopped before its list; Seed Vault replace stopped before its last vault write; removal's vault write failed | invisible, kept; taken over by a save of the exact secret                                                        |
| Active id not listed; unheld pair; counter behind | stops after the list                                                                                               | fallback, healing, `max` rule                                                                                    |
| Stale mark                                        | failed or stopped save                                                                                             | pruned at the next save, or at launch when the list reads as an array                                            |

## Invariants asserted after every failure and every kill

1. Every listed id has its vault entry (FR-017).
2. Every entry present before is still there, except an unlisted exact copy of the secret saved, the save's own id (overwritten with the same secret), the replaced Seed Vault entry after the list, and the removed wallet's entry (FR-016).
3. Before the deciding write: wallets, secrets, active wallet, slot, counter, password and memory as before. After it: wallets and entries as after; active = previous (or new if its selection landed) on a held slot; counter right or one behind (FR-001, FR-004, FR-005).
4. A resolved mutation left storage with the change; a rejected one whose list write threw left a read-back without it.
5. At most one listed wallet per secret identity (FR-010).
6. A listed `unconfirmed` wallet is marked; after the next save every mark is named by a listed `id` or `derivedFrom` (FR-018, FR-019).
7. A vault is never re-encrypted under a key a supplied password does not derive (FR-005).
