# Research: atomic wallet save (spec 046)

Every claim below was checked against the code on `fix/046-atomic-wallet-save` (base `main`). References are `path:line` under `packages/shared/src/` unless another root is named. Platform facts come from the spec's "What exists today" and the review's reading of `RNCAsyncStorage.mm`.

## R1. What the platforms make atomic

- **Decision**: single-key writes only (`storage/storage.ts:549-566`).
- **Rationale**: iOS AsyncStorage 2.2.0 `multiSet` writes one file per key with no rollback; Chromium batches a multi-key `set` without a documented promise. Mobile uses AsyncStorage (`apps/mobile/index.js:159-168`), the extension `chrome.storage.local` (`storage/storage.ts:149`).

## R2. Which write decides

- **Decision**: the wallet list. Add: [mark], vault, **list**, counter, selection, [vault without S], prune. Remove: **list**, selection, vault. Edit: **list**.
- **Rationale**: the loader builds only listed wallets (`hooks/useAccountsLoader.ts:85-99`) and reads a missing entry as an empty phrase (`utils/account-secret.ts:28-31`), failing every unlock. After the list, a dangling active id falls back (`useAccountsLoader.ts:122-125`) and a pair is healed (`hooks/useAccountsSelection.ts:87-98`); FR-001 allows the active wallet and counter to stay behind.
- **Today**: add sets memory (`useAccountsMutations.ts:145-151`), vault (`:153`, already without a replaced entry, `:131`), counter (`:158`), selection (`:162`), list (`:164`). Remove: memory (`:249`), selection (`:251-265`), list (`:272`), vault (`:273`). Edit: memory (`:218`), list (`:221`).

## R3. Rule 1: refuse to write on a read that contradicts the rest

- **Decision**: add, remove and edit reject before their first write when the raw vault key is present but unparseable; the vault key is absent while the list names a wallet or `WALLETS` is present; the list is not an array; or the list reads absent or `[]` while the hook's `accounts` holds wallets. `{}` secrets only when there is no vault key at all.
- **Rationale**: a read can lie. iOS AsyncStorage 2.2.0 drops a key from its in-memory manifest after a failed file read, so later reads in that process return `null` (`RNCAsyncStorage.mm` ~590-607); `getStorageItem` returns a raw string when parsing fails (`storage/storage.ts:339-348`). Today `readStoredSecrets` returns `{}` whenever `getStoredMnemonics()` is `null` (`hooks/useAccountsMutationHelpers.ts:60-61`; a non-object maps to `null`, `hooks/useAccountsSecurityHelpers.ts:64-73`), and `readStoredAccounts` returns `[]` for an absent list (`useAccountsMutationHelpers.ts:105-107`); add and remove then write a vault or list built from those, without every other wallet. Memory is the one independent witness inside a runtime.

## R4. Rule 2: settle a thrown list write by reading back

- **Decision**: when the list write of add, remove or edit throws, read `ACCOUNTS` again; `JSON.stringify` equal to what was written → success; otherwise, or if the read throws → reject, memory untouched.
- **Rationale**: a write can land and still report failure. Storage stores JSON on mobile (`storage/storage.ts`) and `chrome.storage` serializes JSON-like values, so an `undefined` field (for example `derivedFrom`) is absent on read; comparing the serialized forms ignores that. A reject whose write landed is the declared limitation (plan §Retry safety).

## R5. Retry safety without adoption

- **Decision**: the id is fixed once per setup screen and once per Add wallet confirm cycle and reused; every attempt rebuilds the account with it. A save whose id is listed overwrites its own entries; the duplicate check excludes it.
- **Rationale**: the factories already take an `id` (`factories/account-factory.ts:65`, `:150`, `:198`, `:235`). Today's save already overwrites its own id (`hooks/useAccountsMutations.ts:130-135`). Rebuilding keeps the add flow free of parked key material (`hooks/useAccountAddFlow.ts:401-405`). Today every attempt builds a new id (`PasswordPage.tsx:178-187`, `password.tsx:282-315`, `useAccountAddFlow.ts:512`, `:559`).
- **A same-id retry keeps the stored name**, because a default name computed from the counter after the first attempt's list landed would be one higher.

## R6. First save that stops after its vault

- **Decision**: nothing is discarded (owner decision, FR-006). A save with no vault key removes the stash key before encrypting.
- **What the user meets**: extension lock screen (`apps/extension/src/entrypoints/popup/App.tsx:485-498`); the chosen password unlocks, and with no wallet listed the setup screens show (`:504-511`). Mobile: welcome (`apps/mobile/app/_layout.tsx:221-226`); create asks for the existing password (`password.tsx:179`); recover always asks for a new password (`:169`, `:179`) and only the earlier one passes the proof.
- **Why drop the stash key**: `encryptMnemonics` prefers a valid cached key over the password (`crypto/encrypt-mnemonics.ts:76-79`) and caches the key before the vault write (`:80-83`; five minutes sliding, `crypto/encryption.ts:71`). A first attempt whose vault write failed without landing leaves a valid key for its password; a retry with another password would encrypt under the first.

## R7. A supplied password is proven against the stored vault

- **Decision**: vault present + password supplied (add or remove) → open with that password (`resolveMnemonicsWithPassword`, which stores its key as the stash key, `hooks/useAccountsSecurityHelpers.ts:82-90`), never the cached key. Failed-unlock counting unchanged (any error on that path, `useAccountsMutationHelpers.ts:70-75`).
- **Rationale**: today the cached key wins (`useAccountsMutationHelpers.ts:63-64`), so a save under another password succeeds while the vault stays under the first, and mobile unlocks and enrols with the wrong one (`password.tsx:329`, `:352`).
- **Error mapping**: only the setup twins map `IncorrectPasswordError` / `UnlockThrottledError` to `passwordCheckErrorKey(err, 'wallet.create.invalid_password')` (`utils/unlock-throttle.ts:45`); they always supply a password, so the cached key's salt-mismatch `IncorrectPasswordError` (`crypto/encryption.ts:567`) cannot reach that mapping.

## R8. Duplicate rules

- **Held positions**: non-null values across every array of a stored wallet's `pathIndexes` (`types/account.ts:21`, `:45`); slot i is stored as i or `null` (`hooks/useAccounts.ts:153-156`); creation writes `[null × start, start]` (`factories/account-factory.ts:108-110`); mirrors copy the mainnet positions (`utils/derived-accounts.ts:241-254`); derived-account edits add positions (`hooks/useAccountsMutations.ts:197-207`). The starting position is the smallest held one; the phrase rule tests the new start against the whole held set.
- **Derived wallets pass**: built from the parent's phrase at the picked index (`useAccountAddFlow.ts:439-447`), which the parent does not hold.
- **Pure, no network**: `restoreAccount` (`hooks/useAccounts.ts:173`) reaches `createBlockchainAccountForNetwork`, which fetches the catalog and returns `null` for a disabled network (`utils/account.ts:184-195`). Pure path: `generateKeyPair(mnemonic, getSolanaDerivationPath(i))` (`blockchain/solana/factory.ts:63-88`); a private key via `createKeyPairSignerFromBytes(bs58.decode(key))` (`factory.ts:204-219`). Skips per index and per entry.
- **Seed Vault**: replaced by address, decided against storage (FR-013). Today the replaced id comes from memory (`useAccountAddFlow.ts:470-476`) and its entry leaves the vault before the list (`useAccountsMutations.ts:131`, `:153`).
- **Today**: memory checks only (`useImportPrivateKey.ts:62,87`, `useImportWatchOnly.ts:52,71`); no phrase check.

## R9. Testing

- A storage and stash double for the real `initStorage({ platform: 'mobile', adapter })` (`storage/storage.ts:415-424`, as `test-utils/analytics.ts:17-30`): write faults (not applied; applied then thrown), stash faults, read faults (throw, `null`, unparseable), snapshots, relaunch with `vi.resetModules()` so the own-write mark (`useAccountsMutationHelpers.ts:81`) and the write queue (`:29`) start fresh per runtime.
- A key-sensitive see-through cipher; today's mock opens any vault with any cached key (`hooks/useAccountsMutations.test.tsx:66`).
- Node 24 provides `navigator.locks`; one suite removes it to exercise the promise queue (`useAccountsMutationHelpers.ts:46-48`).
- On device: no fault hook; screen tests plus existing setup flows (FR-024).

## R10. Memory, reloads and the Android dApp sheet

- The own-write mark is recorded only when memory's ids equal the stored ids (today always, `useAccountsMutationHelpers.ts:86-89`); the listener ignores a list with the held ids (`apps/extension/src/entrypoints/popup/useLockAcrossWindows.ts:120`) and reloads otherwise, through `reloadWallets` with the cached key (`App.tsx:245-248`).
- A reload fires on the list change while the writer still holds the lock; `reloadWallets` first awaits `withVaultWriteLock(async () => undefined)`.
- Android dApp sheet: a second `ReactActivity` (`apps/mobile/plugins/withMobileWalletAdapter.js:89-100`) rendering a root registered from the same bundle (`apps/mobile/index.js:183-187`, `src/mwa/MwaRoot.tsx:59`) with its own `AccountsProvider` that runs init (`src/providers/AppProviders.tsx:85`). Assumed to run on the application's React host, so one JS runtime and one write queue; not verified on a device. No wallet mutation under `src/mwa`.

## R11. Other findings

- `clearAll` removes the stash key after storage (`useAccountsMutations.ts:99-101`); it moves before storage.
- `persistAccount` runs follow-ups inside the `try` that reports failure (`useAccountAddFlow.ts:466-486`, `:511-524`); they move out.
- `editAccount` silently returns when the list reads without the wallet (`useAccountsMutations.ts:212-214`); under Rule 1 an absent or empty list rejects.
- Writers outside the lock (follow-up ticket): `changeStoredPassword` (`hooks/useAccountsSecurityHelpers.ts:112-126`), the outdated-vault upgrade during unlock (`:92-96`), the legacy migration run from `unlockAccounts` (`hooks/useAccountsSecurity.ts:215`).
