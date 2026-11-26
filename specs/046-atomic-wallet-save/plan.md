# Implementation Plan: Saving a wallet is all-or-nothing, and one secret is one wallet

**Branch**: `fix/046-atomic-wallet-save` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/046-atomic-wallet-save/spec.md`, with FR-001, FR-006, FR-006a, FR-019 and owner question 1 as revised on 2026-11-26, and two adversarial review rounds on this plan; questions 2 to 5 on their recommended defaults.

## Summary

Every change to the stored wallets has one deciding write, the wallet list (`STORAGE_KEYS.ACCOUNTS`), because the loader builds only listed wallets. A save writes the vault before the list and keeps every listed wallet's entry until the list has landed; a removal writes the list before the vault; an edit writes only the list. React state changes after the list write and is built from the stored list. A first save leaves a note holding the nonce of the vault it writes; only a vault with that exact nonce, beside an empty list, is ever discarded, so the note is inert for every other vault. A save with a password must open the stored vault with that password. A retry of a save that already landed completes the later writes instead of saving again. The duplicate check runs inside the lock on storage, with pure Solana derivation and no network. No existing record changes shape; one new key, no migration, no new copy.

## Technical Context

**Language/Version**: TypeScript 5 strict, React 19; React Native / Expo (`apps/mobile`), DOM via WXT MV3 (`apps/extension`) over `@salmon/ui`.

**Primary Dependencies**: none new. `lodash-es` `isEqual`, `bs58`, `@solana/kit` `createKeyPairSignerFromBytes`, `validateMnemonic` (all already used).

**Storage**: existing records unchanged. One new key, `STORAGE_KEYS.FIRST_SAVE` (`'salmon_first_save_pending'`), holding the `nonce` string of the locked vault the first save writes (`crypto/encryption.ts:31-32`; a fresh random nonce per encryption, `:324`). Absent on every existing install; no migration. Single-key writes only (research R1).

**Testing**: Vitest, Jest. `packages/shared/src/test-utils/crash-storage.ts` over the real `initStorage({ adapter })`, with storage and stash faults, "apply then throw", read faults, snapshots and relaunch as a fresh runtime; a key-sensitive cipher; one suite with `navigator.locks` removed (research R12).

**Target Platform**: iOS/Android (JS-only) and the extension side panel and popup.

**Project Type**: pnpm + turbo monorepo, two apps on two shared packages.

**Performance Goals**: no network inside the vault lock; the launch turn does reads and at most a few removals, no derivation. A save with a password derives the key once from that password (PBKDF2) when a vault exists. Single-address imports derive the Solana address of each listed phrase wallet at its Solana indexes.

**Constraints**: constitution III; single-record atomicity (FR-003); twins on one contract; no new user-facing text (FR-022).

**Scale/Scope**: `useAccountsMutations.ts`, `useAccountsMutationHelpers.ts`, `useAccountsSecurity.ts`, `storage/types.ts` (one key), `PhraseBackupContext.tsx`, `useAccountAddFlow.ts`, `useDerivedAccountsScan.ts`, both password twins, both Add wallet panels, extension `App.tsx` (two lines), one test double, eight test files.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status        | How                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Ownership boundaries             | PASS          | Decisions in `packages/shared/src/hooks`; one key in `storage/types.ts`; screens pass options and map errors; the extension host clears the phrase on success and waits for the write lock before a reload.                                                                                                                                                             |
| II. Consumers named                 | PASS          | §Consumers. One breaking change inside the repo: `addAccount`'s `replaces` becomes an options object (only caller `useAccountAddFlow.ts:476`).                                                                                                                                                                                                                          |
| III. Wallet safety (NON-NEGOTIABLE) | PASS, flagged | Write order changes; a vault is deleted only when its nonce matches the first save's note and the list is empty; a save's password is proven against the stored vault; `crypto/` untouched. Flagged for sign-off: `useAccountsMutations.ts`, `useAccountsMutationHelpers.ts`, `useAccountsSecurity.ts`, `storage/types.ts`, both password screens, extension `App.tsx`. |
| IV. Bilingual strings               | PASS          | No new key. Reused on new surfaces: `wallet.import.errors.duplicate`, `wallet.create.invalid_password`, `errors.password_throttled` (§Copy).                                                                                                                                                                                                                            |
| V. Functional coverage first        | PASS          | Shared tests on the crash double; red first where today fails, guards where it passes (§Test plan).                                                                                                                                                                                                                                                                     |
| VI. Ask rather than guess           | PASS          | Three plan questions, each built on its default.                                                                                                                                                                                                                                                                                                                        |
| Platform constraints                | PASS          | No native change.                                                                                                                                                                                                                                                                                                                                                       |
| Design tokens                       | PASS          | No visual change.                                                                                                                                                                                                                                                                                                                                                       |

_Twin components_: two existing pairs change, no new pair. Measured before any change: **cross-platform 2248 / ceiling 2265; same-side 870 / ceiling 870** (`cloneLines`; `pnpm check:parity:report` → "106 twin pairs, 0 findings"). Expected change ≤ 0.

## Architecture decisions

| Piece                                  | Lives in                                                                                                   | Reuses                                                                                      |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Deciding write                         | `writeStoredAccounts` (`useAccountsMutationHelpers.ts:86`)                                                 | the list the loader builds from (`useAccountsLoader.ts:85-99`)                              |
| First-save note, discard (FR-006/006a) | `settleFirstSave()` in `useAccountsMutationHelpers.ts`                                                     | `clearAccountsStorage`, `clearUnlockPenalty`, the vault's own `nonce` (R3)                  |
| Password proven against the vault      | `readStoredSecrets(password)`: a supplied password always opens the vault itself                           | `resolveMnemonicsWithPassword`, the throttle (R3b)                                          |
| Already saved (retry, new screen)      | `addAccount` step P5                                                                                       | `toStoredSecret`, `isEqual` (R8)                                                            |
| Duplicate and Seed Vault replacement   | `findStoredClash()`                                                                                        | `generateKeyPair`, `getSolanaDerivationPath`, `normalizeMnemonic`, `validateMnemonic` (R4)  |
| Marks                                  | `addAccount` mark write; `pruneMarks()` best effort after every save and at launch                         | `walletOf` rule (R7)                                                                        |
| Memory after a write                   | stored list mapped to held objects + the new wallet; own-write mark only when memory holds every stored id | `useLockAcrossWindows.ts:111-127` (R10)                                                     |
| Reload after another write             | extension `reloadWallets` first waits for the vault write lock                                             | `withVaultWriteLock` (R10)                                                                  |
| Stale selection                        | none new                                                                                                   | loader fallback (`useAccountsLoader.ts:122-125`), healing (`useAccountsSelection.ts:87-98`) |

Not built: batches or journals (R1); a hash of the vault (the nonce already identifies one ciphertext); a lock-reentrant wrapper (R11); a fault hook in app builds (R12).

## The write orders

A and B listed, A active. "Kill after N": the process dies right after write N landed. "Fail at N": write N throws (or, for "apply then throw", lands and throws). React state changes only on the **memory** row. No row leaves a listed id without its vault entry.

### Add wallet C (`addAccount`)

Inside `withVaultWriteLock`. If a pre-step throws, nothing is written.

| Step | What                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1   | Read `ACCOUNTS`: a throw rejects; a value present but not an array rejects (never empty, never listed). Read `MNEMONICS` raw (`getStorageItem` returns `null` only when the key is absent, `storage/storage.ts:339-348`; not `getStoredMnemonics`, which maps a corrupt value to `null`, `useAccountsSecurityHelpers.ts:64-73`), `WALLETS`, `FIRST_SAVE`.                                                                        |
| P2   | `settleFirstSave` (§FR-006 below). The only part that can reject is the discard itself; removing a stale note is best effort.                                                                                                                                                                                                                                                                                                    |
| P3   | First save (after P2: `MNEMONICS` absent, list absent or `[]`, `WALLETS` absent): remove the stash `DERIVED_KEY`. A stash failure rejects.                                                                                                                                                                                                                                                                                       |
| P4   | Open the vault. A vault exists and a password is supplied → that password must open it (`resolveMnemonicsWithPassword`, throttled, a wrong one counted), else `IncorrectPasswordError` / `UnlockThrottledError`; the proven key becomes the stash key. A vault exists and no password → cached key (`EncryptionMaterialMissingError` without one). First save → `{}`.                                                            |
| P5   | Already saved: (a) the list names C's id and its vault entry `isEqual` C's stored secret; or (b) this window's memory holds no wallet and a listed entry's stored secret is exactly equal to C's at the same position (phrase: same start). Then C takes that entry's id, name and avatar, and the save jumps to rows 5–11 (counter = `max(stored counter, list length)`), memory from storage, no own-write mark, and resolves. |
| P6   | `findStoredClash`: duplicate → `DuplicateAccountError`; a listed Seed Vault wallet S with C's address → replace S.                                                                                                                                                                                                                                                                                                               |
| P7   | base = `max(stored COUNTER ?? 0, stored list length)`; C's name = `nameFromCounter(base)` if given. V1 = stored secrets + C − unlisted entries exactly equal to C's stored secret (S's entry kept); V2 = V1 − S. List = stored list − S + C. Encrypt V1 (and V2) with the stash key (P3: the new password).                                                                                                                      |

| #   | Key                                                                                     | Value                                                                                                                                                | Kill right after leaves                                             | Next launch shows                                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `FIRST_SAVE` (first save only)                                                          | V1's nonce                                                                                                                                           | a note bound to a vault not yet written                             | note beside no vault: stale, removed; welcome                                                                                                                                                 |
| 2   | `UNCONFIRMED_PHRASES` (only `unconfirmed`)                                              | stored marks + C (no prune)                                                                                                                          | a mark naming unlisted C                                            | before-state; the mark is pruned later                                                                                                                                                        |
| 3   | `MNEMONICS`                                                                             | V1                                                                                                                                                   | C's entry unlisted; S listed with its entry                         | before-state. First save: note matches the vault, list empty → discard → welcome                                                                                                              |
| 4   | `ACCOUNTS` — **deciding**                                                               | list − S + C                                                                                                                                         | C listed with its entry; S's entry unlisted; counter, selection old | wallets after the change, each with its secret; A active on a slot it holds (FR-001); counter one behind. First save: note beside a listed wallet → removed; C active via the loader fallback |
| —   | **memory**                                                                              | stored list mapped to held objects + C (with its lock-computed name); active C; counter; lock requirement. This runtime records V1's nonce as landed | —                                                                   | —                                                                                                                                                                                             |
| 5   | `FIRST_SAVE` removed (first save only)                                                  | —                                                                                                                                                    | as row 4                                                            | as row 4                                                                                                                                                                                      |
| 6   | `COUNTER`                                                                               | base + 1                                                                                                                                             | selection old                                                       | counter right                                                                                                                                                                                 |
| 7   | `ACCOUNT_ID`                                                                            | C                                                                                                                                                    | network, slot still A's                                             | C active, slot healed                                                                                                                                                                         |
| 8   | `NETWORK_ID`                                                                            | C's network                                                                                                                                          | slot still A's                                                      | C on its network, slot healed                                                                                                                                                                 |
| 9   | `PATH_INDEX`                                                                            | C's slot                                                                                                                                             | S's entry still unlisted (replace)                                  | after-state                                                                                                                                                                                   |
| 10  | `MNEMONICS` (replace; or on P5, if unlisted Seed Vault entries with C's address remain) | V2                                                                                                                                                   | stale marks                                                         | after-state                                                                                                                                                                                   |
| 11  | `UNCONFIRMED_PHRASES` prune (best effort, only if it changes)                           | marks named by a listed `id` or `derivedFrom`                                                                                                        | —                                                                   | after-state                                                                                                                                                                                   |

Fail at 1–4: rejects, memory untouched, no mark taken back. Fail at 5–11: logged, resolves. "Apply then throw" at 1–3 rejects too; the next attempt finds the landed writes (a bound note, an unlisted entry) harmless. "Apply then throw" at 4 rejects although the wallet is listed; the retry resolves at P5.

### Remove wallet B (`removeAccount`)

| #   | Key                                               | Value                                          | Kill right after leaves                  | Next launch shows                                                              |
| --- | ------------------------------------------------- | ---------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | `ACCOUNTS` — **deciding**                         | stored list − B                                | B's entry unlisted; selection may name B | A only, with its secret; dangling active id → first listed wallet, slot healed |
| —   | **memory**                                        | stored list mapped; active moves if B was      | —                                        | —                                                                              |
| 2–4 | selection (only if B was active; failures logged) | first wallet of the new list this window holds | partial selection                        | a listed active wallet on a held pair                                          |
| 5   | `MNEMONICS`                                       | stored secrets − B                             | —                                        | after-state                                                                    |

Fail at 1: rejects, B listed. Fail at 5: memory follows the list (B gone) and the call rejects, so the existing removal error shows (`useAccountRemoval.ts:52-53`); B's entry stays unlisted. Seed Vault release only after row 5. A password supplied to `removeAccount` is proven the same way as in P4.

`clearAll`: memory first, then the stash `DERIVED_KEY` (moved before storage), then `clearAccountsStorage()` (ending with `FIRST_SAVE`), then Seed Vault releases.

### Edit wallet (`editAccount`)

| #   | Key                       | Value                            | Kill right after leaves | Next launch shows |
| --- | ------------------------- | -------------------------------- | ----------------------- | ----------------- |
| 1   | `ACCOUNTS` — **deciding** | stored list, this entry replaced | after-state             | the edit          |
| —   | **memory**                | the edited account               | —                       | —                 |

### Launch (`initAccounts`, before `runUpgrades`)

One `withVaultWriteLock` turn, reads and removals only:

| Step | What                                           | On failure                                                                                                         |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| L1   | Read `ACCOUNTS`, raw `MNEMONICS`, `FIRST_SAVE` | list read throws → init-failed gate, nothing removed                                                               |
| L2   | `settleFirstSave`                              | discard failure → init-failed gate (retry repeats it); a stale-note removal failure is logged and launch continues |
| L3   | `pruneMarks` when the list is an array         | logged; launch continues                                                                                           |

## FR-006 / FR-006a: the discard rule

The first save writes `FIRST_SAVE` = the nonce of the vault it is about to write, and only when storage has no `MNEMONICS` key, no listed wallet and no `WALLETS`. `settleFirstSave` discards (stash `DERIVED_KEY`, `clearUnlockPenalty()`, then `clearAccountsStorage()`, whose last removal is the note) only when all hold: the note is present; the list read succeeded and is absent or `[]`; the stored vault is an object whose `nonce` equals the note; and this runtime has not recorded that nonce as landed (row 4). Any later vault write (an add, a removal, a password change, an outdated-vault upgrade) gives the vault a fresh nonce, so a note left behind is inert by construction. In every other case with a note present (vault absent, nonce different, list listing a wallet) the note is stale and is removed best effort: caught, logged, never blocking launch or a save, retried on every later launch and save. A list present but not an array refuses the save and triggers neither discard nor prune. Without a note nothing is ever discarded.

| Stored state                                                        | Today                                                                                                                                                                                                                                                       | After                    |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| note = vault nonce, list empty                                      | (no note exists)                                                                                                                                                                                                                                            | discard, welcome         |
| note, vault nonce different or vault absent, or list lists a wallet | (no note exists)                                                                                                                                                                                                                                            | note removed best effort |
| vault + empty list + no note                                        | extension: lock screen (`App.tsx:485-498`). Mobile: welcome; create asks for the existing password (`password.tsx:179`); recover always asks for a **new** password (`:169`, `:179`) and every attempt fails on the stored vault and counts a failed unlock | unchanged                |
| cleartext vault + empty list                                        | protect mode                                                                                                                                                                                                                                                | unchanged                |

## Password proven against the stored vault (FR-005)

Today `readStoredSecrets` prefers a valid cached key over the password (`useAccountsMutationHelpers.ts:63-64`) and `encryptMnemonics` does the same (`encrypt-mnemonics.ts:76-79`): a save with another password can succeed while the vault stays under the first, and mobile then unlocks and enrols biometrics with the wrong one (`password.tsx:329`, `:352`). After: whenever a vault exists and the caller supplies a password, P4 opens the vault with that password; a wrong one rejects before P5 and before any write, counted by the throttle (as `readStoredSecrets`' password path already does, `:67-76`). The key it derives becomes the stash key, so P7 encrypts under the proven password.

What the setup screens show, with existing copy, through the existing helper `passwordCheckErrorKey(err, 'wallet.create.invalid_password')` (`utils/unlock-throttle.ts:45-47`, already used by `useSetupPasswordForm.ts:82`): "Invalid Password" / "Contraseña inválida", or `errors.password_throttled` while a penalty stands. The extension and mobile create with a stored vault already verify the existing password before the save (`useSetupPasswordForm`); mobile recover, which asks for a new password, reaches it from `addAccount`.

## One secret, one wallet

`findStoredClash` after P5; storage only; no network (never `restoreAccount`, whose `createBlockchainAccountForNetwork` fetches the catalog and returns `null` for a disabled network, `utils/account.ts:184-195`).

| New secret  | Refused (`DuplicateAccountError`) when                                                                                                                                                                 | Replaced when                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| Phrase      | a listed phrase equals it after `normalizeMnemonic` and the new start is an index that wallet holds on any network; or its Solana address at its start equals a listed single-address wallet's address | —                                 |
| Private key | its address is a Solana address a listed wallet holds                                                                                                                                                  | —                                 |
| Watched     | same                                                                                                                                                                                                   | —                                 |
| Seed Vault  | its address is held by a listed wallet that is not Seed Vault                                                                                                                                          | a listed Seed Vault wallet has it |

A listed phrase wallet's Solana addresses: `generateKeyPair(phrase, getSolanaDerivationPath(i))` at each distinct index in its `solana-*` `pathIndexes` only (`blockchain/solana/factory.ts:63-88`); its Bitcoin or Ethereum indexes never cause a refusal of a Solana key or address. A private key's address: `createKeyPairSignerFromBytes(bs58.decode(key))` (`factory.ts:204-219`). An entry that cannot be derived is skipped, never thrown on: a missing vault entry (read as an empty phrase, `utils/account-secret.ts:28-31`), a phrase failing `validateMnemonic`, an undecodable key. `clearSeedCache()` follows.

## Setup screens (FR-015, FR-020, FR-021)

- Both twins build the account once per screen and send the same object on every retry; Seed Vault still re-asks Seed Vault each attempt (`password.tsx:290-300`).
- "Saved" is `addAccount`'s result. P5 makes a retry of a landed save resolve and finish its later writes; a new screen instance (back and forward) with empty memory is answered "saved" for its own wallet (P5 b) instead of refused. A window that holds wallets keeps the refusal (US3 scenario 4).
- Mobile: `walletAddedRef` (`password.tsx:140-149`) goes; on the line after `addAccount` resolves the screen clears the owed-phrase ref and the account ref, then `setMnemonic(null)`: the phrase leaves React state there; the unmount cleanup puts back only what the owed ref still holds. With no phrase, submit cannot start again.
- Extension: `PasswordPage` clears its account ref on success; `handlePasswordSuccess` (`App.tsx:370`) clears `authData`, so the phrase leaves App state when the page hands over.
- Errors: `DuplicateAccountError` → `wallet.import.errors.duplicate`; `IncorrectPasswordError` / `UnlockThrottledError` → `passwordCheckErrorKey(err, 'wallet.create.invalid_password')`; others as today.

## Window memory and reloads

After an add, a replace or a removal, `accounts` is the stored list after the write, mapped to the objects this window holds plus C (carrying the name computed under the lock). `writeStoredAccounts(list, { own })` records the own-write mark only when memory holds every stored id (never on the P5 path), and clears it if the write throws; otherwise the extension listener reloads (`useLockAcrossWindows.ts:118-126`). A reload starts on the list change, before the selection rows land, and the loader would read the old selection (`useAccountsLoader.ts:103-129`). The extension's `reloadWallets` (`App.tsx:245-248`) therefore first awaits `withVaultWriteLock(async () => undefined)`, a barrier that resolves once the writing turn (selection rows included) has ended; `withVaultWriteLock` joins the hooks barrel. Mobile has one runtime and no listener.

## Owner question 5

Reachable only by deep link while unlocked (`(app)/_layout.tsx:126-130`, `(app)/settings/index.tsx:196-200`, `app/_layout.tsx:243-257`, `app.json:9`; reasoned from code). Mobile recover always asks for a new password (`password.tsx:169`, `:179`). Today, with a valid cached key the vault keeps the old password and the screen then unlocks and enrols with the new one; with an expired key the save fails. After this change the new password must open the vault (P4), so the save is refused with "Invalid Password" and nothing changes; a listed phrase is refused as a duplicate only after that.

## Pre-existing, out of scope (follow-up ticket)

Three vault or list writers run outside the vault write lock: `changeStoredPassword` (`useAccountsSecurityHelpers.ts:117-125`), the outdated-vault upgrade during unlock (`:92-96`), and the legacy migration run from `unlockAccounts` (`useAccountsSecurity.ts:215`). Each can interleave with a save in another window. This plan does not change them; their vault writes do make a stale note inert (fresh nonce).

## Copy

No new string. `wallet.import.errors.duplicate` on the setup error line and the Add wallet error sheet (`general.error` title); `wallet.create.invalid_password` and `errors.password_throttled` on mobile recover's error line.

## Consumers of what changes in `packages/shared`

| Export (change)                                                      | Consumers                                                                                                                          |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `addAccount(account, password?, options?)`                           | `useAccountAddFlow.ts:476`, `useDerivedAccountsScan.ts:343`, `PasswordPage.tsx:192`, `password.tsx:322`; type `useAccounts.ts:119` |
| `addAccount` / `removeAccount` prove a supplied password             | `useAccountAddFlow.ts:560` (re-auth, already verified), `useAccountRemoval.ts:52`, both password screens                           |
| New: `DuplicateAccountError`; barrel: `withVaultWriteLock`           | both password screens, both `AccountAddPanel.tsx`; extension `App.tsx`                                                             |
| New: `STORAGE_KEYS.FIRST_SAVE`; `clearAccountsStorage` (+ note last) | `useAccountsMutationHelpers.ts`, `clearAll`                                                                                        |
| `PhraseBackupValue` (− `markUnconfirmed`)                            | `PasswordPage.tsx:79`, `password.tsx:119`; 13 mobile mocks where typecheck requires                                                |
| `defaultName` → `nameFor(counter)` (counter before the increment)    | ui `AccountAddPanel.tsx:88-91`, mobile `AccountAddPanel.tsx:105-108`                                                               |
| `isOwnStoredAccountsWrite`                                           | `useLockAcrossWindows.ts:118`                                                                                                      |
| `initAccounts` (launch turn)                                         | `useAccounts.ts:397`, `retryInit` (`:504`)                                                                                         |

## Files to create or modify

| Package / app     | File                                                                                     | Change                                                                                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared` | `src/storage/types.ts`                                                                   | `FIRST_SAVE`                                                                                                                                                                                        |
|                   | `src/test-utils/crash-storage.ts` (new)                                                  | the double                                                                                                                                                                                          |
|                   | `src/hooks/useAccountsMutationHelpers.ts`                                                | `settleFirstSave`, landed-nonce record, password-first `readStoredSecrets`, `findStoredClash`, `pruneMarks`, `DuplicateAccountError`, `writeStoredAccounts` `own`, `clearAccountsStorage` note last |
|                   | `src/hooks/useAccountsMutations.ts`                                                      | write orders, P1–P7, memory from storage, `clearAll` key order                                                                                                                                      |
|                   | `src/hooks/useAccountsSecurity.ts`                                                       | launch turn                                                                                                                                                                                         |
|                   | `src/hooks/useAccounts.ts`, `src/hooks/index.ts`                                         | `addAccount` type; exports                                                                                                                                                                          |
|                   | `src/hooks/useAccountAddFlow.ts`, `src/hooks/useDerivedAccountsScan.ts`                  | options, `nameFor`, no memory Seed Vault lookup, post-save steps outside the failure path                                                                                                           |
|                   | `src/contexts/PhraseBackupContext.tsx`                                                   | `markUnconfirmed` removed; re-read on listed-id change; `update` under the lock                                                                                                                     |
| `packages/ui`     | `AuthFlow/PasswordPage.tsx` (+ test), `AccountAddPanel/AccountAddPanel.tsx`              | account ref, options, error mapping, `nameFor`                                                                                                                                                      |
| `apps/mobile`     | `app/(auth)/password.tsx` (+ test), `src/components/AccountAddPanel/AccountAddPanel.tsx` | refs, options, error mapping, `nameFor`                                                                                                                                                             |
| `apps/extension`  | `src/entrypoints/popup/App.tsx` (+ `App.test.tsx`)                                       | `authData` cleared on success; reload barrier                                                                                                                                                       |
| docs              | `docs/ARCHITECTURE.md:42`; `CLAUDE.md` (reviewer)                                        | one sentence; SPECKIT pointer                                                                                                                                                                       |

## Test plan (test-first)

**Doubles** (research R12):

- `crash-storage.ts`: storage adapter plus stash. Faults: `failAt(n)` (throw, not applied), `failAt(n, { applied: true })` (apply, then throw), `failStashAt(n)`, `failRead(key)` (throw) and `dropRead(key)` (returns `null`, the iOS manifest drop). `snapshots[k]` after storage write k. `relaunch(k, { keepStash? })` re-inits storage from `snapshots[k]`, calls `vi.resetModules()` and re-imports, so the own-write mark, the write queue and the landed-nonce record start fresh (two windows are two runtimes), and mounts a fresh `useAccounts`.
- Key-sensitive cipher: a vault opens only with the password or cached key it was locked under; each lock returns a fresh nonce; caches carry `expiresAt`.
- One `describe` block runs with `navigator.locks` removed (`vi.stubGlobal`), so the promise-queue path mobile uses is exercised (Node 24 has `navigator.locks`).

**Assertions** (FR-001): stopped before the deciding write → wallets, secrets, active wallet, slot, counter and password exactly as before. Stopped after it → the wallets and their entries exactly as after; the active wallet is the previous one (or C if its selection landed) on a slot it holds; the counter right or one behind, and the next save's default name is not repeated.

**`hooks/useAccountsAtomic.test.tsx`** (new). R = red first; G = guard (passes today).

| Case                                                           | Positions                                      | Asserts                                                                                                             |       |
| -------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----- |
| First save, create                                             | fail 1–11, applied 1–4, kill 0–11, stash P3    | kill < 4 → welcome; retry with another password opens with it only; kill ≥ 4 → one wallet, marked                   | R     |
| Same with `keepStash`                                          | kill 0–11                                      | as above                                                                                                            | R     |
| Note stale: first save landed, row 5 failed, then a second add | `dropRead('salmon_accounts')` at P1            | in the same runtime: no discard (landed nonce); after relaunch with a later vault write: no discard (nonce differs) | R     |
| Stale-note removal fails                                       | launch and save                                | launch completes, save completes, note retried next time                                                            | R     |
| Retry, same account                                            | fail 1–4                                       | one wallet, C's secret once                                                                                         | G     |
| Retry after "applied" at 4                                     | —                                              | resolves at P5, no second list write, counter and selection completed                                               | R     |
| New screen after "applied" at 4 (empty memory)                 | —                                              | resolves as saved with the stored id; memory from storage                                                           | R     |
| Window holding wallets, same phrase listed                     | —                                              | `DuplicateAccountError`                                                                                             | R     |
| Password proof                                                 | vault under P1, cached key valid, save with P2 | `IncorrectPasswordError`, nothing written, one failed unlock counted                                                | R     |
| Add C with A, B listed                                         | fail 2–11, kill 0–11                           | FR-001 assertions                                                                                                   | R     |
| Seed Vault replace, S only in storage                          | fail 2–11, kill 0–11                           | one wallet; every listed id has its entry at every position                                                         | R     |
| Remove B (non-active, active)                                  | fail 1–5, kill 0–5                             | memory follows the list; fail at 5 rejects with B gone; entries invariant                                           | R / G |
| Remove all                                                     | stash 1, storage 1–13, kill 0–13               | memory and stash key cleared before storage                                                                         | R / G |
| Edit                                                           | fail 1, kill 0–1                               | memory and relaunch agree                                                                                           | R     |
| Launch with a bound note                                       | fail and kill D1–D15, L3                       | welcome; prune failure does not block                                                                               | R     |
| Vault + empty list, no note; `WALLETS`; cleartext              | launch                                         | nothing removed                                                                                                     | G     |
| List read throws; list not an array                            | launch, save                                   | nothing removed; save rejects                                                                                       | G / R |
| Corrupt raw vault + empty list                                 | save                                           | not a first save (raw key present), no note written                                                                 | R     |
| Two runtimes, stale one adds the same phrase                   | —                                              | `DuplicateAccountError`; one wallet                                                                                 | R     |
| Stale runtime adds C after another added D                     | —                                              | no own-write mark; reload after the barrier shows D and C active                                                    | R     |
| Counter: kill between 4 and 6, no removal                      | —                                              | next default name not repeated                                                                                      | R     |
| Failed "Remove all", then setup with a new password            | —                                              | vault not re-encrypted; save rejects as wrong password                                                              | R     |

**Duplicate rule** (`useAccountsMutations.test.tsx`): same start refused (R); other start accepted (G); start held inside refused (R); other spacing refused (R); private key for a listed phrase's Solana address with the Solana catalog disabled refused (R); a listed phrase holding only Bitcoin index 4 does not refuse a key whose address is its Solana index 4 (R); missing vault entry and invalid phrase skipped, no throw (R); no network call during `addAccount` (G); Seed Vault replace and cross-kind refuse (R). **Adoption**: exact copy dropped (R); other spacing kept (R); other phrase kept (G).

**Marks**: saved `unconfirmed` wallet marked when killed after row 4 (G); a failed save's mark pruned by the next save and launch (R); prune failure never rejects the save (R); `derivedFrom` mark kept (R); concurrent window's mark kept (R); provider shows `needsBackup` after `addAccount` (R).

**Screens**: mobile `password.test.tsx`: reject → phrase put back (G); resolve → `mnemonic` cleared, nothing put back (R); retries send the same id (R); duplicate and wrong-password messages (R). `PasswordPage.test.tsx`: same id on retry; messages (R). `useAccountAddFlow.test.tsx`: duplicate reaches `onFailure`; `nameFor`; post-save steps never reach `onFailure` (R). `App.test.tsx`: `authData` cleared on success; reload waits for the lock (R).

**Existing tests that change**: `useAccounts.test.ts` "replaces a wallet in one write…" (`replaces` gone), "aborts addAccount when encryptMnemonics throws…" (memory after row 4), "never leaves a listed wallet without its secret when removeAccount stops…" (still rejects; asserts memory follows the list); `useAccountsMutations.test.tsx` cipher and `openWindow`; `useAccountAddFlow.test.tsx` lines 247, 362, 377; `PhraseBackupContext.test.tsx` `markUnconfirmed` case. "should detect encrypted mnemonics and set locked state" stays as a guard (no note).

## Risks specific to this change

| Risk                                             | Guard                                                                                                      | Test                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | --------------------------------- |
| A real wallet's vault is discarded               | note bound to one ciphertext's nonce; landed-nonce record in the runtime; list must read as absent or `[]` | stale-note cases; no-note guards  |
| A stale note blocks launch or a save             | its removal is best effort                                                                                 | stale-note removal fails          |
| A listed wallet without its entry                | vault before list; replaced entry after the list; list before vault on remove                              | entry invariant at every position |
| A save under the wrong password                  | supplied password proven at P4; first save drops the stash key                                             | password proof; first-save retry  |
| A user refused their own wallet                  | P5 (b) for an empty window                                                                                 | new screen after "applied" at 4   |
| A duplicate check that throws or refuses wrongly | skip underivable entries; Solana positions only                                                            | skip and Bitcoin-index cases      |
| An unconfirmed wallet unmarked                   | mark before the list; no take-back; prune separate and best effort                                         | marks cases                       |
| A reload reads the old selection                 | barrier on the write lock                                                                                  | reload waits for the lock         |

## Commit order

1. `test(shared): storage and stash double with faults and fresh runtimes; key-sensitive cipher`.
2. `fix(shared): a first save leaves a note bound to its vault; only that leftover is discarded`.
3. `fix(shared): saving a wallet lands completely or not at all` (P1–P7, rows, password proof, already-saved, clash, adoption, counter, marks, memory, own-write mark; callers).
4. `fix(shared): removing and editing a wallet decide on the list write`.
5. `fix: setup and Add wallet screens follow the save's result` (twins, panels, `App.tsx`, `PhraseBackupContext`, mocks).
6. `docs: write order for wallet changes in ARCHITECTURE.md`.

## Owner questions

1. **Deep-link recover with wallets stored** (spec Q5). Default: the save is refused with "Invalid Password" unless the new password opens the vault; whether that route should exist at all goes to a separate ticket.
2. **Counter one behind** after a stop between the list and the counter. Default: accept `max(counter, list length)`.
3. **Message placement** of existing copy on the setup screens and the Add wallet sheet. Default: yes.

## Known limitations (for the owner)

- The first save landed, removing its note failed, no vault write followed, and the list read then comes back empty after a relaunch (an iOS read fault that also lost the list): the vault is discarded.
- A removal whose vault write fails: the wallet is gone and the error shows; its entry stays in the vault unlisted.
- A vault beside an empty list with no note (pre-046 failed first save, failed "Remove all", interrupted migration) keeps today's lock screen; on mobile every recover attempt there counts a failed unlock; "Forgot password" is the way out.
- A Seed Vault replacement stopped before its last vault write leaves the replaced entry (no secret in it) unlisted.
- After a removal, a stop between the list and the counter can repeat a default name once.
- Three vault writers outside the write lock (password change, vault upgrade, legacy migration) are a follow-up ticket.

## Project Structure

### Documentation (this feature)

```text
specs/046-atomic-wallet-save/
├── plan.md
├── spec.md
├── research.md          # R1–R13
├── data-model.md
├── quickstart.md
├── contracts/accounts-mutations.md
├── checklists/requirements.md
└── tasks.md             # Phase 2
```

### Source Code (repository root)

```text
packages/shared/src/
├── storage/types.ts                      # FIRST_SAVE
├── test-utils/crash-storage.ts           # NEW
├── hooks/useAccountsMutationHelpers.ts   # note, discard, password proof, clash, prune, error, own-write mark
├── hooks/useAccountsMutations.ts         # write orders, memory from storage
├── hooks/useAccountsSecurity.ts          # launch turn
├── hooks/useAccountAddFlow.ts, useDerivedAccountsScan.ts
└── contexts/PhraseBackupContext.tsx

packages/ui/src/components/{AuthFlow/PasswordPage.tsx, AccountAddPanel/AccountAddPanel.tsx}
apps/mobile/{app/(auth)/password.tsx, src/components/AccountAddPanel/AccountAddPanel.tsx}
apps/extension/src/entrypoints/popup/App.tsx
```

**Structure Decision**: every decision is one implementation in `packages/shared/src/hooks`, under the vault write lock; the screens keep the built account, pass options and map errors to existing copy.

## Complexity Tracking

| Violation                                   | Why Needed                                                                          | Simpler Alternative Rejected Because                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| One new storage key                         | FR-006a: shape alone cannot tell a first-save leftover from a migration's only copy | Shape-based discard; a flag inside an existing record (format change) |
| Phrase derivation inside the lock           | FR-011: the address clash is decided on storage, which stores no addresses          | Memory misses other windows and locked windows                        |
| Two vaults encrypted per Seed Vault replace | no row may leave a listed id without its entry                                      | One vault write before the list                                       |
