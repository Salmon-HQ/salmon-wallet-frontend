# Contract: wallet mutations (spec 046)

The shared API the screens call after this change (`packages/shared/src/hooks`, `contexts`, one key in `storage/types.ts`). Rows and pre-steps: plan.md §The write orders.

## Rules every mutation follows

- **Rule 1, fail closed.** Before its first write, `addAccount`, `removeAccount`, `editAccount` and the discard reject with a plain `Error` (screens keep today's generic message; no new class, no new copy), writing nothing and leaving memory untouched, when:
  - the raw vault key is present but unparseable;
  - the vault key is absent while the list names a wallet or `WALLETS` is present;
  - the list reads absent or `[]` while this runtime's memory holds a wallet (a locked window's placeholders count);
  - the list is present but not an array.

  Empty secrets (`{}`) are used only on the first-save branch: no vault key, list absent or `[]`, no `WALLETS`, memory empty.

- **Rule 2, read-back.** When the deciding write (`ACCOUNTS`) of add, remove or edit throws, read that key again: if storage shows the change (the stored list equals the list written), continue as success with the later rows and memory; if it does not, or the read throws, reject with the write's error and memory untouched.
- **Rule 3, one definition of "already saved".** When storage lists a wallet W whose stored secret is exactly equal to the new one at the same position (phrase: same starting index): if this window's memory does not hold W's id, `addAccount` resolves as already saved, adopting W's id, name and avatar; if it holds W's id, it rejects with `DuplicateAccountError`.

## `addAccount(account, password?, options?)`

```ts
interface AddAccountOptions {
  /** Created without the phrase check: marked backup-pending before the vault is written. */
  unconfirmed?: boolean;
  /** Names the wallet under the lock; receives the counter BEFORE the increment (generateAccountName adds 1). */
  nameFromCounter?: (counter: number) => string;
}
addAccount(account: Account, password?: string, options?: AddAccountOptions): Promise<void>;
```

Order inside the lock: P1 read + Rule 1 → P2 settle the note → P3 first save: drop the stash key → P4 open the vault (a supplied password must open it) → P5 `findStoredClash` (Rule 3, duplicates, replace) → P6 counter, name, build and encrypt → rows.

- **Resolves**
  - when the list naming the wallet is stored (written, or confirmed by Rule 2); later write failures are logged;
  - when Rule 3 adopts W. Then the later rows run (note removal, counter when it grows, W's selection, prune) with no vault write, the lock is released, memory is loaded from storage (`loadAccounts`) and the call resolves.
- **Rejects**, nothing the next launch shows changed, memory untouched:
  - the Rule 1 error;
  - `IncorrectPasswordError` (counted as a failed unlock) / `UnlockThrottledError`: a vault exists and the supplied password does not open it;
  - `InvalidVaultError` and stash errors on the password path, uncounted;
  - `DuplicateAccountError`: Rule 3 with W held by this window; same secret at a held position; a listed wallet holds one of its Solana addresses;
  - `EncryptionMaterialMissingError` (vault, no password, no cached key);
  - a storage or stash error before the list write; a thrown list write that Rule 2 does not confirm.
- **No network** inside the lock.
- **Memory** (normal path): the stored list after the write, mapped to held objects plus the new wallet (with its lock-computed name); new wallet active. Own-write mark only when memory holds every stored id.
- **Seed Vault replace**: S, identified by id, leaves the vault after the list (row 10); its token is released only when no stored wallet uses it. Never on the adoption path.

## `removeAccount(targetId, password?)`

Rule 1 (memory holds the target, so an absent or `[]` list rejects). A supplied password is proven against the vault (only `IncorrectPasswordError` counted). The list decides (Rule 2 on throw); memory follows; selection failures logged; a failed vault write after the list rejects with the wallet already gone from memory and list, its entry unlisted.

## `editAccount(targetId, params)`

Rule 1 (an absent or `[]` list rejects; a list lacking only that id returns as today). One list write (Rule 2 on throw), memory after.

## `removeAllAccounts()`

Memory, then the stash key, then `clearAccountsStorage()` (list, vault, counter, selection, `UNCONFIRMED_PHRASES`, then `FIRST_SAVE` last), then Seed Vault releases.

## Errors

`DuplicateAccountError`: exported from `hooks/index.ts`; no secret, address or id in its message. The Rule 1 error is a plain `Error` with the same restriction. The barrel also exports `withVaultWriteLock`.

## Helpers (`useAccountsMutationHelpers.ts`, caller holds the lock)

- `readStoredWallets(memoryHoldsWallets, password?)`: reads list, raw vault, `WALLETS`, note; applies Rule 1; returns the list, the secrets (opened with a supplied password, whose key becomes the stash key; else the cached key; `{}` only on the first-save branch) and whether this is the first-save branch.
- `settleFirstSave(read, memoryHoldsWallets)`: discard only when the note is present, the list read succeeded and is absent or `[]`, the stored vault's `nonce` equals the note, and memory holds no wallet. Any other note → removed best effort (caught, logged). Discard failure throws.
- `findStoredClash(account, list, secrets, heldIds)`: pure derivation, Solana positions only, per-index skips; returns `null`, `{ adopt: id }` or `{ replace: id }`, or throws `DuplicateAccountError`.
- `pruneMarks(list)`: best effort; an absent list counts as `[]`; nothing when the list is not an array.
- `writeStoredAccounts(list, { own })`: Rule 2 read-back on a throw; own-write mark only when `own`, cleared on a reject.

## `initAccounts()`

One lock turn: L1 read → L2 `settleFirstSave` (memory is empty; discard failure → init-failed gate; stale-note failure logged) → L3 `pruneMarks` (logged). No derivation.

## `PhraseBackupValue`

`markUnconfirmed` removed; re-read on listed-id change; `confirmBackup` under the lock.

## `useAccountAddFlow(options)`

The account is built once per confirm cycle (kept through re-auth, rebuilt only when the input changes or the flow steps back); `nameFor(counter)` replaces `defaultName`; no memory Seed Vault lookup; `onFailure` gets `DuplicateAccountError`; follow-ups never reach `onFailure`.

## Screens

Both setup twins build the account once per screen. Error mapping: `DuplicateAccountError` → `wallet.import.errors.duplicate`; `IncorrectPasswordError` / `UnlockThrottledError` → `passwordCheckErrorKey(err, 'wallet.create.invalid_password')`; others keep today's generic message. Mobile clears the phrase from state when `addAccount` resolves; the extension host clears `authData` on success and its `reloadWallets` first awaits `withVaultWriteLock(async () => undefined)`, which orders the reload after the turn in flight.

## Vectors

| Stored before                                      | Call                               | Result                                                       |
| -------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| P at start 0                                       | add P at 0 with other spacing      | `DuplicateAccountError`                                      |
| P at 0                                             | add P at 3                         | saved                                                        |
| P holding Solana slot 3                            | add P at 3                         | `DuplicateAccountError`                                      |
| P holding only Bitcoin index 4                     | add the key for P's Solana index 4 | saved                                                        |
| P with Solana catalog disabled                     | add the key for P's Solana index 0 | `DuplicateAccountError`, no network                          |
| listed entry missing; a null Solana index          | add any key                        | those skipped, other indexes compared, no throw              |
| Seed Vault S for Y                                 | add Seed Vault for Y               | S replaced, its entry dropped after the list                 |
| W listed with Q, window does not hold W            | add Q (any id), same start         | resolves as W; later rows; memory from storage shows W once  |
| W listed with Q, window holds W                    | add Q (new id)                     | `DuplicateAccountError`                                      |
| list write applied then thrown                     | add / remove / edit                | read-back shows it → resolves, later rows run                |
| list write thrown, not applied                     | add / remove / edit                | rejects, memory untouched                                    |
| vault under P1, cached key valid                   | add or remove with password P2     | `IncorrectPasswordError`, nothing written, one failed unlock |
| vault raw unparseable                              | add / remove / edit                | Rule 1 error, nothing written                                |
| vault read dropped, list names A                   | add / remove                       | Rule 1 error, nothing written                                |
| list read dropped, window holds A                  | add / remove / edit                | Rule 1 error, nothing written                                |
| unlisted Z = Q, V = Q' (spacing)                   | add Q                              | Z dropped, V kept                                            |
| note = vault nonce, list `[]`, memory empty        | launch or save                     | discard, note last                                           |
| note = vault nonce, list read `[]`, window holds A | save                               | Rule 1 error, no discard                                     |
| note ≠ vault nonce, list `[]`                      | launch                             | note removed, vault kept                                     |
| note, list `[W]`, note removal throws              | launch                             | launch continues; retried later                              |
| no note, list `[]`, vault                          | launch                             | nothing removed                                              |
| list is a string                                   | save / launch                      | save rejects / no discard, no prune                          |
