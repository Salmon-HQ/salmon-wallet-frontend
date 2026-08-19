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
    fontFamily: 'DM Sans, system-ui, -apple-system, sans-serif'
    fontSize: '60px'
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: '-0.245px'
    fontVariantNumeric: 'tabular-nums'
  display:
    fontFamily: 'DM Sans, system-ui, -apple-system, sans-serif'
    fontSize: '36px'
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: 'normal'
  headline:
    fontFamily: 'DM Sans, system-ui, -apple-system, sans-serif'
    fontSize: '24px'
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: '-0.12px'
  title:
    fontFamily: 'DM Sans, system-ui, -apple-system, sans-serif'
    fontSize: '20px'
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: '-0.12px'
  body:
    fontFamily: 'DM Sans, system-ui, -apple-system, sans-serif'
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 'normal'
  button:
    fontFamily: 'DM Sans, system-ui, -apple-system, sans-serif'
    fontSize: '14.5px'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '0'
  label:
    fontFamily: 'DM Sans, system-ui, -apple-system, sans-serif'
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
  card: '28px'
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

Not the surface, not the seabed: the middle water, where light arrives from above already filtered, where the cold is uniform and enormous, and where the only warm thing in frame is a living body moving through it. The whole world is a deep, cold, blue-black volume with real dimension in it — planes at different depths, light that behaves like light — and one salmon-colored element per screen that is alive. Depth here is never decoration; it is the information architecture. What is nearer is what you can act on. What is deeper is context. The user's money sits on the nearest plane, lit, and everything else recedes. The sentence a user should be able to say: _"It feels like my money is somewhere deep and quiet, and I'm the only one who can reach it."_

**Depth and transformation, reconciled.** This world is built on stillness, while the brand's only recorded metaphor is about change — the fish was chosen because "it can change his size to transform itself" — and the flagship roadmap feature, Powerups, is explicitly about modularity. Those pull in opposite directions and the tension is real, so state how it resolves rather than paper over it: **the water is constant, what moves through it is not.** Depth, temperature and material are the invariants — they never change per feature, per chain, or per module. Everything that transforms does so _inside_ that column: the planes a surface can occupy, the salmon element that relocates screen to screen, and later the Powerups that install, enable, and disappear without ever altering the ground they sit on. A module changes the contents of a plane; it never earns its own palette, its own typeface, or its own material. That is what lets a marketplace of third-party capabilities ship without the product dissolving into fifteen visual identities. Note also that the scales motif in this codebase has **no recorded rationale** — the knowledge base never mentions fish scales — so the meaning assigned to it in §Shapes is a design decision made here, not a fact recovered from the brand.

**What "not the seabed" costs, and why it is worth it.** The north star names the middle water, and the two things a designer reaches for first to make water feel deep are both refused here on purpose, not by omission. **No sand, no seabed, no floor of any kind**: sand is warm and light, so it would put a second source of warmth on screen against the one salmon fill, and it would invert the depth order by making the farthest thing the brightest. **No ambient light shafts, no god rays, no caustics at rest**: permanent ambient light is what would make a light _event_ stop meaning anything. What carries depth instead is suspended matter and a ramp — see §The water column. Neither refusal is an oversight to be corrected later; both are the reason the column reads as one temperature with one warm thing in it.

**Two light events, and the older rule that said one.** This document used to say the system had _exactly one_ light event, The Surfacing. It now has two, and the second is the wave's ring on the wait screen — see §The wait. The reason is not that the rule was wrong but that it cost more than it was worth in one specific place: the wavefront drawn as an unlit hairline was not legible as a wavefront, and a wave the user cannot see is not a cheaper wave, it is no wave. The rule that survives is the one that was actually doing the work — **light is an event, never a state**. Both events are bounded, both are earned, and they are kept apart on every axis available: The Surfacing is cyan, travels _up_, and fires once when money has arrived; the wait's ring is salmon ink at low alpha, travels _outward and down_, exists only while money is still in the air, and is gone before the receipt mounts. Nothing rests lit. What is still refused without exception is light as a _hierarchy device_ — a glow that says "this is important" rather than "this just happened".

**Three materials, and what each one is made of.** The system owns exactly three textures, and the rule that assigns them is anatomical rather than decorative: **flesh is the inside of the fish, so it lives inside a salmon fill; scales are the skin and marine snow is the water, so both belong to the plane behind everything; and a content surface carries no motif at all.** That last clause is the one that does the work — a card, a sheet or a row is a lit opaque plane held up in front of the water, and giving it a texture of its own turns the motif into wallpaper and flattens the depth order it exists to encode. See §The material rule.

**Where the motif lives.** It belongs to the **ground of the whole application**, not to the home screen. A world that is water on one screen and flat elsewhere is not a world. Three exceptions, and they are not negotiable: seed-phrase views and the dApp approval screen (both pinned opaque by the Bedrock Rule), and translucent membranes — a membrane's sanctioned share of the motif is its own dark scales field, drawn in the material's ink rather than the water's, because a light field behind a membrane is a field showing *through* content. See §The membrane field.

**What this direction refuses.** No neon. No purple-to-cyan gradient, no glow as a hierarchy device, no color emitted by rectangles. No mesh-gradient orbs behind the balance. No iridescence that carries meaning — oil-slick hue shift is a contrast trap, so it is confined to non-informational strokes below 1.4:1 luminance contrast, and every piece of state is carried by opaque color _plus_ an icon _plus_ a label. No glass where glass is free (it is not free in MV3), and no glass on the approval screen at any price. No white text on a salmon fill — that pairing is 3.06:1 and is banned outright. No crypto sublime: no starfields, no wireframe globes, no chart as wallpaper.

### What has shipped, and what has not

A reader must be able to tell these apart at a glance. Every section below marks its parts.

| Layer                                                                                         | Status                                                                                      | Where                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primitive ramps (neutral, salmon, success, danger, warning)                                   | **Shipped**                                                                                 | `packages/shared/src/theme/palette.ts`                                                                                                                                                                                       |
| Semantic layer (depth, surface, text, border, status, change, state, accent)                  | **Shipped**                                                                                 | `packages/shared/src/theme/semantic.ts`                                                                                                                                                                                      |
| Contrast assertions in CI                                                                     | **Shipped**                                                                                 | `packages/shared/src/theme/contrast.test.ts`                                                                                                                                                                                 |
| DM Sans (patched) + Geist Mono, tabular-nums token, font-scale caps                           | **Shipped**                                                                                 | `packages/shared/src/theme/typography.ts`, `packages/assets/src/fonts`                                                                                                                                                       |
| Brand mark as tintable vector paths                                                           | **Shipped**                                                                                 | `packages/shared/src/theme/brand.ts`                                                                                                                                                                                         |
| Wordmark as vector paths, generated from the typeface                                         | **Shipped**                                                                                 | `scripts/wordmark.py` → `packages/shared/src/theme/wordmark.generated.ts`, re-exported from `brand.ts`                                                                                                                       |
| MUI theme + unconditional focus ring (web, extension)                                         | **Shipped**                                                                                 | `packages/ui/src/theme/index.ts`                                                                                                                                                                                             |
| The water column: depth ramp + marine snow field (`semantic.water`, geometry, both renderers) | **Shipped**, full column height                                                             | `packages/shared/src/theme/depthField.ts`, `packages/ui/src/components/DepthBackground`, `apps/mobile/src/components/DepthBackground`                                                                                        |
| Opaque list rows (plane P2), so the motif is occluded rather than cropped                     | **Shipped**                                                                                 | `packages/shared/src/theme/colors.ts` (`background.tokenItem`), both `BlurContainer`s                                                                                                                                        |
| The water column mounted on the app ground                                                    | **Shipped** app-wide: home, onboarding/auth, lock, and every stacked page in all three apps | `packages/ui/src/components/WaterColumn` and `PageShell` / `AuthFlow` / both `LockPage`s, `apps/mobile/app/(app)/(tabs)/_layout.tsx` and `app/(auth)/_layout.tsx`, `apps/web` and `apps/extension` `pages/home/HomePage.tsx` |
| The flesh texture inside salmon fills (the `marbled` drawing; the earlier `lean` variant and its `scripts/flesh.py` generator were retired) | **Shipped**                                                                                 | `packages/shared/src/theme/flesh.ts` (generated in TS at import time), `semantic.flesh`, both `FleshBackground` renderers                                                                                                     |
| Scales motif rework — reduced to the deep field and the caustic band                          | **Shipped**                                                                                 | `ScalesBackground` `deepField` / `caustic`; the `fish` variant is retired in favour of flesh and kept only as an export                                                                                                      |
| Bezel on filled controls (`shadowsCSS.bezel`, same literal on DOM and RN)                     | **Shipped**                                                                                 | `packages/shared/src/theme/shadows.ts`                                                                                                                                                                                       |
| Motion vocabulary (`flick`…`tide`, `current`/`settle`/`sink`/`swellIn`)                       | **Shipped**, and applied in `apps/mobile` with no loose durations left                      | `packages/shared/src/theme/durations.ts`, `apps/mobile/src/utils/motion.ts`, `apps/mobile/hooks/usePressMotion.ts`                                                                                                           |
| The Surfacing                                                                                 | **Shipped** on all three apps, minus two parts deliberately left out — see §The Surfacing   | `apps/mobile/src/components/TransactionSuccessScreen/surfacing.ts`, `SurfacingLayers.tsx`; DOM twin in `packages/ui/src/components/TransactionSuccessScreen`                                                                 |
| The wait: centred sinking mark, radial wavefront, refraction crest, wave-driven exit          | **Shipped** on all three apps; the timing is one shared pure function — see §The wait       | `packages/shared/src/motion/wavefront.ts`, `crest.ts`, both `LoadingScreen`s                                                                                                                                                 |
| Icon consolidation onto Phosphor                                                              | **Shipped** on the DOM, with two declared exceptions                                        | `packages/ui/src/icons.ts`                                                                                                                                                                                                   |
| dApp approval: transaction effect preview + press-and-hold to approve                         | **Shipped**                                                                                 | `packages/ui/src/components/DAppApproval/TransactionEffectsCard.tsx`, `HoldToApproveButton.tsx`                                                                                                                              |
| Sand / seabed, ambient light shafts                                                           | **Refused by design** — see §Overview and §The water column                                 | —                                                                                                                                                                                                                            |
| Marine snow drift + scroll parallax, both reduced-motion gated                                | **Shipped**                                                                                 | `packages/shared/src/theme/depthField.ts` (`depthDrift`), both `DepthBackground`s                                                                                                                                            |
| Light theme (index-flip resolver)                                                             | **Rejected** — see §The light theme                               | —                                                                                                                                                                                                                            |
| Material/membrane model — the thermocline, adopted as the `tint` rendering                    | **Shipped** as the `Thermocline` component; the glass/blur rungs were removed with the adoption — see §The thermocline | `apps/mobile/src/components/Thermocline`, `packages/ui/src/components/Thermocline`; consumers: the tab bar, and every sheet through `BottomSheetContainer`                                                                                       |
| Icons on mobile (`phosphor-react-native`)                                                     | **Shipped** — see §Iconography                                                              | `apps/mobile/src/icons.ts`, mirror of `packages/ui/src/icons.ts`                                                                                                                                                             |
| Type scale (`display`…`monoLg`), radius scale (`r0`…`r6`)                                     | **Shipped** — see §Hierarchy and §Shapes                                                    | `typography.ts` (Figma one-offs retired), `spacing.ts` (`radiusScale`, legacy names soft-deprecated)                                                                                                                         |
| Marine snow "blizzard" — heroes, mid lift, clustering over the base field                     | **Shipped** — see §The water column                                                         | `packages/shared/src/theme/depthFieldBlizzard.ts`, both `DepthBackground`s                                                                                                                                                   |
| The membrane field — one dark scales layer, edge to edge on the material                      | **Shipped**; it retired the 24px refraction strip, whose tokens survive unread — see §The membrane field | `scales.membraneFieldStroke`, both `Thermocline`s                                                                                                                                                            |
| The thermocline as the sheet material                                                         | **Shipped** — every sheet and the gate ground on the thick tier by default; the gate is still not a sheet in structure, only in ground — see §The thermocline is the sheet material | `BottomSheetContainer`, both `Thermocline`s                                                                                                                                          |
| The sink and the float — the transition verb                                                  | **Shipped on mobile** (onboarding, step changes, home chain swap, the wait); the DOM ports it after the numbers are calibrated on device | `apps/mobile/src/utils/sinkAndFloat.ts`                                                                                                                                   |
| Chrome-scale verb (header account line) and the copy→tick round trip                          | **Shipped** — see §Motion                                                                   | `CopyTick` in `packages/ui`, the mobile copy hook, the home header                                                                                                                                                          |
| The QR brand mark                                                                             | **Shipped** on both platforms — see §The mark                                               | `BrandMark` over the code, level-H error correction, 24% knockout                                                                                                                                                            |
| The unlock wait — the wave on key derivation, with the gate release parked                    | **Shipped on mobile** — see §The wait                                                       | `GateContainer/LockContent`, `apps/mobile/app/(app)/(tabs)/_layout.tsx`                                                                                                                                                      |
| Tab bar label contrast on the membrane (`caption`, `accent.inkOnMembrane`)                    | **Shipped** — see §Navigation                                                               | `semantic.ts` (`accent.inkOnMembrane`), `typography.ts` (`caption`), `contrast.test.ts`                                                                                                                                      |
| The sheet idiom and the chain-identity vocabulary in token lists                              | **Shipped** — see §Sheets and §Chain identity                                               | `BottomSheetContainer` and its nine sheets, `TokenSelectorModal`                                                                                                                                                             |
| Balance-card chain-switch affordance (swipe dive + peek, enlarged dots, seigaiha-arc pager)   | **Reverted — an open question again**; three forms tried and declined — see §Motion         | `BalanceCardCarousel`, back at its pre-experiment state                                                                                                                                                                      |
| The wait's passage — intrinsic entry beat, half-tide exit, the sequential unlock              | **Shipped on mobile**, the exit constant shared with the DOM twin — see §The wait           | `apps/mobile/src/utils/useWaitPassage.ts`, `WAVEFRONT_EBB_MS` in `packages/shared/src/motion/wavefront.ts`, both `LoadingScreen`s                                                                                            |
| The settings surface joins the system (token sweep, bedrock secrets, depth avatars, translated support, announced controls, `ConfirmSheet` over OS alerts, verb panels) | **Shipped** — see §Motion / the settings gate                | `SettingsPanelStack`, `GateContainer`, `SettingsSheet` and the panels under it                                                                                                                                               |
| Account avatars as depths of the neutral ramp                                                 | **Shipped** — see §Colors                                                                   | `getAvatarColor` in `packages/shared/src/types/settings.ts`, asserted in `contrast.test.ts`                                                                                                                                  |

**Key Characteristics:**

- Cold neutrals with a fixed blue bias (hue ≈ 222°), one warm brand ramp.
- Salmon is scarce: at most one living element per screen.
- Depth is expressed as _material and edge_, never as a bigger shadow.
- Content is opaque by default; translucency is a privilege of floating chrome.
- Every number is tabular; every address is monospace.
- The approval screen is the one place the water is completely still.

## Colors

Cold neutrals with a fixed blue bias, one warm brand ramp, and three status ramps chosen so none of them collides with salmon in hue. The neutral ramp runs 0 (lightest) → 1000 (deepest) so a light theme would have been a re-mapping of ramp indices, not a second palette — the ordering stands even though that theme is now rejected (see §The light theme).

Ratios below are computed with WCAG 2.x relative luminance against `neutral-950` (`#10131C`), the default card surface, unless stated. All of them are **shipped** and asserted in `contrast.test.ts`.

### Primary

- **Living Salmon** (`salmon-500`): the brand accent, unchanged from the original palette. As ink on dark ground it measures 6.07:1. As a fill it takes only `neutral-1000` ink (6.50:1). It appears on the primary CTA, on the active tab item, as a caret, and as a link — and it should appear once per screen.
- **Salmon Ring** (`salmon-300`): the focus-visible ring, 9.29:1 on `surface.shelf`.
- **Salmon Deep** (`salmon-600`): the primary button's hover fill.
- **Salmon Muddy** (`salmon-800`): the only escape hatch if light-on-salmon is ever mandated (8.29:1 with white). A different, muddier object; this system does not use it.

### Secondary

The status ramps, hue-separated from salmon on purpose. On a narrow column a red error and a salmon CTA must never read as the same object.

- **Aqua Green** (`success-500`, 9.99:1): success ink and positive price change. `success-700` is its fill, carrying `neutral-50` at 4.73:1.
- **Rose Red** (`danger-500`, 6.80:1): danger ink and negative price change, deliberately rosier than salmon. `danger-700` is its fill.
- **Amber** (`warning-500`, 10.14:1): caution ink — price impact above 1%, new origins, non-blocking notices. `warning-700` is its fill.
- **Status tints** (`status.successTint` / `status.dangerTint` / `status.warningTint`, plus `status.warningTintBorder`): tinted notice surfaces, values inherited from the retired `colors.status` layer.

Price change maps onto these: positive → `success-500`, negative → `danger-500`, neutral → `neutral-400`. The previous lime `#80ff54` is retired; it was the single most generic "crypto app" value in the palette.

### Neutral

The column, ordered by depth. Semantic names are depth names because depth is the system, and each points at a ramp step rather than a literal.

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

Pure `#FFFFFF` is not a text token. Deep water has no pure white in it; `neutral-50` is the whitest thing in the app and reads warmer and calmer at 16.37:1. `neutral-0` remains in the ramp with no consumer — it was reserved as the light theme's `surface.shelf`, and that theme is now rejected (see §The light theme).

The translucent tiers `surface.membraneThin` and `surface.membraneThick` are **shipped**, as the ink the thermocline material is made of; see §The thermocline under §Elevation & Depth.

**Account avatars are depths, not hues.** The twelve-hue rainbow the avatars used to draw from is retired: an avatar's fill comes from the cold neutral ramp — `neutral-600`, `700`, `800`, `850`, `925`, five depths of the same water, cycling deterministically by account through one function, `getAvatarColor` — because a second palette on the identity object competed with the status and brand hues for meaning it did not carry. Initials are always `text.primary`, every step clears AA, and `contrast.test.ts` asserts both — plus one guard that is easy to lose: no avatar step may equal the card surfaces avatars sit on, because an avatar painted in its own ground disappears; `neutral-900` and `neutral-950` are skipped for exactly that reason. Avatars are `full` radius — one of the genuine pills — and every consumer on every platform inherits through the one function, so the ramp cannot fork per surface.

### Named Rules

**The One Living Thing Rule.** Salmon appears as a **fill** once per screen — and the rule governs fills only. Four salmon fills on one screen means no fill is primary, and that is the failure this rule exists to prevent. On the home screen the one fill is the Send button.

Salmon as **ink** has no such problem and is not rationed: at 6.07:1 on dark ground it out-measures several text roles already shipping, and the ramp has lighter inks nothing has spent yet (`salmon-400` at 7.30:1, `salmon-300` at 9.29:1). Ink is spent where warmth is meaningful — the value a row is actually about, active and selected states, interactive affordances, an action's iconography, links — and withheld from genuinely secondary text. `accent.tint` / `tintHover` are tinted grounds that sit _under_ salmon ink (5.29:1 composite); they are not fills and do not consume the fill budget. The goal is warmth and hierarchy, not a salmon screen.

**The Salmon Physics Rule.** Salmon is a light source seen from below. On dark ground it is ink; when it is a fill, the type on it is `neutral-1000` at 6.50:1 — never white. `contrast.test.ts` asserts both halves of this, including that white on salmon fails. A salmon fill with white text does not exist in this system.

**The Per-Plane Border Rule.** WCAG 1.4.11's 3:1 is measured against whatever the border sits on, so the token is per-plane. `border.default` is legal on `surface.shelf` and nowhere above it. **Any border above `surface.shelf` uses `border.raised` or stronger.** `border.hairline` is decorative only: nothing that carries meaning may depend on seeing it.

**The Three-Channel State Rule.** Every piece of state is carried by opaque color _plus_ an icon _plus_ a label. Color alone is never the signal — not for danger, not for success, not for a price move. The `+`/`−` on an amount is a glyph, not a hue.

### The light theme — rejected

**Rejected, not deferred.** The identity is dark — deep water _is_ the product, not a skin on it. A light theme would break the material/luminance model the whole system is loaded with: the handful of luminance levels below `#0B0F19` that every shadow in the system lives in (§The wait measured the ground at 16 of 255 and calibrated the wave train's light/shadow alternation against exactly that headroom), and the light/shadow alternation built on it. Flipping the ramp flips the ground out from under all of it.

The index-flip spec below is **kept as history**, not deleted — it records what would have been built and one asymmetry (the border step) that was real and would have to be rediscovered if this decision is ever revisited.

Every semantic token maps to a ramp index, and the theme flips the index, not the hex. `depth.abyss` → `neutral-25`, `depth.column` → `neutral-50`, `surface.shelf` → `neutral-0`, `surface.raised` → `neutral-25`, `text.primary` → `neutral-950`, `text.secondary` → `neutral-700`, `text.tertiary` → `neutral-600`, `text.accent` → `salmon-700` (5.45:1 on white).

The mirror is exact for surfaces and text and **deliberately off by one step for borders**: `neutral-300` on white measures 2.16:1 and fails 1.4.11, so light borders step to `neutral-500`. That asymmetry belongs in the resolver, not in a later bug report.

The two most brand-critical values are theme-invariant: `accent.fill` stays `salmon-500` and `text.onAccent` stays `neutral-1000` at 6.50:1 in both themes. The CTA is the same object in daylight and at depth. Implementation shape: a `Record<SemanticToken, RampRef>` resolved per theme in `packages/shared/src/theme`, so adding light is adding one resolver map rather than editing 200 call sites.

## Typography

**Interface font:** DM Sans (with `system-ui, -apple-system, sans-serif`) **Mono font:** Geist Mono (with `ui-monospace, monospace`)

_(Reversal: the interface font went DM Sans → Geist → DM Sans, and each leg had a reason worth keeping. DM Sans was the original face. It was dropped for Geist because no released DM Sans carries `tnum` — there are no tabular glyphs to switch to, so balances shivered as digits changed; the Tabular Rule was born from that failure. It came back in 06e5434c because DM Sans declares no Reserved Font Name under the OFL, so the binaries could be patched instead of replaced: the shipped statics have their digit advances equalised, which is what Geist had been bought for (`packages/assets/src/fonts/DMSans-README.md`, `scripts/dmsans.py`), and `packages/shared/src/theme/tabularFigures.test.ts` reads the shipped TTFs so a regression cannot land silently. The mono was Geist Mono throughout — only the interface face travelled.)_

Both are SIL OFL 1.1 and cleared for embedding in the app binaries and the extension. **Shipped** as five static TTFs on every surface — DM Sans Regular / Medium / SemiBold / Bold and Geist Mono Regular — in `packages/assets/src/fonts` and mirrored into `apps/web/public/fonts` and `apps/extension/public/fonts`.

**The DM Sans files are modified, deliberately and reproducibly.** No released DM Sans has a `tnum` feature — there are no tabular glyphs to switch to — so its `1` sets at 342 units against a `0` at 656 and a balance reflows on every repoll. `font-variant-numeric` and React Native's `fontVariant` can only turn on a feature that exists, so against stock DM Sans both are silent no-ops. The shipped statics are therefore generated by `scripts/dmsans.py` from the upstream variable source committed at `packages/assets/src/fonts/upstream/`, instantiated at `wght` 400/500/600/700 and `opsz` 9, with the ten digit advances equalised to the widest digit, each outline shifted by half the difference so it stays optically centred, and every kern pair touching a digit dropped — equal advances alone still let `1,234.56` and `9,999.99` differ, because the kerning was fitted to the old proportional shapes. Tabular figures are not kerned. DM Sans declares no Reserved Font Name, so OFL clause 3 does not bind and the modified binaries may keep the name; the licence ships beside them and each file's `name` table records the modification. Full provenance and the regeneration command: `packages/assets/src/fonts/DMSans-README.md`.

Figures are consequently tabular **unconditionally** — no feature to enable, no call site able to forget, identical on all three surfaces. Digit width differs between weights (656 / 663 / 672 / 678); nothing rendered changes weight while it updates, so that is not a jitter source.

Note against the original direction: it called for variable WOFF2 on web and extension with static instances only on mobile, and for a Geist Mono Medium for seed words. What ships is static TTF everywhere, and there is no mono medium. The variable/WOFF2 pipeline is **rejected as a promise**: it has no consumers and no demonstrated need, so the open item is withdrawn rather than left standing as debt. If a real need appears, it gets re-specified.

### The wordmark

**Shipped.** The wordmark is now a vector, generated from the interface typeface itself by `scripts/wordmark.py` into `packages/shared/src/theme/wordmark.generated.ts` and re-exported from `brand.ts` alongside the mark, with the same tintable single-`fill` contract (`wordmarkToSvg(fill, width?)`). Before this it did not exist as a vector at all, which meant the product name could only be rendered as live text — and live text is at the mercy of whether the font loaded, of OS text scaling, and of a fallback face silently substituting itself in the one place the brand can least afford it.

Generating it from the typeface rather than drawing it is the point: the wordmark cannot drift away from the interface face, because regenerating it is how it changes. It is a single colour by construction, so it takes a text token like any other ink.

**Where it is used: back on the welcome screen** (owner, d17ede74 — "the door introduces itself"). The wordmark returned beneath the fish, at one shared gap constant (`onboardingMarkTitleGap` — the same air success puts between its mark and "Congratulations"), and beneath it the recorded public one-liner, **"Open code. Open ownership."** — kept in English deliberately, as a brand line, exactly like the wordmark itself is a graphic and not copy. Both land in bands already reserved, so nothing below them moves, and the wordmark is the single accessible header announcing Salmon. _(Superseded intermediate state, kept as history: a7c09750 had stripped the welcome to the bare mark alone at the wait screen's 96, on the argument that the brand should be one object at one size in both identity moments. The earlier state before that had the wordmark in the `title` slot in place of a heading, in `semantic.text.primary`, one ink with the mark. The recorded reason for the return is the commit's own title — the door introduces itself; the brand is still one ink and one lockup, just no longer nameless.)_ The component is `Wordmark` in `packages/ui` (79293a46), drawn from the shared vector.

**Character:** one family for the whole system. At a narrow column width a display face that disagrees with the UI face costs more than it earns, and a wallet is an _operate_ surface — the drama comes from the material, not the letterforms. DM Sans at weight 600 — its own fit, no added tracking — is a warm geometric voice that belongs in this water, and one family means one font pipeline for three apps. The generator is pinned to `DMSans-SemiBold.ttf` so this weight is the one that actually ships; it had previously defaulted to 700, which is the display/balance weight, not the weight this section specifies.

### The mark

**Shipped.** The salmon mark draws from `markPaths` in `packages/shared/src/theme/brand.ts` — a vector on a single-`fill` contract — everywhere it appears in onboarding and unlock. It was `Logo.png`, a 197x183 raster asked for 360 device pixels at 120dp on a 3x phone, letterboxed into square boxes of 48, 60, 80, 120 and 137.

**Its ink is `semantic.text.primary`, and it is white** (_"quiero que el icono deje de estar de color primary y que esté en blanco"_). Three things follow from that and should not drift:

- **It is not the accent.** The mark drew in `semantic.text.accent` for exactly as long as it took someone to look at it next to the copy above it. Salmon is the ink of _action_ in this system; spending it on a decorative mark competes with the one control on the screen that is meant to be pressed.
- **It is `text.primary`, not a literal `#FFF`.** The raster's near-white was a hardcoded `#FCFCFC` baked into the artwork, and getting the colour out of the file and into a token is the whole reason the mark became a vector. It is the same ink the title directly under it already uses, and it follows the theme.
- **Contrast** is **16.89:1** on `surface.bedrock` and 17.54:1 on `surface.abyss`. Pure white would be 19.15:1; the accent it replaced was 6.26:1.

The mark is sized by the onboarding grid, never by the screen — a vector has no native size to defer to, which is what let six of them coexist before.

**The Receive QR carries the mark.** The salmon mark sits centered on the Receive QR, on its own knockout — the mark is identity, not data, so it rests on the code's ground ink and is drawn in the module ink, never the accent. The knockout spans 24% of the code's width and the code runs error-correction level H, keeping the hidden modules well under the ~30% a level-H code can lose: a wallet QR must scan before it decorates. Both platforms compose it the same way — the vector `BrandMark` over the code, never a raster inside it.

### The onboarding grid

**Shipped.** Every screen in the create, recover and unlock flows composes on one slot grid: `chrome`, `mark`, `title`, `description`, `body`, `assist`, `secondary`, `action`. Reserved heights live once, in `packages/shared/src/theme/onboardingGrid.ts`, and both platforms read them. Every slot occupies its reserved height whether or not it is filled, so revealing an element cannot move anything else.

**Families, not one grid.** The first pass put all sixteen screens on a single table, which was read too literally (_"la idea era que el salmón esté en el mismo lugar según el tipo de screen"_). The invariant is **within a family**:

| variant        | the hero                                 | screens                                  |
| -------------- | ---------------------------------------- | ---------------------------------------- |
| `identity`     | the mark                                 | welcome, success, biometric opt-in       |
| `credential`   | the mark, over a secret                  | password creation                        |
| `lock`         | the mark, description collapsed          | unlock in every state                    |
| `content`      | what fills `body`                        | the seed screens, derived accounts       |
| `contentTight` | what fills `body`, right under the title | analytics consent                        |

_(The family grew from three to five, each split earned by a screen that could not obey its parent: `lock` is `credential` with the empty description band collapsed so the unlock input is not stranded under dead air, and `contentTight` is `content` with the same collapse — see the consent bullet below.)_

Within a variant every slot's Y is identical across its screens. Between variants only the **mark** and the **body** differ — and they differ by exactly offsetting amounts, so every variant's stack is the same height and the `chrome`, `assist`, `secondary` and `action` bands land at one Y on all sixteen screens.

Rules that hold it together:

- **A reserved height is the union of what any screen in the variant needs**, never what the screen in front of you needs.
- **The stack has one fixed height and is centred**, so the slack splits above and below instead of collecting under the action.
- **`lead`** is a reserved empty run between `chrome` and `mark`, and is not a slot. A family needing less `body` than its siblings gives the difference back at the _top_, which drops the mark, title and description into the middle of the region they share with `body`. Without it, `identity` wore the password screen's 188dp field reservation as a hole under its description — which is what "más centrado" was about, and it could not be fixed by centring the stack, because on the emptiest screen most of the stack is invisible.
- **`body` is the give**: the only slot that shrinks and the only one that scrolls. The action never moves.
- **The fish seeks the true centre of the screen, at 177.** (ed66881c.) On the two doors — welcome and lock — the fish centres itself on the screen, vertically and horizontally, and everything below flows down from it. The size is the identity size, `markSize` **177** (`logoSizeLarge` 137 + `spacing['4xl']` 40), shared by every hero screen. The centring is a runtime lead computed against the real screen height (safe-area aware on mobile), clamped by a shared `minStack` floor: when a short phone physically cannot fit centre plus cluster plus action bands, **both doors rise together to the same Y** instead of drifting apart. One owner-tunable number over the screen centre (`identityClusterCenterOffset`) moves both doors at once; keyboard behaviour is untouched because the lead derives from the already-occluded height. The welcome additionally carries the wordmark and the one-liner beneath the fish — see §The wordmark — in bands already reserved, so nothing below moves. _(Superseded intermediate states, kept as history: a7c09750 showed the bare mark alone at the wait screen's 96, so the brand was one object at one size on both identity moments; before that the title slot held the wordmark, not a heading — drawn from `wordmarkPaths` at 1.6x the size the title token gave it, with the description slot reserved and empty ("¿y si agrandamos Salmon y sacamos el Welcome?"). Because the name was a graphic it was sized independently, so the flow kept exactly one title token; its height was the title band less one `spacing.md`, because filling the band exactly measured 0.0dp between the mark's lower fin and the wordmark's cap height, tighter than a lockup reads.)_
- **Success wears the fish, at the door's size.** (Owner, d17ede74 sharpened by 423f0656: "success and welcome are literally the same screen — only the copy and the derivable question differ.") The success screen traded its `CheckCircle` for the `BrandMark` — the climax of onboarding is an identity moment again — and the fish stepped up from the old check's 80 to the same shared 177 welcome reads, on both platforms, from the same constant.
- **The fish stays only at the doors; every flow screen opens with the icon that names its situation.** (9395c874.) Warning for the seed warning, Sparkle, Key, Lock, Fingerprint, TreeStructure for derived accounts — the same Phosphor vocabulary, mirrored on the DOM pages. A step screen wearing the identity hero claimed an importance it did not have; the icon says what the screen is _for_ instead of who made it.
- **The mark anchors to the bottom of its band and the title to the bottom of its own; the description anchors to the top of hers.** Each band reserves two rendered lines for Spanish, and centring the ink left that unused allowance hanging _between_ the elements — 48dp between the mark and the wordmark, 45dp between the wordmark and the line under it. Anchoring inward collects the unused line outside the pair instead: 30dp and 12dp.
- **The keyboard moves things only when it actually covers them.** The layout gives up the measured overlap between the keyboard and its own bottom edge, and nothing when there is none. Under a real shortfall the description goes first and the mark second — both are explanatory or decorative — and `body` pays the rest.
- **Steps do not slide.** `app/(auth)/_layout.tsx` sets `animation: 'none'`. The ground is mounted once for the whole stack and every screen composes on this grid, so the furniture is already in place on the next screen; sliding it out and back only to redraw it at the identical Y describes something untrue, and it dragged the step indicator's chevron and dots along with it.
- **The analytics consent screen carries one icon, and its body sits against its title.** (a7c09750.) The metrics icon takes the mark slot — the fish is gone from it, so a policy screen no longer wears the identity hero — and the body sits directly under the title instead of across a mid-screen gap. The reserved bands keep their Y; nothing else moved. The flow moved too (79293a46): consent is asked _after_ the success screen, not before it. **Its dead air then collapsed like the lock's** (d2b5d247): the ~230pt between "Help improve Salmon" and its copy was the empty description band plus `body`'s start, so the lock's collapse mechanism generalised — `lockDescription` became `collapsedDescription`, shared by `lock` and the new `contentTight` variant, whose description shrinks to one title-line of air with the difference paid to `body`. `assist` and `action` never move, stack parity with `content` is proven by tests, and title-to-copy now breathes exactly what fish-to-title does.
- **Password aligns to recover's bands.** (9395c874.) The password screen takes the same variant as recover, with `body` anchored to its band's top edge, so two consecutive screens hold the hero still while only the content floats beneath it — the grid's promise applied across the step boundary, not just within one screen.
- **The lock screen now complies on mobile.** (6a699b31.) This document always said the lock carries the water (§What has shipped), and the RN layout structurally could not — it had no background slot. It does now, and the bands obey spec 013: the error and throttle copy land in `assist`, "I forgot my password" sits in `body` directly under the input, and the unlock button disables during throttle rather than disappearing.

**The Nothing Moves Under the Finger Rule.** The grid's promise is not only that slots land at the same Y from screen to screen — it is that **nothing displaces content while the user is interacting**. An element that appears in response to input — a strength meter, an inline error — reserves its space from the first frame, in a `ReservedSlot`, and fills it when it has something to say; revealing it cannot move the field under the finger or the button under the thumb. First applied case: the password strength bar (79ac4dba), with tests pinning that the layout height never changes as the user types. This rule has the rank of the Tabular Rule and the Bedrock Rule: it is the promise the grid exists to keep, not a layout preference.

### Hierarchy

**Shipped** — what the MUI theme and the mobile token file actually render today; these are the values in the frontmatter. The full scale is now built (e036aac3): `label` and `mono` joined the ramp, `monoLg` landed at 16 — inferred at first because the spec named the step without a number, and since confirmed — and the Figma-derived one-offs (11.375, 13.65, 14.5) and the deprecated `md` alias are retired, with ~120 call sites re-pointed at zero rendered change.

- **Balance** (700, 60px, −0.245px, tabular): the total balance, and nothing else.
- **Display** (700, 36px, 1.25): the largest heading role.
- **Headline** (600, 24px, 1.3, −0.12px): sheet titles, screen headers.
- **Title** (600, 20px, 1.3, −0.12px): card titles.
- **Body** (400, 16px, 1.5): default copy.
- **Button** (600, 14.5px, 1.25, no transform): control labels. Never uppercase.
- **Label** (600, 10px, 1.5, +0.3px, uppercase): section and plane labels, "TESTNET", risk tags.
- **Mono** (400, 13px, tabular): addresses, hashes, memos, origin strings.

OS text scaling is respected, capped per context: `fontScaleCap.chrome` (1.3) for tab bar labels and compact action buttons, `fontScaleCap.dense` (1.4) for token and transaction lists. Icons are unaffected.

### Named Rules

**The Tabular Rule.** `tabularNums` is mandatory on every rendered number — balances, token amounts, prices, percentages, fees, dates, countdowns. This corrects the art direction, which treated tabular figures as a property of choosing a typeface. They are not: most faces set proportional digits by default, and a face that offers tabular ones usually gates them behind an **opt-in** `tnum` feature. Stock DM Sans does not offer them at all (`1` at 342 units against `0` at 656, no `tnum` to enable), which is why the shipped binaries are patched to bake one advance into all ten digits — see *Typography*. The token is therefore a no-op against today's faces and stays mandatory anyway: it costs nothing, it states intent at the call site, and it is what remains correct the next time the family changes. It is shipped in two forms because the platforms differ: `tabularNums.css` (`fontVariantNumeric: 'tabular-nums'`) for web and extension, `tabularNums.native` (`fontVariant: ['tabular-nums']`) for React Native — one of the few features RN's `fontVariant` enum can actually enable, which is why the fix works on all three surfaces.

**The Monospace-Is-For-Scanning Rule.** Also a correction. The direction argued monospace on addresses as anti-homograph typography; it is not. **Solana addresses are base58, an encoding that already excludes `0`, `O`, `I` and `l`** — the homoglyphs cannot occur. What monospace buys on an address is fixed-width scanning: 4-character chunks that stay the same width every render, so the eye can compare a prefix and suffix positionally. The homoglyph argument is real, but it applies to **dApp origin strings**, which are not base58 and where `jupiter.ag` versus `jupIter.ag` is a live attack. Use Geist Mono in both places, for two different reasons, and do not conflate them.

**The Money Composition Rule.** Integer part at weight 600 in `text.primary`; decimal separator and fraction at the same size but weight 400 in `text.secondary`; currency symbol at 60% size, raised to cap height, in `text.tertiary`. Sign is always a glyph plus a color, never a color alone. In lists, amounts are right-aligned in a fixed column so decimal points line up down the entire list — with tabular figures this is free, and it is the single most expensive-feeling typographic detail in a wallet.

**The Seed Phrase Rule.** Seed words are Geist Mono at the larger mono size, weight 500, in numbered cells, on `surface.bedrock` only. Never on a membrane, never over a live backdrop, never inside a screenshot-permitted view. The cell numbers are `text.tertiary` at label size so they are never mistaken for part of the phrase. This governs every surface that _exhibits_ a phrase, and the first one is the onboarding grid — the first time a user ever sees their seed — not only the settings panel that re-shows it later. The screen's ground being bedrock is not enough: the numbered cells drawn on top of it are the surface the words actually rest on, and they are bedrock too. The rule does not reach seed _entry_ — a typed word sits in an input affordance, not on an exhibition ground — but the mono face is shared by both, for the same scanning reason.

## Layout

**Spacing.** A 4px base. The intended rhythm is a six-value subset — 4, 8, 12, 16, 24, 32 — plus 48 for section breaks, with more space above a heading than below it (24 above, 12 below). **Shipped**: `spacing.ts` carries that subset and also the one-off values it is meant to retire (18, 22, 30, 31, 34, 36, 42, 45, 60, 80), each named after the single screen it was measured from. Treat the six-value rhythm as the rule for new work and the one-offs as debt.

**Column widths.** The narrow column is the governing case. The extension opens as a **side panel**, not a popup — full viewport height, user-resizable width in roughly the 320–400px range — so one layout must serve a resizable narrow column, and vertical space is _not_ the constraint an extension popup would impose. Phone content maxes at 430px (`componentSizes.webContainerMaxWidth`) and centers above that. Gutters: 16px in the narrow column, 20px on phone, single column throughout, 12px row gap.

**Touch targets.** 44pt iOS / 48dp Android minimum, achieved with hit-slop rather than by inflating visual size: a 28px icon button keeps its 28px ring and gains 8px of invisible slop.

**Language expansion.** Every string ships in English and voseo-rioplatense Spanish, enforced at parity in CI. Layouts must absorb roughly 15–25% Spanish expansion without truncating a label or wrapping a control onto two lines.

## Elevation & Depth

Depth is not shadow. Depth is **material and edge**. A surface is not "higher" because it has a bigger blur radius; it is higher because it is made of something else.

### The five planes — P3's material is built; see §The thermocline

| Plane | Name                    | Content                                                                           | Material                                     |
| ----- | ----------------------- | --------------------------------------------------------------------------------- | -------------------------------------------- |
| P0    | Abyss (`depth.abyss`)   | Nothing — the void behind the app frame                                           | Opaque                                       |
| P1    | Column (`depth.column`) | App ground, the scales field                                                      | Opaque                                       |
| P2    | Shelf / Raised / Crest  | All lists, cards, inputs, content                                                 | **Opaque — the default**                     |
| P3    | Membrane                | Chrome that floats over scrolling content: tab bar, sticky header, sheets, toasts | **Translucent — the only translucent plane** |
| P4    | Caustic                 | Transient light: focus ring, press specular, the surfacing sweep                  | Additive, non-blocking, no pointer events    |

The colour values for P0–P2 and both membrane tiers are **shipped** in `semantic.ts`. The material system that consumes them — the blur, the scrim, the platform abstraction — is the `Thermocline` component; see §The thermocline.

### The thermocline — the membrane material's name

The material P3 is made of is named — and registered in code as — the **thermocline**. In real water a thermocline is the boundary layer between masses of different density: light crossing it refracts, so everything seen through it blurs, doubles and shimmers. Divers know the layer by exactly the look this system builds — the water below stays legible as *water*, but nothing seen through the boundary can be read precisely. Blur + tint over scrolling content is not a metaphor for that phenomenon; it is that phenomenon, rendered: the blur is the refraction across the density step, the tint is the extra column of water the light has to cross, and the scrim floor is the guarantee that what sits *on* the layer — the chrome — stays sharp while what lies *under* it softens. This justification belongs in the document rather than folded into a component comment: the repo is open source, and a name that has to be taken on faith is a name that will drift.

The naming is a material name, not a token rename: `surface.membraneThin`, `surface.membraneThick` and every `membrane*` name in `semantic.ts` stay as they are — three apps read them — and mean "the tint the thermocline is made of". The equivalence is one-to-one: `membraneThin` is the thermocline's thin tier, `membraneThick` its thick tier, and the `gradients.tabBarFade` ramp under the tab bar is the material's own bottom edge. The component is `Thermocline` on both platforms (`apps/mobile/src/components/Thermocline`, `packages/ui/src/components/Thermocline`), and the material carries its own texture — see §The membrane field. The rendering is **`tint`** — the translucent membrane ink alone, no blur: the owner compared `glass` / `opaque` / `tint` live in the tab bar and the Receive sheet through a debug switch and adopted tint; the switch files are deleted and the glass and blur code paths removed with them. Glass could return in another context someday, but it is not built. The scrim floor and the field are unconditional, and the OS reduce-transparency signal still collapses the material to the nearest opaque plane.

**The membrane field.** The thermocline's texture is one continuous field of dark scales: the 0.5× seigaiha drawn in `scales.membraneFieldStroke` (near-black at 0.45, ~1.06:1 on `surface.crest`), edge to edge on every rung, opaque included — texture, not transparency. The first cut layered a light-ink field under the 24px refraction strip; the two copies composited in the strip's band and the sweep rasterized as a luminance seam that broke the material on both platforms, so the strip is retired and its idea merged into the field. The sweep survives only in the caustic of The Surfacing. Rule: the membrane carries exactly one scales layer, one ink, no per-region opacity — any second copy or brighter edge reads as a band. The Scales Exclusion Rule still holds for content surfaces — the field belongs to the material.

**The thermocline is the sheet material.** Every sheet mounted through `BottomSheetContainer` grounds on the thick-tier thermocline by default — adopted by the owner comparing the switchable variants live, then hardwired with the same ritual as the tint and the blizzard (the debug switch died on adoption). The container's opaque fill is gone; the material carries the ground and clips to the sheet's top corners. A sheet that passes an explicit `background` (Receive's own Thermocline) still wins, and the legacy fish-scale texture overlay is removed — the material never stacks with the old texture. The gate (Settings, wallet switcher) grounds on the same thick tier, mounted the same way and clipped to its own radii: with an opaque fill it was the greyest surface in the app, no material and no living element, while every sheet around it wore the membrane. What stays gate-specific is its geometry and choreography — its own radii, its own shadow, its own rise and ebb — so it is still not a bottom sheet in structure, only in ground.

A rendering note the membrane's scales earned the hard way: on mobile the seigaiha pattern must be declared before the mask that consumes it, and the mask must set `maskUnits="userSpaceOnUse"` explicitly — iOS Fabric derives `maskContentUnits` from `maskUnits`, and the objectBoundingBox default rasterizes the pattern as a tiny fraction-space patch anchored at the band's origin. A structure-guard test in `ScalesBackground.test.tsx` holds both invariants.

### The scrim floor

**The gate takes a floor; a sheet does not.** The scrim floor is defined against a worst-case backdrop, and for chrome that hovers over content the live backdrop is that case. The gate is the exception: it covers nearly the whole screen and its job is to _replace_ the home, not veil it — grounded on the thick tier alone, the balance, the token rows and the tab bar read straight through the settings list. So the expanded gate paints `surface.crest` under the material: the thick tier's own nearest opaque plane, the same one the reduce-transparency rung collapses to, which is what keeps the two rungs on one ground. The material above it is unchanged — same tier, same ink, same field — it simply stops compositing over the home. The collapsed header bar takes no floor, since there the gate genuinely is chrome over content, and the lock keeps its own.

Blur without a scrim is a contrast lottery: the ratio depends on whatever pixel happens to be behind the text, and in a wallet that can be a white NFT thumbnail. So each tier is defined as tint + alpha + blur radius, with the alpha derived from a pure-white worst-case backdrop.

| Tier            | Value                    | Blur | Worst-case composite | Guarantees                                  |
| --------------- | ------------------------ | ---- | -------------------- | ------------------------------------------- |
| `membraneThin`  | `rgba(11, 15, 25, 0.62)` | 20px | `#686A70`            | `text.primary` at 4.77:1, and nothing else  |
| `membraneThick` | `rgba(11, 15, 25, 0.80)` | 32px | `#3C3F47`            | `text.primary` 9.29, `text.secondary` 4.88  |
| `bedrock`       | `neutral-975`, opaque    | none | `#0B0F19`            | Everything, including `text.accent` at 6.26 |

Rules that follow directly from the table: `membraneThin` may only carry `text.primary` at ≥15px and weight ≥500 — tab bar labels, a sticky header title, nothing secondary and nothing salmon. Secondary text and status colors require `membraneThick`. **Brand salmon ink never sits on a membrane** (`salmon-500` would need α 0.88, past the point where glass is still glass); on a membrane salmon appears either as a fill with `neutral-1000` ink, which is opaque and immune, or as `accent.inkOnMembrane` — the `salmon-300` step that clears AA on `membraneThick`'s worst case and exists for exactly this, the active tab label. See §Navigation for the measured pairs.

### The degradation ladder — built, then collapsed by the tint adoption

**Status:** rungs 1–3 (liquid glass and both blur rungs) were removed from the code when the owner adopted the `tint` rendering; rung 4's backdrop-filter went with them. What ships is the tint plus rung 5 (the opaque plane, still entered by the OS reduce-transparency signal). The ladder below is kept as documented history of what was built and why.

Verified against the packages installed in this repo: `expo-glass-effect` (`GlassView`, `GlassContainer`, `isLiquidGlassAvailable`), `expo-blur` (`intensity`, `tint`, `blurMethod`, `blurReductionFactor`), and `react-native-reanimated`.

1. **iOS 26+ with liquid glass available.** `GlassView` at `glassEffectStyle="regular"`, inside a `GlassContainer` with 12pt spacing so the tab bar's pills merge and separate like liquid — the one thing the OS gives that could not be built by hand. A scrim view is still painted inside the `GlassView`; `tintColor` blending is not a contractual fixed alpha and the scrim floor is not negotiable.
2. **iOS below 26.** `BlurView` at `systemThickMaterialDark`, intensity 60, plus the explicit scrim. Visually most of rung 1, minus the merge behaviour.
3. **Android 12+.** `BlurView` with `dimezisBlurViewSdk31Plus`, intensity 40, plus the same scrim. Blur on **at most one element per screen** — the sheet gets it, the tab bar does not. Press feedback is Android's own ripple. **Ratified as written**: Android stays faithful to its platform — this rung is the Android design, not a degraded iOS.
4. **Extension side panel.** `backdrop-filter: blur(20px) saturate(115%)` over the membrane tint, on **exactly two elements per document** — the sticky header and the tab bar, both `position: fixed`. Never on a scrolling container, never on a sheet, never on a list row. Gate with `@supports (backdrop-filter: blur(1px))`.
5. **No transparency.** In v1 this rung is entered by the **OS signal alone**: `AccessibilityInfo.isReduceTransparencyEnabled()` on native, `@media (prefers-reduced-transparency: reduce)` on the DOM. The in-app Appearance toggle this ladder used to name as "the real control" is **deferred to a later Settings pass**, not dropped — the argument for it (the media query could not be verified outside Chromium) still stands and is why the toggle stays on the roadmap. Membranes become the nearest opaque plane: thin → `surface.raised`, thick → `surface.crest`. Edges keep their inner highlight, and **the layout does not move by one pixel**. Android below 12 also lands here.

Rung 5 is a first-class look, not a fallback. It is what a large fraction of users and every low-end Android will see.

### Shadow Vocabulary — the bezel is built; the card ambient has its one consumer; the membrane ambient is rejected

- **Top inner highlight** (`inset 0 1px 0 rgba(226,236,255,0.14)`): the lit rim. Every membrane and every raised card gets it.
- **Bottom inner shade** (`inset 0 -1px 0 rgba(3,6,12,0.50)`): the underside.
- **The bezel** (**shipped**, `shadowsCSS.bezel`): both rims at once — what a filled control wears so it reads as a body with a top and an underside rather than a flat rectangle. It is deliberately 1px each way: a heavier inset reads as _pressed_, and a primary button that looks pressed at rest has spent the affordance it needs and leaves the real press with nothing left to say. The same literal string is used on both platforms — React Native 0.83 parses this CSS `box-shadow` with `inset` in `processBoxShadow` and clips it to the view's own radius, so the rim follows the corner the way the DOM's does. One measured caveat: Android draws inset shadows only from API 29, and below that the bezel is simply absent and nothing else changes.
- **Card ambient** (`0 8px 24px -8px rgba(3,6,12,0.45)`, `shadowsCSS.cardAmbient`): **shipped on its one consumer, the balance card**, and that is where it stays. The promise of rolling it out to every raised card is **withdrawn** — no other surface has demonstrated the need; if one does, the expansion gets re-specified.
- **Membrane ambient** (`0 24px 48px -12px rgba(3,6,12,0.55)`): **rejected as a promise**. It never gained a consumer, and a shadow no surface wears is spec debt, not a shadow. The value stays recorded here so a re-specification, if a real need appears, starts from the number that was chosen.
- **Press specular**: a 90ms 12%-opacity radial at the touch point, 120px radius, `screen` blend, in a cold `#9FE0EF`. The only place a cold light color touches a control, and it is transient.

Four elevation levels, each expressed as material: **E0** ground, no edge, no shadow · **E1** `surface.shelf` with the top highlight only · **E2** `surface.raised` plus bezel, highlight, bottom shade — the card ambient only on the balance card · **E3** membrane or `surface.crest` (the membrane ambient it used to name is rejected, above).

### Named Rules

**The Content Is Never Glass Rule.** Glass is reserved for surfaces whose whole job is to hover over something else. If a surface does not overlap scrolling content, it is opaque. This is what keeps the system from becoming a glass casserole.

**The Bedrock Rule.** The dApp approval sheet and every view that **exhibits** a seed phrase are `surface.bedrock`, α 1.00, no blur, no scales, no caustic, no iridescence. This is a security decision, not a taste one: a translucent approval sheet shows the requesting page _through_ the material it is asking you to trust, teaching the user that page content and wallet chrome share a visual plane — exactly the confusion a phishing overlay wants. The backdrop behind it is a hard scrim (`rgba(3,6,12,0.86)`), so the page underneath is dimmed out, not stylishly present.

_(Narrowed.)_ It used to read "every seed-phrase view", which put the recover screen on bedrock too. The rule now covers the seed's **exhibition only** — create's warning, display and validation steps — and not its **entry**: typing an existing phrase back in is not the same ceremonial moment as its birth, so recover stands in the same water as the rest of the onboarding stack (depth column, scales, marine snow). What does _not_ narrow is the capture protection — `useSecretScreen` and its DOM counterpart guard the entry field exactly as before; the rule that moved is about the ground, not about screenshots.

_(Widened, on the other axis.)_ The **private key's exhibition** joins the seed's (6e962eb8): a key is the whole account, so the panel that exhibits it stands on `surface.bedrock` at α 1.00, no motif — the translucent card both secrets panels used to sit on is gone. The key itself renders in Geist Mono at the larger mono size (`monoLg`) — the most position-critical string in the app had been set in a proportional face — and the exhibited seed words rise to the same size at medium weight per the Seed Phrase Rule, their indices in the label treatment. What the rule governs is still **exhibition**: the reveal, copy and confirm flows around a secret stand outside it, exactly as recover's entry does.

**The Scrim-Before-Glass Rule.** Never ship a membrane before its guaranteed alpha. A membrane without its scrim floor is a beautiful screenshot and a contrast bug, and in a wallet a contrast bug on an amount is a fund-loss vector.

## Shapes

**Radii.** The intended scale is seven steps: `r0` 0, `r1` 4 (chips, tags), `r2` 8 (icons), `r3` 12 (**every control**, list rows, small cards), `r4` 16 (cards), `r5` 22 (the inner core of a bezel), `r6` 28 (bezel outer, sheets), and `full` 9999 (avatars, toggles). **Shipped** (e036aac3): `radiusScale` in `spacing.ts` carries `r0`–`r6`, the legacy names survive only as soft-deprecated aliases pointing at the steps, and the one consolidation this section asked for landed — `card` 26 became `r6` 28, felt by the balance card, the sheets and the success card. The genuinely off-scale one-offs (2 scrollbar, 9 badge, 18/20/24 icon and header corners) are marked as such rather than force-fitted, because force-fitting them would change rendered corners nobody complained about.

**The Control Radius Rule (shipped).** Every interactive control is 12px: buttons, text inputs, action buttons, the pressable token card. One number, `borderRadius.lg`, with `componentSizes.buttonRadius`, `inputRadius`, `actionButtonRadius` and the legacy `borderRadius.button` all bound to it, so a call site cannot drift; `controlRadius.test.ts` fails if one does. **A control is not a pill.** The primary button was 28 on a 56px body — a full pill — and the field was 8, so a button and the input above it read as two different shapes doing one job. 12 is the token-list row, which is the shape the user already sees most, and a control now belongs to the same family as the row it sits under. A pill is reserved for what genuinely is one: `full` (avatars, toggles). The tab bar used to be exempted here as a genuine pill; that exemption is withdrawn — the tab bar is a control, and it takes the control radius. See §Navigation for the reversal.

**The concentric rule: inner radius = outer radius − padding.** 28 − 6 = 22 is the canonical pair, and it is what makes a double bezel look machined rather than approximate.

**Strokes.** 1px is the only stroke weight for a boundary. The sub-pixel widths in `borderWidth` (0.5, 0.75, 0.8) are legacy: they disappear on 1× Android and in a narrow column at 100% zoom. 2px exists only for the focus ring. No colored `border-left` accent thicker than 1px.

**The double bezel** — **rejected as a promise**; not to be confused with `shadowsCSS.bezel`, which is the 1px two-rim edge on a filled control and does ship. This one was a construction, not a shadow — on the balance card and the approval sheet: an outer shell filled `rgba(199, 211, 232, 0.06)` with a 1px hairline, 6px of padding, radius 28; the inner core its own surface at radius 22. It never gained a consumer and no need was demonstrated, so the open item is withdrawn; if a real need appears, it gets re-specified — and the concentric rule it demonstrated survives it, because that rule governs any nested radii, not this construction.

### The scales motif

**The drawing is mathematics, not handwork** (60350c97). The seigaiha paths used to be hand-exported artwork, and the owner's eye caught what that costs: uneven arc widths, off-centre apices, and a baseline that stair-stepped 0.95 units across the tile, so the cusps of one row missed the apexes of the row below by up to 1.23 units (~3.9px at deepField scale) and the tile's vertical seam never truly closed. The paths are now generated from four constants — arc width `w` 28.8, `rise` 12.6, control-point drop 16.8 (= 4/3·rise, which lands the cubic's apex at t = 0.5 exactly `rise` above the baseline), and a 0.1 phase inset so no cusp or apex lies exactly on a tile edge, where edge-tangent ink is what cell clipping turns into seams. The identity that matters — **every cusp of one row rests exactly on the apex of the arc below it** — now holds to 1e-13 residual, a guard test pins it at 1e-6 tolerance, and the formula is documented in `packages/shared/src/theme/scales.ts` so nobody draws these by hand again. The rendered change was imperceptible (+0.43% arc height); the point was that the geometry is now regenerable, and both platforms share the one data set.

The scales are the water column's texture and their **density is a depth cue** — they tell you how far down you are looking, exactly the way particulate density does in real water. Not wallpaper, not a chain indicator, not a brand stamp. The rework is **shipped**: the motif was hauled off the sheets, page shells, receive sheet and detail pages it used to tile edge to edge at `rgba(0, 0, 0, 0.5)` — black on black on a near-black canvas, invisible and decorative at once — and off the balance card, which had kept a band of it above the total, and reduced to the appearances below. No content surface carries it: the motif belongs to the water, and the water is the ground behind the content.

1. **The deep field** (**shipped**) — on the app ground, the full height of whatever it is mounted in. Pattern scale 3.2× (`patternHeight` 26 → 83), stroke `rgba(199, 211, 232, 0.06)`, 1px, thinning downward to `scales.deepFieldFloor` rather than to nothing. It is half of the `WaterColumn` pair; see §The water column.
2. **The caustic band** (**shipped**) — the transient one, and the only moving appearance: the shaft of light in The Surfacing, masked by this same geometry at 0.5× in `#9FE0EF`. Same drawing, seen moving rather than at rest.
3. **The membrane field** (**shipped**, as part of the `Thermocline` material, mounted by the component itself) — the same drawing at 0.5× in the material's own near-black ink, edge to edge across the membrane rather than banded. It replaced a **retired third appearance, the refraction strip**: a 24px band clipped to a membrane's top edge, pattern scale 0.5×, opacity 0.08, filled with a horizontal sweep from `#9FE0EF` through `salmon-300` to `success-300` — the direction's only iridescence, contained at composites of 1.24:1 and 1.18:1. It is gone because two scales copies composited in the strip's band and the sweep rasterized as a luminance seam; the sweep survives only in the caustic of The Surfacing. Its tokens (`refractionScale`, `refractionOpacity`, `refractionHeight`, `refractionSweep`) remain in `semantic.ts` with no consumer, and the `refraction` prop on both `Thermocline`s is deprecated and ignored — both are contract surfaces three apps read, so removing them needs a human's sign-off. See §The membrane field for the rule that replaced it.

**The fish appearance is retired.** The motif used to have a third resting appearance — the drawing at 1.0× pressed into the primary CTA's salmon fill — and it is gone, replaced by the flesh texture below. Two reasons, both material: a filled button is _mass_, not surface, so skin is the wrong tissue for it; and the seigaiha tile is taller than a 56px button, so it read as a stamp applied on top of the button rather than as the button's own material. The `fish` variant and its `fishStroke` / `fishScale` tokens survive as deprecated exports with no call sites, because `ScalesVariant` is a public export of `@salmon/ui` with three apps behind it and removing it is a contract change that needs a human's sign-off.

**Chain tinting is removed.** Chain identity moves to the token/network chip, where it is an opaque badge with a label — a channel that survives colorblind users, a narrow column, and a screenshot. A 6%-opacity pattern cannot be a data channel.

Rationale, stated honestly: the knowledge base never mentions fish scales, so this reading is assigned here rather than recovered. It is chosen because it gives the asset a _job_ (depth encoding) instead of a decoration, and because a motif with two or three sanctioned appearances at known scales becomes recognizable where the same motif at 5% everywhere is either invisible or noise the eye must filter out.

### The flesh texture

**Shipped.** The myoseptal texture of salmon flesh, as path data, generated in TypeScript at import time inside `packages/shared/src/theme/flesh.ts` (the original `scripts/flesh.py` generator and its `lean` drawing were retired when `marbled` won the comparison), inked from `semantic.flesh`, and drawn by a `FleshBackground` on each platform — the same one-geometry-two-renderers ownership the scales and the snow use.

**Why flesh and not scales.** Scales are skin: the outside of the animal, and the right texture for a ground or a plane. A filled button is mass — it is the _inside_ of the thing — so the honest material for it is what you see when the fish is cut open: the myosepta, pale sheets of collagen and lipid separating the muscle blocks. This is the whole of the material rule in one object.

**Why `marbled`, and how it was chosen** (71c6973c → 35a0c6d1 → 5f981cea). The first drawing (`lean`) read on the CTA as wavy wallpaper — thin uniform squiggles, three times too many, each wandering alone — and against photographs of the real thing the misses were structural, not tonal: real myosepta are **few**, wide apart, each band swells in the middle and thins at the tips, and neighbouring bands sweep together. Two generated candidates were built behind a live debug switch — `marbled` (three wide myosepta sweeping a shared arc, swelling mid-line and tapering out, soft-edged by a halo pass) and `chevron` (nested V bands, the graphic reading) — and the owner compared them on device: the chevron lost first, then `marbled` retired the old drawing. The comparison switches and the `lean` generator are deleted; `flesh.ts` is the single flesh module.

What the drawing commits to, because each of these is easy to undo by accident:

- **Veins are few, filled and tapered — never uniform strokes.** Three bands per 150×88 tile, each a polygon outlined around a centreline with a varying half-width (2 → 7 units, swelling mid-line), sweeping a shared arc. Uniform strokes are what made the old drawing read as wallpaper.
- **The soft edge is a halo pass, not a filter.** A 1.9×-wider, fainter copy of the same polygon sits under the crisp one (core/halo ink 0.16/0.05) — no SVG blur, because `react-native-svg` stubs the filter primitives and a per-frame blur is a cost a button background must not pay.
- **Veins are pale, never dark.** The pale stripe is collagen plus the fat that concentrates in the myocommata; dark slits mean _gaping_, which is a defect, not healthy flesh. This is also what makes the texture free of contrast risk: every vein is drawn in `semantic.flesh.band` (`salmon-50`), lighter than the fill, so it can only raise the luminance under a label — worst-case ink contrast on a salmon fill stays exactly the flat fill's 6.50:1, and `flesh.test.ts` asserts the 0.2 opacity ceiling that guarantee rides on.
- **It tiles by construction.** Every centreline and width profile is periodic over the tile in both axes — position, slope _and_ width agree across the crossing — and wrap copies are baked into the data wherever ink reaches past a vertical edge, because `react-native-svg`'s `Pattern` has no overflow.

That seam property replaced an earlier test as well as an earlier texture. The old test demanded that every band's opacity envelope reach zero at the tile edge, which sounds like the safe assertion and is the opposite: pinning every envelope to zero at the same boundary switches all the bands off at once, and an untextured column down the seam does not hide the repeat, it advertises it. What makes a tile seamless is continuity across the crossing, and the marbled drawing carries it in the geometry itself.

**Scale.** `componentSizes.buttonFleshScale` is **1**: the bands render at the size they were authored. 0.55 was tried and rejected — at that scale the anatomy stops reading as anatomy and becomes grain, which is a different and more generic material. Contrast is unaffected either way, by the pale-band guarantee above, so this was a purely visual call and it went to full size.

### The material rule

**The Material Rule.** Flesh is the interior of the fish and lives **inside a salmon fill**. Scales and marine snow are the skin and the water, and they belong to the **plane behind everything**. The thermocline carries its own scales, drawn in the material's near-black ink rather than the water's light one, because a membrane is a material and a material has a texture. A content surface — a card, a list row, a page shell, anything a sheet *holds* — carries **no motif at all**.

The third clause is the one that gets broken. A textured card looks richer in isolation and costs the system its depth order: the motif exists to say _this is far away_, and putting it on a surface the user is meant to read as _near and lit_ says the opposite in the same breath. Content earns its presence by being opaque and covering the water, not by joining it. This is also what makes The Scales Exclusion Rule enforceable by construction rather than by cropping — see §The water column.

### The water column — marine snow and the depth ramp

**Shipped**: `semantic.water` carries the ground's depth ramp and the marine snow's ink; `packages/shared/src/theme/depthField.ts` carries the field's geometry; `DepthBackground` draws it on the DOM and again in React Native, the same one-geometry-two-renderers ownership the flesh texture uses. It sits in the same plane as the deep field (`depth.column`), behind everything.

**Where it is mounted.** The ramp-plus-snow layer and the deep field are one object, not two decisions, so on the DOM they are packaged as `WaterColumn` (with a `waterColumnHost` style a container applies so the negative layer stays above the host's own background). Both layers are CSS backgrounds — one serialised data URI each, composited once — so mounting the ground on another screen costs pixels in a layer that screen already has, not a compositor layer per screen. It is mounted app-wide — home, onboarding and auth, lock, and every stacked page in all three apps. The rule it was extended under is §Overview's: the motif belongs to the application's ground, and the only screens it must never reach are seed-phrase views, the dApp approval screen, and the inside of a membrane.

**Why it exists.** The deep field is drawn at 3.2× so it reads as a fish close enough to fill the frame. On its own it does not: a large arc with empty ground in front of it is exactly as readable as a small arc nearby. Scale is not a property of an object, it is a property of the space in front of it, and this world had no space in front of anything. Marine snow is that space.

**What it is, physically.** Composite organic aggregates — conventionally everything above 0.5 mm, ranging to a few centimetres — porous, off-white, held together by zooplankton mucus, sinking at roughly 10–100 m/day. It is what the pelagic column at forty metres is actually full of, which is why it is the one addition that does not argue with the north star. (Alldredge & Silver 1988 via NOAA Ocean Exploration; Giering et al., _Front. Mar. Sci._ 2020.)

**What it does perceptually**, and the three properties the data encodes:

1. **Aerial perspective** — scattering lays a veiling luminance over anything distant, so contrast and internal detail fall off with distance; underwater the falloff is measured in metres rather than kilometres. Encoded as an exponential falloff of opacity with depth — near flocs brighter, far flocs dimmer.
2. **Texture gradient** — elements of assumed-uniform size project smaller and _denser_ the farther they are (Gibson 1955). Encoded twice over: the flocs themselves shrink with depth, and the small ones are pushed deeper into the field while the large ones are held high. This is the honest name for "denser toward the bottom": it is density with _distance_, not a bathymetric profile. Real marine-snow concentration peaks in the upper 100–200 m and thins below it; the document should not pretend otherwise.
3. **Interposition** — a floc that overlaps the scales is unambiguously nearer, which fixes depth order; order plus the contrast gradient is what turns "far" into a distance, and distance plus retinal angle is what finally reads as a _size_. Held et al., "Using Blur to Affect Perceived Distance and Size" (ACM TOG 29(2), 2010) runs the same argument backwards: flatten the gradient and a real city reads as a model.

**Size and opacity are one decision.** The field originally authored the two independently, and they disagreed: opacity tracked depth strongly (r = −0.69 against the floc's height down the tile) while size barely tracked it at all (r = −0.27). That fills the field with mixed signals — a _large_ floc that is _faint_ is neither near nor far, it is a smudge — and a mixed signal is what flattens a depth ramp. It also let the biggest flocs reach a 4.48-unit radius, which reads as an object rather than as suspended matter, because nothing about them said "close".

Every floc now carries one hidden parameter instead: `z`, its optical distance, spanning `[1, 3]`. Both cues are functions of that single `z`, so they cannot decorrelate again — size by the projective law (`rx = 2.55 / z`, the exact statement of the texture gradient above) and opacity by Beer–Lambert veiling (`exp(−μ(z − 1))`, the exact statement of the aerial perspective above). A near floc is therefore larger _and_ stronger and a far floc smaller _and_ fainter, always: `corr(rx, opacity)` is 1.00, where it was 0.78. That covariance is the whole point — the eye reads "distant" from several cues agreeing far more readily than from any one of them shouting, which is why the answer to "make the depth read better" was not "make the far ones fainter". `z` itself is 70% of the floc's rank by size and 30% of its height down the tile, so the vertical gradient now lives in the _size_ data as well as the brightness; `corr(cy, rx)` roughly doubled, to −0.56.

**The blizzard — the field grows a foreground** (29e34a20, adopted 8bd4df42). The numbers above describe the **base field**, which still ships as the layer underneath; on its own it read, in the owner's diagnosis against photographs of real marine snow, as a **dirty screen** — every particle a hard, similar-sized dot, uniformly sprinkled, with nothing in the near field. The one-distance law is correct and is **kept** (pinned by tests down to a pairwise bigger-is-never-fainter sweep); what was wrong is the _range_ — the whole distribution was compressed into the far field. Three additions fix that, each behind a documented constant in `packages/shared/src/theme/depthFieldBlizzard.ts`:

1. **Heroes.** Three near flocs per tile (≈ one screen), at optical distance `z` 0.35–0.6 — an order nearer than the old near plane, a readable core of roughly 6–10dp on a phone column. They are **soft** — a radial opacity gradient with the peak held only to 25% of the radius, plus per-hero squash and rotation — because an 8dp hard circle reads as a defect, not a particle. A fall-streak elongation exists as a constant and **ships at 0**: on some panels a stretched blob reads as a scratch; the knob stays so the next attempt starts from a dial, not a rewrite.
2. **A mid-field lift.** Seventy extra flocs at `z` 1.05–2.2 — the gap the old field left between the heroes and the far plane — still on the exact one-distance law. ~1.33× the particle budget in total, far under the cap.
3. **Clustering.** The added flocs pool into six Gaussian patches (σ 70 tile units, 80% of the added flocs assigned) instead of a statistical sprinkle — real snow arrives in patches, and uniform is precisely what the eye reads as noise. The baked base field is left untouched (its tests pin it), so the patchiness lives entirely in where the _new_ density lands.

The brightness cap holds — every opacity, heroes included, is a multiplier ≤ 1 on `water.snow`, and a hero's radial fade only ever goes _below_ its peak — and the whole field is still generated once from a fixed seed, so the DOM serialises it into the same drifting data URI with no extra layer. The adoption followed the same protocol as the flesh and the thermocline: a live debug switch on both runtimes, the owner compared, the blizzard won, and the switch died with the decision.

The field is **continuous, not layered**. Three discrete plates would be easier to reason about, and this document used to describe them. They are wrong here: 218 particles sorted into three sizes read as a sprite sheet rather than as water, because the eye finds the three classes and the volume collapses into three stickers. The one thing discrete plates genuinely buy — a different parallax rate per plate — is unavailable anyway, since both renderers move the whole field on a single transform.

**How small, and the two floors.** The flocs shrank: radius range 0.87–4.48 units became 0.85–2.55, mean 1.88 → 1.40, median 1.62 → 1.27. Almost all of that lands on the near end (−43% on the largest) because the far end was already on its floor, and there are two floors rather than one. The _rasteriser's_: 0.85 units is a 0.8px radius on the narrowest column this ships in, a ~400px extension side panel at dpr 1, which is the smallest ellipse that still draws as a dot rather than a smudge of antialiasing. The _panel's_, which binds harder: a multiplier of 0.10 on `water.snow` composites to 2 levels in 255 against the ramp's lightest stop, and below that a floc stops being the far end of a ramp and becomes indistinguishable from the ground's own dither. A depth ramp whose far end renders as nothing is not depth, it is absence. Since size could not carry more of the gradient, brightness took it: the multiplier range widened from 0.10–0.88 to 0.10–1.00, so the nearest flocs now reach the token itself.

**No blur cue, deliberately.** Softness is the third classical depth cue (Held et al., above) and `FeGaussianBlur` is the one filter primitive `react-native-svg` actually implements. It is still not used. At these sizes a Gaussian spreads the same ink over more pixels — it _lowers_ the peak alpha of particles that are already within two 8-bit levels of the ground, and the far end is floor-bound exactly there. The far flocs get their softness free anyway: under a pixel of radius, the rasteriser's own antialiasing is the blur.

**The ramp.** A vertical gradient on the ground, `neutral-950` at the top to `neutral-1000` at the bottom. It suggests an abyss without drawing a floor. Its top stop is the ground the three apps already paint (`colors.background.primary`), not the `depth.column` this document names, so nothing beside or above the ground — a safe-area overlay, a page header, a sheet backdrop — seams against it; moving the ground itself is a separate change. Because the ramp only ever darkens, it can only raise text contrast, and `contrast.test.ts` asserts every text role at both stops.

**Contrast.** The ceiling did not move to buy any of the above, and it must not: the brightest floc measures 1.293:1 against the ramp's lightest stop and 1.238:1 against its darkest, both under the 1.4:1 cap. The snow is `rgba(199, 211, 232, 0.12)` and composites to 1.27:1 on the lightest ground it can land on — under the 1.4:1 ceiling for any non-informational stroke, and in the same register as the deep field's 0.06 stroke. Every floc's authored opacity is a multiplier ≤ 1 on that one token, so pinning the token pins the whole field; `depthField.test.ts` asserts the multipliers and `contrast.test.ts` asserts the token.

**Exclusion, and why the field is full-height.** The field first shipped as a 360px band that faded out before the first data row, which enforced The Scales Exclusion Rule by shape. That was the wrong mechanism, and it produced the wrong picture: the motif lived exactly where the balance card covers it and vanished in the empty lower half of every screen — an animal that fills the frame, cut off at the chest.

The band existed for a real reason. The token rows were `rgba(56, 63, 82, 0.10)`, so a full-height field would have been legible _through_ a balance. But that translucency was itself off-system: this document says content is opaque by default and translucency is a privilege of floating chrome, and plane P2 — "all lists, cards, inputs, content" — is marked "Opaque — the default". A list row is content, not chrome. So the rows became opaque (`colors.background.tokenItem` is `surface.raised`) and the field became the height of the column.

The rule is unchanged and now enforced the way it was written to be: snow and scales never appear _readably_ behind a number, a row, an address, an input, a seed phrase, or an approval surface, because the content on those surfaces covers them. Depth is carried by the brightness ramp baked into every floc and by the size/density gradient down the field, not by a crop — `depthField.test.ts` asserts coverage to the bottom of the field, no empty band on the way, and that the top half is brighter than the bottom; `contrast.test.ts` asserts that the row fill is opaque and distinct from every stop of the ground ramp. The ramp itself is exempt from the rule because it is a background _colour_, not a motif — a ground that darkens behind an amount is still a ground.

`surface.raised` rather than `surface.shelf` for the rows, because the ground is a ramp and `shelf` _is_ the ramp's top stop: a row painted in it would disappear into the ground at the top of the column.

**The deep field follows.** The scales' `deepField` variant no longer occupies a 180px band either. It fills whatever it is mounted in and thins downward to `scales.deepFieldFloor` (0.35 of its stroke) rather than to nothing — a motif that reaches zero has an end, and an end partway down the column is what read as a crop. On the DOM the seigaiha tile is now serialised into a repeating `background-image` data URI instead of a live `<svg><pattern>`, because the degradation ladder below forbids the extension a full-viewport SVG the browser can be asked to repaint; that also retires the `<pattern id>` collision two live instances in one document used to risk. Opaque rows additionally drop one `backdrop-filter` per row, which rung 4 of the same ladder bans outright.

**No filters.** `react-native-svg` implements `FeTurbulence` and `FeDisplacementMap` as no-ops, so every irregularity — position, size, squash, brightness — is authored into literals generated once from a seeded source and never randomised at render time. That constancy is also what lets the DOM serialise the field into a `background-image` data URI, which is how the extension gets an image composited once instead of a full-viewport SVG the browser can be asked to repaint.

**The snow moves.** Marine snow is snow because it falls out of the lit water, so the field sinks — downward, never upward — at `depthDrift.pxPerSecond` (3 px/s), and a scroll adds `depthDrift.parallaxFactor` (0.2) of its own displacement on top. The two are summed, never switched: the hand speeds the water up for as long as it is on the glass, and the water keeps sinking when it is not. The argument that kept the field static was that real marine snow sinks at about 0.6 mm/s and therefore does not visibly fall, which is true of a single floc and beside the point for a field — what a drifting field buys is not the appearance of falling but the proof that the ground is a _volume_ rather than an image, and parallax against scroll is the strongest depth cue available to a flat screen. The one-light-event argument does not apply either: drift is not light, and it carries no meaning The Surfacing would have to share.

**Why 3 px/s.** The speed cannot be taken from the ocean, because the real one is invisible; it is chosen against the eye instead. At a phone's viewing distance 3 px/s is about 0.09°/s — a few multiples above the ~1–2 arcmin/s floor of fixated velocity discrimination, and roughly 1/60 of the speed at which smooth motion starts capturing attention on its own. Rest on one floc and it is unmistakably moving; glance at the screen for half a second and it has travelled 1.5 px. That asymmetry is the whole brief: a particle field the eye catches unprompted stops being water and becomes a game's weather. The speed is in screen pixels rather than tile units, so the tile's width-driven scale does not turn one decision into six different speeds across a side panel, a phone, and a desktop window; the cycle length is derived from it, not authored.

**Why the loop cannot jump.** One tile of travel is the only displacement at which the field lands back on a copy of itself, so that is the loop, and the wrap shows the pixels it left. This is what changed about the field's tiling: it now repeats _vertically_, at a period of one full column height, so at most one seam is ever in frame. It still does not repeat horizontally, which is the axis on which a particle field reads as wallpaper — the eye finds a seam by comparing two points at the same height.

The honest cost is that the aerial-perspective ramp travels with the field: half a cycle in, the brighter near band sits low in the frame rather than high. At 3 px/s that is over two minutes of continuous looking, and the change is monotonic and unmarked, so none of it is perceptible as an event. The alternatives were worse — a screen-locked mask over the field would have double-dimmed the bottom of every frame, and a shorter loop would have had to jump.

**Cost.** The constraints that produced the static answer stand as constraints on the implementation, and they are met. The drift is a transform on a layer that was already composited — the cheap half of the degradation ladder — and never a repaint of the field, which is the half rung 4 forbids the extension outright. On the DOM the field is one `background-image` with `repeat-y` moved by a Web Animations API animation of `transform`, with the scroll offset on the separate `translate` property, so the loop lives in the compositor and JS runs only when a scroll event arrives. On React Native the repeats are `<Use>` references to a single `<Defs>` group, so the field costs the same ~220 nodes it did when it was static however many copies a screen needs, and both offsets are read on the UI thread by Reanimated — React never re-renders for either.

**Reduced motion and battery.** `prefers-reduced-motion: reduce` and `useReducedMotion()` each stop the drift _and_ the parallax, and what is left is exactly the field as it first shipped: still water — a parallel mapping, not a hole. Nothing runs unseen either: the DOM pauses the animation on `visibilitychange`, and mobile freezes it when `AppState` leaves the foreground and resumes it from where it stopped.

**What is deliberately absent.** No sand and no seabed: sand is warm and light, which would add a second source of warmth against the single salmon fill and would invert the depth order by making the farthest plane the brightest — and the north star is the middle water, "not the surface, not the seabed". No ambient light shafts or resting caustics: light is an _event_, never a state. There are exactly two events — The Surfacing and the wave's ring on the wait screen (§The wait) — and neither of them rests. Both absences are decisions recorded here so no future reader files them as gaps.

### Named Rules

**The Scales Exclusion Rule.** Scales — and the marine snow, which is the same kind of object — never appear behind a numeric value, inside a list row, on a swap review card, anywhere on the approval sheet, behind a seed phrase, on any surface where a live backdrop shows through, or in a scrolling container in the extension.

The rule is about _readability_, not about leaving ground blank. Both fields run the full height of the ground; what keeps them off a number is that the surface carrying the number is opaque and covers them. A crop is not an acceptable substitute, and neither is a translucent row: a row that lets the column through is the violation, and cropping the column to compensate is the band-aid this document used to prescribe.

In the extension the deep field is composited once as an image — a serialised data URI for both the snow and the seigaiha tile — never a full-viewport SVG the browser can be asked to repaint.

**The Concentric Rule.** Inner radius = outer radius − padding, always. A rounded rectangle inside another rounded rectangle with the same radius is a bug.

## Components

### Buttons

Character: confident, wide, and quiet — a control is a surface you press, not a thing that glows.

- **Primary** (**shipped**): salmon fill (`salmon-500`), `neutral-1000` label at 6.50:1, weight 600, no text-transform, **12px radius** — the control radius, the same shape as a token list row and a text input; see §The Control Radius Rule — 56px tall, full-width when it is a screen's committing action. Hover darkens the fill to `salmon-600`. Elevation is disabled — MUI's shadow does not belong in this system. **Disabled is `surface.crest` with `text.disabled` at 0.45 opacity: the salmon never dims. It is either alive or absent.**
- **Outlined** (**shipped**): transparent fill, `border.raised` stroke, `text.primary` label. Hover raises the border to `border.strong` and adds the `state.hover` overlay.
- **Text** (**shipped**): `text.accent` label, `accent.tint` background on hover. Salmon on the 12% tint composite measures 5.29:1.
- **The primary fill's material** (**shipped**): the flesh texture, at `buttonFleshScale` 1, plus `shadowsCSS.bezel` for the edge. Not the scales — see §The flesh texture for why a filled control shows the inside of the fish.
- **A flesh button speaks in bold** (**shipped**, 4d08e41b): any button wearing the flesh carries **bold text and a bold icon** — the label must not be quieter than the material under it. Nine flesh call sites across both platforms were aligned (several had drifted to medium or semibold); non-flesh buttons keep the system's regular button weight, and the exception is recorded in both icon modules (`weight="bold"` on a flesh CTA only).
- **Press specular** (**shipped on both platforms**): `PressSpecular` with `usePressMotion` on mobile; the DOM version landed with the Surfacing port (dc875e30) — the same `water.light` radial at the touch point, screen-blended, `flick`-fast, absent when disabled.
- **Press-and-hold on Approve** (**shipped**): see §The approval screen below.

### Cards / Containers

- **Corner style**: 26px on the balance card (`rounded.card`), 12–16px on list rows and content cards. 28px in the intended scale.
- **Background**: `surface.shelf` by default; `surface.raised` for a card above a card; `surface.crest` for menus, dialogs, tooltips and opaque sheets — all **shipped** through the MUI theme, with `backgroundImage: 'none'` set explicitly because MUI's dark mode fakes elevation with a white overlay gradient that fights the depth ramp.
- **Border**: 1px `border.raised` on anything above `surface.shelf`.
- **Shadow strategy**: see §Elevation & Depth. The card ambient ships on its one consumer, the balance card; everywhere else the separation is carried by surface color alone, and the membrane ambient is rejected — see §Shadow Vocabulary.
- **Internal padding**: 20px on content cards, 16px in the narrow column.
- **The balance card does not remount when the chain changes** (**shipped**). Switching chains crossfades only what is _printed_ on the card — logo, network badge, balance, variation — over `swell` (180ms), spent as `flick` out and `flick` in with the swap at the midpoint where nothing is visible. The container, its background and the pagination dots never take part. This is the depth model applied to motion: the card is a plane, a plane does not blink out of existence because its contents changed, and a whole card that disappears and returns reads as a navigation event rather than a value update. Under reduce-motion the swap steps rather than leaving a 90ms gap of nothing.

### Inputs / Fields

**Shipped.** `surface.shelf` fill, **12px radius** — the control radius, via `componentSizes.inputRadius` on `MuiOutlinedInput`; it was 8, which made a field a different shape from the button under it — `text.primary` value, `text.tertiary` placeholder at full opacity (6.24:1 — it replaced a 3.66:1 placeholder that failed AA). The notched outline is `border.default` at 1px, rising to `border.raised` on hover and to a 2px `accent.ink` outline on focus. Error swaps the outline to `status.danger`. Disabled drops to 0.45 opacity. The floating label is `text.secondary`, turning `text.accent` when focused.

### Focus ring — a signature component

**Shipped**, and the most load-bearing detail in `packages/ui/src/theme`. Two concentric bands drawn _inside_ the control's border box: a 2px `state.focusVisible` (`salmon-300`) outline at `outlineOffset: -2px`, over a 4px `inset` box-shadow in `depth.abyss`.

Inset, not outset, for two reasons discovered in implementation: almost every focusable surface in this app sits inside a clipping ancestor (a blur container, a scroll container, a sheet, an action row), so anything painted outside the border box was cut off; and an inset outline inherits the control's own border-radius, so the ring is the control's own shape: at the 12px control radius the two bands land at 10 and 6, still two legible concentric bands.

Two bands because one is not enough anywhere. `salmon-300` measures 9.29:1 on `surface.shelf` but only 1.53:1 on a salmon fill; `depth.abyss` measures 6.50:1 on that same fill. Whichever surface the ring lands on, one band clears the 3:1 that WCAG 2.2 1.4.11 asks of a focus indicator.

The selectors are doubled (`:focus-visible:focus-visible`, `.Mui-focusVisible.Mui-focusVisible`) to buy specificity over MUI's own `outline: 0`, which ships at lower specificity and is injected after `CssBaseline`. The inner `<input>` of a field and the hidden `<input>` inside a Switch/Checkbox/Radio opt out via `focusRingNone`; the element that owns the field's visual boundary takes the ring instead, through `.MuiInputBase-root:has(:focus-visible)`.

**It is never replaced by a bare `outline: none`.** Without it a keyboard user cannot tell which control is focused, which on a transaction-approval screen is a fund-safety problem rather than a cosmetic one.

### The approval screen

**Shipped.** The screen now shows what a transaction would _do_ before it asks for a signature: a `TransactionEffectsCard` with the balance deltas and, when one is present, the spending permission being granted — named, with the spender address in mono, and with "unlimited" said out loud when that is what it is. The screen keeps every rule it already had — `surface.bedrock`, opaque, no motif, hard scrim (see The Bedrock Rule) — and this is the same reasoning applied one layer up: a screen the user is asked to trust must not withhold the consequence it is asking about.

**Press-and-hold to approve.** When the preview finds a spending permission, a transaction the network would reject, or nothing it can determine, Approve becomes a 500ms hold rather than a tap. Those three are exactly the cases a reflex tap should not be able to sign; a plain send the preview understood keeps the ordinary button, because friction everywhere is friction nowhere.

Two details are load-bearing:

- **The keyboard confirms immediately.** Enter and Space commit on the first press, hold or no hold. WCAG asks that nothing be gated behind holding a key down, and a keyboard user cannot be made to pay the pointer's friction. The pointer path is unchanged: a click that never became a hold does nothing.
- **The hold's progress line is `neutral-1000`, not salmon.** This is a **declared deviation** from the design note, which specified a 1px salmon line. The line is drawn over the button's own `salmon-500` fill, where salmon on salmon is invisible; `neutral-1000` is the ink that fill already takes at 6.50:1. The note was written before the fill it had to sit on was decided.

### Navigation

The tab bar is `membraneThin` at **12px radius** — the control radius — floating clear of the bottom edge on phone and attached to the bottom edge in the extension side panel. _(Reversal: it was specified at 28, which treated the tab bar as material — a floating pill of membrane. The tab bar is a **control**, not material, so "a control is not a pill" wins here the way it won for the button and the input — see §The Control Radius Rule, whose pill exemption for the tab bar is withdrawn.)_ The active item is a filled icon in `salmon-500` with a salmon label beneath it — and it is the screen's one living element, which is why the home screen's action buttons are neutral. **Built as a material**: the tab bar is the thermocline's first consumer — the `tint` rendering and the membrane field (see §The thermocline and §The membrane field); its sizing tokens live in `componentSizes`, its radius on `componentSizes.tabBarRadius` → the control radius, watched by the anti-pill test.

**The tab bar's contrast debt is retired** (8f1c6ae7). Labels sit on the scale at `caption` (12px, 600) — the 11px one-off is gone. Inks are measured against `membraneThick`'s worst-case composite (`#3C3F47`): the active label wears `accent.inkOnMembrane` (`salmon-300`, 5.27:1) and inactive labels `text.secondary` (4.88:1), both clearing AA text; icons are graphics under 1.4.11 and keep `accent.ink` (3.44:1) and `text.tertiary` (3.54:1) against the 3:1 floor. This amends "salmon ink never sits on a membrane": brand `salmon-500` still never carries text on one — `inkOnMembrane` is the step that exists so the active label can stay salmon without spending the guarantee. All four pairs are asserted in `contrast.test.ts`.

### Sheets — one container, one idiom

**Shipped.** Every sheet in the app mounts through one container — `BottomSheetContainer` on mobile — and inherits the same four things from it: the drag handle, the backdrop, `rise`/`ebb` motion with its reduce-motion mapping, and the platform's own back gesture. A sheet that hand-rolls a full-screen modal gets none of that and drifts by default, which is exactly what happened to the swap's token selector: it was the last surface of its kind, an opaque hand-rolled `Modal`, and it looked pre-redesign for precisely that reason until it became the ninth sheet (665cc49b).

The idiom the container carries with it, so that a new sheet is a composition rather than a design: **rows are `BlurContainer` rows**, search is the Phosphor glyph the rest of the app uses, the loading state is the `ContentLoader` pulse rather than a spinner, and every balance in a row is tabular per the Tabular Rule. **A sheet has no Close button.** Dismissal is the container's three paths — the handle, the backdrop, the back gesture — and a full-width Close at the bottom of a sheet both competes with the screen's one committing action and claims a fourth path that is really the same one. It also spends the safe-area band that a sheet's real content needs.

The ground under all of this is the material, not a fill: see §The thermocline is the sheet material. The gate — Settings and the wallet switcher — is deliberately *not* a bottom sheet; it is `GateContainer`, a different surface with its own geometry and choreography. The ground idiom does govern it: the gate carries the same thick-tier material, mounted the same way. The rest of the sheet idiom does not.

### Chain identity — a mark, not a colour

**Shipped.** Chain identity is carried by an opaque mark or a labelled chip, never by tinting a surface or a motif — a 6%-opacity pattern cannot be a data channel, and colour alone would fail The Three-Channel State Rule. The vocabulary in a token list is quiet by construction (faeddcea):

- **On mainnet, Solana tokens carry nothing.** Solana is the water here — the default the whole product is built around — and a badge on every row that says "you are where you always are" is noise the eye has to filter on every scan.
- **Bitcoin carries its own mark**, at 14px in `text.tertiary`: present, legible, and never louder than the value the row is about. The mark is the brand's own, not a Phosphor redraw — see §Iconography's declared exception.
- **Any non-mainnet environment keeps a text chip.** A devnet or testnet token must never be mistaken for the real thing, so that is the one case where the row shouts. This is a fund-safety rule wearing a typographic disguise.
- **The accessibility label always speaks the full network**, whatever the row draws. The visual channel is allowed to be quiet; the announced one is not.

The screaming `SOLANA-MAINNET` pills these replaced were the opposite trade: maximum ink for the case that never matters, and the same ink for the case that does.

A related correctness rule the sheets learned the hard way (43a42870, 95cd7979): **every surface reads the chain from one source.** Sheets derive their chain from the canonical `networkId`, never from a carousel index, and a chain-specific affordance — an explorer link above all — either follows that `networkId` or renders nothing. A wrong explorer is worse than no explorer.

### Iconography

**Shipped on the DOM**: the consolidation onto **Phosphor Icons** (`@phosphor-icons/react`, MIT) is done. Every DOM component now pulls its glyphs from one module, `packages/ui/src/icons.ts`, rather than from a vendor directly — one icon name, one import, so the set stays small, auditable and swappable. Weight `regular` (Phosphor's default, so it is never passed); `fill` only for the active tab item and the success checkmark; `duotone` never. Size ramp 16 / 20 / 24 / 28 (`iconSize.sm`…`xl`) and nothing smaller, because a thinner box loses the stroke. Icons take a text token, never their own color: decorative at `text.tertiary`, actionable at `text.primary`, destructive at `danger-500`. An icon on a membrane is `text.primary` plus a 1px offset shadow so a thin stroke does not vanish when a bright logo scrolls beneath.

Imports are deep paths rather than the package root: the root module pulls all ~1,500 icons through the bundler, which costs dev transpile time and, under a misconfigured build, bundle size the extension cannot spend.

**Declared exceptions, not oversights.** `components/DAppApproval` and `components/PendingActivityBanner` still import `@mui/icons-material`; they were owned by concurrent work and left alone deliberately, which is why the dependency stays in `packages/ui`'s manifest after being dropped from `apps/web` and `apps/extension`. The chain marks — Solana, Bitcoin, Ethereum — are also not Phosphor and never will be: no general icon set carries them, and a brand mark redrawn to match a UI set stops being the brand mark. On mobile the **gate header keeps its bespoke marks** — the Wallet, Copy and Settings glyphs drawn as the app's own SVGs in `GateContainer/HeaderContent` — a deliberate exception to the migration, recorded here so no future consolidation pass "fixes" them into Phosphor.

**Shipped on mobile too** (adb3dcef). `phosphor-react-native` (MIT) passed the gate it had to pass: pure JS over the `react-native-svg` already shipped, zero new native modules, so dev builds and OTA updates keep working untouched. `apps/mobile/src/icons.ts` mirrors the ui package's icon module export-for-export, deep-imported so Metro never swallows the full set, and every Ionicons use in the app migrated to it — sixty-odd glyphs, sizes and colors riding the existing tokens. Where the DOM had already chosen a glyph for a meaning, mobile takes the same one; the one deliberate divergence mobile already had in transaction types is kept and recorded at the call site. No Ionicons remain (`@expo/vector-icons` stays only as Expo's transitive dependency).

### Motion

**Shipped**: the vocabulary below, in `packages/shared/src/theme/durations.ts`, and applied throughout `apps/mobile` — there are **no loose durations left in the mobile app**; every animation reads a token. The legacy 100/150/200/250/300/400ms set and `easing.bounce` at 1.56 are retired. The MUI baseline still carries its `prefers-reduced-motion` block, which collapses animation and transition durations to 0.01ms while explicitly _keeping_ the focus ring, drawn with outline and box-shadow and never animated.

The vocabulary — "Current". Water has mass: nothing snaps, and nothing bounces like rubber. Things displace and settle. Every token is named for the _job_ it does rather than for its number, because a number cannot be chosen correctly: `slower` gave no way to know whether a sheet or a toast belonged in it, which is how the repo ended up with copy confirmation at 1500ms in two files and 2000ms in a third.

| Token   | ms  | For                                                      |
| ------- | --- | -------------------------------------------------------- |
| `flick` | 90  | Press down and release, specular                         |
| `swell` | 180 | Hover, color, state change, toast in                     |
| `ebb`   | 180 | Element exit — dismiss, collapse-away, toast out         |
| `drift` | 280 | Expand/collapse, list enter, list reorder, tab change    |
| `rise`  | 420 | Sheet present, modal                                     |
| `route` | 420 | Route transition — the same window as `rise`, on purpose |
| `tide`  | 720 | The signature moment only                                |

**Exit is faster than enter** (`ebb` 180 against `drift` 280). An entrance introduces content the user has not read yet, so it has to be slow enough to be followed; an exit removes content the user has already finished with, and every millisecond of it is latency between a decision and its result. `rise` and `route` share a window because a pushed route and a presented sheet are the same event to the user, and giving them different lengths only makes the app look inconsistent about its own depth.

Two values in the file are **holds, not transitions**: `feedbackHold` (1500ms, how long a "Copied" chip stays readable) and `debounce` (500ms). Reduced motion must not shorten either, which is what `resolveMotionMs` is for.

| Easing    | Curve                                  | Character                                                                                   |
| --------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `current` | `cubic-bezier(0.32, 0.72, 0, 1)`       | Heavy exponential out — the default for anything entering                                   |
| `settle`  | `cubic-bezier(0.22, 1.00, 0.36, 1)`    | Slower tail, for an amount landing                                                          |
| `sink`    | `cubic-bezier(0.40, 0.00, 1.00, 1.00)` | Accelerating out — exits only                                                               |
| `swellIn` | `cubic-bezier(0.34, 1.14, 0.64, 1.00)` | ~4% overshoot, success only. Replaces `bounce` at 1.56, which is too rubbery for this world |

Mapping: press → `scale(0.985)` plus specular at `flick`/`current` with a light haptic · state change → crossfade at `swell`, digits never reflowing because they are tabular · list enter → 8px rise and fade at `drift`, 24ms stagger, maximum six items · sheet → translateY 100%→0 at `rise`, backdrop blur 0→20px and scrim 0→0.62 over the same window · route → shared element on the token logo, outgoing screen receding to `scale(0.97)` with a 2px blur · loading → a shimmer band traveling 1400ms across `state.hover`.

Reduced motion is a full parallel mapping, not a switch that turns motion off and leaves holes: opacity steps replace translations, the stagger disappears, the backdrop goes straight to its final scrim, and haptics are kept.

#### The sink and the float — the transition verb

**Shipped on mobile**; the DOM ports it after the numbers are calibrated on a device. When one piece of content replaces another, the transition speaks the water's own vertical: **leaving is sinking** — the outgoing content drops `SINK_FLOAT_TRAVEL` (28dp) accelerating on `sink`, its opacity falling the way light falls with depth (slowly at first, fast at the end — the same accelerating bezier, never linear) — and **arriving is floating** — the incoming content rises the same distance and comes to rest on `settle` (buoyancy running out: no overshoot, the system rule), its light returning on the Beer–Lambert curve as it comes up, still settling from `scale(0.96)`. The verb is not invented: it generalises the two directions the system already commits to — the wait's mark *sinks* into the water it disturbs, and The Surfacing *rises* — into a rule for everything in between. It **replaces the shared-axis transition that was considered** for these swaps: shared-axis has a left and a right, and the water does not; one vertical verb serves forward and back alike.

The primitive is `apps/mobile/src/utils/sinkAndFloat.ts` (`floatEntering` / `sinkExiting`), the successor of `fadeThrough.ts` — an upgrade, not a replacement: the fade and the settle survive, the travel is what is new.

**Recalibrated to the water's own clock** (00caaf41). The verb first shipped on generic-UI numbers — 12dp over `drift` 280 in and `ebb` 180 out — and the owner's verdict was that nothing looked like it came out of water. The verdict was right at the numbers: the system's own water runs at 700–2000ms (the logo's return is `tide` 720, the wavefront's crossing 2000), and at that ratio the swap read as a fade with a direction. So every number is re-derived from The Surfacing rather than from any generic motion spec, and each is a **named tunable** the owner calibrates by eye on device, with its band recorded beside it:

- `SINK_FLOAT_TRAVEL` **28dp** (band 24–40 — 12–16 reads as a nudge, not as depth); `FLOAT_ENTER_SCALE` 0.96 rather than the route transition's 0.97 — a touch more pressure at depth, still felt rather than seen.
- `FLOAT_IN_MS` = `drift`×2 = **560ms** (band 450–650: on the water's clock, between `rise` 420 and `tide` 720, short of ever feeling like The Surfacing); `SINK_OUT_MS` = `tide`/2 = **360ms** (band 320–400) — still shorter than the float, as everywhere, but no longer `ebb`: water swallows things at its own speed.
- **Beer–Lambert light.** Opacity is not linear in time: `depthField` already computes a floc's opacity as `exp(−μ·depth)`, so the entering opacity runs on the accelerating `sink` bezier — the vocabulary's closest curve to that exponential — while the travel runs on `settle`. The light returns late and fast; the arrival is heavily damped. Sinking is the mirror.
- **The beat**: `FLOAT_DELAY_MS` = sink + 90 = **450ms** (a245fc53). Without it the two halves overlap and the eye never reads the double gesture; the 90ms of stillness has its own band (90–120 — under ~80 the beat vanishes, over ~150 it reads as lag). Passed **only where something actually sank** first — on a first mount the same delay is pure lag, so those sites pass nothing.
- **The stagger**: `SINK_FLOAT_STAGGER_MS` = `motionMs.stagger` = **24ms**, inherited from The Surfacing's chrome stagger, for surfaces that arrive in pieces — onboarding's float region, the swap review's five blocks. Small groups only, never more than 4–5 steps.

No new duration tokens were minted; the verb spends the vocabulary it found. One mechanism note the beat forced into the open (a245fc53): the swap review lives inside a native `Modal`, and entering/exiting animations cannot cross a window boundary — the modal's own slide was swallowing the verb. The window is now choreographed instead: `animationType="none"`, its visibility waiting out the sink and the beat in both directions, with success keeping its documented hard cut into The Surfacing.

**Where it applies — and where it deliberately does not:**

| Surface | Verb? | Why |
| --- | --- | --- |
| Onboarding step changes, forward **and** back | Yes | The water has no left and right; both directions are the same arrival |
| Button-driven step changes (swap input → review, bridge review) | Yes | The outgoing step sinks, the incoming floats; the mounted ground (`DepthBackground`, scales) never travels |
| Home chain swap + home mount | Yes | The fade-through, given the vertical — frame holds still, content travels |
| The wait's own entry and exit | Yes | See §The wait below — one gesture with the wave |
| The Surfacing (transaction success) | **No** | It *is* the float, at ceremony scale; doubling the verb under it would cheapen the climax. On the swap handoff only review's sink plays |
| Tabs | **No** (owner) | Lateral and high-frequency — repetition would dilute the verb; the cut/micro-fade stays |
| Sheets and modals | **No** (owner) | Their native slide-up already speaks the float; saying it twice is stutter |
| Anything full-screen (wavefront on navigation, etc.) | **No** | The full-screen front belongs to the wait alone — see "no front on a button press" |

**Reduced motion:** both halves return `undefined` — the swap is an instant cut, the `fadeThrough`/`useReducedMotion` pattern unchanged.

**The auth stack's `animation: 'none'` — reversed in meaning, kept as mechanism.** The onboarding navigator was set to `none` for reasons recorded in `app/(auth)/_layout.tsx` and still true: the default `slide_from_right` "took the whole outgoing screen out to the left … and since every screen renders its own chrome, the chevron and the step dots went with it", reading "as navigating somewhere else when the only thing that changed is which step is current"; the water column and scales are mounted once outside the navigator, and "a ground that holds still while the content over it slides is two surfaces disagreeing"; and `fade` was ruled out because the transparent `contentStyle` "shows both screens' text stacked on the shared ground". What is reversed is the *policy* — "no transition between onboarding steps" — not the setting: steps now transition, but one layer down. Each screen's `OnboardingLayout` floats only the slots between `chrome` and `action` (`float` prop → `FloatRegion`, re-keyed on focus so back-navigation floats too), so the chrome, the dots and the ground hold still — every objection that justified `none` is answered by moving the transition *below* the navigator rather than suppressing it. Known asymmetry, recorded rather than hidden: with `none`, the outgoing screen is detached the same frame the next arrives, so onboarding's exit half is the navigator's cut — the entrance carries the verb, which is the fade-through economy (exit near-instant) anyway. Revisit only if the stack ever gains a real exit window.

Within a screen the verb never runs: "nothing moves under the finger" — the float fires between screens, on arrival, and no slot reflows inside a mounted screen.

**The wait owns its passage, end to end** (06ca5b6a). On entry, everything the wait owns — mark, words, tips — floats up into place while the overlay fades in, and **the beat is intrinsic now**: the content's `entering` waits out `FLOAT_DELAY_MS` after mount inside the component itself, so a caller that sinks to make room keeps the double gesture for free and a caller-side delay would double-count the beat — call sites pass nothing. The impact loop (the mark's sink and the wave it throws) waits out the beat plus one `FLOAT_IN_MS` before its first press: the float *precedes* the impact — the mark cannot press into a surface it has not landed on — and the exit phase arithmetic measures from the delayed start so the calm-water handoff stays honest. On exit, the same content sinks (`SINK_FLOAT_TRAVEL`) on the same `holdMs` delay as the overlay's ebb, and the closing ramp is **`WAVEFRONT_EBB_MS`** — `tide`/2, 360ms, the same arithmetic as the verb's sink half — one constant in `wavefront.ts` that the exit plan, the watchdog and the DOM twin all read, so what the caller is told and what the screen does cannot fork; the generic `ebb` (180ms) it replaced read as a fade with a direction rather than as water swallowing the screen. The wait leaves as **one gesture with the departing wave**, not as a fade with stragglers, and the crests stay outside the travelling wrapper: the water is the ground, and the ground never travels. `useWaitPassage` (`apps/mobile/src/utils/useWaitPassage.ts`) hands a mobile call site all four pieces of the passage — `held`, `onExited`, `exiting`, `entering` — so none can be forgotten; the password route and the add-account panel sink what leaves through it, and the swap dropped the caller-side delay it no longer needs — the send and NFT flows do not: they live inside sheets, and the exemption stands (a sheet's content never speaks the verb; the sheet slides from the bottom and leaves the same way). Under reduce motion every stage is cut — no travel in, no travel out, an opacity step each way, and the ramp falls back to `ebb` because a user who cannot see the water is not made to wait out its viscosity.

A skeleton says _this screen is being built_. Once a card, a row or a panel is already on screen, that sentence is a lie: the screen exists, and what is happening is that a number inside it is being replaced. So the rule is:

**The container stays. The skeleton is the value that changes — and only the values that can change.**

Practically: the card keeps its blur, its border, its label and its position; the value inside it reports that it is being recalculated, in place; a value the request cannot change (the amount the user typed, the router, the provider, the network) reports nothing at all, because a placeholder over something fixed tells the user to expect a change that will never come. Nothing is keyed on the value, so a request that comes back with an identical number produces no arrival flash — the value simply stops signalling. The vocabulary is the one above: `swell` to come back to rest on `settle`, `pulseCycle` for the breath while in flight, and under reduced motion the loop is not started at all — the value rests at the dimmed end instead, because a cycle length resolved to 0 spins infinitely fast.

Where it already governs: the balance card when the chain changes (the container and the pagination dots hold still while only the contents crossfade), the price chart when the range changes, and the swap and bridge review screens when the quote is refreshed. The shared primitive is `PendingValue` (`packages/ui` for web and extension, `apps/mobile` for React Native, contract in `packages/shared/src/types/ui/pending-value.ts`).

**A slow quote can never overwrite a newer one** (f25961b4). The honest report above has a data-side half: an in-flight quote that resolves _after_ the inputs changed used to clobber the fresher quote and its loading state — on all three platforms, since they share `useSwapScreenLogic`. A monotonic sequence ticket in the shared hook now discards every stale resolution — success, error and finally alike — for Jupiter quotes and StealthEX estimates, with tests pinning the late-resolve discard and the expired-confirm requote. The value the skeleton settles on is therefore always the answer to the question the user most recently asked, which is the whole point of reporting recalculation honestly.

The control that started the work is part of the report: while the request is in flight, the button that fired it says so and stops accepting a second press on top of the first. The swap confirm is the one deliberate exception — see the sink-wave-float note under §The wait: there the tap's answer is the review sinking, not a spinner on the button.

**Chrome speaks the verb at chrome scale.** When the active chain switches, the home header's account line (name + truncated address) travels like the content below it, but smaller and quicker: half the travel (14dp), in on `drift` (280ms), out on `ebb` (180ms), and a float delay of one sink plus a stagger-beat (204ms) — only when something actually sank; first mount floats immediately. Only the text travels: the copy button and its feedback state stay mounted so the tick is never reset mid-hold. Keyed on the address, so account switches ride the same gesture. Reduce motion cuts instantly.

**Copy feedback travels both ways.** The copy→tick swap is a round trip, not a latch: the tick arrives (mobile: scale 0.4→1 on `settle`/`swell`; DOM: opacity crossfade on `swell`), holds for `feedbackHold`, then leaves on its own exit (mobile: `sink`/`ebb`; DOM: the same crossfade reversed) before the copy affordance returns. Nothing bounces — the old spring is gone. On mobile the wrapper hook lags its `copied` flag by the exit so the tick stays mounted while it sinks; on web and extension the internal `CopyTick` keeps both icons mounted and moves only opacity. Reduced motion drops the travel, never the hold.

**The balance card's chain-switch affordance is an open question again.** Three forms were built and declined, and the work is reverted rather than left half-adopted. The **swipe dive with the neighbour peek** — the sink and the float driven by the finger, the adjacent card's edge poking in as a spatial hint — never earned adoption and its code is gone. The **enlarged pagination dots** graduated the pager into a per-chain control (9b0ca918), and the **seigaiha-arc pager** redrew each position as one scale arc recovered from the shared tile constants (3c0a537a); both were reverted (4521505f, 61544550). What survives is the carousel as it stood before the experiments, plus the constraint set the attempts mapped out for whatever comes next: the affordance must read on a card whose every other verb is vertical, must not spend a second salmon fill, and must not put the texture-scale motif to work as a control. The **token list's refresh verb** went back into the open question with the batch; what was settled about it is unchanged — it must be the report pattern above, the container and the rows staying while only the values that can change report recalculation, never a spinner over a list that already exists — and the rest awaits the new direction.

**The settings gate speaks the verb, and its chrome settles** (f37f07af). The panel stack inside the gate drops its lateral slide — the water has no left and right, the same argument that retired shared-axis — for the sink and the float: pushing a panel sinks the covered one (`SINK_OUT_MS` on `sink`) and floats the incoming one in only after the **full sink plus a beat** (`FLOAT_DELAY_MS`), and popping is the mirror, the revealed panel floating back after the beat that remains once the popped panel's own sink has played. The popped panel's sink is pinned to `ebb` rather than `SINK_OUT_MS`, because the owning sheet's exit window is 180ms and a 360ms sink would be cut mid-flight. The **swipe-back gesture survives as a trigger** for the same passage, never as a different transition. The **chevrons left the push rows**: the affordance promised a lateral slide that no longer exists, and a row whose tap sinks needs no arrow pointing sideways. The gate's own chrome settled with it: the expanded header's title and its back affordance **swap with the short verb at chrome scale** (`drift` in, `ebb` out) instead of cutting; the gate's shadows took their named place in the Shadow Vocabulary — `shadows.header`, the collapsed bar's downward ambient on the content scrolling beneath it, and `shadows.topSheet`, the expanded surface's bottom edge, both registered with their values unchanged because the edge needs them to read as an edge; and the gate's ground got its role name, `surface.shelf` — the value the legacy `background.primary` alias always carried, now named for what the ground is.

**The settings surface joined the system** in the same run of batches: the mechanical token sweep (sixty legacy aliases onto the shipped type and radius scale, thirty-five one-off literals into tokens, every list row on the control radius, section labels in the label role), the secrets onto bedrock in mono (§The Bedrock Rule), avatars onto the depth ramp (§Colors), help and support finally speaking both languages, every control announcing its role and selected state to a screen reader, account and address deletions confirming through the system's own `ConfirmSheet` instead of the OS alert, and the panels speaking the verb (above). The gate is still not a sheet — `GateContainer` keeps its own choreography — though it now shares the material, and the gate header keeps its bespoke marks (§Iconography). The accent budget is spent by consequence rather than by proximity: the status vocabulary carries two weights, warning for what exposes and danger for what destroys, and the caution rung keeps its label in the primary ink and skips the section banner so the two stay distinguishable at a glance. The two key-material rows wear the caution rung; burning an NFT wears the danger one.

### The wait — the water the logo disturbs, built

**Shipped**, twice: `packages/ui/src/components/LoadingScreen` (web and extension) and `apps/mobile/src/components/LoadingScreen`. The timing is one pure function shared by both — `packages/shared/src/motion/wavefront.ts` — and the paint is another — `packages/shared/src/motion/crest.ts` — so the two platforms cannot drift and the choreography is testable without a frame clock. Same split as `surfacing.ts`.

The wait goes **down** while the success comes **up**. That single opposition is what keeps a wait from competing with the only climax the system has.

1. **The descent — removed.** It was a 2px × 120px vertical hairline track with a 44px segment of salmon _ink_ running down it once per `shimmerCycle`. Two things killed it. It read as a **vertical progress bar**, and this component has never had a `progress` prop and no caller has ever passed one — so it claimed a completion percentage it did not have, and a pending on-chain transaction has no percentage to claim. And it was the one element on the screen that would not ride the wave, which put a second motion vocabulary next to the front. The Harrison, Yeo & Hudson (CHI 2010) argument it carried — a decelerating augmentation makes a 5s wait read ~12% shorter, and a constant-speed rotation is the worst option — is now carried by the front, which crosses once per period and then rests.
2. **The wave** — **on by default**, on every wait. _(Reversal: it was opt-in and reserved for waiting on a transaction, on the argument that a boot or a key derivation has nothing in the air. Product hit the account-recovery wait and found it bare — a title over an empty screen while the app does the most consequential thing it will ever do with the user's keys. Every wait is water. The `bedrock` opt-out still wins.)_
   - **The mark is nailed to the centre** of whatever the wait occupies — not of the viewport, so a wait rendered into a panel gets its own centre with no special case — and it is 96px rather than 56px. The origin of a radial front is the one thing on the screen that may not be off-centre; the title and subtitle hang _below_ the centre point rather than being centred with it. _(Product: "lo más importante es que ocurra en el centro del celular.")_

     It was **off-centre on the phone for a day**, and the cause is worth keeping written down because the arithmetic was never wrong. Yoga resolves a percentage `left` on an absolutely-positioned child against the parent's _content_ width — width minus padding — but lays it out from the parent's _border-box_ edge. The mobile wait's content view carried `paddingHorizontal: spacing['2xl']`, so `left: '50%'` landed the emitter at `(W − 2·24)/2` instead of `W/2`: **24dp to the left, measured at 73px on a 1280px-wide 3× capture.** The words were unaffected because they set explicit `left`/`right` insets rather than a percentage, which is exactly why the title looked centred beside a mark that was not, and the DOM twin was unaffected because its overlay has no padding. The origin is measured from the mark's own layout, so the _whole front_ was leaving from 24dp left of centre, not just the logo. The padding is gone — every child there is absolutely positioned and carries its own inset — and `bottomOffset` now insets the tips instead of shortening the surface, so the transaction wait centres on the screen rather than on the space above the floating chrome.

   - **The mark sinks**, once per period, and the front is born at the bottom of it. It is the emitter. _(Reversal: it **pulsed** — a 2% swell on `swell`, out and back — and product read that as a jump: "El logo sigue saltando y bajando, no bajando y volviendo a su lugar." The gesture is now the opposite one: it presses *into* the surface.)_ _(Earlier reversal: the logo had been removed with the spinning ring. It is back because a radial front with no visible source reads as unrelated elements twitching, not as one wave. It returns as ink, not as a fill — the light it throws is a reflection off water, not a second filled element.)_

     **The mark is white, and deliberately not the accent.** It is `semantic.text.primary` (`neutral-50`, `#EDF1F7`, 16.89:1 on `surface.bedrock`) — the same ink as the title directly beneath it. _(Reversal: it was `semantic.text.accent`. Product: "que el logo en auth/onboarding sea siempre blanco además de la loading screen.")_ Two reasons, and the second is the one that would have forced this anyway. **Salmon is the ink of action** — it marks the thing the user can press and the thing the app has committed to — and a wait contains no action: nothing here is pressable, and the front is the app working, not the user acting. Spending the accent on it made the wait look like the most actionable screen in the app. And **the wait is not a destination but a thing screens pass through**: this overlay mounts over onboarding, whose mark is now white, so any other ink here would make the logo change colour as the overlay appears and disappear-change back as it leaves. The two marks have to be the same token, not merely similar values.

     **A scale-down alone does not read as a press.** The same shrink describes an object simply receding from the eye, and this one has to read as an impact, so three things carry it and all three are compositor-only. It **dims** by 12% at the trough — water over a thing is water that takes its light, and the system already spends light this way everywhere else. It goes down on `flick` (90ms, accelerating: it arrives at the water at speed) and comes back on `tide` (720ms, decelerating and **monotonic**) — an eight-to-one ratio, which is the profile of something struck rather than something travelling. No spring, no overshoot: a mark that bounced back past its rest position would be the exact jump the words had just had taken away from them. And the wave leaves at the bottom of the descent, which is what makes the descent a cause.

     **The emission is delayed by the sink, not run beside it.** Both used to start at t=0 of the period, which put the ring's birth at the _top_ of the gesture — a wave appearing while the thing that throws it is still on its way down. The ring now waits out `WAVEFRONT_SINK_MS` before it starts to travel, so the front leaves at the trough. The rhythm product asked for — the next sink landing as the previous wave leaves — is then not a fourth number to tune but an _identity already in the constants_: the trough is at `SINK`, the front clears one crossing later, the next trough is one period after this one, so the calm between them is exactly `WAVEFRONT_REST_MS` whatever the crossing becomes. It is derived and asserted in the pure module (`wavefrontCalmMs`), where it is testable without a frame clock, rather than measured by eye on a device.

   - **Every sink launches a front, and one front is in flight at a time.** It reaches the farthest corner of the surface in **2000ms** and then the water rests for **600ms** before the next emission. Still a _time_ and not a speed in px/s, so the gesture reads the same in a 360px extension popup and on a 393×852 phone.

     **The crossing is set by what the eye can follow, not by the transition vocabulary.** It was `rise` (420ms), chosen because a front crossing the screen is the same _size_ of event as a sheet presenting; on a real phone that is unwatchable, and the reason is measurable. Centre to corner on a 393×852pt phone is ~470pt, which at a ~30cm viewing distance subtends roughly 19° of visual angle. Crossing it in 420ms is **~45°/s — above the ceiling of smooth pursuit**, which tracks comfortably to about 30°/s. The eye cannot follow the crest and has to saccade to where it has already gone, so what is perceived is a flash and an after-image rather than a travelling ridge. At 1400ms the same 19° went by at ~13°/s, and it is now **2000ms — ~9.5°/s** _(reversal: "¿el ripple effect que está ahora en la loading se puede hacer más lento?")_ — both inside the band the eye tracks smoothly. The rest is not padding either: a pulse that fires the instant the previous front clears is a metronome however slow it is. _(Product: "va tan rápido que no se puede apreciar" and "no quiero que parezca un radar, quiero que sea más smooth.")_

     **How much further it can go: to about 5700ms, and the limit is not visibility.** The eye detects far slower movement than any of this — a few arcmin per second against a visible reference. What gives out first is the _reading_. Within one fixation, call it 300ms, the front has to shift by more than the crest band's own angular thickness, or a glance shows a stationary ring and the viewer infers growth from successive glances instead of seeing travel. That shift is 4.1° at 1400ms, **2.9° at 2000ms**, and about 1° at ~5700ms (~3.3°/s) — which is where a crossing front becomes a dilating ring, and roughly where smooth pursuit gives out and the eye fixates instead (~1–2°/s). So there is room to roughly double the crossing again, and no more.

     **It costs the handoff, one for one, and that is the real budget.** The exit waits for calm water, so the worst case is a whole crossing plus the closing ramp (now `WAVEFRONT_EBB_MS`, 360ms — see the passage note under §Motion): **2360ms at 2000, against 1760ms at 1400.** That is dead time between the work finishing and the receipt appearing, on a screen the user is already waiting on. Two things make it payable, and neither is breaking the coupling. It is the _worst_ case, not the usual one — a wait that resolves during the rest hands off on the ramp alone, so the mean hold is `(CROSS/2)·(CROSS/PERIOD) + ramp`, ~1130ms at 2000 against ~850ms at 1400. And the obvious escape — closing on a faster wave than the one that was emitted — is rejected on the same grounds as the closing wave that came before it: `d = c·t` is the entire claim the front makes, so a front that accelerates to suit the caller, at the exact moment the user is watching it, is a cut rather than a wave. The crossing is one named constant (`WAVEFRONT_CROSS_MS`) and everything else — the period, the calm, both platforms' keyframes, the exit bound — is derived from it, so it is dialled in one place. The mark's own cadence is deliberately _not_ derived from it: an impact is an impact whatever the water does afterwards.

   - **Nothing rides it any more.** _(Reversal: the riders were the point of the system, and they are gone. Product: "Unlocking Wallet sigue moviéndose y el div de tip también, cuando te dije que no debería" — the small jump under each word was not wanted and was not considered necessary. The behaviour was removed rather than damped: an amplitude turned down to nothing is a system that still measures, still schedules and still animates three elements to no visible end.)_ The title, the subtitle and the tips are stationary; the crest is the only thing that moves, and it is the thing that shows the front takes real time to reach the edge.

     What survives in `motion/wavefront.ts` is `planWavefront`, with **no caller** and a comment saying so. It holds the two results that were expensive to arrive at and are cheap to keep — `d/c`, the d'Alembert delay that makes a distance-proportional stagger a physically correct front, and the 1/√d cylindrical attenuation — and product's words on the removal were "al menos por ahora". What was _not_ kept is `startMs`, the half-a-pass centring below: it describes a passenger's curve rather than the wave, so it has no meaning without passengers. The paragraph that argued for it stays, because the argument was right and would have to be made again.

     _The removed behaviour, as it stood — kept because it may come back:_ title, subtitle and — where a surface shows them — the tips were displaced `waveAmplitude` (3px) upward with a 2% swell over `drift`, delayed in proportion to their _measured_ distance from the mark and attenuated as 1/√d, which is how a circular wave loses amplitude when it spreads its energy over a growing perimeter. Attenuation was not a flourish: it is the difference between reading as one wave and reading as four things moving.

     The displacement was **centred on the front's arrival** rather than started by it — `WavefrontPlan.startMs` is `delayMs − durationMs/2`, clamped at zero. Started _at_ the arrival, a rider peaks half a pass later, by which time the crest is `PASS/2 · c` further out and the element reads as bouncing after the wave has gone. _(Product: "los componentes cuando rebotan no lo hacen cuando pasa la onda, sino cuando ya desaparece.")_ A float on water rises as the crest approaches and settles as it leaves; it does not wait for the crest to be on top of it.

   - **It loops** for as long as the wait lasts. _(Reversal: the cap was three emissions, then stillness.)_ What keeps a thirty-second wait from being a thirty-second show is the duty cycle, not a counter — the front occupies 2000ms of a 2600ms period and the rest is still water. Nothing accumulates: one compositor animation per element (`infinite` on the DOM, `withRepeat(-1)` on the UI thread in React Native), no JS timer behind it, and every value is cancelled on unmount.
3. **The exit waits for calm water, always.** _(Product: "que no se pase a la siguiente screen hasta que la última onda salga de la pantalla, es decir, justo cuando el agua está calma. Esto aplica siempre.")_ It is **derived**, not a constant — `planWavefrontExit(elapsedMs, reduceMotion)` returns the hold and the total:
   - A front **in flight finishes crossing.** Nothing is cancelled: the crest's looping animation is left running exactly as it is and the ground simply holds until it has left. The previous model killed the emission and started a fresh closing wave, which cut the visible front in half at the moment the user was most likely to be watching it. _(The riders used to switch to leaving on the front's remaining schedule — the ones it had passed going now, the ones ahead going as it reached them. With the riders gone the hold is the whole exit, which is one fewer thing that can be out of step.)_
   - **The phase moved with the emission.** The front is in flight over `[SINK, SINK + CROSS)` of the period rather than `[0, CROSS)`, because it is thrown at the trough. A wait resolving _before_ the trough hands off at once — the mark is still on its way down and there is no wave on the screen to wait out — which is also what keeps the worst case at one whole crossing, and therefore keeps the hard bound where it was.
   - **Calm water hands off immediately.** Because only one front is ever in flight, a wait that resolves during the rest has nothing to wait for, and inventing a closing wave would be pure latency between a decision and its receipt with nothing on screen to justify it.
   - **The hard bound survives, and gained real slack** (a245fc53). `wavefrontExitMs()` — the sink, plus the **train-length crossing** (`WAVEFRONT_TRAIN_CROSS_MS`, derived from the crest count so "the water is calm" means the _last_ crest has left the viewport, not the leading one; with the current train of one it is exactly one crossing), plus the closing ramp (`WAVEFRONT_EBB_MS`, 360ms), plus `WAVEFRONT_EXIT_SLACK_MS` (250ms) — **2700ms worst case** — arms a timer in both implementations, and whichever of the timer and the animation callback arrives first wins. A wallet may never be stranded on a loading screen by an animation that failed to complete. The slack exists because without it the JS timer and the UI-thread animation could dead-heat, and the timer winning by a frame cut the wave at the exact moment the user was watching it; with it, the guard can only ever fire late. An early resolve during the float-in cancels the scheduled loops rather than inventing a two-second impact, and the callers that navigate (the password route among them) park on `router` until `onExited`, with a watchdog so navigation can never strand.
   - **The callers were the other half of the promise.** A surface written as `if (loading) return <LoadingScreen />` swaps branches the frame `loading` flips and unmounts the wait mid-wave, so the closing wave played nowhere on the screens it matters most. `useWaitExit` inverts the condition: the wait stays mounted with `visible={false}` — which is what _starts_ its exit — until it reports back through `onExited`. Wired on both transaction success screens, the web auth guard and the root redirect. The waits that are rendered _alongside_ their content rather than instead of it (both lock screens, both account-add panels, the mobile password screen, the shared auth password page) already outlived the flip and needed nothing.

**The front is a wave train, not one crest.** Product's reference photographs of a droplet on dark water all show the same structure: five to a dozen thin concentric rings travelling together, alternating light and dark, sharp and strong at the inside and fading outward. It is the _train_ that reads as water. One expanding band, however carefully shaded, reads as a hoop — which is exactly what the single-crest version was called on the device.

Each ring is a **refraction crest**: the crown returns light and both flanks fall into shadow. That is the standard height-field result — the light term follows the _derivative_ of the height field, not its height (GPU Gems ch. 1, eqs. 4b/5b; the same finite-difference shading is the whole of Hugo Elias's classic 2D water article) — read from directly overhead, where a ridge returns most along its crown and falls away on both slopes. The profile is symmetric because **a radial gradient is isotropic**: it varies with radius alone, so it has no direction to put a light source in, and an asymmetric radial profile silently claims the light is at the centre of the screen and gives the ring a wrong side as it grows. A ramp across a band reads as _relief_ (Ramachandran, _Nature_ 331:163, the light-from-above prior).

**The ground is what decides the numbers, and it was measured rather than argued.** The wait stands on `#0B0F19` — luminance **16 of 255**. The light has ~240 levels of headroom above that and a shadow has **16 below it, in total**, so a literally balanced light-and-shadow profile is unbuildable here: the lit side shouts and the dark side has nowhere to go. The first symmetric attempt measured its crown **+101** over the ground and its flanks **−9** — an eleven-to-one split, which the eye resolves as a bright teal tube with no shadow. Three corrections, all visible in the references:

- **Alternation does the work absolute contrast cannot.** A dark ring is dark _because it sits immediately against a lit one_ — simultaneous contrast, and the Mach banding lateral inhibition performs on exactly that adjacency. Five rings put a light beside every dark.
- **The crown was cut to 0.22 alpha.** A captured frame now measures the crown **+39** against flanks at **−14**, a ratio near 3:1, with 54 levels between crown and flank — on par with the single-ridge variant that was judged legible, at a fifth of the shout.
- **A base lift under the whole train.** In every reference the water immediately around the disturbance is not the value of still water far from it. A 0.05-alpha lift raises the base the shadow lines descend _from_, which is what gives them somewhere to go on this ground.

The rings are **line-weight, not tube-weight**: a lit line is 12% of the ring spacing and the rest is calm lift, so most of the train's area is the tone between the lines. Amplitude decays 0.62 per ring outward, matching the 1/√d attenuation a cylindrical wave obeys — the paint has to decay too, or the train contradicts the physics it is supposed to be showing. _(It used to say "the attenuation the riders already use"; the riders are gone, the law is not — it still lives in `planWavefront`.)_

The colour is `water.light` (`#9FE0EF`), the cold caustic ink The Surfacing's band and the press specular already use, promoted to a token here because this is its third consumer. **Not salmon** _(product: "las ondas siguen siendo naranjas")_ — a salmon ring crossing the screen reads as a brand element travelling; this is light returning off water, so it takes the colour of the material rather than of the company. The shadow stays black: shadow is an absence of returned light, and tinting it makes the train read as coloured rings instead of relief.

The whole train lives in `packages/shared/src/motion/crest.ts` as named constants and is drawn from the same numbers on both platforms — a `radial-gradient` on the DOM, a `RadialGradient`-stroked `Circle` in `react-native-svg` on mobile. **A train is more gradient stops on the same node, not more nodes**, and **the gradient is never animated**: it is painted once at the front's final diameter and moved by `transform: scale()` alone, so the compositor scales a rasterised layer and five rings cost what one hairline cost. The rejected readings — `ridge`, `swell`, `train`, `rope` — are kept in `CREST_VARIANTS` with the numbers that were measured against them, so the next tuning pass starts from measured alternatives rather than from zero.

This is a light event during a wait, which §Overview used to forbid. That rule is amended there rather than quietly broken here; the light stays bounded, cold rather than branded, outward-and-down rather than up, and dead before the receipt mounts.

**Reduced motion** is a parallel mapping, not a hole: no pulse, no train, no displacement — the mark is still there, and the _words_ carry the state, which is the job the descent's mid-track resting position used to do — **and no wave-driven exit**. A user who cannot see the wave is not made to wait one out; the wait leaves in one `ebb` step, one whole crossing sooner. Not up for revision.

**The Bedrock Rule still wins.** The dApp approval flow's wait (`bedrock`) gets no mark, no train and no wave, for the same reason it gets no water column — and because it has no wave, it needs no hold before it hands off.

**Ruled out: no front on a button press.** Reusing this on taps was considered and rejected _(product: "cada vez que tocás un botón perturbás el agua")_. It is recorded as a decision rather than left open, because it will be proposed again: a full-screen front means **something is in flight**, and in a wallet buttons are pressed constantly, so firing one per tap would spend that meaning on navigation. `PressSpecular` remains the press vocabulary on mobile.

**Not built, and refused for now:** distortion. A text that ripples _over itself_ needs a shader. On mobile that is `@shopify/react-native-skia` — a native module, therefore a store release rather than an OTA, and it would not even solve it, because Skia distorts pixels inside its own canvas and does not move real views. `react-native-svg` is not an alternative: `FeTurbulence` and `FeDisplacementMap` both return `null` and warn. On the DOM `feTurbulence` is notoriously unaccelerated and displaces pixels rather than elements. What ships is a physically correct train of rigid bodies floating, which is the part the eye actually reads.

**The unlock wears the wave, and the gate is what gets parked** (bed9bd39). The lock screen owned a wait nothing ever showed: a successful unlock unmounted the whole gate mid-frame, which is the same cut `useWaitExit` exists to prevent — except that here there is no route to park on, because the navigation *is* the gate release. So the release is what parks. Submit shows the wave and yields a frame before key derivation blocks the thread, so the water is already running when the crypto stops it; the layout holds the gate open while that resolves underneath; success parks the release in a ref and lets the wait leave on its own last wave before the gate slides up, with the wavefront watchdog guaranteeing the exit even if the animation drops. Failure returns to the input with the error in the `assist` band and the release never fires. Key derivation is the most consequential thing the app does with the user's keys and it is the one wait with a visible cost; showing the water working is the honest report of it.

**The unlock passage is sequential and counted** (06ca5b6a): hold → the wait's sink (the 360ms closing ramp) → one beat of calm water (`FLOAT_DELAY_MS`, 450ms) → the gate's rise (`rise`, 420ms), each stage waiting for the last, and under reduce motion the whole passage is a cut. Two failure modes this closed: the lock screen now resets its state on **entering** locked, never on leaving it — after a successful unlock `locked` flips false while the gate is still held and the component still mounted, and resetting on that flip stripped the lock's own UI mid-unlock; and a **biometric unlock parks the release like the password path** — `locked` flips in an earlier microtask than the awaited return, and an unparked gate started rising while the lock content was still settling — but its release on success is immediate, because the OS answers instantly and there is no wave to wait out.

**Swap confirm — sink, wave, float (mobile).** The confirm tap is the last thing the review does: it sinks immediately, with no button loader — a spinner on a button claims the button is working when the water is. The wave wait takes the screen for as long as sign, submit, confirm and settle run, and leaves on its own last wave (`useWaitExit`); only then does the receipt mount, so The Surfacing plays exactly once, never over an unconfirmed transaction. Failure is the exception: nothing surfaces — the wave cuts and the input floats back with the error. The wallet never shows a receipt it cannot stand behind.

**The ending says what happened** (5a2eb574). The swap's success screen used to close on one line of text; it now shows the exchange itself — token to token, the received amount a rank louder — with a quiet receipt beneath: the effective rate derived from the two amounts, the Salmon fee **snapshotted at confirm** (the number the user agreed to, not whatever the backend would say now), and the local time. Zero new fetches and zero new copy paid for it; the caustic band re-measures its stop against the new hero, and the NFT variant is untouched. **The exchange is a line, not a card** (e9fc7878): boxing it put a content surface between The Surfacing and the thing it surfaces, and the light has to land on the hero. The one-line summary *is* the hero; the rate, fee and time sit beneath it as quiet rows, unboxed.

### The Surfacing — the signature moment, built

**Shipped on mobile**, in `apps/mobile/src/components/TransactionSuccessScreen`: the timeline lives in `surfacing.ts` as a pure function of the reduce-motion flag, so the _timing_ is testable without a renderer or a frame clock, and `SurfacingLayers.tsx` draws the two things that move. **And on the DOM** (dc875e30): web and extension play the same choreography from the same `motionMs` timeline ported verbatim — CSS keyframes for the fixed phases, WAAPI for the one phase that depends on layout — honouring both recorded omissions below (tint instead of blur, no Gaussian on the band); under reduced motion the success simply appears. Exactly one screen owns it: the confirmation of a completed send or swap. Over `tide` (720ms), three things happen on one timeline.

1. The sheet's membrane **clears**: tint α animates 0.80 → 0.55 and blur 32px → 12px, so the water above the transaction thins out. On iOS this is the one call in the app that uses `GlassView`'s animated `clear` style.
2. A **caustic band** — a 140px-tall soft light shape, masked by the _scales_ geometry at 0.5×, filled `#9FE0EF` at 10%, blurred 24px, `screen` blend — travels from the bottom of the sheet up to the amount over 560ms on `current`, and dissipates. It is the shaft of light hitting the fish.
3. The **amount** settles: translateY +6px → 0 on `settle`, arriving 120ms after the band passes it, digits already at tabular width so nothing reflows.

Then everything is still. No looping particles, no confetti, no repeat. A single physical event, under a second, saying _this transaction came up out of the deep and it is done_.

**The ending borrows the onboarding ending's bands** (e9fc7878). A transaction receipt — swap, send, NFT — composes its bottom edge exactly the way the onboarding success screen does: a quiet text-button assist band (View on Explorer) sitting directly over the bottom-most full-width primary (Back to wallet), with the grid's `spacing.lg` between them. The two endings are the same event at different scales, so they should not be two layouts. **The assist band keeps its reserved height when there is no explorer link** — the onboarding grid's rule applied outside onboarding: a Bitcoin receipt and a Solana receipt put their primary at the same Y, and the button under the thumb never moves because of what the chain happened to support. On the Receive sheet the same reasoning governs a smaller pair: the chain pill belongs to the QR it labels, so it sits `spacing.md` from the code and the full content gap from everything else — proximity is what says which of two things a label is about.

Reduced motion: the membrane clears in one 180ms opacity step, the caustic band renders once as a static 10% highlight across the amount for 400ms and fades, and the amount does not translate. The moment stays recognizable; it just does not travel. It is a parallel mapping, not an off switch — the success haptic still fires.

**Two parts of the specification were deliberately not built**, and both are marked as such in the code rather than left to be discovered:

1. **The membrane's blur, 32px → 12px.** The sheet this screen mounts in is an opaque `surface.shelf`, not a P3 membrane, so there is nothing behind it to defocus: an `expo-blur` intensity over an opaque ground costs a full-screen GPU pass and shows nothing. What ships is the tint clearing — α 0.80 → 0.55, expressed as a view opacity of 1 → 0.6875 so the two halves of the statement cannot drift apart. The blur is waiting on the membrane material, not on effort.
2. **The band's 24px Gaussian.** `react-native-svg` does implement `FeGaussianBlur` natively, so this one was tried: at 24px it erased the scales geometry that masks the band, which is the only thing that makes the light read as _this_ system's light rather than a generic glow. The band ships sharp.

## Do's and Don'ts

### Do:

- **Do** put `neutral-1000` on every salmon fill. It is 6.50:1 and it is the only legal ink there, in both themes.
- **Do** apply `tabularNums` to every rendered number. The shipped faces bake tabular digit advances in, so it is a no-op today — keep it anyway; a typeface is one commit away from being the thing that jitters again.
- **Do** use `border.raised` or stronger for any meaning-bearing border above `surface.shelf`. `border.default` is legal on `surface.shelf` and nowhere higher.
- **Do** carry every state in three channels — opaque color, icon, and label.
- **Do** keep the approval sheet and every seed view on `surface.bedrock`, opaque, with a hard scrim behind them.
- **Do** paint the scrim before the blur, on every rung of the ladder.
- **Do** spend salmon _fills_ once per screen; salmon ink is not rationed, but it is aimed — values, states, affordances, links — never sprayed.
- **Do** add a new token when a value is missing, rather than a literal at the call site — `packages/ui/src/theme` invents no colors, sizes or durations, and that property is worth protecting.
- **Do** keep the materials in their own tissue: flesh inside a salmon fill, scales and snow on the ground behind everything, the membrane's own dark scales inside the thermocline, no motif on a content surface.
- **Do** mount the water on the application's ground, not on one screen. A world that is water on Home and flat elsewhere is not a world.
- **Do** let the keyboard commit an action the pointer must hold for. WCAG asks that nothing be gated behind holding a key down, and friction the keyboard cannot escape is an accessibility bug wearing a safety costume.
- **Do** mark new work against this file's shipped/not-built table, so the next reader can still tell the two apart.
- **Do** write a deviation down where the rule is, when a spec value loses to the surface it lands on — the hold progress line in `neutral-1000` rather than salmon is the example to copy.

### Don't:

- **Don't** put white text on a salmon fill. 3.06:1, banned outright, and asserted against in `contrast.test.ts`.
- **Don't** replace the focus ring with `outline: none`. On an approval screen an invisible focus state is a fund-safety bug.
- **Don't** put brand salmon ink (`salmon-500`) on a membrane. It would need α 0.88, which is past the point where glass is still glass. Use a salmon fill with opaque ink, or `accent.inkOnMembrane` where warmth is load-bearing — the one step measured for it.
- **Don't** put glass under content. If a surface does not overlap scrolling content, it is opaque.
- **Don't** apply `backdrop-filter` to more than two fixed elements in the extension document, or to more than one element per screen on Android. This is a permanent performance constraint, not a guideline.
- **Don't** use the scales as wallpaper, as a chain indicator, or behind any number. Each sanctioned appearance is a distance from the eye; a fourth use is a bug.
- **Don't** put a motif on a content surface — not a card, not a row, not a page shell, and not the content of a sheet. Content is the lit opaque plane in _front_ of the water, and texturing it inverts the depth order the motif exists to encode. A sheet's *material* is the one exception and it is not a loophole: the thermocline carries its own dark scales field, in the material's ink, under everything the sheet holds.
- **Don't** press the scales into a salmon fill. A filled control is mass and takes the flesh texture; the `fish` variant is deprecated and has no call sites.
- **Don't** darken a flesh band below the fill it sits on, at any opacity. Every band being lighter is what makes ink contrast on a salmon fill exactly the flat fill's, and `flesh.test.ts` asserts it.
- **Don't** make a tiling texture fade to zero at the tile edge to hide the seam. It does the opposite — it switches every band off along the same line and advertises the repeat as an untextured column. Seamlessness is continuity of position _and_ slope across the crossing.
- **Don't** reintroduce the retired values: the `#80ff54` lime, the `#404962` border (2.07:1), the `#6B6E7B` placeholder (3.66:1), sub-pixel border widths, or `easing.bounce` at 1.56.
- **Don't** let a Powerup, a chain, or a partner introduce its own palette, typeface, or material. Modules change the contents of a plane; the water is invariant.
- **Don't** add a glow, a mesh gradient, a starfield, or a chart-as-wallpaper. Depth comes from material and edge, never from emitted light. The two sanctioned light events (The Surfacing, the wave's ring) are events, not hierarchy: neither of them makes something look _important_, they both say something _just happened_, and neither of them rests.
- **Don't** add sand, a seabed, a horizon, or ambient light shafts to the ground. The column is the middle water and its light is always an event with a beginning and an end. Their absence is recorded in §The water column as a decision, not a gap.
- **Don't** ship the marine snow's drift without measuring it on a low-end Android and in the side panel first, and without gating it on both reduced-motion signals. Drift is decided; a repaint of the field, rather than a transform of its layer, is not what was decided.
- **Don't** reintroduce a motif on the dApp approval screen or a seed view, or behind a membrane, while extending the ground to more screens. Those three exclusions are the reason the ground is allowed everywhere else.
