# Contract: wallet mutations (spec 046)

The shared API the screens call, after this change. Everything here lives in `packages/shared/src/hooks` and `contexts`.

## `addAccount(account, password?, options?)` — `useAccountsMutations.ts`

```ts
interface AddAccountOptions {
  /** Created without the phrase check: marked backup-pending inside the same write turn, before the wallet is listed. */
  unconfirmed?: boolean;
  /** Names the wallet from the stored counter, under the write lock; the account's own name is used when absent. */
  nameFromCounter?: (counter: number) => string;
}

addAccount(account: Account, password?: string, options?: AddAccountOptions): Promise<void>;
```

- **Resolves** once the wallet list naming the new wallet has been written. A later write (counter, active selection) that fails is logged, not thrown.
- **Rejects**, with nothing the next launch shows changed and the window's state untouched:
  - `DuplicateAccountError` — the device already holds this secret at this position, or a listed wallet holds one of its addresses (plan.md §One secret, one wallet). Nothing is written.
  - `EncryptionMaterialMissingError` — no cached key and no password (unchanged).
  - `UnlockThrottledError`, or the decryption error of a wrong password (unchanged, counted against the throttle).
  - a storage error from any write up to and including the list write.
- **Seed Vault**: a listed Seed Vault wallet with the same address is replaced in the same save (the `replaces` parameter is removed; the target is found in storage).
- **First save** (stored list empty, no exclusion): any leftover vault and the cached session key are discarded first; the vault is encrypted under `password`.
- After it resolves: `accounts`, `counter`, `accountId`, `networkId`, `pathIndex`, `requiredLock` hold the new wallet as active.

## `removeAccount(targetId, password?)`

Unchanged signature. Resolves once the list without the wallet has been written; the vault and selection writes after it are logged on failure. Rejects with the list unchanged and the window untouched otherwise. When the removed wallet was active, the next active wallet is the first of the new stored list that the window holds.

## `editAccount(targetId, params)`

Unchanged signature. One write (the list). The window shows the edit only after it lands.

## `removeAllAccounts()`

Unchanged: memory first, then storage (FR-009).

## `DuplicateAccountError` — exported from `hooks/index.ts`

```ts
class DuplicateAccountError extends Error {}
```

Carries no secret, no address and no id in its message. Screens map it to `t('wallet.import.errors.duplicate')`.

## `discardVaultWithoutWallets(): Promise<void>` — `useAccountsMutationHelpers.ts` (module-internal export for the two callers and tests)

Caller holds `withVaultWriteLock`. Throws if the list cannot be read. Does nothing unless the list is `null` or `[]`, no `salmon_wallets` record exists and the vault is not a cleartext record. Then removes the stash session key, and, if a vault exists, every wallet key (`clearAccountsStorage`) and the backup-pending marks.

## `initAccounts()` — `useAccountsSecurity.ts`

First step, inside one `withVaultWriteLock` turn: `discardVaultWithoutWallets()`, then the backup-pending marks pruned to those named by a listed wallet's `id` or `derivedFrom`. Then today's steps.

## `PhraseBackupValue` — `contexts/PhraseBackupContext.tsx`

- `markUnconfirmed` is removed (marks are written by `addAccount`).
- The provider re-reads `salmon_unconfirmed_phrases` when the set of listed wallet ids changes, so Home's reminder shows for a wallet just saved.
- `confirmBackup` writes under `withVaultWriteLock`.

## `useAccountAddFlow(options)` — `hooks/useAccountAddFlow.ts`

- `defaultName: string` becomes `nameFor: (counter: number) => string`; the hook derives the default shown in the name field from the window's counter and passes `nameFromCounter` to `addAccount` when the field still holds that default.
- No memory lookup for the Seed Vault wallet to replace.
- `onFailure(err)` receives `DuplicateAccountError` for a duplicate; steps after a resolved `addAccount` never reach `onFailure`.

## Vectors

| Stored before                                    | Call                                        | Result                                   |
| ------------------------------------------------ | ------------------------------------------- | ---------------------------------------- |
| P at start 0                                     | add P at start 0                            | `DuplicateAccountError`, nothing written |
| P at start 0                                     | add " P " (other spacing/case) at start 0   | `DuplicateAccountError`                  |
| P at start 0                                     | add P at start 3 (`derivedFrom` P's wallet) | saved                                    |
| P at start 0 holding slot 3 on Solana            | add P at start 3                            | `DuplicateAccountError`                  |
| P at start 0, deriving Solana address X          | add private key for X                       | `DuplicateAccountError`                  |
| private key wallet for X                         | watch X                                     | `DuplicateAccountError`                  |
| Seed Vault wallet S for address Y                | add Seed Vault for Y                        | S replaced, one wallet                   |
| P at start 0 deriving Y                          | add Seed Vault for Y                        | `DuplicateAccountError`                  |
| list empty, unlisted vault entry Z = Q           | add Q (first save)                          | discard runs first; vault = { new: Q }   |
| W listed, unlisted entries Z = Q and V = R       | add Q                                       | vault = { W, new: Q, V: R }              |
| list `[]`, encrypted vault, no `salmon_wallets`  | launch                                      | vault and wallet keys removed, welcome   |
| list `[]`, encrypted vault, `salmon_wallets` set | launch                                      | nothing removed                          |
| list `[]`, cleartext vault                       | launch                                      | nothing removed, protect mode            |
| list read throws                                 | launch                                      | init error, nothing removed              |
