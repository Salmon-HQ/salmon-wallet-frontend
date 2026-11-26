# Research: atomic wallet save (spec 046)

Every claim below was checked against the code on `fix/046-atomic-wallet-save` (base `main`). References are `path:line` under `packages/shared/src/` unless another root is named. Platform facts come from the spec's "What exists today" and the review's reading of `RNCAsyncStorage.mm`.

## R1. What the platforms make atomic

- **Decision**: single-key writes only (`storage/storage.ts:549-566`).
- **Rationale**: iOS AsyncStorage 2.2.0 `multiSet` writes one file per key with no rollback; Chromium batches a multi-key `set` without a documented promise. Mobile uses AsyncStorage (`apps/mobile/index.js:159-168`), the extension `chrome.storage.local` (`storage/storage.ts:149`).
- **Alternatives considered**: batches, a combined record (format change), a journal (second source of truth).

## R2. Which write decides

- **Decision**: the wallet list. Add: [note], [mark], vault, **list**, [note removed], counter, selection, [vault without the replaced wallet], [prune]. Remove: **list**, selection, vault. Edit: **list**.
- **Rationale**: the loader builds only listed wallets (`hooks/useAccountsLoader.ts:85-99`) and reads a missing entry as an empty phrase (`utils/account-secret.ts:28-31`), failing every unlock; so no write before the list may drop a listed id's entry. After the list, a dangling active id falls back (`useAccountsLoader.ts:122-125`) and a pair is healed (`hooks/useAccountsSelection.ts:87-98`); FR-001 allows the active wallet and counter to stay behind.
- **Today**: add sets memory (`useAccountsMutations.ts:145-151`), vault (`:153`, already without a replaced entry, `:131`), counter (`:158`), selection (`:162`), list (`:164`). Remove: memory (`:249`), selection (`:251-265`), list (`:272`), vault (`:273`). Edit: memory (`:218`), list (`:221`).
- **After the deciding write**: a save logs later failures and resolves (FR-008). A removal's failed vault write keeps today's behaviour: memory follows the list and the call rejects (`hooks/useAccountRemoval.ts:52-53`).

## R3. The first-save note, bound to its vault

- **Decision**: `STORAGE_KEYS.FIRST_SAVE` holds the `nonce` of the locked vault the first save writes. Written only when storage has no `MNEMONICS` key, no listed wallet and no `WALLETS`. Discard (stash key, unlock penalty, `clearAccountsStorage()` with the note last) only when: note present; list read succeeded and is absent or `[]`; the stored vault's `nonce` equals the note; this runtime has not recorded that nonce as landed. Any other note is stale and removed best effort.
- **Why bound**: `LockedVault.nonce` is a fresh random value per encryption (`crypto/encryption.ts:31-32`, `:324-332`), so it identifies one ciphertext. Every later vault write (add, remove, password change `useAccountsSecurityHelpers.ts:117-125`, outdated-vault upgrade `:92-96`, protect `useAccountsSecurity.ts:349`) replaces it, making a leftover note inert without anyone removing it. A hash would add code for no extra property.
- **Why a stale note must not block**: on iOS AsyncStorage 2.2.0 a failed file read drops the key from the in-memory manifest, so the next read in that process returns `null` (`RNCAsyncStorage.mm` ~590-607). A first save whose list landed but whose note removal failed could then read "note + list null". In the same runtime the landed-nonce record refuses the discard; after a later vault write the nonce differs. The residual case (no later vault write, then a relaunch where the list is gone) is a known limitation. Failing launch on a stale note would lock out a real wallet, so its removal is caught, logged and retried on every launch and save.
- **Why not storage shape**: an empty list beside an encrypted vault with no `WALLETS` is also an interrupted v2 migration after one unlock (`utils/legacy-migration.ts:134-151`, `:183-186`, `:357-371`), where the vault is the only copy.
- **Raw presence**: `getStorageItem` returns `null` only for an absent key and returns a raw string when parsing fails (`storage/storage.ts:339-348`); `getStoredMnemonics` maps a non-object to `null` (`hooks/useAccountsSecurityHelpers.ts:64-73`), so "no vault" uses `getStorageItem`. A list present but not an array refuses a save and counts neither as empty nor as listed.
- **Format**: no existing record changes; the key is new and absent on existing installs. `clearAccountsStorage` (`useAccountsMutationHelpers.ts:134-148`) removes it last.
- **Unchanged state**: vault + empty list + no note. Extension: lock screen (`apps/extension/src/entrypoints/popup/App.tsx:485-498`). Mobile: welcome (`apps/mobile/app/_layout.tsx:221-226`); create asks for the existing password (`password.tsx:179`, `requiredLock` from `useAccountsSecurityHelpers.ts:178`); recover always asks for a new password (`password.tsx:169`, `:179`), and every attempt fails on the stored vault and counts a failed unlock.

## R3a. The cached key on a first save

- **Decision**: after `settleFirstSave`, a first save removes the stash `DERIVED_KEY` before any read or encryption; a stash failure rejects.
- **Rationale**: `encryptMnemonics` caches the derived key before `addAccount` writes (`crypto/encrypt-mnemonics.ts:80-83`) and reuses a valid cached key (`:76-79`; five minutes sliding, `crypto/encryption.ts:71`, `:527-531`). The extension stash survives a window close.

## R3b. A supplied password is proven against the stored vault

- **Decision**: in `readStoredSecrets(password)`, when a vault exists and a password is supplied, open it with that password (`resolveMnemonicsWithPassword`, throttled, a wrong one counted, the derived key becoming the stash key), never with the cached key. Without a password, the cached key as today.
- **Rationale**: today the cached key wins (`useAccountsMutationHelpers.ts:63-64`, `encrypt-mnemonics.ts:76-79`): a save under another password succeeds with the vault still under the first, and mobile unlocks and enrols biometrics with the wrong one (`password.tsx:329`, `:352`). The proof runs before the already-saved step and before any write. Screens show `passwordCheckErrorKey(err, 'wallet.create.invalid_password')` (`utils/unlock-throttle.ts:45-47`, as `useSetupPasswordForm.ts:82`). The re-auth path already verifies the password (`useAccountAddFlow.ts:542`) and pays one more derivation.

## R4. One secret, one wallet

- **Decision**: `findStoredClash` inside the lock. Phrase: same `normalizeMnemonic` phrase and the new start is an index the listed wallet holds on any network (same phrase and index give the same addresses on every network). Addresses: Solana only, at `solana-*` positions only; a Seed Vault wallet with a listed Seed Vault wallet's address replaces it; any other clash throws `DuplicateAccountError`. Entries that cannot be derived are skipped.
- **Pure, no network**: `restoreAccount` (`hooks/useAccounts.ts:173`) goes through `createBlockchainAccountForNetwork`, which fetches the catalog (`hooks/useAvailableNetworks.ts:148-150`) and returns `null` for a disabled network (`utils/account.ts:184-195`). The pure Solana step underneath is `generateKeyPair(mnemonic, getSolanaDerivationPath(i))` (`blockchain/solana/factory.ts:63-88`), whose `signer.address` is the public key (`blockchain/solana/SolanaAccount.ts:32-33`); a private key's address is `createKeyPairSignerFromBytes(bs58.decode(key))` (`factory.ts:204-219`).
- **Skip, not throw**: a missing entry reads as an empty phrase (`utils/account-secret.ts:28-31`); a phrase failing `validateMnemonic` or an undecodable key would throw inside derivation. Skipping keeps a damaged entry from blocking every save.
- **Solana positions only**: a wallet's Bitcoin or Ethereum indexes do not hold a Solana address, so they never refuse a Solana key or address.
- **Today**: memory checks only (`useImportPrivateKey.ts:62,87`, `useImportWatchOnly.ts:52,71`, `useAccountAddFlow.ts:470-476`); a locked window holds placeholders (`useAccountsLoader.ts:48-55`); no phrase check.

## R5. Adoption

- **Decision**: drop an unlisted entry only when its stored secret `isEqual` the new one, no normalisation. The duplicate check alone normalises.
- **Rationale**: FR-016 allows only an exact copy. Every save re-encrypts every entry (`useAccountsMutations.ts:128-131`).

## R6. The counter

- **Decision**: base = `max(stored COUNTER ?? 0, stored list length)`; name = `nameFromCounter(base)`; `COUNTER` = base + 1 after the list. On the already-saved path, `COUNTER` = `max(stored counter, list length)` (the list already holds the wallet).
- **Before the increment**: `generateAccountName(counter)` writes `counter + 1` (`utils/account.ts:164-168`), so `nameFromCounter` receives base, and the name shows base + 1, the value then stored.
- **Today**: setup screens and the extension panel use the window's counter (`PasswordPage.tsx:179`, `password.tsx:284`, ui `AccountAddPanel.tsx:88-91`); the mobile panel and the scan use `accounts.length + 1` (mobile `AccountAddPanel.tsx:105-108`, `useDerivedAccountsScan.ts:337`); `addAccount` stores the window's `counter + 1` (`useAccountsMutations.ts:116`).
- **In memory**: the new wallet object carries the name computed under the lock.

## R7. Marks

- **Decision**: with `unconfirmed`, one write before the vault adds C to the stored marks (no prune). After the list, a separate best-effort prune (caught, never rejecting) keeps marks named by a listed `id` or `derivedFrom`; the launch turn runs the same prune. No take-back on failure. A list that is not an array means no prune.
- **Rationale**: a write that reports failure may have landed, and an unmarked saved wallet is the dangerous direction (FR-019). A derived wallet asks under its parent's id (`PhraseBackupContext.tsx:63-66`). Today's mark is written outside the lock (`PasswordPage.tsx:191`, `password.tsx:321`, `PhraseBackupContext.tsx:97-102`). The provider reads once on mount (`:75-89`) and re-reads before a send (`:111-125`); it gains a re-read on a change of listed ids.

## R8. Already saved: retries and new screens

- **Decision**: P5, after the vault is opened: (a) the list names C's id and its entry equals C's stored secret; or (b) this window's memory holds no wallet and a listed entry is exactly equal to C's at the same position. Either way C takes the stored id, name and avatar; rows 5–11 run (note removal, counter, selection, replaced Seed Vault entries with C's address, prune); memory is built from storage without the own-write mark; the call resolves.
- **Rationale**: both twins build a new account each submit today (`PasswordPage.tsx:178-187`, `password.tsx:282-315`). With the account built once per screen, (a) covers a retry on the same screen after a landed-but-failed list write. (b) covers a new screen instance (back and forward) after the same event: the user would otherwise be refused their own wallet with nothing in memory. A window holding wallets keeps the refusal (US3 scenario 4).
- **Phrase in React state**: mobile clears it right after the save resolves (`setMnemonic(null)`, after clearing the owed ref, so the effect cleanup at `password.tsx:141-149` puts nothing back); the extension keeps it in `authData` (`App.tsx:201`, `:543`) until consent (`:417`), and `handlePasswordSuccess` (`:370`) now clears it. Nothing after `addAccount` throws on either twin (`useAccountsSecurity.ts:248-253`; `trackOnboardingEvent` is `void`).

## R9. Owner question 5

- Reachable only by deep link while unlocked (`apps/mobile/app/(app)/_layout.tsx:126-130`, `(app)/settings/index.tsx:196-200`, `apps/mobile/app/_layout.tsx:243-257`, `apps/mobile/app.json:9`, no `+native-intent`); reasoned from code.
- Mobile recover always asks for a new password (`password.tsx:169`, `:179`). Today: with a valid cached key the vault keeps the old password, then `unlockAccounts(newPassword)` fails and counts (`password.tsx:329`, `useAccountsSecurity.ts:232-236`) and enrolment gets the new password (`password.tsx:352`); with an expired key the save fails. After R3b: the save is refused as a wrong password unless the new password opens the vault.

## R10. Memory, the own-write mark and reloads

- **Decision**: memory = the stored list after the write mapped to held objects plus the new wallet. `writeStoredAccounts(list, { own })` records the mark only when memory holds every stored id, never on the already-saved path, and clears it on a throw. The extension's `reloadWallets` (`App.tsx:245-248`) first awaits `withVaultWriteLock(async () => undefined)`.
- **Rationale**: today memory is the window's old copy plus the new wallet (`useAccountsMutations.ts:117`) and the mark is always set (`useAccountsMutationHelpers.ts:86-89`); the listener ignores a matching list (`apps/extension/src/entrypoints/popup/useLockAcrossWindows.ts:118`), so a stale window would never learn another window's wallet. A reload fires on the list change while the writer still holds the lock, before its selection rows; the loader would read the old selection (`useAccountsLoader.ts:103-129`). The barrier resolves after that turn, so the reload reads the final selection. Mobile has one runtime and no listener.

## R11. The lock is not reentrant

Helpers take no lock; callers hold `withVaultWriteLock` (`useAccountsMutationHelpers.ts:43-49`). The barrier in `reloadWallets` runs outside any turn.

## R12. Testing

- **Double**: an adapter for the real `initStorage({ platform: 'mobile', adapter })` (`storage/storage.ts:415-424`, as `test-utils/analytics.ts:17-30`) plus a stash. Faults: throw without applying, apply then throw, stash faults, read throws, read returns `null` (iOS manifest drop). Snapshots after each write. Relaunch re-inits from a snapshot with an empty or kept stash, and resets modules so the own-write mark (`useAccountsMutationHelpers.ts:81`), the write queue (`:29`) and the landed-nonce record start fresh: two windows are two runtimes.
- **Cipher**: key-sensitive see-through double with a fresh nonce per lock. Today's mock opens any vault with any cached key (`hooks/useAccountsMutations.test.tsx:66`).
- **Locks**: Node 24 provides `navigator.locks`, so without care every test takes the Web Locks path; one suite removes it to exercise the promise queue mobile uses (`useAccountsMutationHelpers.ts:46-48`).
- **On device**: no fault hook in builds; screen tests plus existing setup flows (FR-024).

## R13. Other findings

- `clearAll` removes the stash key after storage (`useAccountsMutations.ts:99-101`); a failed reset can leave key and vault, and a setup under a new password would re-encrypt under the old key. The key now goes before storage, and R3b refuses that setup's password.
- `persistAccount` runs follow-ups inside the `try` that reports failure (`useAccountAddFlow.ts:466-486`, `:511-524`); they move out.

## R14. Pre-existing writers outside the lock (follow-up ticket)

`changeStoredPassword` (`hooks/useAccountsSecurityHelpers.ts:117-125`), the outdated-vault upgrade during unlock (`:92-96`) and the legacy migration run from `unlockAccounts` (`hooks/useAccountsSecurity.ts:215`) write the vault or the list without `withVaultWriteLock`, so each can interleave with a save in another window. Out of scope; their vault writes do make a stale note inert.
