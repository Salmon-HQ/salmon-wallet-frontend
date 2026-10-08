# Feature Specification: SKR Powerup

**Feature Branch**: `feat/seeker-seed-vault` (spec dir `039-skr-powerup`)

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description (Nacho, via owner): "SKR Powerup, informational: liquid and staked balance, rewards earned and history, chosen guardian, days staked, price chart. No 'Stake now'."

## Owner decisions (2026-10-08)

1. Informational only: nothing is signed. (On chain nothing forbids a third-party wallet from staking; the choice is product's.)
2. Reward history is built from daily share-price records the backend keeps from now on; before that only the exact total earned shows.
3. The holder benefits directory is out until product names a source.
4. Both apps.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - My SKR (Priority: P1)

The SKR tab shows: liquid SKR (from the wallet's balance), staked SKR, total earned, APY when known, the guardian (name, commission), any amount unstaking with when it can be withdrawn, and how long it has been staked when known.

**Independent Test**: against the recorded wallet: liquid 0, staked 46,045.7 SKR, earned 6,045.7 SKR, guardian "Solana Mobile Guardian", commission 0%.

### User Story 2 - Reward history (Priority: P2)

A list of what the stake earned per recorded period, newest first, with the SKR amount and its USD value. Empty state explains that the history starts building from today.

### Edge Cases

- No position: empty state with the liquid balance still shown.
- The read fails: error state with retry.
- Price unknown: amounts show without USD.

## Requirements _(mandatory)_

- **FR-001**: Powerup folder `packages/shared/src/powerups/skr` (manifest: id `skr`, core, `solana-mainnet`, permissions `address`, endpoints none, programs none, tab `skr`), its locales (EN/ES), and `useSkrScreenLogic` building the view (fact rows and history rows) once for both twins.
- **FR-002**: Contract `SkrScreenPropsBase`; `SkrScreen` (mobile) + `SkrTab`; `SkrPage` (DOM); registered in the three entries, `check-i18n`, `check-powerups-bundle`, `check-dom-parity`.
- **FR-003**: Composed only of runbook blocks: `FactsCard`, `ListRow`, `SectionLabel`, `StateBlock`, skeleton/wait of §1.7.
- **FR-004**: The tab shows SKR's price with the token screen's own `PriceChart` and `useCoinMarketData` (CoinGecko `seeker`), which the owner made a Powerup block (2026-10-09).

## Success Criteria _(mandatory)_

- **SC-001**: Both twins render the recorded wallet's facts (unit tests).
- **SC-002**: A Powerups-off build carries no SKR code (bundle check).
