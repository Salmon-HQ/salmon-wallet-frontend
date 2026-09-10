# Feature Specification: Send builds v1 transactions where the network runs them

**Feature Branch**: `feat/dev-47-send-v1-per-network` (spec dir `032-send-v1-per-network`) · Linear DEV-47

**Created**: 2026-09-10

**Status**: Approved by the owner 2026-09-10 ("Dale, arrancá con el gate por red"), in implementation.

**Input**: User description: "Pero no entiendo, no debería aplicarlo para que los send también sean así? en mainnet no aún (sale el 15 de septiembre para mainnet)."

## Why this exists

DEV-42 (PR #93) taught the wallet to sign and send v1 transactions (SIMD-0296, 4096 bytes) that a dApp hands it. The wallet's own Send kept assembling v0. The owner wants Send on the same footing: emit v1 on every network that runs it, starting with devnet today, and on mainnet the day it activates (announced 2026-09-15) without a release that touches the transfer code again.

A v1 sent to a cluster that has not activated it is refused by the RPC (`VERSION_NUMBER_NOT_SUPPORTED`). That is why the version is a property of the network, not a user setting or a build flag: the wallet must never offer a Send that the destination cluster will reject.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - A send on devnet lands as v1 (Priority: P1)

A user on Solana Devnet sends SOL or an SPL token from the wallet's own Send. The transaction that lands is a v1 transaction. Nothing in the flow looks or behaves differently: same screens, same fee shown, same confirmation, same Activity entry.

**Why this priority**: it is the whole feature; devnet is the only cluster running v1 today.

**Independent Test**: on devnet, send from one wallet to another; read the confirmed transaction from the cluster and check its message version is 1. The opt-in live suite does the same from code against a funded devnet key.

**Acceptance Scenarios**:

1. **Given** the wallet is on devnet, **When** the user sends SOL, **Then** the confirmed transaction is v1 and the recipient's balance rises by the amount.
2. **Given** the wallet is on devnet, **When** the user sends an SPL token (incl. Token-2022 with a transfer fee), **Then** the confirmed transaction is v1 and the token lands.
3. **Given** the wallet is on devnet, **When** the review screen estimates the fee, **Then** the estimate is computed on the same v1 message that is later signed, so the figure shown is the figure paid.

---

### User Story 2 - A send on mainnet keeps working before activation (Priority: P1)

A user on Mainnet sends as they do today. Until mainnet activates v1, the wallet keeps building v0 there. No send on mainnet ever fails with an "unsupported version" message because of this change.

**Why this priority**: mainnet carries real funds; a regression there is the one outcome this spec must rule out.

**Independent Test**: the unit suite pins that the mainnet table entry yields v0 and that a transfer built for mainnet has `version: 0`.

**Acceptance Scenarios**:

1. **Given** the wallet is on mainnet before activation, **When** the user sends, **Then** the transaction is v0 and lands as today.
2. **Given** the network table is later flipped to v1 for mainnet, **When** the user sends, **Then** the transaction is v1, with no other code change.

---

### User Story 3 - The flip is one line and documented (Priority: P2)

On activation day, whoever ships the flip changes exactly one value in one place, and a test tells them where. The spec records the flip as the follow-up so it is not forgotten.

**Independent Test**: a unit test reads the per-network table; flipping the mainnet entry to 1 fails exactly that test and nothing else.

**Acceptance Scenarios**:

1. **Given** the activation has happened, **When** the mainnet entry is set to 1, **Then** typecheck, lint and every test other than the table pin still pass.

### Edge Cases

- **Devnet RPC that lags activation** (a private node on an older release): the send fails with the existing `transaction.errors.unsupportedVersion` message from PR #118. No new copy.
- **Fee estimate for v1**: `getFeeForMessage` receives a v1 message. The live suite proves the public devnet RPC answers; if a provider does not, the estimate falls back to `null` as it does for any estimation failure today, and the send still goes.
- **Activity / history**: the backend's parser (Triton/Helius) must read v1 for the send to show in Activity. That is a backend concern, verified by the owner on devnet after this ships; the wallet does not wait for it.
- **Swap** is out of scope: Jupiter builds that transaction. **dApp transactions** are out of scope: already v1-capable (DEV-42). `supportedTransactionVersions` is DEV-46.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The transaction version Send assembles MUST be decided by the network the sending account is on, from one table keyed by Solana network id.
- **FR-002**: That table MUST read devnet → 1 and mainnet → 0 at ship, with the mainnet flip being the change of that single value.
- **FR-003**: SOL transfers, SPL transfers and the fee estimate MUST all build through the same message builder, so they cannot disagree on version.
- **FR-004**: A v1 message MUST carry no address-lookup-table instructions (v1 does not support them; the transfer never used them).
- **FR-005**: The wallet MUST NOT add a user-facing setting or a developer-mode toggle for the version.
- **FR-006**: Existing tests for the transfer path MUST keep passing unchanged except where they pinned `version: 0` on a network that now yields 1.

### Key Entities

- **Transaction version per network**: `Record<SolanaNetworkId, 0 | 1>`; the only place a cluster's v1 status is written down in this repo.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A devnet send from the wallet confirms as a v1 transaction (verified from the cluster).
- **SC-002**: Zero behaviour change on mainnet: every existing mainnet transfer test passes with `version: 0`.
- **SC-003**: The activation-day change is a one-value diff in one file plus its test pin.
- **SC-004**: `pnpm typecheck`, `pnpm lint` (0 warnings), `pnpm check:no-secrets`, `pnpm check:parity`, and the shared test suite pass.

## Assumptions

- Devnet has v1 active (proven by DEV-42's live suite, which sends a >1232-byte v1 through the approval path on devnet).
- Mainnet activation lands on or after 2026-09-15; the flip is done by hand after confirming the feature is active on the cluster, never on the announced date alone.
- The kit in use (`@solana/transaction-messages` 8.2) compiles, signs and wire-encodes v1 (`messageFirst`) with no new dependency.
- Priority fees: the transfer sets none today, so the v1 `config` block stays empty. Adding one later is a separate spec.

## Constitution check

- **I. Boundaries**: all changes in `packages/shared/src/blockchain/solana`; apps untouched.
- **II. Consumers**: `createTransfer`/`estimateFee` are consumed only by `SolanaAccount`, which already holds `network`. No export path changes.
- **III. Wallet safety**: transaction building path; owner sign-off given 2026-09-10 in this thread. No key material touched; the live suite uses the QA devnet key from `docs/QA-RUNBOOK.md`.
- **IV. i18n**: no new copy.
- **V. Tests**: unit pins in the owning package; live devnet suite extended with the version assertion.
