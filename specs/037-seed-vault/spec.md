# Feature Specification: Seed Vault accounts on Android (Solana Seeker)

**Feature Branch**: `feat/seeker-seed-vault` (spec dir `037-seed-vault`)

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Let the mobile app use the Seeker's Seed Vault — the phone's secure hardware key store — as a source of Solana accounts. The user authorizes Salmon to use a seed that already lives in Seed Vault (for example the one the built-in Seed Vault Wallet created during Seeker setup), or creates/imports one through Seed Vault's own screens; Salmon then lists its accounts and adds them as Salmon wallets. Those accounts never hold key material in Salmon: every signature (send, swap, NFT transfer, dApp requests over Mobile Wallet Adapter, sign message, Sign In With Solana) is requested from Seed Vault, which shows its own approval screen with fingerprint or PIN. Unprivileged access only. Solana only. Hidden on devices without Seed Vault and on iOS. Reuse the existing account model and route all signing through one path. The user can remove a Seed Vault account (deauthorize); revocation from Seed Vault settings is handled gracefully. Simulator for testing on emulator. Out of scope: Seeker Genesis Token, .skr domains, privileged access, seed backup status, multi-chain."

## Why this exists

Every Solana Seeker ships with Seed Vault: the phone keeps the user's recovery phrase inside secure hardware, and apps never see it — they ask Seed Vault to sign, and Seed Vault asks the user to confirm with a fingerprint or PIN on a screen the app cannot draw over. A Seeker owner set up their wallet in Seed Vault on day one. Today, to use Salmon on that phone, they must type a recovery phrase into Salmon, which defeats the reason they bought the phone and leaves a copy of the key inside an app.

With this feature a Seeker owner adds their existing Seed Vault wallet to Salmon in a few taps, without typing or revealing anything, and every signature still goes through Seed Vault. Salmon keeps doing what it does (preview what a transaction will do, warn, refuse what is unsafe); Seed Vault does the one thing Salmon should not have to: hold the key.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Add a Seed Vault wallet (Priority: P1)

On a Seeker, the user opens "Add wallet" (or the welcome screen on first launch) and sees "Use Seed Vault". Tapping it asks Android for permission to use Seed Vault, then opens Seed Vault's own screen, where the user picks which of their seeds Salmon may use and confirms with fingerprint or PIN. Back in Salmon, the user sees that seed's accounts with their addresses and balances, picks one or more, and they appear in Wallets marked as Seed Vault wallets.

**Why this priority**: without an account nothing else exists; it is also the step that replaces typing a recovery phrase.

**Independent Test**: on an Android emulator with the Seed Vault simulator holding a test seed, add a Seed Vault wallet from Settings → Add wallet: the wallet appears with the same address the simulator reports for that seed's first account, and no recovery phrase or private key was ever entered into Salmon.

**Acceptance Scenarios**:

1. **Given** a device with Seed Vault and a seed in it, **When** the user picks "Use Seed Vault", grants the permission and authorizes a seed, **Then** Salmon lists that seed's accounts and adds the ones the user picks as wallets.
2. **Given** the user declines the Android permission or cancels Seed Vault's screen, **When** they return to Salmon, **Then** nothing is added and Salmon says why.
3. **Given** Seed Vault holds no seed Salmon can use, **When** the user picks "Use Seed Vault", **Then** Salmon offers Seed Vault's own create and import screens, and continues with the new seed if the user completes one.
4. **Given** an account of that seed is already a Salmon wallet, **When** the user adds accounts again, **Then** it is shown as already added and is not duplicated.
5. **Given** a first launch on a Seeker, **When** the user picks "Use Seed Vault" on the welcome screen, **Then** they set Salmon's password as in any onboarding and finish with the Seed Vault wallet active.

---

### User Story 2 - Sign with a Seed Vault wallet (Priority: P1)

With a Seed Vault wallet active, the user sends tokens, swaps, transfers an NFT, or approves a dApp request. Salmon shows its usual review (amounts, fee, warnings, dApp preview) and, when the user approves, Seed Vault's screen appears asking for fingerprint or PIN. After confirming, the action completes exactly as with any other wallet.

**Why this priority**: an account that cannot sign is only a watch-only wallet; signing is the point.

**Independent Test**: with a Seed Vault wallet on devnet in the simulator, send SOL to another address: Salmon's review appears, then the simulator's approval; after approving, the transfer resolves on a devnet explorer from the Seed Vault account's address.

**Acceptance Scenarios**:

1. **Given** a Seed Vault wallet, **When** the user approves a send, swap, NFT transfer, or dApp transaction in Salmon, **Then** Seed Vault asks for confirmation and, once given, the transaction is signed by that account and proceeds as for any wallet.
2. **Given** a Seed Vault wallet, **When** a dApp asks it to sign a message or sign in with Solana and the user approves, **Then** Seed Vault asks for confirmation and the dApp receives a valid signature from that account.
3. **Given** Seed Vault's confirmation is cancelled or fails, **When** the user returns to Salmon, **Then** nothing is signed or sent and Salmon says the signature was not given.
4. **Given** a request with more transactions than Seed Vault signs in one confirmation, **When** the user approves it in Salmon, **Then** every approved transaction is signed, and the user may be asked to confirm in Seed Vault more than once.
5. **Given** the user approved one thing in Salmon, **When** Seed Vault is asked to sign, **Then** it is asked to sign exactly what Salmon showed and nothing else.

---

### User Story 3 - Remove a wallet and recover from revoked access (Priority: P2)

The user removes a Seed Vault wallet in Salmon, or revokes Salmon's access from Seed Vault's settings. Salmon stops being able to sign for it and says so clearly; the user can grant access again.

**Why this priority**: access must be revocable from both sides without leaving a broken wallet behind.

**Independent Test**: add a Seed Vault wallet, revoke Salmon in the simulator's authorized apps, then try to send: Salmon refuses before any review, explains that Seed Vault access was revoked, and offers to grant it again.

**Acceptance Scenarios**:

1. **Given** the user removes the last Salmon wallet that belongs to a seed, **When** the removal completes, **Then** Salmon gives up its access to that seed in Seed Vault.
2. **Given** the user removes one of several wallets from the same seed, **When** the removal completes, **Then** the others keep working.
3. **Given** access was revoked in Seed Vault, **When** the user tries to sign, **Then** Salmon refuses without signing, explains why, and offers to grant access again; the wallet's balances stay visible.
4. **Given** access is granted again for the same seed, **When** it completes, **Then** the existing wallets sign again without being re-added.

---

### Edge Cases

- The device has no Seed Vault (any other Android phone, iOS, the browser extension): "Use Seed Vault" is not shown anywhere.
- A production build sees only the Seed Vault simulator, not a secure Seed Vault: it treats the device as having no Seed Vault; development builds accept the simulator.
- The user tries to reveal the recovery phrase or export the private key of a Seed Vault wallet: Salmon explains that Seed Vault never reveals them and does not offer the action.
- A Seed Vault wallet is asked for Bitcoin or Ethereum: Seed Vault holds Solana keys only, so those networks are not offered for it.
- Salmon is locked when a Seed Vault signature is needed: Salmon's own unlock comes first, then Seed Vault's confirmation.
- Seed Vault is uninstalled or disabled after wallets were added: wallets stay visible with balances; signing refuses with an explanation.
- The user leaves Seed Vault's screen with the back gesture: treated as a cancel.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: On an Android device with a secure Seed Vault, Salmon MUST offer "Use Seed Vault" in the welcome screen and in Add wallet; it MUST NOT appear anywhere else (other devices, iOS, the extension).
- **FR-002**: Salmon MUST request only the standard Seed Vault permission and MUST NOT declare the privileged one.
- **FR-003**: Salmon MUST let the user authorize an existing seed, or create or import one through Seed Vault's own screens, and then pick which of that seed's accounts to add.
- **FR-004**: A Seed Vault wallet MUST hold no key material in Salmon; Salmon stores only what identifies the seed authorization, the account's derivation path, and its public address.
- **FR-005**: Every signature for a Seed Vault wallet — transactions and messages, from the app or from dApps — MUST be produced by Seed Vault after the user confirms in Seed Vault's own screen.
- **FR-006**: Salmon MUST keep its existing review and refusal rules for Seed Vault wallets (preview, warnings, transaction-lookalike guard, simulation gates) and MUST send Seed Vault exactly the payloads the user approved.
- **FR-007**: Every signing feature that works for a recovery-phrase wallet on Solana MUST work for a Seed Vault wallet, through the same signing path.
- **FR-008**: Seed Vault wallets MUST be marked as such in Wallets and account details, and MUST NOT offer recovery-phrase or private-key export.
- **FR-009**: Removing the last Salmon wallet of a seed MUST give up Salmon's access to that seed in Seed Vault.
- **FR-010**: When Seed Vault reports that access is no longer valid, Salmon MUST refuse to sign, explain why, and offer to grant access again without re-adding the wallet.
- **FR-011**: Production builds MUST accept only a secure Seed Vault; the simulator MAY be accepted only in development builds.
- **FR-012**: All new text MUST exist in English and Spanish.
- **FR-013**: Users who never use Seed Vault MUST see no change in behaviour.

### Key Entities

- **Seed authorization**: Seed Vault's grant for Salmon to use one seed; identified by an opaque value Seed Vault returns, and revocable from either side.
- **Seed Vault wallet**: a Salmon wallet whose Solana address belongs to an authorized seed at a given derivation path; carries the authorization reference, the path and the address, never a key.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A Seeker user with a Seed Vault wallet adds it to Salmon in under one minute, without typing a recovery phrase or a key.
- **SC-002**: On the emulator with the simulator, every Solana signing feature (send, swap, NFT transfer, and the seven Mobile Wallet Adapter request types) completes with a Seed Vault wallet on devnet.
- **SC-003**: Automated tests show that for a Seed Vault wallet no code path can produce a signature without Seed Vault, and that cancelled or revoked confirmations produce no signature.
- **SC-004**: A user who never uses Seed Vault sees no change: the existing mobile test suites pass unchanged.

## Assumptions

- Seed Vault accounts use Solana's standard derivation path `m/44'/501'/X'/0'`, the one Salmon already uses and the one Seed Vault pre-derives on authorization, so the same seed shows the same addresses in Salmon and in the Seed Vault Wallet.
- Salmon's password and lock stay as they are for every user, including one whose only wallet is in Seed Vault, because Salmon still encrypts its local data and gates the app.
- Seed Vault's confirmation is in addition to Salmon's own review, not a replacement: Salmon shows what the transaction does, Seed Vault confirms who signs.
- The Seeker's Seed Vault lets a third-party wallet authorize the seed created during Seeker setup, as Solflare, Phantom and Backpack describe; this is confirmed on a real Seeker before release.
- Only Solana networks are offered for Seed Vault wallets.
