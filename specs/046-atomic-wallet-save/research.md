# Research: atomic wallet save (spec 046)

Every claim below was checked against the code on `fix/046-atomic-wallet-save` (base `main`). File references are `path:line` on that tree, under `packages/shared/src/` unless another root is named. Platform facts come from the spec's own primary-source reading ("What exists today").

## R1. What the platforms make atomic

- **Decision**: single-key writes only. Every change keeps using `setStorageItem` / `removeStorageItem` (`storage/storage.ts:549-566`), one key per call.
- **Rationale**: mobile storage is AsyncStorage (`apps/mobile/index.js:159-168`), whose iOS `multiSet` writes one file per key with no rollback (spec, `RNCAsyncStorage.mm`). The extension uses `chrome.storage.local` one key per `set` (`storage/storage.ts:149`); Chromium batches a multi-key `set`, but the documentation does not promise it.
- **Alternatives considered**: a multi-key `set` (not promised, absent on iOS); one combined record (format change); a journal key (a second source of truth with replay logic).

## R2. Which write decides

- **Decision**: the wallet list (`ACCOUNTS`) decides add, remove and edit. Add: [note], [marks], vault, **list**, [note removed], counter, selection, [vault without the replaced wallet]. Remove: **list**, selection, vault. Edit: **list**. React state changes only after the list.
- **Rationale**: the loader builds only listed wallets (`hooks/useAccountsLoader.ts:85-99`) and reads a missing vault entry as a mnemonic with an empty phrase (`utils/account-secret.ts:28-31`), which fails every unlock. So every write before the list must keep every listed id's entry, and every write after it may only remove entries of ids no longer listed. After the list, a dangling active id falls back to the first listed wallet (`useAccountsLoader.ts:122-125`) and a pair the active wallet does not hold is healed on render (`hooks/useAccountsSelection.ts:87-98`). FR-001 allows the active wallet and counter to stay behind after the deciding write.
- **Today's order**: add sets memory (`useAccountsMutations.ts:145-151`), then vault (`:153`), counter (`:158`), selection (`:162`), list (`:164`); with `replaces`, the vault written at `:153` already lacks the replaced entry (`:131`) while the list still names it until `:164`. Remove: memory (`:249`), selection (`:251-265`), list (`:272`), vault (`:273`). Edit: memory (`:218`), list (`:221`).
- **After the deciding write**: for a save, a later failure is logged and the call resolves (FR-008). For a removal, the vault write keeps today's behaviour: memory follows the list and the call rejects, so the user sees the existing error (`hooks/useAccountRemoval.ts:52-53`); the removed entry stays unlisted (known limitation). The selection writes after either list are logged.

## R3. FR-006 / FR-006a: the first-save note

- **Decision**: one new key, `STORAGE_KEYS.FIRST_SAVE` (`'salmon_first_save_pending'`, value `true`). A save that starts with no vault, no listed wallet and no `WALLETS` record writes it before its vault and removes it after its list. `settleFirstSave(list)` in `useAccountsMutationHelpers.ts` (no lock of its own): note + list `null`/`[]` → remove stash `DERIVED_KEY`, remove `UNLOCK_ATTEMPTS`, run `clearAccountsStorage()` whose last removal is the note; note + listed wallet → remove the note; no note → nothing. Called at save start (before any secret is read or encrypted) and at launch (one lock turn before `runUpgrades`).
- **Why not storage shape**: an empty list beside an encrypted vault with no `WALLETS` record is also an interrupted v2 migration after one unlock. Migration writes vault, list, then removes the record (`utils/legacy-migration.ts:357-371`); stopped after the vault, the next unlock with the password runs `removeMigratedRecord`, which removes the record once the vault holds every seed it carries (`:134-151`, reached from `:183-186`). What remains is vault + empty list + no record, and the vault is the only copy.
- **Why the note proves it**: the note is only written on a device with no vault, so a vault beside a note was written after it, by that save. The note is removed last in the discard, so a stop mid-discard repeats it.
- **Format**: no existing record changes; the key is absent on every existing install, so nothing migrates. `clearAccountsStorage` (`useAccountsMutationHelpers.ts:134-148`) gains it as its last removal, so "Remove all wallets" clears it too.
- **Unreadable list**: `getStorageItem` rethrows adapter errors (`storage/storage.ts:290-296`, `:134-140`); a throw rejects the save or reaches the init-failed gate (`hooks/useAccountsSecurity.ts:306-310`, `App.tsx:499-506`, mobile `_layout.tsx:186-190`). A corrupt list returns as a raw string (`storage/storage.ts:344-348`): neither empty nor prunable.
- **Unchanged state**: vault + empty list + no note. Today the extension shows the lock screen before checking for wallets (`apps/extension/src/entrypoints/popup/App.tsx:485-498`) and mobile goes to welcome (`apps/mobile/app/_layout.tsx:221-226`), where the password screen asks for an existing password (`password.tsx:179`, `requiredLock` set by `useAccountsSecurityHelpers.ts:178`). After this change: the same.

## R3a. The cached key on a first save

- **Decision**: a first save removes the stash `DERIVED_KEY` after `settleFirstSave` and before `readStoredSecrets` and encryption; a stash failure rejects.
- **Rationale**: `encryptMnemonics` caches the key derived from the given password (`crypto/encrypt-mnemonics.ts:80-83`) before `addAccount` writes anything, and reuses any valid cached key (`:76-79`; `KEY_CACHE_TTL` is five minutes, sliding, `crypto/encryption.ts:71`, `:527-531`). Without the removal, a first attempt that fails at any write leaves its key, and a retry with another password encrypts under the first one. The extension's stash lives in the background worker and survives a window close, so the same holds across a reopened window.

## R4. One secret, one wallet

- **Decision**: `findStoredClash` inside the lock. Phrase: same `normalizeMnemonic` phrase and new start ∈ indexes the listed wallet holds. Address: Solana addresses from pure functions; a Seed Vault wallet with a listed Seed Vault wallet's address replaces it; any other clash throws `DuplicateAccountError`.
- **Pure addresses, no network**: `restoreAccount` (`hooks/useAccounts.ts:173`) builds through `createBlockchainAccountForNetwork`, which calls `fetchAndMergeNetworkConfigs` (a backend request, `hooks/useAvailableNetworks.ts:148-150`) and returns `null` for a network the catalog disables (`utils/account.ts:184-195`). The pure path it ends up in for Solana is `generateKeyPair(mnemonic, getSolanaDerivationPath(index))` (`blockchain/solana/factory.ts:63-88`), whose signer's `address` is the base58 public key (`blockchain/solana/SolanaAccount.ts:32-33`). A private key's address is the signer from `createKeyPairSignerFromBytes(bs58.decode(key))` (`factory.ts:204-219`). Watched and Seed Vault secrets carry their address. A listed phrase wallet is derived at the union of its `pathIndexes` values across all networks, so no network entry being disabled or missing skips it.
- **Rationale**: the list stores no addresses (`types/account.ts:37-56`). Today's checks read memory (`useImportPrivateKey.ts:62,87`, `useImportWatchOnly.ts:52,71`, `useAccountAddFlow.ts:470-476`), and a locked window holds placeholders with no addresses (`useAccountsLoader.ts:48-55`). No phrase duplicate check exists. The start is the factory's `startIndex` (`factories/account-factory.ts:102-111`). A held index other than the start (a "Check derivables" slot) is the same address, so FR-012 refuses it too.

## R5. Adoption

- **Decision**: drop an unlisted vault entry only when its stored secret is exactly equal (`isEqual` on `toStoredSecret` forms, no normalisation) to the new one. The duplicate check alone may normalise.
- **Rationale**: FR-016 allows dropping only "an unlisted copy of the exact secret". Every save re-encrypts every stored secret (`useAccountsMutations.ts:128-131`), so a failed attempt's copy would otherwise ride along under its random id (`utils/account.ts:149-153`). A retry on the same screen reuses the same id (R8), so its earlier entry is simply overwritten.

## R6. The counter

- **Decision**: base = `max(stored COUNTER ?? 0, stored list length before the add)`; the wallet's name is `nameFromCounter(base)`; `COUNTER` = base + 1, written after the list.
- **Before or after the increment**: `generateAccountName(counter)` writes `counter + 1` (`utils/account.ts:164-168`), and the panels' default name uses `number: n + 1`. So `nameFromCounter` receives the counter **before** the increment (base), and the name shows base + 1, the same number the stored counter then holds.
- **Rationale**: today three rules exist: the setup screens and the extension panel name from the window's counter (`PasswordPage.tsx:179`, mobile `password.tsx:284`, ui `AccountAddPanel.tsx:88-91`); the mobile panel and the derived scan name from `accounts.length + 1` (mobile `AccountAddPanel.tsx:105-108`, `useDerivedAccountsScan.ts:337`); `addAccount` stores the window's `counter + 1` (`useAccountsMutations.ts:116`). Written before the list, a failed save would skip a number; after it, a stop in between leaves it one behind, which `max` restores whenever no wallet was removed. It also repairs a `clearAll` stopped after its first removal (`useAccountsMutationHelpers.ts:136`).

## R7. Backup-pending marks

- **Decision**: `addAccount(…, { unconfirmed: true })` writes the marks before the vault, in one write that also prunes. No take-back on failure. Every save and every launch prune under the lock, keeping marks named by a listed wallet's `id` or `derivedFrom`; the launch prune is caught and logged; a list that is not an array means no prune. `markUnconfirmed` leaves `PhraseBackupValue`; the provider re-reads when the listed ids change; `confirmBackup`'s write runs under the lock.
- **Rationale**: today the screens write the mark before the save, outside the lock (`PasswordPage.tsx:191`, mobile `password.tsx:321`, `PhraseBackupContext.tsx:97-102,136-139`); a prune inside the lock would race it. A derived wallet asks under its parent's id (`PhraseBackupContext.tsx:63-66`). A write that reports failure may still have landed, so taking a mark back could leave a saved wallet unmarked (FR-019). The provider is mounted at the root (`apps/extension/src/AppProviders.tsx:37`, `apps/mobile/src/providers/AppProviders.tsx:93`) and reads once on mount (`PhraseBackupContext.tsx:75-89`); transactions re-read before signing (`:111-125`).

## R8. Setup screens: second submit and the phrase

- **Decision**: each twin builds the account once per screen and keeps it in a ref; `addAccount` treats an id storage already lists with an equal secret as done (no second wallet write). Mobile drops `walletAddedRef`; the phrase owed back is a ref cleared, with the account ref, right after `addAccount` resolves, followed by `setMnemonic(null)`. The extension's `handlePasswordSuccess` clears `authData`.
- **Rationale**: today both twins build a new account (new random id) on every submit (`PasswordPage.tsx:178-187`, mobile `password.tsx:282-315`), so a retry after a landed-but-reported-failed save stores a second wallet. Mobile's flag is set after the save resolves (`password.tsx:322-323`) and the cleanup puts the phrase back when the flag is false (`:141-149`). The extension keeps the phrase in `authData` (`App.tsx:201`, passed at `:543`) until consent resolves (`:417`); the success and consent steps do not read it. Nothing after `addAccount` throws on either twin (`unlockAccounts` returns `false`, `hooks/useAccountsSecurity.ts:248-253`; `trackOnboardingEvent` is `void`).

## R9. Owner question 5

- **Reachability**: only by deep link while unlocked: in-app routes enter `(auth)` only after "Remove all wallets" (`apps/mobile/app/(app)/_layout.tsx:126-130`, `(app)/settings/index.tsx:196-200`); the root guard leaves `(auth)` only when locked or before the first navigation (`apps/mobile/app/_layout.tsx:243-257`); scheme `salmonwallet` (`apps/mobile/app.json:9`), no `+native-intent` filter. Reasoned from code.
- **Behaviour**: the screen asks for a new password (`password.tsx:166-179`). An unlocked session holds a cached key unless it has expired. With a valid key the vault is re-encrypted under it (`encrypt-mnemonics.ts:72-79`) and keeps the old password; `unlockAccounts(newPassword)` then fails and counts a failed unlock (`password.tsx:329`, `useAccountsSecurity.ts:232-236`), and the new password goes to biometric enrolment (`password.tsx:352`). With an expired key, `readStoredSecrets(newPassword)` rejects before any write (`useAccountsMutationHelpers.ts:63-75`).

## R10. Window memory and the own-write mark

- **Decision**: after an add, replace or removal, `accounts` is the stored list after the write, in stored order, mapped to the objects this window holds plus the new wallet. `writeStoredAccounts(list, { own })` records the own-write mark only when memory will hold every stored id, and clears it if the write throws. When the removed wallet was active, the next active is the first wallet of the new stored list this window holds.
- **Rationale**: today memory is the window's old copy plus the new wallet (`useAccountsMutations.ts:117`) and the mark is always recorded before the write (`useAccountsMutationHelpers.ts:86-89`). The extension's listener ignores a list that matches the mark (`apps/extension/src/entrypoints/popup/useLockAcrossWindows.ts:118`), so a stale window that adds a wallet ignores the list that also names another window's wallet, and never reloads. Without the mark, the listener compares stored and held ids and reloads on a difference (`:119-126`). The loader's fallback picks the first listed wallet (`useAccountsLoader.ts:122-125`); choosing the same one on removal makes "stopped after the list" and "completed" land alike.

## R11. The lock is not reentrant

- **Decision**: `settleFirstSave`, `findStoredClash` and `pruneMarks` take no lock; their callers hold `withVaultWriteLock`.
- **Rationale**: `navigator.locks.request` on a held name waits for the holder, and the React Native queue chains on the running write (`useAccountsMutationHelpers.ts:43-49`).

## R12. Testing a kill

- **Decision**: a storage and stash double over the real `initStorage({ platform: 'mobile', adapter })` (`storage/storage.ts:415-424`), as `test-utils/analytics.ts:17-30` does. Each storage call is one write; a storage or stash write can be made to throw; storage is snapshotted after each write; relaunch with an empty stash (process death) or a kept stash (extension window reopened while the background worker lives). A key-sensitive see-through cipher: a vault opens only with the password or cached key it was locked under.
- **Rationale**: the existing tests mock the whole storage module (`hooks/useAccountsMutations.test.tsx:16-44`, `hooks/useAccounts.test.ts:19-50`), and their cipher opens any vault with any cached key (`useAccountsMutations.test.tsx:66`), so they cannot show that a retry encrypted under the wrong key. Tests that pass today are labelled guards in plan.md.
- **On device**: no fault hook in app builds; per-platform coverage is the screen tests plus the existing setup flows (FR-024).

## R13. Other findings

- `clearAll` removes the stash key only after `clearAccountsStorage` (`useAccountsMutations.ts:99-101`). If storage throws after removing the list, the vault and the key both stay, the window shows setup, and a setup with a new password is not a first save (a vault exists), so `encryptMnemonics` re-encrypts under the old key. Moving the key removal before storage (memory first, FR-009) makes that setup fail on the password instead; the leftover vault itself stays (no note, FR-006a).
- `persistAccount` runs `trackEvent` and resets after `addAccount` inside the `try` that reports failure (`useAccountAddFlow.ts:466-486`, `:511-524`); a throw there would report a saved wallet as failed. Those steps move out of the failure path.
- An interrupted legacy migration that kept its record stays at a lock screen with no wallets (`legacy-migration.ts:182-188`, `:357-371`); out of scope.
