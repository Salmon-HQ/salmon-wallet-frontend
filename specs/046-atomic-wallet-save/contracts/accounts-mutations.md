# Contract: wallet mutations (spec 046)

The shared API the screens call after this change (`packages/shared/src/hooks`, `contexts`, `utils/stored-clash.ts`). Rows and pre-steps: plan.md §The write orders.

## Rules every mutation follows

- **Rule 1, fail closed.** Before its first write of a wallet record, a mutation rejects with a plain `Error` (no new class, no new copy), leaving memory untouched, when:
  - (add, remove, edit) the list is present but not an array, or it reads absent or `[]` while the calling hook's `accounts` holds wallets;
  - (add, remove) the raw vault key is present but unparseable while the list names a wallet, or absent while the list names a wallet, `WALLETS` is present or `COUNTER` is present.

  Empty secrets (`{}`) only when there is no vault key, or the vault is unparseable and no wallet is listed (the save then overwrites it, as today).

- **Rule 2, refusal on mobile.** On mobile (`getCurrentPlatform() === 'mobile'`), when the list write (`ACCOUNTS`) of add, remove or edit throws, the write is a failed write: no read-back, clear the own-write mark, no memory refresh, reject with the write's error. AsyncStorage on iOS answers a read with a value whose write failed (research R4); memory changes only after the list write, so it is already right.
- **Rule 2, read-back on the extension.** When the list write (`ACCOUNTS`) of add, remove or edit throws, read that key again and compare `JSON.stringify(written)` with `JSON.stringify(readBack)`. Equal → continue as success with memory and the later rows. Different, absent, or the read throws → clear the own-write mark, release the lock, refresh memory from storage (`refreshFromStorage`: cached-key open plus `loadAccounts(…, { persist: false })`; never `setError`, `setLocked` or a storage write; a failure logged), and reject with the write's error.

## `addAccount(account, password?, options?)`

```ts
interface AddAccountOptions {
  /** Created without the phrase check: marked backup-pending before the vault is written. */
  unconfirmed?: boolean;
}
addAccount(account: Account, password?: string, options?: AddAccountOptions): Promise<void>;
```

The caller passes the name, as today. Order inside the lock: P1 reads + Rule 1 → P2 secrets (no vault key, or an unparseable vault with nothing listed → `{}` after dropping the stash `DERIVED_KEY`, and the password proof does not run on it; vault + password: the password must open it; else the cached key) → P3 own id → P4 `findStoredClash` → P5 build and encrypt → rows (row 2a writes `COUNTER` between the vault and the list when it is absent, best effort). The pre-steps write no wallet record; P2 can write the stash key and the unlock penalty record.

- **Own id**: when storage already holds an entry under `account.id`, the save proceeds only if that entry is exactly the secret being saved, and then overwrites its own list and vault entries without writing the counter. A different stored secret → reject (plain `Error`), nothing written.
- **Resolves** when the list naming the wallet is stored (written, or confirmed by Rule 2). Later write failures are logged.
- **Rejects**, nothing the next launch shows changed:
  - the Rule 1 error, or the own-id error;
  - `IncorrectPasswordError` / `UnlockThrottledError`: a vault exists and the supplied password does not open it (counted as today);
  - `DuplicateAccountError` (§Duplicate rules);
  - `EncryptionMaterialMissingError` (vault, no password, no cached key);
  - a storage or stash error before the list write; a thrown list write that Rule 2 does not confirm (memory refreshed on the extension, unchanged on mobile).
- **After any reject**: `requiredLock` is set to true only when `getEncryptedStoredMnemonics()` returns a vault (one the single-field form can check), so the setup form asks for the existing password in the same session; that read is wrapped so its failure never hides the original error.
- **No network** inside the lock.
- **Vault entries**: the save adds the new entry and removes none before the list; the only removal is the replaced Seed Vault entries, after the list.
- **Memory**: held − replaced Seed Vault ids − `account.id` + the new wallet, applied to the latest memory (a functional update), not the render's copy; new wallet active; counter = the stored value. Own-write mark only when the latest memory with the change applied holds exactly the stored ids.
- **Seed Vault replace**: every listed Seed Vault wallet with the new wallet's address is replaced; their entries stay in the vault until the list is stored, then leave; each token is released only when no stored wallet uses it.

## Duplicate rules

| New secret  | `DuplicateAccountError` when (own id excluded)                                    |
| ----------- | --------------------------------------------------------------------------------- |
| Phrase      | a listed phrase wallet with an equal phrase after normalising holds the new start |
| Private key | its Solana address is an address of any listed wallet                             |
| Watched     | its address is an address of any listed wallet                                    |
| Seed Vault  | never (it replaces listed Seed Vault wallets with the same address)               |

## `removeAccount(targetId, password?)`

Rule 1. A supplied password is proven against the vault. The list decides (Rule 2 on throw); memory follows; selection after the list, failures logged; a failed vault write after the list rejects with the wallet already gone from memory and list, its entry unlisted. Own-write mark only when the latest memory without the wallet holds exactly the stored ids. Removing the active wallet makes active the first stored wallet memory holds, else the first wallet left in memory. Both list and vault empty → `clearAll`.

## `editAccount(targetId, params)`

Rule 1 list conditions only; a list lacking only that id returns as today. One list write (Rule 2 on throw), memory after. Own-write mark only when the latest memory with the edit applied holds exactly the stored ids.

## `removeAllAccounts()`

Memory, then the stash key, then `clearAccountsStorage()` (now `COUNTER`, `WALLETS`, `ACTIVE`, `ENDPOINTS`, `ACCOUNT_ID`, `NETWORK_ID`, `PATH_INDEX`, then `ACCOUNTS`, `MNEMONICS`, then `TRUSTED_APPS`, `CUSTOM_TOKENS`, `CONNECTION`), then Seed Vault releases.

## Errors

`DuplicateAccountError`: defined in `utils/stored-clash.ts`, re-exported from `hooks/useAccountsMutationHelpers.ts` and `hooks/index.ts`; no secret, address or id in its message. The Rule 1 and own-id errors are plain `Error`s with the same restriction. The barrel also exports `withVaultWriteLock`.

## Helpers (caller holds the lock)

- `readStoredList(memoryHoldsWallets)`: reads the list; applies Rule 1's list conditions.
- `readStoredWallets(memoryHoldsWallets, password?)`: `readStoredList` plus raw vault and `WALLETS`; applies the vault conditions; returns the list, whether a vault key exists, and the secrets (opened with a supplied password, whose key becomes the stash key; else the cached key; `{}` after dropping the stash key when there is no vault key or the vault is unparseable with nothing listed, without running the password proof).
- `findStoredClash(account, list, secrets)` (`utils/stored-clash.ts`): pure; derives Solana addresses only for private-key and watch-only saves; per-index skips; a phrase wallet with no position stored compares at position 0; own id excluded; returns `{ replace: ids }` (possibly empty) or throws `DuplicateAccountError`.
- `pruneMarks(list)`: best effort; writes only when a mark is removed.
- `writeStoredAccounts(list, { own })`: Rule 2 on a throw (read-back on the extension, refusal on mobile); own-write mark only when `own`, cleared on a reject.

## `initAccounts()`

Unchanged.

## `PhraseBackupValue`

`markUnconfirmed` removed; re-read on listed-id change; `confirmBackup` under the lock.

## `useAccountAddFlow(options)`

The wallet id and avatar are kept while a value key stays the same: trimmed phrase, private key string, watched address string, Seed Vault address + path + token, derived position, and the active wallet's id only for a derived account; a rename keeps them; the account is rebuilt with them on each attempt; no memory Seed Vault lookup; `onFailure` gets `DuplicateAccountError`; follow-ups never reach `onFailure`.

## Screens

Mobile setup: after `addAccount` resolves, the follow-ups run outside the error path. `unlockAccounts` returns a boolean and never throws: true → biometric setup; false → enrolment skipped, then success, analytics consent and the app, which is unlocked in that session on a fresh install. Analytics or the enrolment hand-off throwing is logged and does not change the route. The derived-account scan keeps today's handling of a `DuplicateAccountError`: logged, the queue moves on, no message.

Both setup twins fix the wallet id and avatar once per screen and rebuild with them. Setup twins: `DuplicateAccountError` → `wallet.import.errors.duplicate`; `IncorrectPasswordError` / `UnlockThrottledError` → `passwordCheckErrorKey(err, 'wallet.create.invalid_password')`; others keep today's message. Add wallet sheet: `DuplicateAccountError` → `wallet.import.errors.duplicate`, or `wallet.watchOnly.errors.duplicate` for a watched address. Mobile clears the phrase from state when `addAccount` resolves; the extension host clears `authData` on success and its listener `reloadWallets` first awaits `withVaultWriteLock(async () => undefined)`.

## Vectors

| Stored before                              | Call                                    | Result                                                                                           |
| ------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| phrase P created at 0                      | add P at 0 with other spacing           | `DuplicateAccountError`                                                                          |
| P created at 0                             | add P at 3 (derived)                    | saved                                                                                            |
| P holding Solana position 3                | add P at 3                              | `DuplicateAccountError`                                                                          |
| watched X                                  | recover the phrase that derives X       | saved                                                                                            |
| private-key wallet K                       | recover the phrase whose address is K's | saved                                                                                            |
| phrase wallet holding address Y            | add a Seed Vault account for Y          | saved                                                                                            |
| phrase wallet holding address Y            | import the private key or watch Y       | `DuplicateAccountError`                                                                          |
| P holding only Bitcoin index 4             | add the key for P's Solana index 4      | saved                                                                                            |
| P with Solana catalog disabled             | add the key for P's Solana index 0      | `DuplicateAccountError`, no network                                                              |
| listed entry missing; a null Solana index  | add any key                             | those skipped, other indexes compared, no throw                                                  |
| C's secret under id X                      | add C with id X                         | overwrites its own entries, no counter write, resolves                                           |
| another secret under id X                  | add C with id X                         | plain `Error`, nothing written, entry intact                                                     |
| W listed (another window), memory lacks it | add W with a new id                     | `DuplicateAccountError`                                                                          |
| two Seed Vault wallets for Y               | add Seed Vault for Y                    | both replaced, entries dropped after the list                                                    |
| list write applied then thrown, extension  | add / remove / edit                     | read-back equal → resolves, later rows run                                                       |
| list write applied then thrown, mobile     | add / remove / edit                     | rejects, no read-back, no refresh, nothing written after the list, memory unchanged              |
| list write thrown, read-back fails (ext.)  | add / remove / edit                     | memory refreshed from storage (unchanged when the refresh's list read is null or fails), rejects |
| vault under P1, cached key valid           | add or remove with password P2          | `IncorrectPasswordError`, no wallet record written, one failed unlock                            |
| no vault, cached key for P1                | add with password P2                    | vault under P2                                                                                   |
| vault raw unparseable, A listed            | add / remove; edit                      | Rule 1 error, nothing written; the edit proceeds                                                 |
| vault raw unparseable, nothing listed      | add C (first save)                      | the vault is overwritten with C, as today                                                        |
| vault and list absent, `COUNTER` present   | add                                     | Rule 1 error, nothing written                                                                    |
| a save rejects after its vault landed      | (same session)                          | `requiredLock` true                                                                              |
| garbled vault, nothing listed, save fails  | (same session)                          | `requiredLock` stays false                                                                       |
| list read dropped, memory holds A          | add / remove / edit                     | Rule 1 error, nothing written                                                                    |
| unlisted Z = Q                             | add Q                                   | Z kept; Q stored under the new id                                                                |
| no stale mark                              | save                                    | no mark write                                                                                    |
