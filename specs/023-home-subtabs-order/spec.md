# Feature Specification: Home sub-tabs — the user's order, and a row that scrolls only when it must

**Feature Branch**: `feat/redesign-mobile-home` (spec dir `023-home-subtabs-order`)
**Created**: 2026-09-02 · **Status**: Approved by the owner 2026-09-02 (drag vs arrows and "hide" left to the default below), in implementation

## Owner rulings (2026-09-02)

1. **The button at the right of the sub-tab row orders the sub-tabs.** Tapping it opens a sheet where the user arranges the tabs (Portfolio, NFTs, and whatever tabs powerups add later) in the order they want. The order persists and Home reads it.
2. **The row is static while it fits, a carousel when it does not.** Measured per device, not by breakpoint: on a wide phone the row holds still exactly as today; on a narrower one where the labels overrun the width, the row scrolls horizontally with the same travelling underline.

Defaults taken where the owner left it open: **drag to reorder** (handle on each row, no new dependency — reanimated + gesture-handler are already in the app); **order only, no hiding** (hiding is a separate decision; the sheet's copy must not promise it).

## Placement

- **Order state and persistence → `packages/shared`** (cross-platform logic): `STORAGE_KEYS.HOME_TABS_ORDER`, a hook `useHomeTabOrder(defaultKeys)` returning `{ order, setOrder }` that reconciles a stored order against the keys the app currently offers: stored keys that no longer exist are dropped, new keys are appended in default order, so a powerup tab installed later shows up without the user losing their arrangement. Contract type `HomeTabOrderSheetPropsBase` in `packages/shared/src/types/ui`.
- **Sheet and row → `apps/mobile`**: `HomeTabOrderSheet` (mobile-only sheet on `BottomSheetContainer` + `SheetTitle`, one state → sheet per DESIGN.md §Sheets), the drag list, and the `UnderlineTabs` overflow behaviour.
- Web/extension are out of scope; they keep their own sub-tab rows until their redesign.

## The sheet

- Opened by `PortfolioSubTabs`' right-hand button (today `onVisibilityPress`, a stub; rename to `onOrderPress`, accessibility label `accessibility.portfolio_order` — EN "Arrange tabs", ES to be written following the neighbouring keys' voice and flagged for the owner).
- Title `home.tabs.order.title` — EN "Arrange tabs"; a one-line hint `home.tabs.order.hint` — EN "Drag to change the order." Rows: one `ListRow` per tab with the tab's label and a drag handle (a `DotsSixVertical` glyph from phosphor, `text.tertiary`); the active row lifts to `surface.raised` with the standard shadow while dragged and the others make room on the `drift` beat. Reduce motion: reorder still works, no lift animation.
- Order applies live (the row behind the sheet re-flows as rows are dropped) and persists on drop. No Save button; closing the sheet is done.
- Tokens only; gap 20 between the hint and the list; 4/8/12 inside rows. i18n EN+ES for every string.

## The row

- `UnderlineTabs` measures its tabs already (`onLayoutMeasured`). Add one measurement of the container width; when the sum of tab widths + gaps exceeds it, render the tabs inside a horizontal `ScrollView` (`showsHorizontalScrollIndicator={false}`, no paging) with the underline inside the scrolled content; otherwise render exactly as today. On `activeKey` change in overflow mode, scroll the active tab into view (`scrollTo`, animated on the `drift` beat, instant under reduce motion).
- The right-hand order button stays outside the scroll, pinned at the row's right edge, in `PortfolioSubTabs`.
- Fade at the row's trailing edge in overflow mode: `water.fadeTop` rotated is the wrong token; use a horizontal gradient of `[withAlpha(depth.column, 0), depth.column]` no wider than `spacing['2xl']` so the cut reads as continuation. Skip it if it fights the underline; report.
- Home's `subTabs` memo reads `useHomeTabOrder(['portfolio', 'nfts'])` and maps keys to labels; a key without a label is not rendered.

## Tests

- shared (Vitest): reconciliation (drops unknown, appends new, keeps user order), persistence round-trip via the storage mock, default order when nothing is stored.
- mobile (Jest): the sheet lists tabs in the stored order and calls `setOrder` on drop (drive the gesture through the existing reanimated/gesture-handler mocks the repo uses — see `BalanceHeader.test.tsx` for the pattern); Home renders the row in the stored order; `UnderlineTabs` stays a plain row when the measured content fits and wraps in a ScrollView when it does not; the active tab is scrolled into view on change.

## Verification

`pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/mobile`, then at close `pnpm format:check`, full turbo, `node scripts/check-i18n.mjs`. Owner review on device: iPhone 16 stays static; a narrow simulator (iPhone SE) scrolls.
