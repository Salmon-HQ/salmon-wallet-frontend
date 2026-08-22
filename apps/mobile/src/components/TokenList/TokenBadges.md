# TokenBadges Component

Compact icon badges for a token's tags, at **list-row volume**. The full,
labelled inventory of every tag lives on the token detail sheet
(`TokenInformationSheet/TokenBadgesSection`); this component is deliberately
quieter.

## Usage

```tsx
import { TokenBadges } from '../components';

<TokenBadges tags={token.tags} />;
```

## The rules this component encodes

Source of truth for tag meaning: [`tokenTagMeta.ts`](./tokenTagMeta.ts) — a
port of the same table in `packages/ui` (`apps/mobile` must not import
`@salmon/ui`, which is DOM-only). Keep the two in step when a tag is added.

### 1. Colour is spent, not sprayed

Every tag has a `weight`. Only a **signal** — a verification or risk fact that
changes what a user does next — takes a status ramp. The other 23 tags are
monochrome `semantic.text.tertiary` on `semantic.state.hover`.

| Tag             | Weight      | Ink                       |
| --------------- | ----------- | ------------------------- |
| `verified`      | signal      | `semantic.status.success` |
| `strict`        | signal      | `semantic.status.success` |
| `duplicate`     | signal      | `semantic.status.warning` |
| `deprecated`    | signal      | `semantic.status.danger`  |
| everything else | descriptive | `semantic.text.tertiary`  |

`duplicate` is a caution rather than a category because it signals a mint
impersonating another one.

### 2. A cap of two, plus a `+N` overflow

Two chips render inline; the rest collapse into one `+N` chip. Past two, the
token name starts eating its own ellipsis in the narrow column.

Tags are sorted **signals first** (`sortTagsBySignalFirst`), so a risk tag is
structurally incapable of being the one collapsed.

### 3. Every chip has an accessible name

React Native has no DOM `role`/`aria-label`, so each chip is
`accessible` + `accessibilityRole="image"` + `accessibilityLabel={label}`,
which makes it one node to TalkBack/VoiceOver instead of an unnamed glyph.
The overflow chip announces the names of everything it collapsed, joined by
commas — the chip is a density affordance, not a place information goes to
die.

Labels come from the existing `token.badges.*` translation keys (present in
both `en` and `es`); proper nouns (LST, Token-2022, Pump.fun, Jupiter Lend,
Solana FM, Wormhole) stay literal by design.

## Design

- **Size**: `componentSizes.iconSizeXSmall`
- **Border radius**: `borderRadius.sm`
- **Background**: `semantic.state.hover` — the same neutral overlay for every
  chip, so separation does not depend on hue
- **Icon size**: `fontSize.xs`
- **Gap**: `spacing.xxs`
- **Layout**: single row, `flexWrap: 'nowrap'` (the cap replaces wrapping)

## Props

| Prop   | Type       | Default     | Description                   |
| ------ | ---------- | ----------- | ----------------------------- |
| `tags` | `string[]` | `undefined` | Tag strings from `Token.tags` |

## Behaviour

- Unknown tags are filtered out before the cap is applied, so an undrawable
  tag never consumes one of the two inline slots.
- Renders `null` for no tags, an empty array, or only-unknown tags.

## Examples

```tsx
// signals sort first, two inline, the rest collapse
<TokenBadges tags={['community', 'verified', 'birdeye-trending', 'lst']} />
// -> [verified] [community] [+2]   ("Trending, LST" on the +2)

<TokenBadges tags={['verified']} />
// -> [verified]

<TokenBadges tags={[]} />
<TokenBadges tags={undefined} />
// -> nothing
```

## Test IDs

- `token-badge-<tag>` per inline chip
- `token-badge-overflow` for the `+N` chip
