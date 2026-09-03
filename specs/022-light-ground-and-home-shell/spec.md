# Feature Specification: The ground, the fades and the Home shell in both modes

**Feature Branch**: `feat/redesign-mobile-home` (spec dir `022-light-ground-and-home-shell`)
**Created**: 2026-09-01 · **Status**: Approved by the owner 2026-09-01, in implementation

Follows spec 021 (light theme). 021 migrated every screen to `useThemedStyles`; what it left flat, static or branched by mode is the _ground layer_ of Home — the water ramp, the masks over scrolling content, the balance block and the sub-tab row — plus the membrane in light. This spec rebuilds that layer as one tokenised implementation that is correct in both modes, and folds in three owner rulings from the same device review.

## Owner rulings (2026-09-01, on device, light mode)

1. **Nothing above the sub-tabs scrolls.** On Portfolio _and_ on NFTs, the wallet header, the balance block and the Portfolio | NFTs row stay still; the scroll happens in the view under them. Same behaviour as Activity's filter row over its list — and it is the same component (`UnderlineTabs`), so it must animate the same way.
2. **Coral in both modes** for the wait's waves, the mark on the wait, and the mark on the lock screen. They currently take `water.light`, the cold caustic ink; the owner wants the brand accent. DESIGN.md §The wait's "the waves stay orange / not the brand salmon" sentence is superseded.
3. **The thermocline has to work in light.** A sheet in light today is a hairline with nothing inside it: the list behind it reads straight through the transaction detail and the Receive sheet. The membrane material renders in light with the light tint tokens 021 already defined.

## What is wrong today, and why

| Symptom (light)                                                         | Cause                                                                                                                                                                                                                                                                                                                                                                         | Where                                                         |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Black fade over the bottom of the list and the FAB                      | The tab shell reads the **static dark** `semantic` export: its ground is `#070911` and its bottom fade ends on `#0B0F19` regardless of mode                                                                                                                                                                                                                                   | `apps/mobile/app/(app)/(tabs)/_layout.tsx`                    |
| Every fade smudges to grey before it clears                             | Fades end on `'transparent'`, which React Native interpolates as black at alpha 0. Invisible on deep water, a dirty band on a pale ground                                                                                                                                                                                                                                     | Home top fade, shell bottom fade, `BottomSheetContainer` fade |
| A hard grey stripe under the wallet header                              | bc50476c made the top fade an opaque band of `depth.column` + fade. The band matches nothing under it: in light it is the ground's colour ending on a black-tinted fade; in dark it is `neutral-975` over a ramp whose top is `neutral-950`                                                                                                                                   | `index.tsx` `topFade`                                         |
| Sub-tab row over the balance, balance cut, grid under the header (NFTs) | Two different mechanisms per tab. NFTs runs the balance as the grid's list header and the row as an absolutely positioned overlay driven by two `onLayout` measurements, two interpolations and a spacer; any drift between measured and painted (balance height on load, the header's extra `gap`) misplaces the row. The row's scrim is `depth.abyss`, a band in both modes | `index.tsx` NFTs branch                                       |
| Sub-tabs jump instead of sliding                                        | The row is mounted under a different parent on each tab, so `UnderlineTabs` remounts on every switch and never plays its underline travel                                                                                                                                                                                                                                     | same                                                          |
| Sheet content unreadable in light                                       | `Thermocline` branches `mode === 'light'` into a "flat" rung that draws a border and **no fill**                                                                                                                                                                                                                                                                              | `Thermocline.tsx`, `Thermocline.native.tsx`                   |
| Flat ground in light                                                    | `DepthBackground` branches `mode === 'light'` to a flat view; `water.gradient` light is a two-identical-stop pair                                                                                                                                                                                                                                                             | `DepthBackground.tsx`, `semantic.ts`                          |

## Principles

- **The ground layer derives from `water.gradient`**, never from `depth.*`. What tops the ground (header seam, pinned block) reads stop 0; what floors it (bottom fade) reads stop 1. In light the ramp is real, not flat.
- **A fade ends on its own colour at alpha 0** via `withAlpha(token, 0)` (`packages/shared/src/theme/withAlpha.ts`). `'transparent'` is not a stop.
- **No `mode ===` in a component.** A component asks a token; the token carries the mode. The only sanctioned reads of the mode are the OS-facing ones (status bar style, navigation theme).
- **One mechanism for both sub-tabs.** Header, balance and row are laid out in flow above a content region; each tab's list scrolls inside that region. No measurement, no overlay, no scrim.

## Tokens (`packages/shared/src/theme/semantic.ts`)

| Token                | Dark                                       | Light                          | Note                                                                                                                                                             |
| -------------------- | ------------------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `water.gradient`     | `[neutral-950, neutral-1000]` (unchanged)  | **`[neutral-25, neutral-50]`** | Light ramp: nearer water above, slightly deeper below. Same rule as dark (darkens downward), rebuilt on light's headroom. ⚠ owner to confirm the stops on device |
| `water.fadeTop`      | `[gradient[0], withAlpha(gradient[0], 0)]` | same rule                      | The seam under a fixed block, over content scrolling beneath it                                                                                                  |
| `water.fadeBottom`   | `[withAlpha(gradient[1], 0), gradient[1]]` | same rule                      | The floor fade over the end of a list                                                                                                                            |
| `surface.raisedFade` | `[raised, withAlpha(raised, 0)]`           | same rule                      | The sheet's own top fade                                                                                                                                         |

`contrast.test.ts` asserts every text role against both stops of the light ramp exactly as it does the dark one, and the membrane tiers over both.

## Home shell (`apps/mobile/app/(app)/(tabs)/index.tsx`, `_layout.tsx`, `WalletHeader`)

- The tab shell migrates to `useThemedStyles`/`useSemantic`. Ground colour = `water.gradient[1]`; bottom fade = `water.fadeBottom`.
- `DepthBackground` draws `LinearGradient(water.gradient)` in both modes; the light branch goes.
- `WalletHeader` leaves the absolute slot and is laid out in flow as Home's first child. `useTabChrome` keeps `headerChromeHeight` for the screens that still need it (swap) — Home stops consuming it for its offsets.
- Home lays out: header → balance block → sub-tab row (one `PortfolioSubTabs` instance, one parent, both tabs) → content region (`flex: 1`). The content region holds the active tab's own scroll view (TokenList / Bitcoin column / NftsTab). Seams stay the component gap (20).
- One fade at the seam between the row and the content region: `water.fadeTop`, `componentSizes.sheetFadeGradientHeight` tall, opacity driven by the active list's scroll offset as today (`TOP_FADE_SCROLL_RANGE`). The band, `headerChromeHeight` in the fade, the sticky row, its scrim, both `onLayout`s, the spacer, `STICKY_SCRIM_START` and the unmeasured state are deleted.
- `NftsTab` no longer takes `listHeader`/`contentTopOffset`; its `NftsTabHeader` loses the `listHeader` slot.
- The sub-tab switch keeps the sink/float on the _content region only_; the row itself never remounts, so the underline travels.

## Thermocline in light (`Thermocline.tsx`, `Thermocline.native.tsx`)

The `mode === 'light'` rung is removed. The rung is decided by the material preference alone: `opaque` when the platform asks for reduced transparency, `tint` otherwise, in both modes. Light's tint tokens (`membraneThin` white 0.85, `membraneThick` white 0.95) are the ones 021 defined for exactly this. The hairline the flat rung drew is not carried over — cards already own their border. `BottomSheetContainer`'s fade reads `surface.raisedFade`.

## Coral on the wait and the lock

- `CREST_LIGHT_COLOR` (`packages/shared/src/motion/crest.ts`) and the mark on `LoadingScreen` (mobile and `packages/ui`) read the accent instead of `water.light` / `text.primary`. Token settled 2026-09-02: **`accent.fill`** — the button's own `salmon-500`, invariant across modes — not `accent.ink` (the darker step light uses for text). The fish and the waves are the colour of the buttons.
- The lock screen's mark reads `accent.fill`, the same token, so the mark and the crest it throws are one ink.
- `PressSpecular` keeps `water.light` (not in the ruling). If `water.light` ends up with no consumer it is deleted; otherwise it stays.
- DESIGN.md §The wait: the "waves stay orange, not brand salmon" reasoning is replaced by the ruling.

## Out of scope

- Web and extension (still on the static dark palette).
- The ⚠ decisions of spec 021 not touched here (text steps, `border.strong`, crest, skeleton, shadows).
- The Wallets sub-account chips, `ReceiptScreen`'s deferred require, DESIGN.md:224's stale `inkOnMembrane` row.
- Home's NFTs entry animation and the FAB morph (backlog).

## Verification

- `pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/ui --filter=@salmon/mobile`
- `pnpm format:check`, `node scripts/check-i18n.mjs` at close.
- Owner review on device, both modes: no dark band anywhere on Home; sub-tabs fixed and sliding on both tabs; sheets opaque-enough in light; coral waves and marks.
