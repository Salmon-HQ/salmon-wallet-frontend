# Contract: wallet mutations (spec 046)

The shared API the screens call after this change (`packages/shared/src/hooks`, `contexts`, `utils/stored-clash.ts`). Rows and pre-steps: plan.md §The write orders.

## Rules every mutation follows

- **Rule 1, fail closed.** Before its first write, `addAccount`, `removeAccount` and `editAccount` reject with a plain `Error` (no new class, no new copy), writing nothing and leaving memory untouched, when:
  - the raw vault key is present but unparseable (add, remove);
  - the vault key is absent while the list names a wallet or `WALLETS` is present (add, remove);
  - the list is present but not an array;
  - the list reads absent or `[]` while the calling hook's `accounts` holds wallets.

  Empty secrets (`{}`) only when there is no vault key at all.

- **Rule 2, read-back.** When the list write (`ACCOUNTS`) of add, remove or edit throws, read that key again and compare `JSON.stringify(written)` with `JSON.stringify(readBack)`. Equal → continue as success with memory and the later rows. Different, absent, or the read throws → reject with the write's error, memory untouched.

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

Order inside the lock: P1 reads + Rule 1 → P2 secrets (no vault key: drop the stash key; vault + password: the password must open it; else the cached key) → P3 `findStoredClash` (own id excluded) → P4 name and counter → P5 build and encrypt → rows.

- **Same id**: when storage already lists `account.id`, the save overwrites that list entry and vault entry and keeps the stored name.
- **Resolves** when the list naming the wallet is stored (written, or confirmed by Rule 2). Later write failures are logged.
- **Rejects**, nothing the next launch shows changed, memory untouched:
  - the Rule 1 error;
  - `IncorrectPasswordError` / `UnlockThrottledError`: a vault exists and the supplied password does not open it (counted as today);
  - `DuplicateAccountError` (plan.md §Duplicate rules);
  - `EncryptionMaterialMissingError` (vault, no password, no cached key);
  - a storage or stash error before the list write; a thrown list write that Rule 2 does not confirm.
- **No network** inside the lock.
- **Memory**: held wallets − replaced S + the new wallet (with its lock-computed name); new wallet active. Own-write mark only when memory's ids equal the stored ids.
- **Seed Vault replace**: a listed Seed Vault wallet S with the new wallet's address is replaced; S's entry stays in the vault until the list is stored, then leaves (row 8); its token is released only when no stored wallet uses it.

## `removeAccount(targetId, password?)`

Rule 1. A supplied password is proven against the vault. The list decides (Rule 2 on throw); memory follows; selection after the list, failures logged; a failed vault write after the list rejects with the wallet already gone from memory and list, its entry unlisted. Both list and vault empty → `clearAll`.

## `editAccount(targetId, params)`

Rule 1 (a list lacking only that id returns as today). One list write (Rule 2 on throw), memory after.

## `removeAllAccounts()`

Memory, then the stash key, then `clearAccountsStorage()` (unchanged), then Seed Vault releases.

## Errors

`DuplicateAccountError`: exported from `hooks/index.ts`; no secret, address or id in its message. The Rule 1 error is a plain `Error` with the same restriction. The barrel also exports `withVaultWriteLock`.

## Helpers (caller holds the lock)

- `readStoredWallets(memoryHoldsWallets, password?)`: reads list, raw vault, `WALLETS`; applies Rule 1; returns the list, whether a vault key exists, and the secrets (opened with a supplied password, whose key becomes the stash key; else the cached key; `{}` only with no vault key).
- `findStoredClash(account, list, secrets)` (`utils/stored-clash.ts`): pure derivation, Solana positions only, per-index skips, own id excluded; returns `null` or `{ replace: id }`, or throws `DuplicateAccountError`.
- `pruneMarks(list)`: best effort; does nothing unless `list` is an array.
- `writeStoredAccounts(list, { own })`: Rule 2 on a throw; own-write mark only when `own`, cleared on a reject.

## `initAccounts()`

One lock turn: read the list; when it is an array, `pruneMarks` (failure logged). Nothing else new.

## `PhraseBackupValue`

`markUnconfirmed` removed; re-read on listed-id change; `confirmBackup` under the lock.

## `useAccountAddFlow(options)`

The wallet id is fixed once per confirm cycle (kept through re-auth; new when the input changes or the flow steps back); the account is rebuilt with it on each attempt; `nameFor(counter)` replaces `defaultName`; no memory Seed Vault lookup; `onFailure` gets `DuplicateAccountError`; follow-ups never reach `onFailure`.

## Screens

Both setup twins fix the wallet id once per screen and rebuild with it. Error mapping on the setup twins: `DuplicateAccountError` → `wallet.import.errors.duplicate`; `IncorrectPasswordError` / `UnlockThrottledError` → `passwordCheckErrorKey(err, 'wallet.create.invalid_password')`; others keep today's message. The Add wallet sheet maps only `DuplicateAccountError`. Mobile clears the phrase from state when `addAccount` resolves; the extension host clears `authData` on success and its `reloadWallets` first awaits `withVaultWriteLock(async () => undefined)`.

## Vectors

| Stored before                              | Call                               | Result                                                       |
| ------------------------------------------ | ---------------------------------- | ------------------------------------------------------------ |
| P created at 0                             | add P at 0 with other spacing      | `DuplicateAccountError`                                      |
| P created at 0                             | add P at 3 (derived)               | saved                                                        |
| P holding Solana position 3                | add P at 3                         | `DuplicateAccountError`                                      |
| P holding only Bitcoin index 4             | add the key for P's Solana index 4 | saved                                                        |
| P with Solana catalog disabled             | add the key for P's Solana index 0 | `DuplicateAccountError`, no network                          |
| listed entry missing; a null Solana index  | add any key                        | those skipped, other indexes compared, no throw              |
| C listed under id X                        | add C with id X                    | overwrites its own entries, stored name kept, resolves       |
| W listed (another window), memory lacks it | add W with a new id                | `DuplicateAccountError`                                      |
| Seed Vault S for Y                         | add Seed Vault for Y               | S replaced, its entry dropped after the list                 |
| list write applied then thrown             | add / remove / edit                | read-back equal → resolves, later rows run                   |
| list write thrown, not applied             | add / remove / edit                | rejects, memory untouched                                    |
| vault under P1, cached key valid           | add or remove with password P2     | `IncorrectPasswordError`, nothing written, one failed unlock |
| no vault, cached key for P1                | add with password P2               | vault under P2                                               |
| vault raw unparseable                      | add / remove                       | Rule 1 error, nothing written                                |
| vault read dropped, list names A           | add / remove                       | Rule 1 error, nothing written                                |
| list read dropped, memory holds A          | add / remove / edit                | Rule 1 error, nothing written                                |
| unlisted Z = Q, V = Q' (spacing)           | add Q                              | Z dropped, V kept                                            |
| vault, list absent                         | launch                             | nothing removed, no prune                                    |
| list is a string                           | save / launch                      | save rejects / no prune                                      |
