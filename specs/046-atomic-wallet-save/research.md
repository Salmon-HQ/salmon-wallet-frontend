# Research: atomic wallet save (spec 046)

Every claim below was checked against the code on `fix/046-atomic-wallet-save` (base `main`). File references are `path:line` on that tree, under `packages/shared/src/` unless another root is named. Platform facts come from the spec's own primary-source reading ("What exists today"); nothing here re-reads them.

## R1. What the platforms make atomic

- **Decision**: rely on single-key writes only. Every change keeps using `setStorageItem` / `removeStorageItem` (`storage/storage.ts:549-566`), one key per call; nothing introduces a batch.
- **Rationale**: mobile storage is AsyncStorage through `createAsyncStorageAdapter` (`apps/mobile/index.js:159-168`), whose iOS `multiSet` writes one file per key with no rollback (spec, `RNCAsyncStorage.mm`). The extension uses `chrome.storage.local` one key per `set` (`storage/storage.ts:149`); Chromium batches a multi-key `set`, but the documentation does not promise it. The only write that lands whole everywhere is one key.
- **Alternatives considered**: a multi-key `set` on the extension (not promised, and not available on iOS); a single combined record (stored-format change, excluded by the spec); a write-ahead journal key (a second source of truth, and its own replay logic for a defect the ordering below removes).

## R2. Which write decides, per mutation

- **Decision**: the wallet list (`STORAGE_KEYS.ACCOUNTS`) is the deciding write of add, remove and edit. Add: marks, vault, **list**, counter, selection. Remove: **list**, vault, selection. Edit: **list** only. The window's React state changes only after the list write.
- **Rationale**: the loader builds only listed wallets (`hooks/useAccountsLoader.ts:85-94`); an unlisted vault entry is invisible. So a vault written before the list is invisible if the list never lands, and a vault entry removed after the list leaves only an unlisted secret if that write never lands — the order removal already uses and documents (`hooks/useAccountsMutations.ts:268-273`). After the list, what can be stale is already tolerated: a dangling active id falls back to the first listed wallet (`useAccountsLoader.ts:122-125`), and a network or slot the active wallet does not hold is healed on render (`hooks/useAccountsSelection.ts:87-98`, `utils/active-selection.ts` module note). The counter is the one value not healed by the loader (R6).
- **Today's order, for reference**: add sets memory (`useAccountsMutations.ts:145-151`), then vault (`:153`), counter (`:158`), selection (`:162`), list last (`:164`). Remove sets memory (`:249`), selection (`:251-265`), list (`:272`), vault (`:273`). Edit sets memory (`:218`), then the list (`:221`).
- **After the deciding write**: a later write that throws is logged and the call resolves. FR-008 says so for a save; removal follows the same rule because its list write is what the next launch shows.
- **Alternatives considered**: the vault as deciding write for a save (list first): a listed wallet without its secret reads as a mnemonic with an empty phrase (`utils/account-secret.ts:28-33`) and breaks every unlock.

## R3. FR-006 / FR-006a: the discard

- **Decision**: `discardVaultWithoutWallets()` in `hooks/useAccountsMutationHelpers.ts`, taking no lock. Called from `initAccounts` inside `withVaultWriteLock` before `runUpgrades`, and from `addAccount` inside its own lock turn on a first save. Rule: list read throws → propagate; list not `null`/`[]` → keep; `WALLETS` present → keep; vault an unencrypted object → keep; otherwise remove stash `DERIVED_KEY`, and if a vault is present run `clearAccountsStorage()` and remove `UNCONFIRMED_PHRASES`.
- **Rationale, today's lockout**: with a vault and no list, `initializeAccountsSecurity` raises the lock (`hooks/useAccountsSecurityHelpers.ts:178-189`); the extension shows the lock screen before checking for wallets (`apps/extension/src/entrypoints/popup/App.tsx:485-498`); mobile goes to the welcome screen (`apps/mobile/app/_layout.tsx:221-226`) but the password screen then asks for an existing password (`apps/mobile/app/(auth)/password.tsx:179`).
- **Rationale, each exclusion**:
  - Unreadable list: `getStorageItem` rethrows adapter errors (`storage/storage.ts:290-296`, `:134-140`); a throw reaching `initAccounts` lands in the existing init-failed gate (`hooks/useAccountsSecurity.ts:306-310`, `App.tsx:499-506`, mobile `_layout.tsx:186-190`), which already refuses to route a broken storage into onboarding. A corrupt list comes back as a raw string (`storage/storage.ts:344-348`): not empty, so nothing is deleted.
  - Pending legacy migration: `WALLETS` (with `ACTIVE`, `ENDPOINTS`, `storage/types.ts:243-249`) is the v2 record. `migrateLegacyWallets` writes the vault, then the list, then removes the record (`utils/legacy-migration.ts:357-371`), so a stop after the vault looks exactly like "vault, empty list, record present"; once a vault exists the migration answers "no-migration" (`:182-188`). Discarding there would delete the only migrated copy of a password-protected record's seeds while the record still needs a password to re-run.
  - Cleartext vault: a password-less v2 wallet migrated by older releases sits in the clear and is its owner's only copy; it opens through "protect wallet" (`useAccountsSecurityHelpers.ts:167-176`).
- **Why also at a first save**: `encryptMnemonics` caches a key derived from the given password before the vault is written (`crypto/encrypt-mnemonics.ts:80-83`) and reuses any valid cached key (`:76-79`, valid for `KEY_CACHE_TTL`, `crypto/encryption.ts:527-531`). A failed first save followed by a retry with another password therefore writes the vault under the first password. The same rule at a first save removes that key and any leftover, so the retry encrypts under the password the user just typed.
- **In-session removal of the last listed wallet** keeps writing an empty list and the remaining vault (`useAccountsMutations.ts:239-242` clears only when both end empty). Not changed: the first save after it and the next launch both discard the leftover, and changing that branch would also delete a `WALLETS` record beside a migrated list.
- **Alternatives considered**: discarding in `initializeAccountsSecurity` without the lock (a first save in another extension window could be discarded between its vault and its list write); a "setup in progress" flag (a new stored key).

## R4. One secret, one wallet

- **Decision**: `findStoredClash` inside `addAccount`'s lock, after `readStoredSecrets`. Phrase: same `normalizeMnemonic` phrase and the new start is an index the listed wallet holds on any network. Address: rebuild the listed wallets with `restoreAccount` (`hooks/useAccounts.ts:173`) and compare with `collectSolanaAddresses` (`utils/account.ts:277-288`); derive phrases only when the new wallet has one address. Seed Vault against a listed Seed Vault wallet with the same address → replace; anything else that clashes → `DuplicateAccountError`.
- **Rationale**: the stored list holds names, avatars, `pathIndexes` and `derivedFrom` only (`types/account.ts:37-56`); the stored vault holds the secret (`utils/account-secret.ts:61-67`). The starting position is the derivation index the factory puts every network at (`factories/account-factory.ts:102-111`). Today's checks read memory: `useImportPrivateKey.ts:62,87`, `useImportWatchOnly.ts:52,71`, the Seed Vault replacement `useAccountAddFlow.ts:470-476`; none sees another window's wallet or a locked window's (placeholders with no addresses, `useAccountsLoader.ts:48-55`). No phrase duplicate check exists at all. Normalising matters because the recover grid normalises (`hooks/useAccountAddFlow.ts:218`) while an older stored phrase may not have been.
- **Held index, not only the start**: a wallet whose "Check derivables" slots include index 3 already shows that address; a new derived wallet at 3 would show the same funds twice, which FR-012's address clause refuses. The phrase rule covers it with no derivation.
- **Cost**: a phrase import or derived wallet derives nothing extra. A private key, watched or Seed Vault import rebuilds listed phrase wallets on Solana networks only (`restoreAccount` with the Solana entries of `pathIndexes`); `clearSeedCache()` follows (`useAccountsLoader.ts:100`).
- **Alternatives considered**: comparing against memory where it is fresh (two paths, and the stale case is exactly the one the spec targets); storing addresses in the list (format change).

## R5. Adopting an unlisted copy

- **Decision**: when building the new vault, drop every entry whose id the stored list does not name and whose stored secret equals the new one (phrase compared after `normalizeMnemonic`; other kinds field by field). Every other unlisted entry is copied unchanged.
- **Rationale**: every save re-encrypts every stored secret (`useAccountsMutations.ts:128-131`), so a failed attempt's secret would ride along forever under a random id (`utils/account.ts:149-153` gives a new id per build). Dropping only exact copies keeps FR-016 and gives SC-004.

## R6. The counter

- **Decision**: `addAccount` reads `COUNTER` and writes `max(stored counter, stored list length before the add) + 1` right after the list. The wallet's name comes from that value when the caller passes `nameFromCounter` (setup screens; the Add wallet panel when the name field still holds the default; the derived scan).
- **Rationale**: today the new value is the window's `counter + 1` (`useAccountsMutations.ts:116`) and the names come from the window's counter too (`PasswordPage.tsx:179`, mobile `password.tsx:284`, both `AccountAddPanel` `defaultName`), so two windows hand out the same number. Written before the list, a failed save would skip a number; written after, a stop in between leaves it one behind. The `max` rule restores it whenever no wallet was ever removed (counter = list length − 1 then); it also repairs a `clearAll` stopped after its first removal (`useAccountsMutationHelpers.ts:136`). The derived scan names from `accounts.length + 1` (`useDerivedAccountsScan.ts:337`), a third rule; it joins the first.
- **Ceiling, recorded**: after removals, a stop in the one-write gap between the list and the counter can repeat a default name once (owner question 2).

## R7. Backup-pending marks

- **Decision**: `addAccount(…, { unconfirmed: true })` writes the mark inside its lock before the vault, in one write that also prunes stale marks; a failure before the list takes the mark back (best effort). Launch prunes inside its lock turn. A mark stands while a listed wallet has it as its `id` or its `derivedFrom`. `markUnconfirmed` leaves `PhraseBackupValue`; the provider re-reads the record when the listed ids change; its `update` (confirm) runs under the lock.
- **Rationale**: today the mark is written by the screen before the save, outside the lock (`PasswordPage.tsx:191`, mobile `password.tsx:321`, through `PhraseBackupContext.tsx:97-102,136-139`). A prune inside the lock would delete a mark another window wrote outside it, and that window's wallet would then save unmarked. A derived wallet asks under its parent's id (`PhraseBackupContext.tsx:63-66`), so pruning on `id` alone would silence a child whose parent was removed. The provider is mounted at the root on both apps (`apps/extension/src/AppProviders.tsx:37`, `apps/mobile/src/providers/AppProviders.tsx:93`) and reads the record once on mount (`PhraseBackupContext.tsx:75-89`), so a mark written by `addAccount` needs the re-read to show Home's reminder; transactions already re-read before signing (`:111-125`).
- **Alternatives considered**: mark after the list (a stop in between leaves a saved unconfirmed wallet unmarked: FR-018); a callback from `addAccount` into the context (an inversion for one caller).

## R8. Mobile password screen

- **Decision**: drop `walletAddedRef` (`apps/mobile/app/(auth)/password.tsx:140-149`); hold the phrase owed back in one ref, cleared right after `addAccount` resolves; the unmount cleanup puts back what it still holds.
- **Rationale**: the flag disagreed with storage only because `addAccount` could reject after storing (today a counter or selection write failure rejects after the vault landed, `useAccountsMutations.ts:153-164`). With R2's failure semantics the resolution is the answer; one ref holding the phrase (not a boolean beside it) keeps the screen from carrying a second opinion, and drops the phrase from memory as soon as the wallet holds it. Nothing after `addAccount` throws today on either twin (`unlockAccounts` returns `false`, `hooks/useAccountsSecurity.ts:248-253`; `trackOnboardingEvent` is `void`), so FR-015 needs no new state.

## R9. Owner question 5 (recover with wallets stored)

- **Finding**: reachable only by deep link while unlocked. In-app routes reach `(auth)` only after "Remove all wallets" (`apps/mobile/app/(app)/_layout.tsx:126-130`, `(app)/settings/index.tsx:196-200`); the root guard redirects out of `(auth)` only when locked or before the first navigation (`apps/mobile/app/_layout.tsx:243-257`); the scheme is `salmonwallet` (`apps/mobile/app.json:9`) with no `+native-intent` filter. Reasoned from code; not run on a device.
- **What happens**: the screen asks for a new password in recover (`password.tsx:166-179`), but an unlocked session holds a valid cached key and `encryptMnemonics` uses it (`crypto/encrypt-mnemonics.ts:72-79`): the vault keeps the **old** password. Then `unlockAccounts(newPassword)` fails and records a failed unlock (`password.tsx:329`, `useAccountsSecurity.ts:232-236`), and the new password is parked for biometric enrolment (`password.tsx:352`). The spec's "sets a new password for the whole vault" does not match the code.
- **Under this plan**: a listed phrase is refused before any write; FR-005 holds by construction. The rest is an existing defect, proposed as a separate ticket.

## R10. Removal's next active wallet

- **Decision**: when the removed wallet was active, the next one is the first wallet of the new stored list that this window holds in memory.
- **Rationale**: the loader's fallback picks the first listed wallet (`useAccountsLoader.ts:122-125`); choosing the same one makes "stopped after the list" and "completed" land on the same wallet. Today's choice is the first in memory order (`useAccountsMutations.ts:252`), which can differ.

## R11. The lock is not reentrant

- **Decision**: `discardVaultWithoutWallets` takes no lock; its callers hold `withVaultWriteLock`.
- **Rationale**: `navigator.locks.request` with a name already held by the same document waits for the holder (`useAccountsMutationHelpers.ts:43-49`), and the React Native queue chains on the running write; calling the wrapper from inside `addAccount` would wait forever on both.

## R12. Testing a kill

- **Decision**: a `StorageAdapter` double passed to the real `initStorage({ platform: 'mobile', adapter })` (`storage/storage.ts:415-424`), as `test-utils/analytics.ts:17-30` already does. It counts each `setItem` / `removeItem` as one write, can throw at write N without applying it, and keeps a copy of the map after every write. A "kill after k" re-inits storage from copy k, clears the stash and mounts a fresh `useAccounts`, then unlocks.
- **Rationale**: the existing mutation tests mock the whole storage module (`hooks/useAccountsMutations.test.tsx:16-44`, `hooks/useAccounts.test.ts:19-50`) and the closest failure test makes encryption fail before any write (`useAccounts.test.ts` "aborts addAccount when encryptMnemonics throws"). Going through the real storage module keeps the tests on the code that ships. Since no change writes several keys in one call, "each record of a multi-record write counted separately" (FR-023) is every call.
- **On device**: Playwright and Maestro cannot make storage fail mid-save without a fault hook compiled into the app, which this plan does not add. Per-platform coverage is the screen tests (mocked `addAccount` rejecting or resolving) plus the existing setup flows (FR-024).

## R13. Other findings

- `writeStoredAccounts` records the ids as this window's own write before the write (`useAccountsMutationHelpers.ts:86-89`); if the write throws, the mark stays and a later list from another window with the same ids would be taken for this window's own and not re-read. The plan clears it on a throw.
- `persistAccount` runs `trackEvent` and resets after `addAccount` inside the same `try` that reports failure (`useAccountAddFlow.ts:466-486`, `:511-524`); a throw there would report a saved wallet as failed. The plan moves those steps out of the failure path (FR-015).
- An interrupted legacy migration (vault written, list not, `WALLETS` kept) stays at a lock screen with no wallets (`legacy-migration.ts:182-188`, `:357-371`). FR-006a correctly keeps its vault; fixing the stuck state is the legacy migration, out of scope.
