# Contract: wallet mutations (spec 046)

The shared API the screens call after this change. Everything lives in `packages/shared/src/hooks`, `contexts` and one key in `storage/types.ts`.

## `addAccount(account, password?, options?)` — `useAccountsMutations.ts`

```ts
interface AddAccountOptions {
  /** Created without the phrase check: marked backup-pending inside the same write turn, before the wallet is listed. */
  unconfirmed?: boolean;
  /**
   * Names the wallet under the write lock. Receives the counter BEFORE the increment
   * (max(stored counter, stored list length)); `generateAccountName` adds 1 itself.
   */
  nameFromCounter?: (counter: number) => string;
}

addAccount(account: Account, password?: string, options?: AddAccountOptions): Promise<void>;
```

Order inside the lock (plan.md §Add): read list, vault, `WALLETS`, note → settle the note (discard or remove) → on a first save remove the stash session key → idempotent check → read secrets → duplicate check → build and encrypt → writes.

- **Resolves** once the list naming the new wallet has been written, or at once when storage already lists this account's id with an equal secret (idempotent retry: no second wallet write). A later write that fails (note removal, counter, selection, the replaced entry's removal) is logged.
- **Rejects**, with nothing the next launch shows changed and the window untouched:
  - `DuplicateAccountError` — the device already holds this secret at this position, or a listed wallet holds one of its addresses. Nothing is written.
  - `EncryptionMaterialMissingError`, `UnlockThrottledError`, a wrong password (unchanged).
  - a storage or stash error before or at the list write.
- **No network** inside the lock: addresses for the duplicate check come from pure functions.
- **Seed Vault**: a listed Seed Vault wallet with the same address is replaced; its vault entry stays until the list has landed, then is removed in a later write.
- **First save** (no vault, no listed wallet, no `WALLETS`): writes the note before the vault and removes it after the list; the vault is encrypted under `password`, never under a key cached earlier.
- **Memory** after it resolves: `accounts` is the stored list after the write (objects this window holds, plus the new wallet); the new wallet is active.

## `removeAccount(targetId, password?)`

Unchanged signature. The list write decides; memory follows it. Selection write failures are logged. A failed vault write after the list **rejects** (memory already shows the wallet gone; its entry stays unlisted in the vault). Next active wallet when the removed one was active: the first of the new stored list this window holds.

## `editAccount(targetId, params)`

One write (the list); memory after it.

## `removeAllAccounts()`

Memory first, then the stash session key, then `clearAccountsStorage()` (now ending with the note), then Seed Vault releases.

## `DuplicateAccountError` — `hooks/index.ts`

`class DuplicateAccountError extends Error {}`. No secret, address or id in its message. Screens show `t('wallet.import.errors.duplicate')`.

## Helpers — `useAccountsMutationHelpers.ts` (caller holds `withVaultWriteLock`)

- `settleFirstSave(list)`: note + list `null`/`[]` → remove stash `DERIVED_KEY`, `clearUnlockPenalty()`, `clearAccountsStorage()` (note removed last); note + listed wallet → remove the note; otherwise nothing. Throws on any failure.
- `findStoredClash(account, list, secrets)`: `null`, `{ replace: id }`, or throws `DuplicateAccountError`.
- `pruneMarks(list)`: rewrites `UNCONFIRMED_PHRASES` to the marks named by a listed `id` or `derivedFrom`, only if it changes; does nothing when the list is not an array.
- `writeStoredAccounts(list, { own })`: records the own-write mark only when `own` (memory will hold every stored id); clears it if the write throws.

## `initAccounts()` — `useAccountsSecurity.ts`

First step, one lock turn: read list (throw → init error) → `settleFirstSave` (throw → init error) → `pruneMarks` (caught and logged). Then today's steps.

## `PhraseBackupValue` — `contexts/PhraseBackupContext.tsx`

`markUnconfirmed` removed. The provider re-reads `salmon_unconfirmed_phrases` when the listed ids change. `confirmBackup` writes under the lock.

## `useAccountAddFlow(options)`

`defaultName: string` → `nameFor: (counter: number) => string`, called with the counter before the increment. `addAccount` gets `nameFromCounter` when the name field still holds the default. No memory Seed Vault lookup. `onFailure` receives `DuplicateAccountError`; steps after a resolved `addAccount` never reach it.

## Setup screens

Both twins build the account once per screen and send the same object on every retry. Mobile clears the phrase from React state and the account ref right after `addAccount` resolves; the extension host clears `authData` on password success.

## Vectors

| Stored before                                            | Call                                   | Result                                          |
| -------------------------------------------------------- | -------------------------------------- | ----------------------------------------------- |
| P at start 0                                             | add P at start 0                       | `DuplicateAccountError`, nothing written        |
| P at start 0                                             | add P with other spacing/case, start 0 | `DuplicateAccountError`                         |
| P at start 0                                             | add P at start 3                       | saved                                           |
| P at start 0 holding slot 3                              | add P at start 3                       | `DuplicateAccountError`                         |
| P deriving Solana address X, Solana catalog disabled     | add private key for X                  | `DuplicateAccountError`, no network call        |
| private key wallet for X                                 | watch X                                | `DuplicateAccountError`                         |
| Seed Vault S for Y                                       | add Seed Vault for Y                   | S replaced; S's entry kept until after the list |
| P deriving Y                                             | add Seed Vault for Y                   | `DuplicateAccountError`                         |
| C listed with secret Q                                   | add the same account C again           | resolves, nothing written                       |
| W listed; unlisted Z = Q (exact), V = Q' (other spacing) | add Q                                  | Z dropped, V kept                               |
| note, list `[]`, vault                                   | launch, or a save starts               | discard; note removed last                      |
| note, list `[W]`                                         | launch                                 | note removed                                    |
| no note, list `[]`, encrypted vault                      | launch                                 | nothing removed; lock screen as today           |
| list read throws                                         | launch                                 | init error, nothing removed                     |
