# Feature Specification: SKR Powerup redesign

**Feature Branch**: `feat/seeker-seed-vault` (spec dir `040-skr-redesign`)

**Created**: 2026-10-09

**Status**: Draft

**Input**: Owner: rebuild the SKR tab after the "SKR Propuesta" frame of `SKR-powerup-design.pen` (Nacho's proposal), audited first; build its pieces as reusable components with proper styles and responsive layout; offer the Powerup only on Solana Mobile phones.

## Owner decisions (2026-10-09)

1. The SKR Powerup stays a Powerup (installed from the catalogue), and is offered only where it can be discriminated as a Solana Mobile phone: a device with a secure Seed Vault (Seeker, Saga). Elsewhere it is not listed and its tab does not mount.
2. The "Next compound" block is built from the SKR inflation program's schedule on chain (backend spec 022 `payouts`): the countdown to the next payout, the period's progress and "Compounds every 2 days". "+69.2 SKR will be added" is a projection and is replaced by what the last payout paid the stake, once a record closes on it.
3. The inflation rate is left out: the app shows only figures it can confirm from the chain or an API (owner, 2026-10-09).
4. The last-payouts bar chart, its average and "See all rewards" are built from the exact history (DEV-87 option A), which counts from the first daily record.
5. Layout is responsive on every phone width: rows and grids fill their container and share it, text truncates or wraps instead of overflowing, sizes come from the scaled tokens.

## Audit of the proposal (what the design asks for, against what exists)

| Design element                                               | Data                                       | Built from                                   |
| ------------------------------------------------------------ | ------------------------------------------ | -------------------------------------------- |
| Token header (logo, "SKR", subtitle, APY pill)               | APY when known                             | `TokenLogo` + new `Pill`                     |
| Stake card: MY STAKE amount, ≈ USD                           | staked, usdPrice                           | new `StatTile` (size `hero`) in `Card`       |
| Earned / Available                                           | earned, liquid, usdPrice                   | `StatTile` ×2 in a `StatGrid`                |
| Guardian row (name, commission, Active)                      | guardian                                   | `ListRow` + `IconBubble` + status `Pill`     |
| Daily info: SKR / day, days staked                           | apy × staked / 365 (estimate), stakedSince | `StatGrid`; hidden when unknown              |
| Rewards: total, recorded list                                | earned, history                            | `SectionLabel` trailing + `ListRow` rows     |
| About SKR: price, period change, chart                       | CoinGecko `seeker`                         | `PriceChart` + `StatTile` + `Pill` in `Card` |
| Supply: total, circulating, network staked, % of circulating | CoinGecko supply, backend `totalStaked`    | `StatGrid` + new `ProgressBar`               |

The proposal carries no variables (raw hex, Inter): every value maps to the app's tokens (DM Sans, `semantic` colours). Earned and a falling price share one colour in the proposal; here gains use the change-positive token, losses change-negative, and "Active" the success status.

States the proposal does not draw and the screen must: loading, error, no SKR, APY unknown, unstaking with its withdrawable date, several positions.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - My stake at a glance (Priority: P1)

On a Seeker, the SKR tab opens on a stake card: the staked amount large with its value in the user's currency, earned and available beside each other, and the guardian with its commission and status.

**Independent Test**: against the recorded wallet: 46,045.7 SKR staked, +6,045.7 earned, 0 available, "Solana Mobile Guardian", 0% commission, active.

### User Story 2 - Rewards and daily figures (Priority: P2)

Under the card: the estimated SKR per day and days staked (each only when known), then Rewards with the total earned and the recorded rows, newest first.

### User Story 3 - About SKR (Priority: P2)

The price with its change over the selected period and the chart; the supply card with total, circulating, network total staked and the staked share of circulating as a bar.

### User Story 4 - Only on Solana Mobile phones (Priority: P1)

On iOS, the extension and Android phones without Seed Vault the Powerup is absent from the catalogue and its tab never mounts; the Assets "Staked SKR" row still shows the amount but opens nothing.

### Edge Cases

- No SKR at all: empty state.
- APY unknown (fewer than 7 days of records): no pill, no SKR/day.
- Unstaking: amount and withdrawable date shown in the stake card.
- Several positions: amounts summed; one guardian row per guardian.
- Price unknown: amounts without currency values; change pill hidden.
- Supply unknown: supply card hidden; `totalStaked` missing (older backend): staked row hidden.
- Narrow phones (320 pt) and large ones (430 pt+): nothing overflows or clips.

## Requirements _(mandatory)_

- **FR-001**: The proposal is rebuilt in Pencil as components (StatTile, StatGrid, Pill, ProgressBar, SectionHeader, RewardRow, StakeCard) with token variables and auto layout, delivered as a new file beside the original; the original file is not modified.
- **FR-002**: New kit blocks, each with a mobile twin, a DOM twin and one contract in `packages/shared/src/types/ui`: `StatTile`, `StatGrid`, `Pill`, `ProgressBar`; `SectionLabel` gains an optional trailing text with a tone.
- **FR-003**: The tab is built as data once in shared (`KitBlock` list, extended with the new kinds and a `card` kind that nests blocks) and only rendered by each twin.
- **FR-004**: Values are formatted in shared (amounts, currency, percentages, compact supply figures) and covered by unit tests.
- **FR-005**: Tokens only: no hex, literal spacing or font size in the new blocks or the Powerup; layout by flex fill and gaps, no fixed widths.
- **FR-006**: The manifest declares that the Powerup needs Seed Vault; the catalogue and the tab mount honour it from a device capability the app reports (mobile: Seed Vault detection; DOM: never).
- **FR-007**: The Assets "Staked SKR" row links to the tab only where the Powerup is offered.
- **FR-008**: `docs/POWERUPS-UI.md` lists the new blocks.
- **FR-009**: The daily card adds the payout cadence and a "Next compound" row with the countdown (recomputed each minute) and a progress bar through the period, labelled with the last payout's reward when known; all from backend `payouts`, hidden from an older backend.
- **FR-010**: Rewards adds a card with the last 14 payouts as bars (`BarChart`, new twin pair) and their average in the user's currency, shows the five newest rows and a "See all rewards" button that lists all of them; an empty history names the day it counts from (`historySince`).

## Success Criteria _(mandatory)_

- **SC-001**: Both twins render the recorded wallet's figures (unit tests on the shared builder and on each twin).
- **SC-002**: `pnpm check:parity`, `check-i18n`, `check-powerups-bundle`, typecheck, lint pass; the clone ceiling does not rise.
- **SC-003**: On the emulator at 320, 393 and 430 pt widths the tab shows no overflow or clipped text (screenshots).
- **SC-004**: On a non-Seed-Vault build the catalogue does not list SKR (unit test on the catalogue).

## Assumptions

- A secure Seed Vault is present only on Solana Mobile phones; the Saga counts as one.
- CoinGecko `seeker` carries total and circulating supply (verified 2026-10-09: 10.64B and 7.14B).
