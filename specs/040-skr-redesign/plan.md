# Implementation Plan: SKR Powerup redesign

**Branch**: `feat/seeker-seed-vault` | **Spec**: [spec.md](./spec.md)

## Summary

Rebuild the SKR tab from the audited proposal with four new kit blocks (`StatTile`, `StatGrid`, `Pill`, `ProgressBar`), a trailing text on `SectionLabel`, and a nesting `card` block, so the whole tab stays one `KitBlock[]` built in shared and rendered by `BlockList` in each twin. Offer the Powerup only on devices with Seed Vault. Backend `GET /skr/stake` gains `totalStaked` (salmon-wallet-backend spec 021 FR-006).

## Constitution check

- Twins on one contract (I): every new block has a mobile and a DOM twin and a `*PropsBase`; `check:parity` maps them.
- Tokens only (runbook rule 2): new tokens, if any, are added to `packages/shared/src/theme`, never spelled in a block.
- Logic once in shared: formatting and the block list are pure functions with Vitest.
- Signing untouched: read-only Powerup.

## Design

### Contracts (`packages/shared/src/types/ui`)

- `stat-tile.ts` — `StatTilePropsBase`: `label?`, `value`, `unit?`, `caption?`, `tone?: 'default' | 'positive' | 'negative' | 'accent'`, `size?: 'md' | 'lg' | 'hero'`, `pill?: PillPropsBase`, `align?: 'start' | 'center'`.
- `stat-grid.ts` — `StatGridPropsBase`: `items: (StatTilePropsBase & { key: string })[]`, `dividers?: boolean`. Each tile takes an equal share of the row (`flex: 1`, `minWidth: 0`); with more than `columns` (default 2, max 3) the items wrap into rows.
- `pill.ts` — `PillPropsBase`: `label`, `tone: 'neutral' | 'accent' | 'positive' | 'negative' | 'success'`, `icon?: PowerupIconName`, `dot?: boolean`.
- `progress-bar.ts` — `ProgressBarPropsBase`: `value` (0–1, clamped), `tone?`, `startLabel?`, `endLabel?`, `accessibilityLabel`.
- `section-label.ts` — adds `trailing?: string`, `trailingTone?: 'secondary' | 'positive'`.
- `block-list.ts` — new kinds `card` (`{ tone?, padding?, blocks: KitBlock[] }`), `stats`, `row` (`ListRow` with `leading: { icon: PowerupIconName } | { token: { uri, symbol } }`, `title`, `subtitle?`, `value?`, `caption?`, `pill?`), `progress`, `divider`.
- `PowerupIconName` gains `Gift`, `Percent`, `TrendDown`.

### Layout rules (responsive)

- Rows: `flexDirection: row`, children `flex: 1` + `minWidth: 0`; numbers never wrap (`numberOfLines={1}`, `adjustsFontSizeToFit` with a `minimumFontScale` on mobile, `text-overflow: ellipsis` on DOM); labels wrap.
- Sizes from tokens through `s()` on mobile; no fixed width anywhere except icon bubbles and the bar height.
- The hero value scales down on narrow phones instead of clipping.

### Data (`packages/shared/src/powerups/skr`)

- `skrView` returns a structured view (hero, stats, guardians, daily, rewards, supply) instead of fact rows.
- `skrBlocks` turns it into `KitBlock[]`.
- Supply from `useCoinMarketData` (`circulatingSupply`, `totalSupply`); period change from the chart's first and last points.
- SKR/day = staked × apy / 365, labelled as an estimate; hidden without APY.

### Device gate

- Manifest gains `requires?: readonly DeviceCapability[]` (`'seed-vault'`); `skr` requires it.
- `allowlistForDevice(allowlist, powerups, capabilities)` (pure, in `utils/powerupSwitches.ts`) drops ids whose requirement the device lacks; both Homes apply it to `useNetworkPowerups`'s result, so catalogue, tabs and install all follow.
- Mobile: `useDeviceCapabilities()` reports `'seed-vault'` from `isSeedVaultAvailable()` (answer kept for the session). DOM: none.
- `stakingSectionBlocks` takes `canPress(token)`; the SKR row is pressable only where `skr` is allowed.

### Pencil

The proposal is rebuilt as components in `SKR-powerup-design-components.pen` (beside the original, which stays untouched): variables mirroring the app's semantic tokens, auto layout throughout (`fill_container`, gaps, padding), one component per kit block, and the screen composed of instances.

## Verification

Shared Vitest for the builder, formatters and gate; twin render tests; `pnpm typecheck`, `pnpm lint`, `check:parity`, `check-i18n`, `check-powerups-bundle`; emulator screenshots at 320 / 393 / 430 pt.
