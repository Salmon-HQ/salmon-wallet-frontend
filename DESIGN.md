---
name: Salmon Wallet
description: A cold blue-black water column with one living salmon-colored element per screen.
colors:
  neutral-0: "#FFFFFF"
  neutral-25: "#F6F8FB"
  neutral-50: "#EDF1F7"
  neutral-100: "#DDE3ED"
  neutral-200: "#C3CBDA"
  neutral-300: "#A7B1C4"
  neutral-400: "#8B96AD"
  neutral-500: "#6F7B95"
  neutral-600: "#58637B"
  neutral-700: "#414B61"
  neutral-800: "#2C3547"
  neutral-850: "#212938"
  neutral-900: "#161C2D"
  neutral-925: "#1B2233"
  neutral-950: "#10131C"
  neutral-975: "#0B0F19"
  neutral-1000: "#070911"
  salmon-50: "#FFF1EE"
  salmon-100: "#FFDDD6"
  salmon-200: "#FFBFB2"
  salmon-300: "#FF9E8B"
  salmon-400: "#FF7B63"
  salmon-500: "#FF5C45"
  salmon-600: "#E64A34"
  salmon-700: "#BF3A28"
  salmon-800: "#8F2B1E"
  salmon-900: "#5C1B13"
  success-300: "#7BEFCB"
  success-500: "#33D6A6"
  success-700: "#14795C"
  danger-300: "#FF9FAF"
  danger-500: "#FF6B85"
  danger-700: "#A32036"
  warning-300: "#FFD37A"
  warning-500: "#FFB020"
  warning-700: "#7A5205"
  membrane-thin: "rgba(11, 15, 25, 0.62)"
  membrane-thick: "rgba(11, 15, 25, 0.80)"
  border-hairline: "rgba(199, 211, 232, 0.10)"
  state-hover: "rgba(199, 211, 232, 0.06)"
  state-press: "rgba(199, 211, 232, 0.10)"
  selected-fill: "rgba(255, 92, 69, 0.12)"
  accent-tint: "rgba(255, 92, 69, 0.10)"
  accent-tint-hover: "rgba(255, 92, 69, 0.15)"
typography:
  balance:
    fontFamily: "Geist, system-ui, -apple-system, sans-serif"
    fontSize: "60px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.245px"
    fontVariantNumeric: "tabular-nums"
  display:
    fontFamily: "Geist, system-ui, -apple-system, sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  headline:
    fontFamily: "Geist, system-ui, -apple-system, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.12px"
  title:
    fontFamily: "Geist, system-ui, -apple-system, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.12px"
  body:
    fontFamily: "Geist, system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  button:
    fontFamily: "Geist, system-ui, -apple-system, sans-serif"
    fontSize: "14.5px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0"
  label:
    fontFamily: "Geist, system-ui, -apple-system, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.3px"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
    fontVariantNumeric: "tabular-nums"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  button: "14px"
  xl: "16px"
  2xl: "24px"
  card: "26px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
  5xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.salmon-500}"
    textColor: "{colors.neutral-1000}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    height: "56px"
  button-primary-hover:
    backgroundColor: "{colors.salmon-600}"
    textColor: "{colors.neutral-1000}"
  button-outlined:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-50}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    height: "56px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.salmon-500}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
  button-text-hover:
    backgroundColor: "{colors.accent-tint}"
    textColor: "{colors.salmon-500}"
  card:
    backgroundColor: "{colors.neutral-950}"
    textColor: "{colors.neutral-50}"
    rounded: "{rounded.card}"
    padding: "20px"
  input:
    backgroundColor: "{colors.neutral-950}"
    textColor: "{colors.neutral-50}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    height: "56px"
  menu:
    backgroundColor: "{colors.neutral-925}"
    textColor: "{colors.neutral-50}"
    rounded: "{rounded.md}"
  dialog:
    backgroundColor: "{colors.neutral-925}"
    textColor: "{colors.neutral-50}"
    rounded: "{rounded.xl}"
---

# Design System: Salmon Wallet

## Overview

**Creative North Star: "Deep Water" — the pelagic column at forty metres.**

Not the surface, not the seabed: the middle water, where light arrives from
above already filtered, where the cold is uniform and enormous, and where the
only warm thing in frame is a living body moving through it. The whole world is
a deep, cold, blue-black volume with real dimension in it — planes at different
depths, light that behaves like light — and one salmon-colored element per
screen that is alive. Depth here is never decoration; it is the information
architecture. What is nearer is what you can act on. What is deeper is context.
The user's money sits on the nearest plane, lit, and everything else recedes.
The sentence a user should be able to say: *"It feels like my money is somewhere
deep and quiet, and I'm the only one who can reach it."*

**Depth and transformation, reconciled.** This world is built on stillness,
while the brand's only recorded metaphor is about change — the fish was chosen
because "it can change his size to transform itself" — and the flagship roadmap
feature, Powerups, is explicitly about modularity. Those pull in opposite
directions and the tension is real, so state how it resolves rather than paper
over it: **the water is constant, what moves through it is not.** Depth,
temperature and material are the invariants — they never change per feature, per
chain, or per module. Everything that transforms does so *inside* that column:
the planes a surface can occupy, the salmon element that relocates screen to
screen, and later the Powerups that install, enable, and disappear without ever
altering the ground they sit on. A module changes the contents of a plane; it
never earns its own palette, its own typeface, or its own material. That is what
lets a marketplace of third-party capabilities ship without the product
dissolving into fifteen visual identities. Note also that the scales motif in
this codebase has **no recorded rationale** — the knowledge base never mentions
fish scales — so the meaning assigned to it in §Shapes is a design decision
made here, not a fact recovered from the brand.

**What this direction refuses.** No neon. No purple-to-cyan gradient, no glow as
a hierarchy device, no color emitted by rectangles. No mesh-gradient orbs behind
the balance. No iridescence that carries meaning — oil-slick hue shift is a
contrast trap, so it is confined to non-informational strokes below 1.4:1
luminance contrast, and every piece of state is carried by opaque color *plus*
an icon *plus* a label. No glass where glass is free (it is not free in MV3),
and no glass on the approval screen at any price. No white text on a salmon fill
— that pairing is 3.06:1 and is banned outright. No crypto sublime: no
starfields, no wireframe globes, no chart as wallpaper.

### What has shipped, and what has not

A reader must be able to tell these apart at a glance. Every section below
marks its parts.

| Layer | Status | Where |
| --- | --- | --- |
| Primitive ramps (neutral, salmon, success, danger, warning) | **Shipped** | `packages/shared/src/theme/palette.ts` |
| Semantic layer (depth, surface, text, border, status, change, state, accent) | **Shipped** | `packages/shared/src/theme/semantic.ts` |
| Contrast assertions in CI | **Shipped** | `packages/shared/src/theme/contrast.test.ts` |
| Geist + Geist Mono, tabular-nums token, font-scale caps | **Shipped** | `packages/shared/src/theme/typography.ts`, `packages/assets/src/fonts` |
| Brand mark as tintable vector paths | **Shipped** | `packages/shared/src/theme/brand.ts` |
| MUI theme + unconditional focus ring (web, extension) | **Shipped** | `packages/ui/src/theme/index.ts` |
| Light theme (index-flip resolver) | **Specified, not built** | — |
| Material/membrane model and the five-rung degradation ladder | **Specified, not built** | — |
| Motion vocabulary (`flick`…`tide`, `current`/`settle`/`sink`/`swellIn`) and The Surfacing | **Specified, not built** | `durations.ts` still ships the legacy 100–600ms set and `bounce` at 1.56 |
| Scales motif rework (three appearances, three scales) | **Specified, not built** | `packages/ui/src/components/ScalesBackground` still defaults to `rgba(0,0,0,0.5)` at `patternHeight` 26 and is applied broadly across sheets and pages |
| Icon consolidation onto Phosphor | **Specified, not built** | `@mui/icons-material` is still the only icon set installed in web, extension, and `packages/ui` |
| Type scale (`display`…`monoLg`), radius scale (`r0`…`r6`), spacing rhythm | **Specified, not built** | `typography.ts` and `spacing.ts` still carry the Figma-derived one-offs |

**Key Characteristics:**

- Cold neutrals with a fixed blue bias (hue ≈ 222°), one warm brand ramp.
- Salmon is scarce: at most one living element per screen.
- Depth is expressed as *material and edge*, never as a bigger shadow.
- Content is opaque by default; translucency is a privilege of floating chrome.
- Every number is tabular; every address is monospace.
- The approval screen is the one place the water is completely still.

## Colors

Cold neutrals with a fixed blue bias, one warm brand ramp, and three status
ramps chosen so none of them collides with salmon in hue. The neutral ramp runs
0 (lightest) → 1000 (deepest) so a light theme becomes a re-mapping of ramp
indices, not a second palette.

Ratios below are computed with WCAG 2.x relative luminance against
`neutral-950` (`#10131C`), the default card surface, unless stated. All of them
are **shipped** and asserted in `contrast.test.ts`.

### Primary

- **Living Salmon** (`salmon-500`): the brand accent, unchanged from the
  original palette. As ink on dark ground it measures 6.07:1. As a fill it takes
  only `neutral-1000` ink (6.50:1). It appears on the primary CTA, on the active
  tab item, as a caret, and as a link — and it should appear once per screen.
- **Salmon Ring** (`salmon-300`): the focus-visible ring, 9.29:1 on
  `surface.shelf`.
- **Salmon Deep** (`salmon-600`): the primary button's hover fill.
- **Salmon Muddy** (`salmon-800`): the only escape hatch if light-on-salmon is
  ever mandated (8.29:1 with white). A different, muddier object; this system
  does not use it.

### Secondary

The status ramps, hue-separated from salmon on purpose. On a narrow column a red
error and a salmon CTA must never read as the same object.

- **Aqua Green** (`success-500`, 9.99:1): success ink and positive price change.
  `success-700` is its fill, carrying `neutral-50` at 4.73:1.
- **Rose Red** (`danger-500`, 6.80:1): danger ink and negative price change,
  deliberately rosier than salmon. `danger-700` is its fill.
- **Amber** (`warning-500`, 10.14:1): caution ink — price impact above 1%, new
  origins, non-blocking notices. `warning-700` is its fill.

Price change maps onto these: positive → `success-500`, negative →
`danger-500`, neutral → `neutral-400`. The previous lime `#80ff54` is retired;
it was the single most generic "crypto app" value in the palette.

### Neutral

The column, ordered by depth. Semantic names are depth names because depth is
the system, and each points at a ramp step rather than a literal.

| Semantic | Ramp step | Role |
| --- | --- | --- |
| `depth.abyss` | `neutral-1000` | Window/root behind everything; no content sits directly on it |
| `depth.column` | `neutral-975` | App ground; hosts the scales field |
| `surface.shelf` | `neutral-950` | Default opaque card |
| `surface.raised` | `neutral-900` | Opaque card above a card |
| `surface.crest` | `neutral-925` | Opaque top elevation — menus, opaque sheets |
| `surface.bedrock` | `neutral-975` | Opaque by rule: approval and seed screens |
| `text.primary` | `neutral-50` | Balances, headings, body (16.37:1) |
| `text.secondary` | `neutral-300` | Labels, supporting rows (8.59:1) |
| `text.tertiary` | `neutral-400` | Timestamps, address middles, placeholders (6.24:1) |
| `text.disabled` | `neutral-500` | Disabled controls (4.37:1 — exempt, passes anyway) |
| `border.default` | `neutral-600` | 3.08:1 on `surface.shelf` only |
| `border.raised` | `neutral-500` | 3.99:1 on `surface.raised`, 3.74:1 on `surface.crest` |
| `border.strong` | `neutral-400` | Emphasis and focus targets |

Pure `#FFFFFF` is not a text token. Deep water has no pure white in it;
`neutral-50` is the whitest thing in the app and reads warmer and calmer at
16.37:1. `neutral-0` exists in the ramp only as the light theme's future
`surface.shelf`.

The translucent tiers `surface.membraneThin` and `surface.membraneThick` are
**shipped as color values** but the material they belong to is not built; see
§Elevation & Depth.

### Named Rules

**The One Living Thing Rule.** Salmon appears once per screen. On the home
screen it is spent on the active tab item, which is why the four action pills
are neutral. If two salmon elements are on screen, one of them is wrong.

**The Salmon Physics Rule.** Salmon is a light source seen from below. On dark
ground it is ink; when it is a fill, the type on it is `neutral-1000` at 6.50:1
— never white. `contrast.test.ts` asserts both halves of this, including that
white on salmon fails. A salmon fill with white text does not exist in this
system.

**The Per-Plane Border Rule.** WCAG 1.4.11's 3:1 is measured against whatever
the border sits on, so the token is per-plane. `border.default` is legal on
`surface.shelf` and nowhere above it. **Any border above `surface.shelf` uses
`border.raised` or stronger.** `border.hairline` is decorative only: nothing
that carries meaning may depend on seeing it.

**The Three-Channel State Rule.** Every piece of state is carried by opaque
color *plus* an icon *plus* a label. Color alone is never the signal — not for
danger, not for success, not for a price move. The `+`/`−` on an amount is a
glyph, not a hue.

### The light theme — specified, not built

Every semantic token maps to a ramp index, and the theme flips the index, not
the hex. `depth.abyss` → `neutral-25`, `depth.column` → `neutral-50`,
`surface.shelf` → `neutral-0`, `surface.raised` → `neutral-25`, `text.primary`
→ `neutral-950`, `text.secondary` → `neutral-700`, `text.tertiary` →
`neutral-600`, `text.accent` → `salmon-700` (5.45:1 on white).

The mirror is exact for surfaces and text and **deliberately off by one step for
borders**: `neutral-300` on white measures 2.16:1 and fails 1.4.11, so light
borders step to `neutral-500`. That asymmetry belongs in the resolver, not in a
later bug report.

The two most brand-critical values are theme-invariant: `accent.fill` stays
`salmon-500` and `text.onAccent` stays `neutral-1000` at 6.50:1 in both themes.
The CTA is the same object in daylight and at depth. Implementation shape: a
`Record<SemanticToken, RampRef>` resolved per theme in
`packages/shared/src/theme`, so adding light is adding one resolver map rather
than editing 200 call sites.

## Typography

**Interface font:** Geist (with `system-ui, -apple-system, sans-serif`)
**Mono font:** Geist Mono (with `ui-monospace, monospace`)

Both are SIL OFL 1.1 and cleared for embedding in the app binaries and the
extension. **Shipped** as five static TTFs on every surface — Geist Regular /
Medium / SemiBold / Bold and Geist Mono Regular — in `packages/assets/src/fonts`
and mirrored into `apps/web/public/fonts` and `apps/extension/public/fonts`.

Note against the original direction: it called for variable WOFF2 on web and
extension with static instances only on mobile, and for a Geist Mono Medium for
seed words. What ships is static TTF everywhere, and there is no mono medium.
The variable/WOFF2 pipeline is **specified, not built**.

**Character:** one family for the whole system. At a narrow column width a
display face that disagrees with the UI face costs more than it earns, and a
wallet is an *operate* surface — the drama comes from the material, not the
letterforms. Geist at weight 600 with tight negative tracking is a cold,
engineered display voice that belongs in this water, and one family means one
font pipeline for three apps.

### Hierarchy

**Shipped** — what the MUI theme and the mobile token file actually render
today; these are the values in the frontmatter. The eight-step
`display`/`title`/`heading`/`bodyLg`/`body`/`label`/`micro`/`mono` scale from
the art direction is **specified, not built**, and `typography.ts` still carries
Figma-derived one-off sizes (11.375, 13.65, 14.5) that it is meant to replace.

- **Balance** (700, 60px, −0.245px, tabular): the total balance, and nothing
  else.
- **Display** (700, 36px, 1.25): the largest heading role.
- **Headline** (600, 24px, 1.3, −0.12px): sheet titles, screen headers.
- **Title** (600, 20px, 1.3, −0.12px): card titles.
- **Body** (400, 16px, 1.5): default copy.
- **Button** (600, 14.5px, 1.25, no transform): control labels. Never uppercase.
- **Label** (600, 10px, 1.5, +0.3px, uppercase): section and plane labels,
  "TESTNET", risk tags.
- **Mono** (400, 13px, tabular): addresses, hashes, memos, origin strings.

OS text scaling is respected, capped per context: `fontScaleCap.chrome` (1.3)
for tab bar labels and compact action buttons, `fontScaleCap.dense` (1.4) for
token and transaction lists. Icons are unaffected.

### Named Rules

**The Tabular Rule.** `tabularNums` is mandatory on every rendered number —
balances, token amounts, prices, percentages, fees, dates, countdowns. This
corrects the art direction, which treated tabular figures as a property of
choosing Geist: **Geist's default digits are proportional** (`1` is 384 units
against `0` at 663), and its `tnum` feature, which maps all ten digits to
600-unit variants, is **opt-in**. Switching typeface alone does not fix balance
jitter; applying the token does. It is shipped in two forms because the
platforms differ: `tabularNums.css` (`fontVariantNumeric: 'tabular-nums'`) for
web and extension, `tabularNums.native` (`fontVariant: ['tabular-nums']`) for
React Native — one of the few features RN's `fontVariant` enum can actually
enable, which is why the fix works on all three surfaces.

**The Monospace-Is-For-Scanning Rule.** Also a correction. The direction argued
monospace on addresses as anti-homograph typography; it is not. **Solana
addresses are base58, an encoding that already excludes `0`, `O`, `I` and `l`**
— the homoglyphs cannot occur. What monospace buys on an address is fixed-width
scanning: 4-character chunks that stay the same width every render, so the eye
can compare a prefix and suffix positionally. The homoglyph argument is real,
but it applies to **dApp origin strings**, which are not base58 and where
`jupiter.ag` versus `jupIter.ag` is a live attack. Use Geist Mono in both
places, for two different reasons, and do not conflate them.

**The Money Composition Rule.** Integer part at weight 600 in `text.primary`;
decimal separator and fraction at the same size but weight 400 in
`text.secondary`; currency symbol at 60% size, raised to cap height, in
`text.tertiary`. Sign is always a glyph plus a color, never a color alone. In
lists, amounts are right-aligned in a fixed column so decimal points line up
down the entire list — with tabular figures this is free, and it is the single
most expensive-feeling typographic detail in a wallet.

**The Seed Phrase Rule.** Seed words are Geist Mono at the larger mono size,
weight 500, in numbered cells, on `surface.bedrock` only. Never on a membrane,
never over a live backdrop, never inside a screenshot-permitted view. The cell
numbers are `text.tertiary` at label size so they are never mistaken for part of
the phrase.

## Layout

**Spacing.** A 4px base. The intended rhythm is a six-value subset — 4, 8, 12,
16, 24, 32 — plus 48 for section breaks, with more space above a heading than
below it (24 above, 12 below). **Shipped**: `spacing.ts` carries that subset and
also the one-off values it is meant to retire (18, 22, 30, 31, 34, 36, 42, 45,
60, 80), each named after the single screen it was measured from. Treat the
six-value rhythm as the rule for new work and the one-offs as debt.

**Column widths.** The narrow column is the governing case. The extension opens
as a **side panel**, not a popup — full viewport height, user-resizable width
in roughly the 320–400px range — so one layout must serve a resizable narrow
column, and vertical space is *not* the constraint an extension popup would
impose. Phone content maxes at 430px (`componentSizes.webContainerMaxWidth`) and
centers above that. Gutters: 16px in the narrow column, 20px on phone, single
column throughout, 12px row gap.

**Touch targets.** 44pt iOS / 48dp Android minimum, achieved with hit-slop
rather than by inflating visual size: a 28px icon button keeps its 28px ring and
gains 8px of invisible slop.

**Language expansion.** Every string ships in English and voseo-rioplatense
Spanish, enforced at parity in CI. Layouts must absorb roughly 15–25% Spanish
expansion without truncating a label or wrapping a control onto two lines.

## Elevation & Depth

Depth is not shadow. Depth is **material and edge**. A surface is not "higher"
because it has a bigger blur radius; it is higher because it is made of
something else.

### The five planes — specified, not built

| Plane | Name | Content | Material |
| --- | --- | --- | --- |
| P0 | Abyss (`depth.abyss`) | Nothing — the void behind the app frame | Opaque |
| P1 | Column (`depth.column`) | App ground, the scales field | Opaque |
| P2 | Shelf / Raised / Crest | All lists, cards, inputs, content | **Opaque — the default** |
| P3 | Membrane | Chrome that floats over scrolling content: tab bar, sticky header, sheets, toasts | **Translucent — the only translucent plane** |
| P4 | Caustic | Transient light: focus ring, press specular, the surfacing sweep | Additive, non-blocking, no pointer events |

The colour values for P0–P2 and both membrane tiers are **shipped** in
`semantic.ts`. The material system that consumes them — the blur, the scrim, the
platform abstraction — is not.

### The scrim floor

Blur without a scrim is a contrast lottery: the ratio depends on whatever pixel
happens to be behind the text, and in a wallet that can be a white NFT
thumbnail. So each tier is defined as tint + alpha + blur radius, with the alpha
derived from a pure-white worst-case backdrop.

| Tier | Value | Blur | Worst-case composite | Guarantees |
| --- | --- | --- | --- | --- |
| `membraneThin` | `rgba(11, 15, 25, 0.62)` | 20px | `#686A70` | `text.primary` at 4.77:1, and nothing else |
| `membraneThick` | `rgba(11, 15, 25, 0.80)` | 32px | `#3C3F47` | `text.primary` 9.29, `text.secondary` 4.88 |
| `bedrock` | `neutral-975`, opaque | none | `#0B0F19` | Everything, including `text.accent` at 6.26 |

Rules that follow directly from the table: `membraneThin` may only carry
`text.primary` at ≥15px and weight ≥500 — tab bar labels, a sticky header title,
nothing secondary and nothing salmon. Secondary text and status colors require
`membraneThick`. **Salmon ink never sits on a membrane** (it would need α 0.88,
past the point where glass is still glass); on a membrane salmon appears only as
a fill with `neutral-1000` ink, which is opaque and immune.

### The degradation ladder — specified, not built

Verified against the packages installed in this repo: `expo-glass-effect`
(`GlassView`, `GlassContainer`, `isLiquidGlassAvailable`), `expo-blur`
(`intensity`, `tint`, `blurMethod`, `blurReductionFactor`), and
`react-native-reanimated`.

1. **iOS 26+ with liquid glass available.** `GlassView` at
   `glassEffectStyle="regular"`, inside a `GlassContainer` with 12pt spacing so
   the tab bar's pills merge and separate like liquid — the one thing the OS
   gives that could not be built by hand. A scrim view is still painted inside
   the `GlassView`; `tintColor` blending is not a contractual fixed alpha and
   the scrim floor is not negotiable.
2. **iOS below 26.** `BlurView` at `systemThickMaterialDark`, intensity 60, plus
   the explicit scrim. Visually most of rung 1, minus the merge behaviour.
3. **Android 12+.** `BlurView` with `dimezisBlurViewSdk31Plus`, intensity 40,
   plus the same scrim. Blur on **at most one element per screen** — the sheet
   gets it, the tab bar does not. Press feedback is Android's own ripple.
4. **Extension side panel.** `backdrop-filter: blur(20px) saturate(115%)` over
   the membrane tint, on **exactly two elements per document** — the sticky
   header and the tab bar, both `position: fixed`. Never on a scrolling
   container, never on a sheet, never on a list row. Gate with
   `@supports (backdrop-filter: blur(1px))`.
5. **No transparency.** Triggered by `AccessibilityInfo.isReduceTransparencyEnabled()`,
   by `@media (prefers-reduced-transparency: reduce)`, or by an in-app
   Appearance toggle — the toggle is the real control, because the media query
   could not be verified outside Chromium. Membranes become the nearest opaque
   plane: thin → `surface.raised`, thick → `surface.crest`. Edges keep their
   inner highlight, the ambient shadow stays, and **the layout does not move by
   one pixel**. Android below 12 also lands here.

Rung 5 is a first-class look, not a fallback. It is what a large fraction of
users and every low-end Android will see.

### Shadow Vocabulary — specified, not built

- **Top inner highlight** (`inset 0 1px 0 rgba(226,236,255,0.14)`): the lit rim.
  Every membrane and every raised card gets it.
- **Bottom inner shade** (`inset 0 -1px 0 rgba(3,6,12,0.50)`): the underside.
- **Card ambient** (`0 8px 24px -8px rgba(3,6,12,0.45)`): raised cards (E2).
- **Membrane ambient** (`0 24px 48px -12px rgba(3,6,12,0.55)`): floating chrome
  (E3). Real offset, real blur.
- **Press specular**: a 90ms 12%-opacity radial at the touch point, 120px
  radius, `screen` blend, in a cold `#9FE0EF`. The only place a cold light color
  touches a control, and it is transient.

Four elevation levels, each expressed as material: **E0** ground, no edge, no
shadow · **E1** `surface.shelf` with the top highlight only · **E2**
`surface.raised` plus bezel, highlight, bottom shade, card ambient · **E3**
membrane or `surface.crest` with membrane ambient.

### Named Rules

**The Content Is Never Glass Rule.** Glass is reserved for surfaces whose whole
job is to hover over something else. If a surface does not overlap scrolling
content, it is opaque. This is what keeps the system from becoming a glass
casserole.

**The Bedrock Rule.** The dApp approval sheet and every seed-phrase view are
`surface.bedrock`, α 1.00, no blur, no scales, no caustic, no iridescence. This
is a security decision, not a taste one: a translucent approval sheet shows the
requesting page *through* the material it is asking you to trust, teaching the
user that page content and wallet chrome share a visual plane — exactly the
confusion a phishing overlay wants. The backdrop behind it is a hard scrim
(`rgba(3,6,12,0.86)`), so the page underneath is dimmed out, not stylishly
present.

**The Scrim-Before-Glass Rule.** Never ship a membrane before its guaranteed
alpha. A membrane without its scrim floor is a beautiful screenshot and a
contrast bug, and in a wallet a contrast bug on an amount is a fund-loss vector.

## Shapes

**Radii.** The intended scale is seven steps: `r0` 0, `r1` 4 (chips, tags), `r2`
8 (inner inputs, icons), `r3` 12 (list rows, small cards), `r4` 16 (cards), `r5`
22 (the inner core of a bezel), `r6` 28 (bezel outer, sheets, the primary pill),
and `full` 9999 (avatars, toggles). **Shipped**: `spacing.ts` still exposes the
legacy set — 4, 8, 12, 14 (`button`), 16, 20, 22, 24, 26 (`card`), plus 2, 9 and
18 one-offs — and the frontmatter records those, because they are what renders.
The consolidation (`card` 26 and `button` 14 collapsing into `r6` 28 and `r3`
12) is specified, not built.

**The concentric rule: inner radius = outer radius − padding.** 28 − 6 = 22 is
the canonical pair, and it is what makes a double bezel look machined rather
than approximate.

**Strokes.** 1px is the only stroke weight for a boundary. The sub-pixel widths
in `borderWidth` (0.5, 0.75, 0.8) are legacy: they disappear on 1× Android and
in a narrow column at 100% zoom. 2px exists only for the focus ring. No colored
`border-left` accent thicker than 1px.

**The double bezel** — specified, not built. On the balance card and the
approval sheet: an outer shell filled `rgba(199, 211, 232, 0.06)` with a 1px
hairline, 6px of padding, radius 28; the inner core is its own surface at radius
22.

### The scales motif

**Shipped**: `packages/ui/src/components/ScalesBackground` is a genuine
hand-drawn seigaiha SVG that defaults to `rgba(0, 0, 0, 0.5)` at
`patternHeight` 26 and is applied broadly — sheets, page shells, the receive
sheet, token and NFT detail pages. Black on black on a near-black canvas, tiled
edge to edge: it is effectively invisible, and it is used as generic wallpaper.

**Specified, not built**: the rework. In this world the scales are the water
column's texture and their **density is a depth cue** — they tell you how far
down you are looking, exactly the way particulate density does in real water.
Not wallpaper, not a chain indicator, not a brand stamp. Three appearances and
nothing else:

1. **The deep field** — on `depth.column`, behind the balance header only.
   Pattern scale 3.2× (`patternHeight` 26 → 83), stroke
   `rgba(199, 211, 232, 0.06)`, 1px, masked by a vertical gradient over the top
   180px so it dissolves as the eye travels down. It never reaches a row.
2. **The fish itself** — inside the primary CTA's salmon fill, and only there.
   Pattern scale 1.0×, stroke `rgba(7, 9, 17, 0.10)`: dark scales on a warm
   body, at the true scale of the drawing. On a 56px pill this reads as a
   material, not a pattern, and it shifts the 6.50:1 ink composite by less than
   0.1 of a ratio point.
3. **The refraction strip** — a 24px band clipped to the top edge of any
   membrane, pattern scale 0.5×, opacity 0.08, filled with a horizontal sweep
   from `#9FE0EF` through `salmon-300` to `success-300`. This is the direction's
   only iridescence and it is contained: composites measure 1.24:1 and 1.18:1,
   under the 1.4:1 ceiling for any non-informational stroke. No text is ever
   placed within that band.

**Chain tinting is removed.** Chain identity moves to the token/network chip,
where it is an opaque badge with a label — a channel that survives colorblind
users, a narrow column, and a screenshot. A 6%-opacity pattern cannot be a data
channel.

Rationale, stated honestly: the knowledge base never mentions fish scales, so
this reading is assigned here rather than recovered. It is chosen because it
gives the asset a *job* (depth encoding) instead of a decoration, and because a
motif used three times at three scales becomes recognizable where the same motif
at 5% everywhere is either invisible or noise the eye must filter out.

### Named Rules

**The Scales Exclusion Rule.** Scales never appear behind a numeric value,
inside a list row, on a swap review card, anywhere on the approval sheet, behind
a seed phrase, on any surface where a live backdrop shows through, or in a
scrolling container in the extension. In the extension the deep field is a
pre-rendered 2× PNG composited once, not a full-viewport SVG repaint.

**The Concentric Rule.** Inner radius = outer radius − padding, always. A
rounded rectangle inside another rounded rectangle with the same radius is a bug.

## Components

### Buttons

Character: confident, wide, and quiet — a control is a surface you press, not a
thing that glows.

- **Primary** (**shipped**): salmon fill (`salmon-500`), `neutral-1000` label at
  6.50:1, weight 600, no text-transform, 14px radius today (28px in the intended
  scale), 56px tall, full-width when it is a screen's committing action. Hover
  darkens the fill to `salmon-600`. Elevation is disabled — MUI's shadow does
  not belong in this system. **Disabled is `surface.crest` with `text.disabled`
  at 0.45 opacity: the salmon never dims. It is either alive or absent.**
- **Outlined** (**shipped**): transparent fill, `border.raised` stroke,
  `text.primary` label. Hover raises the border to `border.strong` and adds the
  `state.hover` overlay.
- **Text** (**shipped**): `text.accent` label, `accent.tint` background on
  hover. Salmon on the 12% tint composite measures 5.29:1.
- **Specified, not built**: the scales at 1.0× pressed into the primary fill;
  the 90ms press specular; the 500ms press-and-hold on Approve when a risk strip
  is present, with a 1px salmon progress line filling along the bottom edge.

### Cards / Containers

- **Corner style**: 26px on the balance card (`rounded.card`), 12–16px on list
  rows and content cards. 28px in the intended scale.
- **Background**: `surface.shelf` by default; `surface.raised` for a card above
  a card; `surface.crest` for menus, dialogs, tooltips and opaque sheets — all
  **shipped** through the MUI theme, with `backgroundImage: 'none'` set
  explicitly because MUI's dark mode fakes elevation with a white overlay
  gradient that fights the depth ramp.
- **Border**: 1px `border.raised` on anything above `surface.shelf`.
- **Shadow strategy**: see §Elevation & Depth. Ambient shadows are specified,
  not built; today the separation is carried by surface color alone.
- **Internal padding**: 20px on content cards, 16px in the narrow column.

### Inputs / Fields

**Shipped.** `surface.shelf` fill, 8px radius (`rounded.md` via
`MuiOutlinedInput`), `text.primary` value, `text.tertiary` placeholder at full
opacity (6.24:1 — it replaced a 3.66:1 placeholder that failed AA). The notched
outline is `border.default` at 1px, rising to `border.raised` on hover and to a
2px `accent.ink` outline on focus. Error swaps the outline to `status.danger`.
Disabled drops to 0.45 opacity. The floating label is `text.secondary`, turning
`text.accent` when focused.

### Focus ring — a signature component

**Shipped**, and the most load-bearing detail in `packages/ui/src/theme`. Two
concentric bands drawn *inside* the control's border box: a 2px
`state.focusVisible` (`salmon-300`) outline at `outlineOffset: -2px`, over a 4px
`inset` box-shadow in `depth.abyss`.

Inset, not outset, for two reasons discovered in implementation: almost every
focusable surface in this app sits inside a clipping ancestor (a blur container,
a scroll container, a sheet, an action row), so anything painted outside the
border box was cut off; and an inset outline inherits the control's own
border-radius, so a pill gets a pill.

Two bands because one is not enough anywhere. `salmon-300` measures 9.29:1 on
`surface.shelf` but only 1.53:1 on a salmon fill; `depth.abyss` measures 6.50:1
on that same fill. Whichever surface the ring lands on, one band clears the 3:1
that WCAG 2.2 1.4.11 asks of a focus indicator.

The selectors are doubled (`:focus-visible:focus-visible`,
`.Mui-focusVisible.Mui-focusVisible`) to buy specificity over MUI's own
`outline: 0`, which ships at lower specificity and is injected after
`CssBaseline`. The inner `<input>` of a field and the hidden `<input>` inside a
Switch/Checkbox/Radio opt out via `focusRingNone`; the element that owns the
field's visual boundary takes the ring instead, through
`.MuiInputBase-root:has(:focus-visible)`.

**It is never replaced by a bare `outline: none`.** Without it a keyboard user
cannot tell which control is focused, which on a transaction-approval screen is
a fund-safety problem rather than a cosmetic one.

### Navigation

The tab bar is `membraneThin` at 28px radius, floating clear of the bottom edge
on phone and attached to the bottom edge in the extension side panel, with the
24px refraction strip along its top edge. The active item is a filled icon in
`salmon-500` with a label beneath in `text.primary` — and it is the screen's one
living element, which is why the home screen's action pills are neutral.
**Specified, not built** as a material; the `GlassTabBar` sizing tokens exist in
`componentSizes`.

### Iconography

**Shipped**: `@mui/icons-material` — Material's filled set — in
`packages/ui`, `apps/web`, and `apps/extension`.

**Specified, not built**: consolidation onto **Phosphor Icons**
(`@phosphor-icons/react` for DOM, `phosphor-react-native` for mobile, both MIT,
the latter riding `react-native-svg` which is already a dependency). Same
drawings, same names, two renderers — the exact ownership model this monorepo
wants: one icon name in a shared contract, two platform imports. Weight
`regular`; `fill` only for the active tab item and the success checkmark;
`duotone` never. Size ramp 16 / 20 / 24 / 28 and nothing smaller, because a
thinner box loses the stroke. Icons take a text token, never their own color:
decorative at `text.tertiary`, actionable at `text.primary`, destructive at
`danger-500`. An icon on a membrane is `text.primary` plus a 1px offset shadow
so a thin stroke does not vanish when a bright logo scrolls beneath.

Filled Material icons carry a completely different density from anything else in
this world; they are the single biggest visual leak on web and extension today.
Because `@mui/material` stays, this is an import swap, not a framework change.

### Motion — specified, not built

**Shipped** today: `durations.ts` with the legacy 100/150/200/250/300/400ms set,
an `easing.bounce` at 1.56, and a `prefers-reduced-motion` block in the MUI
baseline that collapses all animation and transition durations to 0.01ms while
explicitly *keeping* the focus ring, which is drawn with outline and box-shadow
and never animated.

The intended vocabulary — "Current". Water has mass: nothing snaps, and nothing
bounces like rubber. Things displace and settle.

| Token | ms | For |
| --- | --- | --- |
| `flick` | 90 | Press down and release, specular |
| `swell` | 180 | Hover, color, state change, toast in |
| `drift` | 280 | Expand/collapse, list reorder, tab change |
| `rise` | 420 | Sheet present, route push, modal |
| `tide` | 720 | The signature moment only |

| Easing | Curve | Character |
| --- | --- | --- |
| `current` | `cubic-bezier(0.32, 0.72, 0, 1)` | Heavy exponential out — the default for anything entering |
| `settle` | `cubic-bezier(0.22, 1.00, 0.36, 1)` | Slower tail, for an amount landing |
| `sink` | `cubic-bezier(0.40, 0.00, 1.00, 1.00)` | Accelerating out — exits only |
| `swellIn` | `cubic-bezier(0.34, 1.14, 0.64, 1.00)` | ~4% overshoot, success only. Replaces `bounce` at 1.56, which is too rubbery for this world |

Mapping: press → `scale(0.985)` plus specular at `flick`/`current` with a light
haptic · state change → crossfade at `swell`, digits never reflowing because
they are tabular · list enter → 8px rise and fade at `drift`, 24ms stagger,
maximum six items · sheet → translateY 100%→0 at `rise`, backdrop blur 0→20px
and scrim 0→0.62 over the same window · route → shared element on the token
logo, outgoing screen receding to `scale(0.97)` with a 2px blur · loading → a
shimmer band traveling 1400ms across `state.hover`.

Reduced motion is a full parallel mapping, not a switch that turns motion off
and leaves holes: opacity steps replace translations, the stagger disappears,
the backdrop goes straight to its final scrim, and haptics are kept.

### The Surfacing — the signature moment, specified, not built

Exactly one screen owns it: the confirmation of a completed send or swap. Over
`tide` (720ms), three things happen on one timeline.

1. The sheet's membrane **clears**: tint α animates 0.80 → 0.55 and blur 32px →
   12px, so the water above the transaction thins out. On iOS this is the one
   call in the app that uses `GlassView`'s animated `clear` style.
2. A **caustic band** — a 140px-tall soft light shape, masked by the *scales*
   geometry at 0.5×, filled `#9FE0EF` at 10%, blurred 24px, `screen` blend —
   travels from the bottom of the sheet up to the amount over 560ms on
   `current`, and dissipates. It is the shaft of light hitting the fish.
3. The **amount** settles: translateY +6px → 0 on `settle`, arriving 120ms after
   the band passes it, digits already at tabular width so nothing reflows.

Then everything is still. No looping particles, no confetti, no repeat. A single
physical event, under a second, saying *this transaction came up out of the deep
and it is done*.

Reduced motion: the membrane clears in one 180ms opacity step, the caustic band
renders once as a static 10% highlight across the amount for 400ms and fades,
and the amount does not translate. The moment stays recognizable; it just does
not travel.

## Do's and Don'ts

### Do:

- **Do** put `neutral-1000` on every salmon fill. It is 6.50:1 and it is the
  only legal ink there, in both themes.
- **Do** apply `tabularNums` to every rendered number. Geist's digits are
  proportional by default and `tnum` is opt-in; the typeface alone does not fix
  jitter.
- **Do** use `border.raised` or stronger for any meaning-bearing border above
  `surface.shelf`. `border.default` is legal on `surface.shelf` and nowhere
  higher.
- **Do** carry every state in three channels — opaque color, icon, and label.
- **Do** keep the approval sheet and every seed view on `surface.bedrock`,
  opaque, with a hard scrim behind them.
- **Do** paint the scrim before the blur, on every rung of the ladder.
- **Do** spend salmon once per screen, and let the rest of the screen be cold.
- **Do** add a new token when a value is missing, rather than a literal at the
  call site — `packages/ui/src/theme` invents no colors, sizes or durations, and
  that property is worth protecting.
- **Do** mark new work against this file's shipped/not-built table, so the next
  reader can still tell the two apart.

### Don't:

- **Don't** put white text on a salmon fill. 3.06:1, banned outright, and
  asserted against in `contrast.test.ts`.
- **Don't** replace the focus ring with `outline: none`. On an approval screen
  an invisible focus state is a fund-safety bug.
- **Don't** put salmon ink on a membrane. It would need α 0.88, which is past
  the point where glass is still glass. Use a salmon fill with opaque ink.
- **Don't** put glass under content. If a surface does not overlap scrolling
  content, it is opaque.
- **Don't** apply `backdrop-filter` to more than two fixed elements in the
  extension document, or to more than one element per screen on Android. This is
  a permanent performance constraint, not a guideline.
- **Don't** use the scales as wallpaper, as a chain indicator, or behind any
  number. Three appearances, three scales, three jobs.
- **Don't** reintroduce the retired values: the `#80ff54` lime, the `#404962`
  border (2.07:1), the `#6B6E7B` placeholder (3.66:1), sub-pixel border widths,
  or `easing.bounce` at 1.56.
- **Don't** let a Powerup, a chain, or a partner introduce its own palette,
  typeface, or material. Modules change the contents of a plane; the water is
  invariant.
- **Don't** add a glow, a mesh gradient, a starfield, or a chart-as-wallpaper.
  Depth comes from material and edge, never from emitted light.
