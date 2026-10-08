# Feature Specification: Staking in Assets

**Feature Branch**: `feat/seeker-seed-vault` (spec dir `038-staking-in-assets`)

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "Show staked SOL and staked SKR. Rename Portfolio to Assets and put a Staking section under the token list; staked amounts count in the total."

## Owner decisions (2026-10-08)

1. The Home sub-tab "Portfolio" is labelled **"Assets"** (ES "Activos"). Its key stays `portfolio`, so stored tab orders are untouched.
2. Staked SOL and staked SKR are a **"Staking" section under the token list** in Assets, not a tab of their own. It appears only when there is something staked.
3. Staked amounts **count in the wallet's total** at the top of Home.
4. Both apps (mobile and extension). Read-only: no stake, unstake or withdraw.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See what is staked (Priority: P1)

Under the tokens in Assets, a "Staking" section lists "Staked SOL" (the sum of the wallet's stake accounts) and "Staked SKR" (its SKR staking position), each with its amount and value.

**Independent Test**: with the backend's `GET /account/:address/stakes` and `GET /skr/stake` answering the recorded mainnet wallet, the section shows Staked SOL 1.0025 SOL and Staked SKR 46,045.7 SKR with their USD values.

**Acceptance Scenarios**:

1. **Given** a Solana wallet with stake accounts, **Then** "Staked SOL" shows their total and its USD value.
2. **Given** a wallet with an SKR position on mainnet, **Then** "Staked SKR" shows the staked amount and its USD value.
3. **Given** nothing staked, **Then** the section is not shown.
4. **Given** the stake reads fail, **Then** the token list is unaffected and no section is shown (the total stays the liquid one).
5. **Given** Bitcoin, **Then** no section.

### User Story 2 - Stake accounts detail (Priority: P2)

Tapping "Staked SOL" opens the stake accounts: each with its validator (name and icon when published, else the vote address), state, amount, and the reward of the last epochs.

### User Story 3 - Total (Priority: P1)

**Given** staked SOL and SKR with prices, **Then** the Home total is the liquid total plus their USD value. Without a price, a staked amount adds nothing (never a guess).

### Edge Cases

- Off mainnet: Staked SOL may show (devnet stakes); SKR never (mainnet only).
- Hidden balance: the section's amounts are hidden like the tokens'.

## Requirements _(mandatory)_

- **FR-001**: Shared API clients for both endpoints and one shared hook, `useStaking`, giving the rows the section renders and the staked USD total.
- **FR-002**: One contract `StakingSectionPropsBase`; twins `StakingSection` (mobile, DOM) composed of `SectionLabel` + `ListRow`.
- **FR-003**: Stake accounts detail: mobile route `(app)/staking`, DOM page in Home's stack; one contract `StakeAccountsPropsBase`, rows derived once in shared.
- **FR-004**: The total adds the staked USD where Home computes it, on both apps.
- **FR-005**: EN and ES strings; "Portfolio" label becomes "Assets" / "Activos".

## Success Criteria _(mandatory)_

- **SC-001**: The recorded wallet shows both rows with the values above, on both apps (unit tests on both twins).
- **SC-002**: Existing Home tests pass with the section absent for wallets with nothing staked.

## Assumptions

- Backend `0.23.0` (specs 020 and 021) is deployed before this client ships; until then both reads 404 and the section stays hidden (FR acceptance 4).
