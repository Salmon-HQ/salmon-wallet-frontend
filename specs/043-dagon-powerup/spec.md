# Feature Specification: Dagon Powerup (devnet preview)

**Feature Branch**: `feat/dev-93-dagon-powerup` (never merged; the backend half lives on the branch of the same name in `salmon-wallet-backend`)

**Created**: 2026-10-27 (research) · **Rewritten**: 2026-10-30 (owner decisions)

**Status**: Draft, ready for planning. Research and spike in [research.md](./research.md).

**Input**: Owner (Linear DEV-93; decisions 2026-10-30): a Breakpoint demo (Solana Breakpoint, Nov 15-17, 2026) of every Dagon flow on devnet, as one Home sub-tab of the mobile app, distributed only through the EAS `staging` profile, with core generating the extra keys Dagon's programs need.

## Context

Dagon (Inkwell Finance) publishes two Solana programs, pc-token and pc-swap, built on Encrypt (dWallet Labs), a network meant to do arithmetic on encrypted numbers. A pc-token is a copy of an ordinary token whose balance is stored as a ciphertext account. On devnet today Encrypt is pre-alpha: nothing is actually encrypted, the tokens are worthless mocks, and failures are silent (an insufficient balance or a missed swap minimum succeeds on chain and moves nothing). [research.md](./research.md) has the full protocol facts and the spike.

Dagon's programs require brand-new keypairs ("fresh signers") to co-sign every transaction except send and the last withdraw step. Salmon's Powerup contract forbids a Powerup from touching keys, and core replaces the blockhash right before signing, so any earlier co-signature would be invalidated. This spec therefore adds one narrow, security-sensitive core capability (FR-040..FR-046) alongside the Powerup itself.

## Owner decisions (2026-10-30)

Recorded as decided; the requirements below implement them.

| # | Decision | Reason |
| --- | --- | --- |
| D1 | A demo build for Solana Breakpoint (Nov 15-17, 2026). It lives on `feat/dev-93-dagon-powerup`, which is **never merged**. | A devnet preview of a pre-alpha protocol is not a product release. |
| D2 | Distributed only through the EAS `staging` profile (`apps/mobile/eas.json`: internal distribution, update channel `staging`, staging backend). Never the production channel, never TestFlight, never a store. | Apple guideline 2.2 (demos and betas do not belong on the App Store); the iOS 1.4.0 review in progress; EU AMLR art. 79 risk for a store feature. |
| D3 | Surface: one Home sub-tab (`entries.tab`, the only Powerup surface the manifest supports). Mobile only, iOS demo. The missing DOM twin is recorded as a `MOBILE_ONLY` entry in `scripts/check-dom-parity.mjs` with its reason. | Holds state the user returns to (balances, in-progress operations). |
| D4 | Powerup id `dagon`; display name "Dagon (devnet preview)"; the word "private" never appears; `networks: ['solana-devnet']` only. | Names the counterparty; no claim the protocol cannot back today. |
| D5 | Flows, all built: Activate (setup), Hide (wrap), Reveal, Send, Swap, Withdraw (unwrap, 3 steps). Withdraw is built and tested but OFF in the demo behind a switch. Send is behind a switch until Dagon verifies transfer. | An executor drop during withdraw strands the burned amount with no refund; Dagon has not verified transfer end to end. |
| D6 | Copy: the agent proposes EN and ES strings; the owner approves them before the build. | Repo i18n rule: Spanish is never guessed. |
| D7 | Tab layout: see User Story 1-6 and FR-020..FR-032 (usage line, devnet notice, balances card per token, actions as sheets, "In progress" card, first visit shows only "Activate"). Receipts say "submitted, Encrypt is processing", never "done". The pending-activity banner is not used. | A confirmed signature does not mean anything moved. |
| D8 | Test tokens: no public faucet (`faucetUrl` is null). Dagon funds wallet addresses we send them (1000 mock-USDC + 1000 mock-DOGE, 4 h cooldown). The demo uses pre-funded team wallets. When `faucetUrl` becomes non-null, a "Get test tokens" action appears. | |
| D9 | Signing: core-generated fresh signers and an ephemeral viewer key, as specified in FR-040..FR-046. | No key leaves the device, the backend signs nothing, the Powerup never holds a key. |
| D10 | Cross-repo build contract as in FR-050..FR-053, shared word for word with the backend spec. | |

## User Scenarios & Testing _(mandatory)_

All scenarios run on iOS against Solana devnet, in a build from the EAS `staging` profile, with a team wallet Dagon has pre-funded with mock-USDC, mock-DOGE and devnet SOL.

### User Story 1 - Activate and see the tab (Priority: P1)

A demo visitor opens the Dagon tab for the first time. Above everything is the usage line and a notice that this is a devnet preview whose amounts are not actually encrypted yet. The only action offered is "Activate". After activating (one confirmation per mock token on the core screen), the tab shows a balances card for each Dagon mock token and the actions Hide, Send, Swap and Withdraw (the latter two only when their switches are on).

**Why this priority**: every other flow needs an activated account; the devnet notice is the honesty floor of the whole demo.

**Independent Test**: on a fresh devnet wallet, open the tab, tap Activate, confirm; the balances cards appear with the public balance and "not revealed yet" for the hidden balance.

**Acceptance Scenarios**:

1. **Given** a wallet on devnet that never activated Dagon, **When** the user opens the tab, **Then** the usage line, the devnet notice and a single "Activate" action are shown, and no balances card or other action.
2. **Given** the first visit, **When** the user taps Activate and confirms on the core screen, **Then** core signs with the user key plus the fresh keys it generated, the receipt says the activation was submitted and Encrypt is processing, and the item appears in "In progress".
3. **Given** activation settled, **When** the tab re-renders, **Then** each mock token shows its public balance and its hidden balance as "not revealed yet", and no reveal is triggered automatically.
4. **Given** any state of the tab, **When** it is on screen, **Then** the devnet notice is visible without scrolling or dismissing.

---

### User Story 2 - Hide tokens (Priority: P1)

The user moves an amount of a mock token from its public balance into its hidden balance. A sheet asks for the amount and token (amount entry and token picker), core shows the confirmation, and the receipt says the hide was submitted and Encrypt is processing. The wrap amount is public on chain, and the sheet says so.

**Why this priority**: it is the first thing a demo shows and the source of every hidden balance.

**Independent Test**: hide 10.00 mock-USDC; the public balance drops by 10.00; the item moves from "processing" to "done" once Encrypt settles; a later reveal shows 10.00 more.

**Acceptance Scenarios**:

1. **Given** an activated wallet with 1000.00 mock-USDC, **When** the user hides 10.00, **Then** the confirmation shows the amount, token and network fee, and after confirming the receipt never says "done".
2. **Given** the hide was submitted, **When** Encrypt settles the balance ciphertext, **Then** the "In progress" item turns "done" and the hidden balance card is marked "may be out of date" until the next reveal.
3. **Given** an amount with more than 2 decimals, **When** the user types it, **Then** the input refuses the extra digits (mock tokens have 2 decimals).

---

### User Story 3 - Reveal a hidden balance (Priority: P1)

The user taps "Reveal" on a token's card. Before anything happens, the user sees that a reveal sends a transaction and costs about 0.0023 devnet SOL of rent that is not returned. After confirming, the card shows the revealed amount and the time it was read.

**Why this priority**: without it the user cannot learn the outcome of any operation, because failures are silent.

**Independent Test**: after a settled hide of 10.00, tap Reveal; the card shows the hidden balance with the read time; closing and reopening the tab shows the same value and time without a new transaction.

**Acceptance Scenarios**:

1. **Given** a card with a last revealed value, **When** the tab renders, **Then** it shows that value and its time, and sends no transaction.
2. **Given** the user taps Reveal, **When** core shows the confirmation, **Then** the cost of the reveal is stated before the user confirms.
3. **Given** the reveal transaction confirmed and its copy settled, **When** the device reads it from Encrypt, **Then** the value is signed for with an ephemeral viewer key core generated, the user's key signs no message, and the card shows the value and the time of the read.
4. **Given** the read returns fewer than 8 bytes, **When** it is decoded, **Then** the card shows an error with retry, never 0.

---

### User Story 4 - Swap between mock tokens (Priority: P1)

The user swaps hidden mock-USDC for hidden mock-DOGE with a minimum to receive. The sheet says the result is "at least this amount, or nothing moves", and that devnet does not enforce the minimum yet. The receipt says submitted; the outcome is known only after a reveal.

**Why this priority**: the swap against an encrypted pool is the headline of the demo.

**Independent Test**: swap 1.00 mock-USDC to mock-DOGE; the item turns "done" when both balance ciphertexts settle; revealing mock-DOGE shows the increase.

**Acceptance Scenarios**:

1. **Given** a settled hidden balance, **When** the user swaps, **Then** core's confirmation shows the amount in, the minimum out, the devnet-floor caveat and the network fee.
2. **Given** the user has no Dagon account for the output token, **When** the build answers `setup_required`, **Then** the wallet offers the setup transaction for that token first and then builds the swap.
3. **Given** the input token's hidden balance was never settled by Encrypt, **When** the user opens Swap, **Then** the swap is refused with "your earlier hide is still being processed".
4. **Given** the swap confirmed, **When** both balances settle, **Then** the item reads "done" and both cards are marked "may be out of date"; the screen never claims the swap filled.

---

### User Story 5 - Follow operations in progress (Priority: P2)

Every submitted operation appears in an "In progress" card in one of three states: processing, done, or outcome unknown. The card survives closing the app.

**Why this priority**: the honest answer to silent failures and to executor drops.

**Independent Test**: submit a hide, kill the app, reopen: the item is still there and resolves to "done" or "outcome unknown".

**Acceptance Scenarios**:

1. **Given** an operation confirmed on chain, **When** Encrypt has not settled it, **Then** it shows "processing".
2. **Given** settlement observed (the watched balance ciphertext changed and is marked settled), **When** the watcher sees it, **Then** it shows "done", meaning Encrypt finished, not that funds moved.
3. **Given** no settlement within the time cap, **When** the cap passes, **Then** it shows "outcome unknown" with a suggestion to reveal later, never an error that implies nothing happened.
4. **Given** core reported the transaction outcome as unknown, **When** the Powerup receives that, **Then** the form is cleared, the item is "outcome unknown", and nothing is resubmitted.

---

### User Story 6 - Send hidden tokens (Priority: P2, behind a switch)

The user sends a hidden mock-token amount to another devnet address. A recipient without a Dagon account is first set up by a separate transaction the sender pays for, then the send is built.

**Why this priority**: Dagon has not verified transfer end to end; the switch keeps it out of the demo until they do.

**Independent Test**: with the switch on, send 1.00 between two team wallets; both reveal the change.

**Acceptance Scenarios**:

1. **Given** the switch is off, **When** the tab renders, **Then** Send is not shown.
2. **Given** the switch is on and the recipient has no Dagon account, **When** the user sends, **Then** the backend answers `recipient_setup_required`, the wallet offers a separate setup transaction for the recipient (one fresh key, paid by the sender) and, once it is confirmed and settled, builds the send.
3. **Given** the send confirmed, **When** the sender's balance ciphertext settles, **Then** the item reads "done" and the copy says a reveal is needed to know whether the amount moved.

---

### User Story 7 - Withdraw back to public tokens (Priority: P3, built, OFF in the demo)

The user turns hidden tokens back into public ones in three steps (burn, request decryption, complete), with a wait of up to minutes between the second and third. The sheet warns the amount becomes public and that an Encrypt failure can leave it stuck on devnet. The flow resumes where it stopped if the app closes.

**Why this priority**: required for completeness, unsafe for a live demo.

**Independent Test**: with the switch on, withdraw 5.00 mock-USDC; close the app after step 1; reopen; the flow offers step 2; after step 3 the public balance rises by 5.00.

**Acceptance Scenarios**:

1. **Given** the switch is off, **When** the tab renders, **Then** Withdraw is not shown, and any withdraw already in progress is still listed with a way to continue it.
2. **Given** step 1 confirmed, **When** the app is killed and reopened, **Then** the stored public addresses let the flow continue at step 2; no private key was stored.
3. **Given** step 2 confirmed, **When** Encrypt has not posted the decryption within 180 s, **Then** the item reads "outcome unknown" and offers step 3 again later.

### Edge Cases

- **Executor drop**: a transaction confirms but Encrypt never settles it. The item reaches "outcome unknown" at the cap (90 s; 180 s for the withdraw decryption) and stays listed; no automatic retry. On a pool, the swap may stall until Dagon publishes a new pool in a new `devnet.json`; the swap sheet then reports it as unavailable.
- **Outcome unknown from core** (the network cannot say whether the transaction landed): the form clears, the item is "outcome unknown", nothing is resubmitted.
- **`devnet.json` unreachable, malformed, or with program ids that differ from the pinned ones**: the tab shows an unavailable state with retry and builds nothing; no cached or default config is used in its place.
- **Recipient or output token without a Dagon account**: the build answers `recipient_setup_required` (send) or `setup_required` (swap); the wallet offers the setup as its own transaction with its own confirmation, never folded silently into the send or swap.
- **Insufficient devnet SOL for rent and fees** (activation, reveal at ~0.0023 SOL, swap, onboarding a recipient): the action is refused before the build with a message naming the shortfall; the team wallets are pre-funded, so the message is the only handling.
- **App closed mid-withdraw**: the public addresses stored per step let it resume (User Story 7); a step already requested on chain is never requested twice.
- **App closed with operations in progress**: the "In progress" card restores them and resumes watching each one until its cap measured from submission.
- **Wallet switched to mainnet**: the tab disappears (Home hides Powerups not declared for the active network); the fresh-signer and viewer capability refuse to run off devnet; stored in-progress items are kept and reappear on devnet.
- **Wallet switched to another account**: balances, last revealed values and in-progress items are per account; nothing from one account shows on another.
- **Watch-only account**: core refuses to sign as for any Powerup; no keys are generated.
- **Executor read shorter than 8 bytes**: an error with retry, never 0.
- **User cancels on the confirmation screen**: the fresh keys and any viewer key generated for that proposal are discarded; nothing is stored.
- **A build that names signers other than the user and the fresh keys core generated, or a different count**: core refuses before showing the confirmation.
- **Several reveals in a row**: each costs a transaction; the button is disabled while one is in progress, and the tab never reveals on render, on focus, or on a timer.

## Requirements _(mandatory)_

### Functional Requirements

**Distribution and scope**

- **FR-001**: The feature MUST ship only in builds from the EAS `staging` profile (internal distribution, `staging` update channel, staging backend); it MUST NOT reach the production update channel, TestFlight, or any store, and its branch MUST NOT be merged.
- **FR-002**: The Powerup MUST be id `dagon`, tier core, display name "Dagon (devnet preview)", `networks: ['solana-devnet']`, with exactly one surface, a Home sub-tab.
- **FR-003**: The Powerup MUST be mobile only; the absent DOM twin MUST be recorded as a `MOBILE_ONLY` entry with the reason "devnet preview for the Breakpoint demo", so the parity check stays green.
- **FR-004**: The manifest's `endpoints` MUST be exactly the Encrypt executor host and `raw.githubusercontent.com`; its `programs` MUST list Encrypt, pc-token, pc-swap, SPL Token, Associated Token, System and Compute Budget; it MUST declare the fresh-signer capability (FR-040).
- **FR-005**: No user-facing string MAY contain the word "private" (or its Spanish equivalents); every EN and ES string MUST be approved by the owner before the demo build.

**Configuration**

- **FR-010**: The Powerup MUST fetch `devnet.json` at runtime from `https://raw.githubusercontent.com/inkwell-finance/pc-wallet-kit/main/devnet.json` and MUST refuse it if its Encrypt program id is not `4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8`, its pc-token program id is not `3kjJEx6G1XdrtixFg9f8eGRAyzW5QmhsJQq6qCUZYhXZ` or its pc-swap program id is not `BqJMtWQYiis1264KqBN3wssNqTofK5RuP67hkZYvb4SD`, or if it is malformed.
- **FR-011**: When `devnet.json`'s `faucetUrl` is non-null, the tab MUST offer a "Get test tokens" action; while it is null, it MUST NOT.
- **FR-012**: Amounts MUST use 2 decimals for the mock tokens.

**The tab**

- **FR-020**: The tab MUST show, in order: the usage line; an always-visible devnet notice ("devnet preview, amounts are not actually encrypted yet"); one balances card per Dagon mock token; the actions; the "In progress" card.
- **FR-021**: On a wallet that has not activated Dagon, the tab MUST show only the usage line, the devnet notice and "Activate".
- **FR-022**: Each balances card MUST show the public balance and the hidden balance as the last revealed value with the time it was read (or "not revealed yet"), plus a "Reveal" action; a value older than any later settled operation on that token MUST be marked "may be out of date".
- **FR-023**: The tab MUST NOT reveal on render, focus, or timer; a reveal happens only when the user taps Reveal and confirms, and the confirmation MUST state its cost (a transaction and about 0.0023 devnet SOL of rent).
- **FR-024**: Hide, Send, Swap and Withdraw MUST each open a sheet composed only of the runbook blocks (`docs/POWERUPS-UI.md`: amount entry, token picker, core confirmation, receipt); Send and Withdraw MUST each be behind a switch, Withdraw off and Send off by default in the demo build.
- **FR-025**: Every receipt MUST say the operation was submitted and Encrypt is processing; no receipt, row or card MAY say an operation succeeded or "done" on the strength of a confirmed signature.
- **FR-026**: The "In progress" card MUST list each operation Encrypt has not settled, in one of: processing, done, outcome unknown; items MUST persist per account and network across app restarts through `usePowerupState`.
- **FR-027**: An operation MUST be "done" only when the watched balance ciphertext's digest changed against a snapshot taken before sending AND its status byte reads settled; it MUST become "outcome unknown" after 90 s without that (180 s for the withdraw decryption step).
- **FR-028**: The Powerup MUST NOT use the pending-activity banner for any Dagon operation.
- **FR-029**: Withdraw MUST persist between steps through `usePowerupState` only public addresses (the request account's address, and whatever public address step 2 needs from step 1); no private key MAY be persisted.
- **FR-030**: Swap MUST refuse when the input token's balance ciphertext has never been settled (all-zero digest), and MUST state that devnet does not enforce the minimum yet.
- **FR-031**: An executor read shorter than 8 bytes MUST be an error, never a zero balance.
- **FR-032**: Every build failure MUST map to a translated state through `describePowerupBuildError`; a `SolanaOutcomeUnknownError` MUST clear the form, mark the item "outcome unknown", and never resubmit.

**Fresh signers (core, security-sensitive)**

- **FR-040**: Core MUST offer a capability that only a Powerup whose manifest declares it can use, and only on `solana-devnet`; on any other network or for an undeclaring Powerup it MUST refuse before generating any key.
- **FR-041**: For a proposal that needs N fresh signers (N ≥ 0), core MUST generate N keypairs on the device and give the Powerup only their public keys; the Powerup passes them to the backend build as `freshSigners`.
- **FR-042**: Before showing the confirmation, core MUST refuse a built transaction whose required signers are not exactly the user's key plus the N fresh public keys it generated for that proposal, whose fee payer is not the user, or that invokes a program outside the manifest.
- **FR-043**: After the user confirms, core MUST put the fresh blockhash on the message and sign with the fresh keys and the user key in the same step, then broadcast; it MUST discard the fresh keys after broadcast, on cancel, on refusal, and on any error. Fresh private keys MUST never be persisted, logged, returned to the Powerup, or sent anywhere.
- **FR-044**: For a reveal, core MUST generate an ephemeral viewer keypair, give the Powerup its public key for the build, and after the reveal transaction confirms sign the Encrypt read message with it, returning only the signature and the public key; core MUST sign only a message of the read-message shape (chain 0, a 32-byte ciphertext id, empty re-encryption key, epoch 0), MUST keep the viewer key in memory only, and MUST discard it after the read, on cancel, or on error. The user's key MUST never sign a message in this feature.
- **FR-045**: The existing send, swap and dApp signing paths MUST behave unchanged: their existing tests MUST pass untouched, and a new test MUST prove the capability refuses on mainnet.
- **FR-046**: The Powerup boundary lint MUST block key generation and raw signing from `powerups/**` — at least `@solana/kit`'s `generateKeyPairSigner`, `generateKeyPair` and `signBytes` (and their sources in `@solana/keys` / `@solana/signers`) — and `boundary.test.ts` MUST assert it on a fixture.

**Cross-repo contract**

- **FR-050**: The Powerup MUST build every transaction through the existing generic route `GET /v1/{networkId}/powerups/{id}/build` with id `dagon`, network `solana-devnet` and the params in the query: `{ action, ...actionParams, freshSigners }`, where `freshSigners` is a comma-separated list of base58 public keys (empty for N = 0) and `action` ∈ `setup | wrap | reveal | send | swap | unwrapBurn | unwrapDecrypt | unwrapComplete`.
- **FR-051**: The backend returns an unsigned v0 transaction whose signers are exactly the owner plus `freshSigners`, and performs the Encrypt `CreateInput` calls itself; the device MUST NOT call `CreateInput`. Fresh-signer count per action: setup 1, wrap 1, reveal 1 (plus the off-chain viewer key), send 0, swap 1, unwrapBurn 1, unwrapDecrypt 1, unwrapComplete 0. Setup takes the account owner as a param, so the sender can set up a recipient (owner = recipient).
- **FR-053**: The client MUST handle the build's `409 recipient_setup_required` (send) and `409 setup_required` (swap into an output token with no Dagon account) by offering the setup transaction first, and MUST honour the response `display` flag that the outcome is known only after a reveal by using the "submitted, Encrypt is processing" receipt.
- **FR-052**: The device MUST perform the reveal read itself (`ReadCiphertext`, one unary gRPC-web call over plain `fetch` with an `arrayBuffer` body, because React Native's `fetch` has no streaming body) and the settlement watching (account-change subscription plus a ~1.5 s poll).

### Key Entities

- **Dagon config**: the runtime `devnet.json` (epoch, program ids, mints, pool, executor URL, faucet URL, account layout offsets); accepted only when its program ids match the pinned ones.
- **Token position**: per account and mock token, the public balance (read from chain) and the last revealed hidden balance with its read time.
- **Operation in progress**: per account and network, the action kind, token(s), amount, submission time, transaction signature, the ciphertext(s) being watched with their pre-send digest snapshot, and the state (processing, done, outcome unknown).
- **Withdraw progress**: per account and network, the current step (1-3) and the public addresses each next step needs; never a private key.
- **Fresh signer set**: N keypairs core generates for one proposal; only the public keys leave core; lives from proposal to broadcast or cancel.
- **Viewer key**: one ephemeral keypair per reveal; only its public key and one read-message signature leave core; lives from the reveal build to the read.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On the iOS demo build against devnet, a pre-funded team wallet completes Activate → Hide → Reveal → Swap → Reveal with every operation reaching "done" or "outcome unknown" within 90 s of confirmation.
- **SC-002**: 100% of receipts and in-progress items reviewed in the demo walkthrough avoid claiming an operation succeeded; zero strings contain "private".
- **SC-003**: The tab sends zero reveal transactions without an explicit user confirmation (verified by test).
- **SC-004**: The fresh-signer capability refuses on mainnet, for an undeclaring Powerup, and for a build with a wrong or extra signer (verified by tests), and the existing send, swap and dApp signing tests pass without modification.
- **SC-005**: No private key generated by this feature is found in persisted storage, logs, or anything returned to the Powerup (verified by tests and review).
- **SC-006**: The boundary lint fails on a fixture that imports key generation or raw signing inside `powerups/**`.
- **SC-007**: A withdraw interrupted after any step resumes at the next step after an app restart (verified with the switch on, outside the demo).
- **SC-008**: The Powerup is absent on mainnet and in a Powerups-off build (bundle check).

## Assumptions

- The backend half (registry entry `dagon`, the adapter for the eight actions, the build service accepting `1 + N` signers only for an entry that declares fresh signers and only for the keys passed in) lands on its own branch before the client consumes it, and is deployed to the staging backend.
- The staging backend can build for `solana-devnet`, and the staging availability table offers `dagon` on iOS only.
- Devnet SOL for fees and rent comes from the public devnet airdrop; the team wallets are funded before the event.
- Encrypt stays pre-alpha through the event; `devnet.json` epoch 2 stays current unless Dagon publishes a new pool, which the runtime fetch picks up.
- Spanish copy is proposed by the agent and approved by the owner (D6); English is drafted from Dagon's wording and the runbook.

## Open questions (with recommended defaults)

- **Q1 - What core owes** (AGENTS.md "Starting a new Powerup", step 3). Hidden balances exist on chain whether or not the Powerup is on. **Default**: waive the core surface for this never-merged devnet branch and revisit before any mainnet discussion.
- **Q2 - Manifest `permissions`.** **Default**: `['address', 'balances']`: the address and amounts reach Encrypt (through the backend's `CreateInput` and the device's read), and the read returns a balance.
- **Q3 - Withdraw state between step 1 and step 2.** Step 2 needs the receipt created in step 1, which is derived from the burned-amount ciphertext's public address, not from the request account. **Default**: also store that public address after step 1; it is public data, so it keeps the "no private key stored" rule.
- **Q4 - Switch mechanism.** **Default**: build-time constants in the Powerup folder (Withdraw off, Send off), flipped on the branch, since the demo build is the only consumer.

## Out of scope

- Mainnet, Android, the browser extension (no DOM twin), TestFlight and store builds, the production update channel.
- A Salmon fee.
- Any core surface for Dagon positions when the Powerup is off (Q2).
- Refunds for a withdraw stranded by Encrypt (the protocol has none).
- A public faucet integration beyond showing "Get test tokens" when `faucetUrl` is set.
- Merging this branch.
