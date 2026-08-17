---
name: Salmon Wallet
description: A cold blue-black water column with one living salmon-colored element per screen.
colors:
  neutral-0: '#FFFFFF'
  neutral-25: '#F6F8FB'
  neutral-50: '#EDF1F7'
  neutral-100: '#DDE3ED'
  neutral-200: '#C3CBDA'
  neutral-300: '#A7B1C4'
  neutral-400: '#8B96AD'
  neutral-500: '#6F7B95'
  neutral-600: '#58637B'
  neutral-700: '#414B61'
  neutral-800: '#2C3547'
  neutral-850: '#212938'
  neutral-900: '#161C2D'
  neutral-925: '#1B2233'
  neutral-950: '#10131C'
  neutral-975: '#0B0F19'
  neutral-1000: '#070911'
  salmon-50: '#FFF1EE'
  salmon-100: '#FFDDD6'
  salmon-200: '#FFBFB2'
  salmon-300: '#FF9E8B'
  salmon-400: '#FF7B63'
  salmon-500: '#FF5C45'
  salmon-600: '#E64A34'
  salmon-700: '#BF3A28'
  salmon-800: '#8F2B1E'
  salmon-900: '#5C1B13'
  success-300: '#7BEFCB'
  success-500: '#33D6A6'
  success-700: '#14795C'
  danger-300: '#FF9FAF'
  danger-500: '#FF6B85'
  danger-700: '#A32036'
  warning-300: '#FFD37A'
  warning-500: '#FFB020'
  warning-700: '#7A5205'
  membrane-thin: 'rgba(11, 15, 25, 0.62)'
  membrane-thick: 'rgba(11, 15, 25, 0.80)'
  border-hairline: 'rgba(199, 211, 232, 0.10)'
  state-hover: 'rgba(199, 211, 232, 0.06)'
  state-press: 'rgba(199, 211, 232, 0.10)'
  selected-fill: 'rgba(255, 92, 69, 0.12)'
  accent-tint: 'rgba(255, 92, 69, 0.10)'
  accent-tint-hover: 'rgba(255, 92, 69, 0.15)'
typography:
  balance:
    fontFamily: 'Geist, system-ui, -apple-system, sans-serif'
    fontSize: '60px'
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: '-0.245px'
    fontVariantNumeric: 'tabular-nums'
  display:
    fontFamily: 'Geist, system-ui, -apple-system, sans-serif'
    fontSize: '36px'
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: 'normal'
  headline:
    fontFamily: 'Geist, system-ui, -apple-system, sans-serif'
    fontSize: '24px'
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: '-0.12px'
  title:
    fontFamily: 'Geist, system-ui, -apple-system, sans-serif'
    fontSize: '20px'
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: '-0.12px'
  body:
    fontFamily: 'Geist, system-ui, -apple-system, sans-serif'
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 'normal'
  button:
    fontFamily: 'Geist, system-ui, -apple-system, sans-serif'
    fontSize: '14.5px'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '0'
  label:
    fontFamily: 'Geist, system-ui, -apple-system, sans-serif'
    fontSize: '10px'
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: '0.3px'
  mono:
    fontFamily: 'Geist Mono, ui-monospace, monospace'
    fontSize: '13px'
    fontWeight: 400
    lineHeight: 1.4
    fontVariantNumeric: 'tabular-nums'
rounded:
  sm: '4px'
  md: '8px'
  lg: '12px'
  button: '12px'
  xl: '16px'
  2xl: '24px'
  card: '26px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '20px'
  2xl: '24px'
  3xl: '32px'
  5xl: '48px'
components:
  button-primary:
    backgroundColor: '{colors.salmon-500}'
    textColor: '{colors.neutral-1000}'
    typography: '{typography.button}'
    rounded: '{rounded.button}'
    height: '56px'
  button-primary-hover:
    backgroundColor: '{colors.salmon-600}'
    textColor: '{colors.neutral-1000}'
  button-outlined:
    backgroundColor: 'transparent'
    textColor: '{colors.neutral-50}'
    typography: '{typography.button}'
    rounded: '{rounded.button}'
    height: '56px'
  button-text:
    backgroundColor: 'transparent'
    textColor: '{colors.salmon-500}'
    typography: '{typography.button}'
    rounded: '{rounded.button}'
  button-text-hover:
    backgroundColor: '{colors.accent-tint}'
    textColor: '{colors.salmon-500}'
  card:
    backgroundColor: '{colors.neutral-950}'
    textColor: '{colors.neutral-50}'
    rounded: '{rounded.card}'
    padding: '20px'
  input:
    backgroundColor: '{colors.neutral-950}'
    textColor: '{colors.neutral-50}'
    typography: '{typography.body}'
    rounded: '{rounded.lg}'
    height: '56px'
  menu:
    backgroundColor: '{colors.neutral-925}'
    textColor: '{colors.neutral-50}'
    rounded: '{rounded.md}'
  dialog:
    backgroundColor: '{colors.neutral-925}'
    textColor: '{colors.neutral-50}'
    rounded: '{rounded.xl}'
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
The sentence a user should be able to say: _"It feels like my money is somewhere
deep and quiet, and I'm the only one who can reach it."_

**Depth and transformation, reconciled.** This world is built on stillness,
while the brand's only recorded metaphor is about change — the fish was chosen
because "it can change his size to transform itself" — and the flagship roadmap
feature, Powerups, is explicitly about modularity. Those pull in opposite
directions and the tension is real, so state how it resolves rather than paper
over it: **the water is constant, what moves through it is not.** Depth,
temperature and material are the invariants — they never change per feature, per
chain, or per module. Everything that transforms does so _inside_ that column:
the planes a surface can occupy, the salmon element that relocates screen to
screen, and later the Powerups that install, enable, and disappear without ever
altering the ground they sit on. A module changes the contents of a plane; it
never earns its own palette, its own typeface, or its own material. That is what
lets a marketplace of third-party capabilities ship without the product
dissolving into fifteen visual identities. Note also that the scales motif in
this codebase has **no recorded rationale** — the knowledge base never mentions
fish scales — so the meaning assigned to it in §Shapes is a design decision
made here, not a fact recovered from the brand.

**What "not the seabed" costs, and why it is worth it.** The north star names
the middle water, and the two things a designer reaches for first to make water
feel deep are both refused here on purpose, not by omission. **No sand, no
seabed, no floor of any kind**: sand is warm and light, so it would put a
second source of warmth on screen against the one salmon fill, and it would
invert the depth order by making the farthest thing the brightest.
**No ambient light shafts, no god rays, no caustics at rest**: permanent ambient
light is what would make a light _event_ stop meaning anything. What carries
depth instead is suspended matter and a ramp — see §The water column. Neither
refusal is an oversight to be corrected later; both are the reason the column
reads as one temperature with one warm thing in it.

**Two light events, and the older rule that said one** (amended 2026-08). This
document used to say the system had _exactly one_ light event, The Surfacing.
It now has two, and the second is the wave's ring on the wait screen — see
§The wait. The reason is not that the rule was wrong but that it cost more than
it was worth in one specific place: the wavefront drawn as an unlit hairline was
not legible as a wavefront, and a wave the user cannot see is not a cheaper
wave, it is no wave. The rule that survives is the one that was actually doing
the work — **light is an event, never a state**. Both events are bounded, both
are earned, and they are kept apart on every axis available: The Surfacing is
cyan, travels _up_, and fires once when money has arrived; the wait's ring is
salmon ink at low alpha, travels _outward and down_, exists only while money is
still in the air, and is gone before the receipt mounts. Nothing rests lit. What
is still refused without exception is light as a _hierarchy device_ — a glow
that says "this is important" rather than "this just happened".

**Three materials, and what each one is made of.** The system owns exactly
three textures, and the rule that assigns them is anatomical rather than
decorative: **flesh is the inside of the fish, so it lives inside a salmon
fill; scales are the skin and marine snow is the water, so both belong to the
plane behind everything; and a content surface carries no motif at all.** That
last clause is the one that does the work — a card, a sheet or a row is a lit
opaque plane held up in front of the water, and giving it a texture of its own
turns the motif into wallpaper and flattens the depth order it exists to
encode. See §The material rule.

**Where the motif lives.** It belongs to the **ground of the whole
application**, not to the home screen. A world that is water on one screen and
flat elsewhere is not a world. Three exceptions, and they are not negotiable:
seed-phrase views and the dApp approval screen (both pinned opaque by the
Bedrock Rule), and translucent membranes — a membrane's sanctioned share of
the motif is the 24px refraction strip on its own top edge, never the full
field, because a field behind a membrane is a field showing through content.

**What this direction refuses.** No neon. No purple-to-cyan gradient, no glow as
a hierarchy device, no color emitted by rectangles. No mesh-gradient orbs behind
the balance. No iridescence that carries meaning — oil-slick hue shift is a
contrast trap, so it is confined to non-informational strokes below 1.4:1
luminance contrast, and every piece of state is carried by opaque color _plus_
an icon _plus_ a label. No glass where glass is free (it is not free in MV3),
and no glass on the approval screen at any price. No white text on a salmon fill
— that pairing is 3.06:1 and is banned outright. No crypto sublime: no
starfields, no wireframe globes, no chart as wallpaper.

### What has shipped, and what has not

A reader must be able to tell these apart at a glance. Every section below
marks its parts.

| Layer                                                                                         | Status                                                                                      | Where                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primitive ramps (neutral, salmon, success, danger, warning)                                   | **Shipped**                                                                                 | `packages/shared/src/theme/palette.ts`                                                                                                                                                                                       |
| Semantic layer (depth, surface, text, border, status, change, state, accent)                  | **Shipped**                                                                                 | `packages/shared/src/theme/semantic.ts`                                                                                                                                                                                      |
| Contrast assertions in CI                                                                     | **Shipped**                                                                                 | `packages/shared/src/theme/contrast.test.ts`                                                                                                                                                                                 |
| Geist + Geist Mono, tabular-nums token, font-scale caps                                       | **Shipped**                                                                                 | `packages/shared/src/theme/typography.ts`, `packages/assets/src/fonts`                                                                                                                                                       |
| Brand mark as tintable vector paths                                                           | **Shipped**                                                                                 | `packages/shared/src/theme/brand.ts`                                                                                                                                                                                         |
| Wordmark as vector paths, generated from the typeface                                         | **Shipped**                                                                                 | `scripts/wordmark.py` → `packages/shared/src/theme/wordmark.generated.ts`, re-exported from `brand.ts`                                                                                                                       |
| MUI theme + unconditional focus ring (web, extension)                                         | **Shipped**                                                                                 | `packages/ui/src/theme/index.ts`                                                                                                                                                                                             |
| The water column: depth ramp + marine snow field (`semantic.water`, geometry, both renderers) | **Shipped**, full column height                                                             | `packages/shared/src/theme/depthField.ts`, `packages/ui/src/components/DepthBackground`, `apps/mobile/src/components/DepthBackground`                                                                                        |
| Opaque list rows (plane P2), so the motif is occluded rather than cropped                     | **Shipped**                                                                                 | `packages/shared/src/theme/colors.ts` (`background.tokenItem`), both `BlurContainer`s                                                                                                                                        |
| The water column mounted on the app ground                                                    | **Shipped** app-wide: home, onboarding/auth, lock, and every stacked page in all three apps | `packages/ui/src/components/WaterColumn` and `PageShell` / `AuthFlow` / both `LockPage`s, `apps/mobile/app/(app)/(tabs)/_layout.tsx` and `app/(auth)/_layout.tsx`, `apps/web` and `apps/extension` `pages/home/HomePage.tsx` |
| The flesh texture inside salmon fills (`lean` variant, 138×88 tile, bands raked 32°)          | **Shipped**                                                                                 | `scripts/flesh.py` → `packages/shared/src/theme/flesh.ts`, `semantic.flesh`, both `FleshBackground` renderers                                                                                                                |
| Scales motif rework — reduced to the deep field and the caustic band                          | **Shipped**                                                                                 | `ScalesBackground` `deepField` / `caustic`; the `fish` variant is retired in favour of flesh and kept only as an export                                                                                                      |
| Bezel on filled controls (`shadowsCSS.bezel`, same literal on DOM and RN)                     | **Shipped**                                                                                 | `packages/shared/src/theme/shadows.ts`                                                                                                                                                                                       |
| Motion vocabulary (`flick`…`tide`, `current`/`settle`/`sink`/`swellIn`)                       | **Shipped**, and applied in `apps/mobile` with no loose durations left                      | `packages/shared/src/theme/durations.ts`, `apps/mobile/src/utils/motion.ts`, `apps/mobile/hooks/usePressMotion.ts`                                                                                                           |
| The Surfacing                                                                                 | **Shipped**, minus two parts deliberately left out — see §The Surfacing                     | `apps/mobile/src/components/TransactionSuccessScreen/surfacing.ts`, `SurfacingLayers.tsx`                                                                                                                                    |
| The wait: descent, pulsing mark, radial wavefront, luminous ring, wave-driven exit            | **Shipped** on all three apps; the timing is one shared pure function — see §The wait       | `packages/shared/src/motion/wavefront.ts`, both `LoadingScreen`s                                                                                                                                                             |
| Icon consolidation onto Phosphor                                                              | **Shipped** on the DOM, with two declared exceptions                                        | `packages/ui/src/icons.ts`                                                                                                                                                                                                   |
| dApp approval: transaction effect preview + press-and-hold to approve                         | **Shipped**                                                                                 | `packages/ui/src/components/DAppApproval/TransactionEffectsCard.tsx`, `HoldToApproveButton.tsx`                                                                                                                              |
| Sand / seabed, ambient light shafts                                                           | **Refused by design** — see §Overview and §The water column                                 | —                                                                                                                                                                                                                            |
| Marine snow drift + scroll parallax, both reduced-motion gated                                | **Shipped**                                                                                 | `packages/shared/src/theme/depthField.ts` (`depthDrift`), both `DepthBackground`s                                                                                                                                            |
| Light theme (index-flip resolver)                                                             | **Specified, not built**                                                                    | —                                                                                                                                                                                                                            |
| Material/membrane model and the five-rung degradation ladder                                  | **Specified, not built**                                                                    | —                                                                                                                                                                                                                            |
| Icons on mobile (`phosphor-react-native`)                                                     | **Specified, not built**                                                                    | only `@phosphor-icons/react` is installed, in `packages/ui`                                                                                                                                                                  |
| Type scale (`display`…`monoLg`), radius scale (`r0`…`r6`), spacing rhythm                     | **Partly built** — the radius scale's control end is shipped; the rest specified            | Every control now sits on one 12px token (§The Control Radius Rule); `typography.ts` and the container end of `spacing.ts` still carry the Figma-derived one-offs                                                            |

**Key Characteristics:**

- Cold neutrals with a fixed blue bias (hue ≈ 222°), one warm brand ramp.
- Salmon is scarce: at most one living element per screen.
- Depth is expressed as _material and edge_, never as a bigger shadow.
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

| Semantic          | Ramp step      | Role                                                          |
| ----------------- | -------------- | ------------------------------------------------------------- |
| `depth.abyss`     | `neutral-1000` | Window/root behind everything; no content sits directly on it |
| `depth.column`    | `neutral-975`  | App ground; hosts the scales field                            |
| `surface.shelf`   | `neutral-950`  | Default opaque card                                           |
| `surface.raised`  | `neutral-900`  | Opaque card above a card                                      |
| `surface.crest`   | `neutral-925`  | Opaque top elevation — menus, opaque sheets                   |
| `surface.bedrock` | `neutral-975`  | Opaque by rule: approval and seed screens                     |
| `text.primary`    | `neutral-50`   | Balances, headings, body (16.37:1)                            |
| `text.secondary`  | `neutral-300`  | Labels, supporting rows (8.59:1)                              |
| `text.tertiary`   | `neutral-400`  | Timestamps, address middles, placeholders (6.24:1)            |
| `text.disabled`   | `neutral-500`  | Disabled controls (4.37:1 — exempt, passes anyway)            |
| `border.default`  | `neutral-600`  | 3.08:1 on `surface.shelf` only                                |
| `border.raised`   | `neutral-500`  | 3.99:1 on `surface.raised`, 3.74:1 on `surface.crest`         |
| `border.strong`   | `neutral-400`  | Emphasis and focus targets                                    |

Pure `#FFFFFF` is not a text token. Deep water has no pure white in it;
`neutral-50` is the whitest thing in the app and reads warmer and calmer at
16.37:1. `neutral-0` exists in the ramp only as the light theme's future
`surface.shelf`.

The translucent tiers `surface.membraneThin` and `surface.membraneThick` are
**shipped as color values** but the material they belong to is not built; see
§Elevation & Depth.

### Named Rules

**The One Living Thing Rule.** Salmon appears as a **fill** once per screen —
and the rule governs fills only. Four salmon fills on one screen means no fill
is primary, and that is the failure this rule exists to prevent. On the home
screen the one fill is the Send button.

Salmon as **ink** has no such problem and is not rationed: at 6.07:1 on dark
ground it out-measures several text roles already shipping, and the ramp has
lighter inks nothing has spent yet (`salmon-400` at 7.30:1, `salmon-300` at
9.29:1). Ink is spent where warmth is meaningful — the value a row is actually
about, active and selected states, interactive affordances, an action's
iconography, links — and withheld from genuinely secondary text.
`accent.tint` / `tintHover` are tinted grounds that sit _under_ salmon ink
(5.29:1 composite); they are not fills and do not consume the fill budget.
The goal is warmth and hierarchy, not a salmon screen.

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
color _plus_ an icon _plus_ a label. Color alone is never the signal — not for
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

### The wordmark

**Shipped.** The wordmark is now a vector, generated from the interface
typeface itself by `scripts/wordmark.py` into
`packages/shared/src/theme/wordmark.generated.ts` and re-exported from
`brand.ts` alongside the mark, with the same tintable single-`fill` contract
(`wordmarkToSvg(fill, width?)`). Before this it did not exist as a vector at
all, which meant the product name could only be rendered as live text — and
live text is at the mercy of whether the font loaded, of OS text scaling, and
of a fallback face silently substituting itself in the one place the brand can
least afford it.

Generating it from the typeface rather than drawing it is the point: the
wordmark cannot drift away from the interface face, because regenerating it is
how it changes. It is a single colour by construction, so it takes a text
token like any other ink.

**Character:** one family for the whole system. At a narrow column width a
display face that disagrees with the UI face costs more than it earns, and a
wallet is an _operate_ surface — the drama comes from the material, not the
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
column, and vertical space is _not_ the constraint an extension popup would
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

| Plane | Name                    | Content                                                                           | Material                                     |
| ----- | ----------------------- | --------------------------------------------------------------------------------- | -------------------------------------------- |
| P0    | Abyss (`depth.abyss`)   | Nothing — the void behind the app frame                                           | Opaque                                       |
| P1    | Column (`depth.column`) | App ground, the scales field                                                      | Opaque                                       |
| P2    | Shelf / Raised / Crest  | All lists, cards, inputs, content                                                 | **Opaque — the default**                     |
| P3    | Membrane                | Chrome that floats over scrolling content: tab bar, sticky header, sheets, toasts | **Translucent — the only translucent plane** |
| P4    | Caustic                 | Transient light: focus ring, press specular, the surfacing sweep                  | Additive, non-blocking, no pointer events    |

The colour values for P0–P2 and both membrane tiers are **shipped** in
`semantic.ts`. The material system that consumes them — the blur, the scrim, the
platform abstraction — is not.

### The scrim floor

Blur without a scrim is a contrast lottery: the ratio depends on whatever pixel
happens to be behind the text, and in a wallet that can be a white NFT
thumbnail. So each tier is defined as tint + alpha + blur radius, with the alpha
derived from a pure-white worst-case backdrop.

| Tier            | Value                    | Blur | Worst-case composite | Guarantees                                  |
| --------------- | ------------------------ | ---- | -------------------- | ------------------------------------------- |
| `membraneThin`  | `rgba(11, 15, 25, 0.62)` | 20px | `#686A70`            | `text.primary` at 4.77:1, and nothing else  |
| `membraneThick` | `rgba(11, 15, 25, 0.80)` | 32px | `#3C3F47`            | `text.primary` 9.29, `text.secondary` 4.88  |
| `bedrock`       | `neutral-975`, opaque    | none | `#0B0F19`            | Everything, including `text.accent` at 6.26 |

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

### Shadow Vocabulary — the bezel is built, the ambients are not

- **Top inner highlight** (`inset 0 1px 0 rgba(226,236,255,0.14)`): the lit rim.
  Every membrane and every raised card gets it.
- **Bottom inner shade** (`inset 0 -1px 0 rgba(3,6,12,0.50)`): the underside.
- **The bezel** (**shipped**, `shadowsCSS.bezel`): both rims at once — what a
  filled control wears so it reads as a body with a top and an underside rather
  than a flat rectangle. It is deliberately 1px each way: a heavier inset reads
  as _pressed_, and a primary button that looks pressed at rest has spent the
  affordance it needs and leaves the real press with nothing left to say.
  The same literal string is used on both platforms — React Native 0.83 parses
  this CSS `box-shadow` with `inset` in `processBoxShadow` and clips it to the
  view's own radius, so the rim follows the corner the way the DOM's does. One
  measured caveat: Android draws inset shadows only from API 29, and below that
  the bezel is simply absent and nothing else changes.
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
requesting page _through_ the material it is asking you to trust, teaching the
user that page content and wallet chrome share a visual plane — exactly the
confusion a phishing overlay wants. The backdrop behind it is a hard scrim
(`rgba(3,6,12,0.86)`), so the page underneath is dimmed out, not stylishly
present.

**The Scrim-Before-Glass Rule.** Never ship a membrane before its guaranteed
alpha. A membrane without its scrim floor is a beautiful screenshot and a
contrast bug, and in a wallet a contrast bug on an amount is a fund-loss vector.

## Shapes

**Radii.** The intended scale is seven steps: `r0` 0, `r1` 4 (chips, tags), `r2`
8 (icons), `r3` 12 (**every control**, list rows, small cards), `r4` 16 (cards),
`r5` 22 (the inner core of a bezel), `r6` 28 (bezel outer, sheets), and `full`
9999 (avatars, toggles). **Shipped**: `spacing.ts` still exposes the legacy set
— 4, 8, 12, 16, 20, 22, 24, 26 (`card`), plus 2, 9 and 18 one-offs — and the
frontmatter records those, because they are what renders. The consolidation of
the container end (`card` 26 into `r6` 28) is specified, not built.

**The Control Radius Rule (shipped).** Every interactive control is 12px:
buttons, text inputs, action buttons, the pressable token card. One number,
`borderRadius.lg`, with `componentSizes.buttonRadius`, `inputRadius`,
`actionButtonRadius` and the legacy `borderRadius.button` all bound to it, so a
call site cannot drift; `controlRadius.test.ts` fails if one does. **A control
is not a pill.** The primary button was 28 on a 56px body — a full pill — and
the field was 8, so a button and the input above it read as two different
shapes doing one job. 12 is the token-list row, which is the shape the user
already sees most, and a control now belongs to the same family as the row it
sits under. A pill is reserved for what genuinely is one: the tab bar and
`full` (avatars, toggles).

**The concentric rule: inner radius = outer radius − padding.** 28 − 6 = 22 is
the canonical pair, and it is what makes a double bezel look machined rather
than approximate.

**Strokes.** 1px is the only stroke weight for a boundary. The sub-pixel widths
in `borderWidth` (0.5, 0.75, 0.8) are legacy: they disappear on 1× Android and
in a narrow column at 100% zoom. 2px exists only for the focus ring. No colored
`border-left` accent thicker than 1px.

**The double bezel** — specified, not built, and not to be confused with
`shadowsCSS.bezel`, which is the 1px two-rim edge on a filled control and does
ship. This one is a construction, not a shadow. On the balance card and the
approval sheet: an outer shell filled `rgba(199, 211, 232, 0.06)` with a 1px
hairline, 6px of padding, radius 28; the inner core is its own surface at radius 22.

### The scales motif

The scales are the water column's texture and their **density is a depth
cue** — they tell you how far down you are looking, exactly the way
particulate density does in real water. Not wallpaper, not a chain indicator,
not a brand stamp. The rework is **shipped**: the motif was hauled off the
sheets, page shells, receive sheet and detail pages it used to tile edge to
edge at `rgba(0, 0, 0, 0.5)` — black on black on a near-black canvas, invisible
and decorative at once — and off the balance card, which had kept a band of it
above the total, and reduced to the appearances below. No content surface
carries it: the motif belongs to the water, and the water is the ground behind
the content.

1. **The deep field** (**shipped**) — on the app ground, the full height of
   whatever it is mounted in. Pattern scale 3.2× (`patternHeight` 26 → 83),
   stroke `rgba(199, 211, 232, 0.06)`, 1px, thinning downward to
   `scales.deepFieldFloor` rather than to nothing. It is half of the
   `WaterColumn` pair; see §The water column.
2. **The caustic band** (**shipped**) — the transient one, and the only moving
   appearance: the shaft of light in The Surfacing, masked by this same
   geometry at 0.5× in `#9FE0EF`. Same drawing, seen moving rather than at
   rest.
3. **The refraction strip** (**specified, not built**) — a 24px band clipped to
   the top edge of any membrane, pattern scale 0.5×, opacity 0.08, filled with a
   horizontal sweep from `#9FE0EF` through `salmon-300` to `success-300`. This
   is the direction's only iridescence and it is contained: composites measure
   1.24:1 and 1.18:1, under the 1.4:1 ceiling for any non-informational stroke.
   No text is ever placed within that band. It waits on the membrane material,
   which is not built either. The tokens (`refractionScale`,
   `refractionOpacity`, `refractionHeight`) already exist.

**The fish appearance is retired.** The motif used to have a third resting
appearance — the drawing at 1.0× pressed into the primary CTA's salmon fill —
and it is gone, replaced by the flesh texture below. Two reasons, both
material: a filled button is _mass_, not surface, so skin is the wrong tissue
for it; and the seigaiha tile is taller than a 56px button, so it read as a stamp
applied on top of the button rather than as the button's own material. The
`fish` variant and its `fishStroke` / `fishScale` tokens survive as deprecated
exports with no call sites, because `ScalesVariant` is a public export of
`@salmon/ui` with three apps behind it and removing it is a contract change
that needs a human's sign-off.

**Chain tinting is removed.** Chain identity moves to the token/network chip,
where it is an opaque badge with a label — a channel that survives colorblind
users, a narrow column, and a screenshot. A 6%-opacity pattern cannot be a data
channel.

Rationale, stated honestly: the knowledge base never mentions fish scales, so
this reading is assigned here rather than recovered. It is chosen because it
gives the asset a _job_ (depth encoding) instead of a decoration, and because a
motif with two or three sanctioned appearances at known scales becomes
recognizable where the same motif at 5% everywhere is either invisible or noise
the eye must filter out.

### The flesh texture

**Shipped.** The myoseptal texture of salmon flesh, as path data, generated by
`scripts/flesh.py` into `packages/shared/src/theme/flesh.ts`, inked from
`semantic.flesh`, and drawn by a `FleshBackground` on each platform — the same
one-geometry-two-renderers ownership the scales and the snow use.

**Why flesh and not scales.** Scales are skin: the outside of the animal, and
the right texture for a ground or a plane. A filled button is mass — it is the
_inside_ of the thing — so the honest material for it is what you see when the
fish is cut open: the myosepta, pale sheets of collagen and lipid separating
the muscle blocks. This is the whole of the material rule in one object.

What the drawing commits to, because each of these is easy to undo by
accident:

- **Bands run across the fillet, raked 32° off vertical.** Myosepta angle back
  along the fish; bands running with the long axis read as wood grain
  (van Leeuwen, _JEB_ 202:3405).
- **Bands are pale, never dark.** The pale stripe is collagen plus the fat that
  concentrates in the myocommata; dark slits mean _gaping_, which is a defect,
  not healthy flesh. This is also what makes the texture free of contrast risk:
  every band is lighter than the fill it sits on, so it can only raise the
  luminance under a label. Worst-case ink contrast on a salmon fill is exactly
  the flat fill's, and `flesh.test.ts` asserts that no band is ever darker.
- **It tiles by construction.** Every band is a level set of one field whose
  frequencies are whole numbers over the tile in both axes, and the tile height
  (`lean`, 138×88) is chosen so a band leaving the bottom edge is exactly the
  band two slots over entering the top — same position, same slope.

That last property replaced an earlier test as well as an earlier texture. The
old test demanded that every band's opacity envelope reach zero at the tile
edge, which sounds like the safe assertion and is the opposite: pinning every
envelope to zero at the same boundary switches all the bands off at once, and
an untextured column down the seam does not hide the repeat, it advertises it.
The test now checks what actually makes a tile seamless — continuity of
position _and_ slope across the crossing.

**Scale.** `componentSizes.buttonFleshScale` is **1**: the bands render at the
size they were authored. 0.55 was tried and rejected — at that scale the
anatomy stops reading as anatomy and becomes grain, which is a different and
more generic material. Contrast is unaffected either way, by the pale-band
guarantee above, so this was a purely visual call and it went to full size.

### The material rule

**The Material Rule.** Flesh is the interior of the fish and lives **inside a
salmon fill**. Scales and marine snow are the skin and the water, and they
belong to the **plane behind everything**. A content surface — a card, a sheet,
a list row, a page shell — carries **no motif at all**.

The third clause is the one that gets broken. A textured card looks richer in
isolation and costs the system its depth order: the motif exists to say _this
is far away_, and putting it on a surface the user is meant to read as _near
and lit_ says the opposite in the same breath. Content earns its presence by
being opaque and covering the water, not by joining it. This is also what makes
The Scales Exclusion Rule enforceable by construction rather than by cropping —
see §The water column.

### The water column — marine snow and the depth ramp

**Shipped**: `semantic.water` carries the ground's depth ramp and the marine
snow's ink; `packages/shared/src/theme/depthField.ts` carries the field's
geometry; `DepthBackground` draws it on the DOM and again in React Native, the
same one-geometry-two-renderers ownership the flesh texture uses. It sits in
the same plane as the deep field (`depth.column`), behind everything.

**Where it is mounted.** The ramp-plus-snow layer and the deep field are one
object, not two decisions, so on the DOM they are packaged as `WaterColumn`
(with a `waterColumnHost` style a container applies so the negative layer
stays above the host's own background). Both layers are CSS backgrounds —
one serialised data URI each, composited once — so mounting the ground on
another screen costs pixels in a layer that screen already has, not a
compositor layer per screen. It shipped on the home ground of all three apps
and on the mobile auth ground; **extending it to the remaining screens is in
progress** at the time of writing. The rule it is being extended under is
§Overview's: the motif belongs to the application's ground, and the only
screens it must never reach are seed-phrase views, the dApp approval screen,
and the inside of a membrane.

**Why it exists.** The deep field is drawn at 3.2× so it reads as a fish close
enough to fill the frame. On its own it does not: a large arc with empty ground
in front of it is exactly as readable as a small arc nearby. Scale is not a
property of an object, it is a property of the space in front of it, and this
world had no space in front of anything. Marine snow is that space.

**What it is, physically.** Composite organic aggregates — conventionally
everything above 0.5 mm, ranging to a few centimetres — porous, off-white, held
together by zooplankton mucus, sinking at roughly 10–100 m/day. It is what the
pelagic column at forty metres is actually full of, which is why it is the one
addition that does not argue with the north star. (Alldredge & Silver 1988 via
NOAA Ocean Exploration; Giering et al., _Front. Mar. Sci._ 2020.)

**What it does perceptually**, and the three properties the data encodes:

1. **Aerial perspective** — scattering lays a veiling luminance over anything
   distant, so contrast and internal detail fall off with distance; underwater
   the falloff is measured in metres rather than kilometres. Encoded as three
   bands: near flocs larger and brighter, far flocs smaller and dimmer.
2. **Texture gradient** — elements of assumed-uniform size project smaller and
   _denser_ the farther they are (Gibson 1955). Encoded by pushing the far band
   deeper into the field and holding the near band high. This is the honest
   name for "denser toward the bottom": it is density with _distance_, not a
   bathymetric profile. Real marine-snow concentration peaks in the upper
   100–200 m and thins below it; the document should not pretend otherwise.
3. **Interposition** — a floc that overlaps the scales is unambiguously nearer,
   which fixes depth order; order plus the contrast gradient is what turns
   "far" into a distance, and distance plus retinal angle is what finally reads
   as a _size_. Held et al., "Using Blur to Affect Perceived Distance and Size"
   (ACM TOG 29(2), 2010) runs the same argument backwards: flatten the gradient
   and a real city reads as a model.

**The ramp.** A vertical gradient on the ground, `neutral-950` at the top to
`neutral-1000` at the bottom. It suggests an abyss without drawing a floor.
Its top stop is the ground the three apps already paint
(`colors.background.primary`), not the `depth.column` this document names, so
nothing beside or above the ground — a safe-area overlay, a page header, a
sheet backdrop — seams against it; moving the ground itself is a separate
change. Because the ramp only ever darkens, it can only raise text contrast,
and `contrast.test.ts` asserts every text role at both stops.

**Contrast.** The snow is `rgba(199, 211, 232, 0.12)` and composites to 1.27:1
on the lightest ground it can land on — under the 1.4:1 ceiling for any
non-informational stroke, and in the same register as the deep field's 0.06
stroke. Every floc's authored opacity is a multiplier ≤ 1 on that one token, so
pinning the token pins the whole field; `depthField.test.ts` asserts the
multipliers and `contrast.test.ts` asserts the token.

**Exclusion, and why the field is full-height.** The field first shipped as a
360px band that faded out before the first data row, which enforced The Scales
Exclusion Rule by shape. That was the wrong mechanism, and it produced the
wrong picture: the motif lived exactly where the balance card covers it and
vanished in the empty lower half of every screen — an animal that fills the
frame, cut off at the chest.

The band existed for a real reason. The token rows were
`rgba(56, 63, 82, 0.10)`, so a full-height field would have been legible
_through_ a balance. But that translucency was itself off-system: this document
says content is opaque by default and translucency is a privilege of floating
chrome, and plane P2 — "all lists, cards, inputs, content" — is marked "Opaque
— the default". A list row is content, not chrome. So the rows became opaque
(`colors.background.tokenItem` is `surface.raised`) and the field became the
height of the column.

The rule is unchanged and now enforced the way it was written to be: snow and
scales never appear _readably_ behind a number, a row, an address, an input, a
seed phrase, or an approval surface, because the content on those surfaces
covers them. Depth is carried by the brightness ramp baked into every floc and
by the size/density gradient between the bands, not by a crop —
`depthField.test.ts` asserts coverage to the bottom of the field, no empty band
on the way, and that the top half is brighter than the bottom;
`contrast.test.ts` asserts that the row fill is opaque and distinct from every
stop of the ground ramp. The ramp itself is exempt from the rule because it is
a background _colour_, not a motif — a ground that darkens behind an amount is
still a ground.

`surface.raised` rather than `surface.shelf` for the rows, because the ground
is a ramp and `shelf` _is_ the ramp's top stop: a row painted in it would
disappear into the ground at the top of the column.

**The deep field follows.** The scales' `deepField` variant no longer occupies
a 180px band either. It fills whatever it is mounted in and thins downward to
`scales.deepFieldFloor` (0.35 of its stroke) rather than to nothing — a motif
that reaches zero has an end, and an end partway down the column is what read
as a crop. On the DOM the seigaiha tile is now serialised into a repeating
`background-image` data URI instead of a live `<svg><pattern>`, because the
degradation ladder below forbids the extension a full-viewport SVG the browser
can be asked to repaint; that also retires the `<pattern id>` collision two
live instances in one document used to risk. Opaque rows additionally drop one
`backdrop-filter` per row, which rung 4 of the same ladder bans outright.

**No filters.** `react-native-svg` implements `FeTurbulence` and
`FeDisplacementMap` as no-ops, so every irregularity — position, size, squash,
brightness — is authored into literals generated once from a seeded source and
never randomised at render time. That constancy is also what lets the DOM
serialise the field into a `background-image` data URI, which is how the
extension gets an image composited once instead of a full-viewport SVG the
browser can be asked to repaint.

**The snow moves.** Marine snow is snow because it falls out of the lit water,
so the field sinks — downward, never upward — at `depthDrift.pxPerSecond`
(3 px/s), and a scroll adds `depthDrift.parallaxFactor` (0.2) of its own
displacement on top. The two are summed, never switched: the hand speeds the
water up for as long as it is on the glass, and the water keeps sinking when it
is not. The argument that kept the field static was that real marine snow sinks
at about 0.6 mm/s and therefore does not visibly fall, which is true of a single
floc and beside the point for a field — what a drifting field buys is not the
appearance of falling but the proof that the ground is a _volume_ rather than an
image, and parallax against scroll is the strongest depth cue available to a
flat screen. The one-light-event argument does not apply either: drift is not
light, and it carries no meaning The Surfacing would have to share.

**Why 3 px/s.** The speed cannot be taken from the ocean, because the real one
is invisible; it is chosen against the eye instead. At a phone's viewing
distance 3 px/s is about 0.09°/s — a few multiples above the ~1–2 arcmin/s floor
of fixated velocity discrimination, and roughly 1/60 of the speed at which
smooth motion starts capturing attention on its own. Rest on one floc and it is
unmistakably moving; glance at the screen for half a second and it has travelled
1.5 px. That asymmetry is the whole brief: a particle field the eye catches
unprompted stops being water and becomes a game's weather. The speed is in
screen pixels rather than tile units, so the tile's width-driven scale does not
turn one decision into six different speeds across a side panel, a phone, and a
desktop window; the cycle length is derived from it, not authored.

**Why the loop cannot jump.** One tile of travel is the only displacement at
which the field lands back on a copy of itself, so that is the loop, and the
wrap shows the pixels it left. This is what changed about the field's tiling: it
now repeats _vertically_, at a period of one full column height, so at most one
seam is ever in frame. It still does not repeat horizontally, which is the axis
on which a particle field reads as wallpaper — the eye finds a seam by comparing
two points at the same height.

The honest cost is that the aerial-perspective ramp travels with the field: half
a cycle in, the brighter near band sits low in the frame rather than high. At
3 px/s that is over two minutes of continuous looking, and the change is
monotonic and unmarked, so none of it is perceptible as an event. The
alternatives were worse — a screen-locked mask over the field would have
double-dimmed the bottom of every frame, and a shorter loop would have had to
jump.

**Cost.** The constraints that produced the static answer stand as constraints
on the implementation, and they are met. The drift is a transform on a layer
that was already composited — the cheap half of the degradation ladder — and
never a repaint of the field, which is the half rung 4 forbids the extension
outright. On the DOM the field is one `background-image` with `repeat-y` moved
by a Web Animations API animation of `transform`, with the scroll offset on the
separate `translate` property, so the loop lives in the compositor and JS runs
only when a scroll event arrives. On React Native the repeats are `<Use>`
references to a single `<Defs>` group, so the field costs the same ~220 nodes it
did when it was static however many copies a screen needs, and both offsets are
read on the UI thread by Reanimated — React never re-renders for either.

**Reduced motion and battery.** `prefers-reduced-motion: reduce` and
`useReducedMotion()` each stop the drift _and_ the parallax, and what is left is
exactly the field as it first shipped: still water — a parallel mapping, not a
hole. Nothing runs unseen either: the DOM pauses the animation on
`visibilitychange`, and mobile freezes it when `AppState` leaves the foreground
and resumes it from where it stopped.

**What is deliberately absent.** No sand and no seabed: sand is warm and light,
which would add a second source of warmth against the single salmon fill and
would invert the depth order by making the farthest plane the brightest — and
the north star is the middle water, "not the surface, not the seabed". No
ambient light shafts or resting caustics: light is an _event_, never a state.
There are exactly two events — The Surfacing and the wave's ring on the wait
screen (§The wait) — and neither of them rests. Both absences are decisions
recorded here so no future reader files them as gaps.

### Named Rules

**The Scales Exclusion Rule.** Scales — and the marine snow, which is the same
kind of object — never appear behind a numeric value,
inside a list row, on a swap review card, anywhere on the approval sheet, behind
a seed phrase, on any surface where a live backdrop shows through, or in a
scrolling container in the extension.

The rule is about _readability_, not about leaving ground blank. Both fields
run the full height of the ground; what keeps them off a number is that the
surface carrying the number is opaque and covers them. A crop is not an
acceptable substitute, and neither is a translucent row: a row that lets the
column through is the violation, and cropping the column to compensate is the
band-aid this document used to prescribe.

In the extension the deep field is composited once as an image — a serialised
data URI for both the snow and the seigaiha tile — never a full-viewport SVG
the browser can be asked to repaint.

**The Concentric Rule.** Inner radius = outer radius − padding, always. A
rounded rectangle inside another rounded rectangle with the same radius is a bug.

## Components

### Buttons

Character: confident, wide, and quiet — a control is a surface you press, not a
thing that glows.

- **Primary** (**shipped**): salmon fill (`salmon-500`), `neutral-1000` label at
  6.50:1, weight 600, no text-transform, **12px radius** — the control radius,
  the same shape as a token list row and a text input; see §The Control Radius
  Rule — 56px tall, full-width when it is a screen's committing action. Hover
  darkens the fill to `salmon-600`. Elevation is disabled — MUI's shadow does
  not belong in this system. **Disabled is `surface.crest` with `text.disabled`
  at 0.45 opacity: the salmon never dims. It is either alive or absent.**
- **Outlined** (**shipped**): transparent fill, `border.raised` stroke,
  `text.primary` label. Hover raises the border to `border.strong` and adds the
  `state.hover` overlay.
- **Text** (**shipped**): `text.accent` label, `accent.tint` background on
  hover. Salmon on the 12% tint composite measures 5.29:1.
- **The primary fill's material** (**shipped**): the flesh texture, at
  `buttonFleshScale` 1, plus `shadowsCSS.bezel` for the edge. Not the scales —
  see §The flesh texture for why a filled control shows the inside of the fish.
- **Press specular** (**shipped on mobile**): `PressSpecular` with
  `usePressMotion`, at `flick`.
- **Press-and-hold on Approve** (**shipped**): see §The approval screen below.
- **Specified, not built**: the press specular on the DOM.

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
- **The balance card does not remount when the chain changes** (**shipped**).
  Switching chains crossfades only what is _printed_ on the card — logo, network
  badge, balance, variation — over `swell` (180ms), spent as `flick` out and
  `flick` in with the swap at the midpoint where nothing is visible. The
  container, its background and the pagination dots never take part. This is the
  depth model applied to motion: the card is a plane, a plane does not blink out
  of existence because its contents changed, and a whole card that disappears
  and returns reads as a navigation event rather than a value update. Under
  reduce-motion the swap steps rather than leaving a 90ms gap of nothing.

### Inputs / Fields

**Shipped.** `surface.shelf` fill, **12px radius** — the control radius, via
`componentSizes.inputRadius` on `MuiOutlinedInput`; it was 8, which made a
field a different shape from the button under it — `text.primary` value, `text.tertiary` placeholder at full
opacity (6.24:1 — it replaced a 3.66:1 placeholder that failed AA). The notched
outline is `border.default` at 1px, rising to `border.raised` on hover and to a
2px `accent.ink` outline on focus. Error swaps the outline to `status.danger`.
Disabled drops to 0.45 opacity. The floating label is `text.secondary`, turning
`text.accent` when focused.

### Focus ring — a signature component

**Shipped**, and the most load-bearing detail in `packages/ui/src/theme`. Two
concentric bands drawn _inside_ the control's border box: a 2px
`state.focusVisible` (`salmon-300`) outline at `outlineOffset: -2px`, over a 4px
`inset` box-shadow in `depth.abyss`.

Inset, not outset, for two reasons discovered in implementation: almost every
focusable surface in this app sits inside a clipping ancestor (a blur container,
a scroll container, a sheet, an action row), so anything painted outside the
border box was cut off; and an inset outline inherits the control's own
border-radius, so the ring is the control's own shape: at the 12px control
radius the two bands land at 10 and 6, still two legible concentric bands.

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

### The approval screen

**Shipped.** The screen now shows what a transaction would _do_ before it asks
for a signature: a `TransactionEffectsCard` with the balance deltas and, when
one is present, the spending permission being granted — named, with the spender
address in mono, and with "unlimited" said out loud when that is what it is.
The screen keeps every rule it already had — `surface.bedrock`, opaque, no
motif, hard scrim (see The Bedrock Rule) — and this is the same reasoning
applied one layer up: a screen the user is asked to trust must not withhold the
consequence it is asking about.

**Press-and-hold to approve.** When the preview finds a spending permission, a
transaction the network would reject, or nothing it can determine, Approve
becomes a 500ms hold rather than a tap. Those three are exactly the cases a
reflex tap should not be able to sign; a plain send the preview understood
keeps the ordinary button, because friction everywhere is friction nowhere.

Two details are load-bearing:

- **The keyboard confirms immediately.** Enter and Space commit on the first
  press, hold or no hold. WCAG asks that nothing be gated behind holding a key
  down, and a keyboard user cannot be made to pay the pointer's friction. The
  pointer path is unchanged: a click that never became a hold does nothing.
- **The hold's progress line is `neutral-1000`, not salmon.** This is a
  **declared deviation** from the design note, which specified a 1px salmon
  line. The line is drawn over the button's own `salmon-500` fill, where salmon
  on salmon is invisible; `neutral-1000` is the ink that fill already takes at
  6.50:1. The note was written before the fill it had to sit on was decided.

### Navigation

The tab bar is `membraneThin` at 28px radius, floating clear of the bottom edge
on phone and attached to the bottom edge in the extension side panel, with the
24px refraction strip along its top edge. The active item is a filled icon in
`salmon-500` with a label beneath in `text.primary` — and it is the screen's one
living element, which is why the home screen's action buttons are neutral.
**Specified, not built** as a material; the `GlassTabBar` sizing tokens exist in
`componentSizes`.

### Iconography

**Shipped on the DOM**: the consolidation onto **Phosphor Icons**
(`@phosphor-icons/react`, MIT) is done. Every DOM component now pulls its
glyphs from one module, `packages/ui/src/icons.ts`, rather than from a vendor
directly — one icon name, one import, so the set stays small, auditable and
swappable. Weight `regular` (Phosphor's default, so it is never passed);
`fill` only for the active tab item and the success checkmark; `duotone`
never. Size ramp 16 / 20 / 24 / 28 (`iconSize.sm`…`xl`) and nothing smaller,
because a thinner box loses the stroke. Icons take a text token, never their
own color: decorative at `text.tertiary`, actionable at `text.primary`,
destructive at `danger-500`. An icon on a membrane is `text.primary` plus a 1px
offset shadow so a thin stroke does not vanish when a bright logo scrolls
beneath.

Imports are deep paths rather than the package root: the root module pulls all
~1,500 icons through the bundler, which costs dev transpile time and, under a
misconfigured build, bundle size the extension cannot spend.

**Declared exceptions, not oversights.** `components/DAppApproval` and
`components/PendingActivityBanner` still import `@mui/icons-material`; they
were owned by concurrent work and left alone deliberately, which is why the
dependency stays in `packages/ui`'s manifest after being dropped from
`apps/web` and `apps/extension`. The chain marks — Solana, Bitcoin, Ethereum —
are also not Phosphor and never will be: no general icon set carries them, and
a brand mark redrawn to match a UI set stops being the brand mark.

**Specified, not built**: mobile. `phosphor-react-native` (MIT, riding
`react-native-svg`, already a dependency) is the other half of the model this
monorepo wants — same drawings, same names, two renderers, one icon name in a
shared contract. It is not installed yet.

### Motion

**Shipped**: the vocabulary below, in `packages/shared/src/theme/durations.ts`,
and applied throughout `apps/mobile` — there are **no loose durations left in
the mobile app**; every animation reads a token. The legacy
100/150/200/250/300/400ms set and `easing.bounce` at 1.56 are retired. The MUI
baseline still carries its `prefers-reduced-motion` block, which collapses
animation and transition durations to 0.01ms while explicitly _keeping_ the
focus ring, drawn with outline and box-shadow and never animated.

The vocabulary — "Current". Water has mass: nothing snaps, and nothing bounces
like rubber. Things displace and settle. Every token is named for the _job_ it
does rather than for its number, because a number cannot be chosen correctly:
`slower` gave no way to know whether a sheet or a toast belonged in it, which
is how the repo ended up with copy confirmation at 1500ms in two files and
2000ms in a third.

| Token   | ms  | For                                                      |
| ------- | --- | -------------------------------------------------------- |
| `flick` | 90  | Press down and release, specular                         |
| `swell` | 180 | Hover, color, state change, toast in                     |
| `ebb`   | 180 | Element exit — dismiss, collapse-away, toast out         |
| `drift` | 280 | Expand/collapse, list enter, list reorder, tab change    |
| `rise`  | 420 | Sheet present, modal                                     |
| `route` | 420 | Route transition — the same window as `rise`, on purpose |
| `tide`  | 720 | The signature moment only                                |

**Exit is faster than enter** (`ebb` 180 against `drift` 280). An entrance
introduces content the user has not read yet, so it has to be slow enough to be
followed; an exit removes content the user has already finished with, and every
millisecond of it is latency between a decision and its result. `rise` and
`route` share a window because a pushed route and a presented sheet are the
same event to the user, and giving them different lengths only makes the app
look inconsistent about its own depth.

Two values in the file are **holds, not transitions**: `feedbackHold` (1500ms,
how long a "Copied" chip stays readable) and `debounce` (500ms). Reduced motion
must not shorten either, which is what `resolveMotionMs` is for.

| Easing    | Curve                                  | Character                                                                                   |
| --------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `current` | `cubic-bezier(0.32, 0.72, 0, 1)`       | Heavy exponential out — the default for anything entering                                   |
| `settle`  | `cubic-bezier(0.22, 1.00, 0.36, 1)`    | Slower tail, for an amount landing                                                          |
| `sink`    | `cubic-bezier(0.40, 0.00, 1.00, 1.00)` | Accelerating out — exits only                                                               |
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

#### Loading in place: the container never becomes a skeleton

A skeleton says _this screen is being built_. Once a card, a row or a panel is
already on screen, that sentence is a lie: the screen exists, and what is
happening is that a number inside it is being replaced. So the rule is:

**The container stays. The skeleton is the value that changes — and only the
values that can change.**

Practically: the card keeps its blur, its border, its label and its position;
the value inside it reports that it is being recalculated, in place; a value the
request cannot change (the amount the user typed, the router, the provider, the
network) reports nothing at all, because a placeholder over something fixed
tells the user to expect a change that will never come. Nothing is keyed on the
value, so a request that comes back with an identical number produces no arrival
flash — the value simply stops signalling. The vocabulary is the one above:
`swell` to come back to rest on `settle`, `pulseCycle` for the breath while in
flight, and under reduced motion the loop is not started at all — the value
rests at the dimmed end instead, because a cycle length resolved to 0 spins
infinitely fast.

Where it already governs: the balance card when the chain changes (the
container and the pagination dots hold still while only the contents crossfade),
the price chart when the range changes, and the swap and bridge review screens
when the quote is refreshed. The shared primitive is `PendingValue`
(`packages/ui` for web and extension, `apps/mobile` for React Native, contract
in `packages/shared/src/types/ui/pending-value.ts`).

The control that started the work is part of the report: while the request is in
flight, the button that fired it says so and stops accepting a second press on
top of the first.

### The wait — the water the logo disturbs, built

**Shipped**, twice: `packages/ui/src/components/LoadingScreen` (web and
extension) and `apps/mobile/src/components/LoadingScreen`. The timing is one
pure function shared by both — `packages/shared/src/motion/wavefront.ts` — so
the two platforms cannot drift and the choreography is testable without a frame
clock. Same split as `surfacing.ts`.

The wait goes **down** while the success comes **up**. That single opposition is
what keeps a wait from competing with the only climax the system has.

1. **The descent** — always on. A 2px hairline track with a 44px segment of
   salmon _ink_ running down it once per `shimmerCycle`, decelerating into the
   end of every pass. It replaced a constant-speed spinning ring: Harrison, Yeo
   & Hudson (CHI 2010) measured a decelerating augmentation making a 5s wait
   read ~12% shorter, and a constant-speed rotation as the worst of the options
   they tested.
2. **The wave** — opt-in (`waves`), and reserved for **waiting on a
   transaction**: money in the air, nothing the user can do. A boot or a key
   derivation has nothing in the air, so a choreography there is decoration.
   - **The mark pulses**, 2% on `swell`, once per `pulseCycle`. It is the
     emitter. _(Reversal, 2026-08: the pulsing logo had been removed with the
     spinning ring. It is back because a radial front with no visible source
     reads as unrelated elements twitching, not as one wave. It returns as ink,
     not as a fill — it does not spend the one living salmon element a screen is
     allowed, because the descent below it is that same element seen twice.)_
   - **Every pulse launches a front.** A ring leaves the mark and reaches the
     farthest corner of the surface in `rise` (420ms) — a _time_, not a speed in
     px/s, so the gesture reads the same in a 360px extension popup and on a
     393×852 phone. The snow is measured in px/s because it is ambient; the wave
     is measured in time because it is an event.
   - **The elements ride it.** Title, subtitle and the descent are each
     displaced `waveAmplitude` (3px) upward with a 2% swell as the front reaches
     them — delayed in proportion to their _measured_ distance from the mark,
     and attenuated as 1/√d, which is how a circular wave loses amplitude when
     it spreads its energy over a growing perimeter. Attenuation is not a
     flourish: it is the difference between reading as one wave and reading as
     four things moving.
   - **It loops** for as long as the wait lasts. _(Reversal, 2026-08: the cap
     was three emissions, then stillness.)_ What keeps a thirty-second wait from
     being a thirty-second show is the duty cycle, not a counter — the front
     occupies 420ms of a 1200ms period and the rest is still water. Nothing
     accumulates: one compositor animation per element (`infinite` on the DOM,
     `withRepeat(-1)` on the UI thread in React Native), no JS timer behind it,
     and every value is cancelled on unmount.
3. **The exit is the wave, not a timer.** When the work resolves, the pending
   emissions are cancelled, a closing wave goes out _immediately_, and each
   element leaves as the front reaches it and does not come back. The ground
   holds for one crossing and then ebbs. The handoff to the receipt is at
   `rise + ebb` = **600ms**, fixed. It deliberately does _not_ wait out the
   emission in flight: that would put up to a whole `pulseCycle` between a
   decision and its receipt, against this system's own rule that exit is faster
   than enter. A hard timer backs the animation callback so a dropped completion
   cannot strand a caller on the wait screen.

**The ring is luminous** — a bright hairline crest in `accent.ink` with a wider,
dimmer halo in `accent.tint` trailing it by one `flick`. This is a light event
during a wait, which §Overview used to forbid. That rule is amended there rather
than quietly broken here; the short version is that the unlit version was not
legible, and the light stays bounded, salmon rather than cyan, outward-and-down
rather than up, and dead before the receipt mounts. On React Native the halo is
a second ring rather than a shadow, because `shadowRadius` is iOS-only and
`elevation` cannot be coloured; two rings read identically on both platforms and
both stay on the compositor.

**Reduced motion** is a parallel mapping, not a hole: no pulse, no ring, no
displacement — the descent's segment rests at mid-track (a still indicator reads
as a hung process, so the state moves into the words) — **and no wave-driven
exit**. A user who cannot see the wave is not made to wait one out; the wait
leaves in one `ebb` step and the receipt arrives 420ms sooner.

**The Bedrock Rule still wins.** The dApp approval flow's wait (`bedrock`) gets
no mark, no ring and no wave, for the same reason it gets no water column.

**Not built, and refused for now:** distortion. A text that ripples _over
itself_ needs a shader. On mobile that is `@shopify/react-native-skia` — a
native module, therefore a store release rather than an OTA, and it would not
even solve it, because Skia distorts pixels inside its own canvas and does not
move real views. `react-native-svg` is not an alternative: `FeTurbulence` and
`FeDisplacementMap` both return `null` and warn. On the DOM `feTurbulence` is
notoriously unaccelerated and displaces pixels rather than elements. What ships
is a physically correct front of rigid bodies floating, which is the part the
eye actually reads.

### The Surfacing — the signature moment, built

**Shipped on mobile**, in `apps/mobile/src/components/TransactionSuccessScreen`:
the timeline lives in `surfacing.ts` as a pure function of the reduce-motion
flag, so the _timing_ is testable without a renderer or a frame clock, and
`SurfacingLayers.tsx` draws the two things that move. Exactly one screen owns
it: the confirmation of a completed send or swap. Over `tide` (720ms), three
things happen on one timeline.

1. The sheet's membrane **clears**: tint α animates 0.80 → 0.55 and blur 32px →
   12px, so the water above the transaction thins out. On iOS this is the one
   call in the app that uses `GlassView`'s animated `clear` style.
2. A **caustic band** — a 140px-tall soft light shape, masked by the _scales_
   geometry at 0.5×, filled `#9FE0EF` at 10%, blurred 24px, `screen` blend —
   travels from the bottom of the sheet up to the amount over 560ms on
   `current`, and dissipates. It is the shaft of light hitting the fish.
3. The **amount** settles: translateY +6px → 0 on `settle`, arriving 120ms after
   the band passes it, digits already at tabular width so nothing reflows.

Then everything is still. No looping particles, no confetti, no repeat. A single
physical event, under a second, saying _this transaction came up out of the deep
and it is done_.

Reduced motion: the membrane clears in one 180ms opacity step, the caustic band
renders once as a static 10% highlight across the amount for 400ms and fades,
and the amount does not translate. The moment stays recognizable; it just does
not travel. It is a parallel mapping, not an off switch — the success haptic
still fires.

**Two parts of the specification were deliberately not built**, and both are
marked as such in the code rather than left to be discovered:

1. **The membrane's blur, 32px → 12px.** The sheet this screen mounts in is an
   opaque `surface.shelf`, not a P3 membrane, so there is nothing behind it to
   defocus: an `expo-blur` intensity over an opaque ground costs a full-screen
   GPU pass and shows nothing. What ships is the tint clearing — α 0.80 → 0.55,
   expressed as a view opacity of 1 → 0.6875 so the two halves of the statement
   cannot drift apart. The blur is waiting on the membrane material, not on
   effort.
2. **The band's 24px Gaussian.** `react-native-svg` does implement
   `FeGaussianBlur` natively, so this one was tried: at 24px it erased the
   scales geometry that masks the band, which is the only thing that makes the
   light read as _this_ system's light rather than a generic glow. The band
   ships sharp.

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
- **Do** spend salmon _fills_ once per screen; salmon ink is not rationed, but
  it is aimed — values, states, affordances, links — never sprayed.
- **Do** add a new token when a value is missing, rather than a literal at the
  call site — `packages/ui/src/theme` invents no colors, sizes or durations, and
  that property is worth protecting.
- **Do** keep the three materials in their own tissue: flesh inside a salmon
  fill, scales and snow on the ground behind everything, no motif on a content
  surface.
- **Do** mount the water on the application's ground, not on one screen. A world
  that is water on Home and flat elsewhere is not a world.
- **Do** let the keyboard commit an action the pointer must hold for. WCAG asks
  that nothing be gated behind holding a key down, and friction the keyboard
  cannot escape is an accessibility bug wearing a safety costume.
- **Do** mark new work against this file's shipped/not-built table, so the next
  reader can still tell the two apart.
- **Do** write a deviation down where the rule is, when a spec value loses to
  the surface it lands on — the hold progress line in `neutral-1000` rather than
  salmon is the example to copy.

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
  number. Each sanctioned appearance is a distance from the eye; a fourth use is
  a bug.
- **Don't** put a motif on a content surface — not a card, not a sheet, not a
  row, not a page shell. Content is the lit opaque plane in _front_ of the
  water, and texturing it inverts the depth order the motif exists to encode.
- **Don't** press the scales into a salmon fill. A filled control is mass and
  takes the flesh texture; the `fish` variant is deprecated and has no call
  sites.
- **Don't** darken a flesh band below the fill it sits on, at any opacity. Every
  band being lighter is what makes ink contrast on a salmon fill exactly the
  flat fill's, and `flesh.test.ts` asserts it.
- **Don't** make a tiling texture fade to zero at the tile edge to hide the
  seam. It does the opposite — it switches every band off along the same line
  and advertises the repeat as an untextured column. Seamlessness is continuity
  of position _and_ slope across the crossing.
- **Don't** reintroduce the retired values: the `#80ff54` lime, the `#404962`
  border (2.07:1), the `#6B6E7B` placeholder (3.66:1), sub-pixel border widths,
  or `easing.bounce` at 1.56.
- **Don't** let a Powerup, a chain, or a partner introduce its own palette,
  typeface, or material. Modules change the contents of a plane; the water is
  invariant.
- **Don't** add a glow, a mesh gradient, a starfield, or a chart-as-wallpaper.
  Depth comes from material and edge, never from emitted light. The two
  sanctioned light events (The Surfacing, the wave's ring) are events, not
  hierarchy: neither of them makes something look _important_, they both say
  something _just happened_, and neither of them rests.
- **Don't** add sand, a seabed, a horizon, or ambient light shafts to the
  ground. The column is the middle water and its light is always an event with
  a beginning and an end. Their absence is recorded in §The water column as a
  decision, not a gap.
- **Don't** ship the marine snow's drift without measuring it on a low-end
  Android and in the side panel first, and without gating it on both
  reduced-motion signals. Drift is decided; a repaint of the field, rather than
  a transform of its layer, is not what was decided.
- **Don't** reintroduce a motif on the dApp approval screen or a seed view, or
  behind a membrane, while extending the ground to more screens. Those three
  exclusions are the reason the ground is allowed everywhere else.
