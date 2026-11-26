# Data model: atomic wallet save (spec 046)

No existing record changes shape. One key is added (the first-save note). This file lists the records a wallet change touches, the role each plays in the write orders (plan.md §The write orders), and the in-between states the next launch must show correctly.

## Stored records (`storage/types.ts:177-249`)

| Record                         | Key                                                                                | Shape                                                                   | Role in a change                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Wallet list                    | `salmon_accounts`                                                                  | `StoredAccount[]`: id, name, avatar, `pathIndexes`, `derivedFrom?`      | **Deciding write** of add, remove and edit                                                                                     |
| Vault                          | `salmon_mnemonics`                                                                 | encrypted over `Record<id, StoredSecret>`; cleartext for unprotected v2 | Before the list on add (every listed id keeps its entry); after it on remove; a replaced entry leaves after the list           |
| **First-save note (new)**      | `salmon_first_save_pending`                                                        | `true`                                                                  | Written before the vault by a save starting on an empty device; removed after its list; removed last by `clearAccountsStorage` |
| Name counter                   | `salmon_account_counter`                                                           | number                                                                  | After the list; next value `max(counter, list length) + 1`                                                                     |
| Active wallet / network / slot | `salmon_active_account_id`, `salmon_active_network_id`, `salmon_active_path_index` | id, network id, number                                                  | After the list; dangling id falls back, pair healed                                                                            |
| Backup pending                 | `salmon_unconfirmed_phrases`                                                       | `string[]` of ids, no secret                                            | Before the list on add; pruned on every save and at launch                                                                     |
| Unlock penalty                 | `salmon_unlock_attempts`                                                           | attempts record                                                         | Removed by the discard                                                                                                         |
| Legacy v2 record               | `salmon_wallets` (+ `salmon_active`, `salmon_endpoints`)                           | v2 shapes                                                               | Read only: present → not a first save                                                                                          |
| Session key (stash)            | `derived_key_cache`                                                                | `DerivedKeyCache`                                                       | Removed by the discard, by a first save before it reads or encrypts, and by `clearAll` before storage                          |

## Secret identity

| Kind        | Stored as                                                 | Duplicate of a listed wallet when                                                                                                                 | Adopted (unlisted entry dropped) when |
| ----------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Phrase      | bare string                                               | `normalizeMnemonic` equal and the new start is an index that wallet holds; or its Solana address at its start is a listed single-address wallet's | stored string exactly equal           |
| Private key | `{ kind, privateKey, networkId }`                         | its address is held by a listed wallet                                                                                                            | exactly equal                         |
| Watched     | `{ kind, address, networkId }`                            | its address is held by a listed wallet                                                                                                            | exactly equal                         |
| Seed Vault  | `{ kind, authToken, derivationPath, address, networkId }` | a listed Seed Vault wallet has the address → **replace**; another kind holds it → refuse                                                          | exactly equal                         |

An address a listed phrase wallet holds: its Solana address at every distinct index in its `pathIndexes` values across all networks, derived with a pure function.

## States the next launch may meet

| Stored state                                  | Produced by                                                                                                                | Next launch                                                                      |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Note + list `null`/`[]` (vault or not)        | first save stopped before its list; discard stopped before its end                                                         | discard, welcome                                                                 |
| Note + listed wallet                          | first save stopped after its list                                                                                          | note removed; wallets load                                                       |
| Vault + empty list + no note                  | pre-046 failed first save; failed "Remove all"; interrupted migration                                                      | unchanged from today: lock screen (extension), existing-password prompt (mobile) |
| Cleartext vault                               | password-less v2 wallet                                                                                                    | unchanged, protect mode                                                          |
| List unreadable                               | storage failure                                                                                                            | init-failed gate, nothing removed                                                |
| Vault entry no listed wallet names            | save stopped before its list; replace stopped before its last vault write; removal whose vault write failed or did not run | invisible, kept                                                                  |
| Active id not in the list                     | removal of the active wallet stopped after the list                                                                        | first listed wallet                                                              |
| Pair the active wallet does not hold          | add or removal stopped mid-selection                                                                                       | nearest held pair, written back                                                  |
| Counter behind the list                       | add stopped between list and counter; `clearAll` stopped after its first removal                                           | next save uses `max(counter, list length) + 1`                                   |
| Mark named by no listed `id` or `derivedFrom` | save that failed or stopped before its list                                                                                | pruned (launch or next save)                                                     |

## Invariants asserted after every failure and every kill

1. Every listed id has its vault entry, at every position of every mutation (FR-017).
2. Every vault entry present before the change is still there, except an unlisted exact copy of the secret saved, the replaced Seed Vault entry after the list, the removed wallet's entry, and the FR-006 discard (FR-016).
3. Stopped before the deciding write: wallets, secrets, active wallet, slot, counter and password are exactly the before-state. Stopped after it: the wallets and their secrets are exactly the after-state; the active wallet is the previous one (or the new one if its selection landed) on a slot it holds; the counter is right or one behind (FR-001, FR-004, FR-005).
4. At most one listed wallet per secret identity (FR-010).
5. A listed wallet created with `unconfirmed` is marked; after the next save or launch every mark is named by a listed `id` or `derivedFrom` (FR-018, FR-019).

## One save

```text
before ──(reads, note settled, duplicate check: refuse → before)──▶ before
before ──(note, marks, vault: invisible)──────────────────────────▶ before (as seen)
before ──(list: deciding)─────────────────────────────────────────▶ after (memory built from the stored list)
after  ──(note removed, counter, selection, replaced entry dropped)▶ after
```
