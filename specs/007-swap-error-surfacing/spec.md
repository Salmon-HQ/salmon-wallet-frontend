# Feature Specification: Swap and bridge error surfacing

**Feature Branch**: `007-swap-error-surfacing`

**Created**: 2026-08-11

**Status**: Draft

**Input**: The send, NFT transfer and NFT burn paths now classify transaction failures into human messages (`classifyTransactionError`). Swap and bridge kept their own error handling: on failure the swap state machine enters a step no screen renders — the user sees a blank screen for two seconds — and the actual error surfaces in a native alert carrying the raw provider message. A swap attempted with no SOL for the fee shows the same RPC dump the send path just fixed.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Understand why a swap failed (Priority: P1)

A user confirms a swap that fails — no SOL for the fee, slippage exceeded, route gone — and reads what happened and what to do, in their language, on the screen they were using.

**Why this priority**: Swaps are where the product earns money and where users move the largest amounts. A failure that answers with a blank screen and an RPC dump reads as a broken or untrustworthy app at the exact moment trust matters most. This is also review surface: a reviewer with the funded test wallet can hit it.

**Independent Test**: Force each failure class (insufficient fee SOL, slippage, generic) against the confirm flow and read what appears.

**Acceptance Scenarios**:

1. **Given** a wallet whose SOL cannot cover the network fee, **When** a swap is confirmed, **Then** the user reads that a small amount of SOL is needed for the fee, with the remedy, in their language.
2. **Given** a quote that fails on-chain with program logs (e.g. slippage exceeded), **When** the swap fails, **Then** the message names the slippage problem and suggests retrying or adjusting, and never blames the fee.
3. **Given** any swap failure, **When** the error is shown, **Then** at no point does the user see a blank screen, a raw RPC string, or developer tooling instructions.
4. **Given** the failure was shown, **When** the user dismisses it, **Then** they are back on the swap form with their amounts intact, able to retry.

---

### User Story 2 - Understand why a bridge failed (Priority: P2)

A user creating a cross-chain exchange reads a human message when the provider rejects it — amount below the pair minimum, pair unavailable, provider down.

**Why this priority**: Same class of defect, lower traffic than swap. The provider's raw English error strings are currently passed through untranslated.

**Independent Test**: Trigger a below-minimum bridge and read the message.

**Acceptance Scenarios**:

1. **Given** an amount below the provider's minimum for the pair, **When** the exchange is created, **Then** the message says the amount is below the minimum rather than echoing the provider payload.
2. **Given** the provider is unreachable, **When** creation fails, **Then** the user reads that the service is temporarily unavailable and can retry.

---

### Edge Cases

- The two-second auto-return from the unrendered error step: any replacement must not strand the user on a dead screen if they don't interact.
- A failure _after_ the transaction was sent but before confirmation (expired blockhash) is not the same as a failure to send — the message must not imply funds moved when they did not, nor that nothing happened when a transaction may land.
- The e2e swap flow matches on visible success text with a 120s timeout; error-state changes must not introduce text that the regex `(?i)Swap Complete|Complete` could match prematurely.
- The native alert path and the state machine path must not both fire for the same failure — one surface, not two.
- Bridge failures happen against a third-party HTTP API, not the chain; the transaction classifier's chain heuristics must not misread provider errors (e.g. an HTTP 400 body mentioning "insufficient" is not the fee case).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Every swap failure MUST surface as a designed on-screen state; the unrendered error step and the blank interval MUST be eliminated.
- **FR-002**: Swap failures MUST resolve through the shared transaction-error classifier; new failure classes needed by swap (slippage exceeded, no route) are added to the classifier with tests, not special-cased in the swap layer.
- **FR-003**: A preflight failure with program logs MUST NOT be reported as a fee problem.
- **FR-004**: Bridge creation failures MUST map provider errors to translated messages, with the below-minimum case distinguished; unknown provider errors fall back to a generic retry message with the raw error logged.
- **FR-005**: One failure produces one visible surface — the redundant native alert for classified failures is removed or becomes the single surface, but not both.
- **FR-006**: Dismissing a failure MUST return the user to the form with their input preserved.
- **FR-007**: All new user-facing copy MUST exist in English and Spanish (voseo) and route through translation keys.
- **FR-008**: Behavior MUST be identical across the three apps; the fix belongs in the shared logic and components, not per app.
- **FR-009**: The classifier's new cases MUST be covered by unit tests, and the swap error state by a test at the nearest meaningful layer.
- **FR-010**: Existing Maestro and Playwright selectors and success-text matches MUST keep working; any new error surface gets its own stable testID.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: No swap or bridge failure path can render a blank screen or a raw provider/RPC string.
- **SC-002**: The no-SOL-for-fee swap failure reads the same remedy the send path shows.
- **SC-003**: A failure with program logs never shows the fee message.
- **SC-004**: All existing e2e flows pass unchanged.

## Assumptions

- `classifyTransactionError` in `packages/shared/src/utils/transaction-errors.ts` is the single classification point and is extended, not duplicated.
- The swap state machine lives in `packages/shared/src/hooks/useSwapScreenLogic.ts` and is shared by all three apps; its `step: 'error'` currently renders nowhere and auto-returns to `'input'` after 2 s.
- The mobile alert on swap failure lives in the swap tab screen's `onError` handler; web and extension have equivalents.
- Whether the error renders inline on the form or as its own step is a design decision made during implementation, constrained by FR-001/FR-006; the cheapest compliant shape wins.
- This is JavaScript only and ships over the air; it will ride the next build for TestFlight testing.
