# Feature Specification: Mobile on Expo SDK 57

**Feature Branch**: `feat/powerups-foundations` (spec dir `034-expo-sdk-57`)

**Created**: 2026-09-23

**Status**: Ready for planning

**Input**: User description: "Upgrade the mobile app (apps/mobile) from Expo SDK 55 to Expo SDK 57 (React Native 0.83 → 0.86, going through SDK 56 as an in-branch checkpoint), following the research in docs/EXPO-SDK-57-UPGRADE.md. Decisions already taken by the owner: iOS minimum 16.4 is accepted (iOS 15 dropped); if react-native-fast-crypto does not build on RN 0.85+ it is replaced by react-native-quick-crypto; Node 24 is already in place. TypeScript 7 and jsdom 30 are separate lots in the same final batch, not part of this spec. Work stays on the current branch feat/powerups-foundations (no new branch). Everything must be verified locally: typecheck, lint, tests, mobile export, Android dev build on emulator, iOS dev build once Xcode 26.4 is installed, and a device walk through create/recover wallet, biometric unlock, QR scan, send, activity, NFTs and Powerups."

## Why this exists

The mobile app is built on a platform release (Expo SDK 55) that is two
releases behind. Staying there costs more each month: new platform fixes and
store requirements land only on current releases, dependency updates for the
app arrive already targeting the newer release and cannot be applied, and the
next store build would be made with tooling the platform no longer supports.
SDK 56 alone is not a place to stop — it carries a known memory regression in
the animation libraries this app loads at start, fixed in SDK 57.

The upgrade is not meant to change what the user sees or does. Its value is
that the same wallet keeps working, on current foundations, so later work
(Powerups, store releases, security updates) is not blocked on it. The risk
it has to manage is that a wallet is unforgiving: a seed that derives a
different account, a lock screen that lets someone through, or a send that
signs something else would be a loss of funds, and no amount of new platform
is worth that.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - My wallet is the same wallet after the update (Priority: P1)

A user who already has Salmon installed updates the app from the store. They
unlock with their password or biometrics, and see the same accounts, the same
addresses and the same balances as before. Nothing asks them to recover or
re-enter anything.

**Why this priority**: if an update changes which accounts a seed derives or
loses the stored vault, users lose access to funds. Everything else is
secondary to this.

**Independent Test**: install the current store build, create or recover a
test wallet, note its addresses, update to the new build over it, unlock and
compare.

**Acceptance Scenarios**:

1. **Given** a wallet created on the current release, **When** the user updates and unlocks, **Then** every account shows the same address it showed before the update.
2. **Given** a user with biometric unlock enabled, **When** they open the updated app, **Then** biometric unlock still works without re-enrolling.
3. **Given** a wallet left locked, **When** the user enters a wrong password repeatedly, **Then** the updated app refuses entry and applies the same waiting rules as before.

---

### User Story 2 - Creating and recovering a wallet works and derives the same keys (Priority: P1)

A new user creates a wallet, or an existing one recovers from a recovery
phrase. The accounts the updated app derives from a given phrase are exactly
the accounts the previous release derived from it, and recovery takes no
noticeably longer.

**Why this priority**: seed derivation runs through a native acceleration
module that the new platform may not support; replacing it is the single
change most likely to alter keys or slow recovery.

**Independent Test**: recover the public BIP-39 test phrase on the old and new
builds and compare the first accounts on every chain; time the recovery.

**Acceptance Scenarios**:

1. **Given** the public BIP-39 test phrase, **When** it is recovered on the updated app, **Then** the Solana, Bitcoin and Ethereum addresses match the ones the previous release shows for it.
2. **Given** a new wallet is created, **When** the user backs it up and recovers it on another device running the update, **Then** the same accounts appear.
3. **Given** a recovery on a mid-range Android device, **When** it runs, **Then** it completes in no more than the time the previous release takes, within a small margin.

---

### User Story 3 - Moving money works as before (Priority: P1)

The user sends SOL and a token, scans a payment QR, reviews a send, sends and
burns an NFT, and sees the result in activity. Every screen shows the same
recipient, amount and fee it showed before, and every signature covers exactly
what was reviewed.

**Why this priority**: sending is the action with irreversible consequences;
a regression here is a loss, not an inconvenience.

**Independent Test**: on devnet, run each money-moving flow on an Android
emulator and an iOS simulator with the updated build and check the on-chain
result against the review screen.

**Acceptance Scenarios**:

1. **Given** a funded devnet wallet, **When** the user sends SOL and a token, **Then** the transaction lands with the recipient and amount shown on review, and appears in activity.
2. **Given** a Solana Pay QR, **When** the user scans it with the camera, **Then** the send opens with the request's fields filled, as it does today.
3. **Given** an NFT, pNFT and compressed NFT in the wallet, **When** the user sends and burns each, **Then** each lands and leaves the list as it does today.

---

### User Story 4 - The rest of the app looks and moves as before (Priority: P2)

Home, the tabs, the Powerups catalog and sheet, bottom sheets, the keyboard
screens (send amount, password, recover), the loading and wait screens, and
the lock overlay render and animate as they do today, on both gesture and
3-button navigation on Android.

**Why this priority**: the new platform changes how screens are laid out at
the edges on Android and replaces the animation engine underneath; nothing is
lost if something shifts, but the product would look broken.

**Independent Test**: visual walk of each listed surface on an Android
gesture-navigation emulator, a 3-button emulator and an iOS simulator,
compared with the current release.

**Acceptance Scenarios**:

1. **Given** Android with 3-button navigation, **When** any sheet or keyboard screen opens, **Then** no control sits under the system bars.
2. **Given** any animated surface (sheets, Powerups sink and float, the wait screen, tab underline), **When** it runs, **Then** it plays without flashes or a frame at rest before the motion.

---

### Edge Cases

- A device on iOS 15 cannot install the update; it keeps the version it has. The store listing must state the new minimum.
- The seed-derivation accelerator is unavailable at runtime (module missing or failing): the app falls back to the slower built-in path and still derives the same keys.
- An over-the-air update built for the old release must never be delivered to the new binary, and vice versa.
- A network call that relied on the old networking layer (Bitcoin and Ethereum providers, request cancellation) behaves the same under the new one, including timeouts.
- A user who updates mid-transaction (a pending send on screen when the app was killed) sees its outcome in activity after the update.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The mobile app MUST run on Expo SDK 57 with every Expo-managed dependency at the version that release pins, and no dependency left on an SDK 55 or SDK 56 version.
- **FR-002**: The upgrade MUST pass through SDK 56 as a verified checkpoint on the same branch before moving to SDK 57; SDK 56 MUST NOT be released.
- **FR-003**: Seed derivation MUST produce byte-identical accounts to the previous release for the same recovery phrase, on every chain the wallet supports, verified with a known test phrase.
- **FR-004**: If the current seed-derivation accelerator cannot be built on the new platform, it MUST be replaced by a maintained accelerator that supports it (owner decision), keeping the existing slower fallback; the replacement changes a security-sensitive path and needs the owner's sign-off on the diff.
- **FR-005**: Stored vaults, passwords, biometric enrollment and the unlock throttle MUST survive the update unchanged.
- **FR-006**: The app's navigation MUST stop depending on the navigation library the platform no longer supports alongside its router, with no change in how screens are pushed, dismissed or themed.
- **FR-007**: Dependencies with no remaining use (the encrypted-storage module and, if confirmed unused, the permissions module) MUST be removed rather than migrated.
- **FR-008**: Local version pins and patches tied to SDK 55 (dependency overrides, the camera patch, install exclusions) MUST be updated to SDK 57 equivalents or removed when upstream no longer needs them.
- **FR-009**: The minimum supported iOS version MUST be 16.4 (owner accepted), and the release notes MUST say so.
- **FR-010**: The new build MUST ship as a new store binary with a new app version; it MUST NOT be delivered as an over-the-air update, and the native fingerprint baseline MUST be refreshed when that binary is built.
- **FR-011**: Every quality gate the repo enforces (typecheck, lint with zero warnings, all test suites, mobile export, fingerprint, i18n, DOM parity, Powerups bundle) MUST pass; no gate may be weakened to get there.
- **FR-012**: A development build MUST be produced and exercised locally on an Android emulator (gesture and 3-button navigation) and, once the local toolchain supports it, on an iOS simulator, covering create, recover, biometric unlock, QR scan, send, activity, NFTs and Powerups.
- **FR-013**: The upgrade research document MUST be updated to state what was applied and what the platform now is, so it no longer reads as a plan.

### Key Entities

- **Recovery phrase → accounts mapping**: the deterministic relationship that must not move; checked with a known public test phrase.
- **Native fingerprint baseline**: the recorded identity of the native layer that decides whether a change may ship over the air; it moves with this upgrade.
- **App version**: the store-facing version that marks this as a binary release.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For the public test recovery phrase, 100% of derived addresses (first 3 accounts on each supported chain) match the previous release.
- **SC-002**: Recovery from a phrase on the Android test device takes no more than 10% longer than on the previous release.
- **SC-003**: All money-moving flows in User Story 3 complete on devnet on both platforms with on-chain results matching their review screens, 0 mismatches.
- **SC-004**: 0 repo quality gates failing, and 0 gates relaxed, at the end of the lot.
- **SC-005**: The visual walk of User Story 4 finds 0 controls under system bars and 0 single-frame flashes on the three test configurations.
- **SC-006**: The app's memory at idle on Home after unlock is no higher than on the previous release, within 10%.

## Assumptions

- Node 24 is already the toolchain for the whole repo.
- TypeScript 7 and jsdom 30 are separate lots of the same final batch and are out of scope here; TypeScript stays at its current major during this upgrade.
- The work happens on `feat/powerups-foundations`, committed and pushed there, with no pull request; that branch becomes `main` afterwards.
- The owner updates the local Xcode to 26.4 or later; iOS verification waits for it, Android does not.
- The research in `docs/EXPO-SDK-57-UPGRADE.md` is the starting inventory of what the upgrade touches; items it marks unverified are verified during planning.
- The store release itself (submission, store listing text, tagging) is outside this lot; this lot ends with a verified build ready to release.
