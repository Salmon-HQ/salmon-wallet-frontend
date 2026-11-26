# Tasks: Saving a wallet is all-or-nothing, and one secret is one wallet

**Input**: Design documents from `specs/046-atomic-wallet-save/`

**Prerequisites**: plan.md (revision of 2026-11-26), spec.md (owner decision of 2026-11-26: nothing is discarded automatically), research.md (R1–R10), data-model.md, contracts/accounts-mutations.md, quickstart.md

**Tests**: strict test-first, at the owner's request. Every behaviour task is preceded by its test task. A test task names the command that must be seen **failing** before its code task starts, and the same command passes after it. Cases the plan labels **G** (guard: passes today, kept) are written in the same task but are not claimed as red-first; they must pass on the first run, and a guard that fails is a finding to report, never a test to loosen.

**Node**: every command runs from the repository root after `export PATH="$HOME/Library/Application Support/Herd/config/nvm/versions/node/v24.21.0/bin:$PATH"`. Single test files run as `pnpm --filter <package> test <path relative to the package>` (Vitest for `@salmon/shared`, `@salmon/ui`, `@salmon/extension`; Jest for `@salmon/mobile`).

**Sensitive area** (constitution III): every commit from group A to group H touches vault and storage writes or the auth hosts; each commit body flags it for human sign-off. `packages/shared/src/crypto/` and `packages/shared/src/storage/` stay untouched in every group (checked in T045).

**Sweeps**: the fail-at-N cases use `failAt(n)` and the kill-after-N cases use `killAfter(n)` then `relaunch()` (T003a–T003b). Both iterate over the write log of a clean run of the same call (the double records every write), never over a hard-coded count, so the rows that later groups add (marks, the Seed Vault second vault write, the prune) join the sweeps automatically.

**Group gate** (named "group gate" below): `pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/ui --filter=@salmon/extension --filter=@salmon/mobile`, `pnpm check:dead-code`, `pnpm check:cycles`, `pnpm check:parity`, all green, then the commit with the pre-commit hook running. No export lands before its reader, because `check:dead-code` runs in the hook.

## Nine groups, nine commits

| Group | Phase | Commit                                                                                                  | Stories       |
| ----- | ----- | ------------------------------------------------------------------------------------------------------- | ------------- |
| A     | 1     | `fix(shared): wallet changes refuse contradictory reads and settle a thrown list write by reading back` | US1, US2, US5 |
| B     | 2     | `fix(shared): saving a wallet lands completely or not at all`                                           | US1, US2      |
| C     | 3     | `fix(shared): removing or editing a wallet changes the window only after the list is stored`            | US5           |
| D     | 4     | `fix(shared): one secret is one wallet, decided against storage`                                        | US3, US2      |
| E     | 5     | `fix(shared): backup-pending marks follow the stored wallets`                                           | US4           |
| F     | 6     | `fix(shared): Add wallet keeps one wallet id per input and reports a stored wallet as saved`            | US2, US3, US4 |
| G     | 7     | `fix: setup password screens reuse the wallet id and follow the save's result`                          | US2, US3, US6 |
| H     | 8     | `fix(extension): onboarding drops the phrase once saved, and a list reload waits for the write`         | US3, US6      |
| I     | 9     | `docs: wallet write order in ARCHITECTURE.md, and mobile mocks drop markUnconfirmed`                    | —             |
| J     | 10    | final verification, reviewers, e2e, PR to `staging`                                                     | —             |

**Two moves against plan.md §Commit order, and why.** (1) `addAccount`'s third parameter `replaces` is removed in group D, not earlier: until `findStoredClash` decides the Seed Vault replace from storage, dropping it would let a re-granted Seed Vault account be stored twice. The `unconfirmed` option arrives in group E with the marks. (2) `markUnconfirmed` leaves `PhraseBackupContext` in group G, with its last two callers (the setup screens); group F changes the context only to re-read and to lock `confirmBackup`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US6 from spec.md

---

## Phase 1: Group A — test tooling and the two rules (Rule 1 fail closed, Rule 2 read-back)

**Purpose**: the crash double and key-sensitive cipher (research R9), then Rules 1 and 2 and the password proof in the shared helpers, wired into today's add, remove and edit without reordering their writes. The tooling lands in this commit together with its first readers.

### Tooling

- [x] T001 [P] Write the double's own test, NEW `packages/shared/src/test-utils/crash-storage.test.ts`: `failAt(n)` throws and the snapshot is unchanged; `failAt(n, { applied: true })` lands, then throws; `failStashAt(n)` throws on the n-th stash write; `failRead(key)` throws, `dropRead(key)` returns `null`, `garbleRead(key)` makes `getStorageItem` return the raw unparseable string (`storage/storage.ts:339-348`); a snapshot after each write; `relaunch()` gives a fresh runtime through `vi.resetModules()` (the own-write mark reads false and the write queue is empty afterwards), `relaunch({ keepStash: true })` keeps `DERIVED_KEY`, plain `relaunch()` drops it; `keySensitiveCipher`: a vault sealed under key K opens only with K and throws `IncorrectPasswordError` with any other key, and two seals of the same vault differ (fresh nonce per seal). FR-023. Must fail first: `pnpm --filter @salmon/shared test src/test-utils/crash-storage.test.ts` → `Cannot find module "./crash-storage"`.
- [x] T002 NEW `packages/shared/src/test-utils/crash-storage.ts`: storage and stash double over the real `initStorage({ platform: 'mobile', adapter })` as `test-utils/analytics.ts:17-30` does, with the faults, snapshots, `relaunch` and `keySensitiveCipher` of T001 (research R9). FR-023. Done: the T001 command green; `pnpm --filter @salmon/shared typecheck` green. Depends on T001.
- [x] T003 (G) In `packages/shared/src/hooks/useAccountsMutations.test.tsx`, replace the cipher mock that opens any vault with any cached key (`:66`) with `keySensitiveCipher`. Guard: `pnpm --filter @salmon/shared test src/hooks/useAccountsMutations.test.tsx` green before and after; a case that passed only because any key opened any vault is reported, not loosened. FR-005. Depends on T002.

- [ ] T003a Extend `packages/shared/src/test-utils/crash-storage.test.ts`: `failRead(key, { at: n })`, `dropRead(key, { at: n })` and `garbleRead(key, { at: n })` fault only the n-th read of that key counted from arming, once, and every other read returns the stored value; without `at` they last until the next `startCrashStorage`, as built; `killAfter(n)`: the next n writes land, every later storage or stash write throws without landing, and `relaunch()` ends it (the snapshot after relaunch equals `writes[n-1].after` of that run). FR-023. Must fail first: `pnpm --filter @salmon/shared test src/test-utils/crash-storage.test.ts` → the read fault fires on every read, and `killAfter is not a function`. Depends on T003.
- [ ] T003b `packages/shared/src/test-utils/crash-storage.ts`: the `{ at: n }` option on the three read faults and `killAfter(n)` of T003a, nothing else. Done: the T003a command green; `pnpm --filter @salmon/shared typecheck` green. Depends on T003a.

**Test notes for every later task**: Vitest reports a missing module as "Cannot find module"; a seeded cached key carries a real `expiresAt` (`Date.now() + KEY_CACHE_TTL`); a test of the write lock across runtimes stubs `navigator` (`vi.stubGlobal`), since Node 24 provides `navigator.locks`.

### Rule 1, the password proof, Rule 2 — tests

T004–T007 write one NEW file, `packages/shared/src/hooks/useAccountsMutations.rules.test.tsx`, in order (same file: not parallel).

- [ ] T004 [US1] [US5] Rule 1 cases: dropped and garbled vault read on an add and on a removal while the list names A → rejects with a plain `Error`, no wallet record written (list, vault, counter, selection, marks), every entry intact, memory unchanged; vault and list both read absent while `COUNTER` is present → add and remove reject, nothing written; vault absent while `WALLETS` is present → add rejects; dropped list read while memory holds wallets, on add, remove and edit → rejects, nothing written; every Rule 1 message carries no id, address or secret. Guards (G): a list present but not an array stops add, remove and edit before any write (today `.filter` / `.findIndex` throw a `TypeError` first, `useAccountsMutations.ts:133`, `:213`, `:234`); a garbled vault beside an empty list is overwritten by a first save, as today, without the password proof; edit with a garbled vault proceeds (the edit never reads the vault); edit when the list lacks only that id returns as today. Also change the existing case "writes nothing when the wallet it edits is no longer stored" in `useAccountsMutations.test.tsx` to expect a rejection when the list reads empty (and keep today's result when it lacks only that id). FR-015a, FR-016, FR-017. Must fail first: `pnpm --filter @salmon/shared test src/hooks/useAccountsMutations.rules.test.tsx src/hooks/useAccountsMutations.test.tsx` → add and remove resolve and `salmon_mnemonics` / `salmon_accounts` are written (today's `{}` and `[]` fallbacks, `useAccountsMutationHelpers.ts:60-61`, `:105-107`). Depends on T003b.
- [ ] T005 [US1] Password proof and first-save stash: vault under P1, cached key valid, `addAccount(C, P2)` → `IncorrectPasswordError`, no wallet record written, one failed unlock recorded; the same for `removeAccount(B, P2)`; a standing penalty → `UnlockThrottledError`; stale onboarding window (a second runtime from `relaunch({ keepStash: true })` after the first finished setup with P1): P2 refused and counted once, P1 passes and the save lands against storage; no vault and a cached key for P1 (seeded with a real `expiresAt`) left by a first attempt whose vault write failed without landing, then `addAccount(C, P2)` → the vault opens with P2 only; `failStashAt` on that stash removal → rejects, nothing written. FR-005, FR-006. Must fail first: the T004 command → `addAccount(C, P2)` resolves with the vault still sealed under P1. Depends on T004.
- [ ] T006 [US1] [US2] [US5] Rule 2 cases: the list write applied then thrown on setup create (first save with a password), setup recover, Add wallet (same id), remove and edit → the read-back is equal and the call resolves; applied then thrown with only the read-back failing (`failRead('salmon_accounts', { at: n })`, n = the read-back, so the first list read passes) → rejects with the write's error, memory refreshed from storage shows the landed change, the own-write mark is cleared; not landed and only the read-back failing → memory refreshed equals the before-state; with a lasting `dropRead` or `failRead` on the list armed after the first read → the refresh leaves memory unchanged (`useAccountsLoader.ts:85-89` returns early on a null list); the refresh never calls `setError` or `setLocked` and writes nothing to storage (no selection write); `refreshFromStorage` itself failing → logged, the original error thrown, no global error set. FR-008, FR-015b. Must fail first: the T004 command → the applied-then-thrown cases reject instead of resolving. Depends on T005.
- [ ] T007 [US1] In the same file, a `describe` with `navigator` stubbed without `locks` (`vi.stubGlobal`) re-running the T004–T006 cases through the promise queue (`useAccountsMutationHelpers.ts:46-48`), plus (G) a non-reentrant fake lock around a first save → no deadlock. FR-011. Must fail first: the T004 command → the re-run red cases fail as in T004–T006; the deadlock guard passes. Depends on T006.

### Rule 1, the password proof, Rule 2 — code

- [ ] T008 [US1] [US2] [US5] In `packages/shared/src/hooks/useAccountsMutationHelpers.ts`: `readStoredList(memoryHoldsWallets)` replaces `readStoredAccounts`; `readStoredWallets(memoryHoldsWallets, password?)` replaces `readStoredSecrets` (P1 reads and Rule 1, vault conditions: unparseable while a wallet is listed, absent while the list names a wallet or `WALLETS` or `COUNTER` is present; P2: no vault key, or an unparseable vault with nothing listed → `{}` after dropping the stash `DERIVED_KEY`, and the password proof does not run on it; vault + password → `resolveMnemonicsWithPassword` with today's penalty and counting, vault without password → cached key else `EncryptionMaterialMissingError`); `writeStoredAccounts(list, { own })` with Rule 2 (compare `JSON.stringify`), clearing the own-write mark on a reject. In `packages/shared/src/hooks/useAccountsMutations.ts`: add, remove and edit call the new helpers, `own: true` for now (group B makes it conditional), write order unchanged; after a Rule 2 reject, once the lock is released, call `refreshFromStorage()`. In `packages/shared/src/hooks/useAccounts.ts:438`: pass `refreshFromStorage`, memory only: when the stash key is valid, `resolveMnemonicsWithCachedKey` then `loadAccounts(mnemonics, { persist: false })`; never `setError` or `setLocked` (unlike `unlockWithCachedKey`, `useAccountsSecurity.ts:276-280`); failure logged. In `packages/shared/src/hooks/useAccountsLoader.ts`: `loadAccounts` takes `{ persist?: boolean }` (default true) and skips its two selection writes (`:133-139`) when false. Call sites: `grep -rnw "readStoredSecrets\|readStoredAccounts\|writeStoredAccounts" packages apps` and check each. FR-005, FR-006, FR-008, FR-015a, FR-015b, FR-016, FR-017. Done: `pnpm --filter @salmon/shared test src/test-utils/crash-storage.test.ts src/hooks/useAccountsMutations src/hooks/useAccounts.test.ts` green. Depends on T007.
- [ ] T009 Group gate; commit T003a–T008 as group A's message (T001–T003 are already committed as `b0161b64`). Done: `git log -1 --stat` lists only `packages/shared` files. Depends on T008.

**Checkpoint A**: no mutation writes on a read that contradicts the rest; a thrown list write is settled; a supplied password must open the vault.

---

## Phase 2: Group B — `addAccount` write order (US1, US2)

**Goal**: plan.md §Add wallet C rows 2–7 (vault, **list**, memory, counter, selection); memory changes only after the list.

**Independent test**: the T010 sweeps.

- [ ] T010 [US1] [US2] NEW `packages/shared/src/hooks/useAccountsMutations.add.test.tsx`, asserting data-model.md invariants 1–4 at every position: (a) A and B listed, A active, add C: fail at each write (`failAt`) and kill after each write (`killAfter`, then `relaunch`; 0 to the last) → before the list: wallets, secrets, active wallet, slot, counter, password and memory as before; after it: wallets and entries as after, active = A (or C if its selection landed) on a held slot, counter right or one behind; then a same-id retry → one wallet, one entry. (b) First save: fail and kill at each position, a stash fault at P2, `relaunch` with and without `keepStash` → nothing deleted; killed before the list → the chosen password opens the vault; same-id retry → one wallet, one entry; retry with another password after a vault write that failed without landing → the vault opens under the new one. (c) Another secret stored under C's id → plain `Error`, nothing written, that entry intact. (d) Same-id retry after a reload already put C in memory → memory shows C once. (e) Kill between the list and the counter, then a save → counter = `max(counter, list length) + 1`; a same-id overwrite writes no counter. (f) A stale runtime adds C after another added D (`navigator` stubbed) → no own-write mark for that list. (g) The list write applied then thrown → resolves and the counter and selection rows run. (h) After a save, memory's counter equals the stored `COUNTER` (unchanged on a same-id overwrite). (i) A save that rejects after its vault landed (fail at the list, read-back absent) → `requiredLock` true in the same session. (j) Garbled raw vault key, nothing listed, a failing save → `requiredLock` stays false, and the original error is the one thrown even when the `getEncryptedStoredMnemonics` read also fails. (k) First save killed right after the list write (`killAfter`) → `COUNTER` present; with `COUNTER` absent before an add, `COUNTER` is written between the vault and the list, and a failure of that write is logged and the save goes on. Guards (G): vault with an absent list, `WALLETS`, a cleartext vault, each followed by a launch → nothing removed, nothing written at launch. Also change the existing `useAccounts.test.ts` case "aborts addAccount when encryptMnemonics throws…" to expect memory unchanged because memory now follows the list. FR-001–FR-008, FR-014, FR-016, FR-017. Must fail first: `pnpm --filter @salmon/shared test src/hooks/useAccountsMutations.add.test.tsx src/hooks/useAccounts.test.ts` → memory shows C after a fail at the vault write, the counter and selection are written before the list, and (j) sets `requiredLock` from any stored vault key. Depends on T009.
- [ ] T011 [US1] [US2] `addAccount` in `packages/shared/src/hooks/useAccountsMutations.ts`: P1–P3 and P5 of plan.md (P3: an entry under C's id that is not `isEqual` to C's stored secret rejects; equal → overwrite of its own entries); rows in order vault → list (`own` true only when memory's ids equal the stored ids after the save) → memory (held − C.id + C; C active; counter = the value the counter row stores; `requiredLock` when a password was given) → counter (`max(stored COUNTER ?? 0, stored list length) + 1`, skipped when C.id was already listed) → selection; failures after the list are logged and the call resolves; V1 = stored secrets + C, nothing removed; row 2a: when the stored `COUNTER` is absent, write the counter value between the vault and the list, best effort; in the reject path, `setRequiredLock(true)` only when `getEncryptedStoredMnemonics()` returns a vault, that read wrapped so its failure never hides the original error (red-first cases T010 (i)–(k)). FR-001–FR-008, FR-014, FR-016, FR-017. Done: the T010 command and `pnpm --filter @salmon/shared test src/hooks/useAccountsMutations` green. Depends on T010.
- [ ] T012 Group gate; commit T010–T011 as group B's message. Depends on T011.

---

## Phase 3: Group C — removal, edit and "Remove all" (US5)

**Goal**: plan.md §Remove wallet B, §Edit wallet, `clearAll` order.

- [ ] T013 [US5] NEW `packages/shared/src/hooks/useAccountsMutations.remove.test.tsx`: remove B (non-active, then active): fail at each write and kill after each → memory follows the list (R); every listed id has its entry and unlocks, and the active wallet is listed on a held slot (G); the vault write throws → rejects with B gone from memory and list and its entry unlisted (R; change the existing `useAccounts.test.ts` case "never leaves a listed wallet without its secret when removeAccount stops between its writes" to this). Remove all: a stash fault and each storage write failing (`failAt`) or killed (`killAfter`) → the stash key leaves before storage (R) and memory is cleared first (G). Edit: fail at the list write, kill after it → memory and the next launch agree, and a failed rename shows the old name (R). Reset order: `COUNTER`, `WALLETS`, `ACTIVE`, `ENDPOINTS`, `ACCOUNT_ID`, `NETWORK_ID`, `PATH_INDEX`, then `ACCOUNTS`, `MNEMONICS`, then `TRUSTED_APPS`, `CUSTOM_TOKENS`, `CONNECTION` (R); with a fixture that also holds a `WALLETS` record, a reset killed after each of its writes, then setup → setup succeeds, never refused by Rule 1 (R: today `WALLETS` outlives the vault; the `COUNTER`-only part is G, since `COUNTER` already goes first); stopped after the small keys → the wallets still load (G). FR-001, FR-002, FR-007, FR-009, FR-016, FR-017. Must fail first: `pnpm --filter @salmon/shared test src/hooks/useAccountsMutations.remove.test.tsx src/hooks/useAccounts.test.ts` → memory drops B before the list write, `DERIVED_KEY` is removed after `clearAccountsStorage`, and setup is refused after a reset stopped with `WALLETS` left. Depends on T012.
- [ ] T014 [US5] In `packages/shared/src/hooks/useAccountsMutations.ts`: `removeAccount` writes list → memory → selection (first wallet of the new list that memory holds; failures logged) → vault → Seed Vault release; `editAccount` sets memory after the list; `clearAll` clears memory, then the stash `DERIVED_KEY`, then `clearAccountsStorage()`, then Seed Vault releases; in `packages/shared/src/hooks/useAccountsMutationHelpers.ts`, `clearAccountsStorage` removes `COUNTER`, `WALLETS`, `ACTIVE`, `ENDPOINTS`, `ACCOUNT_ID`, `NETWORK_ID`, `PATH_INDEX`, then `ACCOUNTS`, `MNEMONICS`, then the rest (its only caller: `grep -rn clearAccountsStorage packages apps`). FR-001, FR-002, FR-007, FR-009, FR-017. Done: the T013 command and `pnpm --filter @salmon/shared test src/hooks/useAccountsMutations src/hooks/useAccountRemoval.test.tsx` green. Depends on T013.
- [ ] T015 Group gate; commit T013–T014 as group C's message. Depends on T014.

---

## Phase 4: Group D — duplicate rule and Seed Vault replace, against storage (US3, US2)

**Goal**: plan.md §Duplicate rules and §Seed Vault replace; `replaces` leaves `addAccount`.

- [ ] T016 [P] [US3] NEW `packages/shared/src/utils/stored-clash.test.ts`, the plan's duplicate-rule list and the contract's vectors: phrase at its listed start with other spacing → refused (R); phrase at another start (derived) → saved (G); held non-starting position → refused (R); phrase whose Solana address a watched, private-key or Seed Vault wallet holds → saved (G, the three cross-kind cases); private key or watched address held by any listed wallet, decided from storage with memory empty → refused (R); key for a listed phrase's Solana address with the network catalog mocked to throw → refused, no network call (R); phrase holding only Bitcoin index 4 does not refuse the key at Solana index 4 (R); a null index, a missing entry, an invalid phrase and an undecodable key are skipped while the wallet's other indexes are still compared (R); own id excluded (R); Seed Vault returns every listed Seed Vault wallet with that address to replace, and nothing else (R); `DuplicateAccountError`'s message carries no secret, address or id. FR-010–FR-013. Must fail first: `pnpm --filter @salmon/shared test src/utils/stored-clash.test.ts` → `Cannot find module "./stored-clash"`.
- [ ] T017 [US3] NEW `packages/shared/src/utils/stored-clash.ts` (`findStoredClash(account, list, secrets)`, pure, mirrors `collectSolanaAddresses` on storage, `clearSeedCache()` after) and `DuplicateAccountError` in `packages/shared/src/hooks/useAccountsMutationHelpers.ts`. The barrel export of `DuplicateAccountError` waits for its first reader outside `packages/shared/src/hooks` (T034). FR-010–FR-013. Done: the T016 command green. Depends on T016.
- [ ] T018 [US3] [US2] Add to `packages/shared/src/hooks/useAccountsMutations.add.test.tsx` (same file as T010: after it): Seed Vault replace with two listed Seed Vault wallets for C's address, known only to storage: fail (`failAt`) and kill (`killAfter`, then `relaunch`) at each write → one wallet, every listed id has its entry at every position, the vault without them written after the list, each access token released only when no stored wallet uses it (R); two runtimes (`navigator` stubbed), the stale one adds W that the other added → `DuplicateAccountError`, nothing stored twice (R); read-back fails, then a new id adds the same phrase → `DuplicateAccountError`, one wallet (R); vault entries (G, today's behaviour kept): an unlisted exact copy stays, the same phrase with other spacing stays, another phrase stays; with `dropRead('salmon_accounts')` and memory empty, a listed wallet's entry stays; (G) no network request during `addAccount`. Change the existing cases that pass `replaces`: `useAccounts.test.ts` "replaces a wallet in one write instead of keeping both" (the replace now comes from storage) and `useAccountAddFlow.test.tsx:247`, `:362`, `:377` (`addAccount` called without a third argument). FR-010, FR-011, FR-013, FR-014, FR-016, FR-017. Must fail first: `pnpm --filter @salmon/shared test src/hooks/useAccountsMutations.add.test.tsx src/hooks/useAccounts.test.ts src/hooks/useAccountAddFlow.test.tsx` → the stale runtime stores W twice and the Seed Vault wallets are not replaced. Depends on T011, T017.
- [ ] T019 [US3] [US2] In `packages/shared/src/hooks/useAccountsMutations.ts`: P4 (`findStoredClash` excluding C's id) and the `Ss` handling (V1 before the list, V2 and the release after it), memory = held − `Ss` ids − C.id + C; `replaces` removed from the `addAccount` type in `useAccountsMutations.ts:41` and `useAccounts.ts:119`; `packages/shared/src/hooks/useAccountAddFlow.ts:470-476` drops the memory Seed Vault lookup and passes no third argument. Call sites: `grep -rn "addAccount(" packages apps --include='*.ts' --include='*.tsx'` and check each of `useAccountAddFlow.ts`, `useDerivedAccountsScan.ts:343`, `PasswordPage.tsx:192`, `password.tsx:322`. FR-010–FR-014, FR-016, FR-017. Done: the T018 command green. Depends on T018.
- [ ] T020 Group gate; commit T016–T019 as group D's message. Depends on T019.

---

## Phase 5: Group E — backup-pending marks (US4)

- [ ] T021 [US4] Add to `packages/shared/src/hooks/useAccountsMutations.add.test.tsx` (after T018), each "kept" case in the same run as a stale mark being pruned: `addAccount(C, pw, { unconfirmed: true })` killed right after the list (`killAfter`) → C marked after relaunch, and the next save prunes the stale mark; a `derivedFrom` mark kept; a concurrent window's mark for a listed wallet kept; prune writes nothing when nothing is stale (no write to `salmon_unconfirmed_phrases`); a failing prune write never rejects; a save failing before the list keeps its mark (not taken back); retries of the same setup (fail at the vault, retry same id) → exactly one mark. FR-018, FR-019. Must fail first: `pnpm --filter @salmon/shared test src/hooks/useAccountsMutations.add.test.tsx` → C unmarked (the option is ignored) and the stale mark kept. Depends on T019.
- [ ] T022 [US4] `AddAccountOptions { unconfirmed?: boolean }` as the third `addAccount` parameter (`useAccountsMutations.ts:41`, `useAccounts.ts:119`); row 1 marks C before the vault when `unconfirmed`; `pruneMarks(list)` in `packages/shared/src/hooks/useAccountsMutationHelpers.ts`, run as the last row, best effort, writing only when a mark is removed. FR-018, FR-019. Done: the T021 command and `pnpm --filter @salmon/shared test src/hooks/useAccountsMutations` green. Depends on T021.
- [ ] T023 Group gate; commit T021–T022 as group E's message. Depends on T022.

---

## Phase 6: Group F — shared callers (US2, US3, US4)

- [ ] T024 [P] [US2] [US3] In `packages/shared/src/hooks/useAccountAddFlow.test.tsx`: the same id and avatar across confirm attempts and through re-auth (`confirmReauth`); kept across renders that return fresh import objects with the same values (`useImportPrivateKey.ts:110-121`), and kept on a rename; both renewed when the trimmed phrase, the private key string, the watched address string, the Seed Vault address + path + token, the derived position or, for a derived account only, the active wallet's id changes; the account rebuilt on each attempt (factory called each time); `DuplicateAccountError` reaches `onFailure` with `wallet.import.errors.duplicate`, and with `wallet.watchOnly.errors.duplicate` for a watched address; follow-ups that throw (analytics, resets, `onPersisted`) never reach `onFailure`. FR-012, FR-014, FR-015, FR-022. Must fail first: `pnpm --filter @salmon/shared test src/hooks/useAccountAddFlow.test.tsx` → a new id on the second attempt, and `onFailure` called by a throwing `onPersisted`. Depends on T023.
- [ ] T025 [US2] [US3] `packages/shared/src/hooks/useAccountAddFlow.ts`: id and avatar kept in a ref keyed on a value string built from the trimmed phrase, the private key, the watched address, the Seed Vault address + path + token, the derived position and (derived only) the active wallet's id, not the name, passed to the factories' `id` / `avatar` options; follow-ups moved out of the `try` that reports failure (`:466-486`, `:511-524`); the duplicate message per kind. FR-012, FR-014, FR-015. Done: the T024 command green. Depends on T024.
- [ ] T026 [P] [US4] In `packages/shared/src/contexts/PhraseBackupContext.test.tsx`: the provider shows `needsBackup` after `addAccount(…, { unconfirmed: true })` without remounting (re-read when the listed ids change); `confirmBackup` issued while a save holds the write lock and prunes a stale mark → afterwards the confirmed wallet is unmarked and the stale mark gone. FR-018, FR-019. Must fail first: `pnpm --filter @salmon/shared test src/contexts/PhraseBackupContext.test.tsx` → `needsBackup` false, and the prune's write undoes the confirmation (or the reverse). Depends on T023.
- [ ] T027 [US4] `packages/shared/src/contexts/PhraseBackupContext.tsx`: re-read `salmon_unconfirmed_phrases` when the listed ids change; `confirmBackup`'s read-modify-write runs inside `withVaultWriteLock` (imported from the helpers, not the barrel). `markUnconfirmed` stays until T034. FR-018, FR-019. Done: the T026 command green. Depends on T026.
- [ ] T028 [US2] `packages/shared/src/hooks/useDerivedAccountsScan.ts:343` calls `addAccount(account)` with no options (a derived wallet is never `unconfirmed`); change it only if typecheck asks. Add to `useDerivedAccountsScan.test.tsx` (G): an item refused with `DuplicateAccountError` is logged, no message is shown, and the queue moves on to the next item (today's handling, `:331-354`). Done: `pnpm --filter @salmon/shared typecheck` and `pnpm --filter @salmon/shared test src/hooks/useDerivedAccountsScan.test.tsx` green. Depends on T025.
- [ ] T029 Group gate; commit T024–T028 as group F's message. Depends on T025, T027, T028.

---

## Phase 7: Group G — the two setup screens (US2, US3, US6)

- [ ] T030 [P] [US2] [US3] `packages/ui/src/components/AuthFlow/PasswordPage.test.tsx`: after a failed save the retry calls `addAccount` with the same id and avatar; create passes `{ unconfirmed: true }`, recover does not, and `markUnconfirmed` is never called; `DuplicateAccountError` → "This wallet is already in your list."; `IncorrectPasswordError` → the invalid-password copy; `UnlockThrottledError` → the throttle copy via `passwordCheckErrorKey`; (G) after a resolved save nothing shows an error (only `void trackOnboardingEvent` follows, `:192-201`). FR-005, FR-012, FR-014, FR-018, FR-022. Must fail first: `pnpm --filter @salmon/ui test src/components/AuthFlow/PasswordPage.test.tsx` → a new id on retry and the generic error text.
- [ ] T031 [US2] [US3] `packages/ui/src/components/AuthFlow/PasswordPage.tsx`: id and avatar picked on the first submit and kept in a ref; `addAccount(account, password, { unconfirmed: flowType === 'create' })`; `markUnconfirmed` call (`:79`, `:191`, `:218`) removed; the three error mappings. Done: the T030 command green. Depends on T030.
- [ ] T032 [P] [US6] [US2] `apps/mobile/__tests__/app/password.test.tsx`: the phrase put back on leaving after a rejected save (G); after a resolved save the phrase is cleared at once and not put back on unmount, and no second `addAccount` runs (R); `unlockAccounts` mocked resolving `false` (it never throws) → enrolment skipped, no recovery error, the route `'/(app)/(tabs)'` parked (R); the enrolment hand-off or analytics throwing → no recovery error, `'/(auth)/biometric-setup'` parked (R); the same id and avatar on retry (R); create without Seed Vault passes `{ unconfirmed: true }` (R); the three messages (R). FR-012, FR-014, FR-015, FR-018, FR-020, FR-021. Must fail first: `pnpm --filter @salmon/mobile test __tests__/app/password.test.tsx` → `unlockAccounts` resolving false still parks `'/(auth)/biometric-setup'`, a throwing enrolment hand-off shows the recovery error, and a new id on retry.
- [ ] T033 [US6] [US2] `apps/mobile/app/(auth)/password.tsx`: `walletAddedRef` (`:140-149`) removed; the owed-phrase ref cleared and `setMnemonic(null)` on the line after `addAccount` resolves; unmount puts back only what the owed ref still holds; the follow-ups (`setPendingSeedVaultSelection`, `unlockAccounts`, analytics, enrolment hand-off; `:323-355`) moved out of the `try` that shows the recovery error, branching on the boolean `unlockAccounts` returns (true → biometric setup; false → enrolment skipped, straight to the app, unlocked in that session on a fresh install); analytics or enrolment failures logged without changing the route; id and avatar ref; options; the `markUnconfirmed` call (`:119`, `:321`, `:377`) removed; the three error mappings. Done: the T032 command green. Depends on T032.
- [ ] T034 [US4] `markUnconfirmed` removed from `PhraseBackupValue`, `NONE` and the provider in `packages/shared/src/contexts/PhraseBackupContext.tsx` (same file as T027: after it), and its case in `PhraseBackupContext.test.tsx:104`; `DuplicateAccountError` exported from `packages/shared/src/hooks/index.ts` now that both screens import it. Done: `grep -rn markUnconfirmed packages apps/mobile/app apps/extension` prints nothing (only the 13 mobile mocks of T040 still name it); `pnpm --filter @salmon/shared test src/contexts/PhraseBackupContext.test.tsx` green. Depends on T031, T033.
- [ ] T035 Parity: `node -e "import('./scripts/check-dom-parity.mjs').then(m => console.log(m.cloneLines(process.cwd())))"` prints `crossPlatform` ≤ 2248 and `sameSide` ≤ 870 (plan baseline), and `pnpm check:parity` prints `0 findings`. A rise means logic copied into both twins: hoist it into `packages/shared`, never raise a ceiling. Depends on T034.
- [ ] T036 Group gate plus `pnpm check:i18n` (no new key); commit T030–T035 as group G's message. Depends on T035.

---

## Phase 8: Group H — extension host `App.tsx` (US3, US6)

- [ ] T037 [US3] [US6] `apps/extension/src/entrypoints/popup/App.test.tsx`: after the password page's success the phrase is gone from App state (`authData` cleared; the success and consent steps still render); the list listener's `reloadWallets` waits for a write turn in flight (lock held → `unlockWithCachedKey` not called until it is released); a stale window that adds C after another window added D reloads after the barrier and shows D, with C active. FR-011, FR-021. Must fail first: `pnpm --filter @salmon/extension test src/entrypoints/popup/App.test.tsx` → `authData` still holds the phrase and the reload runs while the lock is held.
- [ ] T038 [US3] [US6] `apps/extension/src/entrypoints/popup/App.tsx`: `handlePasswordSuccess` (`:375-377`) also clears `authData` (`:201`); `reloadWallets` (`:245-248`) first awaits `withVaultWriteLock(async () => undefined)`; `withVaultWriteLock` exported from `packages/shared/src/hooks/index.ts` (its first barrel reader). FR-011, FR-021. Done: the T037 command and `pnpm --filter @salmon/extension test src/entrypoints/popup/useLockAcrossWindows.test.ts` green. Depends on T037.
- [ ] T039 Group gate; commit T037–T038 as group H's message. Depends on T038.

---

## Phase 9: Group I — mocks and documentation

- [ ] T040 [P] Remove `markUnconfirmed: async () => {}` from the 13 mobile mocks: `apps/mobile/__tests__/app/app-lock.test.tsx`, `__tests__/app/developer-mode-scope.test.tsx`, `__tests__/app/password.test.tsx`, `__tests__/app/stack-transitions.test.tsx`, `__tests__/home-balance-load-error.test.tsx`, `__tests__/home-subtabs.test.tsx`, `__tests__/home-task-engaged-content.test.tsx`, `__tests__/home-token-list-fold.test.tsx`, `__tests__/root-layout.test.tsx`, `src/components/BackupPanel/BackupPanel.test.tsx`, `src/mwa/MwaRequest.analytics.test.tsx`, `src/mwa/MwaRequest.test.tsx`, `src/mwa/MwaRoot.test.tsx`. Done: `grep -rn markUnconfirmed apps packages` prints nothing; `pnpm --filter @salmon/mobile typecheck` green. Depends on T039.
- [ ] T041 [P] `docs/ARCHITECTURE.md:42` (in Spanish, as the file is): one sentence on the write order — the wallet list is the write that decides; a save writes the vault before the list, a removal the list before the vault; a change refuses to write on a read that contradicts the rest. Done: `npx prettier --check docs/ARCHITECTURE.md`. Depends on T039.
- [ ] T042 Group gate; commit T040–T041 as group I's message. Depends on T040, T041.

---

## Phase 10: Group J — final verification, reviewers, e2e, PR

Raw output goes to the session scratchpad; the PR body carries each command and its exit code.

### 1. Unit suites and gates

- [ ] T043 Unit suites, each green: `pnpm --filter @salmon/shared test`, `pnpm --filter @salmon/ui test`, `pnpm --filter @salmon/extension test`, and the mobile suite run alone: `cd apps/mobile && pnpm test`.
- [ ] T044 `pnpm typecheck`, then `pnpm lint` (zero errors, zero warnings).
- [ ] T045 Each green: `pnpm test:security`, `pnpm check:parity` (`0 findings`), `pnpm check:i18n`, then `git diff --name-only feat/045-bitcoin-network-choice... | xargs pnpm exec prettier --check --ignore-unknown`, `pnpm check:no-secrets`, `pnpm check:hidden-unicode`, `pnpm check:dead-code`, `pnpm check:cycles`, `pnpm check:single-kit`, `pnpm check:e2e-selectors`; `pnpm --filter @salmon/extension build && pnpm check:manifest` shows no permission change; `pnpm test:coverage`, raising `thresholds` (`packages/shared`, `packages/ui` Vitest configs) and `coverageThreshold` (`apps/mobile` Jest config) where coverage went up; `git diff --stat feat/045-bitcoin-network-choice... -- packages/shared/src/crypto packages/shared/src/storage` prints nothing.

### 2. Reviewers (zero context, on the last commit)

- [ ] T046 The main session runs `security-reviewer` (with the `web3-security-review` skill), `typescript-reviewer` and `expo-react-native-expert` on `git diff feat/045-bitcoin-network-choice...` once T043–T045 are green and nothing else is going in. They get the code and the spec, not this plan's conclusions.
- [ ] T047 Each accepted finding fixed test-first (a failing test that reproduces it, then the fix), committed as `fix: …`; T043–T045 re-run green. Declined findings listed in the PR body with the reason.

### 3. End-to-end (FR-024)

- [ ] T048 Playwright headless: `pnpm --filter @salmon/extension build`, then `SALMON_E2E_HEADLESS=1 pnpm --filter @salmon/extension e2e onboarding-grid settings analytics-consent-prompt legacy-migration lock auto-lock` green against a reachable salmon-api (a skip does not count).
- [ ] T049 Maestro on the iPhone simulator (by UDID), from `apps/mobile/.maestro/`: `./run.sh flows/smoke/auth/create-account.yaml`, `./run.sh flows/smoke/auth/recover-account.yaml`, `./run.sh flows/actions/account/import-seed.yaml`, `./run.sh flows/actions/account/add-and-remove.yaml`, `./run.sh flows/actions/reset/remove-all-wallets.yaml`, each green; screenshots read, none showing a seed or a password.
- [ ] T050 Maestro on the Android emulator: the same five flows green; on the Seeker emulator `./run.sh flows/actions/seed-vault/onboard-with-seed-vault.yaml` and `./run.sh flows/actions/seed-vault/add-seed-vault-wallet.yaml` green (FR-013 in setup and Add wallet).
- [ ] T051 Hand test, quickstart.md §3 steps 1–7 (step 1 on two extension side panels, step 7 on a Seeker). On a real phone the owner taps and Claude only reads screenshots. Results in the PR body.

### 4. Pull request

- [ ] T052 PR from `fix/046-atomic-wallet-save` to `staging`, stacked on `feat/045-bitcoin-network-choice` (while 045 is unmerged, open it with base `feat/045-bitcoin-network-choice` and retarget to `staging` once 045 merges, so the diff shows only this work); title `fix: saving a wallet is all-or-nothing, and one secret is one wallet`; body through the `pr` skill: what changed, T043–T051 evidence, the parity count, the two plan questions on their defaults, the known limitations (plan.md §Known limitations), and the human sign-off request for Rules 1–2, the write orders, the password proof, the own-id rule and the fixed id (quickstart.md §4). Only the owner merges.

---

## Dependencies

- Group A: T001 → T002 → T003 (done, `b0161b64`) → T003a → T003b → T004 → T005 → T006 → T007 → T008 → T009.
- Group B (after T009): T010 → T011 → T012.
- Group C (after T012): T013 → T014 → T015.
- Group D (after T015): T016 → T017; T018 ← (T011, T017) → T019 → T020.
- Group E (after T020): T021 → T022 → T023.
- Group F (after T023): T024 → T025 → T028; T026 → T027; T029 ← (T025, T027, T028).
- Group G (after T029): T030 → T031; T032 → T033; T034 ← (T031, T033) → T035 → T036.
- Group H (after T036): T037 → T038 → T039.
- Group I (after T039): T040, T041 → T042.
- Group J after T042, in order: T043 → T044 → T045 → T046 → T047 → T048 → T049 → T050 → T051 → T052.

## Same file, never in parallel

- `crash-storage.test.ts` and `crash-storage.ts`: T003a, T003b.
- `useAccountsMutations.rules.test.tsx`: T004–T007.
- `useAccountsMutations.add.test.tsx`: T010, T018, T021.
- `useAccountsMutations.ts`: T008, T011, T014, T019, T022.
- `useAccountsMutationHelpers.ts`: T008, T014, T017, T022.
- `useAccounts.ts`: T008, T019, T022. `useAccountsLoader.ts`: T008. `useAccounts.test.ts`: T010, T013, T018.
- `useAccountsMutations.test.tsx`: T003, T004.
- `useAccountAddFlow.ts`: T019, T025. `useAccountAddFlow.test.tsx`: T018, T024.
- `PhraseBackupContext.tsx` and its test: T026, T027, T034.
- `packages/shared/src/hooks/index.ts`: T034, T038.
- `apps/mobile/__tests__/app/password.test.tsx`: T032, T040.

## Parallel examples

- Group F: T024 with T026.
- Group G: T030 with T032, then T031 with T033.
- Group I: T040 with T041.

## Implementation strategy

1. Group A: the double and the two rules; no reordering yet, so the riskiest change (refusing to write) is reviewed alone.
2. Groups B and C: the write orders of save, removal, edit and "Remove all"; memory follows storage.
3. Group D: duplicates and Seed Vault decided against storage; `replaces` leaves.
4. Group E: marks written before the vault and pruned after the list.
5. Groups F, G, H: the callers, the setup twins and the extension host; parity measured in G.
6. Group I: the mocks and the one-sentence doc.
7. Group J in the owner's order: suites and gates, zero-context reviewers, fixes, Playwright headless, Maestro on the iPhone simulator then the Android emulator, hand test, PR to `staging`.
