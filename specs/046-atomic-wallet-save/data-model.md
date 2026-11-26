# Data model: atomic wallet save (spec 046)

No record, key or shape changes. This file lists the records a wallet change touches, the role each plays in the write orders (plan.md §The write orders), and the in-between states the next launch must show correctly.

## Stored records (unchanged shapes, `storage/types.ts:177-249`)

| Record                         | Key                                                      | Shape                                                                                                                                        | Role in a change                                                                 |
| ------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Wallet list                    | `salmon_accounts`                                        | `StoredAccount[]`: id, name, avatar, `pathIndexes`, `derivedFrom?`                                                                           | **Deciding write** of add, remove and edit. The loader builds only what it names |
| Vault                          | `salmon_mnemonics`                                       | encrypted `{ encrypted, nonce, salt, iterations, isEncrypted }` over `Record<id, StoredSecret>`; cleartext record for unprotected v2 wallets | Before the list on add, after it on remove                                       |
| Name counter                   | `salmon_account_counter`                                 | number                                                                                                                                       | After the list on add; next value `max(counter, list length) + 1`                |
| Active wallet                  | `salmon_active_account_id`                               | id                                                                                                                                           | After the list; a dangling id falls back to the first listed wallet              |
| Active network                 | `salmon_active_network_id`                               | network id                                                                                                                                   | After the list; healed to a network the active wallet holds                      |
| Active slot                    | `salmon_active_path_index`                               | number                                                                                                                                       | After the list; healed to a slot the active wallet holds                         |
| Backup pending                 | `salmon_unconfirmed_phrases`                             | `string[]` of wallet ids, no secret                                                                                                          | Before the list on add (with `unconfirmed`); pruned at launch                    |
| Legacy v2 record               | `salmon_wallets` (+ `salmon_active`, `salmon_endpoints`) | v2 shapes                                                                                                                                    | Read only: present → the discard keeps the vault                                 |
| Session key (stash, in memory) | `derived_key_cache`                                      | `DerivedKeyCache`                                                                                                                            | Removed by the discard (launch and first save)                                   |

## Secret identity (what "the same secret at the same position" means)

| Kind        | Stored as                                                 | Same as a listed wallet when                                                                   |
| ----------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Phrase      | bare string (`utils/account-secret.ts:61-62`)             | `normalizeMnemonic` equal, and the new start is an index the listed wallet holds (any network) |
| Private key | `{ kind, privateKey, networkId }`                         | it gives an address a listed wallet holds                                                      |
| Watched     | `{ kind, address, networkId }`                            | its address is held by a listed wallet                                                         |
| Seed Vault  | `{ kind, authToken, derivationPath, address, networkId }` | a listed Seed Vault wallet has the address → **replace**; another kind holds it → refuse       |

Starting position of a new phrase wallet: the `startIndex` it was built with, which is the lowest index in its `pathIndexes` (`factories/account-factory.ts:102-111`). `derivedFrom` is display metadata and plays no part.

An **unlisted copy** is a vault entry whose id the list does not name and whose stored secret equals the one being saved (phrase compared after normalising). It is dropped by that save; every other unlisted entry is kept.

## States the next launch may meet, and what it shows

| Stored state                                                                        | Produced by                                                                                                           | Next launch                                                                                 | Code                                               |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Vault present, list `null` or `[]`, no `salmon_wallets`, vault encrypted or corrupt | first save stopped after the vault; last wallet removed with unlisted secrets left; `clearAll` stopped after the list | **discarded**, welcome screen                                                               | `discardVaultWithoutWallets` (new)                 |
| Same, but `salmon_wallets` present                                                  | legacy migration stopped after its vault                                                                              | kept (lock screen with no wallets, as today; out of scope)                                  | exclusion                                          |
| Same, but vault in the clear                                                        | password-less v2 wallet                                                                                               | kept, protect mode                                                                          | exclusion; `useAccountsSecurityHelpers.ts:172-176` |
| List unreadable (read throws)                                                       | storage failure                                                                                                       | init-failed gate, nothing deleted                                                           | exclusion; `useAccountsSecurity.ts:306-310`        |
| Vault entry no listed wallet names                                                  | save stopped before the list; removal stopped before the vault                                                        | invisible, kept                                                                             | `useAccountsLoader.ts:85-94`                       |
| Active id not in the list                                                           | removal of the active wallet stopped after the list                                                                   | first listed wallet                                                                         | `useAccountsLoader.ts:122-125`                     |
| Network or slot the active wallet does not hold                                     | add or removal stopped mid-selection                                                                                  | nearest pair the wallet holds, written back                                                 | `useAccountsSelection.ts:87-98`                    |
| Counter behind the list                                                             | add stopped between the list and the counter; `clearAll` stopped after its first removal                              | shown as stored (it is never displayed); the next save uses `max(counter, list length) + 1` | `addAccount` (changed)                             |
| Mark naming no listed wallet (by `id` or `derivedFrom`)                             | save stopped or failed before the list                                                                                | pruned                                                                                      | launch prune (new)                                 |

## Invariants the tests assert after every failure and every kill

1. Every listed wallet has its secret in the vault (FR-017).
2. Every secret in the vault before the change is still there, except the unlisted copy of the secret just saved, and except under FR-006 (FR-016).
3. The list, the active wallet with its network and slot, the counter and the password are the before-state or the after-state (FR-001, FR-004, FR-005), allowing only the healed selection and the counter-behind state above, both of which the user cannot tell from the after-state.
4. At most one listed wallet per secret identity (FR-010).
5. A listed wallet created with `unconfirmed` is marked; every mark is named by a listed wallet's `id` or `derivedFrom` after the next launch (FR-018, FR-019).

## State transitions of one save

```text
before ──(reads, duplicate check: refuse → before)──▶ before
before ──(marks, vault written: invisible)──────────▶ before (as seen)
before ──(list written: deciding)───────────────────▶ after (memory updated here)
after  ──(counter, selection: repairable if missing)▶ after
```
