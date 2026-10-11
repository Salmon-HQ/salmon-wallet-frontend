# Feature Specification: Salmon answers dApps on Android (Mobile Wallet Adapter)

**Feature Branch**: `feat/seeker-dapp-store` (spec dir `036-mwa-wallet`)

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Make the mobile app a Mobile Wallet Adapter wallet on Android so it works with dApps on the Solana Seeker and any Android phone: a dApp asks to connect, sign messages, sign transactions or sign and send them; Salmon shows an approval over the dApp and signs with the active account. Reuse what the extension already does for dApp approval as much as possible. Out of scope: Seed Vault, Seeker Genesis Token, .skr domains, iOS."

## Why this exists

On Android, a Solana dApp — a website in the phone's browser or an installed app — reaches a wallet through Mobile Wallet Adapter: it asks the system for "a Solana wallet", the user picks one, and that wallet approves and signs. Salmon does not answer that call today, so on the Solana Seeker, whose whole pitch is using dApps from the phone, a Salmon user cannot connect to anything. The user has to move funds to another wallet to use a dApp, which is the opposite of keeping them in Salmon.

The extension already solves the same problem on desktop: it shows the dApp who is asking, previews what a transaction will do, signs only what the user saw, and remembers which dApps are trusted. This feature brings that same behavior to the phone through the Android protocol, reusing the extension's approval rules, transaction preview and trusted-apps list rather than building a second set.

## Clarifications

### Session 2026-10-07

- Q: What must Salmon require before signing a dApp request? → A: The same as the extension: the wallet unlocked plus an explicit approval of each request; no extra biometric check per signature.
- Q: The old "adapter mode" detection (`useRuntime`, `ADAPTER_PREFIXES` in `packages/shared`) has no consumer in any app. Keep or remove? → A: Remove it; the dedicated dApp entry point replaces it. Checked consumers: only its own barrel export in `packages/shared/src/hooks/index.ts` and its test.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Connect a dApp (Priority: P1)

A user opens a Solana dApp on their Android phone and taps "Connect wallet". Salmon appears in the system's wallet choice. When picked, Salmon opens over the dApp showing the dApp's name, icon and address, the network it wants, and which Salmon account it will see. The user approves, Salmon closes, and the dApp shows the user's address. The dApp is added to the user's trusted apps, where it can be revoked.

**Why this priority**: without a connection nothing else is possible; it is also the first thing every dApp does.

**Independent Test**: on an Android emulator with Salmon installed and a wallet set up, run the Solana Mobile wallet test page and tap Connect: the page shows the active account's address; Settings → Trusted apps lists the dApp.

**Acceptance Scenarios**:

1. **Given** Salmon is unlocked with a Solana account active, **When** a dApp asks to connect on a network Salmon supports and the user approves, **Then** the dApp receives the active account's address and the dApp appears in trusted apps for that network.
2. **Given** the same request, **When** the user declines, **Then** the dApp is told the user declined and nothing is stored.
3. **Given** Salmon is locked, **When** a dApp asks to connect, **Then** Salmon asks the user to unlock (password or biometrics) before showing the request.
4. **Given** a dApp asks for a network Salmon does not support, **When** the request arrives, **Then** Salmon refuses it without asking the user to approve.
5. **Given** the dApp's claimed identity cannot be verified against its website, **When** the connect request is shown, **Then** Salmon shows the same "unverified origin" warning the extension shows.

---

### User Story 2 - Sign and send a transaction (Priority: P1)

A connected dApp asks Salmon to sign one or more transactions, or to sign and send them. Salmon shows what the transactions will do (balance changes, fees, warnings) exactly as the extension does, and the user approves. Salmon signs only the transactions it previewed. For "sign and send", Salmon sends them to the network through its own connection and returns the transaction signatures; for "sign", it returns the signed transactions for the dApp to send.

**Why this priority**: this is what dApps exist for — swaps, mints, payments. A wallet that only connects is useless.

**Independent Test**: from the wallet test page on devnet, request a transfer with "sign and send": the preview shows the amount leaving the account, approving returns a signature that resolves on a devnet explorer.

**Acceptance Scenarios**:

1. **Given** a connected dApp, **When** it sends transactions to sign and the user approves, **Then** Salmon returns the transactions signed by the active account and nothing else in them changes.
2. **Given** a connected dApp, **When** it asks to sign and send and the user approves, **Then** Salmon sends each transaction and returns its signature; if one fails to send, the dApp is told which.
3. **Given** a transaction Salmon cannot read (unsupported version or malformed), **When** it arrives, **Then** Salmon refuses it with a clear message and signs nothing.
4. **Given** a request with more transactions than Salmon accepts at once, **When** it arrives, **Then** Salmon refuses it as too many.
5. **Given** a dApp that is not connected (no valid authorization), **When** it asks to sign, **Then** Salmon refuses it as not authorized.

---

### User Story 3 - Sign a message and sign in with Solana (Priority: P2)

A dApp asks Salmon to sign a text message (for example to prove ownership of the address) or to "Sign in with Solana" as part of connecting. Salmon shows the message or the sign-in details, and signs on approval.

**Why this priority**: many dApps require it for login, but a user can still swap and pay without it.

**Independent Test**: from the wallet test page, run "Sign message" and "Sign in": both return a signature the page verifies against the address.

**Acceptance Scenarios**:

1. **Given** a connected dApp, **When** it asks to sign a readable message and the user approves, **Then** Salmon returns the signature.
2. **Given** a message whose bytes are actually a transaction, **When** it arrives, **Then** Salmon refuses to sign it, as the extension does.
3. **Given** a connect request that includes a sign-in, **When** the user approves, **Then** the dApp gets both the address and the sign-in signature in one step.

---

### User Story 4 - Stay connected and disconnect (Priority: P3)

A dApp the user approved before reconnects later without a new approval while the authorization is valid. When the user revokes the dApp in Settings → Trusted apps, or the dApp disconnects, the dApp must ask again.

**Why this priority**: convenience on top of a working flow.

**Independent Test**: connect, close the dApp, reopen it: no approval prompt. Revoke it in trusted apps, reopen: the connect prompt appears.

**Acceptance Scenarios**:

1. **Given** a dApp approved earlier for this network, **When** it reconnects with its authorization, **Then** Salmon accepts without a prompt.
2. **Given** the user revoked the dApp, **When** it reconnects with the old authorization, **Then** Salmon refuses and the dApp must connect again.
3. **Given** a connected dApp, **When** it disconnects, **Then** its authorization stops working.

### Edge Cases

- The active account is watch-only (no key): Salmon declines connect and signing, and tells the user why.
- The user switches the active account after connecting: requests from a dApp authorized for a different account are refused as not authorized, so the dApp connects again and the user sees which account it gets.
- The dApp closes or the connection drops while Salmon shows a request: Salmon dismisses the request and signs nothing.
- Two requests arrive back to back: Salmon shows one at a time, in order.
- The user leaves the approval without choosing (back gesture): treated as a decline.
- Salmon is opened for a dApp while the main app is also open: the main app's state is not disturbed.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: On Android, Salmon MUST be offered as a wallet when any app or browser page asks the system for a Solana wallet through Mobile Wallet Adapter.
- **FR-002**: The approval MUST appear over the calling dApp and return the user to it when done.
- **FR-003**: Salmon MUST support connect, reconnect, disconnect, sign messages, sign transactions, sign and send transactions, and sign in with Solana.
- **FR-004**: Every signing request MUST require the wallet to be unlocked; a locked wallet MUST ask for the password or biometrics first.
- **FR-005**: Transaction approval MUST show the same preview the extension shows (balance changes, fee, warnings) and MUST sign exactly the transactions previewed.
- **FR-006**: Salmon MUST refuse, without signing, requests for unsupported networks, unreadable transactions, transaction bytes disguised as messages, and requests from dApps without a valid authorization.
- **FR-007**: Sign-and-send MUST send through Salmon's own network connection for the requested network.
- **FR-008**: Approved dApps MUST be recorded in the existing trusted-apps list, per network, and revoking one there MUST invalidate its authorization.
- **FR-009**: When the dApp's identity cannot be verified, Salmon MUST show the existing unverified-origin warning.
- **FR-010**: All new text MUST exist in English and Spanish.
- **FR-011**: The main app's behavior MUST not change for users who never use a dApp.

### Key Entities

- **dApp request**: who is asking (name, website, icon as the dApp claims them), the network, the kind of request, and its payloads.
- **Authorization**: the record that a dApp may act for one Salmon account on one network; stored in the trusted-apps list with an opaque token the dApp presents to reconnect.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On the Seeker-sized emulator, each of the seven request types in FR-003 completes successfully from the Solana Mobile wallet test page on devnet.
- **SC-002**: A user connects a dApp in at most two taps after picking Salmon (approve, plus unlock if locked).
- **SC-003**: Every refusal case in FR-006 ends with the dApp receiving a refusal and no signature produced, verified by automated tests.
- **SC-004**: A user who never uses a dApp sees no change: the existing mobile smoke suite passes unchanged.

## Assumptions

- Only Solana mainnet and devnet are in scope, because those are the networks Salmon's mobile app supports.
- The dApp sees only the active account at connect time; choosing among several accounts is out of scope.
- Approval rules match the extension: an unlocked wallet plus an explicit approval per request; no extra biometric check per signature.
- Only one dApp session at a time is supported, matching the platform library's limit.
- This needs a new app binary (native Android change); it cannot ship as an over-the-air update.
- Out of scope: Seed Vault, Seeker Genesis Token, .skr domains, App Links for faster reconnection, iOS (Mobile Wallet Adapter is Android-only).
