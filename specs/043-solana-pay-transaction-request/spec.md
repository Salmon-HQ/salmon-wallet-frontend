# Feature Specification: Solana Pay transaction requests — pay a merchant that builds the transaction

**Feature Branch**: `feat/043-solana-pay-transaction-request`

**Created**: 2026-11-12

**Status**: Draft, three questions for the tester open (see §Open questions)

**Input**: Linear DEV-209. "A tester paid with Solana Pay at a merchant using Kora (a service that pays the network fee for the user) and it failed: Salmon rejects Solana Pay transaction requests (`solana:https://…`) with 'This kind of payment request is not supported yet'; spec 033 supports only transfer requests (`solana:<address>?amount=…`). With Kora the merchant can only use transaction requests: the transaction comes from the merchant server already signed by Kora as fee payer, and the wallet must add the user's signature without touching Kora's. Build: read the link, fetch the merchant's label and icon, send the user's address, receive the transaction, review it as untrusted, sign only the user's slot, keep Kora's signature, send it."

## Why this exists

Solana Pay has two kinds of request. A **transfer request** names a recipient, an amount and a token; the wallet builds the transfer itself. Salmon reads these since spec 033. A **transaction request** names a merchant's web address instead; the wallet asks that server for a ready-made transaction and signs it. Salmon refuses these today with "This kind of payment request is not supported yet".

Merchants that use a fee sponsor such as Kora can only use the second kind, because the sponsor has to put its own signature on the transaction before the wallet sees it: the merchant's server builds the transaction, the sponsor signs as the account that pays the network fee, and the wallet adds the user's signature next to it. A tester hit exactly this at a merchant and the payment failed. Every point-of-sale that charges the user nothing in network fees, and every merchant flow that needs more than a plain transfer (loyalty, receipts as tokens, multi-party splits), goes through transaction requests, so a wallet that refuses them is locked out of a large part of Solana Pay.

A transaction that a server hands the wallet is untrusted by definition: the merchant decides what it does. So this feature reuses the protection the wallet already gives a website that asks it to sign (a dApp transaction): a simulation of what the transaction does, a summary of what leaves the wallet, the same risk warnings, and a signature that fills only the user's own slot and leaves every other signature untouched.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Pay a merchant whose fee is sponsored (Priority: P1)

A Salmon user at a counter scans the merchant's Solana Pay QR with the phone camera (or pastes the link into the extension). The wallet shows the merchant's name, icon and web domain while it fetches the payment. It then shows a review of the transaction the merchant prepared: what leaves the user's wallet (for example 12.50 USDC), what arrives, and that the network fee is paid by someone else. The user confirms, the wallet adds the user's signature next to the sponsor's, sends it, and shows the usual receipt.

**Why this priority**: it is the failure the tester reported, and the only way a fee-sponsored merchant can be paid.

**Independent Test**: on devnet, stand up a merchant endpoint that returns a transaction already signed by a fee sponsor (or use the tester's merchant); scan its link from mobile and paste it into the extension; confirm the review shows the merchant, the amount leaving and "fee paid by another account"; confirm; the transaction lands with both signatures and the user's SOL balance pays no fee.

**Acceptance Scenarios**:

1. **Given** a `solana:https://…` link from a merchant whose transaction arrives signed by a fee sponsor, **When** the user opens it, **Then** the wallet shows the merchant's label, icon and domain, fetches the transaction, and opens the review without asking for anything else.
2. **Given** the review is open, **When** the user looks at it, **Then** it shows every token and amount that leaves the user's account, everything that arrives, the account that pays the network fee (not the user), and the merchant's message if it sent one.
3. **Given** the user confirms, **When** the wallet signs, **Then** it adds only the user's signature, every signature already present stays byte-for-byte as received, the fee payer and the recent blockhash are unchanged, and the transaction is sent to the network.
4. **Given** the transaction is sent, **When** it lands, **Then** the user sees the wallet's usual confirmation and receipt, and the payment appears in Activity.
5. **Given** a wallet whose recovery phrase has not been confirmed yet, **When** the user confirms the payment, **Then** the wallet first asks for the recovery phrase confirmation, exactly as for any first outgoing transaction, and signs only after it passes.

---

### User Story 2 - Refuse a transaction that cannot be trusted (Priority: P1)

The wallet checks what the merchant sent before it ever offers a confirm button. A link that is not a secure web address, a server that answers with an error or with something unreadable, a signature already on the transaction that does not verify, a transaction that needs another party's signature that is missing, a transaction that does not need the user's signature at all, or a simulation that fails: each stops the flow with a plain message saying what went wrong, and nothing is signed.

**Why this priority**: the transaction comes from a server the user has no reason to trust; a payment flow that can be tricked into signing is worse than no payment flow.

**Independent Test**: a devnet test endpoint returns, in turn: an HTTP link, an HTTP error, a non-JSON body, an icon that is not an absolute URL to an image, a transaction with a tampered sponsor signature, a transaction missing the sponsor's signature, a transaction that does not list the user as a signer, and a transaction that fails simulation. Each one shows its own message and none reaches the confirm step.

**Acceptance Scenarios**:

1. **Given** a link that does not decode to an absolute `https://` address, **When** the user opens it, **Then** the wallet says the payment link is malformed and contacts no server.
2. **Given** the merchant's server answers with an error status, a redirect it cannot follow safely, a timeout, or a body that is not the expected shape, **When** the wallet fetches, **Then** it says the merchant could not be reached or answered something unreadable, and offers to try again.
3. **Given** the merchant's details carry an icon that is not an absolute address to an SVG, PNG or WebP image, **When** the wallet reads them, **Then** it rejects the request as malformed.
4. **Given** a transaction that carries signatures, **When** any of them does not verify against the transaction, **Then** the wallet rejects it as malformed.
5. **Given** a transaction that carries signatures, **When** a signature other than the user's is missing, **Then** the wallet rejects it as unsafe, because signing it would hand the user's signature to a transaction someone else can still change.
6. **Given** a transaction that does not ask for the user's signature, **When** the wallet reads it, **Then** it refuses it; it never signs with any key but the user's account.
7. **Given** a transaction whose simulation fails or shows the user losing more than the review can explain, **When** the review opens, **Then** it carries the same warnings and the same blocking rules a dApp transaction carries.

---

### User Story 3 - Pay a merchant without a fee sponsor (Priority: P2)

Some merchants use transaction requests without a sponsor: the server returns a transaction with no signatures. The wallet makes the user the fee payer, sets a fresh recent blockhash, shows the network fee in the review as a cost to the user, and signs as the sole signer.

**Why this priority**: it is the plain form of the same standard and costs little once the sponsored case works; a merchant should not have to add a sponsor to be payable from Salmon.

**Independent Test**: a devnet endpoint returns an unsigned transaction; the review shows the user as fee payer and the fee amount; confirming lands the transaction with the user's signature only.

**Acceptance Scenarios**:

1. **Given** an unsigned transaction from the merchant, **When** the review opens, **Then** the user's account is the fee payer and the fee is shown as the user's cost.
2. **Given** the user lacks the SOL to pay that fee, **When** the review opens, **Then** it says so and the confirm action is unavailable.

---

### User Story 4 - Recover when the merchant's transaction goes stale (Priority: P2)

A sponsored transaction carries the merchant's recent blockhash, which the wallet cannot change without breaking the sponsor's signature, and which expires about a minute after it was issued. If it expires while the user reads the review, the wallet asks the merchant for the transaction again instead of sending one the network will reject.

**Why this priority**: people read before they pay; a review that silently goes dead after a minute turns a slow reader into a failed payment.

**Independent Test**: open a sponsored payment on devnet, wait until its blockhash expires, confirm; the wallet fetches a fresh transaction, shows the review again if anything the user sees changed, and lands it.

**Acceptance Scenarios**:

1. **Given** the review is open and the transaction's blockhash expires, **When** the user confirms, **Then** the wallet requests the transaction again from the merchant before signing.
2. **Given** the refreshed transaction differs in anything the review shows (amounts, tokens, fee payer, recipients), **When** it arrives, **Then** the wallet shows the new review and asks the user to confirm again; it never signs a transaction the user did not see.
3. **Given** the merchant cannot be reached for a fresh transaction, **When** the refresh fails, **Then** the wallet says the payment expired and nothing is sent.

---

### User Story 5 - Accounts that cannot sign stay out (Priority: P3)

A watch-only account (one the wallet only observes, with no key) opens a transaction request link. The wallet tells the user this account cannot pay and contacts no merchant, the same way Send is closed to watch-only accounts.

**Why this priority**: the rule already exists for Send; this keeps it consistent and keeps the user's address from being sent to a server for nothing.

**Independent Test**: switch to a watch-only account, open a transaction request link; the wallet shows the watch-only message and makes no network request to the merchant.

**Acceptance Scenarios**:

1. **Given** the active account is watch-only, **When** a transaction request link is opened, **Then** the wallet says this account cannot pay and makes no request to the merchant's server.

### Edge Cases

- The link is percent-encoded (`solana:https%3A%2F%2F…`) because it carries its own query string: the wallet decodes it once, keeps the merchant's query parameters, and sends them on both requests.
- The merchant's details arrive but the transaction request fails: the wallet shows the merchant it tried to pay and the failure, so the user knows which counter to talk to.
- The server's answer carries fields beyond `transaction` and `message`: the wallet ignores them.
- The user's account is on mainnet but the merchant's transaction targets devnet (or the reverse): the simulation fails against the active network and the review blocks it; the wallet never switches network on its own.
- The transaction uses address lookup tables (the v0 format): the wallet resolves them for the review the same way it does for dApp transactions, and refuses if they cannot be resolved.
- The merchant's transaction creates a token account for which the user pays rent (a refundable deposit the network charges to open an account): the review shows it as SOL leaving the user, even when a sponsor pays the network fee.
- The same link is opened twice: each opening is a fresh request to the merchant; the wallet keeps no record of past transaction requests beyond Activity.
- The merchant's icon fails to load: the review shows the domain and label without an icon and carries on.
- The user leaves the review (back, close, lock): nothing is signed and nothing is sent; reopening the link starts over.
- The QR carries a transfer request (`solana:<address>?…`): it keeps going to the locked Send review of spec 033, unchanged.

## Requirements _(mandatory)_

### Functional Requirements

**Reading the link**

- **FR-001**: The wallet MUST recognise a Solana Pay transaction request: a `solana:` link whose path decodes to an absolute `https://` address. It MUST decode a percent-encoded address once and keep its query string.
- **FR-002**: A `solana:` link whose path is a web address that is not absolute HTTPS MUST be rejected as malformed, before any network request.
- **FR-003**: On mobile the wallet MUST accept a transaction request from the camera scanner and from pasted text; on the extension, from pasted text. Wherever a transfer request is accepted today, a transaction request MUST be accepted too, and transfer requests MUST keep their current behaviour.
- **FR-004**: The active account MUST be able to sign: watch-only accounts and non-Solana networks MUST get a clear refusal, and the wallet MUST make no request to the merchant in that case.

**Talking to the merchant**

- **FR-005**: The wallet MUST fetch the merchant's details with a GET request that asks for JSON, carries nothing that identifies the user or the wallet beyond what any client sends, and expects a `label` and an `icon`.
- **FR-006**: The `icon` MUST be an absolute address to an SVG, PNG or WebP image; otherwise the request MUST be rejected as malformed.
- **FR-007**: The wallet MUST show the merchant's label, icon and the domain of the link while the payment is prepared and on the review, so the user can tell which merchant asks.
- **FR-008**: The wallet MUST then POST the user's account address to the same address, as `{"account":"<address>"}`, and expect a `transaction` (a serialized transaction) and an optional `message`. Fields beyond these MUST be ignored.
- **FR-009**: Any error status, unsafe redirect, timeout, non-JSON body or missing field on either request MUST stop the flow with a message saying the merchant could not be reached or answered something unreadable, and MUST offer a retry. Nothing is signed.

**Checking the transaction**

- **FR-010**: The wallet MUST read both transaction formats, legacy and v0, including v0 address lookup tables.
- **FR-011**: If the transaction carries no signatures, the wallet MUST set the user's account as fee payer and a fresh recent blockhash before review.
- **FR-012**: If the transaction carries any signature, the wallet MUST NOT change its fee payer, recent blockhash or any instruction, and MUST verify every signature present; one that does not verify MUST make the request malformed.
- **FR-013**: The wallet MUST sign only with the account it sent in FR-008, and only if the transaction expects that account's signature. A transaction that does not expect it MUST be refused.
- **FR-014**: If the transaction carries signatures and any signature other than the user's is still missing, the wallet MUST reject it as unsafe and MUST NOT sign.

**Review and sign**

- **FR-015**: The review MUST treat the transaction as untrusted with the same risk class as a dApp transaction: it MUST simulate it on the active network, summarise every asset that leaves and arrives at the user's account (including SOL paid as fee or as rent), name the fee payer, show the merchant's message, and apply the same warnings and blocking rules.
- **FR-016**: The bytes the wallet signs MUST be exactly the transaction the review simulated and showed; any difference MUST stop the signing.
- **FR-017**: Signing MUST fill only the user's signature slot and MUST keep every other signature exactly as received.
- **FR-018**: Before signing, the wallet MUST pass the recovery-phrase confirmation gate that guards every first outgoing transaction of a new wallet.
- **FR-019**: If the transaction's recent blockhash has expired by the time the user confirms, the wallet MUST request the transaction again from the merchant; if what the review shows changes, it MUST show the new review and ask again; if the merchant cannot be reached, it MUST say the payment expired.
- **FR-020**: After signing, the wallet MUST send the transaction to the network itself and show the usual wait, confirmation and receipt; the payment MUST appear in Activity [NEEDS CLARIFICATION: does the tester's merchant expect the wallet to send the signed transaction to the network (assumed, the usual practice), or to hand it back to the merchant's server to send?].

**Both surfaces**

- **FR-021**: Mobile and extension MUST behave the same on one shared contract; the only platform difference is how the link is captured (camera or paste).
- **FR-022**: Every user-facing string MUST exist in English and Spanish, and the existing "not supported yet" message MUST no longer appear for transaction requests.

### Key Entities

- **Transaction request link**: a `solana:` link that holds a merchant's HTTPS address instead of a recipient. It carries no secret and no amount; the merchant's server decides both.
- **Merchant details**: the label and icon the merchant's server returns, plus the domain of the link, shown to the user so they know who asks.
- **Merchant transaction**: the serialized transaction the server returns for the user's address, with an optional message. Untrusted until checked; may arrive unsigned or already signed by other parties such as a fee sponsor.
- **Fee sponsor**: a party other than the user (Kora, in the tester's case) that pays the network fee and signs the transaction as fee payer before the wallet sees it.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The tester's fee-sponsored merchant payment that fails today completes from Salmon on both mobile and extension, with the network fee paid by the sponsor and nothing paid in fees by the user.
- **SC-002**: A user goes from scanning the QR to the review screen in under 5 seconds on a normal connection, and from scan to confirmed payment in under 30 seconds.
- **SC-003**: Each malformed or unsafe case in User Story 2 is refused with its own message in a test set covering every case alone, and in none of them does the wallet produce a signature.
- **SC-004**: In every signed transaction, every signature that was present when the merchant's transaction arrived is unchanged, verified across a test set of sponsored legacy and v0 transactions.
- **SC-005**: A payment whose blockhash expired during review either lands after a fresh fetch or ends with "payment expired"; it never fails on the network for an expired blockhash.
- **SC-006**: Transfer requests keep passing every acceptance scenario of spec 033.
- **SC-007**: Every gate the repository already runs (typecheck, lint, tests, parity, i18n, no-secrets, bundle check, manifest) stays green on both surfaces.

## Assumptions

- **Signing order: the sponsor signs first.** The Solana Pay standard delivers the transaction from the merchant's server, so a sponsor's signature can only be on it before the wallet signs; the wallet adds the user's signature last. Kora's own guide shows a user-first order, in which the client signs and the sponsor signs afterwards. A transaction that arrives with the sponsor's slot empty is, by the standard's rule, rejected as unsafe (FR-014), so the tester's setup decides whether this feature works for them out of the box [NEEDS CLARIFICATION: does the tester's merchant have its Kora node sign before the transaction reaches the wallet (Solana Pay order), or does it expect the user to sign first and Kora after, as Kora's guide shows?].
- **The wallet submits the transaction.** This is the usual practice for Solana Pay transaction requests and the wallet's own behaviour everywhere else; it is unverified for the tester's merchant (see FR-020).
- **A test merchant is needed.** Building and verifying the flow requires a merchant endpoint on devnet that returns sponsored and unsponsored transactions and each failure case in User Story 2 [NEEDS CLARIFICATION: is there a test QR or merchant from the tester, or do we stand up our own devnet endpoint following Kora's guide?].
- **Same risk class as a dApp transaction.** The review reuses the simulation, the asset summary, the foreign-fee-payer handling and the warnings the wallet already applies when a website asks it to sign; the merchant gets no extra trust for arriving through a QR.
- **The merchant's domain is what the user can check.** Solana Pay offers no merchant verification beyond the HTTPS address; the wallet shows the domain and does not claim the merchant is who its label says.
- **No record of requests.** The wallet stores nothing about a transaction request beyond the transaction in Activity, as with any send.
- **Known risk: sponsored payments have their own failure modes.** A Solana Foundation pull request removed Kora sponsorship from its own `/pay` flow citing three problems: transactions built for the wrong network, rent for new token accounts charged to the payer even though the sponsor pays the fee, and floods of transactions that touch a payment's reference account (https://github.com/solana-foundation/solana-developer-platform/pull/2467). The first two are what the simulation and the asset summary are for (wrong network fails simulation; rent shows as SOL leaving the user); the third is a merchant-side settlement problem the wallet cannot see.
- **Out of scope**: a link handler that opens `solana:` links from other apps or web pages (the capture paths are camera and paste, as in spec 033), merchant allow-lists or reputation, returning a signed transaction to anyone other than the network, and charging any Salmon fee.

## Open questions

For the tester, through the owner. They decide whether the first version works at the tester's merchant, not the shape of the feature.

1. **Signing order** (§Assumptions): does the merchant's Kora node sign before the wallet, or after?
2. **Who sends the transaction** (FR-020): the wallet, or the merchant's server?
3. **Test merchant** (§Assumptions): is there a test QR or merchant, or do we build our own devnet endpoint?
