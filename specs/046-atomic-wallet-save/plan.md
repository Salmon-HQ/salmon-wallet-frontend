# Implementation Plan: Saving a wallet is all-or-nothing, and one secret is one wallet

**Branch**: `fix/046-atomic-wallet-save` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/046-atomic-wallet-save/spec.md` as revised on 2026-11-26 (nothing discarded automatically; duplicate rule narrowed per kind; marks pruned on saves; naming unchanged); questions 2 to 5 on their recommended defaults.

## Summary

Every change to the stored wallets has one deciding write, the wallet list (`STORAGE_KEYS.ACCOUNTS`), because the loader builds only listed wallets. A save writes the vault before the list and keeps every listed wallet's vault entry until the list has landed; a removal writes the list before the vault; an edit writes only the list. Memory changes only after the list write. Two rules guard against storage that lies: a mutation refuses to write when a read contradicts the rest (Rule 1), and a list write that throws is settled by reading it back (Rule 2), after which a reject reloads memory from storage. Retries are safe because each screen fixes the wallet's id and avatar once and reuses them; a save may overwrite its own id only when the stored entry under that id is exactly the secret being saved. Duplicates are refused inside the write lock against storage, by today's rule per kind plus a phrase rule. A supplied password must open the stored vault. Nothing is discarded automatically. No record changes shape, no key is added, no copy is added, naming is unchanged.

## Technical Context

**Language/Version**: TypeScript 5 strict, React 19; React Native / Expo (`apps/mobile`), DOM via WXT MV3 (`apps/extension`) over `@salmon/ui`.

**Primary Dependencies**: none new (`lodash-es` `isEqual`, `bs58`, `@solana/kit` `createKeyPairSignerFromBytes`, all already used).

**Storage**: records and keys unchanged. Single-key writes only (research R1).

**Testing**: Vitest, Jest. `packages/shared/src/test-utils/crash-storage.ts` over the real `initStorage({ adapter })`: fail at write N, apply-then-throw at write N, read faults (throw, `null`, unparseable), stash faults, snapshots, relaunch as a fresh runtime with `vi.resetModules()`; a key-sensitive cipher; one suite without `navigator.locks` (research R9).

**Target Platform**: iOS/Android (JS-only) and the extension side panel and popup.

**Project Type**: pnpm + turbo monorepo, two apps on two shared packages.

**Performance Goals**: no network inside the vault lock; Solana addresses are derived only for private-key and watch-only saves. A supplied password costs one key derivation inside the lock (the Add wallet re-auth path derives twice: `checkPassword`, then the proof). Launch is unchanged.

**Constraints**: constitution III; single-record atomicity (FR-003); twins on one contract; no new user-facing text (FR-022).

**Scale/Scope**: see §Files and functions.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status        | How                                                                                                                                                                                                                                                                       |
| ----------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Ownership boundaries             | PASS          | Decisions in `packages/shared/src/hooks`; screens fix the id and avatar, pass options and map errors; the extension host clears the phrase and orders its listener reload after the write turn.                                                                           |
| II. Consumers named                 | PASS          | §Consumers. One breaking change inside the repo: `addAccount`'s `replaces` becomes an options object (only caller `useAccountAddFlow.ts:476`).                                                                                                                            |
| III. Wallet safety (NON-NEGOTIABLE) | PASS, flagged | Fail-closed reads before every destructive write; nothing discarded automatically; an id never overwrites a different secret; a supplied password proven against the vault; `crypto/` untouched. Flagged for sign-off: the hooks files, both password screens, `App.tsx`. |
| IV. Bilingual strings               | PASS          | No new key. Reused on new surfaces: `wallet.import.errors.duplicate`, `wallet.watchOnly.errors.duplicate`, `wallet.create.invalid_password`, `errors.password_throttled`.                                                                                                 |
| V. Functional coverage first        | PASS          | Shared tests on the crash double, red first or labelled guard (§Test plan).                                                                                                                                                                                               |
| VI. Ask rather than guess           | PASS          | Two plan questions, each built on its default.                                                                                                                                                                                                                            |
| Platform constraints, tokens        | PASS          | No native or visual change.                                                                                                                                                                                                                                               |

_Twin components_: two existing pairs change, no new pair. Measured before any change: **cross-platform 2248 / ceiling 2265; same-side 870 / ceiling 870** (`cloneLines`; `pnpm check:parity:report` → "106 twin pairs, 0 findings"). Expected change ≤ 0.

## The two rules

**Rule 1 — fail closed.** Before its first write of a wallet record, a mutation rejects with a plain `Error` (no new class, no new copy; screens keep today's generic message), leaving memory untouched, when:

- **list conditions** (add, remove, edit): the list is present but not an array; or the list reads absent or `[]` while the calling hook's `accounts` holds wallets;
- **vault conditions** (add, remove): the raw vault key is present but unparseable while the list names a wallet; or the vault key is absent while the list names a wallet, `WALLETS` is present, or `COUNTER` is present.

Empty secrets (`{}`) are used when there is no vault key, or when the vault is unparseable and no wallet is listed: then the save overwrites it, as today, so a user who still has the phrase can get back in. `COUNTER` is the extra witness that a device with wallets did not read both its vault and its list as absent: every save writes it after the vault (`useAccountsMutations.ts:153`, `:158`; the legacy migration too, `utils/legacy-migration.ts:357`, `:360`), and nothing else writes it. `ACCOUNT_ID` is not used as a witness: today's `clearAccountsStorage` removes it after the vault (`useAccountsMutationHelpers.ts:138-139`), so a device whose "Remove all" stopped in between holds it with no vault, and would be refused setup forever; `COUNTER` is removed first there (`:136`). No legitimate state holds `COUNTER` without a vault: a watch-only or Seed-Vault-only wallet is saved through `addAccount`, which writes a vault entry for every wallet kind; an unmigrated legacy record has `WALLETS` and no `COUNTER` (it is written by the migration, after the vault). This replaces `readStoredSecrets` returning `{}` when `getStoredMnemonics()` is `null` (`useAccountsMutationHelpers.ts:60-61`; a non-object vault reads as `null`, `useAccountsSecurityHelpers.ts:64-73`) and `readStoredAccounts`' `?? []` (`useAccountsMutationHelpers.ts:105-107`), which let a lying read rewrite the vault or list without the other wallets. Its witness is memory, so it has none at the first change after a launch whose list read lied (Known limitations).

**Rule 2 — read-back.** When the list write of add, remove or edit throws, read `ACCOUNTS` again and compare `JSON.stringify` of what was written with `JSON.stringify` of what was read (storage round-trips through JSON and drops `undefined` fields). Equal → continue as a success (memory, later rows, resolve). Different, absent, or the read throws → the own-write mark is cleared, the lock is released, memory is reloaded from storage (§Reload on a Rule 2 reject), and the call rejects with the write's error. Writes before the list that throw reject without a read-back; what they may leave (a mark, an unlisted vault entry) is harmless.

## Architecture decisions

| Piece                                 | Lives in                                                                                                                                             | Reuses                                                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| List read + list conditions           | `readStoredList(memoryHoldsWallets)` in `useAccountsMutationHelpers.ts`, replacing `readStoredAccounts`                                              | `getStorageItem` raw semantics (`storage/storage.ts:339-348`)                                                                |
| Vault read + vault conditions + proof | `readStoredWallets(memoryHoldsWallets, password?)`, replacing `readStoredSecrets`; calls `readStoredList`                                            | `isEncryptedMnemonics`, `resolveMnemonicsWithPassword`, the throttle                                                         |
| List write + Rule 2 + own-write mark  | `writeStoredAccounts(list, { own })`                                                                                                                 | today's function (`useAccountsMutationHelpers.ts:86-89`)                                                                     |
| Memory refresh after a Rule 2 reject  | `refreshFromStorage()` passed into `useAccountsMutations` from `useAccounts.ts:438`; `loadAccounts(…, { persist: false })` in `useAccountsLoader.ts` | `resolveMnemonicsWithCachedKey`, `loadAccounts`                                                                              |
| Duplicate and Seed Vault decision     | `findStoredClash(account, list, secrets)`, pure, in `utils/stored-clash.ts` (new)                                                                    | `normalizeMnemonic`, `generateKeyPair`, `getSolanaDerivationPath`, `createKeyPairSignerFromBytes`, `isEqual`                 |
| Mark prune                            | `pruneMarks(list)` in the helpers                                                                                                                    | `STORAGE_KEYS.UNCONFIRMED_PHRASES`                                                                                           |
| `DuplicateAccountError`               | the helpers, exported from `hooks/index.ts`                                                                                                          | —                                                                                                                            |
| Fixed id and avatar                   | both setup twins, `useAccountAddFlow.ts`                                                                                                             | the factories' existing `id` and `avatar` options (`factories/account-factory.ts:65-67`, `:150-152`, `:198-200`, `:229-235`) |

## The write orders

A and B listed, A active. "Kill after N": the process dies right after write N landed. "Fail at N": write N throws without landing; "applied at N": it lands and throws. React state changes only on the **memory** row. No row leaves a listed id without its vault entry.

### Add wallet C (`addAccount`)

Pre-steps, inside `withVaultWriteLock`. They write no wallet record (list, vault, counter, selection, marks). P2 can write the stash key and the unlock penalty record.

| Step | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1   | Read `ACCOUNTS`, raw `MNEMONICS`, `WALLETS`. A read that throws rejects. Rule 1 (list and vault conditions).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| P2   | Secrets. No vault key → `{}`, and the stash `DERIVED_KEY` is removed before encrypting (a stash failure rejects), because `encryptMnemonics` prefers a valid cached key over the password (`crypto/encrypt-mnemonics.ts:76-79`) and an earlier attempt cached one before its vault write (`:80-83`). Vault + password → the password must open it (`resolveMnemonicsWithPassword`, which stores its key as the stash key, `useAccountsSecurityHelpers.ts:82-90`); penalty and counting exactly as today (`useAccountsMutationHelpers.ts:67-77`: a standing penalty rejects, any error on that path records a failed unlock, success clears the penalty). Vault, no password → cached key, else `EncryptionMaterialMissingError`. |
| P3   | Own id. `secrets[C.id]` present and not `isEqual` to C's stored secret → reject (plain `Error`, nothing written): an id never overwrites a different secret. Present and equal → an overwrite of its own entries, as today (`useAccountsMutations.ts:130-135`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| P4   | `findStoredClash`, excluding C's own id: a clash → `DuplicateAccountError`; Seed Vault → the listed Seed Vault wallets with C's address (`Ss`) are replaced (§Duplicate rules).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| P5   | V1 = secrets + `{ [C.id]: C's secret }`; nothing is removed (the `Ss` entries kept). A save never removes a vault entry before the list: with a list read that lied, "unlisted" can mean listed, and one listed wallet without its entry fails every unlock (`hooks/useAccounts.ts:290-308`); a leftover copy is harmless ciphertext. V2 = V1 − `Ss` (replace only). List = stored list − C.id − `Ss` + C. Encrypt V1 (and V2).                                                                                                                                                                                                                                                                                                  |

| #   | Key                                         | Value                                                                                                                                             | Kill right after leaves                            | Next launch shows                                                                                                                  |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `UNCONFIRMED_PHRASES` (only `unconfirmed`)  | stored marks + C.id                                                                                                                               | a mark naming unlisted C                           | before-state; the mark is pruned by the next save                                                                                  |
| 2   | `MNEMONICS`                                 | V1                                                                                                                                                | C's entry unlisted                                 | before-state. First save: a vault and no list (§First save)                                                                        |
| 3   | `ACCOUNTS` — **deciding** (Rule 2 on throw) | the new list                                                                                                                                      | C listed with its entry; counter and selection old | wallets after the change; A active on a held slot (FR-001). First save: C via the loader fallback (`useAccountsLoader.ts:122-125`) |
| —   | **memory**                                  | held − `Ss` ids − C.id + C; C active; counter = the value row 4 stores (unchanged on a same-id overwrite); `requiredLock` if a password was given | —                                                  | —                                                                                                                                  |
| 4   | `COUNTER`                                   | `max(stored COUNTER ?? 0, stored list length) + 1`; skipped when C.id was already listed                                                          | selection old                                      | counter right                                                                                                                      |
| 5–7 | `ACCOUNT_ID`, `NETWORK_ID`, `PATH_INDEX`    | C and its slot                                                                                                                                    | partial selection                                  | C active, slot healed (`useAccountsSelection.ts:87-98`)                                                                            |
| 8   | `UNCONFIRMED_PHRASES` prune (best effort)   | marks named by a listed `id` or `derivedFrom`; written only when one is removed                                                                   | —                                                  | after-state                                                                                                                        |

Fail or apply at 1–2: rejects, memory untouched except the lock flag (§After a rejected save), no mark taken back (FR-019). Row 3 throws: Rule 2. Fail at 4–8: logged, the call resolves. The name is the one the caller passed, as today.

### Seed Vault replace (C replaces the listed `Ss`, same address)

| #   | Key                                           | Value                                                                                                       | Kill right after leaves                        | Next launch shows                             |
| --- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------- |
| 1   | marks (only `unconfirmed`)                    | as above                                                                                                    | as above                                       | before-state                                  |
| 2   | `MNEMONICS`                                   | V1 (`Ss` and C)                                                                                             | `Ss` listed with their entries; C's unlisted   | before-state                                  |
| 3   | `ACCOUNTS` — **deciding** (Rule 2 on throw)   | list − `Ss` + C                                                                                             | C listed with its entry; `Ss` entries unlisted | C instead of `Ss`, every listed id unlockable |
| —   | **memory**                                    | held − `Ss` ids − C.id + C                                                                                  | —                                              | —                                             |
| 4–7 | counter, selection                            | as above                                                                                                    | as above                                       | as above                                      |
| 8   | `MNEMONICS`                                   | V2 (without `Ss`); then the Seed Vault release rule per token (released only when no stored wallet uses it) | `Ss` entries gone                              | after-state                                   |
| 9   | prune (best effort, only when one is removed) | as above                                                                                                    | —                                              | after-state                                   |

Fail at 8: logged, resolves; the `Ss` entries (address and access token, no key) stay unlisted.

### Remove wallet B (`removeAccount`)

Pre-steps: P1 with Rule 1 (memory holds B, so a list read as absent or `[]` rejects); P2 with the password proof when a password is supplied. New list = stored − B; new vault = secrets − B; both empty → `clearAll` instead.

| #   | Key                                          | Value                                          | Kill right after leaves                  | Next launch shows                                             |
| --- | -------------------------------------------- | ---------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| 1   | `ACCOUNTS` — **deciding** (Rule 2 on throw)  | stored list − B                                | B's entry unlisted; selection may name B | A only; dangling active id → first listed wallet, slot healed |
| —   | **memory**                                   | held − B; active moves if B was active         | —                                        | —                                                             |
| 2–4 | selection (if B was active; failures logged) | first wallet of the new list that memory holds | partial selection                        | a listed active wallet on a held pair                         |
| 5   | `MNEMONICS`                                  | secrets − B                                    | —                                        | after-state                                                   |

Today the selection is written before the list (`useAccountsMutations.ts:251-265`, list `:272`); it moves after. Row 5 throws: the call rejects as today, so the existing removal error shows (`useAccountRemoval.ts:52-53`), with memory already following the list and B's entry unlisted. The Seed Vault release runs after row 5. When the new list is empty but the vault still holds unlisted entries, `clearAll` does not run (`useAccountsMutations.ts:239`), and the device is left with a vault and no list (Known limitations).

`clearAll`: memory, then the stash `DERIVED_KEY` (moved before storage, so key material leaves first as FR-009 asks), then `clearAccountsStorage()`, then Seed Vault releases. `clearAccountsStorage` now removes `COUNTER`, `ACCOUNT_ID`, `NETWORK_ID` and `PATH_INDEX` before `ACCOUNTS` and `MNEMONICS` (today `COUNTER`, `ACCOUNTS`, `MNEMONICS`, then the selection, `useAccountsMutationHelpers.ts:134-147`), so a stopped reset never leaves the `COUNTER` witness without a vault. Its only caller is `clearAll` (`useAccountsMutations.ts:100`), reached from `removeAllAccounts` and from `removeAccount` when list and vault both end empty. The reorder is safe: a stop after the small keys leaves the list and the vault, which still load (counter read as 0 and raised by the next save's `max` rule; a missing active id falls back to the first wallet, `useAccountsLoader.ts:122-125`); a stop after the list leaves today's vault-and-no-list state.

### Edit wallet (`editAccount`)

Pre-step: `readStoredList` with Rule 1's list conditions only (an absent or `[]` list while memory holds wallets rejects; today the edit silently does nothing, `useAccountsMutations.ts:212-214`); a list lacking only that id returns as today.

| #   | Key                                         | Value                            | Kill right after leaves | Next launch shows |
| --- | ------------------------------------------- | -------------------------------- | ----------------------- | ----------------- |
| 1   | `ACCOUNTS` — **deciding** (Rule 2 on throw) | stored list, this entry replaced | after-state             | the edit          |
| —   | **memory**                                  | the edited account               | —                       | —                 |

### Launch

Unchanged: no lock turn and no prune at init.

## Reload on a Rule 2 reject

After the lock is released, the mutation calls `refreshFromStorage()`, a memory-only variant of the cached-key unlock: when the stash key is valid it opens the stored vault with it (`resolveMnemonicsWithCachedKey`) and calls `loadAccounts(mnemonics, { persist: false })`. It never calls `setError` or `setLocked` (`unlockWithCachedKey` sets the global error on failure, `useAccountsSecurity.ts:276-280`, which trips mobile's init-failed gate), and `persist: false` skips the loader's two selection writes (`useAccountsLoader.ts:133-139`), so it writes nothing. Any failure is logged and the original error is still thrown. Memory therefore matches whatever storage holds, whether or not the write landed, without relying on the extension's list listener or the own-write mark.

- **Extension**: the stash key is valid right after a save or a proven removal, so the reload runs. If the worker was suspended and the cached key is gone, the reload does nothing; the list listener (`useLockAcrossWindows.ts:111-126`) then locks the window when the ids changed, and the next unlock loads storage. An edit with the same ids stays stale until the next unlock.
- **Mobile**: the same reload runs; mobile has no list listener. If the reload's own reads fail (the read faults that broke the read-back), memory stays as it was until the next unlock or launch.

## After a rejected save

When `addAccount` rejects and a vault key is now stored, it sets `requiredLock` from storage (`setRequiredLock(true)`), one line in the reject path, so the setup form asks for the existing password in the same session (`PasswordPage.tsx:117`; mobile `showSingleInput`, `password.tsx:179`), as it does after a relaunch. Mobile recover still asks for a new password (`password.tsx:179` excludes recover); the proof then refuses any password but the stored one (Known limitations).

## First save that stops after its vault (FR-006)

Nothing is discarded. The vault stays; the list is absent. Extension: the lock screen (`App.tsx:488-496`); the password just chosen unlocks it, and with no wallet listed the window shows the setup screens (`App.tsx:508`; reasoned from code). Mobile: welcome (`apps/mobile/app/_layout.tsx:221-226`), which has no reset; create asks for the existing password (`password.tsx:179`); recover asks for a new password (`:169`, `:179`) and only the password chosen in the failed attempt passes the proof; each wrong one counts a failed unlock, as an unlock attempt does today. A retry on the same screen reuses the id and overwrites its own entry, so the vault holds the secret once. A repeated setup from a new screen (new id) adds a second entry; the first attempt's entry stays as unlisted ciphertext, which nothing reads (FR-016: no removal as a side effect). A repeated create on a new screen generates a new phrase, with the same result.

## Retry safety (FR-014, FR-015)

- **Fixed id and avatar.** Both setup twins pick the id and avatar on the first submit and keep them in a ref for the screen's life. `useAccountAddFlow` keeps them while a key built from values stays the same, and renews both when it changes: the trimmed phrase, the private key string, the watched address string, the Seed Vault address + derivation path + auth token, the derived position, and the active wallet's id only for a derived account (`:439-447`). The comparison is by value because the import hooks return fresh objects on every render (`useImportPrivateKey.ts:110-121`). The name is not part of the key: renaming keeps the id. Every attempt rebuilds the account with them, so no key material is parked between attempts (the comment at `useAccountAddFlow.ts:401-405` stays true).
- **Conditional overwrite.** A save whose id is already in storage proceeds only when the stored entry under that id is exactly the secret being saved (P3); then it overwrites its own list and vault entries, as today. The duplicate check excludes the own id.
- **Memory without doubles.** Memory after a save is held − replaced Seed Vault ids − C.id + C, so a same-id retry after a reload (which already put C in memory) shows C once.
- **Read-back.** A list write that landed and threw resolves through Rule 2.
- **Declared limitation.** If the read-back itself fails and the user starts again from a new screen (new id), the save is refused as a duplicate. The wallet shows once memory reloads: the reload after the reject, else the next unlock or launch.

## Window memory and the extension listener

`writeStoredAccounts(list, { own })` records the own-write mark only when memory's ids equal the stored ids after the save, so a window that missed another window's wallet D lets the listener reload and show D. The listener fires while the writer still holds the lock, before its selection rows, and the loader would read the old selection (`useAccountsLoader.ts:103-129`); the extension's `reloadWallets` (`App.tsx:245-248`) therefore first awaits `withVaultWriteLock(async () => undefined)`, which orders it after the turn in flight.

## Password proven against the stored vault (FR-005)

Today a valid cached key wins over a supplied password (`useAccountsMutationHelpers.ts:63-64`), so a save under another password succeeds with the vault still under the first, and mobile then unlocks and enrols with the wrong one (`password.tsx:329`, `:352`). After: when a vault exists and a password is supplied, P2 opens the vault with that password before any wallet record is written; what counts as a failed unlock is unchanged. The same proof applies to `removeAccount(id, password)`.

Only the two setup twins map `IncorrectPasswordError` and `UnlockThrottledError` to `passwordCheckErrorKey(err, 'wallet.create.invalid_password')` (`utils/unlock-throttle.ts:45`); they always supply a password, and with a password and a vault P2 never touches the cached key, so the `IncorrectPasswordError` a cached key can raise (`crypto/encryption.ts:567`) never reaches that mapping.

**Stale extension onboarding window.** Another window finished setup with P1; this window's password page asks for a new password and the user enters P2. The proof fails: the page shows "Invalid Password", one failed unlock is counted as for any unlock attempt, and nothing is written. Entering P1 passes, and the save proceeds against storage.

## Duplicate rules (FR-010 to FR-013)

`findStoredClash(account, list, secrets)` after P3; storage only; the own id excluded; no network (never `restoreAccount`, which fetches the catalog and returns `null` for a disabled network, `utils/account.ts:184-195`). Each kind keeps what works today and adds the storage view.

| New secret  | `DuplicateAccountError` when                                                                             | Replace                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Phrase      | a listed **phrase** wallet whose phrase equals it after `normalizeMnemonic` holds the new start (below)  | —                                                             |
| Private key | its Solana address is an address of any listed wallet (today's rule, `useImportPrivateKey.ts:62`, `:87`) | —                                                             |
| Watched     | its address is an address of any listed wallet (today's rule, `useImportWatchOnly.ts:52`, `:70`)         | —                                                             |
| Seed Vault  | never                                                                                                    | every listed Seed Vault wallet with the same address (FR-013) |

**Held positions of a stored phrase wallet**: the non-null values across every array of its `pathIndexes` (`types/account.ts:21`, `StoredAccount.pathIndexes` `:45`). Storage writes slot i as i or `null` (`hooks/useAccounts.ts:153-156`). A wallet is created with `[null × start, start]` on each network (`factories/account-factory.ts:108-110`), so its starting position is the smallest held position; mirror networks copy the mainnet's positions (`utils/derived-accounts.ts:241-254`) and derived-account edits add positions (`useAccountsMutations.ts:197-207`). The rule tests the new start against the whole held set. A phrase save derives no address.

**Addresses of a listed wallet** (private-key and watch-only saves only), mirroring `collectSolanaAddresses` (`utils/account.ts:277`) on storage: a phrase wallet's `generateKeyPair(phrase, getSolanaDerivationPath(i))` (`blockchain/solana/factory.ts:63-88`) for each non-null index of its `solana-*` `pathIndexes`; a private key's `createKeyPairSignerFromBytes(bs58.decode(key))` (`factory.ts:204-219`); a watched or Seed Vault wallet's address. Skips are per index and per entry: an index whose derivation fails, a missing entry, an invalid phrase, an undecodable key. `clearSeedCache()` follows.

**Under this rule, the three cross-kind cases the review raised:**

- Watched X, then recover the phrase that derives X → saved (a phrase is refused only by a phrase wallet).
- Private-key wallet K, then recover the phrase whose Solana address at its start is K's → saved, for the same reason.
- A Seed Vault account whose address a phrase, private-key or watched wallet holds → saved; Seed Vault only replaces Seed Vault.

**A derived wallet is not refused.** It is built from the parent's phrase at the picked position (`useAccountAddFlow.ts:439-447`), stored as `[null × i, i]`; the parent's held set does not contain i. Picking a position the parent already holds is refused.

**Messages**: the Add wallet sheet maps `DuplicateAccountError` to the key the import already uses (`wallet.import.errors.duplicate`; `wallet.watchOnly.errors.duplicate` for a watched address, `useImportWatchOnly.ts:70`); the setup twins to `wallet.import.errors.duplicate`.

## Setup screens and Add wallet (FR-015, FR-020, FR-021)

- **Mobile**: `walletAddedRef` (`password.tsx:140-149`) goes. On the line after `addAccount` resolves, the screen clears the owed-phrase ref, then `setMnemonic(null)`; the unmount cleanup puts back only what the owed ref still holds.
- **Extension**: `handlePasswordSuccess` (`App.tsx:375-377`) also clears `authData` (`:201`), so the phrase leaves App state when the page hands over; the success page does not read it.
- **Names**: callers pass the name as today (setup screens from the window's counter, `PasswordPage.tsx:179`, `password.tsx:284`; both Add wallet panels as today).
- **Mobile, after the save resolved** (FR-015): the steps that follow (`setPendingSeedVaultSelection`, `unlockAccounts`, the analytics event, the enrolment hand-off; `password.tsx:323-355`) move out of the `try` whose `catch` shows the recovery error. Each failure is logged; the screen always parks a route: `'/(auth)/biometric-setup'` when unlocking succeeded, else `'/(app)/(tabs)'`, where the app shows the lock screen. So no recovery error shows after a saved wallet, and the submit button, which the cleared phrase disables (`useSetupPasswordForm.ts:46`), is never left as the only way forward.
- **Extension, after the save resolved**: only `void trackOnboardingEvent(…)` follows `addAccount` (`PasswordPage.tsx:192-201`), so the shape is absent there; a guard test pins it.
- **Derived-account scan** (`useDerivedAccountsScan.ts:331-354`): it adds whole wallets through `addAccount`; a `DuplicateAccountError` keeps today's handling: logged, the queue moves on, no message.
- **Errors**: `IncorrectPasswordError`, `UnlockThrottledError` → `passwordCheckErrorKey` on the setup twins; others as today. Follow-ups after `addAccount` (analytics, resets, `onPersisted`) move out of the `try` that reports failure (`useAccountAddFlow.ts:466-486`, `:511-524`).

## Copy

No new string.

## Consumers of what changes in `packages/shared`

| Export (change)                                           | Consumers                                                                                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `addAccount(account, password?, options?)`                | `useAccountAddFlow.ts:476`, `useDerivedAccountsScan.ts:343`, `PasswordPage.tsx:192`, `password.tsx:322`; type `useAccounts.ts:119` |
| Rule 1 rejections on add, remove, edit                    | the same, `useAccountRemoval.ts:52`, `panelRegistry.tsx` (both apps), `useEnsureMirrorNetworks.ts:46` (already catches)            |
| New: `DuplicateAccountError`; barrel `withVaultWriteLock` | both password screens, both `AccountAddPanel.tsx`; extension `App.tsx`                                                             |
| `useAccountsMutations` params (+ `refreshFromStorage`)    | `useAccounts.ts:438`                                                                                                               |
| `PhraseBackupValue` (− `markUnconfirmed`)                 | `PasswordPage.tsx:79`, `password.tsx:119`; 13 mobile mocks where typecheck requires                                                |
| `isOwnStoredAccountsWrite`                                | `useLockAcrossWindows.ts:118`                                                                                                      |

## Files and functions

| File                                                                                 | Function / change                                                                                                                                                                        | Rough size   |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `packages/shared/src/test-utils/crash-storage.ts` (new)                              | storage and stash double, faults, read faults, relaunch                                                                                                                                  | ~150         |
| `packages/shared/src/hooks/useAccountsMutationHelpers.ts`                            | `readStoredList`, `readStoredWallets` (Rule 1, proof) replace `readStoredAccounts` and `readStoredSecrets`; `writeStoredAccounts` (Rule 2, `own`); `pruneMarks`; `DuplicateAccountError` | ~80 changed  |
| `packages/shared/src/utils/stored-clash.ts` (new)                                    | `findStoredClash`, pure                                                                                                                                                                  | ~70          |
| `packages/shared/src/hooks/useAccountsMutations.ts`                                  | `addAccount` (P1–P5, rows, replace, conditional overwrite, memory), `removeAccount` row order, `editAccount` Rule 1, `clearAll` stash first, reload on reject                            | ~120 changed |
| `packages/shared/src/hooks/useAccounts.ts`, `hooks/index.ts`, `useAccountsLoader.ts` | `refreshFromStorage` (memory only) passed in; `loadAccounts` `persist` flag; options type; exports                                                                                       | ~15          |
| `packages/shared/src/hooks/useAccountAddFlow.ts`                                     | id and avatar per `buildAccount` inputs; options; memory Seed Vault lookup removed; follow-ups out of the failure path; message key per kind                                             | ~40          |
| `packages/shared/src/hooks/useDerivedAccountsScan.ts`                                | options object                                                                                                                                                                           | ~3           |
| `packages/shared/src/contexts/PhraseBackupContext.tsx`                               | `markUnconfirmed` removed; re-read on listed-id change                                                                                                                                   | ~20          |
| `packages/ui/.../AuthFlow/PasswordPage.tsx` (+ test)                                 | id and avatar ref, options, error mapping                                                                                                                                                | ~25          |
| `apps/mobile/app/(auth)/password.tsx` (+ test)                                       | id and avatar ref, `walletAddedRef` removed, phrase cleared on resolve, follow-ups out of the error path, error mapping                                                                  | ~30          |
| `apps/extension/src/entrypoints/popup/App.tsx` (+ test)                              | `authData` cleared on success; listener reload barrier                                                                                                                                   | ~5           |
| 13 mobile mocks                                                                      | `markUnconfirmed` removed                                                                                                                                                                | ~13          |
| `docs/ARCHITECTURE.md:42`                                                            | one sentence on the write order                                                                                                                                                          | ~2           |

## Test plan (test-first)

**Doubles** (research R9): `crash-storage.ts` with `failAt(n)`, `failAt(n, { applied: true })`, `failStashAt(n)`, `failRead(key)` (throws), `dropRead(key)` (`null`), `garbleRead(key)` (unparseable string), snapshots after each write, and `relaunch({ keepStash? })` with `vi.resetModules()` so each relaunch or second window is a fresh runtime (own-write mark, write queue). A key-sensitive see-through cipher with a fresh nonce per lock; today's mock opens any vault with any cached key (`hooks/useAccountsMutations.test.tsx:66`). One `describe` with `navigator.locks` removed.

**Assertions** (FR-001): stopped before the deciding write → wallets, secrets, active wallet, slot, counter, password exactly as before, memory unchanged. After it → wallets and entries exactly as after; active = previous (or C if its selection landed) on a held slot; counter right or one behind.

R = red first; G = guard (passes today, kept).

| Case                                                                                                             | Asserts                                                                                                                                                                                                         |       |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| First save: fail 1–8, kill 0–8, stash fault at P2, with and without `keepStash`                                  | nothing deleted; kill < 3 → the chosen password opens the vault; retry with the same id → one wallet, one entry; retry with another password after a failed (not applied) vault write → vault under the new one | R     |
| Add C with A, B listed: fail 1–8, kill 0–8                                                                       | FR-001 assertions                                                                                                                                                                                               | R     |
| Seed Vault replace, two listed Seed Vault wallets with C's address, only in storage: fail 1–9, kill 0–9          | one wallet; every listed id has its entry at every position; release rule per token                                                                                                                             | R     |
| Remove B (non-active, active): fail 1–5, kill 0–5                                                                | memory follows the list; row 5 throws → rejects with B gone; no entry lost                                                                                                                                      | R / G |
| Remove all: stash, storage 1–12, kill 0–12                                                                       | memory and stash key cleared before storage                                                                                                                                                                     | R / G |
| Edit: fail 1, kill 0–1                                                                                           | memory and relaunch agree                                                                                                                                                                                       | R     |
| Applied then thrown at the list write: setup create, setup recover, Add wallet (same id), remove, edit           | read-back equal → resolves with the later rows; read-back fails → rejects, memory reloaded from storage (shows the landed change); retry with the same id → one wallet                                          | R     |
| Rule 2 reject with the read-back failing and the write not landed                                                | memory reloaded, equal to the before-state; reload failure logged, original error thrown                                                                                                                        | R     |
| Same id, different secret stored under it                                                                        | rejects, nothing written, the stored entry intact                                                                                                                                                               | R     |
| Same-id retry after a reload put C in memory                                                                     | memory shows C once                                                                                                                                                                                             | R     |
| Read-back fails, then a new screen (new id) adds the same phrase                                                 | `DuplicateAccountError`; one wallet                                                                                                                                                                             | R     |
| Dropped or garbled vault read on an add and on a removal (list names A)                                          | rejects, nothing written, entries intact                                                                                                                                                                        | R     |
| Garbled vault beside an empty list, then a save; garbled vault while the list names A                            | overwritten as today (G); rejects, nothing written (R)                                                                                                                                                          | R     |
| Dropped list read while memory holds wallets (add, remove, edit); edit with a garbled vault                      | rejects, nothing written; the edit ignores the vault                                                                                                                                                            | R     |
| Password proof on `addAccount` and `removeAccount` (vault under P1, cached key valid, P2 supplied)               | `IncorrectPasswordError`, no wallet record written, one failed unlock                                                                                                                                           | R     |
| A save rejects after its vault landed (fail at the list, read-back absent)                                       | `requiredLock` true in the same session; the setup form shows the single input (R)                                                                                                                              |
| Rule 2 reject: the memory refresh                                                                                | no `setError`, no storage write, memory equals storage (R)                                                                                                                                                      |
| Stale onboarding window after another window's setup                                                             | P2 refused, counted once; P1 passes                                                                                                                                                                             | R     |
| Vault and list both read absent while `COUNTER` is present; a reset stopped after each of its writes, then setup | rejects, nothing written (R); setup succeeds after every stop (R)                                                                                                                                               |
| Vault + absent list; `WALLETS`; cleartext vault, then launch                                                     | nothing removed, nothing written at launch                                                                                                                                                                      | G     |
| List not an array                                                                                                | save rejects                                                                                                                                                                                                    | R     |
| Non-reentrant fake lock, first save                                                                              | no deadlock                                                                                                                                                                                                     | G     |
| Two runtimes: the stale one adds W, which the other added                                                        | `DuplicateAccountError`; nothing stored twice                                                                                                                                                                   | R     |
| Stale runtime adds C after another added D                                                                       | no own-write mark; listener reload after the barrier shows D, with C active                                                                                                                                     | R     |
| Counter: kill between 3 and 4, then a save                                                                       | counter = `max(counter, list length) + 1`; same-id overwrite writes no counter                                                                                                                                  | R     |

**Duplicate rules** (`stored-clash.test.ts`): phrase at its listed start, other spacing → refused (R); other start (derived) → saved (G); held non-starting position refused (R); phrase whose Solana address is a watched, private-key or Seed Vault wallet's → saved (G, the three cross-kind cases); private key or watched address held by any listed wallet, decided from storage with memory empty → refused (R); key for a listed phrase's Solana address with the catalog disabled → refused, no network (R); phrase holding only Bitcoin index 4 does not refuse the key at Solana index 4 (R); a null index and a missing entry skipped, the wallet's other indexes still compared (R); own id excluded (R); Seed Vault replaces every listed Seed Vault wallet with that address and nothing else (R). **Vault entries**: a save removes no entry: an unlisted exact copy, a same-phrase copy and another phrase all stay (R for the exact copy, G for the rest); with a list read that lied, a listed wallet's entry stays (R).

**Marks** (each "kept" case in the same run as a "stale pruned" case): saved `unconfirmed` wallet marked when killed after row 3, while a stale mark is pruned by the next save (R); `derivedFrom` mark kept while an unrelated stale mark is pruned (R); a concurrent window's mark for a listed wallet kept while a stale one is pruned (R); prune writes nothing when nothing is stale (R); prune failure never rejects (R); provider shows `needsBackup` after `addAccount` (R).

**Screens**: mobile `password.test.tsx` (phrase put back on reject G; cleared on resolve R; after a resolved save a throwing unlock, enrolment or analytics shows no error and parks a route R; same id and avatar on retry R; messages R); `PasswordPage.test.tsx` (same id and avatar; messages R; nothing after the save can show the error G); `useDerivedAccountsScan.test.tsx` (a duplicate is logged and the queue moves on, G); `useAccountAddFlow.test.tsx` (same id and avatar within a confirm cycle, through re-auth and across renders with fresh import objects; kept on a rename; renewed when the phrase, key, address, Seed Vault account, derived position or, for a derived account, the active wallet's id changes; account rebuilt each attempt; duplicate reaches `onFailure` with the per-kind key; follow-ups never reach `onFailure`, R); `App.test.tsx` (`authData` cleared on success; listener reload waits for the lock, R).

**Existing tests that change**: `useAccounts.test.ts` "replaces a wallet in one write…" (`replaces` gone), "aborts addAccount when encryptMnemonics throws…" (memory after row 3), "never leaves a listed wallet without its secret when removeAccount stops…" (still rejects at the vault; memory follows the list); `useAccountsMutations.test.tsx` cipher, `openWindow`, and "writes nothing when the wallet it edits is no longer stored" (rejects under Rule 1 when the list reads empty; unchanged when the list lacks only that id); `useAccountAddFlow.test.tsx` lines 247, 362, 377; `PhraseBackupContext.test.tsx` `markUnconfirmed` case.

## Risks specific to this change

| Risk                                                  | Guard                                                                                       | Test                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| A lying read drops other wallets                      | Rule 1                                                                                      | dropped and garbled reads on add, remove, edit |
| A stored change reported as failed, then stored twice | Rule 2 and reload; fixed id; refusal from storage                                           | applied-then-thrown on every mutation          |
| An id overwrites a different secret                   | P3                                                                                          | same id, different secret                      |
| A listed wallet without its entry                     | vault before list; `Ss` after the list; list before vault on remove                         | entry invariant at every position              |
| A save under the wrong password                       | password proof; stash key dropped when there is no vault                                    | proof on add and remove; first-save retry      |
| Something that works today newly refused              | phrase refused only by a phrase wallet; imports keep today's rule; Seed Vault only replaces | cross-kind cases                               |
| A reload reads the old selection                      | barrier on the write lock                                                                   | listener reload waits for the lock             |

## Commit order

1. `test(shared): storage and stash double with faults, read faults and fresh runtimes; key-sensitive cipher`.
2. `fix(shared): refuse to write on contradictory reads and settle a thrown list write by reading back` (Rules 1 and 2, reload, for add, remove, edit).
3. `fix(shared): saving a wallet lands completely or not at all` (rows, password proof, own-id rule, duplicate rules, Seed Vault replace, counter, marks, memory, own-write mark).
4. `fix: setup and Add wallet screens reuse the wallet id and follow the save's result` (twins, add flow, `App.tsx`, `PhraseBackupContext`, mocks).
5. `docs: write order for wallet changes in ARCHITECTURE.md`.

## Owner questions

1. **Deep-link recover with wallets stored** (spec Q5). Default: refused with "Invalid Password" unless the new password opens the vault; whether the route should exist goes to a separate ticket.
2. **Message placement** of existing copy on the setup screens and the Add wallet sheet. Default: yes.

## Known limitations (for the owner)

- If the read-back fails after a list write that landed and the user restarts from a new screen, the save is refused as a duplicate; the wallet shows once memory reloads (the reload after the reject, else the next unlock or launch).
- On mobile, a vault with no list has no in-app reset on the welcome screen, so a user who forgot the password chosen in a failed first save has no way out there (pre-existing; follow-up ticket). Mobile recover there asks for a new password, but only the earlier one opens the vault, and each wrong one counts a failed unlock.
- The same vault-and-no-list state follows from removing the last listed wallet while the vault kept unlisted entries.
- Rule 1 has no witness at the first change after a launch whose list read lied (memory empty): that change writes a list without the other wallets, whose entries stay in the vault, unlisted.
- The extension's cached key is lost when the MV3 worker is suspended; the reload after a Rule 2 reject then does nothing, and the window catches up at the next unlock.
- A removal whose vault write fails, or a Seed Vault replace stopped before its last vault write, leaves unlisted entries.
- A vault that is present but unparseable beside listed wallets refuses every add and removal; there is no in-app way out but a reset (follow-up ticket).
- A null read of the backup-pending record is taken as empty and written back, wiping other wallets' marks (pre-existing, `PhraseBackupContext.tsx:97-102`); the save's own mark write inherits it.
- After a rejected save, mobile recover still shows the new-password form in the same session (it never shows the single input); only the stored password passes the proof.
- Three vault writers outside the write lock (password change, vault upgrade, legacy migration) are a follow-up ticket.

## Project Structure

### Documentation (this feature)

```text
specs/046-atomic-wallet-save/
├── plan.md
├── spec.md
├── research.md          # R1–R10
├── data-model.md
├── quickstart.md
├── contracts/accounts-mutations.md
├── checklists/requirements.md
└── tasks.md             # Phase 2
```

### Source Code (repository root)

```text
packages/shared/src/
├── test-utils/crash-storage.ts           # NEW
├── utils/stored-clash.ts                 # NEW
├── hooks/useAccountsMutationHelpers.ts   # reads, Rules 1–2, prune, error
├── hooks/useAccountsMutations.ts         # write orders, memory, reload on reject
├── hooks/useAccounts.ts                  # refreshFromStorage passed in
├── hooks/useAccountAddFlow.ts, useDerivedAccountsScan.ts
└── contexts/PhraseBackupContext.tsx

packages/ui/src/components/AuthFlow/PasswordPage.tsx
apps/mobile/app/(auth)/password.tsx
apps/extension/src/entrypoints/popup/App.tsx
```

**Structure Decision**: every decision is one implementation in `packages/shared`, under the vault write lock; the screens fix the id and avatar, pass options and map errors to existing copy.

## Complexity Tracking

| Violation                                   | Why Needed                                                                                   | Simpler Alternative Rejected Because           |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Address derivation inside the lock          | FR-011: private-key and watch-only clashes are decided on storage, which stores no addresses | memory misses other windows and locked windows |
| Two vaults encrypted per Seed Vault replace | no row may leave a listed id without its entry                                               | one vault write before the list                |
