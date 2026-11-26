# Feature Specification: Saving a wallet is all-or-nothing, and one secret is one wallet

**Feature Branch**: `fix/046-atomic-wallet-save`

**Created**: 2026-11-26

**Status**: Draft — owner decision of 2026-11-26: nothing is ever discarded automatically (question 1); questions 2 to 5 stand on their recommended default, marked as assumptions

**Input**: The owner asked to close the partial-save defect properly: "Close it properly, no patches, rebuild what needs rebuilding, with test-driven development, spec and adversarial doubt." Security is this product's first priority: Salmon is a self-custody wallet (the user alone holds the keys that control the funds).

## Why this exists

When Salmon saves a new wallet it writes several separate records on the device, one after another: the encrypted vault (the locked box that holds every recovery phrase and private key), a counter used to number wallet names, the "active wallet" selection, and the list of wallets. Today it also updates what the open window shows before any of those writes has succeeded.

If one of those writes fails, or the app or browser is closed in the middle, the wallet ends up half saved. The screen can show a wallet that the device never stored. The vault can keep a secret that no wallet in the list owns, which nothing ever shows or removes. The next launch can open on a network or account slot chosen for a wallet that does not exist. And because every retry builds the wallet afresh, pressing the button again can store the same recovery phrase twice, so the user sees two wallets with the same balance and cannot tell which one to use.

A wallet that loses track of which keys it holds, or shows the same funds twice, has failed at its one job. This feature makes every save, removal and edit of a wallet land completely or not at all, as the user sees it, on the extension, on iPhone and on Android.

## What exists today

These facts, read in the code and in the platforms' own sources on 2026-11-26, shape the requirements below.

- **One save is several writes.** Saving a new wallet writes, in order: the vault, the name counter, the active selection (three records: wallet, network, account slot), and last the wallet list. The window's own view (its list of wallets, the active wallet, the counter) changes before the first of those writes.
- **The list decides what the user sees.** At launch, only wallets named in the list are built. A secret in the vault that the list does not name is invisible.
- **Unlisted secrets are carried forever.** Every later save or removal re-encrypts the vault with every secret it holds, listed or not. Removing a wallet deliberately writes the list before the vault, so a stop in between keeps one secret too many rather than listing a wallet with no secret, and an existing test pins that a removal never deletes a secret the list no longer names. This "never destroy key material as a side effect" rule stands.
- **A retry is a different wallet.** Every attempt builds the wallet with a new random identifier, on both setup password screens (extension and mobile) and in the "Add wallet" flow.
- **Duplicates are only partly refused.** Importing a private key or watching an address that the wallet already holds is refused with "This wallet is already in your list." That check reads the open window's memory, which can be out of date when another extension window changed the wallets, and a locked window holds no addresses at all. A recovery phrase that is already in the wallet is never refused, and a derived account (another account from the same recovery phrase, at a different position) that is already a wallet of its own is not refused either. A Seed Vault account (Solana Seeker phones) that is already listed is replaced by the new one, judged on the window's memory, and only in the "Add wallet" flow.
- **The "backup pending" mark is written first.** A wallet created during setup without confirming its recovery phrase is recorded in a "backup pending" list, so its first transaction asks the user to confirm the phrase. That mark is written before the wallet is saved; a failed save leaves the mark of a wallet that does not exist, and each retry adds another.
- **The mobile password screen keeps its own "was it saved" flag.** It uses that flag to decide whether to put the recovery phrase back in memory for the previous screen when the user leaves. The flag is set only after the save reports success, so it can disagree with what the device stored.
- **Removing and editing a wallet have the same shape.** Both change the window's view before the device has stored the change.
- **A failed first save locks the user out of setup.** If the very first save stops after the vault write, the next launch finds a vault and treats the device as an existing, locked wallet: it shows the lock screen (or asks for an "existing" password) with no wallet behind it, and the only way out is "Forgot password", which erases everything.
- **No test makes a write fail halfway.** The closest existing test makes encryption fail before anything is written.
- **The platforms only promise single-record writes.** The device storage the wallet uses offers single-record read, write and delete. On the extension (Chrome's local extension storage) a write of several records goes through as one batch in Chromium's source code (`components/value_store/leveldb_value_store.cc`), but Chrome's documentation does not promise it. On Android, the storage library (AsyncStorage 2.2.0) writes several records in one database transaction (`AsyncStorageModule.java`). On iPhone, the same library writes several records one file at a time with no rollback (`RNCAsyncStorage.mm`), so a process killed mid-write leaves some records new and others old. The only write that is all-or-nothing on every platform is one record.
- **The area is sensitive.** The repository's architecture guide (`docs/ARCHITECTURE.md`) marks key material, vault encryption and storage as an area that is not changed without human sign-off.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - A failed or interrupted save leaves the wallet exactly as it was (Priority: P1)

A user creates or recovers a wallet, or adds one from the wallet switcher. Something goes wrong while it is being saved: a write fails, or the phone kills the app, or the browser closes. The user sees an error, or opens the app again later. Either way, the wallets, the active wallet, its network and account slot, and the password are exactly what they were before the attempt, and the user can try again.

**Why this priority**: a half-saved wallet is the root of every other defect here; nothing else can be right while this is wrong.

**Independent Test**: in the shared logic's test suite, make the device storage fail at each write of a save in turn, and separately leave storage as it would be after the app dies between each pair of writes, then load the wallet afresh. In every case the wallet list, active wallet, network, slot, name counter and password match the state before the attempt, and a retry saves the wallet.

**Acceptance Scenarios**:

1. **Given** a device with wallets A and B and A active, **When** a save of wallet C fails at any write, **Then** the open window still shows A and B with A active, on the same network and slot, and the next launch shows the same.
2. **Given** the same device, **When** the app or browser dies between any two writes of the save of C, **Then** the next launch shows either A and B exactly as before, or A, B and C fully saved — never a state in between (C half there, A opened on a slot chosen for C, a skipped wallet number).
3. **Given** a fresh install, **When** the very first save fails or is interrupted after the vault was written, **Then** nothing is deleted: the password chosen in that attempt is the one that opens the device, a repeated setup with that password saves the wallet. Where the device offers "Forgot password" today (the extension's lock screen), it remains the other way out.
4. **Given** a failed save, **When** the user retries with the same input, **Then** the wallet is saved once, and the user sees it.
5. **Given** a failed save, **When** the user enters their password at the next unlock, **Then** the password that worked before the attempt still works.

---

### User Story 2 - One secret is one wallet, whatever the user retries (Priority: P1)

A user's save fails and they press the button again; or the save succeeded but a later step of the same screen failed and showed an error, and they press again. They end up with exactly one wallet for that recovery phrase, never two.

**Why this priority**: two wallets with the same balance make "which one do I send from" unanswerable, and every duplicate also carries a duplicate copy of the secret in the vault.

**Independent Test**: on each of the three platforms' setup flows and in the shared tests, fail the save at each position, retry; then let the save succeed and fail the step after it, retry. Count wallets for that phrase: always one.

**Acceptance Scenarios**:

1. **Given** a save that failed at any position, **When** the user retries, **Then** exactly one wallet holds that recovery phrase at that position.
2. **Given** a save that succeeded and a later step on the same screen that failed, **When** the user presses the button again, **Then** no second wallet is stored.
3. **Given** a save that succeeded but whose success never reached the screen (a follow-up write failed after the wallet was stored), **When** the user looks at the wallet, **Then** the save is reported as done, not as an error.

---

### User Story 3 - Adding a wallet the device already holds is refused (Priority: P1)

A user tries to add a wallet they already have: the same recovery phrase, the same derived account, a private key for an address the wallet already holds, or an address they already watch. Salmon tells them "This wallet is already in your list." and stores nothing. This holds in every way of adding a wallet, and it holds even when another extension window added that wallet a moment ago.

**Why this priority**: the duplicate guard has to decide on what the device stores, or a second window, a locked window, or a retry slips past it.

**Independent Test**: for each entry point (setup create and recover, "Add wallet" with an imported phrase, a derived account, a private key, a watched address, and Seed Vault), try to add a wallet that storage already holds while the window's memory does not know it (a second window added it). The attempt is refused, or for Seed Vault the wallet is replaced; storage and memory are unchanged except for that replacement.

**Acceptance Scenarios**:

1. **Given** a listed wallet from recovery phrase P, **When** the user recovers or imports P again at the same starting position, **Then** the save is refused with "This wallet is already in your list." and nothing is stored.
2. **Given** a listed derived wallet at position 3 of phrase P, **When** the user picks position 3 of P again from the derived-account list, **Then** it is refused with the same message.
3. **Given** a listed wallet that holds address X, **When** the user imports a private key for X or watches X, **Then** it is refused with the existing duplicate message, judged on what storage holds, not only on the window's memory.
4. **Given** another extension window added wallet W after this window loaded, **When** this window tries to add W, **Then** it is refused, nothing is stored twice, and this window shows W once it reloads.
5. **Given** a listed Seed Vault wallet for address S, **When** the user adds address S again from Seed Vault (for example after re-granting access), **Then** the listed wallet is replaced by the new one in the same save, never duplicated, judged on what storage holds; this applies to setup as well as "Add wallet".

---

### User Story 4 - The "backup pending" mark matches the wallets that exist (Priority: P2)

A wallet created without confirming its recovery phrase is always marked "backup pending", so its first transaction asks the user to confirm the phrase. A save that fails leaves no mark behind.

**Why this priority**: an unmarked new wallet would never ask for its phrase to be confirmed — a fund-loss risk if the user did not write it down — while stale marks are clutter with no visible effect. Getting the first right matters more than the second.

**Independent Test**: fail the setup save at each position and kill it between each pair of writes; after each, the "backup pending" list names only listed wallets. Let the save succeed and kill the app right after; the new wallet is marked.

**Acceptance Scenarios**:

1. **Given** a wallet created during setup without the phrase check, **When** its save completes, even if the app dies right after, **Then** the wallet is marked "backup pending".
2. **Given** a save that fails, **When** the user looks at the pending list, **Then** it names no wallet that was not saved; after a failed or interrupted save, any such name is gone by the next completed save, and has no visible effect until then.
3. **Given** retries of the same setup, **When** one finally succeeds, **Then** the pending list holds exactly one mark for that wallet.

---

### User Story 5 - Removing and editing a wallet follow the same rule (Priority: P2)

A user removes a wallet or renames it, and the write fails or the app dies. The wallet list on screen and after the next launch agree: the change happened completely or not at all.

**Why this priority**: the same defect shape exists in removal and editing; fixing only the save would leave its twins broken.

**Independent Test**: fail each write of a removal and of an edit, and kill between each pair of writes; memory and the next launch agree, and no secret is lost.

**Acceptance Scenarios**:

1. **Given** wallets A and B, **When** removing B fails at or before the write that decides it, **Then** the window still shows B, and so does the next launch; a failure after that write leaves B removed, now and at the next launch.
2. **Given** a removal interrupted at any point, **When** the app opens again, **Then** every listed wallet has its secret and unlocks, and the active wallet is a listed one on a network and slot it holds.
3. **Given** a rename that fails, **When** the user looks at the wallet, **Then** it shows the old name, now and after the next launch.
4. **Given** "Remove all wallets", **When** clearing storage fails, **Then** the decrypted keys are still gone from memory first, and the user is told the reset failed (the existing message).

---

### User Story 6 - The mobile password screen knows whether the wallet was saved (Priority: P2)

On the mobile setup password screen, the user goes back after a failed save; the recovery phrase is waiting on the previous screen so they can try again. If the wallet was saved, the phrase is not put back.

**Why this priority**: a phrase put back in memory after the wallet was saved invites a second save; one not put back after a failed save strands the user.

**Independent Test**: fail the save, go back: the phrase is available to the next attempt. Let the save succeed and a later step fail: the phrase is not put back, and no second save happens.

**Acceptance Scenarios**:

1. **Given** a failed save, **When** the user leaves the password screen, **Then** the recovery phrase is put back in memory for the previous screen, and only in memory.
2. **Given** a completed save, **When** the user leaves the screen for any reason, **Then** the phrase is not put back.

### Edge Cases

- **A secret already in the vault that no wallet lists** (left by an earlier failed save). Saving a wallet with that same secret lists it under the new wallet; the earlier copy stays in the vault, unlisted and invisible, and nothing is removed.
- **Derived accounts share a phrase.** A derived wallet holds the same recovery phrase as the wallet it came from, at another position. That is not a duplicate; the same phrase at the same starting position is.
- **A private key for an address a phrase wallet already derives** is refused, as today.
- **Two extension windows add the same wallet at once.** The second save, waiting for the first, finds the wallet stored and is refused; exactly one wallet results.
- **A locked window** holds no addresses in memory; its duplicate decision still uses what storage holds.
- **A follow-up write fails after the wallet is stored** (for example the active-wallet selection). The save reports success; the next launch opens on a listed wallet, on a network and slot that wallet holds.
- **The name counter after an interrupted save.** A save stopped between the list write and the counter write leaves the counter one behind; the next save brings it back to at least the number of listed wallets. How each screen proposes a default name does not change.
- **Other windows react to the wallet list changing.** When they re-read, everything the list names is already stored (secret included).
- **Wrong or expired vault key at save time.** The save is refused before any write, as today.
- **iPhone multi-record writes are not all-or-nothing.** The design never relies on several records landing together; a test simulates every record of any multi-record write landing separately.
- **Seed Vault access.** Replacing a Seed Vault wallet keeps today's rule for releasing Salmon's access to a seed: it is released only when no stored wallet still uses it.

## Requirements _(mandatory)_

### Functional Requirements

**All or nothing**

- **FR-001**: A save, removal or edit of a wallet MUST end in exactly one of two states, as seen by the open window and by the next launch: the wallets before the change, or the wallets after it, each with its secret. This MUST hold when any single write fails and when the process dies between any two writes. What only follows the change (which wallet is active, and the counter that numbers default names) may stay as it was when the process dies after the deciding write: the next launch then shows the new wallet listed and the previous one still active, on a network and slot it holds.
- **FR-002**: Each of these changes MUST have one single-record write that decides whether it happened. Writes before it MUST NOT change anything the next launch shows; writes after it MUST leave a state the next launch shows correctly if they never run.
- **FR-003**: Correctness MUST NOT depend on several records being written together. On every platform, a write of several records is treated as separate writes that can stop between any two.
- **FR-004**: After a failed or interrupted save, the active wallet, its network and its account slot MUST be what they were before the attempt, and a name counter left behind by an interrupted save MUST be brought back to at least the number of listed wallets by the next save.
- **FR-005**: After a failed or interrupted save, the password that opened the wallet before the attempt MUST still open it.
- **FR-006**: No vault is ever discarded automatically. A first save that fails or is interrupted after the vault was written leaves that vault in place: the password chosen in that attempt is the one that opens the device, a repeated setup with that password saves the wallet, and a repeated setup of the same recovery phrase ends with exactly one wallet (FR-014). (Owner decision, 2026-11-26, after four review rounds each found a way an automatic discard could delete a real wallet's vault.)

**What the window shows follows storage**

- **FR-007**: For saving, removing and editing a wallet, the window's view (wallet list, active wallet, network, slot, counter, lock requirement) MUST change only after the deciding write has succeeded.
- **FR-008**: A save MUST report success when the deciding write succeeded, even if a later write failed, and MUST report failure only when the wallet was not stored as far as storage can tell (FR-015b).
- **FR-009**: "Remove all wallets" keeps clearing the decrypted keys from memory before it touches storage, because keys out of memory matters more than memory matching storage for that one action; if clearing storage fails, the user sees the existing "reset failed" message.

**One wallet per secret**

- **FR-010**: Two listed wallets of the same kind MUST NOT hold the same secret at the same position: the same recovery phrase at the same starting position, the same private key, the same watched address, or the same Seed Vault address.
- **FR-011**: The duplicate decision MUST be made inside the same exclusive write turn as the save (no other save can run in between), against what storage holds at that moment, never only against one window's memory.
- **FR-012**: A recovery phrase MUST be refused when a listed recovery-phrase wallet already holds that phrase at that position; it is not refused because a watched address, a private-key wallet or a Seed Vault wallet holds one of its addresses, so a user who watched an address or imported its key can still recover the phrase, as today. A private key or a watched address MUST be refused when any listed wallet already holds its address (today's rule). The refusal uses the existing message "This wallet is already in your list." / "Esta billetera ya está en tu lista." and stores nothing. This applies to setup (create and recover), "Add wallet" (imported phrase, derived account, private key, watched address) and every other path that adds a wallet. Earlier checks against the window's memory may stay as an early hint. Nothing that can be added today is newly refused across kinds.
- **FR-013**: A Seed Vault account whose address matches a listed Seed Vault wallet MUST replace every listed Seed Vault wallet with that address in the same save (today's behaviour), decided against storage, in setup as well as "Add wallet". (Assumption, owner question 4.)
- **FR-014**: Retrying a save after any failure, or pressing the button again after a save that succeeded and a later step that failed, MUST end with exactly one wallet for that secret.
- **FR-015**: Once a screen's save has succeeded, that screen MUST NOT save again; a failure in a later step continues as the wallet already saved. (Assumption, owner question 2: on the mobile setup screen, the user moves on to the app; if unlocking did not complete, the biometric step is skipped and the app opens on the wallet just saved, unlocked for that session.)

**Reads and writes that lie**

- **FR-015a**: A change MUST NOT proceed on a read that contradicts the rest of what the device holds: a vault that reads as missing while a wallet is listed or older-version data is present, a vault that is present but unreadable while a wallet is listed, a vault that reads as missing while the device still holds the name counter every saved wallet leaves, or a wallet list that reads as empty while the open window holds wallets. The change is refused and nothing is written. An empty vault is assumed only for a first save.
- **FR-015b**: When the deciding write reports a failure, the change MUST be settled by reading that record back: if it holds the change, the change is treated as done; if not, the change is refused. Either way the window is then brought in line with what storage holds. A refused change is therefore safe to retry.

**Key material**

- **FR-016**: No change MUST delete a secret as a side effect, and a save MUST NOT remove any entry from the vault: a copy of the same secret left unlisted by an earlier failed attempt stays where it is, harmless and invisible. The one removal a save makes is the entry of a Seed Vault account it replaces (FR-013), which holds no key, and only after the new one is listed.
- **FR-017**: After any change, completed or interrupted, every listed wallet MUST have its secret in the vault.

**Backup pending**

- **FR-018**: A wallet created without the phrase check MUST be marked "backup pending" whenever it ends up saved, including when the app dies right after the deciding write.
- **FR-019**: A mark is stale when no listed wallet carries its identifier, either as its own or as the wallet it was derived from (a derived wallet asks under its parent's mark). Stale marks MUST be removed at the next save, inside the exclusive write turn, as a separate write that cannot make the save fail and that writes nothing when no mark is stale. A failed save does not take its mark back on the spot: a write that reports failure may still have landed, and an unmarked saved wallet is the dangerous direction. Launch does no pruning, so a wallet list that reads wrongly at launch cannot wipe the marks.

**Mobile password screen**

- **FR-020**: Whether the wallet was saved MUST come from the save's own result; the screen MUST NOT keep a separate flag that can disagree with it.
- **FR-021**: The recovery phrase MUST stay only in memory, and MUST be put back for the previous screen only when no wallet was saved.

**Copy and verification**

- **FR-022**: No new user-facing text. The duplicate refusal reuses "This wallet is already in your list." / "Esta billetera ya está en tu lista."; any new text the plan finds necessary MUST be listed in English and Spanish (Argentine voseo) for owner approval before it is built.
- **FR-023**: Every requirement above MUST be covered by an automated test on the shared logic that, for saving, removing and editing, (a) makes storage fail at each write in turn and (b) leaves storage as it would be after the process dies between each pair of writes (each record of a multi-record write counted separately), then loads the wallet afresh and checks memory, storage, the next launch and a retry. Tests are written first and fail before the change.
- **FR-024**: The existing end-to-end setup flows MUST keep passing on the extension (Playwright), the iPhone simulator and the Android emulator (Maestro).

### Key Entities

- **Wallet**: one entry in the wallet list — a name, a picture, the positions it uses, and an identifier that points to its secret in the vault.
- **Secret**: what controls a wallet's funds — a recovery phrase (with a starting position), a private key, a watched address (no key), or a Seed Vault account (the key stays in Seed Vault).
- **Vault**: the encrypted record holding every secret, opened by the user's password.
- **Unlisted secret**: a secret in the vault that no wallet in the list points to; invisible to the user.
- **Deciding write**: the single-record write after which a change counts as done.
- **Backup pending list**: the identifiers of wallets whose recovery phrase the user has not confirmed yet.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For saving, removing and editing a wallet, every write position tested as a failure and every gap between two writes tested as a process death (100% of positions) ends in the before-state or the after-state, in memory and after a fresh load.
- **SC-002**: Across every failure position followed by a retry, and every "success then later-step failure" followed by a second press, the number of wallets holding that secret is exactly one, shown by the shared tests and the screen tests of each setup screen; the end-to-end setup flows on the three platforms stay green (no device can be made to fail a write on demand).
- **SC-003**: Every duplicate attempt, in every entry point, including one where only storage knows the wallet (added by another window), stores nothing and shows the existing duplicate message; a Seed Vault account already listed is replaced instead, with no message.
- **SC-004**: After any tested failure or interruption, every secret that was in the vault before is still there, and every listed wallet has its secret.
- **SC-005**: After any tested failure or interruption of a first save, no vault is deleted, the password chosen in that attempt opens the device, and a repeated setup of the same recovery phrase ends with exactly one wallet.
- **SC-006**: Zero new user-facing strings, or every new one approved by the owner in both languages.
- **SC-007**: Every gate the repository already runs (typecheck, lint, unit tests, DOM parity, i18n, dead code) and the end-to-end setup flows on extension, iPhone simulator and Android emulator stay green.

## Assumptions

- **Stored format unchanged.** The records, their names and their contents stay as they are; only the order of writes, what is read before deciding, and how a load treats in-between states may change, so existing installs need no migration.
- **Platform guarantees** are the ones stated under "What exists today": only a single-record write is all-or-nothing everywhere (Chromium `leveldb_value_store.cc`; AsyncStorage 2.2.0 `AsyncStorageModule.java` and `RNCAsyncStorage.mm`).
- **The exclusive write turn already exists**: every change to the stored wallets runs one at a time, across extension windows and within the mobile app.
- **Owner question defaults** (see below) are in force until answered: no vault is discarded automatically (FR-006, owner decision); a later-step failure after a save moves on (FR-015); duplicates are refused, not switched to (FR-012); Seed Vault replaces (FR-013); on mobile recover with wallets stored, a save is refused unless the password typed opens the vault (FR-005).
- **Sensitive area.** The change touches vault and storage writes; it gets human sign-off and an adversarial review before it merges, per the architecture guide.
- **Out of scope**: changing the stored format or migrating existing data; changing the password, protecting a password-less wallet, and the legacy v2 migration; removing unlisted secrets; the storage library and what backs it; how the derived-account search ("Check derivables") reports a wallet it could not add: it adds whole wallets through the same save, so the duplicate rule applies to it, and a refusal there stays silent as today (logged, the search moves on).

## Questions for the owner

1. **Leftover of a failed first save.** Decided by the owner on 2026-11-26: it is kept, and nothing is discarded automatically. An earlier answer allowed discarding it; four adversarial review rounds of the plan each found a way that discard could delete the vault of a real wallet (an older wallet's interrupted migration, a list that reads as empty after a read error on iPhone, a second window mid-save), against a benefit limited to one rare case, so the owner withdrew it.
2. **A later step fails after the wallet was saved** (mobile setup: unlocking, analytics). Recommended default: the screen moves on to the app as if the step had worked; if unlocking did not complete, the biometric step is skipped and the app opens on the wallet just saved, unlocked for that session. No new UI or copy.
3. **Adding a wallet the device already holds.** Recommended default: refuse with the existing "This wallet is already in your list." message. The alternative is to switch to the existing wallet silently.
4. **Seed Vault account already listed.** Recommended default: replace it in the same save (today's behaviour in "Add wallet"), now also in setup and decided against storage.
5. **Mobile recover with wallets already stored.** The mobile setup password screen asks for a new password in recovery even when one exists; the plan found it reachable only through a deep link while the wallet is unlocked. With this change a save is refused there unless the password typed opens the vault, so the vault and the screen can no longer end up on different passwords. Recommended default: nothing further here; whether that screen should ask for the existing password instead is its own ticket.
