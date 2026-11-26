# Implementation Plan: Saving a wallet is all-or-nothing, and one secret is one wallet

**Branch**: `fix/046-atomic-wallet-save` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/046-atomic-wallet-save/spec.md`: FR-001 (what may stay behind after the deciding write), FR-006 / FR-006a (discard tied to the first save's own note), FR-019 (prune, no take-back) and owner question 1 as revised after the adversarial review of 2026-11-26; questions 2 to 5 on their recommended defaults.

## Summary

Every change to the stored wallets has one deciding write, the wallet list (`STORAGE_KEYS.ACCOUNTS`), because the loader builds only the wallets that list names. A save writes the vault before the list and keeps every listed wallet's entry in the vault until the list has landed (a replaced Seed Vault wallet's entry leaves in a later write); a removal writes the list before the vault, as today; an edit writes only the list. The open window's state changes only after the list write and is built from the list storage now holds. A first save leaves a one-key note before its vault and removes it after its list; a note found beside an empty list means an unfinished first save, and only then is a vault discarded (with the cached key and the unlock penalty). The duplicate check, the Seed Vault replacement, the adoption of an unlisted copy, the name counter and the backup-pending marks all move inside `addAccount`'s lock and read storage. No existing record changes shape; one new key, no migration, no new copy.

## Technical Context

**Language/Version**: TypeScript 5 strict, React 19; React Native / Expo (`apps/mobile`), DOM via WXT MV3 (`apps/extension`) over `@salmon/ui`.

**Primary Dependencies**: none new. `lodash-es` `isEqual` (already a dependency) for exact secret equality; `bs58` and `@solana/kit`'s `createKeyPairSignerFromBytes` (already used by `utils/account.ts:266`) for a private key's address.

**Storage**: existing records unchanged. One new key, `STORAGE_KEYS.FIRST_SAVE` (`'salmon_first_save_pending'`, value `true`), in `storage/types.ts`; absent on every existing install, so nothing migrates (research R3). Writes stay single-key calls (`storage/storage.ts:549-566`); no batch, so iOS AsyncStorage 2.2.0's non-atomic `multiSet` is never on the path (research R1).

**Testing**: Vitest (`packages/shared`, `packages/ui`), Jest (`apps/mobile`). New double `packages/shared/src/test-utils/crash-storage.ts` over the real `initStorage({ adapter })`: fails the Nth storage write or the Nth stash write, snapshots storage after each write, and relaunches with or without the stash. A key-sensitive see-through cipher (research R12). E2E: existing setup flows stay green (FR-024).

**Target Platform**: iOS/Android (JS-only, OTA-able) and the extension side panel and popup.

**Project Type**: pnpm + turbo monorepo, two apps on two shared packages.

**Performance Goals**: nothing inside the vault lock touches the network. Importing a private key, a watched address or a Seed Vault account derives the Solana address of each listed phrase wallet at each index it holds with a pure function (one PBKDF2 per distinct phrase, seed cache cleared after); a new phrase wallet derives one address. Launch adds one Web Lock turn and two reads.

**Constraints**: constitution III (vault and storage writes, a new storage key, auth flows): human sign-off and an adversarial review before merge. Single-record atomicity only (FR-003). Twins on one contract. No new user-facing text (FR-022).

**Scale/Scope**: `useAccountsMutations.ts` (three write orders, memory from storage), `useAccountsMutationHelpers.ts` (note handling, discard, clash, prune, error class, own-write mark), `useAccountsSecurity.ts` (launch turn), `storage/types.ts` (one key), `PhraseBackupContext.tsx`, three add paths (`useAccountAddFlow.ts`, `useDerivedAccountsScan.ts`, both password twins), both Add wallet panels, extension `App.tsx` (one line), one test double, seven test files.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status        | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Ownership boundaries             | PASS          | Write orders, note, discard, duplicate rule, counter, marks: `packages/shared/src/hooks`. One storage key: `packages/shared/src/storage/types.ts`. Screens pass options and map one error: `packages/ui` and `apps/mobile`; the extension host clears the phrase on success.                                                                                                                                                                                           |
| II. Consumers named                 | PASS          | §Consumers. One breaking change inside the repo: `addAccount`'s third parameter `replaces` becomes an options object; its only caller is `useAccountAddFlow.ts:476`.                                                                                                                                                                                                                                                                                                   |
| III. Wallet safety (NON-NEGOTIABLE) | PASS, flagged | Vault and list write order changes; a vault is deleted only beside the first save's own note (FR-006, owner-approved); a new key in `storage/types.ts`; `crypto/` untouched. No secret in logs or errors (`DuplicateAccountError` carries none). Flagged for human sign-off: `useAccountsMutations.ts`, `useAccountsMutationHelpers.ts`, `useAccountsSecurity.ts`, `storage/types.ts`, both password screens, extension `App.tsx`. §Risks maps each guard to its test. |
| IV. Bilingual strings               | PASS          | No new key. `wallet.import.errors.duplicate` ("This wallet is already in your list." / "Esta billetera ya está en tu lista.", both files line 601) is shown on two more surfaces (§Copy).                                                                                                                                                                                                                                                                              |
| V. Functional coverage first        | PASS          | Shared Vitest tests on the crash double, red first where today's code fails, labelled guards where it already passes (§Test plan). Screen tests for both password twins; no new E2E.                                                                                                                                                                                                                                                                                   |
| VI. Ask rather than guess           | PASS          | Owner Q1 revised and answered; Q2–Q5 on defaults; three plan questions (§Owner questions), each built on its default.                                                                                                                                                                                                                                                                                                                                                  |
| Platform constraints                | PASS          | No `app.json`, plugin or permission change; JS-only.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Design tokens                       | PASS          | No visual change.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

_Twin components_: two existing pairs change (setup password screen; Add wallet panel), no new pair. Measured before any change: **cross-platform clones 2248 lines, ceiling 2265; same-side 870, ceiling 870** (`cloneLines`, `scripts/check-dom-parity.mjs`; `pnpm check:parity:report` → "106 twin pairs, 0 findings"). The default-name `useMemo` and `markUnconfirmed` leave both twins; each gains one `instanceof DuplicateAccountError` branch and an account ref. Expected change ≤ 0; neither ceiling moves.

Post-design re-check: unchanged. The one path that deletes key material requires a note that only a first save on an empty device writes.

## Architecture decisions

| Piece                                     | Lives in                                                                                                 | Reuses                                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Deciding write for add, remove, edit      | `writeStoredAccounts` (`useAccountsMutationHelpers.ts:86`)                                               | the list the loader treats as the source of truth (`useAccountsLoader.ts:85-99`)                               |
| First-save note and discard (FR-006/006a) | `settleFirstSave(list)` in `useAccountsMutationHelpers.ts`; called at save start and at launch           | `clearAccountsStorage` (note removed last), `clearUnlockPenalty`, `withVaultWriteLock` (R3)                    |
| Duplicate and Seed Vault replacement      | `findStoredClash()` in `useAccountsMutationHelpers.ts`; `DuplicateAccountError`                          | `generateKeyPair` + `getSolanaDerivationPath` (`blockchain/solana/factory.ts:63-88`), `normalizeMnemonic` (R4) |
| Idempotent retry                          | `addAccount`: an id storage lists with an equal secret is done                                           | `toStoredSecret`, `isEqual` (R8)                                                                               |
| Adoption of an unlisted copy              | `addAccount`, exact `isEqual` on stored secrets                                                          | (R5)                                                                                                           |
| Name counter                              | `addAccount` reads `COUNTER`; `nameFromCounter(counterBefore)`                                           | `generateAccountName` (`utils/account.ts:164-168`) (R6)                                                        |
| Backup-pending marks                      | `addAccount` option `unconfirmed`; `pruneMarks(list)` on every save and at launch                        | `walletOf` rule (`PhraseBackupContext.tsx:63-66`) (R7)                                                         |
| Window memory after a write               | built from the list storage holds after the write; own-write mark only when memory holds every stored id | `isOwnStoredAccountsWrite`, `useLockAcrossWindows.ts:111-127` (R10)                                            |
| Stale selection after a stop              | none new                                                                                                 | loader fallback (`useAccountsLoader.ts:122-125`), slot healing (`useAccountsSelection.ts:87-98`)               |
| Second submit on the setup screens        | account built once per screen, kept in a ref; idempotent `addAccount`                                    | (R8)                                                                                                           |

Not built: a multi-key batch or journal (R1); any change to an existing record; a lock-reentrant wrapper (helpers take no lock, R11); a discard decided on the shape of storage (FR-006a, R3); a fault hook in app builds (R12).

## The write orders

A and B are listed, A is active. "Kill after N": the process dies right after write N landed. "Fail at N": write N throws. The open window's state changes only on the **memory** row. No row leaves a listed id without its vault entry.

### Add wallet C (`addAccount`)

All of it inside `withVaultWriteLock`, in this order. Nothing below row 1 runs if an earlier step throws.

**Before any write**

| Step | What                                                                                                                                                                                                                                                                                                                                                                             |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1   | Read `ACCOUNTS` (a throw rejects), `MNEMONICS`, `WALLETS`, `FIRST_SAVE`.                                                                                                                                                                                                                                                                                                         |
| P2   | `settleFirstSave`: note + empty list → discard (sequence D below); note + listed wallet → remove the note. No note → nothing.                                                                                                                                                                                                                                                    |
| P3   | First save (after P2: no vault, list empty, no `WALLETS`): remove the stash `DERIVED_KEY`. A stash failure rejects. Runs before any secret is read or encrypted, so a retry never reuses an earlier attempt's key (`encrypt-mnemonics.ts:76-79`).                                                                                                                                |
| P4   | Idempotent retry: the list names C's id and the vault entry for it equals C's stored secret → memory built from storage, resolve. No second wallet write.                                                                                                                                                                                                                        |
| P5   | `readStoredSecrets(password)` (first save: `{}`).                                                                                                                                                                                                                                                                                                                                |
| P6   | `findStoredClash` (pure derivation, no network): duplicate → `DuplicateAccountError`; listed Seed Vault wallet S with C's address → S is the one to replace.                                                                                                                                                                                                                     |
| P7   | Build: vault V1 = stored secrets + C − unlisted entries exactly equal to C's stored secret (S's entry **kept**); V2 = V1 − S (replace only); list = stored list − S + C; marks = stored marks pruned against that list, + C if `unconfirmed`. Counter base = `max(stored COUNTER ?? 0, stored list length)`; C's name = `nameFromCounter(base)` when given. Encrypt V1 (and V2). |

**Writes**

| #   | Key                                        | Value                                                                                                    | Kill right after leaves                                                                       | Next launch shows                                                                                                                                                                              |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `FIRST_SAVE` (first save only)             | `true`                                                                                                   | a note, no vault, empty list                                                                  | note + empty list → discard → welcome                                                                                                                                                          |
| 2   | `UNCONFIRMED_PHRASES` (only if it changes) | pruned marks (+ C)                                                                                       | a mark naming C, unlisted                                                                     | before-state wallets; the mark is pruned at launch. First save: discard → welcome                                                                                                              |
| 3   | `MNEMONICS`                                | V1                                                                                                       | C's secret in the vault, unlisted; S still listed with its entry                              | before-state wallets, active, counter and password. First save: note + empty list → discard → welcome                                                                                          |
| 4   | `ACCOUNTS` — **deciding**                  | list − S + C                                                                                             | C listed with its secret; S unlisted, its entry still in the vault; counter and selection old | wallets after the change, each with its secret; A still active on a slot it holds (FR-001); counter one behind. First save: note + listed → note removed, C active through the loader fallback |
| —   | **memory**                                 | accounts from the stored list (held objects + C, − S), counter, active C with its slot, lock requirement | —                                                                                             | —                                                                                                                                                                                              |
| 5   | `FIRST_SAVE` removed (first save only)     | —                                                                                                        | as row 4                                                                                      | as row 4                                                                                                                                                                                       |
| 6   | `COUNTER`                                  | base + 1                                                                                                 | selection old                                                                                 | as row 4, counter right                                                                                                                                                                        |
| 7   | `ACCOUNT_ID`                               | C                                                                                                        | C active, network and slot still A's                                                          | C active; the slot is healed to one C holds                                                                                                                                                    |
| 8   | `NETWORK_ID`                               | C's network                                                                                              | slot still A's                                                                                | C on its network; slot healed if needed                                                                                                                                                        |
| 9   | `PATH_INDEX`                               | C's slot                                                                                                 | (replace only) S's entry unlisted in the vault                                                | after-state                                                                                                                                                                                    |
| 10  | `MNEMONICS` (replace only)                 | V2                                                                                                       | —                                                                                             | after-state                                                                                                                                                                                    |

Fail at 1–4: rejects; memory untouched; no mark is taken back (FR-019: the next save or launch prunes it). Fail at 5–10: logged, resolves (FR-008). A stash failure (P3, or the key cache `encryptMnemonics` writes during P7) rejects before row 1.

**D — discard sequence** (inside `settleFirstSave`, used at P2 and at launch): D1 stash `DERIVED_KEY` removed → D2 `UNLOCK_ATTEMPTS` removed (`clearUnlockPenalty`, `utils/unlock-throttle.ts:142-145`) → D3–D15 `clearAccountsStorage()`: the 12 removals of `useAccountsMutationHelpers.ts:136-147`, then `FIRST_SAVE` **last**. A kill anywhere before D15 leaves the note, so the next launch or save start repeats the discard. A failure rejects (save) or reaches the init-failed gate (launch), whose retry repeats it.

### Remove wallet B (`removeAccount`)

Inside the lock: read list and secrets, build both without B, encrypt. If list and vault would both end empty, `clearAll` runs instead.

| #   | Key                                                             | Value                                                                   | Kill right after leaves                                        | Next launch shows                                                                                |
| --- | --------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | `ACCOUNTS` — **deciding**                                       | stored list − B                                                         | B unlisted, its entry still in the vault; selection may name B | A only, with its secret; a dangling active id falls back to the first listed wallet, slot healed |
| —   | **memory**                                                      | accounts from the stored list; active moves if B was active             | —                                                              | —                                                                                                |
| 2–4 | `ACCOUNT_ID`, `NETWORK_ID`, `PATH_INDEX` (only if B was active) | the first wallet of the new stored list this window holds, and its slot | partial selection                                              | a listed active wallet on a pair it holds                                                        |
| 5   | `MNEMONICS`                                                     | stored secrets − B                                                      | —                                                              | after-state                                                                                      |

Fail at 1: rejects, memory untouched, B listed. Fail at 2–4: logged. Fail at 5: memory still follows the list (B is gone) and the call **rejects**, so the existing removal error surface tells the user (`useAccountRemoval.ts:52-53`); B's entry stays in the vault unlisted (known limitation). The Seed Vault release runs only after row 5 lands (unchanged rule).

`clearAll` ("Remove all wallets"): memory first (unchanged), then the stash `DERIVED_KEY` (moved from after storage to before it, R13), then `clearAccountsStorage()` (now ending with `FIRST_SAVE`), then the Seed Vault releases.

### Edit wallet (`editAccount`)

| #   | Key                       | Value                                         | Kill right after leaves | Next launch shows             |
| --- | ------------------------- | --------------------------------------------- | ----------------------- | ----------------------------- |
| 1   | `ACCOUNTS` — **deciding** | stored list with this wallet's entry replaced | after-state             | the new name, avatar or slots |
| —   | **memory**                | the edited account                            | —                       | —                             |

Fail at 1: rejects, memory keeps the old values.

### Launch (`initAccounts`, before `runUpgrades`)

One `withVaultWriteLock` turn:

| Step | What                                                                                                                                      | On failure                                           |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| L1   | Read `ACCOUNTS` and `FIRST_SAVE`                                                                                                          | list read throws → init-failed gate, nothing removed |
| L2   | `settleFirstSave`: note + list `null`/`[]` → D1–D15; note + listed wallet → remove the note; no note → nothing                            | init-failed gate; its retry repeats L2               |
| L3   | Prune `UNCONFIRMED_PHRASES` when the list is an array: keep marks named by a listed wallet's `id` or `derivedFrom`; write only if changed | caught and logged; init continues                    |

Then today's `runUpgrades` and `initializeAccountsSecurity`.

## FR-006 / FR-006a

- **The note** is written only by a save that starts with no vault (`MNEMONICS` absent), no listed wallet and no `WALLETS` record. So a note beside a vault proves the vault came from that unfinished save.
- **Without a note nothing is discarded.** An empty list beside an encrypted vault with no `WALLETS` is also what an interrupted v2 migration leaves once an unlock has removed its record (`legacy-migration.ts:134-151` removes the record while the vault holds its seeds; migration writes vault, then list, then removes the record, `:357-371`; once a vault exists it answers "no-migration", `:183-186`). There the vault is the only copy.
- **A list that cannot be read** is not empty: the throw propagates (save rejects; launch reaches the init-failed gate, `useAccountsSecurity.ts:306-310`). A corrupt list comes back as a raw string (`storage/storage.ts:344-348`): not `null`/`[]`, so no discard and no prune.
- **Inside the lock**: a save in another window either has not written its note yet or has finished its list; it is never discarded mid-way.

| Stored state                                                                                         | Today                                                                                                                                    | After this change                                    |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| note + empty list (+ vault or not)                                                                   | (no note exists)                                                                                                                         | discard, welcome; a setup with any password succeeds |
| note + listed wallet                                                                                 | (no note exists)                                                                                                                         | note removed; the wallets load                       |
| vault + empty list + no note (pre-046 failed first save, failed "Remove all", interrupted migration) | extension: lock screen (`App.tsx:485-498`); mobile: welcome, then the password screen asks for an existing password (`password.tsx:179`) | **unchanged**                                        |
| cleartext vault + empty list                                                                         | protect mode (`useAccountsSecurityHelpers.ts:172-176`)                                                                                   | unchanged                                            |

## One secret, one wallet

`findStoredClash(account, storedList, storedSecrets)` inside the lock, after P5. Storage only; never the window's memory. No network: every address comes from a pure function, never from `restoreAccount`, whose `createBlockchainAccountForNetwork` fetches the network catalog and returns `null` for a disabled network (`utils/account.ts:184-195`).

| New secret kind | Refused (`DuplicateAccountError`) when                                                                                                                                                                      | Replaced when                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Phrase          | a listed wallet's phrase equals it after `normalizeMnemonic` and the new start is an index that wallet holds on any network; or its Solana address at its start is a listed single-address wallet's address | —                                                   |
| Private key     | its address is held by any listed wallet                                                                                                                                                                    | —                                                   |
| Watched address | its address is held by any listed wallet                                                                                                                                                                    | —                                                   |
| Seed Vault      | its address is held by a listed wallet that is not Seed Vault                                                                                                                                               | a listed Seed Vault wallet has its address (FR-013) |

Addresses (Solana family only; private keys, watched and Seed Vault wallets are Solana-only):

- phrase at index i: `(await generateKeyPair(phrase, getSolanaDerivationPath(i))).signer.address` (`blockchain/solana/factory.ts:63-88`); a listed phrase wallet at every distinct index in the union of its `pathIndexes` values across **all** networks, so a disabled or missing catalog entry never skips it;
- private key: the address of `createKeyPairSignerFromBytes(bs58.decode(key))` (the call `createSolanaAccountFromSecretKey` makes, `factory.ts:204-219`);
- watched, Seed Vault: the `address` in the secret.

Phrases are derived only when the new wallet has one address (all listed phrase wallets) or when the new wallet is a phrase (its own one address, against listed single-address wallets). `clearSeedCache()` follows. The memory checks (`useImportPrivateKey.ts:87`, `useImportWatchOnly.ts:71`, `seedVaultRows`) stay as an early hint.

## Setup screens: second submit and the phrase (FR-015, FR-020, FR-021)

- **Built once per screen.** Both twins build the account on the first submit and keep it in a ref; every retry on that screen sends the same account, so the same id. Seed Vault still re-asks Seed Vault for the account on each attempt (`password.tsx:290-300`), then reuses the built one.
- **Idempotent save.** `addAccount` answers "done" (P4) when storage lists that id with an equal secret: a retry after a save whose list write landed but reported failure stores nothing new and resolves.
- **"Saved" is the result.** `walletAddedRef` (`password.tsx:140-149`) goes. Mobile holds the phrase owed back in a ref; on the line after `await actions.addAccount(...)` resolves, the screen clears that ref and the account ref, then `setMnemonic(null)`: **the phrase leaves mobile React state there**. The unmount cleanup puts back only what the owed ref still holds, so only when nothing was saved; the effect cleanup that runs on `setMnemonic(null)` finds the ref already empty. With no phrase, `canSubmit` is false and a second submit cannot start.
- **Extension.** `PasswordPage` keeps the account ref and clears it when `addAccount` resolves. The phrase lives in `App.tsx`'s `authData` (`App.tsx:201`, prop at `:543`) and today stays until the consent step resolves (`:417`); `handlePasswordSuccess` (`:370`) sets `authData` to `null`, so **the phrase leaves extension React state when the page hands over**, after the wait's exit. Before that the form is submerged and does not submit.
- **After a save**: nothing after `addAccount` throws on either twin (`unlockAccounts` answers `false`; `trackOnboardingEvent` is `void`), so a saved wallet always moves on (FR-015, Q2 default).
- **Name and mark**: both pass `nameFromCounter` and, on create (not Seed Vault), `unconfirmed: true`; `markUnconfirmed` (`password.tsx:321`, `PasswordPage.tsx:191`) goes.

## Window memory after a write

Add, replace and remove set `accounts` to the stored list after the write, in stored order: the objects this window holds for those ids, plus C (add), minus S or B. A stored id this window does not hold (another window's wallet) cannot be built inside the lock without derivation, so it is left out and the own-write mark is **not** set: `writeStoredAccounts(list, { own })` records the mark only when memory will hold every stored id. The extension's listener then sees a list that differs from what this window holds and reloads (`useLockAcrossWindows.ts:118-126`). With the mark set as today (`useAccountsMutationHelpers.ts:86-89`), a stale window that adds a wallet would ignore its own write and never learn of the other window's wallet. The mark is also cleared when the write throws.

## Owner question 5: recover with wallets stored

Reachable only by a deep link while unlocked (reasoned from code, not run): in-app routes enter `(auth)` only after "Remove all wallets" (`(app)/_layout.tsx:126-130`, `(app)/settings/index.tsx:196-200`); the root guard leaves `(auth)` only when locked or before the first navigation (`app/_layout.tsx:243-257`); scheme `salmonwallet` (`app.json:9`), no `+native-intent` filter.

The screen asks for a new password in recover (`password.tsx:166-179`). An unlocked session holds a cached key unless it has expired (`KEY_CACHE_TTL` five minutes, sliding, `crypto/encryption.ts:71`, `:527-531`). With a valid key `encryptMnemonics` re-encrypts under it (`encrypt-mnemonics.ts:72-79`) and the vault keeps the old password; `unlockAccounts(newPassword)` then fails and counts a failed unlock (`password.tsx:329`), and the new password goes to biometric enrolment (`:352`). With an expired key, `readStoredSecrets(newPassword)` rejects before any write. Under this plan a listed phrase is refused before any write; FR-005 holds. The rest is an existing defect (§Owner questions, 1).

## A save under a new password after a failed "Remove all"

`clearAll` forgets memory, then clears storage, and removes the stash key only after storage (`useAccountsMutations.ts:94-106`). If `clearAccountsStorage` throws after removing the list, the vault stays, the stash key stays and the window shows setup (memory is empty, `requiredLock` false). A setup then is not a first save (a vault exists, so no note), and `encryptMnemonics` re-encrypts the whole vault under the old cached key while the user believes the new password.

- **In scope**: the stash key is removed before storage in `clearAll` (memory first, FR-009). The setup then reads the vault with the new password, which is refused before any write.
- **Out of scope**: the leftover vault itself. Without a note it cannot be told from an interrupted migration's only copy (FR-006a), so it stays: the setup reports failure (and counts one failed unlock), the next launch shows today's lock screen, and "Forgot password" repeats the reset. Listed as a known limitation.

## Copy

No new string. `wallet.import.errors.duplicate` appears, unchanged, on the setup password screen's error line (both twins) and in the Add wallet error sheet under `general.error` (both twins).

## Consumers of what changes in `packages/shared`

| Export (change)                                                       | Consumers                                                                                                                                 |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `addAccount(account, password?, options?)` (was `replaces`)           | `useAccountAddFlow.ts:476`, `useDerivedAccountsScan.ts:343`, `PasswordPage.tsx:192`, mobile `password.tsx:322`; type `useAccounts.ts:119` |
| `removeAccount` rejects on a failed vault write after the list        | `useAccountRemoval.ts:52-53` (already catches)                                                                                            |
| New: `DuplicateAccountError` (hooks barrel)                           | `PasswordPage.tsx`, mobile `password.tsx`, both `AccountAddPanel.tsx`                                                                     |
| New: `STORAGE_KEYS.FIRST_SAVE`                                        | `useAccountsMutationHelpers.ts` only                                                                                                      |
| `clearAccountsStorage` (+ `FIRST_SAVE` last)                          | `useAccountsMutations.ts` `clearAll`, `settleFirstSave`                                                                                   |
| `PhraseBackupValue` (− `markUnconfirmed`)                             | `PasswordPage.tsx:79`, mobile `password.tsx:119`; mocks in 13 mobile test files, edited where typecheck requires                          |
| `UseAccountAddFlowOptions.defaultName` → `nameFor(counter)`           | ui `AccountAddPanel.tsx:88-91` (counter), mobile `AccountAddPanel.tsx:105-108` (`accounts.length`), `useAccountAddFlow.test.tsx`          |
| `isOwnStoredAccountsWrite` (mark set only when memory holds every id) | `apps/extension/src/entrypoints/popup/useLockAcrossWindows.ts:118`                                                                        |
| `initAccounts` (launch turn first)                                    | `useAccounts.ts:397`, `retryInit` (`:504`)                                                                                                |

## Files to create or modify

| Package / app     | File                                                                                                                  | Change                                                                                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared` | `src/storage/types.ts`                                                                                                | `FIRST_SAVE` key                                                                                                                                                                                |
|                   | `src/test-utils/crash-storage.ts` (new)                                                                               | the double (R12)                                                                                                                                                                                |
|                   | `src/hooks/useAccountsMutationHelpers.ts`                                                                             | `settleFirstSave`, `findStoredClash` with pure addresses, `pruneMarks`, `DuplicateAccountError`; `clearAccountsStorage` ends with the note; `writeStoredAccounts` `own` flag and clear on throw |
|                   | `src/hooks/useAccountsMutations.ts`                                                                                   | the three write orders; P1–P7; memory from the stored list; `clearAll` key order                                                                                                                |
|                   | `src/hooks/useAccountsSecurity.ts`                                                                                    | launch turn L1–L3                                                                                                                                                                               |
|                   | `src/hooks/useAccounts.ts`                                                                                            | `addAccount` type                                                                                                                                                                               |
|                   | `src/hooks/useAccountAddFlow.ts`                                                                                      | no memory Seed Vault lookup; `nameFor`; post-save steps outside the failure path                                                                                                                |
|                   | `src/hooks/useDerivedAccountsScan.ts`                                                                                 | `nameFromCounter`                                                                                                                                                                               |
|                   | `src/contexts/PhraseBackupContext.tsx`                                                                                | `markUnconfirmed` removed; re-read on a change of listed ids; `update` under the lock                                                                                                           |
|                   | `src/hooks/index.ts`                                                                                                  | export `DuplicateAccountError`                                                                                                                                                                  |
| `packages/ui`     | `AuthFlow/PasswordPage.tsx` (+ test), `AccountAddPanel/AccountAddPanel.tsx`                                           | account ref, options, duplicate message, `nameFor`                                                                                                                                              |
| `apps/mobile`     | `app/(auth)/password.tsx` (+ `__tests__/app/password.test.tsx`), `src/components/AccountAddPanel/AccountAddPanel.tsx` | account and phrase refs, options, duplicate message, `nameFor`                                                                                                                                  |
| `apps/extension`  | `src/entrypoints/popup/App.tsx`                                                                                       | `handlePasswordSuccess` clears `authData`                                                                                                                                                       |
| docs              | `docs/ARCHITECTURE.md:42` (Spanish)                                                                                   | one sentence: the list decides each wallet change; the first-save note                                                                                                                          |
|                   | `CLAUDE.md`                                                                                                           | SPECKIT pointer (outside the spec folder; for the reviewer)                                                                                                                                     |

## Test plan (test-first)

**Doubles** (research R12):

- `crash-storage.ts`: an in-memory `StorageAdapter` for `initStorage({ platform: 'mobile', adapter })` and an in-memory stash. Every storage `setItem` / `removeItem` is one write; `failAt(n)` throws at storage write n without applying it; `failStashAt(n)` does the same for stash writes; `snapshots[k]` is storage after write k. `relaunch(k)` re-inits from `snapshots[k]` with an empty stash (process death); `relaunch(k, { keepStash: true })` keeps the stash (an extension window reopened while the background worker lives). Both mount a fresh `useAccounts`.
- Cipher: a see-through, **key-sensitive** double. `lock`/`lockAndGetKey(data, password)` record a key id derived from the password; `lockWithKey(data, cache)` records the cache's key id; `unlockAndGetKey` throws unless the password matches, `unlockWithKey` throws unless the cache's key id matches; caches carry `expiresAt` so `isKeyCacheValid` behaves as the real one. Today's mock opens any vault with any cached key (`useAccountsMutations.test.tsx:66`) and is not enough for FR-005/FR-006.

**Assertions after a stop past the deciding write** (FR-001): the set of listed wallets and their vault entries are exactly the after-state; the active wallet is the previous one (or the new one if its selection landed) on a slot it holds; the counter may be one behind and the next save's name is not repeated. Before the deciding write: wallets, secrets, active wallet, slot, counter and password are exactly the before-state.

**`hooks/useAccountsAtomic.test.tsx`** (new). R = red first today; G = guard (passes today, must stay).

| Case                                                 | Positions                                        | Asserts                                                                                                                               |                                       |
| ---------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| First save, fresh device, create                     | fail 1–9, kill 0–9, stash fail P3 and in encrypt | kill < 4 → relaunch: welcome; retry with **another** password saves and unlocks with it, not the first; kill ≥ 4 → one wallet, marked | R                                     |
| Same, `keepStash`                                    | kill 0–9                                         | as above (the stale key is dropped at P2/P3)                                                                                          | R                                     |
| Leftover note, next save starts                      | fail D1–D15, kill D1–D15                         | discard repeats until the note is gone; then the save lands                                                                           | R                                     |
| Add C with A, B listed                               | fail 2–9, kill 0–9                               | before-state, or after-state per FR-001                                                                                               | R                                     |
| Retry after each failure, same account               | fail 1–4                                         | one wallet for C; vault holds C's secret once; P4 resolves without a second list write when row 4 landed                              | R                                     |
| Seed Vault replace, S listed only in storage         | fail 2–10, kill 0–10                             | one wallet for the address; **every listed id has its vault entry at every position**                                                 | R                                     |
| Remove B (non-active), (active)                      | fail 1–5, kill 0–5                               | memory follows the list; fail at 5 rejects with B gone; every listed id has its entry                                                 | R (memory order), G (entry invariant) |
| Remove all                                           | stash fail 1, storage fail 1–13, kill 0–13       | memory and stash key cleared before the first storage removal                                                                         | R (key order), G (memory first)       |
| Edit                                                 | fail 1, kill 0–1                                 | old or new values, memory and relaunch agree                                                                                          | R                                     |
| Launch with a note                                   | fail and kill D1–D15, L3                         | welcome; a prune failure does not block init                                                                                          | R                                     |
| Vault + empty list + **no note**                     | launch                                           | nothing removed; lock screen as today                                                                                                 | G                                     |
| `WALLETS` + vault + empty list; cleartext vault      | launch                                           | nothing removed                                                                                                                       | G                                     |
| List read throws; list is a corrupt string           | launch, save                                     | nothing removed, no prune; init error / reject                                                                                        | G                                     |
| Non-reentrant fake `navigator.locks`                 | first save                                       | no deadlock (helpers take no lock)                                                                                                    | R (new code)                          |
| Two windows, one stale, same phrase                  | —                                                | one wallet; `DuplicateAccountError`                                                                                                   | R                                     |
| Stale window adds C after another window added D     | —                                                | own-write mark not set; listener reload brings D                                                                                      | R                                     |
| Locked window (placeholders)                         | —                                                | refused from storage                                                                                                                  | R                                     |
| Counter: kill between 4 and 6, no removal in history | —                                                | next default name not repeated                                                                                                        | R                                     |
| Failed "Remove all" then setup with a new password   | —                                                | vault never re-encrypted under the old key; save rejects                                                                              | R                                     |

**Duplicate rule** (`useAccountsMutations.test.tsx`): phrase same start refused (R); other start accepted (G); start held inside by "Check derivables" refused (R); other spacing or case refused (R); private key for a listed phrase address refused, with the Solana catalog entry disabled (R); watched address of a listed key refused from storage only (R); Seed Vault same address replaced, other kind refused (R); no network call during `addAccount` (spy on the catalog fetch) (R). **Adoption**: unlisted exact copy dropped (R); unlisted entry of the same phrase with other spacing kept (R); unlisted entry of another phrase kept (G).

**Marks** (`PhraseBackupContext.test.tsx`, atomic file): saved `unconfirmed` wallet marked when killed after row 4 (G today, R for the in-lock write); failed save leaves a mark that the next save or launch prunes (R); three retries → one mark (R); mark named by `derivedFrom` survives (R); prune under the lock keeps another window's mark (R); provider shows `needsBackup` after `addAccount` without remount (R).

**Screens**: mobile `password.test.tsx` — reject → leaving puts the phrase back (G); resolve → nothing put back, `mnemonic` state cleared, second submit impossible (R); two submits after a failure send the same account id (R); duplicate → the message (R). `PasswordPage.test.tsx` — same account id on retry; duplicate message (R). `useAccountAddFlow.test.tsx` — duplicate reaches `onFailure`; `nameFor`; post-save steps never reach `onFailure` (R). Extension `App.test.tsx` — `authData` cleared on password success (R).

**Existing tests that change**:

| Test                                                                                              | Why                                                                                |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `useAccounts.test.ts` "replaces a wallet in one write instead of keeping both"                    | `replaces` gone; rewritten as a Seed Vault wallet replaced by address from storage |
| `useAccounts.test.ts` "aborts addAccount when encryptMnemonics throws…"                           | same intent; memory setters now run after row 4                                    |
| `useAccounts.test.ts` "never leaves a listed wallet without its secret when removeAccount stops…" | still rejects at write 2 (the vault); now also asserts memory follows the list     |
| `useAccountsMutations.test.tsx` cipher mock and `openWindow`                                      | key-sensitive cipher; memory-from-storage                                          |
| `useAccountAddFlow.test.tsx` lines 247, 362, 377                                                  | options object; the revoked Seed Vault case moves to the mutations                 |
| `PhraseBackupContext.test.tsx` "marks a new wallet without dropping one already waiting"          | `markUnconfirmed` gone; moves to `addAccount`                                      |
| `useAccounts.test.ts` "should detect encrypted mnemonics and set locked state"                    | unchanged: no note, so the vault with no list still locks (a guard for FR-006a)    |

## Risks specific to this change

| Risk                                                                       | Guard                                                                                            | Test                                                                  |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| A real wallet's vault is discarded                                         | discard only beside the first save's own note; note written only on an empty device              | vault + empty list + no note; `WALLETS`; cleartext; unreadable list   |
| A listed wallet without its vault entry (every unlock fails)               | vault before list on save; replaced entry kept until after the list; list before vault on remove | entry invariant at every position, replace included                   |
| A retry encrypts under an earlier attempt's password                       | P3 drops the stash key before any read or encryption; discard drops it too                       | first save, retry with another password, with and without `keepStash` |
| A failed "Remove all" leaves the old key, and a setup re-encrypts under it | stash key removed before storage in `clearAll`                                                   | failed "Remove all" then setup                                        |
| Adoption drops a secret that is not the one saved                          | exact `isEqual`, unlisted entries only                                                           | other spacing kept; other phrase kept                                 |
| A legitimate derived wallet refused                                        | phrase + held index                                                                              | other start accepted                                                  |
| A duplicate slips past (stale, locked window, disabled catalog)            | storage only, pure derivation over all held indexes                                              | two windows; locked; catalog disabled                                 |
| The lock waits on the network                                              | pure address functions                                                                           | no catalog fetch during `addAccount`                                  |
| An unconfirmed wallet ends up unmarked                                     | mark before the list, inside the lock; no take-back; prune keeps `derivedFrom`                   | kill after row 4; concurrent prune; derived child                     |
| A stale window never learns another window's wallet                        | own-write mark only when memory holds every stored id                                            | stale window adds C after D                                           |
| The discard deadlocks                                                      | helpers take no lock                                                                             | non-reentrant fake lock                                               |
| A removal looks done while its vault write failed                          | the call rejects; existing error surface                                                         | remove, fail at 5                                                     |

## Commit order

Each commit passes the pre-commit gates on its own.

1. `test(shared): storage and stash double that fails or stops at any write, and a key-sensitive cipher`.
2. `fix(shared): a first save leaves a note, and only its leftover is discarded` — `FIRST_SAVE`, `settleFirstSave`, launch turn, `clearAccountsStorage`, `clearAll` key order.
3. `fix(shared): saving a wallet lands completely or not at all` — add order, P1–P7, idempotent retry, adoption, counter, marks, clash, replacement, memory from storage, own-write mark; add-flow and scan callers.
4. `fix(shared): removing and editing a wallet decide on the list write`.
5. `fix: setup and Add wallet screens follow the save's result` — both password twins, both panels, `App.tsx`, `PhraseBackupContext`, mocks.
6. `docs: write order for wallet changes in ARCHITECTURE.md`.

## Owner questions

1. **Deep-link recover with wallets stored** (spec Q5). Default: a separate ticket for the existing defect (old password kept while the screen and biometric enrolment use the new one); this plan only adds the duplicate refusal there.
2. **Counter one behind after a stop between the list and the counter write.** Default: accept `max(counter, list length)`; after removals a default name can repeat once.
3. **Duplicate message placement** on the setup password screen and the Add wallet error sheet. Default: yes, existing copy.

## Known limitations (for the owner)

- A removal whose vault write fails after the list: the wallet is gone and the error is shown; its entry stays in the vault unlisted.
- A vault beside an empty list with no note (pre-046 failed first save, failed "Remove all", interrupted migration) stays at today's lock screen; "Forgot password" is the way out. After a failed "Remove all", a setup in the same session is refused and counts one failed unlock.
- A Seed Vault replacement stopped between the list and the last vault write leaves the replaced wallet's entry (no secret in it) unlisted in the vault.
- A save that reported failure but landed, then left (not retried on the same screen), is refused as a duplicate on the next attempt, with the wallet already there.
- After a removal, a stop between the list and the counter write can repeat a default name once.

## Project Structure

### Documentation (this feature)

```text
specs/046-atomic-wallet-save/
├── plan.md              # this file
├── spec.md              # revised after the adversarial review, 2026-11-26
├── research.md          # R1–R13
├── data-model.md        # records, the note, what decides, what the loader tolerates
├── quickstart.md        # checks, red-first list, e2e, hand test, sign-offs
├── contracts/
│   └── accounts-mutations.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared/src/
├── storage/types.ts                      # FIRST_SAVE
├── test-utils/crash-storage.ts           # NEW
├── hooks/useAccountsMutationHelpers.ts   # note, discard, clash, prune, error, own-write mark
├── hooks/useAccountsMutations.ts         # write orders, memory from storage
├── hooks/useAccountsSecurity.ts          # launch turn
├── hooks/useAccountAddFlow.ts            # nameFor, no memory Seed Vault lookup
├── hooks/useDerivedAccountsScan.ts       # nameFromCounter
└── contexts/PhraseBackupContext.tsx      # no markUnconfirmed; re-read; lock

packages/ui/src/components/{AuthFlow/PasswordPage.tsx, AccountAddPanel/AccountAddPanel.tsx}
apps/mobile/{app/(auth)/password.tsx, src/components/AccountAddPanel/AccountAddPanel.tsx}
apps/extension/src/entrypoints/popup/App.tsx
```

**Structure Decision**: every decision (which write decides, when a vault is discarded, what counts as the same secret, the counter, which marks stand) is one implementation in `packages/shared/src/hooks`, under the vault write lock. The screens pass options, keep the built account, and map `DuplicateAccountError` to the existing message.

## Complexity Tracking

| Violation                                       | Why Needed                                                                                  | Simpler Alternative Rejected Because                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| One new storage key (`FIRST_SAVE`)              | FR-006a: a discard decided on storage shape can delete an interrupted migration's only copy | Shape-based discard (rejected by the review); a flag inside an existing record (changes that record's format) |
| Phrase derivation inside the write lock         | FR-011: the address clash is decided against storage, which stores no addresses             | Memory addresses miss another window's wallet and a locked window                                             |
| Two encrypted vaults per Seed Vault replacement | no row may leave a listed id without its entry, so the replaced entry leaves after the list | One vault write before the list (leaves the replaced, still listed wallet without its entry)                  |
