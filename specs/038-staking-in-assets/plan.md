# Implementation Plan: Staking in Assets

**Spec**: [spec.md](spec.md) | Backend: specs 020 and 021 (`GET /account/:address/stakes`, `GET /skr/stake`)

## Design

- **Shared** (`packages/shared`)
  - `api/services/staking.ts` — `getStakeAccounts`, `getSkrStake` and their response types.
  - `utils/staking.ts` — `stakingSummary` (rows as `Token`s + staked USD), `stakeAccountCards` (one `FactsCard` per stake account).
  - `utils/stakingBlocks.ts` — `stakingSectionBlocks`, `stakeAccountsBlocks`: the section and the detail as `KitBlock`s.
  - `hooks/useStaking.ts` — `useStaking`, `useHomeStaking` (rows + total for both Homes), `useStakeAccountsScreen`, `useSkrStake`.
  - `types/ui/block-list.ts` — `KitBlock`, `BlockListPropsBase`: a column of existing kit blocks described as data.
  - `motion/useSettledSubTab.ts` — `useHomeSubTabContent`, the content-region state both Homes repeated, hoisted so the twins' duplication stays under the ceiling.
- **Twins**: `BlockList` (mobile, DOM) renders `KitBlock`s with the existing `FactsCard`, `SectionLabel`, `SkeletonRow`, `StateBlock`, `TokenListItem`.
- **Mobile**: Home's token list footer draws the section; route `app/(app)/staking.tsx` (header + `BlockList`).
- **Extension**: `PortfolioColumn` draws the section; page `staking` in Home's stack (`StakeAccountsPage`).
- **Total**: `useHomeStaking` adds the priced staked USD to `usdTotal` before `useHomeShell`.
- **Copy**: `tabs.portfolio` reads "Assets" / "Activos"; `staking.*` EN/ES.

## Checks

`check-dom-parity`: `(app)/staking` → `StakeAccountsPage`; clone ceiling lowered 2427 → 2421.
