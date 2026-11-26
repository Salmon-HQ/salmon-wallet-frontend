# Data model: atomic wallet save (spec 046)

No existing record changes shape. One key is added (the first-save note). This file lists the records a wallet change touches, their role in the write orders (plan.md §The write orders), and the in-between states the next launch must show correctly.

## Stored records (`storage/types.ts:177-249`)

| Record                        | Key                                                      | Shape                                                                           | Role                                                                                                                                               |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wallet list                   | `salmon_accounts`                                        | `StoredAccount[]`                                                               | **Deciding write** of add, remove, edit. Present but not an array → a save refuses; never empty or listed                                          |
| Vault                         | `salmon_mnemonics`                                       | encrypted `LockedVault` (`nonce` fresh per write); cleartext for unprotected v2 | Before the list on add; after it on remove; replaced entry leaves after the list. "No vault" = key absent                                          |
| **First-save note (new)**     | `salmon_first_save_pending`                              | the `nonce` string of the vault the first save writes                           | Written before that vault; removed after the list (best effort); removed last by `clearAccountsStorage`                                            |
| Name counter                  | `salmon_account_counter`                                 | number                                                                          | After the list; `max(counter, list length) + 1`                                                                                                    |
| Active wallet, network, slot  | `salmon_active_account_id`, `_network_id`, `_path_index` | id, network id, number                                                          | After the list; fallback and healing                                                                                                               |
| Backup pending                | `salmon_unconfirmed_phrases`                             | `string[]`                                                                      | New mark before the list; separate best-effort prune after it and at launch                                                                        |
| Unlock penalty                | `salmon_unlock_attempts`                                 | attempts record                                                                 | Removed by the discard                                                                                                                             |
| Legacy v2 record              | `salmon_wallets` (+ `salmon_active`, `salmon_endpoints`) | v2 shapes                                                                       | Present → not a first save                                                                                                                         |
| Session key (stash)           | `derived_key_cache`                                      | `DerivedKeyCache`                                                               | Removed by the discard, by a first save before it reads or encrypts, by `clearAll` before storage; replaced by the key a supplied password derives |
| Landed nonce (runtime memory) | —                                                        | string                                                                          | Set when a first save's list lands; the discard never matches it in that runtime                                                                   |

## Secret identity

| Kind        | Duplicate of a listed wallet when                                                                                                 | Already saved (P5) when                                                    | Adopted when  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------- |
| Phrase      | normalized phrase equal and new start held on any network; or its Solana address at its start is a listed single-address wallet's | same id and equal entry; or empty window, exactly equal phrase, same start | exactly equal |
| Private key | its address is a listed Solana address                                                                                            | same id and equal entry; or empty window, exactly equal                    | exactly equal |
| Watched     | same                                                                                                                              | same                                                                       | exactly equal |
| Seed Vault  | held by a listed non-Seed-Vault wallet (refuse); by a listed Seed Vault wallet (replace)                                          | same                                                                       | exactly equal |

A listed wallet's Solana addresses: phrase at each index of its `solana-*` `pathIndexes`; private key decoded; watched and Seed Vault from the secret. Entries that cannot be derived are skipped.

## States the next launch may meet

| Stored state                                      | Produced by                                                                                     | Next launch                                                         |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Note = vault nonce, list absent or `[]`           | first save stopped after its vault, before its list                                             | discard, welcome                                                    |
| Note, vault absent                                | first save stopped before its vault                                                             | note removed, welcome                                               |
| Note, vault nonce different                       | note removal failed, then a later vault write                                                   | note removed (inert anyway)                                         |
| Note, listed wallet                               | first save stopped after its list                                                               | note removed best effort; wallets load                              |
| Vault + empty list + no note                      | pre-046 failed first save; failed "Remove all"; interrupted migration                           | unchanged: lock screen / existing-password prompt / recover refused |
| List present, not an array                        | corruption                                                                                      | no discard, no prune; loader error as today                         |
| Unlisted vault entry                              | save stopped before its list; replace before its last vault write; removal's vault write failed | invisible, kept                                                     |
| Active id not listed; unheld pair; counter behind | stops after the list                                                                            | fallback, healing, `max` rule                                       |
| Stale mark                                        | failed or stopped save                                                                          | pruned at the next save or launch                                   |

## Invariants asserted after every failure and every kill

1. Every listed id has its vault entry (FR-017).
2. Every entry present before is still there, except an unlisted exact copy of the secret saved, the replaced Seed Vault entry after the list, the removed wallet's entry, and the bound discard (FR-016).
3. Before the deciding write: wallets, secrets, active wallet, slot, counter, password as before. After it: wallets and entries as after; active = previous (or new if its selection landed) on a held slot; counter right or one behind (FR-001, FR-004, FR-005).
4. At most one listed wallet per secret identity (FR-010).
5. A listed `unconfirmed` wallet is marked; after the next save or launch every mark is named by a listed `id` or `derivedFrom` (FR-018, FR-019).
6. A vault is never re-encrypted under a key a supplied password does not derive (FR-005).
