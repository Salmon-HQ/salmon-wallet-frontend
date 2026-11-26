# Research: atomic wallet save (spec 046)

Every claim below was checked against the code on `fix/046-atomic-wallet-save` (base `main`). References are `path:line` under `packages/shared/src/` unless another root is named. Platform facts come from the spec's "What exists today" and the review's reading of `RNCAsyncStorage.mm`.

## R1. What the platforms make atomic

- **Decision**: single-key writes only (`storage/storage.ts:549-566`).
- **Rationale**: iOS AsyncStorage 2.2.0 `multiSet` writes one file per key with no rollback; Chromium batches a multi-key `set` without a documented promise. Mobile uses AsyncStorage (`apps/mobile/index.js:159-168`), the extension `chrome.storage.local` (`storage/storage.ts:149`).

## R2. Which write decides

- **Decision**: the wallet list. Add: [mark], vault, **list**, counter, selection, [vault without the replaced Seed Vault wallets], [prune]. Remove: **list**, selection, vault. Edit: **list**.
- **Rationale**: the loader builds only listed wallets (`hooks/useAccountsLoader.ts:85-99`) and reads a missing entry as an empty phrase (`utils/account-secret.ts:28-31`), failing every unlock. After the list, a dangling active id falls back (`useAccountsLoader.ts:122-125`) and a pair is healed (`hooks/useAccountsSelection.ts:87-98`); FR-001 allows the active wallet and counter to stay behind.
- **Today**: add sets memory (`useAccountsMutations.ts:145-151`), vault (`:153`, already without a replaced entry, `:131`), counter (`:158`), selection (`:162`), list (`:164`). Remove: memory (`:249`), selection (`:251-265`), list (`:272`), vault (`:273`). Edit: memory (`:218`), list (`:221`).

## R3. Rule 1: refuse to write on a read that contradicts the rest

- **Decision**: list conditions (add, remove, edit): the list is not an array, or it reads absent or `[]` while the hook's `accounts` holds wallets. Vault conditions (add, remove): the raw vault key is present but unparseable while the list names a wallet, or absent while the list names a wallet, `WALLETS` is present or `COUNTER` is present. `{}` secrets when there is no vault key, or the vault is unparseable and no wallet is listed (overwritten as today, so a user with the phrase gets back in).
- **Rationale**: a read can lie. iOS AsyncStorage 2.2.0 drops a key from its in-memory manifest after a failed file read, so later reads in that process return `null` (`RNCAsyncStorage.mm` ~590-607); `getStorageItem` returns a raw string when parsing fails (`storage/storage.ts:339-348`). Today `readStoredSecrets` returns `{}` whenever `getStoredMnemonics()` is `null` (`hooks/useAccountsMutationHelpers.ts:60-61`; a non-object maps to `null`, `hooks/useAccountsSecurityHelpers.ts:64-73`), and `readStoredAccounts` returns `[]` for an absent list (`useAccountsMutationHelpers.ts:105-107`); add and remove then write a vault or list built from those. Memory is the one independent witness inside a runtime, and it is empty right after a launch.
- **`COUNTER` as a second witness**: written only by `addAccount` after the vault (`useAccountsMutations.ts:153`, `:158`) and by the legacy migration after the vault (`utils/legacy-migration.ts:357`, `:360`); every wallet kind, watch-only and Seed Vault included, gets a vault entry through `addAccount`, and an unmigrated legacy record has no `COUNTER`. `ACCOUNT_ID` is rejected as a witness: today's `clearAccountsStorage` removes it after the vault (`useAccountsMutationHelpers.ts:136-139`), so a reset stopped in between leaves it without a vault on existing devices. `clearAccountsStorage` (only caller `clearAll`, `useAccountsMutations.ts:100`) moves `COUNTER` and the selection keys before the list and the vault.

## R4. Rule 2: settle a thrown list write by reading back, then refresh memory

- **Decision**: when the list write of add, remove or edit throws, read `ACCOUNTS` again; `JSON.stringify` equal to what was written → success; otherwise, or if the read throws → reject, after refreshing memory from storage once the lock is released.
- **Rationale**: a write can land and still report failure. Storage stores JSON on mobile and `chrome.storage` serializes JSON-like values, so an `undefined` field (for example `derivedFrom`) is absent on read; comparing the serialized forms ignores that. The refresh opens the vault with the cached key (`resolveMnemonicsWithCachedKey`) and runs `loadAccounts(mnemonics, { persist: false })`. It does not reuse `unlockWithCachedKey`, which sets the global error on failure (`hooks/useAccountsSecurity.ts:276-280`, tripping mobile's init-failed gate), and the flag skips the loader's selection writes (`hooks/useAccountsLoader.ts:133-139`), which would run outside the lock. Memory then matches storage without depending on the listener or the own-write mark. The listener ignores a list with the held ids (`useLockAcrossWindows.ts:120`), which would leave an edit stale. Mobile has no listener.

## R5. Retry safety without adoption

- **Decision**: the id and avatar are fixed once per setup screen, and in Add wallet for as long as a value key stays the same (trimmed phrase, private key, watched address, Seed Vault address + path + token, derived position, and the active wallet's id only for a derived account; not the name); every attempt rebuilds the account with them. A save whose id is in storage overwrites its own entries only when the stored entry is exactly the secret being saved; otherwise it rejects.
- **Rationale**: the factories already take `id` and `avatar` (`factories/account-factory.ts:65-67`, `:150-152`, `:198-200`, `:229-235`). Today's save already overwrites its own id (`hooks/useAccountsMutations.ts:130-135`) whatever the stored secret is; the condition keeps an id from replacing another secret. The key compares values because the import hooks return fresh objects every render (`hooks/useImportPrivateKey.ts:110-121`); a derived account takes its phrase from the active wallet (`hooks/useAccountAddFlow.ts:439-447`), so its id is in the key for that kind. Rebuilding keeps the add flow free of parked key material (`:401-405`). Today every attempt builds a new id (`PasswordPage.tsx:178-187`, `password.tsx:282-315`, `useAccountAddFlow.ts:512`, `:559`).
- **Memory**: held − replaced Seed Vault ids − C.id + C; today it filters only the replaced id (`useAccountsMutations.ts:117`).
- **No vault removal before the list**: dropping "unlisted" copies would act on a list read that may lie, and one listed wallet without its entry fails every unlock (`hooks/useAccounts.ts:290-308`); a leftover copy is ciphertext nothing reads.
- **After a rejected save**: setting `requiredLock` when a vault is stored makes the setup form ask for the existing password in the same session (`PasswordPage.tsx:117`; mobile `showSingleInput`, `password.tsx:179`, which excludes recover).

## R6. First save that stops after its vault

- **Decision**: nothing is discarded (owner decision, FR-006). A save with no vault key removes the stash key before encrypting.
- **What the user meets**: extension lock screen (`App.tsx:488-496`); the chosen password unlocks, and with no wallet listed the setup screens show (`:508`). Mobile: welcome (`apps/mobile/app/_layout.tsx:221-226`), which has no reset (no remove, reset or forgot action in `apps/mobile/app/(auth)/index.tsx`); create asks for the existing password (`password.tsx:179`); recover always asks for a new password (`:169`, `:179`) and only the earlier one passes the proof.
- **Why drop the stash key**: `encryptMnemonics` prefers a valid cached key over the password (`crypto/encrypt-mnemonics.ts:76-79`) and caches the key before the vault write (`:80-83`; five minutes sliding, `crypto/encryption.ts:71`). A first attempt whose vault write failed without landing leaves a valid key for its password; a retry with another password would encrypt under the first.

## R7. A supplied password is proven against the stored vault

- **Decision**: vault present + password supplied (add or remove) → open with that password (`resolveMnemonicsWithPassword`, which stores its key as the stash key, `hooks/useAccountsSecurityHelpers.ts:82-90`), never the cached key. Failed-unlock counting unchanged: a standing penalty rejects, any error on that path records a failed unlock, success clears the penalty (`useAccountsMutationHelpers.ts:67-77`). These stash and penalty writes happen before any wallet record is written.
- **Rationale**: today the cached key wins (`useAccountsMutationHelpers.ts:63-64`), so a save under another password succeeds while the vault stays under the first, and mobile unlocks and enrols with the wrong one (`password.tsx:329`, `:352`).
- **Error mapping**: only the setup twins map `IncorrectPasswordError` / `UnlockThrottledError` to `passwordCheckErrorKey(err, 'wallet.create.invalid_password')` (`utils/unlock-throttle.ts:45`); they always supply a password, so the cached key's salt-mismatch `IncorrectPasswordError` (`crypto/encryption.ts:567`) cannot reach that mapping.

## R8. Duplicate rules

- **Phrase**: refused only by a listed phrase wallet with an equal phrase after normalising that holds the new start. Held positions = non-null values across every array of `pathIndexes` (`types/account.ts:21`, `:45`); slot i is stored as i or `null` (`hooks/useAccounts.ts:153-156`); creation writes `[null × start, start]` (`factories/account-factory.ts:108-110`); mirrors copy the mainnet positions (`utils/derived-accounts.ts:241-254`); derived-account edits add positions (`hooks/useAccountsMutations.ts:197-207`). Today a phrase is never refused, so no cross-kind refusal is added.
- **Private key and watched address**: today's rule, an address held by any listed wallet (`useImportPrivateKey.ts:62`, `:87`; `useImportWatchOnly.ts:52`, `:70`, both over `collectSolanaAddresses`, `utils/account.ts:277`), now also decided from storage inside the lock. Storage holds no addresses, so they are derived purely: `generateKeyPair(mnemonic, getSolanaDerivationPath(i))` (`blockchain/solana/factory.ts:63-88`), `createKeyPairSignerFromBytes(bs58.decode(key))` (`factory.ts:204-219`); never `restoreAccount`, which fetches the catalog and returns `null` for a disabled network (`utils/account.ts:184-195`). Skips per index and per entry.
- **Seed Vault**: today's rule, replace by address, now against storage and every listed Seed Vault wallet with that address (FR-013). Today the replaced id comes from memory, one wallet (`useAccountAddFlow.ts:470-476`), and its entry leaves the vault before the list (`useAccountsMutations.ts:131`, `:153`).
- **Messages**: the watch-only import uses `wallet.watchOnly.errors.duplicate` (`useImportWatchOnly.ts:70`); the private-key import `wallet.import.errors.duplicate` (`useImportPrivateKey.ts:87`).

## R9. Testing

- A storage and stash double for the real `initStorage({ platform: 'mobile', adapter })` (`storage/storage.ts:415-424`, as `test-utils/analytics.ts:17-30`): write faults (not applied; applied then thrown), stash faults, read faults (throw, `null`, unparseable), snapshots, relaunch with `vi.resetModules()` so the own-write mark (`useAccountsMutationHelpers.ts:81`) and the write queue (`:29`) start fresh per runtime.
- A key-sensitive see-through cipher; today's mock opens any vault with any cached key (`hooks/useAccountsMutations.test.tsx:66`).
- Node 24 provides `navigator.locks`; one suite removes it to exercise the promise queue (`useAccountsMutationHelpers.ts:46-48`).
- On device: no fault hook; screen tests plus existing setup flows (FR-024).

## R10. Other findings

- The own-write mark is recorded always today (`useAccountsMutationHelpers.ts:86-89`); it becomes conditional on memory's ids equal to the stored ids. The listener reload fires while the writer holds the lock, so `reloadWallets` first awaits `withVaultWriteLock(async () => undefined)`.
- `clearAll` removes the stash key after storage (`useAccountsMutations.ts:99-101`); it moves before storage. A removal that leaves an empty list beside unlisted vault entries does not reach `clearAll` (`:239`).
- `persistAccount` runs follow-ups inside the `try` that reports failure (`useAccountAddFlow.ts:466-486`, `:511-524`); they move out.
- `editAccount` silently returns when the list reads without the wallet (`useAccountsMutations.ts:212-214`); under Rule 1 an absent or empty list rejects.
- The extension's `handlePasswordSuccess` (`App.tsx:375-377`) leaves `authData` (`:201`) holding the phrase until consent (`:417`); the success page does not read it.
- Mobile setup runs `unlockAccounts`, analytics and the enrolment hand-off inside the `try` whose `catch` shows the recovery error (`apps/mobile/app/(auth)/password.tsx:323-355`); once the phrase is cleared the submit is disabled (`hooks/useSetupPasswordForm.ts:46`). The extension twin has only `void trackOnboardingEvent` after the save (`PasswordPage.tsx:192-201`).
- The derived-account scan adds whole wallets through `addAccount` and logs a failure, moving the queue on (`hooks/useDerivedAccountsScan.ts:331-354`).
- `PhraseBackupContext`'s update reads a null record as empty and writes it back (`contexts/PhraseBackupContext.tsx:97-102`).
- Writers outside the lock (follow-up ticket): `changeStoredPassword` (`hooks/useAccountsSecurityHelpers.ts:112-126`), the outdated-vault upgrade during unlock (`:92-96`), the legacy migration run from `unlockAccounts` (`hooks/useAccountsSecurity.ts:215`).
