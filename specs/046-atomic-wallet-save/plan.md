# Implementation Plan: Saving a wallet is all-or-nothing, and one secret is one wallet

**Branch**: `fix/046-atomic-wallet-save` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/046-atomic-wallet-save/spec.md` as revised on 2026-11-26 (FR-006 rewritten, FR-006a and FR-010a removed, US3 scenario 4 a refusal, SC-005, FR-016, owner question 1); questions 2 to 5 on their recommended defaults.

## Summary

Every change to the stored wallets has one deciding write, the wallet list (`STORAGE_KEYS.ACCOUNTS`), because the loader builds only listed wallets. A save writes the vault before the list and keeps every listed wallet's vault entry until the list has landed; a removal writes the list before the vault; an edit writes only the list. The window's memory changes only after the list write. Two rules guard against storage that lies: a mutation refuses to write when a read contradicts the rest (Rule 1), and a list write that throws is settled by reading it back (Rule 2). Retries are safe because each screen fixes the wallet's id once and reuses it, and a save whose id is already listed overwrites its own entries, as today. Duplicates are refused inside the write lock against storage. A supplied password must open the stored vault. Nothing is ever discarded automatically. No record changes shape, no key is added, no copy is added.

## Technical Context

**Language/Version**: TypeScript 5 strict, React 19; React Native / Expo (`apps/mobile`), DOM via WXT MV3 (`apps/extension`) over `@salmon/ui`.

**Primary Dependencies**: none new (`lodash-es` `isEqual`, `bs58`, `@solana/kit` `createKeyPairSignerFromBytes`, `validateMnemonic`, all already used).

**Storage**: records and keys unchanged. Single-key writes only (research R1).

**Testing**: Vitest, Jest. `packages/shared/src/test-utils/crash-storage.ts` over the real `initStorage({ adapter })`: fail at write N, apply-then-throw at write N, read faults (throw, `null`, unparseable), stash faults, snapshots, relaunch as a fresh runtime with `vi.resetModules()`; a key-sensitive cipher; one suite without `navigator.locks` (research R9).

**Target Platform**: iOS/Android (JS-only) and the extension side panel and popup.

**Project Type**: pnpm + turbo monorepo, two apps on two shared packages.

**Performance Goals**: no network inside the vault lock (duplicate derivation is pure). A supplied password costs one key derivation inside the lock (the Add wallet re-auth path derives twice: `checkPassword`, then the proof).

**Constraints**: constitution III; single-record atomicity (FR-003); twins on one contract; no new user-facing text (FR-022).

**Scale/Scope**: see §Files and functions.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status        | How                                                                                                                                                                                                                            |
| ----------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Ownership boundaries             | PASS          | Decisions in `packages/shared/src/hooks`; screens fix the id, pass options and map errors; the extension host clears the phrase and orders its reload after the write turn.                                                    |
| II. Consumers named                 | PASS          | §Consumers. One breaking change inside the repo: `addAccount`'s `replaces` becomes an options object (only caller `useAccountAddFlow.ts:476`).                                                                                 |
| III. Wallet safety (NON-NEGOTIABLE) | PASS, flagged | Fail-closed reads before every destructive write; nothing discarded automatically; a supplied password proven against the vault; `crypto/` untouched. Flagged for sign-off: the hooks files, both password screens, `App.tsx`. |
| IV. Bilingual strings               | PASS          | No new key. Reused on new surfaces: `wallet.import.errors.duplicate`, `wallet.create.invalid_password`, `errors.password_throttled`.                                                                                           |
| V. Functional coverage first        | PASS          | Shared tests on the crash double, red first or labelled guard (§Test plan).                                                                                                                                                    |
| VI. Ask rather than guess           | PASS          | Three plan questions, each built on its default.                                                                                                                                                                               |
| Platform constraints, tokens        | PASS          | No native or visual change.                                                                                                                                                                                                    |

_Twin components_: two existing pairs change, no new pair. Measured before any change: **cross-platform 2248 / ceiling 2265; same-side 870 / ceiling 870** (`cloneLines`; `pnpm check:parity:report` → "106 twin pairs, 0 findings"). Expected change ≤ 0.

## The two rules

**Rule 1 — fail closed.** Before its first write, add, remove and edit reject with a plain `Error` (no new class, no new copy; screens keep today's generic message), writing nothing and leaving memory untouched, when: the raw vault key is present but unparseable; the vault key is absent while the list names a wallet or `WALLETS` is present; the list is present but not an array; or the list reads absent or `[]` while the calling hook's `accounts` holds wallets. Empty secrets (`{}`) are used only when there is no vault key at all. Edit reads only the list, so only the last two apply to it. This replaces `readStoredSecrets` returning `{}` when `getStoredMnemonics()` is `null` (`useAccountsMutationHelpers.ts:60-61`; a non-object vault reads as `null`, `useAccountsSecurityHelpers.ts:64-73`) and `readStoredAccounts`' `?? []` (`useAccountsMutationHelpers.ts:105-107`), which let a lying read rewrite the vault or list without the other wallets.

**Rule 2 — read-back.** When the list write of add, remove or edit throws, read `ACCOUNTS` again and compare `JSON.stringify` of what was written with `JSON.stringify` of what was read (storage round-trips through JSON and drops `undefined` fields). Equal → continue as a success (memory, later rows, resolve). Different, absent, or the read throws → reject with the write's error, memory untouched. Writes before the list that throw reject without a read-back; what they may leave (a mark, an unlisted vault entry) is harmless.

## Architecture decisions

| Piece                                | Lives in                                                                                                                                      | Reuses                                                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Reads + Rule 1 + password proof      | `readStoredWallets(memoryHoldsWallets, password?)` in `useAccountsMutationHelpers.ts`, replacing `readStoredSecrets` and `readStoredAccounts` | `getStorageItem` raw semantics (`storage/storage.ts:339-348`), `isEncryptedMnemonics`, `resolveMnemonicsWithPassword`, the throttle |
| List write + Rule 2 + own-write mark | `writeStoredAccounts(list, { own })`                                                                                                          | today's function (`useAccountsMutationHelpers.ts:86-89`)                                                                            |
| Duplicate and Seed Vault decision    | `findStoredClash(account, list, secrets)`, pure, in `utils/stored-clash.ts` (new)                                                             | `generateKeyPair`, `getSolanaDerivationPath`, `createKeyPairSignerFromBytes`, `normalizeMnemonic`, `isEqual`                        |
| Mark prune                           | `pruneMarks(list)` in the helpers                                                                                                             | `STORAGE_KEYS.UNCONFIRMED_PHRASES`                                                                                                  |
| `DuplicateAccountError`              | the helpers, exported from `hooks/index.ts`                                                                                                   | —                                                                                                                                   |
| Write orders                         | `useAccountsMutations.ts`                                                                                                                     | today's three functions                                                                                                             |
| Fixed id per screen / confirm cycle  | both setup twins, `useAccountAddFlow.ts`                                                                                                      | the factories' existing `id` option (`factories/account-factory.ts:65`, `:150`, `:198`, `:235`)                                     |

## The write orders

A and B listed, A active. "Kill after N": the process dies right after write N landed. "Fail at N": write N throws without landing; "applied at N": it lands and throws. React state changes only on the **memory** row. No row leaves a listed id without its vault entry.

### Add wallet C (`addAccount`)

Pre-steps, inside `withVaultWriteLock`, no writes:

| Step | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1   | Read `ACCOUNTS`, raw `MNEMONICS`, `WALLETS`. A read that throws rejects. Rule 1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| P2   | Secrets. No vault key → `{}`, and remove the stash `DERIVED_KEY` before encrypting (a stash failure rejects), because `encryptMnemonics` prefers a valid cached key over the password (`crypto/encrypt-mnemonics.ts:76-79`) and an earlier attempt cached one before its vault write (`:80-83`). Vault + password → the password must open it (`resolveMnemonicsWithPassword`, which makes its key the stash key, `useAccountsSecurityHelpers.ts:82-90`); penalty and counting exactly as today (`useAccountsMutationHelpers.ts:67-77`). Vault, no password → cached key, else `EncryptionMaterialMissingError` (today's rule). |
| P3   | `findStoredClash`, excluding C's own id: a clash → `DuplicateAccountError`; a listed Seed Vault wallet S with C's address → replace S (§Duplicate rules).                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| P4   | Name and counter. C's id already listed (an earlier attempt landed) → keep that entry's name. Otherwise base = `max(stored COUNTER ?? 0, stored list length)` and, when `nameFromCounter` is given, name = `nameFromCounter(base)` (it receives the counter before the increment; `generateAccountName` adds 1, `utils/account.ts:164-168`).                                                                                                                                                                                                                                                                                    |
| P5   | V1 = secrets + `{ [C.id]: C's secret }` − every unlisted entry exactly equal (`isEqual`) to C's stored secret; S's entry kept. V2 = V1 − S (replace only). List = stored list − C.id − S + C. Encrypt V1 (and V2).                                                                                                                                                                                                                                                                                                                                                                                                              |

| #   | Key                                         | Value                                                                          | Kill right after leaves                            | Next launch shows                                                                                                                                      |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `UNCONFIRMED_PHRASES` (only `unconfirmed`)  | stored marks + C.id                                                            | a mark naming unlisted C                           | before-state; the mark is pruned by the next save or launch                                                                                            |
| 2   | `MNEMONICS`                                 | V1                                                                             | C's entry unlisted                                 | before-state. First save: a vault and no list → the lock screen (extension) or welcome (mobile); the chosen password opens it (§First save)            |
| 3   | `ACCOUNTS` — **deciding** (Rule 2 on throw) | the new list                                                                   | C listed with its entry; counter and selection old | wallets after the change; A active on a held slot (FR-001); counter one behind. First save: C via the loader fallback (`useAccountsLoader.ts:122-125`) |
| —   | **memory**                                  | held wallets − S + C (named); C active; `requiredLock` if a password was given | —                                                  | —                                                                                                                                                      |
| 4   | `COUNTER`                                   | base + 1 (own id already listed: `max(stored counter, list length)`)           | selection old                                      | counter right                                                                                                                                          |
| 5–7 | `ACCOUNT_ID`, `NETWORK_ID`, `PATH_INDEX`    | C and its slot                                                                 | partial selection                                  | C active, slot healed (`useAccountsSelection.ts:87-98`)                                                                                                |
| 8   | `UNCONFIRMED_PHRASES` prune (best effort)   | marks named by a listed `id` or `derivedFrom`                                  | —                                                  | after-state                                                                                                                                            |

Fail or apply at 1–2: rejects, memory untouched, no mark taken back (FR-019). Row 3 throws: Rule 2. Fail at 4–8: logged, the call resolves.

### Seed Vault replace (C replaces listed S, same address)

| #   | Key                                         | Value                                                                                                        | Kill right after leaves                     | Next launch shows                         |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | ----------------------------------------- |
| 1   | marks (only `unconfirmed`)                  | as above                                                                                                     | as above                                    | before-state                              |
| 2   | `MNEMONICS`                                 | V1 (S and C)                                                                                                 | S listed with its entry; C's entry unlisted | before-state                              |
| 3   | `ACCOUNTS` — **deciding** (Rule 2 on throw) | list − S + C                                                                                                 | C listed with its entry; S's entry unlisted | C instead of S, each listed id unlockable |
| —   | **memory**                                  | held − S + C                                                                                                 | —                                           | —                                         |
| 4–7 | counter, selection                          | as above                                                                                                     | as above                                    | as above                                  |
| 8   | `MNEMONICS`                                 | V2 (without S); then the Seed Vault release rule for S's token (released only when no stored wallet uses it) | S's entry gone                              | after-state                               |
| 9   | prune (best effort)                         | as above                                                                                                     | —                                           | after-state                               |

Fail at 8: logged, resolves; S's entry (address and access token, no key) stays unlisted.

### Remove wallet B (`removeAccount`)

Pre-steps: P1 and Rule 1 (the hook's memory holds B, so a list read as absent or `[]` rejects); P2 with the password proof when a password is supplied. New list = stored − B; new vault = secrets − B; both empty → `clearAll` instead.

| #   | Key                                          | Value                                          | Kill right after leaves                  | Next launch shows                                             |
| --- | -------------------------------------------- | ---------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| 1   | `ACCOUNTS` — **deciding** (Rule 2 on throw)  | stored list − B                                | B's entry unlisted; selection may name B | A only; dangling active id → first listed wallet, slot healed |
| —   | **memory**                                   | held − B; active moves if B was active         | —                                        | —                                                             |
| 2–4 | selection (if B was active; failures logged) | first wallet of the new list that memory holds | partial selection                        | a listed active wallet on a held pair                         |
| 5   | `MNEMONICS`                                  | secrets − B                                    | —                                        | after-state                                                   |

Today the selection is written before the list (`useAccountsMutations.ts:251-265`, list `:272`); it moves after. Row 5 throws: the call rejects as today, so the existing removal error shows (`useAccountRemoval.ts:52-53`), with memory already following the list and B's entry unlisted. The Seed Vault release runs after row 5.

`clearAll`: memory, then the stash `DERIVED_KEY` (moved before storage, so key material leaves first as FR-009 asks), then `clearAccountsStorage()` (unchanged), then Seed Vault releases.

### Edit wallet (`editAccount`)

Pre-step: read `ACCOUNTS`, Rule 1 (an absent or `[]` list while memory holds wallets rejects; today it silently does nothing, `useAccountsMutations.ts:212-214`); a list lacking only that id returns as today.

| #   | Key                                         | Value                            | Kill right after leaves | Next launch shows |
| --- | ------------------------------------------- | -------------------------------- | ----------------------- | ----------------- |
| 1   | `ACCOUNTS` — **deciding** (Rule 2 on throw) | stored list, this entry replaced | after-state             | the edit          |
| —   | **memory**                                  | the edited account               | —                       | —                 |

### Launch (`initAccounts`, before `runUpgrades`)

| Step | What                                                                                                                            | On failure               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| L1   | One `withVaultWriteLock` turn: read `ACCOUNTS` and `UNCONFIRMED_PHRASES`; only when the list reads as an array, prune the marks | logged; launch continues |

An absent list prunes nothing: a list read that lies as `null` must not wipe the marks of listed wallets.

## First save that stops after its vault (FR-006)

Nothing is discarded. The vault stays; the list is absent. Extension: the lock screen (`App.tsx:485-498`); the password just chosen unlocks it, and with no wallet listed the window shows the setup screens (`App.tsx:504-511`; reasoned from code). Mobile: welcome (`apps/mobile/app/_layout.tsx:221-226`); create asks for the existing password (`password.tsx:179`); recover asks for a new password (`:169`, `:179`), and only the password chosen in the failed attempt passes the proof; each wrong one counts a failed unlock, as an unlock attempt does today. A repeated setup of the same phrase takes over the unlisted copy (P5), so the vault ends with it once (FR-016). A repeated create on a new screen generates a new phrase, so the first attempt's phrase stays as an unlisted entry.

## Retry safety (FR-014, FR-015)

- **Fixed id.** Both setup twins pick the id on the first submit and keep only that id in a ref for the screen's life; `useAccountAddFlow` picks it once per confirm cycle (kept through re-auth; a new one when the flow's input changes or it steps back). Every attempt rebuilds the account with that id, so no key material is parked between attempts (the comment at `useAccountAddFlow.ts:401-405` stays true).
- **Own entries overwritten.** A save whose id storage already lists overwrites its list entry and vault entry, exactly as today (`useAccountsMutations.ts:130-135`); the duplicate check excludes the wallet's own id.
- **Read-back.** A list write that landed and threw resolves through Rule 2.
- **Declared limitation.** If the read-back itself fails and the user starts again from a new screen (new id), the save is refused as a duplicate. The wallet shows after a reload: on the extension the list-change listener reloads as soon as the write lands, when the cached key is valid (`useLockAcrossWindows.ts:111-126`, `App.tsx:245-248`), else the window locks and the next unlock loads it; on mobile the next unlock or launch loads it.

## Memory after a Rule 2 reject that may have landed

A reject means the read-back did not show the change, which includes a read-back that threw while the write landed.

- **Remove**: storage may lack B while memory holds it. Extension: the stored ids differ from the held ids, so the listener reloads (the own-write mark is cleared on reject). Mobile: no listener; the next unlock or launch loads storage; a retry of the removal writes the same list and the vault without B, then memory follows.
- **Edit**: same ids, so the extension listener ignores it (`useLockAcrossWindows.ts:120`); memory keeps the old name until the next reload, unlock or launch, on both platforms. A retry writes the same edit.

## Window memory and reloads

After a save, memory is today's `[...held − S, C]` with C's lock-computed name. `writeStoredAccounts(list, { own })` records the own-write mark only when memory's ids equal the stored ids, so a window that missed another window's wallet D lets the listener reload and show D; the mark is cleared on a reject. The listener fires while the writer still holds the lock, before its selection rows, and the loader would read the old selection (`useAccountsLoader.ts:103-129`); the extension's `reloadWallets` (`App.tsx:245-248`) therefore first awaits `withVaultWriteLock(async () => undefined)`, which orders it after the turn in flight.

**Android dApp sheet.** A second `ReactActivity` (`plugins/withMobileWalletAdapter.js:89-100`) renders a second root registered from the same bundle (`apps/mobile/index.js:183-187`, `src/mwa/MwaRoot.tsx:59`) with its own `AccountsProvider`, which runs init (`src/providers/AppProviders.tsx:85`). Its only new launch work is the mark prune, inside the write lock. The plan assumes the activity runs on the application's React host, so both roots share one JS runtime and the module-level write queue (`useAccountsMutationHelpers.ts:29`) orders the sheet's prune against a save in the main root; under that assumption the prune is safe. Not verified on a device. The sheet calls no wallet mutation (none under `src/mwa`).

## Password proven against the stored vault (FR-005)

Today a valid cached key wins over a supplied password (`useAccountsMutationHelpers.ts:63-64`), so a save under another password succeeds with the vault still under the first, and mobile then unlocks and enrols with the wrong one (`password.tsx:329`, `:352`). After: when a vault exists and a password is supplied, P2 opens the vault with that password before anything is written; what counts as a failed unlock is unchanged (any error on that path, `useAccountsMutationHelpers.ts:70-75`). The same proof applies to `removeAccount(id, password)`.

Screens map `IncorrectPasswordError` and `UnlockThrottledError` to `passwordCheckErrorKey(err, 'wallet.create.invalid_password')` (`utils/unlock-throttle.ts:45-47`) only on the two setup twins, which always supply a password; with a password and a vault, P2 never touches the cached key, so the `IncorrectPasswordError` a cached key can raise (`crypto/encryption.ts:567`) never reaches that mapping. The Add wallet sheet keeps its generic message for it.

**Stale extension onboarding window.** Another window finished setup with P1; this window's password page asks for a new password and the user enters P2. The proof fails: the page shows "Invalid Password" and one failed unlock is counted, as for any unlock attempt; nothing is written. Entering P1 passes, and the save proceeds against storage (a duplicate phrase is refused). Today the cached key would have saved it under P1 while the screen went on with P2.

## Duplicate rules (FR-010 to FR-013)

`findStoredClash(account, list, secrets)` after P2; storage only; the wallet's own id excluded; no network (never `restoreAccount`, which fetches the catalog and returns `null` for a disabled network, `utils/account.ts:184-195`).

**Held positions of a stored phrase wallet**: the set of non-null values across every array of its `pathIndexes` (`types/account.ts:21`, `StoredAccount.pathIndexes` `:45`). Storage writes slot i as the number i or `null` (`hooks/useAccounts.ts:153-156`). A wallet is created with `[null × start, start]` on each network (`factories/account-factory.ts:108-110`), so its **starting position** is the smallest held position; mirror networks copy the mainnet's positions (`utils/derived-accounts.ts:241-254`) and derived-account edits add positions later (`useAccountsMutations.ts:197-207`). The rule compares the new start against the whole held set, which contains the starting position, so no separate "start" field is needed.

| New secret  | `DuplicateAccountError` when                                                                                                                                            | Replace                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Phrase      | a listed phrase wallet whose phrase equals it after `normalizeMnemonic` holds the new start; or its Solana address at its start equals a listed single-address wallet's | —                                                         |
| Private key | its address is a Solana address of a listed wallet                                                                                                                      | —                                                         |
| Watched     | a listed watched wallet has the same address, or its address is a Solana address of a listed wallet                                                                     | —                                                         |
| Seed Vault  | its address is a Solana address of a listed wallet that is not Seed Vault                                                                                               | a listed Seed Vault wallet with the same address (FR-013) |

Solana addresses of a listed phrase wallet: `generateKeyPair(phrase, getSolanaDerivationPath(i))` (`blockchain/solana/factory.ts:63-88`) for each non-null index of its `solana-*` `pathIndexes`; Bitcoin and Ethereum indexes are never derived. A private key's address: `createKeyPairSignerFromBytes(bs58.decode(key))` (`factory.ts:204-219`). Skips are per index and per entry, never per wallet: an index whose derivation fails, a missing entry (read as an empty phrase, `utils/account-secret.ts:28-31`), a phrase failing `validateMnemonic`, an undecodable key. `clearSeedCache()` follows.

**A derived wallet is not refused.** A derived account is built from the parent's phrase with `startIndex` = the picked position (`useAccountAddFlow.ts:439-447`), stored as `[null × i, i]` (`account-factory.ts:108-110`). The parent's held set is its own positions (for a wallet created at 0, `{0}`), which does not contain i, so the phrase rule passes; its Solana address at i is not an address of a single-address wallet, so the address rule passes. Picking a position the parent already holds is refused, as it would show the same address twice.

## Setup screens and Add wallet (FR-015, FR-020, FR-021)

- **Mobile**: `walletAddedRef` (`password.tsx:140-149`) goes. On the line after `addAccount` resolves, the screen clears the owed-phrase ref, then `setMnemonic(null)`; the unmount cleanup puts back only what the owed ref still holds.
- **Extension**: `handlePasswordSuccess` (`App.tsx:370`) clears `authData`, so the phrase leaves App state when the page hands over.
- **Errors**: `DuplicateAccountError` → `wallet.import.errors.duplicate` (setup error line; Add wallet sheet under `general.error`); `IncorrectPasswordError`, `UnlockThrottledError` → `passwordCheckErrorKey` on the setup twins; others as today. Follow-ups after `addAccount` (analytics, resets, `onPersisted`) move out of the `try` that reports failure (`useAccountAddFlow.ts:466-486`, `:511-524`).

## Copy

No new string.

## Consumers of what changes in `packages/shared`

| Export (change)                                           | Consumers                                                                                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `addAccount(account, password?, options?)`                | `useAccountAddFlow.ts:476`, `useDerivedAccountsScan.ts:343`, `PasswordPage.tsx:192`, `password.tsx:322`; type `useAccounts.ts:119` |
| Rule 1 rejections on add, remove, edit                    | the same, `useAccountRemoval.ts:52`, `panelRegistry.tsx` (both apps), `useEnsureMirrorNetworks.ts:46` (already catches)            |
| New: `DuplicateAccountError`; barrel `withVaultWriteLock` | both password screens, both `AccountAddPanel.tsx`; extension `App.tsx`                                                             |
| `PhraseBackupValue` (− `markUnconfirmed`)                 | `PasswordPage.tsx:79`, `password.tsx:119`; 13 mobile mocks where typecheck requires                                                |
| `defaultName` → `nameFor(counter)`                        | ui `AccountAddPanel.tsx:88-91`, mobile `AccountAddPanel.tsx:105-108`                                                               |
| `isOwnStoredAccountsWrite`                                | `useLockAcrossWindows.ts:118`                                                                                                      |
| `initAccounts` (launch prune)                             | `useAccounts.ts:397`, `retryInit` (`:504`)                                                                                         |

## Files and functions

| File                                                             | Function / change                                                                                                                                                     | Rough size   |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `packages/shared/src/test-utils/crash-storage.ts` (new)          | storage and stash double, faults, read faults, relaunch                                                                                                               | ~150         |
| `packages/shared/src/hooks/useAccountsMutationHelpers.ts`        | `readStoredWallets` (Rule 1, proof) replaces `readStoredSecrets` + `readStoredAccounts`; `writeStoredAccounts` (Rule 2, `own`); `pruneMarks`; `DuplicateAccountError` | ~80 changed  |
| `packages/shared/src/utils/stored-clash.ts` (new)                | `findStoredClash`, pure                                                                                                                                               | ~90          |
| `packages/shared/src/hooks/useAccountsMutations.ts`              | `addAccount` rewrite (P1–P5, rows, replace), `removeAccount` row order, `editAccount` Rule 1, `clearAll` stash first                                                  | ~120 changed |
| `packages/shared/src/hooks/useAccounts.ts`, `hooks/index.ts`     | launch prune in `initAccounts`; options type; exports                                                                                                                 | ~15          |
| `packages/shared/src/hooks/useAccountAddFlow.ts`                 | id per confirm cycle; options; `nameFor`; memory Seed Vault lookup removed; follow-ups out of the failure path                                                        | ~40          |
| `packages/shared/src/hooks/useDerivedAccountsScan.ts`            | options, `nameFor`                                                                                                                                                    | ~5           |
| `packages/shared/src/contexts/PhraseBackupContext.tsx`           | `markUnconfirmed` removed; re-read on listed-id change                                                                                                                | ~20          |
| `packages/ui/.../AuthFlow/PasswordPage.tsx` (+ test)             | id ref, options, error mapping                                                                                                                                        | ~25          |
| `packages/ui/.../AccountAddPanel/AccountAddPanel.tsx`            | `nameFor`                                                                                                                                                             | ~3           |
| `apps/mobile/app/(auth)/password.tsx` (+ test)                   | id ref, `walletAddedRef` removed, phrase cleared on resolve, error mapping                                                                                            | ~30          |
| `apps/mobile/src/components/AccountAddPanel/AccountAddPanel.tsx` | `nameFor`                                                                                                                                                             | ~3           |
| `apps/extension/src/entrypoints/popup/App.tsx` (+ test)          | `authData` cleared on success; reload barrier                                                                                                                         | ~5           |
| 13 mobile mocks                                                  | `markUnconfirmed` removed                                                                                                                                             | ~13          |
| `docs/ARCHITECTURE.md:42`                                        | one sentence on the write order                                                                                                                                       | ~2           |

## Test plan (test-first)

**Doubles** (research R9): `crash-storage.ts` with `failAt(n)`, `failAt(n, { applied: true })`, `failStashAt(n)`, `failRead(key)` (throws), `dropRead(key)` (`null`), `garbleRead(key)` (unparseable string), snapshots after each write, and `relaunch({ keepStash? })` with `vi.resetModules()` so each relaunch or second window is a fresh runtime (own-write mark, write queue). A key-sensitive see-through cipher with a fresh nonce per lock; today's mock opens any vault with any cached key (`hooks/useAccountsMutations.test.tsx:66`). One `describe` with `navigator.locks` removed.

**Assertions** (FR-001): stopped before the deciding write → wallets, secrets, active wallet, slot, counter, password exactly as before, memory unchanged. After it → wallets and entries exactly as after; active = previous (or C if its selection landed) on a held slot; counter right or one behind.

R = red first; G = guard (passes today, kept).

| Case                                                                                                   | Asserts                                                                                                                                                                                                         |       |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| First save: fail 1–8, kill 0–8, stash fault at P2, with and without `keepStash`                        | nothing deleted; kill < 3 → the chosen password opens the vault; retry with the same id → one wallet, one entry; retry with another password after a failed (not applied) vault write → vault under the new one | R     |
| Add C with A, B listed: fail 1–8, kill 0–8                                                             | FR-001 assertions                                                                                                                                                                                               | R     |
| Seed Vault replace, S only in storage: fail 1–9, kill 0–9                                              | one wallet; every listed id has its entry at every position; release rule                                                                                                                                       | R     |
| Remove B (non-active, active): fail 1–5, kill 0–5                                                      | memory follows the list; row 5 throws → rejects with B gone; no entry lost                                                                                                                                      | R / G |
| Remove all: stash, storage 1–12, kill 0–12                                                             | memory and stash key cleared before storage                                                                                                                                                                     | R / G |
| Edit: fail 1, kill 0–1                                                                                 | memory and relaunch agree                                                                                                                                                                                       | R     |
| Applied then thrown at the list write: setup create, setup recover, Add wallet (same id), remove, edit | read-back equal → resolves with the later rows; read-back fails → rejects, memory untouched; retry with the same id → one wallet                                                                                | R     |
| Read-back fails, then a new screen (new id) adds the same phrase                                       | `DuplicateAccountError`; one wallet; extension reload shows it                                                                                                                                                  | R     |
| Dropped or garbled vault read on an add and on a removal (list names A)                                | rejects, nothing written, entries intact                                                                                                                                                                        | R     |
| Garbled vault beside an empty list, then a save                                                        | rejects, nothing written                                                                                                                                                                                        | R     |
| Dropped list read while memory holds wallets (add, remove, edit)                                       | rejects, nothing written                                                                                                                                                                                        | R     |
| Password proof on `addAccount` and `removeAccount` (vault under P1, cached key valid, P2 supplied)     | `IncorrectPasswordError`, nothing written, one failed unlock                                                                                                                                                    | R     |
| Stale onboarding window after another window's setup                                                   | P2 refused, counted once; P1 passes                                                                                                                                                                             | R     |
| Vault + absent list; `WALLETS`; cleartext vault                                                        | launch removes nothing                                                                                                                                                                                          | G     |
| Launch with an absent list (`dropRead`) and marks present                                              | no prune                                                                                                                                                                                                        | R     |
| List not an array                                                                                      | launch: no prune; save rejects                                                                                                                                                                                  | G / R |
| Non-reentrant fake lock, first save                                                                    | no deadlock                                                                                                                                                                                                     | G     |
| Two runtimes: the stale one adds W, which the other added                                              | `DuplicateAccountError`; nothing stored twice                                                                                                                                                                   | R     |
| Stale runtime adds C after another added D                                                             | no own-write mark; reload after the barrier shows D, with C active                                                                                                                                              | R     |
| Counter: kill between 3 and 4, no removal                                                              | next default name not repeated; a same-id retry keeps the stored name                                                                                                                                           | R     |

**Duplicate rules** (`stored-clash.test.ts`): same start, other spacing → refused (R); other start → saved (G); held non-starting index refused (R); derived wallet at an unheld position saved (G); key for a listed phrase's Solana address with the catalog disabled refused, no network (R); phrase holding only Bitcoin index 4 does not refuse the key at Solana index 4 (R); a null index and a missing entry skipped, the wallet's other indexes still compared (R); own id excluded (R); Seed Vault replace and cross-kind refusal (R). **Unlisted copies**: exact copy dropped (R); other spacing kept (R); other phrase kept (G).

**Marks**: saved `unconfirmed` wallet marked when killed after row 3 (R); failed save's mark pruned at the next save and launch (R); prune failure never rejects (R); `derivedFrom` mark kept (R); concurrent window's mark kept (R); provider shows `needsBackup` after `addAccount` (R).

**Screens**: mobile `password.test.tsx` (phrase put back on reject G; cleared on resolve R; same id on retry R; messages R); `PasswordPage.test.tsx` (same id; messages R); `useAccountAddFlow.test.tsx` (same id within a confirm cycle and through re-auth; account rebuilt each attempt; duplicate reaches `onFailure`; `nameFor`; follow-ups never reach `onFailure`, R); `App.test.tsx` (`authData` cleared; reload waits for the lock, R).

**Existing tests that change**: `useAccounts.test.ts` "replaces a wallet in one write…" (`replaces` gone), "aborts addAccount when encryptMnemonics throws…" (memory after row 3), "never leaves a listed wallet without its secret when removeAccount stops…" (still rejects at the vault; memory follows the list); `useAccountsMutations.test.tsx` cipher, `openWindow`, and "writes nothing when the wallet it edits is no longer stored" (rejects under Rule 1 when the list reads empty; unchanged when the list lacks only that id); `useAccountAddFlow.test.tsx` lines 247, 362, 377; `PhraseBackupContext.test.tsx` `markUnconfirmed` case.

## Risks specific to this change

| Risk                                                  | Guard                                                            | Test                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| A lying read drops other wallets                      | Rule 1                                                           | dropped and garbled reads on add, remove, edit |
| A stored change reported as failed, then stored twice | Rule 2; fixed id; refusal from storage                           | applied-then-thrown on every mutation          |
| A listed wallet without its entry                     | vault before list; S after the list; list before vault on remove | entry invariant at every position              |
| A save under the wrong password                       | password proof; stash key dropped when there is no vault         | proof on add and remove; first-save retry      |
| A duplicate check that throws or refuses wrongly      | per-index skips; Solana positions only; own id excluded          | skip, Bitcoin-index and derived cases          |
| A lying list read wipes marks                         | prune only on an array                                           | launch with a dropped list                     |
| A reload reads the old selection                      | barrier on the write lock                                        | reload waits for the lock                      |

## Commit order

1. `test(shared): storage and stash double with faults, read faults and fresh runtimes; key-sensitive cipher`.
2. `fix(shared): refuse to write on contradictory reads and settle a thrown list write by reading back` (Rules 1 and 2 for add, remove, edit).
3. `fix(shared): saving a wallet lands completely or not at all` (rows, password proof, duplicate rules, Seed Vault replace, unlisted copies, counter, marks, memory, own-write mark).
4. `fix: setup and Add wallet screens reuse the wallet id and follow the save's result` (twins, panels, add flow, `App.tsx`, `PhraseBackupContext`, mocks).
5. `docs: write order for wallet changes in ARCHITECTURE.md`.

## Owner questions

1. **Deep-link recover with wallets stored** (spec Q5). Default: refused with "Invalid Password" unless the new password opens the vault; whether the route should exist goes to a separate ticket.
2. **Counter one behind** after a stop between the list and the counter. Default: accept `max(counter, list length)`.
3. **Message placement** of existing copy on the setup screens and the Add wallet sheet. Default: yes.

## Known limitations (for the owner)

- If the read-back fails after a list write that landed and the user restarts from a new screen, the save is refused as a duplicate; the wallet shows after a reload (extension listener, else next unlock; mobile next unlock or launch).
- After a failed first save, mobile recover asks for a new password but only the one chosen in that attempt opens the vault; each wrong one counts a failed unlock.
- A removal whose vault write fails, or a Seed Vault replace stopped before its last vault write, leaves an unlisted entry.
- An edit that landed but was reported failed shows the old name until the next reload, unlock or launch.
- After a removal, a stop between the list and the counter can repeat a default name once.
- Three vault writers outside the write lock (password change, vault upgrade, legacy migration) are a follow-up ticket.

## Project Structure

### Documentation (this feature)

```text
specs/046-atomic-wallet-save/
├── plan.md
├── spec.md
├── research.md          # R1–R11
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
├── hooks/useAccountsMutations.ts         # write orders, memory
├── hooks/useAccounts.ts                  # launch prune
├── hooks/useAccountAddFlow.ts, useDerivedAccountsScan.ts
└── contexts/PhraseBackupContext.tsx

packages/ui/src/components/{AuthFlow/PasswordPage.tsx, AccountAddPanel/AccountAddPanel.tsx}
apps/mobile/{app/(auth)/password.tsx, src/components/AccountAddPanel/AccountAddPanel.tsx}
apps/extension/src/entrypoints/popup/App.tsx
```

**Structure Decision**: every decision is one implementation in `packages/shared`, under the vault write lock; the screens fix the id, pass options and map errors to existing copy.

## Complexity Tracking

| Violation                                   | Why Needed                                                         | Simpler Alternative Rejected Because           |
| ------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------- |
| Phrase derivation inside the lock           | FR-011: the clash is decided on storage, which stores no addresses | memory misses other windows and locked windows |
| Two vaults encrypted per Seed Vault replace | no row may leave a listed id without its entry                     | one vault write before the list                |
