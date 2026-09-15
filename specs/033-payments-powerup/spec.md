# Feature Specification: Payments — ask for USDC, pay what you scanned

**Feature Branch**: `feat/powerups-foundations` (spec dir `033-payments-powerup`)

**Created**: 2026-09-15

**Status**: Draft, waiting for the owner's UI/UX answers (see §Open questions for the owner)

**Input**: User description: "Payments Powerup (first Powerup). Merchant side: a Home sub-tab where the user creates a payment request (USDC only, amount + optional note, expiry 1h/24h/7d) for the active Solana network; the wallet generates a fresh reference keypair locally, builds a Solana Pay transfer-request URI and shows it as QR + shareable text; requests are stored on the device only; the wallet watches the reference on the RPC from the device and shows pending / paid / expired. Payer side: core Send learns Solana Pay transfer requests fully — scanning prefills a Send that the user only confirms. No backend database. Out of scope v1: x402, shareable web link, cross-device, webhooks, other tokens, Salmon fee."

## Why this exists

Today a person who wants to be paid in Salmon shows a bare address and says the amount out loud. The payer types the amount, picks the token, and hopes. Nothing ties the transfer to the request, so neither side can tell "paid" from "sent something".

Payments closes that loop with the Solana Pay transfer request, the standard every Solana wallet already scans: the receiver states the amount and the token once, the payer confirms exactly that, and a per-request reference lets the receiver's wallet find the settlement on chain by itself. It is the first Powerup because it needs nothing the wallet does not already have: an address, a signer, a QR, and a connection to the network. No server holds a record, no party stands between the two devices, and no funds ever rest anywhere but the two wallets. The reference implementation is Salmon Pay (Nacho's v0, `Salmon-HQ/salmon-pay`); this spec takes its request model and its settlement rule, and leaves behind everything that exists only because a merchant without a wallet needs a server.

The capability has two halves that ship together but are owned differently. **Asking** is the Powerup: a Home sub-tab that holds the requests the user made, which is state they own and return to. **Paying** is core Send: a scanned request is a Send with its fields already filled, and it must work for a user who never installed the Powerup, or the request only reaches people who already know Salmon.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ask for an amount and show it (Priority: P1)

A user with the Payments Powerup installed opens its tab, types an amount in USDC, optionally a note ("Table 4", "half the rent"), picks how long the request stays open (1 hour, 24 hours, 7 days), and taps to create it. The wallet shows a QR code and a copyable text of the request, addressed to the user's own account on the network they are standing on. The request appears in the tab's list as pending.

**Why this priority**: it is the receiver's whole job; nothing else in the feature has a reason to exist without a request to show.

**Independent Test**: create a request on devnet, scan the QR with any Solana Pay wallet (Phantom, Solflare) and confirm it reads the recipient, the amount, the token and the note the user typed. Deliverable on its own: a person can be paid by any wallet, not only by Salmon.

**Acceptance Scenarios**:

1. **Given** the user is on Solana mainnet with the Powerup installed, **When** they enter `12.50` and a note and create the request, **Then** the QR encodes a transfer request for 12.50 USDC to the user's address, with the note as the message, and the tab lists it as pending with its expiry.
2. **Given** the user is on Solana devnet, **When** they create a request, **Then** it names devnet's USDC, not mainnet's, and the list marks the network.
3. **Given** the user enters `0`, a negative number, more than 6 decimals, or nothing, **When** they try to create, **Then** the action is unavailable and the field says why.
4. **Given** a request exists, **When** the user taps copy, **Then** the clipboard holds the request text and any Solana Pay wallet that opens it reads the same fields as the QR.
5. **Given** the user has no account on the active network (watch-only excluded per the wallet's rules), **When** they open the tab, **Then** they see the Powerup's no-account state, not a form.

---

### User Story 2 - See that it was paid (Priority: P1)

While a request is shown, and later from the list, the wallet tells the receiver whether it was paid. It only says "paid" when the transfer is final on the network, carried exactly the requested amount of the requested token to the receiver's own account, and named the request's reference. It then shows who paid and when, and the transaction can be opened in the explorer.

**Why this priority**: a request without a verified "paid" is a QR of an address; the verification is the product.

**Independent Test**: create a request on devnet, pay it from a second wallet, watch the request flip to paid without the receiver touching anything; pay a second request with the wrong amount and confirm it stays pending.

**Acceptance Scenarios**:

1. **Given** a pending request is on screen, **When** a transfer that matches it becomes final on the network, **Then** within one refresh interval the screen shows paid, the payer's address and the time, and the list agrees.
2. **Given** a pending request, **When** a transfer names its reference but carries a different amount, a different token, or lands in an account the receiver does not own, **Then** the request stays pending and the wallet does not present the transfer as a payment.
3. **Given** a pending request, **When** its expiry passes unpaid, **Then** it reads expired, its QR is no longer offered, and it stays in the list as history.
4. **Given** a request was paid, **When** the same reference is seen again in any later transfer, **Then** nothing changes: paid is terminal.
5. **Given** the device is offline or the network is unreachable, **When** the user looks at a pending request, **Then** it says the status could not be checked and keeps the last known state; it never invents paid or expired.
6. **Given** a request was created on this device, **When** the app is closed and reopened, or the account is switched away and back, **Then** the request and its status are still there. Requests belong to the account that created them and to this device only.

---

### User Story 3 - Pay a scanned request with a normal Send (Priority: P1)

A Salmon user scans a Solana Pay QR with an amount and a token, from the Send screen or from the wallet's scanner. They land on a Send review whose recipient, token and amount are already set and cannot be edited, with the requester's label and message shown as what they are paying for. They confirm as they confirm any send. The transfer carries the request's reference and memo so the receiver's wallet recognises it. This works for every Salmon user, with or without the Payments Powerup, and for requests made by any merchant or wallet, not only Salmon's.

**Why this priority**: half of every payment is the payer; if Salmon cannot pay a Salmon request the feature is a demo.

**Independent Test**: scan a request created by Salmon Pay's own dashboard or by another Salmon device; confirm the review shows the requested amount and token locked; confirm; the requester's side flips to paid.

**Acceptance Scenarios**:

1. **Given** a scanned request with amount, token, reference, label and message, **When** the user reaches the review, **Then** recipient, token and amount are shown and locked, the label and message are visible, and the fee is the wallet's normal fee.
2. **Given** the request names a token the user does not hold, or holds less of than requested, **When** they reach the review, **Then** the wallet says so plainly and the confirm action is unavailable; it never substitutes another token.
3. **Given** the request names a token or a network the wallet does not know, **When** it is scanned, **Then** the wallet refuses with a message that says what it could not read, and never sends anything.
4. **Given** a request without an amount, **When** it is scanned, **Then** the wallet asks the user for the amount, as the standard requires, and locks recipient and token.
5. **Given** the user confirms, **When** the transfer lands, **Then** the receiver's wallet finds it by the reference and the memo carries the request's own identifier; the payer's Activity shows the send with the message.
6. **Given** the recipient has no account for that token yet, **When** the user confirms, **Then** the wallet creates it as part of the same transfer and shows that cost in the fee line, as Send already does for plain transfers.
7. **Given** the user is on the browser extension, which has no camera, **When** they open the request from its text (pasted or opened as a link), **Then** they reach the same locked review.

---

### User Story 4 - Find my requests later (Priority: P2)

The tab lists every request this account made on this device, newest first, each with amount, note, status and time. Tapping one reopens it: the QR again if pending, the payment details if paid, the history if expired. The user can remove a request they no longer want to see.

**Why this priority**: it makes the Powerup a place rather than a one-shot dialog, which is what earns it a tab.

**Independent Test**: create three requests, pay one, let one expire; the list shows the three states; reopening each shows what it should; removing one removes it from the list and from the device.

**Acceptance Scenarios**:

1. **Given** requests in the three states, **When** the user opens the tab, **Then** each row says its state without opening it.
2. **Given** a pending request in the list, **When** the user opens it, **Then** the QR and text are offered again and the status keeps refreshing.
3. **Given** the user removes a request, **When** they come back, **Then** it is gone; a paid request removed from the list is still a transfer in Activity.

---

### User Story 5 - The Powerup is off where it must be off (Priority: P2)

Payments follows the catalogue's rules like every Powerup: it is listed only where the backend's switch offers it, it is installed by the user from the catalogue after reading its disclosure, and turning it off hides the tab but never touches the transfers in Activity.

**Why this priority**: the foundation's contract; no Powerup ships outside it.

**Independent Test**: flip the backend's switch for `payments` on a stage; the tile disappears or shows its reason; an installed tab shows the disabled state with the reason.

**Acceptance Scenarios**:

1. **Given** the catalogue, **When** the user opens the Payments tile, **Then** the disclosure generated from the manifest says what leaves the device (the address, to Salmon only) and that the Powerup talks to no third party.
2. **Given** the backend switches Payments off for a network with a reason, **When** the user is on that network, **Then** the tab shows the reason and offers nothing else.

### Edge Cases

- Two requests created in the same second share nothing: every request has its own reference, so two payments never collide.
- A payer pays the same request twice: the first final transfer settles it; the second is an ordinary incoming transfer in Activity, not a second payment.
- A payment lands after expiry: the request stays expired in the list, and the transfer appears in Activity as an ordinary receipt. (The standard has no notion of expiry; it is Salmon's own courtesy.)
- The receiver switches network while a request is shown: the request belongs to the network it was made on; the tab shows only the active network's requests.
- The user's USDC token account does not exist yet: the request is still valid, and the payer's wallet creates the account, as the standard requires.
- Amount with a comma decimal separator: accepted and normalised; the QR always carries a dot.
- A scanned URI carries several references: all of them are attached to the transfer, in order.
- A scanned URI carries a memo longer than the memo program accepts: refused before the review, with the reason.
- The device clock is wrong: expiry is judged by the device, so a wrong clock expires early or late; the status check on chain is unaffected.
- A very old pending request with a reference that many later transactions touched: cannot happen, since the reference is fresh and only the payer ever includes it.

## Requirements _(mandatory)_

### Functional Requirements

**Asking (the Powerup)**

- **FR-001**: The Powerup MUST let the user create a payment request with an amount in USDC (up to 6 decimals, greater than zero), an optional note, and one of three expiries: 1 hour, 24 hours, 7 days.
- **FR-002**: A request MUST be addressed to the user's own account on the active Solana network, and MUST name that network's USDC.
- **FR-003**: Every request MUST carry a fresh, unique reference generated on the device; it MUST never be reused.
- **FR-004**: The wallet MUST encode the request as a Solana Pay transfer request URI carrying recipient, amount, token, reference, label (the account's name in the wallet), message (the note) and memo (the request's identifier), and MUST show it as a QR and as copyable text.
- **FR-005**: Requests MUST be stored on the device only, per account and per network, and MUST survive app restarts and account switches. No request, reference or status MUST ever be sent to Salmon's backend or to any third party.
- **FR-006**: The wallet MUST determine "paid" by itself, from the network, and MUST require all of: the transfer is final; it names the request's reference; the receiver's own account for the requested token gained exactly the requested amount. Anything short of all three MUST leave the request pending.
- **FR-007**: A paid request MUST show the payer's address, the settlement time and a way to open the transaction in the explorer; paid MUST be terminal.
- **FR-008**: A request whose expiry has passed unpaid MUST read expired, MUST no longer offer its QR, and MUST remain in the list.
- **FR-009**: While a pending request is on screen the wallet MUST refresh its status on its own at a fixed interval, and the list MUST refresh the pending ones when opened; a check that fails MUST say so and keep the last known state.
- **FR-010**: The tab MUST list the account's requests on the active network, newest first, with amount, note, state and time; the user MUST be able to reopen and remove any of them.
- **FR-011**: The Powerup MUST declare in its manifest: id `payments`, tier core, networks Solana mainnet and Solana devnet, what leaves the device: the address (to Salmon only, via the existing network listing), no external endpoints, no on-chain programs of its own, one Home sub-tab. The catalogue's disclosure MUST be generated from those declarations, never written by hand.
- **FR-012**: The Powerup MUST obey the backend's per-network switch like every Powerup, and turning it off MUST hide the tab without touching Activity or stored requests.
- **FR-013**: The Powerup MUST charge no fee and MUST carry no fee line; the place where a fee would go stays empty by design (see §Assumptions).

**Paying (core Send)**

- **FR-020**: Core Send MUST read a Solana Pay transfer request in full: recipient, amount, token, one or more references, label, message and memo, and MUST refuse a request it cannot read completely, saying which part.
- **FR-021**: A request with amount and token MUST open the Send review with recipient, token and amount set and not editable; a request without an amount MUST ask the user for it and lock the rest.
- **FR-022**: The review MUST show the requester's label and message as what the user is paying for, and MUST show the wallet's usual fee, including the cost of creating the recipient's token account when needed.
- **FR-023**: If the user does not hold the requested token, or holds less than requested, the review MUST say so and MUST NOT offer to confirm; the wallet MUST never substitute another token.
- **FR-024**: The transfer the wallet signs MUST include every reference from the request as read-only keys on the transfer instruction, in order, and MUST place the memo as its own instruction immediately before the transfer, so the receiver's wallet recognises the payment.
- **FR-025**: Paying MUST work for every Salmon user regardless of whether the Payments Powerup is installed, and for requests produced by any Solana Pay source, not only Salmon.
- **FR-026**: The Send screen MUST offer a way to start from a scan on mobile and from a pasted or opened request on the extension; the existing "scan an address" behaviour MUST keep working for QR codes that carry only an address.
- **FR-027**: Signing and broadcasting MUST happen on the device, through the wallet's existing confirmation, wait and receipt; nothing about a payment MUST pass through Salmon's backend.

**Both**

- **FR-030**: Every user-facing string MUST exist in English and Spanish; the Spanish copy MUST come from the owner.
- **FR-031**: Both surfaces (mobile and extension) MUST offer the same behaviour on one contract, with the platform differences limited to how a request is captured (camera vs paste/link).

### Key Entities

- **Payment request**: what the receiver asks for. Identifier, account it belongs to, network, amount (display and atomic), token, note, reference, created time, expiry, state (pending, paid, expired), and when paid: the settling transaction, the payer and the settlement time. Lives on the device that created it.
- **Reference**: a fresh public key generated per request, never a signer, whose only job is to be findable on chain. The receiver keeps only the public half; nothing signs with it.
- **Transfer request (URI)**: the standard's encoding of a request. It is what leaves the receiver's device (as QR or text) and what enters the payer's. It carries no secret.
- **Settlement**: the final on-chain transfer that matches a request in reference, token, recipient ownership and exact amount. Paired one-to-one with a paid request.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user creates a request and has a scannable QR on screen in under 15 seconds from opening the tab.
- **SC-002**: A request created in Salmon is read correctly (recipient, amount, token, note) by at least two other Solana Pay wallets on devnet and mainnet.
- **SC-003**: After a matching transfer becomes final, the receiver's screen shows paid within 10 seconds without any action from the receiver.
- **SC-004**: A transfer that names the reference but differs in amount, token or recipient ownership is never shown as paid, across a test set that covers each mismatch alone.
- **SC-005**: A Salmon user pays a scanned request in under 30 seconds from scan to confirmation, with no field to type when the request carries an amount.
- **SC-006**: A payment made from Salmon is recognised as paid by Salmon Pay's own dashboard and by another Salmon device, on devnet, with the reference and memo intact.
- **SC-007**: Nothing about a request or a payment appears in the backend's logs or metrics for the feature: the only backend traffic is the existing network listing.
- **SC-008**: Every gate the repository already runs (typecheck, lint, tests, parity, i18n, no-secrets, bundle check, manifest) stays green on both surfaces.

## Assumptions

- **USDC only, v1.** One token per network, six decimals, no token picker on the asking side. Other fungible tokens and SOL are a later increment; "pay with any token" depends on a swap and is not planned here.
- **No server, no database.** The request is the URI; the device keeps its own list. A shareable web page for payers without a wallet, cross-device visibility, webhooks and x402 are explicitly out of v1 and would each need a server-side record. x402 is a channel for software clients receiving an HTTP 402 and is not something a consumer wallet UI pays; if it ever exists it is a backend feature.
- **"Paid" means final.** The receiver's check uses the network's strongest commitment. The payer's own receipt, as everywhere in the wallet, appears at the wallet's usual commitment; the two need not agree to the second.
- **Expiry is a courtesy, not a rule of the standard.** The wallet judges it on the device; a late payment is still a receipt in Activity.
- **Label is the account's name.** Salmon Pay hardcodes "Salmon Pay"; the wallet uses what the user already calls the account, and never invents a merchant identity.
- **No Salmon fee.** A fee on a payment between two other parties raises payment-intermediary questions (money transmission, merchant identification, reporting) that the swap's fee did not, because there the user traded with themselves. Counsel decides before any code; the spec keeps the slot empty on purpose.
- **Watch-only accounts** can ask (they have an address) but never pay; whether the tab is offered to a watch-only account is an owner question (below).
- **The backend's only change** is one read-only entry for `payments` in its Powerup registry so the per-network switch can list and gate it. No adapter, no endpoint.
- **The Powerup depends on core Send learning the standard**, and that Send change ships in the same increment; it is core code, reviewed under core's rules, not `powerups/**`.
- **Status checks are polling.** A subscription-based watch is an optimisation for later if the polling interval proves too slow or too chatty.

## Open questions for the owner

Product and UX, to answer before the plan. None blocks the data model above.

1. **Where does the payer start?** The Send screen gains a scan-first entry that leads to a locked review. Does scanning live as a button on Send's first step, as the wallet header's scanner (the Explore discovery action was going to sit there too), or both?
2. **What does the locked review look like?** A Send review with fields that cannot be edited, plus label and message. Is it the ordinary Send review with the fields shown as read-only, or a distinct "You are paying" review that reads like an invoice?
3. **The asking form.** Amount, note, expiry. Is expiry a visible choice or a default (24 hours) with the choice behind a tap?
4. **The request screen.** QR, amount, note, expiry countdown, copy, share. Does the status live on this screen as a live line, or does the screen close and the list carry the status?
5. **The list row.** Amount, note, state, time. Does a paid row show the payer inline or only when opened?
6. **Watch-only accounts**: offer the tab (they can ask, not pay) or hide it?
7. **Removing a request**: swipe, a trailing action, or only from the detail?
8. **Extension capture**: paste field on Send, `solana:` link handler, or both?
9. **Spanish copy** for every string above, from you.
