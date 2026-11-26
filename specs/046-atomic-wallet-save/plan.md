# Implementation Plan: Saving a wallet is all-or-nothing, and one secret is one wallet

**Branch**: `fix/046-atomic-wallet-save` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/046-atomic-wallet-save/spec.md` as revised on 2026-11-26 (FR-001, FR-006, FR-006a, FR-019, owner question 1, US3 scenario 4 and the two-window edge case), after three adversarial review rounds on this plan; questions 2 to 5 on their recommended defaults.

## Summary

Every change to the stored wallets has one deciding write, the wallet list (`STORAGE_KEYS.ACCOUNTS`), because the loader builds only listed wallets. Three general rules carry the design: a mutation fails closed when a read contradicts the rest (Rule 1); a deciding write that throws is settled by reading it back (Rule 2); a wallet storage already lists with the same secret at the same position is adopted by a window that does not show it and refused by one that does (Rule 3). A save writes the vault before the list and keeps every listed wallet's entry until the list has landed; a removal writes the list before the vault; an edit writes only the list. A first save leaves a note holding its vault's nonce; only that exact vault, beside an empty list, in a runtime holding no wallet, is ever discarded. A supplied password must open the stored vault. No existing record changes shape; one new key; no new copy.

## Technical Context

**Language/Version**: TypeScript 5 strict, React 19; React Native / Expo (`apps/mobile`), DOM via WXT MV3 (`apps/extension`) over `@salmon/ui`.

**Primary Dependencies**: none new (`lodash-es` `isEqual`, `bs58`, `@solana/kit` `createKeyPairSignerFromBytes`, `validateMnemonic`, all already used).

**Storage**: existing records unchanged. One new key, `STORAGE_KEYS.FIRST_SAVE` (`'salmon_first_save_pending'`), holding the `nonce` of the locked vault the first save writes (`crypto/encryption.ts:31-32`, fresh per encryption `:324`). Absent on existing installs; no migration. Single-key writes only (research R1).

**Testing**: Vitest, Jest. `packages/shared/src/test-utils/crash-storage.ts` over the real `initStorage({ adapter })` with storage and stash faults, "apply then throw", lying reads (throw, `null`, unparseable), snapshots, and relaunch as a fresh runtime; a key-sensitive cipher; one suite without `navigator.locks` (research R12).

**Target Platform**: iOS/Android (JS-only) and the extension side panel and popup.

**Project Type**: pnpm + turbo monorepo, two apps on two shared packages.

**Performance Goals**: no network inside the vault lock; the launch turn does reads and removals only. Loading memory after an adoption happens after the lock is released.

**Constraints**: constitution III; single-record atomicity (FR-003); twins on one contract; no new user-facing text (FR-022).

**Scale/Scope**: `useAccountsMutations.ts`, `useAccountsMutationHelpers.ts`, `useAccountsSecurity.ts`, `useAccounts.ts`, `storage/types.ts` (one key), `PhraseBackupContext.tsx`, `useAccountAddFlow.ts`, `useDerivedAccountsScan.ts`, both password twins, both Add wallet panels, extension `App.tsx`, one test double, eight test files.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status        | How                                                                                                                                                                                                                                                                         |
| ----------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Ownership boundaries             | PASS          | Decisions in `packages/shared/src/hooks`; one key in `storage/types.ts`; screens pass options, keep the built account, map errors; the extension host clears the phrase and orders its reload after the write turn.                                                         |
| II. Consumers named                 | PASS          | §Consumers. One breaking change inside the repo: `addAccount`'s `replaces` becomes an options object (only caller `useAccountAddFlow.ts:476`).                                                                                                                              |
| III. Wallet safety (NON-NEGOTIABLE) | PASS, flagged | Fail-closed reads before every destructive write; a vault deleted only under the bound note; a supplied password proven against the vault; `crypto/` untouched. Flagged for sign-off: the four hooks files, `storage/types.ts`, both password screens, extension `App.tsx`. |
| IV. Bilingual strings               | PASS          | No new key. Reused on new surfaces: `wallet.import.errors.duplicate`, `wallet.create.invalid_password`, `errors.password_throttled`.                                                                                                                                        |
| V. Functional coverage first        | PASS          | Shared tests on the crash double, red first or labelled guard (§Test plan).                                                                                                                                                                                                 |
| VI. Ask rather than guess           | PASS          | Three plan questions, each built on its default.                                                                                                                                                                                                                            |
| Platform constraints, tokens        | PASS          | No native or visual change.                                                                                                                                                                                                                                                 |

_Twin components_: two existing pairs change, no new pair. Measured before any change: **cross-platform 2248 / ceiling 2265; same-side 870 / ceiling 870** (`cloneLines`; `pnpm check:parity:report` → "106 twin pairs, 0 findings"). Expected change ≤ 0.

## The three rules

**Rule 1 — fail closed on a read that contradicts the rest.** Before its first write, every mutation (add, remove, edit) and the discard reject, writing nothing, when: the raw vault key is present but unparseable; the vault key is absent while the list names a wallet or `WALLETS` is present; the list reads absent or `[]` while this runtime's memory holds a wallet (placeholders of a locked window count); or the list is present but not an array. The rejection is a plain `Error` (no new class, no new copy; screens keep today's generic message). "No secrets" (`{}`) exists only on the first-save branch: no vault key, list absent or `[]`, no `WALLETS`, memory empty. This replaces today's `readStoredSecrets` returning `{}` when `getStoredMnemonics()` is `null` (`useAccountsMutationHelpers.ts:60-61`, `useAccountsSecurityHelpers.ts:64-73`) and `readStoredAccounts`' `?? []` (`useAccountsMutationHelpers.ts:105-107`), which today let a lying read drop every other wallet.

**Rule 2 — a thrown deciding write is settled by reading back.** When the list write of add, remove or edit throws, the mutation reads `ACCOUNTS` again. If it equals the list just written, the mutation continues as a success (later rows, memory, resolve). Otherwise (different, absent, or the read throws) it rejects with memory untouched. A reject therefore means "not stored as far as storage can tell", and Rule 3 makes a retry safe either way. Rows before the list that throw reject without reading back; what they may have left (a bound note, a mark, an unlisted entry) is harmless.

**Rule 3 — already saved versus duplicate.** One definition for every entry point (setup, Add wallet, derived scan): storage lists a wallet whose stored secret is exactly equal (`isEqual`, no normalisation) to the new one at the same position (phrase: same starting index; other kinds: the secret alone). If this window's memory does not hold that listed id, the save resolves as already saved: it adopts the stored id, name and avatar, completes the later rows, and, after the lock is released, loads memory from storage (every stored wallet). If memory holds that id, `DuplicateAccountError`. Every other clash (a phrase equal only after normalising, a held non-starting index, an address held by another wallet) is `DuplicateAccountError` whatever memory holds; a listed Seed Vault wallet with the same address but a different secret is replaced.

## Architecture decisions

| Piece                                  | Lives in                                                                                                                                            | Reuses                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Fail-closed reads (Rule 1)             | `readStoredWallets(memoryHoldsWallets)` in `useAccountsMutationHelpers.ts`, replacing `readStoredAccounts` + the `{}` branch of `readStoredSecrets` | `getStorageItem` raw semantics (`storage/storage.ts:339-348`), `isEncryptedMnemonics` |
| Read-back (Rule 2)                     | `writeStoredAccounts` returns after a confirming read when the write throws                                                                         | `isEqual`                                                                             |
| Already saved / duplicate (Rule 3)     | `findStoredClash()` → `{ adopt: id }`, `{ replace: id }`, `null` or throws                                                                          | `generateKeyPair`, `getSolanaDerivationPath`, `normalizeMnemonic`, `validateMnemonic` |
| Memory after an adoption               | `loadAccounts(secrets)` injected into the mutations, called after the lock                                                                          | `useAccountsLoader.ts:83-142`                                                         |
| First-save note, discard (FR-006/006a) | `settleFirstSave()`                                                                                                                                 | `clearAccountsStorage`, `clearUnlockPenalty`, the vault `nonce`                       |
| Password proof (FR-005)                | `readStoredWallets(…, password)`: a supplied password opens the vault itself                                                                        | `resolveMnemonicsWithPassword`, the throttle                                          |
| Marks                                  | mark write before the vault; separate best-effort prune after every save and at launch                                                              | `walletOf` rule (`PhraseBackupContext.tsx:63-66`)                                     |
| Memory after a write                   | stored list mapped to held objects + the new wallet; own-write mark only when memory holds every stored id                                          | `useLockAcrossWindows.ts:111-127`                                                     |
| Reload ordering (extension)            | `reloadWallets` awaits `withVaultWriteLock(async () => undefined)` first                                                                            | `withVaultWriteLock`                                                                  |

Deleted from the previous revision: the runtime "landed nonce" record (Rule 1's memory check covers it, §FR-006); the special "memory holds no wallet" adoption and "same id" idempotent branches (Rule 3 covers both); dropping "any unlisted Seed Vault entry with that address" on the adoption path (only S by id, normal path only).

## The write orders

A and B listed, A active. "Kill after N": the process dies right after write N landed. "Fail at N": write N throws without landing; "applied at N": it lands and throws. React state changes only on the **memory** row. No row leaves a listed id without its vault entry.

### Add wallet C (`addAccount`)

Inside `withVaultWriteLock`. A pre-step that throws writes nothing.

| Step | What                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1   | Read `ACCOUNTS`, raw `MNEMONICS`, `WALLETS`, `FIRST_SAVE`. A read that throws rejects. Rule 1 checks.                                                                                                                                                                                                                                                                                                                                                            |
| P2   | `settleFirstSave` (§FR-006). Only the discard can reject; a stale-note removal is best effort.                                                                                                                                                                                                                                                                                                                                                                   |
| P3   | First-save branch (no vault key, list absent or `[]`, no `WALLETS`, memory empty): remove the stash `DERIVED_KEY`; a stash failure rejects.                                                                                                                                                                                                                                                                                                                      |
| P4   | Open the vault. Vault present + password supplied → that password must open it (`resolveMnemonicsWithPassword`); only `IncorrectPasswordError` counts as a failed unlock; a standing penalty → `UnlockThrottledError`; `InvalidVaultError`, the cleartext check or a stash failure propagate uncounted. The derived key becomes the stash key. Vault present, no password → cached key (`EncryptionMaterialMissingError` without one). First-save branch → `{}`. |
| P5   | `findStoredClash` (Rule 3, then the duplicate rules; pure derivation, no network): adopt → go to the adoption rows; duplicate → `DuplicateAccountError`; listed Seed Vault S with C's address and a different secret → replace S.                                                                                                                                                                                                                                |
| P6   | base = `max(stored COUNTER ?? 0, stored list length)`; C's name = `nameFromCounter(base)` if given (counter before the increment; `generateAccountName` adds 1, `utils/account.ts:164-168`). V1 = stored secrets + C − unlisted entries exactly equal to C's stored secret (S kept); V2 = V1 − S. List = stored list − S + C. Encrypt V1 (and V2).                                                                                                               |

| #   | Key                                         | Value                                                                                            | Kill right after leaves                                             | Next launch shows                                                                                                                                                                         |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `FIRST_SAVE` (first save only)              | V1's nonce                                                                                       | a note, no vault                                                    | stale note removed; welcome                                                                                                                                                               |
| 2   | `UNCONFIRMED_PHRASES` (only `unconfirmed`)  | stored marks + C                                                                                 | a mark naming unlisted C                                            | before-state; mark pruned later                                                                                                                                                           |
| 3   | `MNEMONICS`                                 | V1                                                                                               | C's entry unlisted; S listed with its entry                         | before-state. First save: bound note, empty list, empty memory → discard → welcome                                                                                                        |
| 4   | `ACCOUNTS` — **deciding** (Rule 2 on throw) | list − S + C                                                                                     | C listed with its entry; S's entry unlisted; counter, selection old | wallets after the change, each with its secret; A active on a held slot (FR-001); counter one behind. First save: note beside a listed wallet → removed; C active via the loader fallback |
| —   | **memory**                                  | stored list mapped to held objects + C (lock-computed name); active C; counter; lock requirement | —                                                                   | —                                                                                                                                                                                         |
| 5   | `FIRST_SAVE` removed (first save only)      | —                                                                                                | as row 4                                                            | as row 4                                                                                                                                                                                  |
| 6   | `COUNTER`                                   | base + 1                                                                                         | selection old                                                       | counter right                                                                                                                                                                             |
| 7–9 | `ACCOUNT_ID`, `NETWORK_ID`, `PATH_INDEX`    | C and its slot                                                                                   | partial selection; S's entry unlisted (replace)                     | C active, slot healed; after-state                                                                                                                                                        |
| 10  | `MNEMONICS` (replace only)                  | V2; then the Seed Vault release rule for S's token (released only when no stored wallet uses it) | —                                                                   | after-state                                                                                                                                                                               |
| 11  | `UNCONFIRMED_PHRASES` prune (best effort)   | marks named by a listed `id` or `derivedFrom`                                                    | —                                                                   | after-state                                                                                                                                                                               |

Fail at 1–3 (thrown or applied): rejects, memory untouched, no mark taken back. Row 4 throws: Rule 2. Fail at 5–11: logged, resolves.

**Adoption rows** (Rule 3, memory does not hold the listed id W): 5 (note removed if present, best effort), 6 (`COUNTER` = `max(stored counter, list length)`, only if it grows), 7–9 (W's selection), 11 (prune). No vault write: an entry left by an earlier replacement is not identified and stays unlisted. Then the lock is released, memory is loaded from storage with `loadAccounts`, and the call resolves. The own-write mark is not set.

### Remove wallet B (`removeAccount`)

Pre-steps: P1 Rule 1 checks (memory holds B, so a list read as absent or `[]` rejects); P4 password proof when a password is supplied.

| #   | Key                                          | Value                                          | Kill right after leaves                  | Next launch shows                                             |
| --- | -------------------------------------------- | ---------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| 1   | `ACCOUNTS` — **deciding** (Rule 2 on throw)  | stored list − B                                | B's entry unlisted; selection may name B | A only; dangling active id → first listed wallet, slot healed |
| —   | **memory**                                   | stored list mapped; active moves if B was      | —                                        | —                                                             |
| 2–4 | selection (if B was active; failures logged) | first wallet of the new list this window holds | partial selection                        | a listed active wallet on a held pair                         |
| 5   | `MNEMONICS`                                  | stored secrets − B                             | —                                        | after-state                                                   |

Row 5 throws: memory follows the list (B gone) and the call rejects, so the existing removal error shows (`useAccountRemoval.ts:52-53`); B's entry stays unlisted. The Seed Vault release runs after row 5. If list and vault both end empty, `clearAll` runs instead.

`clearAll`: memory, then stash `DERIVED_KEY` (moved before storage), then `clearAccountsStorage()` (now also removing `UNCONFIRMED_PHRASES`, then `FIRST_SAVE` last), then Seed Vault releases.

### Edit wallet (`editAccount`)

Pre-step: P1 Rule 1 checks (a list read as absent or `[]` rejects; today the edit silently does nothing, `useAccountsMutations.ts:213-214`).

| #   | Key                                         | Value                            | Kill right after leaves | Next launch shows |
| --- | ------------------------------------------- | -------------------------------- | ----------------------- | ----------------- |
| 1   | `ACCOUNTS` — **deciding** (Rule 2 on throw) | stored list, this entry replaced | after-state             | the edit          |
| —   | **memory**                                  | the edited account               | —                       | —                 |

### Launch (`initAccounts`, before `runUpgrades`)

One `withVaultWriteLock` turn, reads and removals only, no derivation. At launch memory is empty.

| Step | What                                                                | On failure                                                                               |
| ---- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| L1   | Read `ACCOUNTS`, raw `MNEMONICS`, `FIRST_SAVE`                      | a read throws → init-failed gate, nothing removed                                        |
| L2   | `settleFirstSave`                                                   | discard failure → init-failed gate (retry repeats it); stale-note removal failure logged |
| L3   | Prune marks (absent list counts as `[]`; non-array list → no prune) | logged; launch continues                                                                 |

## FR-006 / FR-006a: the discard rule

A first save writes `FIRST_SAVE` = the nonce of the vault it is about to write, only on the first-save branch. `settleFirstSave` discards (stash `DERIVED_KEY`, `clearUnlockPenalty()`, then `clearAccountsStorage()` with the note removed last) only when: the note is present; the list read succeeded and is absent or `[]`; the stored vault parses and its `nonce` equals the note; and this runtime's memory holds no wallet (Rule 1). Any later vault write gives the vault a fresh nonce, so a forgotten note is inert. Any other note is stale and removed best effort (caught, logged, retried on every launch and save). Without a note nothing is ever discarded.

Same-runtime cases, without the deleted "landed nonce" record:

- First save, row 4 applied and thrown: Rule 2 reads the list back, finds C, continues; memory holds C, so no discard in this runtime.
- Row 4 thrown and the read-back finds nothing: reject, memory empty. A retry reads the list again: if C is there, Rule 3 adopts it (memory then holds C); if the list truly is empty, the bound leftover is discarded and the save runs as a first save.
- The read-back and the next reads both lie (the list exists but reads empty) while memory is empty: the bound vault is discarded. This is the one residual case (Known limitations).

| Stored state                                              | Today                                                                                                                                                                                                                                        | After                    |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| note = vault nonce, list empty, memory empty              | (no note exists)                                                                                                                                                                                                                             | discard, welcome         |
| note, vault absent or nonce different, or a listed wallet | (no note exists)                                                                                                                                                                                                                             | note removed best effort |
| vault + empty list + no note                              | extension: lock screen (`App.tsx:485-498`). Mobile: welcome; create asks for the existing password (`password.tsx:179`); recover always asks for a new password (`:169`, `:179`), each attempt fails on the vault and counts a failed unlock | unchanged                |
| vault key present but unparseable                         | treated as no vault: a save writes a new vault over it (`useAccountsSecurityHelpers.ts:64-73`)                                                                                                                                               | every mutation rejects   |

## Password proven against the stored vault (FR-005)

Today the cached key wins over a supplied password (`useAccountsMutationHelpers.ts:63-64`, `encrypt-mnemonics.ts:76-79`), so a save under another password succeeds while the vault stays under the first, and mobile then unlocks and enrols with the wrong one (`password.tsx:329`, `:352`); and any error on the password path counts as a failed unlock (`useAccountsMutationHelpers.ts:70-75`). After: P4 opens the vault with a supplied password; only `IncorrectPasswordError` is counted; the derived key becomes the stash key, so encryption uses the proven password. The same proof applies to `removeAccount(id, password)`. Screens show `passwordCheckErrorKey(err, 'wallet.create.invalid_password')` (`utils/unlock-throttle.ts:45-47`) for `IncorrectPasswordError` and `UnlockThrottledError` only; any other error keeps today's generic message.

## Duplicate rules

`findStoredClash(account, list, secrets, heldIds)` after P4; storage only; no network (never `restoreAccount`, whose `createBlockchainAccountForNetwork` fetches the catalog and returns `null` for a disabled network, `utils/account.ts:184-195`).

| New secret  | Adopt / `DuplicateAccountError` (Rule 3)          | Also `DuplicateAccountError` when                                                                                                                                      | Replace                                                    |
| ----------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Phrase      | a listed entry exactly equal, same starting index | equal after `normalizeMnemonic` and the new start is an index that wallet holds on any network; or its Solana address at its start is a listed single-address wallet's | —                                                          |
| Private key | a listed entry exactly equal                      | its address is a listed Solana address                                                                                                                                 | —                                                          |
| Watched     | same                                              | same                                                                                                                                                                   | —                                                          |
| Seed Vault  | same                                              | its address is held by a listed wallet that is not Seed Vault                                                                                                          | a listed Seed Vault wallet, same address, different secret |

Solana addresses of a listed phrase wallet: `generateKeyPair(phrase, getSolanaDerivationPath(i))` (`blockchain/solana/factory.ts:63-88`) for each non-null index in its `solana-*` `pathIndexes`; Bitcoin and Ethereum indexes are never compared. A private key's address: `createKeyPairSignerFromBytes(bs58.decode(key))` (`factory.ts:204-219`). Skipping is per index and per entry, never per wallet: an index whose derivation fails, a missing entry (read as an empty phrase, `utils/account-secret.ts:28-31`), a phrase failing `validateMnemonic`, an undecodable key. `clearSeedCache()` follows.

## Setup screens and Add wallet (FR-015, FR-020, FR-021)

- **Built once.** Both setup twins build the account on the first submit and keep it in a ref for the screen's life; `useAccountAddFlow` builds it once per confirm cycle (today rebuilt at `useAccountAddFlow.ts:401-405`, `:512-513`, `:559-560`) and keeps it until the flow's input changes or it steps back. Seed Vault setup still re-asks Seed Vault each attempt (`password.tsx:290-300`).
- **"Saved" is the result.** A retry on the same screen with the same account, after a list write that landed but was not confirmed, is adopted under Rule 3 (memory does not hold the id). A new screen instance (back and forward) builds a new id; storage lists the exact secret at the same position, memory does not hold it, so it is adopted as well.
- **Mobile**: `walletAddedRef` (`password.tsx:140-149`) goes. On the line after `addAccount` resolves, the screen clears the owed-phrase ref and the account ref, then `setMnemonic(null)`: the phrase leaves React state there; the unmount cleanup puts back only what the owed ref still holds.
- **Extension**: `PasswordPage` clears its account ref on success; `handlePasswordSuccess` (`App.tsx:370`) clears `authData`, so the phrase leaves App state when the page hands over.
- **Errors**: `DuplicateAccountError` → `wallet.import.errors.duplicate`; `IncorrectPasswordError`, `UnlockThrottledError` → `passwordCheckErrorKey(err, 'wallet.create.invalid_password')`; others as today. Nothing after `addAccount` throws on either twin, so a saved wallet always moves on.

## Window memory and reloads

After a write, `accounts` is the stored list mapped to held objects plus C (with its lock-computed name). `writeStoredAccounts(list, { own })` records the own-write mark only when memory holds every stored id (never on adoption) and clears it on a throw; otherwise the extension listener reloads (`useLockAcrossWindows.ts:118-126`). A reload fires on the list change while the writer still holds the lock, before its selection rows; the loader would read the old selection (`useAccountsLoader.ts:103-129`). The extension's `reloadWallets` (`App.tsx:245-248`) therefore first awaits `withVaultWriteLock(async () => undefined)`; this only orders the reload after the turn in flight when it starts, nothing more. On Android, the dApp sheet is a second React root registered from the same bundle (`apps/mobile/index.js:183-187`, `src/mwa/MwaRoot.tsx:59`) with its own `AccountsProvider` (`src/providers/AppProviders.tsx:85`), so its own wallet memory; it shares the module-level write queue only if it shares the JS runtime (assumed, not verified on device). It has no list listener and calls no wallet mutation (`grep` over `src/mwa`), so it never writes a list the main root would need to reload; each root reads storage when it loads.

## Owner question 5

Reachable only by deep link while unlocked (`(app)/_layout.tsx:126-130`, `(app)/settings/index.tsx:196-200`, `app/_layout.tsx:243-257`, `app.json:9`; reasoned from code). Mobile recover always asks for a new password. Today the save succeeds under the old cached key (or fails if it expired). After: the new password must open the vault, so the save is refused with "Invalid Password" unless it does.

## Pre-existing, out of scope (follow-up ticket)

`changeStoredPassword` (`useAccountsSecurityHelpers.ts:117-125`), the outdated-vault upgrade during unlock (`:92-96`) and the legacy migration run from `unlockAccounts` (`useAccountsSecurity.ts:215`) write the vault or the list outside the write lock.

## Copy

No new string: `wallet.import.errors.duplicate` (setup error line, Add wallet sheet under `general.error`), `wallet.create.invalid_password` and `errors.password_throttled` (mobile recover error line).

## Consumers of what changes in `packages/shared`

| Export (change)                                                               | Consumers                                                                                                                          |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `addAccount(account, password?, options?)`                                    | `useAccountAddFlow.ts:476`, `useDerivedAccountsScan.ts:343`, `PasswordPage.tsx:192`, `password.tsx:322`; type `useAccounts.ts:119` |
| `addAccount`, `removeAccount`, `editAccount`: Rule 1 rejections, Rule 2       | the same, `useAccountRemoval.ts:52`, `panelRegistry.tsx` (both apps), `useEnsureMirrorNetworks.ts:46`                              |
| New: `DuplicateAccountError`; barrel `withVaultWriteLock`                     | both password screens, both `AccountAddPanel.tsx`; extension `App.tsx`                                                             |
| New: `STORAGE_KEYS.FIRST_SAVE`; `clearAccountsStorage` (+ marks, + note last) | `useAccountsMutationHelpers.ts`, `clearAll`                                                                                        |
| `useAccountsMutations` params (+ `loadAccounts`)                              | `useAccounts.ts:439`                                                                                                               |
| `PhraseBackupValue` (− `markUnconfirmed`)                                     | `PasswordPage.tsx:79`, `password.tsx:119`; 13 mobile mocks where typecheck requires                                                |
| `defaultName` → `nameFor(counter)`                                            | ui `AccountAddPanel.tsx:88-91`, mobile `AccountAddPanel.tsx:105-108`                                                               |
| `isOwnStoredAccountsWrite`                                                    | `useLockAcrossWindows.ts:118`                                                                                                      |
| `initAccounts` (launch turn)                                                  | `useAccounts.ts:397`, `retryInit` (`:504`)                                                                                         |

## Files to create or modify

| Package / app     | File                                                                                     | Change                                                                                                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared` | `src/storage/types.ts`                                                                   | `FIRST_SAVE`                                                                                                                                                                             |
|                   | `src/test-utils/crash-storage.ts` (new)                                                  | the double                                                                                                                                                                               |
|                   | `src/hooks/useAccountsMutationHelpers.ts`                                                | `readStoredWallets` (Rule 1, password proof), `writeStoredAccounts` (Rule 2, `own`), `settleFirstSave`, `findStoredClash`, `pruneMarks`, `DuplicateAccountError`, `clearAccountsStorage` |
|                   | `src/hooks/useAccountsMutations.ts`                                                      | three write orders, adoption rows, memory from storage, `clearAll` key order                                                                                                             |
|                   | `src/hooks/useAccountsSecurity.ts`, `src/hooks/useAccounts.ts`, `src/hooks/index.ts`     | launch turn; `loadAccounts` passed to the mutations; types; exports                                                                                                                      |
|                   | `src/hooks/useAccountAddFlow.ts`, `src/hooks/useDerivedAccountsScan.ts`                  | build once per confirm cycle, options, `nameFor`, no memory Seed Vault lookup, follow-ups outside the failure path                                                                       |
|                   | `src/contexts/PhraseBackupContext.tsx`                                                   | `markUnconfirmed` removed; re-read on listed-id change; `update` under the lock                                                                                                          |
| `packages/ui`     | `AuthFlow/PasswordPage.tsx` (+ test), `AccountAddPanel/AccountAddPanel.tsx`              | account ref, options, error mapping, `nameFor`                                                                                                                                           |
| `apps/mobile`     | `app/(auth)/password.tsx` (+ test), `src/components/AccountAddPanel/AccountAddPanel.tsx` | refs, options, error mapping, `nameFor`                                                                                                                                                  |
| `apps/extension`  | `src/entrypoints/popup/App.tsx` (+ `App.test.tsx`)                                       | `authData` cleared on success; reload barrier                                                                                                                                            |
| docs              | `docs/ARCHITECTURE.md:42`; `CLAUDE.md` (reviewer)                                        | one sentence; SPECKIT pointer                                                                                                                                                            |

## Test plan (test-first)

**Doubles** (research R12): `crash-storage.ts` with storage and stash faults (`failAt(n)`, `failAt(n, { applied: true })`, `failStashAt(n)`), lying reads (`failRead(key)` throws, `dropRead(key)` returns `null`, `garbleRead(key)` returns an unparseable string), snapshots after each write, and `relaunch(k, { keepStash? })` with `vi.resetModules()` so each relaunch or second window is a fresh runtime (own-write mark, write queue). A key-sensitive see-through cipher with a fresh nonce per lock. One `describe` with `navigator.locks` removed.

**Assertions** (FR-001): stopped before the deciding write → wallets, secrets, active wallet, slot, counter, password exactly as before. After it → wallets and entries exactly as after; active = previous (or C if its selection landed) on a held slot; counter right or one behind, next default name not repeated.

R = red first; G = guard (passes today, kept).

| Case                                                                                                                                                     | Asserts                                                                                                                                         |                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| First save, create: fail 1–11, kill 0–11, stash fault at P3, with and without `keepStash`                                                                | kill < 4 → welcome; retry with another password opens with it only; kill ≥ 4 → one wallet, marked                                               | R                       |
| Add C with A, B listed: fail 2–11, kill 0–11                                                                                                             | FR-001 assertions                                                                                                                               | R                       |
| Seed Vault replace, S only in storage: fail 2–11, kill 0–11                                                                                              | one wallet; every listed id has its entry at every position; release rule                                                                       | R                       |
| Remove B (non-active, active): fail 1–5, kill 0–5                                                                                                        | memory follows the list; row 5 throws → rejects with B gone; entries invariant                                                                  | R / G                   |
| Remove all: stash 1, storage 1–14, kill 0–14                                                                                                             | memory and stash key cleared before storage; marks gone                                                                                         | R / G                   |
| Edit: fail 1, kill 0–1                                                                                                                                   | memory and relaunch agree                                                                                                                       | R                       |
| **Applied then thrown at the deciding write**: setup create, setup recover, Add wallet, extension back-and-forward (new screen), remove, edit            | read-back confirms → resolves with the later rows; read-back fails → rejects, retry adopts (add) or finds the change (remove, edit); one wallet | R                       |
| **Dropped or garbled vault read** on a normal add and on a removal                                                                                       | rejects, nothing written, other wallets' entries intact                                                                                         | R                       |
| **Dropped list read with memory holding wallets** (add, remove, edit)                                                                                    | rejects, nothing written                                                                                                                        | R                       |
| Password proof on `addAccount` and on `removeAccount` (vault under P1, cached key valid, P2 supplied)                                                    | `IncorrectPasswordError`, nothing written, one failed unlock; a stash fault on that path is not counted                                         | R                       |
| Launch with a bound note: fail and kill D1–D16, L3                                                                                                       | welcome; prune failure does not block                                                                                                           | R                       |
| Stale note beside a listed wallet (first save landed, row 5 failed), then `dropRead('salmon_accounts')` at the next save in a runtime holding the wallet | no discard; the save rejects under Rule 1                                                                                                       | G                       |
| Corrupt raw vault, empty list, then a save                                                                                                               | no note written; the save rejects under Rule 1                                                                                                  | G (no note), R (reject) |
| Vault + empty list, no note; `WALLETS`; cleartext vault                                                                                                  | launch removes nothing                                                                                                                          | G                       |
| List not an array                                                                                                                                        | launch: no discard, no prune; save rejects                                                                                                      | G / R                   |
| Non-reentrant fake lock, first save                                                                                                                      | no deadlock                                                                                                                                     | R                       |
| **Two runtimes, stale one adds W** (another window added it)                                                                                             | adopts W: no second entry, memory loaded from storage shows W once with its name and picture                                                    | R                       |
| Window holding W adds W's exact secret again                                                                                                             | `DuplicateAccountError`                                                                                                                         | R                       |
| Stale runtime adds C after another added D                                                                                                               | no own-write mark; reload after the barrier shows D, C active                                                                                   | R                       |
| Counter: kill between 4 and 6, no removal                                                                                                                | next default name not repeated                                                                                                                  | R                       |
| Failed "Remove all" then setup with a new password                                                                                                       | not a first save (vault key present, memory empty, list absent) → password proof refuses; vault unchanged                                       | R                       |

**Duplicate rules** (`useAccountsMutations.test.tsx`): same start, other spacing → `DuplicateAccountError` (R); other start → saved (G); held non-starting index refused (R); key for a listed phrase's Solana address with the catalog disabled refused (R); phrase holding only Bitcoin index 4 does not refuse the key at Solana index 4 (R); a null index and a missing entry are skipped, the wallet's other indexes still compared (R); no network during `addAccount` (G); Seed Vault replace and cross-kind refusal (R). **Adoption of unlisted copies**: exact copy dropped (R); other spacing kept (R); other phrase kept (G).

**Marks**: saved `unconfirmed` wallet marked when killed after row 4 (G); failed save's mark pruned at the next save and launch (R); prune failure never rejects (R); `derivedFrom` mark kept (R); concurrent window's mark kept (R); marks gone after a discard and after "Remove all" (R); provider shows `needsBackup` after `addAccount` (R).

**Screens**: mobile `password.test.tsx` (phrase put back on reject G; cleared on resolve R; same account id on retry R; messages R); `PasswordPage.test.tsx` (same id; messages R); `useAccountAddFlow.test.tsx` (account built once per confirm cycle, through re-auth; duplicate reaches `onFailure`; `nameFor`; follow-ups never reach `onFailure`, R); `App.test.tsx` (`authData` cleared; reload waits for the lock, R).

**Existing tests that change**: `useAccounts.test.ts` "replaces a wallet in one write…" (`replaces` gone), "aborts addAccount when encryptMnemonics throws…" (memory after row 4), "never leaves a listed wallet without its secret when removeAccount stops…" (still rejects at the vault; memory follows the list); `useAccountsMutations.test.tsx` cipher, `openWindow` and "writes nothing when the wallet it edits is no longer stored" (now rejects under Rule 1 when the list reads empty; unchanged when the list lacks only that id); `useAccountAddFlow.test.tsx` lines 247, 362, 377; `PhraseBackupContext.test.tsx` `markUnconfirmed` case. "should detect encrypted mnemonics and set locked state" stays as a guard.

## Risks specific to this change

| Risk                                                  | Guard                                                            | Test                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| A lying read drops other wallets                      | Rule 1                                                           | dropped and garbled reads on add, remove, edit        |
| A stored change reported as failed, then stored twice | Rule 2 read-back; Rule 3 adoption                                | applied-then-thrown on every mutation and entry point |
| A real vault discarded                                | bound note, empty list read, empty memory                        | stale-note and no-note guards                         |
| A stale note blocks launch or a save                  | best-effort removal                                              | stale-note removal failure                            |
| A listed wallet without its entry                     | vault before list; S after the list; list before vault on remove | entry invariant at every position                     |
| A save under the wrong password                       | password proof; first save drops the stash key                   | password proof on add and remove; first-save retry    |
| A failed unlock counted for a non-password error      | only `IncorrectPasswordError` counts                             | stash fault on the proof path                         |
| A duplicate check that throws or refuses wrongly      | per-index skips; Solana positions only                           | skip and Bitcoin-index cases                          |
| A reload reads the old selection                      | barrier on the write lock                                        | reload waits for the lock                             |

## Commit order

1. `test(shared): storage and stash double with faults, lying reads and fresh runtimes; key-sensitive cipher`.
2. `fix(shared): fail closed on contradictory reads and settle a thrown list write by reading back` (Rules 1 and 2 for add, remove, edit).
3. `fix(shared): a first save leaves a note bound to its vault; only that leftover is discarded`.
4. `fix(shared): saving a wallet lands completely or not at all` (rows, password proof, Rule 3, clash, adoption of copies, counter, marks, memory, own-write mark; callers).
5. `fix: setup and Add wallet screens follow the save's result` (twins, panels, add flow build-once, `App.tsx`, `PhraseBackupContext`, mocks).
6. `docs: write order for wallet changes in ARCHITECTURE.md`.

## Owner questions

1. **Deep-link recover with wallets stored** (spec Q5). Default: refused with "Invalid Password" unless the new password opens the vault; whether the route should exist goes to a separate ticket.
2. **Counter one behind** after a stop between the list and the counter. Default: accept `max(counter, list length)`.
3. **Message placement** of existing copy on the setup screens and the Add wallet sheet. Default: yes.

## Known limitations (for the owner)

- If the list exists but reads as empty at every read after a first save (an iOS read fault), while the window holds no wallet, the first save's vault is discarded.
- A removal whose vault write fails: the wallet is gone and the error shows; its entry stays unlisted in the vault.
- A vault beside an empty list with no note keeps today's lock screen; on mobile each recover attempt there counts a failed unlock; "Forgot password" is the way out.
- A Seed Vault replacement stopped before its last vault write leaves the replaced entry (no secret in it) unlisted.
- After a removal, a stop between the list and the counter can repeat a default name once.
- Three vault writers outside the write lock are a follow-up ticket.

## Project Structure

### Documentation (this feature)

```text
specs/046-atomic-wallet-save/
├── plan.md
├── spec.md
├── research.md          # R1–R14
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
├── hooks/useAccountsMutationHelpers.ts   # Rules 1–3 helpers, note, discard, clash, prune, error
├── hooks/useAccountsMutations.ts         # write orders, adoption, memory
├── hooks/useAccountsSecurity.ts          # launch turn
├── hooks/useAccountAddFlow.ts, useDerivedAccountsScan.ts
└── contexts/PhraseBackupContext.tsx

packages/ui/src/components/{AuthFlow/PasswordPage.tsx, AccountAddPanel/AccountAddPanel.tsx}
apps/mobile/{app/(auth)/password.tsx, src/components/AccountAddPanel/AccountAddPanel.tsx}
apps/extension/src/entrypoints/popup/App.tsx
```

**Structure Decision**: every decision is one implementation in `packages/shared/src/hooks`, under the vault write lock; the screens keep the built account, pass options and map errors to existing copy.

## Complexity Tracking

| Violation                                   | Why Needed                                                                          | Simpler Alternative Rejected Because                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| One new storage key                         | FR-006a: shape alone cannot tell a first-save leftover from a migration's only copy | shape-based discard; a flag in an existing record (format change) |
| Phrase derivation inside the lock           | FR-011: the clash is decided on storage, which stores no addresses                  | memory misses other windows and locked windows                    |
| Two vaults encrypted per Seed Vault replace | no row may leave a listed id without its entry                                      | one vault write before the list                                   |
