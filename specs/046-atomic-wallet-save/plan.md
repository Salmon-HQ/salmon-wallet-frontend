# Implementation Plan: Saving a wallet is all-or-nothing, and one secret is one wallet

**Branch**: `fix/046-atomic-wallet-save` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/046-atomic-wallet-save/spec.md`, with owner question 1 answered on 2026-11-26 (a vault with an empty wallet list is discarded, FR-006 / FR-006a) and questions 2 to 5 standing on their recommended defaults.

## Summary

Every change to the stored wallets gets one deciding write, and it is always the same record: the wallet list (`STORAGE_KEYS.ACCOUNTS`), because the loader builds only the wallets that list names. Saving writes the vault before the list, removing writes the list before the vault (as today), editing writes only the list; the open window's state changes only after the list write lands. What a stop after the list leaves (a stale active selection, a counter one behind, an unlisted secret) is already tolerated by the loader and the selection healing, or is repaired by the next save. One new helper decides FR-006 / FR-006a inside the vault write lock, at launch and at a first save, so a leftover vault never locks a user out. The duplicate check, the Seed Vault replacement, the adoption of an unlisted copy of the same secret, the name counter and the backup-pending mark all move inside `addAccount`'s lock and read storage, not the window's memory. No stored-format change, no migration, no new copy, nothing under `packages/shared/src/storage` or `crypto`.

## Technical Context

**Language/Version**: TypeScript 5 strict, React 19; React Native / Expo (`apps/mobile`), DOM via WXT MV3 (`apps/extension`) over `@salmon/ui`.

**Primary Dependencies**: none new. `lodash-es` (already used by `useAccounts.ts`) for `isEqual` if the secret comparison needs it.

**Storage**: unchanged keys and shapes. Writes stay single-key `setStorageItem` / `removeStorageItem` calls (`storage/storage.ts:532-566`); no batch is introduced, so iOS AsyncStorage 2.2.0's non-atomic `multiSet` is never on the path (research R1).

**Testing**: Vitest (`packages/shared`, `packages/ui`), Jest (`apps/mobile`). A new test double, `packages/shared/src/test-utils/crash-storage.ts`, plugs into the real `initStorage({ adapter })` and can fail the Nth write or hand back storage as it stood after any write (research R12). E2E: existing Playwright and Maestro setup flows stay green (FR-024); no fault injection on device (research R12).

**Target Platform**: iOS/Android (JS-only, OTA-able) and the extension side panel and popup.

**Project Type**: pnpm + turbo monorepo, two apps on two shared packages.

**Performance Goals**: saving a mnemonic wallet adds no derivation. Importing a private key, a watched address or a Seed Vault account re-derives the Solana addresses of the listed phrase wallets once, inside the lock, about the cost of one unlock restricted to Solana (research R4). Launch adds one Web Lock turn and up to three reads.

**Constraints**: constitution III (vault and storage writes, auth flows): human sign-off and an adversarial review before merge. Single-record atomicity only (FR-003). Twins on one contract (`scripts/check-dom-parity.mjs`). No new user-facing text (FR-022).

**Scale/Scope**: 2 mutation hooks rewritten in their write order (`useAccountsMutations.ts`), 1 helper module extended (`useAccountsMutationHelpers.ts`: discard, duplicate check, error class, marks), 1 init call (`useAccountsSecurity.ts`), 1 context changed (`PhraseBackupContext.tsx`), 3 add paths updated (`useAccountAddFlow.ts`, `useDerivedAccountsScan.ts`, the two password screens), 2 add panels simplified, 1 test double, 5 test files new or extended, 13 mobile test mocks touched only if typecheck requires.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status        | How                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Ownership boundaries             | PASS          | Write order, discard rule, duplicate rule, counter, marks: `packages/shared/src/hooks`. Screens only map the result: `packages/ui` (PasswordPage, AccountAddPanel) and `apps/mobile` (password route, AccountAddPanel).                                                                                                                                                                                                           |
| II. Consumers named                 | PASS          | §Consumers, from a grep of every changed export. One breaking change inside the repo: `addAccount`'s third parameter `replaces` becomes an options object; its only caller is `useAccountAddFlow.ts:476`.                                                                                                                                                                                                                         |
| III. Wallet safety (NON-NEGOTIABLE) | PASS, flagged | Vault and list writes change order; a leftover vault is deleted at launch under FR-006 (owner-approved). `storage/` and `crypto/` files are not edited. No secret is logged or put in an error message; `DuplicateAccountError` carries no secret. Flagged for human sign-off: `useAccountsMutations.ts`, `useAccountsMutationHelpers.ts`, `useAccountsSecurity.ts`, both password screens. §Risks lists each guard and its test. |
| IV. Bilingual strings               | PASS          | No new key. The duplicate refusal reuses `wallet.import.errors.duplicate` ("This wallet is already in your list." / "Esta billetera ya está en tu lista."), already in both files (`locales/en/translation.json:601`, `es` same line). It appears on two more surfaces (setup password error line, Add wallet error sheet); listed for the owner in §Copy.                                                                        |
| V. Functional coverage first        | PASS          | Every requirement is a shared Vitest test written red first against the crash-storage double (§Test plan). Screen tests for the two password twins; no new E2E.                                                                                                                                                                                                                                                                   |
| VI. Ask rather than guess           | PASS          | Owner Q1 answered; Q2–Q5 on their defaults. Three plan questions below (§Owner questions), each with a default the plan already follows.                                                                                                                                                                                                                                                                                          |
| Platform constraints                | PASS          | No `app.json`, plugin or permission change; JS-only (OTA on mobile).                                                                                                                                                                                                                                                                                                                                                              |
| Design tokens                       | PASS          | No visual change.                                                                                                                                                                                                                                                                                                                                                                                                                 |

_Twin components_: two existing pairs change (setup password screen; Add wallet panel), no new pair. Measured on this branch before any change: **cross-platform clones 2248 lines, ceiling 2265; same-side clones 870, ceiling 870** (`cloneLines` from `scripts/check-dom-parity.mjs`; `pnpm check:parity:report` → "106 twin pairs, 0 findings"). The design removes lines from both pairs (the default-name `useMemo` and `markUnconfirmed` leave the twins) and adds one `instanceof DuplicateAccountError` branch per twin. Expected change ≤ 0; neither ceiling moves.

Post-design re-check: unchanged. The one behaviour that deletes key material (FR-006) is a single function with five tests, three of them for the exclusions.

## Architecture decisions

| Piece                                  | Lives in                                                                                                     | Reuses                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Deciding write for add, remove, edit   | `writeStoredAccounts` (`useAccountsMutationHelpers.ts:86`)                                                   | The list the loader already treats as the source of truth (`useAccountsLoader.ts:85-94`)                                               |
| Vault left with an empty list (FR-006) | `discardVaultWithoutWallets()` in `useAccountsMutationHelpers.ts`; called by `initAccounts` and `addAccount` | `clearAccountsStorage`, `isEncryptedMnemonics`, `withVaultWriteLock` (research R3)                                                     |
| Duplicate and Seed Vault replacement   | `findStoredClash()` in `useAccountsMutationHelpers.ts`; `DuplicateAccountError`                              | `restoreAccount` (injected, as `useAccountsSecurity` already receives it), `collectSolanaAddresses`, `normalizeMnemonic` (research R4) |
| Adoption of an unlisted copy           | inside `addAccount`, when building the new vault                                                             | `toStoredSecret` (research R5)                                                                                                         |
| Name counter                           | `addAccount` reads `COUNTER`; `nameFromCounter` option                                                       | `generateAccountName`, `settings.account_add.default_name` (research R6)                                                               |
| Backup-pending mark                    | `addAccount` option `unconfirmed`; prune at launch                                                           | `UNCONFIRMED_PHRASES`, `walletOf` rule (research R7)                                                                                   |
| Stale selection after a stop           | none new                                                                                                     | loader fallback (`useAccountsLoader.ts:122-125`), slot healing (`useAccountsSelection.ts:87-98`)                                       |
| Mobile "was it saved"                  | `password.tsx`: the phrase owed back lives in one ref, cleared when `addAccount` resolves                    | `addAccount`'s own resolution (research R8)                                                                                            |

What is deliberately not built: a multi-key batch or a transaction log (no platform makes it atomic, R1); a generation number or any new stored field (format frozen); a lock-reentrant wrapper (one helper takes no lock, its callers hold it, R11); an E2E fault-injection hook in app builds (R12); in-session discard when the last listed wallet is removed while unlisted secrets remain (the next first save and the next launch already discard it, R3).

## The write orders

Notation: A and B are listed, A is active. "Kill after N" is the process dying right after write N has landed. "Fail at N" is write N throwing (nothing of it lands). The open window's state changes only on the row marked **memory**.

### Add wallet C (`addAccount`)

All of it runs inside `withVaultWriteLock`. Reads first: list, vault (cached key or password, `readStoredSecrets`), `COUNTER`, `UNCONFIRMED_PHRASES`, `WALLETS`. Then, still before any write: the duplicate check (refuse → `DuplicateAccountError`, nothing written), the Seed Vault target to replace, the new vault, the new list, the encryption.

| Step | Key                                                                                                                                                                  | Value written                                                                             | Kill right after leaves                            | Next launch shows                                                                                            |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 0    | first save only (list empty, no exclusion): stash `DERIVED_KEY` removed; if a vault exists, `clearAccountsStorage()` (12 removals) and `UNCONFIRMED_PHRASES` removed | —                                                                                         | a leftover vault gone, or part of it               | welcome screen, as it would have anyway (FR-006 discards the same leftover at launch)                        |
| 1    | `UNCONFIRMED_PHRASES` (only with `unconfirmed`)                                                                                                                      | stored marks pruned against the new list, plus C's id                                     | a mark naming C, which is not listed               | A, B as before; the mark has no effect (only the active listed wallet reads it) and is pruned at launch      |
| 2    | `MNEMONICS`                                                                                                                                                          | stored secrets + C − unlisted copies of C's exact secret − the replaced Seed Vault wallet | C's secret in the vault, unlisted                  | A, B, A active, same network, slot, counter and password. First save: list empty → vault discarded → welcome |
| 3    | `ACCOUNTS` — **deciding**                                                                                                                                            | stored list − replaced + C                                                                | C listed; counter and selection still the old ones | A, B, C, with A active on its own network and slot; counter one behind (repaired by the next save, see R6)   |
| —    | **memory**                                                                                                                                                           | accounts, counter, active id C, C's network and slot, lock requirement                    | —                                                  | —                                                                                                            |
| 4    | `COUNTER`                                                                                                                                                            | `max(stored counter, stored list length before the add) + 1`                              | selection still A's                                | as step 3, counter right                                                                                     |
| 5    | `ACCOUNT_ID`                                                                                                                                                         | C                                                                                         | C active, network and slot still A's               | C active; the selection hook heals the pair to the nearest one C holds (`useAccountsSelection.ts:87-98`)     |
| 6    | `NETWORK_ID`                                                                                                                                                         | C's network                                                                               | slot still A's                                     | C on its network; the slot is healed if C does not hold it                                                   |
| 7    | `PATH_INDEX`                                                                                                                                                         | C's slot                                                                                  | —                                                  | A, B, C, C active: the after-state                                                                           |

Fail at 0 to 3: `addAccount` rejects, memory is untouched, and a mark written at step 1 is taken back (best effort; the launch prune covers a failed take-back). Fail at 4 to 7: logged, `addAccount` resolves (FR-008). A Seed Vault replacement rides the same steps (the replaced wallet leaves the list at step 3 and the vault at step 2) and releases no access, as today.

### Remove wallet B (`removeAccount`)

Inside the lock: read list and secrets, build both without B, encrypt. If the list and the vault would both end empty, `clearAll` runs instead (unchanged: memory first, then `clearAccountsStorage`).

| Step | Key                                                             | Value written                                                    | Kill right after leaves                                      | Next launch shows                                                                                                       |
| ---- | --------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| 1    | `ACCOUNTS` — **deciding**                                       | stored list − B                                                  | B unlisted, its secret still in the vault, selection still B | A only; a dangling active id falls back to the first listed wallet (`useAccountsLoader.ts:122-125`), the slot is healed |
| —    | **memory**                                                      | accounts, and the active wallet if B was active                  | —                                                            | —                                                                                                                       |
| 2    | `MNEMONICS`                                                     | stored secrets − B                                               | selection still B (if B was active)                          | as step 1, B's secret gone                                                                                              |
| 3–5  | `ACCOUNT_ID`, `NETWORK_ID`, `PATH_INDEX` (only if B was active) | the first wallet of the new list this window holds, and its slot | partial selection                                            | a listed active wallet on a pair it holds (fallback plus healing)                                                       |

Then the Seed Vault release, judged on the stored vault (unchanged). Fail at 1: rejects, memory untouched, B still listed. Fail at 2 to 5: logged, resolves; B is removed, and a failed vault write leaves B's secret unlisted (kept, never shown).

Removing the last listed wallet while the vault still holds unlisted secrets writes an empty list and that vault (unchanged); the next launch or the next first save discards it (FR-006). `clearAll` stopped part-way: after the `COUNTER` removal only, the list stands and the counter reads 0 (the next save's `max` rule restores the number); after the `ACCOUNTS` removal, the list is empty and the next launch finishes the job.

### Edit wallet (`editAccount`)

| Step | Key                       | Value written                                 | Kill right after leaves | Next launch shows             |
| ---- | ------------------------- | --------------------------------------------- | ----------------------- | ----------------------------- |
| 1    | `ACCOUNTS` — **deciding** | stored list with this wallet's entry replaced | the after-state         | the new name, avatar or slots |
| —    | **memory**                | the edited account                            | —                       | —                             |

Fail at 1: rejects, memory keeps the old name.

### Launch (`initAccounts`, before `runUpgrades`)

One lock turn: `discardVaultWithoutWallets()` (decision below), then, when the list is not empty, the marks pruned.

| Step | Key                                                            | Kill right after leaves | Next launch shows                  |
| ---- | -------------------------------------------------------------- | ----------------------- | ---------------------------------- |
| 1–12 | discard only: `clearAccountsStorage()` removals in their order | part of the leftover    | the discard runs again; welcome    |
| 13   | discard only: `UNCONFIRMED_PHRASES` removed                    | —                       | welcome                            |
| 1    | prune only: `UNCONFIRMED_PHRASES` without stale marks          | —                       | the same wallets; stale marks gone |

## FR-006 / FR-006a: when a vault is discarded

`discardVaultWithoutWallets()` in `useAccountsMutationHelpers.ts`, called with the lock held. It takes no lock itself (Web Locks are not reentrant, R11): `initAccounts` (`useAccountsSecurity.ts:286`) wraps it in `withVaultWriteLock`, and `addAccount` calls it from inside its own turn.

1. Read `ACCOUNTS`. A read that throws propagates: launch shows the existing init-failed gate (`App.tsx:503`, mobile `_layout.tsx:190`). Only `null` or `[]` is empty; any other value (a list, or a corrupt string) keeps everything. _Exclusion: unreadable list._
2. Read `WALLETS` (the v2 record). Present → keep. _Exclusion: pending legacy migration._ The legacy signals in the code: `STORAGE_KEYS.WALLETS` with `ACTIVE` and `ENDPOINTS` (`storage/types.ts:245-249`); `migrateLegacyWallets` stops at "no-migration" once a vault exists beside the record (`legacy-migration.ts:182-188`); its own write order is vault, then list, then the record removed last (`legacy-migration.ts:357-371`), so an interrupted migration looks exactly like "vault, empty list, record present" and must not lose its vault.
3. Read `MNEMONICS`. An object that is not encrypted (`isEncryptedMnemonics` false, `useAccountsSecurityHelpers.ts:28-48`) → keep. _Exclusion: cleartext vault of a password-less v2 wallet_, its owner's only copy, opened through "protect wallet" (`useAccountsSecurityHelpers.ts:167-176`).
4. Otherwise: remove the stash `DERIVED_KEY`; if `MNEMONICS` is present (encrypted, or a corrupt non-object), run `clearAccountsStorage()` and remove `UNCONFIRMED_PHRASES`.

Inside the lock, a save in another window either has not started (its list write is still ahead) or has finished (its list is not empty): it is never discarded mid-way.

Why also at a first save: `encryptMnemonics` caches the key derived from the password before the vault is written (`crypto/encrypt-mnemonics.ts:80-83`) and reuses any cached key on the next call (`:76-79`). A first save that fails, followed by a retry with a different password, writes the vault under the first password while the user believes the second: a lockout inside one session. Running the same rule at a first save drops that key and any leftover vault, so "setting up again with any password succeeds" (US1 scenario 3) holds without a relaunch.

## One secret, one wallet

Decided in `findStoredClash(account, storedList, storedSecrets)`, inside `addAccount`'s lock, after the vault is opened. Storage only; the window's memory is never consulted, so a locked window or a stale second window decides the same way.

| New secret kind                                                       | Duplicate of a listed wallet when                                                                                                                                                                                                                                                                                  | Result           |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| Recovery phrase (setup, imported, derived, "Check derivables" import) | the listed wallet's stored secret is the same phrase after `normalizeMnemonic`, and the new wallet's starting position (`startIndex`) is an index that wallet holds on any network (`pathIndexes` values). A derived wallet at another position is legitimate; `derivedFrom` is display metadata and plays no part | refuse           |
| Any kind, address level                                               | an address the new wallet holds is an address a listed wallet holds (below)                                                                                                                                                                                                                                        | refuse           |
| Private key                                                           | (covered by the address rule: the same key gives the same address)                                                                                                                                                                                                                                                 | refuse           |
| Watched address                                                       | (covered by the address rule)                                                                                                                                                                                                                                                                                      | refuse           |
| Seed Vault                                                            | a listed **Seed Vault** wallet has the same address                                                                                                                                                                                                                                                                | replace (FR-013) |
| Seed Vault                                                            | any other listed wallet holds its address                                                                                                                                                                                                                                                                          | refuse           |

Where the address-level clash (FR-012) is computed, given that the list stores no addresses: the new wallet's addresses come from its own `networksAccounts` (built by the factory before `addAccount`). The listed wallets' addresses are rebuilt from storage with `restoreAccount` (`useAccounts.ts:173`, injected into the mutations the way `useAccountsSecurity` already receives it) and read with `collectSolanaAddresses` (`utils/account.ts:277`), the helper today's memory checks use:

- new wallet with one address (private key, watched, Seed Vault): every listed wallet is rebuilt on its Solana networks only (a phrase wallet at every index its `pathIndexes` name, a single-address wallet from its secret). This is the only path that derives phrases, and it is a user-started import.
- new phrase wallet: only the listed single-address wallets are rebuilt (no derivation, their address is in the secret or one key away). Two different phrases cannot share an address; the same phrase is the phrase rule above.

`clearSeedCache()` runs after, as the loader does (`useAccountsLoader.ts:100`). The existing memory checks (`useImportPrivateKey.ts:87`, `useImportWatchOnly.ts:71`, `seedVaultRows`) stay as an early hint (FR-012).

## Mobile password screen

- **Saved or not (FR-020)**: `addAccount` resolves exactly when the deciding write has landed, even if a later write failed (FR-008), and rejects otherwise. `walletAddedRef` (`password.tsx:140-149`) goes. The phrase owed back to the previous screen is held in one ref, set when the phrase is taken from the stash and cleared on the line after `await actions.addAccount(...)`; the unmount cleanup puts back whatever that ref still holds. There is no boolean beside the result to drift from it, and the phrase leaves the screen's memory as soon as the wallet holds it.
- **Phrase stash (FR-021)**: unchanged medium (the in-memory stash, `STASH_KEYS.PENDING_MNEMONIC`). Put back only when the ref still holds it, which is only when no wallet was saved.
- **After a save (FR-015)**: nothing after `addAccount` throws on either twin today (`unlockAccounts` answers `false`, `trackOnboardingEvent` is fire-and-forget), so a saved wallet always continues to the next screen. The fix is in `addAccount`'s failure semantics; no new screen state.
- **Name and mark**: both screens pass `nameFromCounter` and, on create (not Seed Vault), `unconfirmed: true`; `markUnconfirmed` (`password.tsx:321`, `PasswordPage.tsx:191`) goes.

## Owner question 5: recover with wallets stored

Reachable only by a deep link while unlocked; reasoned from code, not run on a device.

- In-app navigation enters `(auth)` only after "Remove all wallets": `(app)/_layout.tsx:129`, `(app)/settings/index.tsx:200`.
- The root guard redirects out of `(auth)` only when locked or before the first navigation (`app/_layout.tsx:251-257`); `password`, `biometric-setup`, `analytics-consent`, `success` are exempt even then (`:243-246`). The app declares the `salmonwallet` scheme (`app.json:9`) and has no `+native-intent` filter, so `salmonwallet://recover` opens the recover route on an unlocked wallet.
- What it does today: the password screen asks for a new password in recover (`password.tsx:169-179`), but `addAccount` re-encrypts with the cached key, which an unlocked session always holds (`encrypt-mnemonics.ts:76-79`), so **the vault keeps the old password**. `unlockAccounts(newPassword)` then fails and counts a failed unlock (`password.tsx:329`), and the new password is handed to biometric enrolment (`password.tsx:352`).
- Under this plan: a phrase already listed is refused before any write; a new phrase is saved under the old password, as today. FR-005 holds by construction. The wrong-password follow-up is an existing defect outside this spec (§Owner questions, 1).

## Copy

No new string. `wallet.import.errors.duplicate` ("This wallet is already in your list." / "Esta billetera ya está en tu lista.") is shown, unchanged, on two more surfaces: the setup password screen's error line (both twins) and the Add wallet error sheet (both twins, title `general.error`, as every other failure there). Listed here so the owner sees the new placements (FR-022).

## Consumers of what changes in `packages/shared`

Files outside tests, from `grep -rn` over `apps` and `packages` on this branch.

| Export (change)                                                             | Consumers                                                                                                                                                                            |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `addAccount(account, password?, options?)` (third parameter was `replaces`) | `useAccountAddFlow.ts:476` (passed `replaces`), `useDerivedAccountsScan.ts:343`, `PasswordPage.tsx:192`, mobile `password.tsx:322`. `UseAccountsActions` type (`useAccounts.ts:119`) |
| `addAccount` / `removeAccount` resolve after the deciding write             | `useAccountRemoval.ts:52` (no change: it awaits and moves on)                                                                                                                        |
| New: `DuplicateAccountError` (hooks barrel)                                 | `PasswordPage.tsx`, mobile `password.tsx`, both `AccountAddPanel.tsx` twins                                                                                                          |
| `PhraseBackupValue` (− `markUnconfirmed`)                                   | `PasswordPage.tsx:79`, mobile `password.tsx:119`; mocks in 13 mobile test files (`grep -rn markUnconfirmed apps/mobile`), edited only where typecheck requires                       |
| `UseAccountAddFlowOptions.defaultName: string` → `nameFor(counter): string` | both `AccountAddPanel.tsx` twins (ui `:88-91`, mobile `:105`), `useAccountAddFlow.test.tsx`                                                                                          |
| `useAccountsMutations` params (+ `restoreAccount`)                          | `useAccounts.ts:439`, `useAccountsMutations.test.tsx`                                                                                                                                |
| `initAccounts` (runs the discard first)                                     | `useAccounts.ts:397`, `retryInit` (`useAccounts.ts:504`)                                                                                                                             |

## Files to create or modify

| Package / app     | File                                                                                                                                                                                                                              | Change                                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared` | `src/test-utils/crash-storage.ts` (new)                                                                                                                                                                                           | the failure-injection double (R12)                                                                                                                                   |
|                   | `src/hooks/useAccountsMutationHelpers.ts`                                                                                                                                                                                         | `discardVaultWithoutWallets`, `findStoredClash`, `DuplicateAccountError`, `pruneUnconfirmed`; `writeStoredAccounts` forgets its own-write mark when the write throws |
|                   | `src/hooks/useAccountsMutations.ts`                                                                                                                                                                                               | the write orders above; `AddAccountOptions`; memory after the deciding write; post-decision errors logged                                                            |
|                   | `src/hooks/useAccountsSecurity.ts`                                                                                                                                                                                                | `initAccounts` runs the discard and the prune in one lock turn                                                                                                       |
|                   | `src/hooks/useAccounts.ts`                                                                                                                                                                                                        | pass `restoreAccount` to the mutations; `UseAccountsActions.addAccount` type                                                                                         |
|                   | `src/hooks/useAccountAddFlow.ts`                                                                                                                                                                                                  | no `stale` lookup; `nameFor`; post-save steps outside the failure path                                                                                               |
|                   | `src/hooks/useDerivedAccountsScan.ts`                                                                                                                                                                                             | `nameFromCounter` instead of `accounts.length + 1`                                                                                                                   |
|                   | `src/contexts/PhraseBackupContext.tsx`                                                                                                                                                                                            | `markUnconfirmed` removed; re-read on a change of listed ids; `update` under the lock                                                                                |
|                   | `src/hooks/index.ts`                                                                                                                                                                                                              | export `DuplicateAccountError`                                                                                                                                       |
|                   | tests: `useAccountsAtomic.test.tsx` (new), `useAccountsMutations.test.tsx`, `useAccounts.test.ts`, `useAccountAddFlow.test.tsx`, `useAccountsSecurity.test.ts`, `PhraseBackupContext.test.tsx`, `useDerivedAccountsScan.test.tsx` | §Test plan                                                                                                                                                           |
| `packages/ui`     | `src/components/AuthFlow/PasswordPage.tsx` (+ test)                                                                                                                                                                               | options, duplicate message, no `markUnconfirmed`                                                                                                                     |
|                   | `src/components/AccountAddPanel/AccountAddPanel.tsx`                                                                                                                                                                              | `nameFor`, duplicate message                                                                                                                                         |
| `apps/mobile`     | `app/(auth)/password.tsx` (+ `__tests__/app/password.test.tsx`)                                                                                                                                                                   | phrase ref, options, duplicate message                                                                                                                               |
|                   | `src/components/AccountAddPanel/AccountAddPanel.tsx`                                                                                                                                                                              | `nameFor`, duplicate message                                                                                                                                         |
| docs              | `docs/ARCHITECTURE.md:42` (Spanish)                                                                                                                                                                                               | one sentence: which write decides each wallet change, and the empty-list discard                                                                                     |
|                   | `CLAUDE.md`                                                                                                                                                                                                                       | SPECKIT pointer to this plan (left to the reviewer: outside the spec folder)                                                                                         |

## Test plan (test-first)

Every item is written first and seen red on this branch, then made green.

**The double** (`test-utils/crash-storage.ts`, research R12): an in-memory `StorageAdapter` for `initStorage({ platform: 'mobile', adapter })`. It counts every `setItem` and `removeItem` as one write; `failAt(n)` makes write n throw a `StorageError` without applying it; `snapshots[k]` is a copy of the map after write k (`snapshots[0]` before the first). `relaunch(k)` re-inits storage from `snapshots[k]`, clears the stash (a process death loses it) and mounts a fresh `useAccounts`. Encryption uses the see-through cipher `useAccountsMutations.test.tsx:52-77` already uses; blockchain modules are mocked as in `useAccounts.test.ts:72-125`.

**New file `hooks/useAccountsAtomic.test.tsx`**, one `describe` per mutation, `it.each` over positions:

| Mutation                          | Fail at               | Kill after | Asserts after each                                                                                                                                                                                     |
| --------------------------------- | --------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| First save, fresh device, create  | 1–7                   | 0–7        | fail ≤ 3: memory unchanged, relaunch → welcome (not locked), a retry with **another** password saves and unlocks with it; fail > 3: resolves, saved. Kill < 3 → welcome; kill ≥ 3 → one wallet, marked |
| First save over a leftover vault  | 1–20 (13 discard + 7) | 0–20       | as above; the leftover is gone                                                                                                                                                                         |
| Add C with A, B listed            | 1–6                   | 0–6        | before-state or after-state exactly (list, active, network, slot, counter, password); every listed wallet has its secret                                                                               |
| Add C, retry after each failure   | 1–3                   | 0–2        | one wallet holds C's phrase at that position; the vault holds C's secret once; other unlisted secrets unchanged                                                                                        |
| Seed Vault replace (storage only) | 1–6                   | 0–6        | one wallet for the address, never two                                                                                                                                                                  |
| Remove B (non-active)             | 1–2                   | 0–2        | before or after; no listed wallet without its secret                                                                                                                                                   |
| Remove B (active)                 | 1–5                   | 0–5        | after relaunch the active wallet is listed and on a pair it holds                                                                                                                                      |
| Remove all (`clearAll`)           | 1–12                  | 0–12       | memory cleared before the first removal; a kill at any point → relaunch shows the wallets intact or the welcome screen                                                                                 |
| Edit                              | 1                     | 0–1        | old or new name, memory and relaunch agree                                                                                                                                                             |
| Launch discard                    | 1–13                  | 0–13       | relaunch → welcome                                                                                                                                                                                     |

Plus, in the same file: the exclusions (list read throws → init error, nothing removed; list is a corrupt string → nothing removed; `WALLETS` present → vault kept; cleartext vault → vault kept and protect mode shown); a non-reentrant fake `navigator.locks` (a second `request` while one is held waits) proves the first-save discard does not deadlock; two windows (one stale) adding the same phrase → one wallet, `DuplicateAccountError` in the second; a locked window (metadata placeholders) refused the same way; counter: kill between steps 3 and 4 with no removal in history → the next default name is not repeated.

**Duplicate rule** (`useAccountsMutations.test.tsx`, new `describe`): phrase at the same start refused; same phrase at another start accepted; same phrase at a start the listed wallet holds inside (a slot from "Check derivables") refused; phrase with different spacing or case refused; private key whose address a listed phrase wallet derives refused; watched address of a listed private-key wallet refused; Seed Vault same address replaced, other kind holding it refused; nothing written on refusal.

**Marks** (`PhraseBackupContext.test.tsx`, `useAccountsAtomic.test.tsx`): a saved `unconfirmed` wallet is marked even when killed right after step 3; a failed save leaves no mark after relaunch; three retries → one mark; a mark named by a listed wallet's `derivedFrom` survives the prune; a mark written by another window's save while this one prunes survives (lock); the provider shows `needsBackup` after `addAccount` without a remount.

**Screens**: `__tests__/app/password.test.tsx` — addAccount rejects → leaving puts the phrase back (existing test kept); addAccount resolves → leaving puts nothing back, a second submit does not call addAccount; `DuplicateAccountError` → the duplicate message. `PasswordPage.test.tsx` — the duplicate message; options passed. `useAccountAddFlow.test.tsx` — duplicate → `onFailure` receives `DuplicateAccountError`; `nameFor` used.

**Existing tests that change, and why**:

| Test                                                                                                                | Why                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useAccounts.test.ts` "should detect encrypted mnemonics and set locked state"                                      | a vault with no list is now discarded (FR-006); the test stores a list to keep testing the lock                                                      |
| `useAccounts.test.ts` "replaces a wallet in one write instead of keeping both"                                      | `replaces` is gone; rewritten as a Seed Vault wallet replaced by address from storage                                                                |
| `useAccounts.test.ts` "never leaves a listed wallet without its secret when removeAccount stops between its writes" | the vault write now follows the deciding list write: it resolves instead of rejecting; the invariant asserted stays                                  |
| `useAccounts.test.ts` "aborts addAccount when encryptMnemonics throws…"                                             | unchanged in intent; asserts the memory setters were not called (they now run after step 3)                                                          |
| `useAccountsMutations.test.tsx` "writes the list before the vault"                                                  | unchanged for removal; a twin test pins the vault before the list for a save                                                                         |
| `useAccountsMutations.test.tsx` `openWindow`                                                                        | passes the injected `restoreAccount`                                                                                                                 |
| `useAccountAddFlow.test.tsx` lines 247, 362, 377                                                                    | `addAccount` third argument is an options object; the "reconnects a revoked Seed Vault wallet" case moves to the mutations (decided against storage) |
| `PhraseBackupContext.test.tsx` "marks a new wallet without dropping one already waiting"                            | `markUnconfirmed` is gone; the case moves to `addAccount`'s mark                                                                                     |

## Risks specific to this change

| Risk                                                                                                                         | Guard                                                                                                     | Test                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| The discard deletes a real wallet's vault                                                                                    | runs only on `null` / `[]` list, never on a throw or another value; inside the lock                       | "list read throws", "corrupt list", two-window first save                            |
| The discard deletes a v2 user's only copy                                                                                    | `WALLETS` present → keep; cleartext vault → keep                                                          | the two exclusion tests; Playwright `legacy-migration.spec.ts` stays green           |
| A retry after a failed first save encrypts under the first attempt's password (lockout)                                      | first save drops `DERIVED_KEY` and any leftover vault                                                     | first save, fail at each step, retry with another password, relaunch, unlock with it |
| Adoption drops a secret that is not the one being saved                                                                      | only unlisted entries equal to the new secret are dropped                                                 | unlisted secret of another phrase survives every save                                |
| A legitimate derived wallet is refused                                                                                       | phrase rule is phrase + held index, not phrase alone                                                      | same phrase at another start accepted                                                |
| A duplicate slips past (stale or locked window)                                                                              | decided inside the lock from storage                                                                      | two windows; locked window                                                           |
| An unconfirmed wallet ends up unmarked                                                                                       | mark before the deciding write, inside the lock; prune keeps `derivedFrom` marks; `update` under the lock | kill after step 3; concurrent prune; derived child                                   |
| A listed wallet without its secret (every unlock fails)                                                                      | vault before list on save; list before vault on remove                                                    | every kill position, every listed id has a vault entry                               |
| The first-save discard deadlocks the lock                                                                                    | the helper takes no lock; only `initAccounts` wraps it                                                    | non-reentrant fake `navigator.locks`                                                 |
| The window shows a wallet storage does not hold                                                                              | memory after the deciding write                                                                           | fail at each step before 3: memory unchanged                                         |
| A failed list write leaves this window's own-write mark set, so another window's list with the same ids is taken for its own | `writeStoredAccounts` clears the mark on throw                                                            | `isOwnStoredAccountsWrite` after a failed write is `false`                           |
| "Remove all wallets" keeps decrypted keys in memory on a storage failure                                                     | `clearAll` unchanged (memory first)                                                                       | existing "forgets the wallets in memory before it touches storage"                   |

## Commit order

Each commit passes the pre-commit gates on its own (`check:dead-code` included).

1. `test(shared): storage double that fails or stops at any write` — the double and its own two tests.
2. `fix(shared): a vault with no wallets is discarded at launch` — discard, exclusions, prune at launch; tests red first; `useAccounts.test.ts` locked-state test updated.
3. `fix(shared): saving a wallet lands completely or not at all` — add write order, memory after, failure semantics, first-save discard, adoption, counter, marks inside the lock, `DuplicateAccountError`, duplicate and Seed Vault rule, `restoreAccount` injection; the add-flow and scan callers in the same commit (the signature changes).
4. `fix(shared): removing and editing a wallet decide on the list write`.
5. `fix: setup and Add wallet screens follow the save's result` — both password twins, both panels, `PhraseBackupContext`, mocks.
6. `docs: write order for wallet changes in ARCHITECTURE.md`.

## Owner questions

1. **Deep-link recover with wallets stored** (spec question 5). Default: out of scope here; a separate ticket for the existing defect (the vault keeps the old password while the screen and biometric enrolment use the new one). This plan only adds the duplicate refusal on that path.
2. **Counter one behind after a stop between the list and the counter write**. Default: accept the `max(stored counter, list length)` repair, which restores the number on any install that never removed a wallet; after removals, a stop in that one-write gap can repeat a default name once (names are user-editable).
3. **Duplicate message placement**: the existing "This wallet is already in your list." on the setup password screen and in the Add wallet error sheet under the title "Error". Default: yes, no new copy.

## Project Structure

### Documentation (this feature)

```text
specs/046-atomic-wallet-save/
├── plan.md              # this file
├── spec.md              # owner Q1 answered 2026-11-26
├── research.md          # R1–R13
├── data-model.md        # the stored records, what decides, what the loader tolerates
├── quickstart.md        # checks, red-first list, e2e, hand test, sign-offs
├── contracts/
│   └── accounts-mutations.md   # addAccount options and results, errors, discard, PhraseBackupValue, add-flow options
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared/src/
├── test-utils/crash-storage.ts           # NEW: fail at write N, snapshot after each write
├── hooks/useAccountsMutationHelpers.ts   # discard, clash, DuplicateAccountError, prune, own-write mark
├── hooks/useAccountsMutations.ts         # write orders, options, memory after the deciding write
├── hooks/useAccountsSecurity.ts          # initAccounts: discard + prune in one lock turn
├── hooks/useAccounts.ts                  # restoreAccount passed to the mutations
├── hooks/useAccountAddFlow.ts            # no memory lookup for Seed Vault; nameFor
├── hooks/useDerivedAccountsScan.ts       # nameFromCounter
└── contexts/PhraseBackupContext.tsx      # no markUnconfirmed; re-read on list change; lock

packages/ui/src/components/
├── AuthFlow/PasswordPage.tsx             # options, duplicate message
└── AccountAddPanel/AccountAddPanel.tsx   # nameFor, duplicate message

apps/mobile/
├── app/(auth)/password.tsx               # phrase ref instead of walletAddedRef
└── src/components/AccountAddPanel/AccountAddPanel.tsx
```

**Structure Decision**: every decision — which write decides, when a vault is discarded, what counts as the same secret, what the counter is, which marks stand — is one implementation in `packages/shared/src/hooks`, under the vault write lock. The four screens only pass options and map `DuplicateAccountError` to the existing message.

## Complexity Tracking

| Violation                                                         | Why Needed                                                                                                                                     | Simpler Alternative Rejected Because                                                         |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Key material deleted at launch and at a first save                | FR-006 (owner decision); without it a stopped first save locks the user out, and a same-session retry with another password locks them out too | Discarding only at launch leaves the in-session lockout (research R3)                        |
| Phrase derivation inside the write lock on single-address imports | FR-011: the address clash must be decided against storage, which stores no addresses                                                           | Memory addresses miss another window's wallet and a locked window (spec "What exists today") |
