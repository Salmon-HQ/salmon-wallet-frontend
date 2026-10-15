# Feature Specification: A dApp connection that does not dead-end (Mobile Wallet Adapter)

**Feature Branch**: `fix/041-mwa-connection-paths`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "The Solana dApp Store rejected 1.4.0: 'We could not complete the wallet connection flow during review.' Fix the three paths the audit reproduced: (1) a dApp asking for a network Salmon supports but is not on — offer to switch and connect instead of refusing; (2) a dApp reaching Salmon before any wallet exists — say so and lead to creating one, instead of a wrong network message; (3) a dApp asking for a network Salmon does not support — say plainly that Salmon does not support it. Reuse the existing components and design tokens."

## Why this exists

Spec 036 made Salmon a Mobile Wallet Adapter wallet: a dApp on an Android phone asks the system for a Solana wallet, the user picks Salmon, and Salmon approves and signs. The dApp Store review could not finish that connection. Running the submitted build against Solana Mobile's own test page reproduced why: a connection only completes when a wallet already exists **and** the dApp asks for the network Salmon happens to be on. Salmon starts on mainnet, so a dApp on devnet — the usual network for testing — is refused with "a network your wallet is not using", and the user has no way forward from that screen. A phone with no wallet yet is told the same wrong thing about networks.

The protocol lets a dApp name any of mainnet, devnet or testnet; Salmon supports mainnet and devnet. The user should be able to finish every connection Salmon can serve, and understand the ones it cannot.

## Clarifications

### Session 2026-10-14

- Q: Which fixes are in scope? → A: The three the audit proposed: switch network from the request, guide a wallet-less user, and a clear refusal for an unsupported network (owner approved 2026-10-14).
- Q: Can Salmon answer an unsupported network with the protocol's "chain not supported" error? → A: No. The React Native wallet library Salmon uses (walletlib 1.4.5) only lets the wallet answer user-declined, too many payloads, invalid signatures or authorization not valid. An unsupported network keeps answering "declined"; what changes is what the user is told.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Connect on the network the dApp asks for (Priority: P1)

A user with Salmon on mainnet opens a dApp that works on devnet and taps Connect. Salmon opens over the dApp and says the dApp asks for Devnet while Salmon is on Mainnet, with two choices: switch to Devnet and continue, or cancel. Choosing to switch moves Salmon to Devnet and shows the usual connect approval for the same request; approving connects the dApp. Cancelling tells the dApp the user declined and changes nothing.

**Why this priority**: this is the path the review most likely took, and it blocks every devnet dApp for every user who has not changed networks by hand.

**Independent Test**: with a wallet on mainnet, open Solana Mobile's test page on devnet and tap Connect: Salmon offers to switch; switching and approving returns the address to the page, and Salmon's network is Devnet afterwards.

**Acceptance Scenarios**:

1. **Given** Salmon is unlocked on mainnet with a Solana account, **When** a dApp asks to connect on devnet, **Then** Salmon shows the requested and current networks and offers "Switch to Devnet" and "Cancel".
2. **Given** that offer, **When** the user switches, **Then** Salmon's network becomes Devnet and the connect approval for the same request appears; approving gives the dApp the account's address.
3. **Given** that offer, **When** the user cancels or goes back, **Then** the dApp is told the user declined and Salmon stays on mainnet.
4. **Given** a connected dApp sends a signing request for a network Salmon supports but is not on, **When** it arrives, **Then** Salmon makes the same offer before showing that request.
5. **Given** Salmon is locked, **When** such a request arrives, **Then** the user unlocks first and the offer follows.

---

### User Story 2 - A dApp reaches Salmon before any wallet exists (Priority: P1)

A user installs Salmon, has not set up a wallet, and picks Salmon from a dApp. Salmon tells them there is no wallet yet and offers to open Salmon to create or import one. The dApp is told the user declined; the user comes back to the dApp afterwards and connects.

**Why this priority**: a reviewer, or a new Seeker owner, may try a dApp first; the current wrong network message reads as a broken wallet.

**Independent Test**: on a fresh install, tap Connect on the test page: Salmon says there is no wallet and opening Salmon lands on its create-or-import screen.

**Acceptance Scenarios**:

1. **Given** Salmon has no wallet, **When** any dApp request arrives, **Then** Salmon says no wallet is set up and offers "Open Salmon" and "Close", whatever network the dApp asked for.
2. **Given** that screen, **When** the user opens Salmon, **Then** the dApp is told the user declined and Salmon's own app opens on its first screen.
3. **Given** that screen, **When** the user closes it or goes back, **Then** the dApp is told the user declined and Salmon closes.

---

### User Story 3 - A network Salmon does not support (Priority: P2)

A dApp asks for testnet, or for a network name Salmon does not know. Salmon says it does not support that network and closes back to the dApp, which is told the user declined. It no longer suggests switching to a network Salmon cannot use.

**Why this priority**: rarer than devnet, but the current message tells the user to do something impossible.

**Independent Test**: point the test page at testnet and tap Connect: Salmon names testnet as unsupported and offers only Close.

**Acceptance Scenarios**:

1. **Given** a dApp asks for testnet, **When** the request arrives, **Then** Salmon says it supports Mainnet and Devnet but not this network, and offers only Close.
2. **Given** that screen, **When** the user closes it, **Then** the dApp is told the user declined.

---

### Edge Cases

- A watch-only active account and a network mismatch: the watch-only refusal stands; switching networks would not let the account sign.
- A request with no network named: the protocol defaults it to mainnet, so it is handled as a mainnet request.
- The legacy network names (`mainnet-beta`, `devnet`, `testnet`) are handled as their current names.
- Switching network while other requests from the same dApp are queued: the queued requests are judged against the new network when their turn comes.
- The dApp closes the session while the switch offer is on screen: the offer closes and nothing changes.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: When a dApp request names a network Salmon supports but is not using, Salmon MUST offer to switch to it, naming both networks, before showing the request.
- **FR-002**: Accepting the switch MUST change Salmon's active network to the requested one and then show the original request as if it had arrived on that network.
- **FR-003**: Declining the switch MUST answer the dApp "declined" and leave Salmon's network unchanged.
- **FR-004**: When Salmon has no wallet, every dApp request MUST be answered with a screen that says so and offers to open Salmon; network checks MUST NOT run first.
- **FR-005**: Opening Salmon from that screen MUST answer the dApp "declined" and bring Salmon's own app to the front.
- **FR-006**: A request for a network Salmon does not support MUST be refused with a message that names the network and the networks Salmon supports, with no suggestion to switch.
- **FR-007**: Every refusal MUST still reach the dApp exactly once, as today.
- **FR-008**: The new screens MUST reuse Salmon's existing sheet, button and text components and design tokens, and be translated into every language the app ships.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On a phone with a wallet, a dApp on devnet connects in one extra tap (the switch) when Salmon is on mainnet.
- **SC-002**: On a fresh install, a user picking Salmon from a dApp reaches Salmon's create-or-import screen in one tap.
- **SC-003**: No dApp request ends with a message that tells the user to do something Salmon cannot do.
- **SC-004**: Solana Mobile's test page completes Connect, Sign Message and Sign Transaction on both mainnet and devnet against the release build.

## Assumptions

- Salmon supports exactly two Solana networks for dApps, Mainnet and Devnet, as spec 036 established.
- Switching network from a dApp request is the same switch Settings offers; it affects the whole app, as it does there.
- Trusted apps stay per network, as today: a dApp trusted on mainnet is asked to connect again on devnet.
- iOS has no Mobile Wallet Adapter and is out of scope.
