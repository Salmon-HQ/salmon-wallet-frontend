# Research: atomic wallet save (spec 046)

Every claim below was checked against the code on `fix/046-atomic-wallet-save` (base `main`). References are `path:line` under `packages/shared/src/` unless another root is named. Platform facts come from the spec's "What exists today" and the review's reading of `RNCAsyncStorage.mm`.

## R1. What the platforms make atomic

- **Decision**: single-key writes only (`storage/storage.ts:549-566`).
- **Rationale**: iOS AsyncStorage 2.2.0 `multiSet` writes one file per key with no rollback; Chromium batches a multi-key `set` without a documented promise. Mobile uses AsyncStorage (`apps/mobile/index.js:159-168`), the extension `chrome.storage.local` (`storage/storage.ts:149`).

## R2. Which write decides

- **Decision**: the wallet list. Add: [note], [mark], vault, **list**, [note removed], counter, selection, [vault without S], [prune]. Remove: **list**, selection, vault. Edit: **list**.
- **Rationale**: the loader builds only listed wallets (`hooks/useAccountsLoader.ts:85-99`) and reads a missing entry as an empty phrase (`utils/account-secret.ts:28-31`), failing every unlock. After the list, a dangling active id falls back (`useAccountsLoader.ts:122-125`) and a pair is healed (`hooks/useAccountsSelection.ts:87-98`); FR-001 allows the active wallet and counter to stay behind.
- **Today**: add sets memory (`useAccountsMutations.ts:145-151`), vault (`:153`, already without a replaced entry, `:131`), counter (`:158`), selection (`:162`), list (`:164`). Remove: memory (`:249`), selection (`:251-265`), list (`:272`), vault (`:273`). Edit: memory (`:218`), list (`:221`).

## R2a. Rule 1: fail closed on a read that contradicts the rest

- **Decision**: before its first write, add, remove, edit and the discard reject when the raw vault key is present but unparseable; the vault key is absent while the list names a wallet or `WALLETS` is present; the list reads absent or `[]` while this runtime's memory holds a wallet; or the list is present but not an array. `{}` secrets exist only on the first-save branch.
- **Rationale**: a read can lie. iOS AsyncStorage 2.2.0 drops a key from its in-memory manifest after a failed file read, so later reads in that process return `null` (`RNCAsyncStorage.mm` ~590-607); `getStorageItem` returns a raw string when parsing fails (`storage/storage.ts:339-348`). Today `readStoredSecrets` returns `{}` whenever `getStoredMnemonics()` is `null` (`useAccountsMutationHelpers.ts:60-61`), and `getStoredMnemonics` maps a non-object to `null` (`useAccountsSecurityHelpers.ts:64-73`); `readStoredAccounts` returns `[]` for an absent list (`useAccountsMutationHelpers.ts:105-107`). Add and remove then build a vault or list from those and write it, dropping every other wallet. Memory is the only independent witness inside one runtime, so a list that reads empty while memory holds wallets is a lie, not a fact.

## R2b. Rule 2: settle a thrown deciding write by reading back

- **Decision**: when the list write of add, remove or edit throws, read `ACCOUNTS` again; equal to what was written → success (later rows, memory, resolve); otherwise, or if the read throws → reject, memory untouched.
- **Rationale**: a write can land and still report failure. Without the read-back, a rejected save that actually landed leaves a window whose memory disagrees with storage, and a removal or edit reported failed may have happened. Rule 3 makes a retry after a reject safe whichever way it went. A removal's later vault write keeps today's rejection (`hooks/useAccountRemoval.ts:52-53`) with memory following the list.

## R3. The first-save note, bound to its vault

- **Decision**: `STORAGE_KEYS.FIRST_SAVE` holds the `nonce` of the vault the first save writes, written only on the first-save branch. Discard (stash key, unlock penalty, `clearAccountsStorage()` with the note last) only when: note present; list read succeeded and is absent or `[]`; stored vault parses and its `nonce` equals the note; memory holds no wallet. Any other note is stale and removed best effort.
- **Why bound**: `LockedVault.nonce` is fresh per encryption (`crypto/encryption.ts:31-32`, `:324-332`); every later vault write (add, remove, password change `useAccountsSecurityHelpers.ts:117-125`, upgrade `:92-96`, protect `useAccountsSecurity.ts:349`) replaces it, making a forgotten note inert.
- **Why memory, and no "landed nonce" record**: in the runtime that wrote the list, Rule 2's read-back either confirms it (memory then holds the wallet, so no discard) or rejects with memory empty; the next attempt then either adopts the listed wallet (Rule 3) or, with the list truly absent, discards the bound leftover correctly. The only remaining case is a list that exists but reads empty at every read in a runtime holding no wallet (known limitation).
- **Why a stale note must not block**: failing launch on a stale note would lock out a real wallet; its removal is caught, logged and retried on every launch and save.
- **Why not storage shape**: an empty list beside an encrypted vault with no `WALLETS` is also an interrupted v2 migration after one unlock (`utils/legacy-migration.ts:134-151`, `:183-186`, `:357-371`), where the vault is the only copy.
- **Format**: no existing record changes; `clearAccountsStorage` (`useAccountsMutationHelpers.ts:134-148`) also removes `UNCONFIRMED_PHRASES` (nothing reads marks once no wallet is listed: they are consumed only for the active listed wallet, `PhraseBackupContext.tsx:91-93`, `:111-118`) and removes the note last.
- **Unchanged state**: vault + empty list + no note. Extension: lock screen (`apps/extension/src/entrypoints/popup/App.tsx:485-498`). Mobile: welcome (`apps/mobile/app/_layout.tsx:221-226`); create asks for the existing password (`password.tsx:179`); recover always asks for a new password (`password.tsx:169`, `:179`), each attempt fails on the stored vault and counts a failed unlock.

## R3a. The cached key on a first save

- **Decision**: on the first-save branch, remove the stash `DERIVED_KEY` before any read or encryption; a stash failure rejects.
- **Rationale**: `encryptMnemonics` caches the derived key before `addAccount` writes (`crypto/encrypt-mnemonics.ts:80-83`) and reuses a valid cached key (`:76-79`; five minutes sliding, `crypto/encryption.ts:71`, `:527-531`). The extension stash survives a window close.

## R3b. A supplied password is proven against the stored vault

- **Decision**: when a vault exists and a password is supplied (add or remove), open it with that password (`resolveMnemonicsWithPassword`), never the cached key; the derived key becomes the stash key. Only `IncorrectPasswordError` counts as a failed unlock; `InvalidVaultError`, the cleartext check and stash failures propagate uncounted.
- **Rationale**: today the cached key wins (`useAccountsMutationHelpers.ts:63-64`, `encrypt-mnemonics.ts:76-79`), so a save under another password succeeds with the vault under the first, and mobile unlocks and enrols with the wrong one (`password.tsx:329`, `:352`); and the catch counts any error (`useAccountsMutationHelpers.ts:70-75`). Screens show `passwordCheckErrorKey(err, 'wallet.create.invalid_password')` (`utils/unlock-throttle.ts:45-47`) for `IncorrectPasswordError` and `UnlockThrottledError` only.

## R4. Rule 3 and the duplicate rules

- **Decision**: storage lists a wallet whose stored secret `isEqual` the new one at the same position (phrase: same starting index) → adopt it if this window's memory does not hold that id (adopt id, name, avatar; later rows; memory loaded from storage after the lock), else `DuplicateAccountError`. Other clashes → `DuplicateAccountError`: phrase equal after `normalizeMnemonic` with the new start held by that wallet on any network; a Solana address held by another listed wallet. A listed Seed Vault wallet with the same address and a different secret is replaced.
- **Rationale for adoption**: the spec (US3 scenario 4, edge case at `spec.md:141`) wants a stale window to end up showing the wallet once, nothing stored twice. One definition covers a retry after an unconfirmed write, a new setup screen after back-and-forward, and a stale second window.
- **Pure, no network**: `restoreAccount` (`hooks/useAccounts.ts:173`) reaches `createBlockchainAccountForNetwork`, which fetches the catalog (`hooks/useAvailableNetworks.ts:148-150`) and returns `null` for a disabled network (`utils/account.ts:184-195`). Pure path: `generateKeyPair(mnemonic, getSolanaDerivationPath(i))` (`blockchain/solana/factory.ts:63-88`), signer `address` (`blockchain/solana/SolanaAccount.ts:32-33`); a private key via `createKeyPairSignerFromBytes(bs58.decode(key))` (`factory.ts:204-219`).
- **Solana positions, per-index skips**: only the non-null indexes of `solana-*` `pathIndexes`; an index whose derivation fails, a missing entry, an invalid phrase or an undecodable key is skipped individually; the wallet's other indexes are still compared.
- **Today**: memory checks only (`useImportPrivateKey.ts:62,87`, `useImportWatchOnly.ts:52,71`, `useAccountAddFlow.ts:470-476`); no phrase check.

## R5. Adoption of unlisted copies

Drop an unlisted vault entry only when its stored secret `isEqual` the new one, no normalisation (FR-016). On the Rule 3 adoption path no vault write happens; a replaced entry left by an earlier attempt is not identifiable by id and stays unlisted.

## R6. The counter

- base = `max(stored COUNTER ?? 0, stored list length)`; name = `nameFromCounter(base)`; `COUNTER` = base + 1 after the list. Adoption: `COUNTER` = `max(stored counter, list length)` when it grows.
- `generateAccountName(counter)` writes `counter + 1` (`utils/account.ts:164-168`), so `nameFromCounter` receives the counter before the increment.
- Today: setup screens and the extension panel use the window's counter (`PasswordPage.tsx:179`, `password.tsx:284`, ui `AccountAddPanel.tsx:88-91`); the mobile panel and the scan use `accounts.length + 1` (mobile `AccountAddPanel.tsx:105-108`, `useDerivedAccountsScan.ts:337`); `addAccount` stores the window's `counter + 1` (`useAccountsMutations.ts:116`).

## R7. Marks

With `unconfirmed`, one write before the vault adds C (no prune). After the list a separate best-effort prune keeps marks named by a listed `id` or `derivedFrom`; the launch turn prunes too. An absent list counts as `[]`; a non-array list means no prune. No take-back on failure (FR-019). Today's mark is written outside the lock (`PasswordPage.tsx:191`, `password.tsx:321`, `PhraseBackupContext.tsx:97-102`); a derived wallet asks under its parent's id (`:63-66`).

## R8. Build once, and the phrase

- Both setup twins build a new account each submit today (`PasswordPage.tsx:178-187`, `password.tsx:282-315`); the add flow rebuilds per confirm (`useAccountAddFlow.ts:401-405`, `:512-513`, `:559-560`). Building once keeps one id across retries; Rule 3 covers a new id too.
- Mobile clears the phrase right after the save resolves (`setMnemonic(null)` after clearing the owed ref, so the cleanup at `password.tsx:141-149` puts nothing back). The extension keeps it in `authData` (`App.tsx:201`, `:543`) until consent (`:417`); `handlePasswordSuccess` (`:370`) now clears it.

## R9. Owner question 5

Reachable only by deep link while unlocked (`apps/mobile/app/(app)/_layout.tsx:126-130`, `(app)/settings/index.tsx:196-200`, `apps/mobile/app/_layout.tsx:243-257`, `apps/mobile/app.json:9`; reasoned from code). Recover always asks for a new password. Today: saved under the old cached key, then unlock and enrolment use the new one; with an expired key the save fails. After: refused as a wrong password unless the new password opens the vault.

## R10. Memory, reloads and the Android dApp sheet

- Memory after a write is the stored list mapped to held objects plus the new wallet; the own-write mark is recorded only when memory holds every stored id (`useAccountsMutationHelpers.ts:86-89` records it always today; the listener ignores a matching list, `apps/extension/src/entrypoints/popup/useLockAcrossWindows.ts:118`).
- A reload fires on the list change while the writer still holds the lock, before its selection rows; the loader would read the old selection (`useAccountsLoader.ts:103-129`). `reloadWallets` (`App.tsx:245-248`) first awaits `withVaultWriteLock(async () => undefined)`, which only orders the reload after the turn in flight when it starts.
- Android dApp sheet: a second React root registered from the same bundle (`apps/mobile/index.js:183-187`, `src/mwa/MwaRoot.tsx:59`) with its own `AccountsProvider` (`src/providers/AppProviders.tsx:85`), so its own memory. Whether it shares the JS runtime (and so the module-level write queue) is assumed, not verified. It has no list listener and calls no wallet mutation (no `addAccount`/`removeAccount`/`editAccount`/`removeAllAccounts` under `src/mwa`), so it writes no list the main root must reload.

## R11. The lock is not reentrant

Helpers take no lock; callers hold `withVaultWriteLock` (`useAccountsMutationHelpers.ts:43-49`). The barrier and the post-adoption `loadAccounts` run outside any turn.

## R12. Testing

- A storage and stash double for the real `initStorage({ platform: 'mobile', adapter })` (`storage/storage.ts:415-424`, as `test-utils/analytics.ts:17-30`): write faults (not applied; applied then thrown), stash faults, lying reads (throw, `null`, unparseable), snapshots, relaunch with `vi.resetModules()` so the own-write mark (`useAccountsMutationHelpers.ts:81`) and the write queue (`:29`) start fresh per runtime.
- A key-sensitive see-through cipher; today's mock opens any vault with any cached key (`hooks/useAccountsMutations.test.tsx:66`).
- Node 24 provides `navigator.locks`; one suite removes it to exercise the promise queue (`useAccountsMutationHelpers.ts:46-48`).
- On device: no fault hook; screen tests plus existing setup flows (FR-024).

## R13. Other findings

- `clearAll` removes the stash key after storage (`useAccountsMutations.ts:99-101`); it moves before storage, and R3b refuses a later setup's new password over a leftover vault.
- `persistAccount` runs follow-ups inside the `try` that reports failure (`useAccountAddFlow.ts:466-486`, `:511-524`); they move out.
- `editAccount` silently returns when the list reads without the wallet (`useAccountsMutations.ts:213-214`); under Rule 1 an empty or absent list rejects, a list lacking only that id still returns.

## R14. Pre-existing writers outside the lock (follow-up ticket)

`changeStoredPassword` (`hooks/useAccountsSecurityHelpers.ts:117-125`), the outdated-vault upgrade during unlock (`:92-96`) and the legacy migration run from `unlockAccounts` (`hooks/useAccountsSecurity.ts:215`).
