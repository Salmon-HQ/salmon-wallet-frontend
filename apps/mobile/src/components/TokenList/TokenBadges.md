# TokenBadges Component

A component that displays small icon badges for token characteristics and metadata tags.

## Usage

```tsx
import { TokenBadges } from '../components';

// Basic usage
<TokenBadges tags={['verified', 'community']} />

// With token data
<TokenBadges tags={token.tags} />
```

## Supported Tags

### Verification & Trust

| Tag                 | Icon             | Color | Description                    |
| ------------------- | ---------------- | ----- | ------------------------------ |
| `verified`          | checkmark-circle | Green | Officially verified by Jupiter |
| `strict`            | star             | Amber | Token in Jupiter strict list   |
| `major`             | trophy           | Green | Major token (high market cap)  |
| `moonshot-verified` | shield-checkmark | Cyan  | Verified by Moonshot platform  |

### Community

| Tag                | Icon       | Color | Description            |
| ------------------ | ---------- | ----- | ---------------------- |
| `community`        | people     | Blue  | Community-driven token |
| `community-assist` | hand-right | Blue  | Community assist token |

### Token Types

| Tag            | Icon      | Color  | Description                   |
| -------------- | --------- | ------ | ----------------------------- |
| `lst`          | water     | Cyan   | Liquid staking token          |
| `original-lst` | water     | Cyan   | Original liquid staking token |
| `stable`       | logo-usd  | Green  | Stablecoin                    |
| `token-2022`   | cube      | Purple | Uses Token-2022 program       |
| `yb`           | analytics | Indigo | Yield bearing token           |

### Launchpad & Trading

| Tag                 | Icon        | Color  | Description             |
| ------------------- | ----------- | ------ | ----------------------- |
| `launchpad`         | rocket      | Pink   | Launchpad token         |
| `moonshot`          | moon        | Purple | Moonshot platform token |
| `birdeye-trending`  | trending-up | Orange | Trending on Birdeye     |
| `pumpfun-graduates` | school      | Pink   | Graduated from Pump.fun |

### Financial Products

| Tag             | Icon      | Color  | Description             |
| --------------- | --------- | ------ | ----------------------- |
| `jup-lend-earn` | cash      | Green  | Jupiter lend/earn token |
| `prestocks`     | bar-chart | Blue   | Pre-stocks token        |
| `xstocks`       | pie-chart | Indigo | X-stocks token          |

### Registry & Metadata

| Tag            | Icon          | Color     | Description                |
| -------------- | ------------- | --------- | -------------------------- |
| `old-registry` | document-text | Secondary | From legacy token registry |
| `solana-fm`    | search        | Indigo    | Listed on Solana FM        |
| `wormhole`     | link          | Purple    | Cross-chain via Wormhole   |
| `deduplicated` | git-branch    | Tertiary  | Deduplicated token entry   |
| `duplicate`    | copy          | Tertiary  | Duplicate token entry      |
| `deprecated`   | warning       | Error     | Deprecated token           |
| `internal`     | lock-closed   | Secondary | Internal use token         |

## Design

- **Size**: 18x18px compact badges
- **Border Radius**: 4px (borderRadius.sm)
- **Background**: 15% opacity of the icon color
- **Icon Size**: 10px
- **Spacing**: 4px gap between badges (spacing.xs)
- **Layout**: Horizontal row with flex wrap

## Integration with TokenListItem

To add badges to a token in the TokenListItem component:

```tsx
<View style={styles.nameRow}>
  <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
    {name}
  </Text>
  <TokenBadges tags={token.tags} />
</View>
```

## Props

### `TokenBadgesProps`

| Prop   | Type       | Default     | Description                               |
| ------ | ---------- | ----------- | ----------------------------------------- |
| `tags` | `string[]` | `undefined` | Array of tag strings to display as badges |

## Features

- Automatically filters out unknown/unsupported tags
- Returns null if no tags provided (no empty container)
- Uses existing Ionicons from @expo/vector-icons
- Follows design system colors and spacing tokens
- Fully typed with TypeScript
- Supports flex wrap for long tag lists

## Examples

### Single Badge

```tsx
<TokenBadges tags={['verified']} />
```

### Multiple Badges

```tsx
<TokenBadges tags={['verified', 'community', 'lst', 'birdeye-trending']} />
```

### Real Token Example (mSOL)

```tsx
<TokenBadges tags={['verified', 'community', 'lst', 'original-lst', 'strict']} />
```

### No Badges (renders nothing)

```tsx
<TokenBadges tags={[]} />
<TokenBadges tags={undefined} />
```
