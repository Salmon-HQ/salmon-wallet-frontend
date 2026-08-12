# Feature Specification: Pin Bitcoin transaction signing and cover the extension approval router

**Feature Branch**: `test/security-gaps-bitcoin-background`

**Created**: 2026-08-12

**Status**: Draft

**Input**: Two remaining money-path gaps from the 2026-08-12 audit. (1) Bitcoin: derivation and address validation are tested, but the functions that actually build and sign transactions (`createTransferTransaction`, `sendBitcoin`) had only `typeof === 'function'` assertions (removed as tautological in the prune batch) — nothing pins the bytes of a signed transaction the way `prepared-transactions.golden.test.ts` does for Solana. (2) The extension's `background.ts` (~380 lines) routes every dApp approval (connect, sign message, sign transaction, sign-in) between content scripts, popups and the side panel; it has no direct tests. Tests only; no production changes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A signed Bitcoin transaction is byte-stable (Priority: P1)

Any refactor that changes UTXO selection, output ordering, fee handling, or signing must fail CI if it changes the bytes of a known transaction.

**Why this priority**: Signing is the last gate before funds move. Solana already has this protection (golden vectors); Bitcoin moves real money with none.

**Acceptance Scenarios**:

1. **Given** a fixed keypair (public BIP39 test vector), a fixed set of mocked UTXOs and a fixed recipient/amount/fee, **When** the transfer transaction is built and signed, **Then** the serialized transaction matches a committed golden hex exactly.
2. **Given** an amount requiring change, **Then** the golden covers a change output back to the sender (and the dust behavior the implementation actually has is asserted, whatever it is).
3. **Given** insufficient UTXOs for amount+fee, **Then** building throws (fail closed, no partial tx).

### User Story 2 - The approval router does not leak or misroute (Priority: P1)

A dApp request (connect / signMessage / signTransaction / signIn) travels content-script → background → approval UI → back. The router must hand each request to the right approval flow and return only the approved response — never internal errors — to the origin.

**Why this priority**: This is the security membrane between untrusted web pages and the wallet. The page-level tests verify each approval page in isolation; nothing tests the routing between them.

**Acceptance Scenarios**:

1. **Given** each supported message type, **When** it arrives at the background router, **Then** the corresponding approval flow is invoked with the request payload and origin.
2. **Given** an unknown/malformed message type, **Then** the router rejects it without crashing and without invoking any approval flow.
3. **Given** an approval that fails internally, **Then** the response to the origin carries only the protocol error shape (consistent with the existing page-level "never the raw error" tests).

## Requirements *(mandatory)*

- **FR-001**: Tests only. No production file changes. A revealed bug stops that test and gets reported, not fixed here.
- **FR-002**: Bitcoin golden fixtures are committed constants generated once with the real code; document generation in a comment. Keys derive from public BIP39 test vectors only.
- **FR-003**: Bitcoin network calls (UTXO fetch, broadcast) are mocked at the service boundary the implementation already uses — read `bitcoin.ts` first and mock what it actually calls; do not invent seams.
- **FR-004**: `background.ts` runs in the WXT extension context: use the existing extension test setup (`WxtVitest`, jsdom, the mocking patterns of `wallet-standard.test.ts` / `injected.test.ts`). If the entrypoint's structure makes it genuinely untestable without refactoring production code, STOP for that story and report exactly what refactor would be needed — do not do the refactor.
- **FR-005**: `sendBitcoin`'s broadcast step is asserted via mock (that it posts the signed hex), never a real network call.

## Success Criteria *(mandatory)*

- **SC-001**: A committed golden hex pins a signed Bitcoin transfer (with change) end to end.
- **SC-002**: Insufficient-funds building fails closed.
- **SC-003**: Background router coverage for the four approval types + malformed input, or a precise written report of the refactor needed to make it testable.
- **SC-004**: Full gates green: `pnpm turbo run typecheck lint test --force` + `check:i18n`.

## Out of scope

Production refactors, E2E for approvals (separate batch), Ethereum surface, coverage thresholds.
