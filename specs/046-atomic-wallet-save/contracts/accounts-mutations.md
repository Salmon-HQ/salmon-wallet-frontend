# Contract: wallet mutations (spec 046)

The shared API the screens call after this change (`packages/shared/src/hooks`, `contexts`, one key in `storage/types.ts`).

## `addAccount(account, password?, options?)`

```ts
interface AddAccountOptions {
  /** Created without the phrase check: marked backup-pending before the wallet is listed. */
  unconfirmed?: boolean;
  /** Names the wallet under the lock; receives the counter BEFORE the increment (generateAccountName adds 1). */
  nameFromCounter?: (counter: number) => string;
}
addAccount(account: Account, password?: string, options?: AddAccountOptions): Promise<void>;
```

Order inside the lock: read (list must be absent or an array, else reject) → settle the note → first save: drop the stash key → open the vault (a supplied password must open it) → already saved? → duplicate check → build and encrypt → writes (plan.md §Add).

- **Resolves** when the list naming the wallet lands, or when the wallet is already saved: same id with an equal entry, or (window memory empty) a listed entry exactly equal at the same position. On the already-saved path the later writes still run (note removal, counter, selection, replaced Seed Vault entries, prune). Later write failures are logged.
- **Rejects**, nothing the next launch shows changed, memory untouched:
  - `IncorrectPasswordError` / `UnlockThrottledError`: a vault exists and the supplied password does not open it (counted by the throttle).
  - `DuplicateAccountError`: same secret at a held position, or a listed wallet holds one of its Solana addresses.
  - `EncryptionMaterialMissingError` (vault, no password, no cached key).
  - a storage or stash error up to and including the list write; a stored list that is not an array.
- **No network** inside the lock.
- **Memory**: the stored list after the write, mapped to held objects plus the new wallet (with its lock-computed name); new wallet active.

## `removeAccount(targetId, password?)`

A supplied password is proven against the vault. List decides; memory follows; selection failures logged; a failed vault write after the list rejects (wallet already gone from memory and list, entry unlisted).

## `editAccount(targetId, params)` — one list write, memory after.

## `removeAllAccounts()` — memory, then stash key, then `clearAccountsStorage()` (note last), then releases.

## `DuplicateAccountError` — `hooks/index.ts`; no secret, address or id in its message. The barrel also exports `withVaultWriteLock`.

## Helpers (`useAccountsMutationHelpers.ts`, caller holds the lock)

- `settleFirstSave()`: discard only when note present, list read succeeded and is absent or `[]`, stored vault's `nonce` equals the note, and this runtime did not record that nonce as landed. Any other note → removed best effort (caught, logged). Discard failure throws.
- `readStoredSecrets(password?)`: a supplied password opens the vault itself (throttled) and its key becomes the stash key; without one, the cached key.
- `findStoredClash(account, list, secrets)`: pure derivation, Solana positions only, underivable entries skipped; `null`, `{ replace: id }`, or throws.
- `pruneMarks(list)`: best effort; nothing when the list is not an array.
- `writeStoredAccounts(list, { own })`: own-write mark only when `own`; cleared on a throw.

## `initAccounts()` — one lock turn: read → `settleFirstSave` (discard failure → init-failed gate; stale-note failure logged) → `pruneMarks` (logged). No derivation.

## `PhraseBackupValue` — `markUnconfirmed` removed; re-read on listed-id change; `confirmBackup` under the lock.

## `useAccountAddFlow(options)` — `nameFor(counter)` replaces `defaultName`; no memory Seed Vault lookup; `onFailure` gets `DuplicateAccountError`; follow-ups never reach `onFailure`.

## Screens

Both setup twins build the account once per screen. Error mapping: `DuplicateAccountError` → `wallet.import.errors.duplicate`; `IncorrectPasswordError` / `UnlockThrottledError` → `passwordCheckErrorKey(err, 'wallet.create.invalid_password')`. Mobile clears the phrase from state when `addAccount` resolves; the extension host clears `authData` on success and its `reloadWallets` awaits `withVaultWriteLock(async () => undefined)` first.

## Vectors

| Stored before                        | Call                               | Result                                    |
| ------------------------------------ | ---------------------------------- | ----------------------------------------- |
| P at start 0                         | add P at 0 / other spacing         | `DuplicateAccountError`                   |
| P at 0                               | add P at 3                         | saved                                     |
| P holding Solana slot 3              | add P at 3                         | `DuplicateAccountError`                   |
| P holding only Bitcoin index 4       | add the key for P's Solana index 4 | saved                                     |
| P with Solana catalog disabled       | add the key for P's Solana index 0 | `DuplicateAccountError`, no network       |
| listed entry missing from the vault  | add any key                        | that entry skipped, no throw              |
| Seed Vault S for Y                   | add Seed Vault for Y               | S replaced, entry dropped after the list  |
| C listed with secret Q               | add C again                        | resolves, later writes completed          |
| W listed with Q, window memory empty | add Q (new id), same start         | resolves as W; memory from storage        |
| W listed with Q, window holds W      | add Q (new id)                     | `DuplicateAccountError`                   |
| vault under P1, cached key valid     | add with password P2               | `IncorrectPasswordError`, nothing written |
| unlisted Z = Q, V = Q' (spacing)     | add Q                              | Z dropped, V kept                         |
| note = vault nonce, list `[]`        | launch or save                     | discard, note last                        |
| note ≠ vault nonce, list `[]`        | launch                             | note removed, vault kept                  |
| note, list `[W]`, removal throws     | launch                             | launch continues; retried later           |
| no note, list `[]`, vault            | launch                             | nothing removed                           |
| list is a string                     | save / launch                      | save rejects / no discard, no prune       |
