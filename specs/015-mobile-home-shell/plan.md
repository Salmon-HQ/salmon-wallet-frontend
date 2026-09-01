# Implementation Plan: Mobile redesign — Home shell (CORE 01) + shared UI primitives

**Branch**: `feat/redesign-mobile-home` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-mobile-home-shell/spec.md`

## Summary

Rebuild the mobile Home screen to the CORE 01 structure of `product.pen`
(header, pinned balance block with chain swipe, in-page Portfolio | NFTs
sub-tabs, asset cards, `+` powerups FAB), remove the bottom tab bar and the
marine snow, and ship the reusable primitive kit every later screen composes
from. Mapping of each design element onto existing code: [research.md](./research.md).
Primitive contracts: [contracts/component-inventory.md](./contracts/component-inventory.md).

## Technical Context

**Language/Version**: TypeScript 5, React Native / Expo (apps/mobile), React 18
**Primary Dependencies**: expo-router, react-native-reanimated, react-native-gesture-handler, react-i18next, `@salmon/shared` (theme tokens, hooks, types)
**Storage**: N/A (existing `useUserConfig` for hidden-balance preference)
**Testing**: Jest + @testing-library/react-native (apps/mobile), Vitest (packages/shared), Maestro (apps/mobile/.maestro)
**Target Platform**: iOS 15+ / Android; extension and web follow in later features
**Project Type**: mobile-app (pnpm + turbo monorepo)
**Performance Goals**: 60 fps chain-swipe and sub-tab transitions; no layout jump on balance load
**Constraints**: aesthetics only from `DESIGN.md` tokens (deep-water), no raw hex; `packages/shared/src/types/ui` contracts unchanged (packages/ui consumes them); crypto/storage untouched
**Scale/Scope**: 1 screen rebuilt, ~7 new primitives, 3 components restyled, 3 components deleted

## Constitution Check

- Ownership: RN code stays in `apps/mobile`; no `@salmon/ui` import; shared contracts extended locally, not modified. ✅
- Security-sensitive paths (crypto/storage/signing) untouched. ✅
- i18n: every new string EN + ES. ✅
- Tests: unit per primitive/component; Maestro smoke re-pointed. ✅

## Decisions folded in on 2026-09-01

- Bitcoin stays inside Portfolio with today's chart / market data / about
  blocks; no asset-detail screen for Bitcoin.
- Sub-tabs are always visible on every chain. Switching to NFTs while the
  balance is on Bitcoin animates the balance back to Solana (existing
  chain-switch motion) before the NFTs content shows.
- Powerup badges use Official / Community / Featured as drawn in `product.pen`.
- Docs live in spec-kit (`specs/015-mobile-home-shell/`), not `docs/`.

## Target layout (from `product.pen` frame `KDq8P`, 390×844)

Read via the Pencil MCP `execute` tool against the tab active in the Pencil app (`filePath` is not honoured).

Vertical, gap 20, padding top 28 / sides 20 / bottom 20. All sizes are the
design reference; implement responsive with the repo's `s()`/`vs()` scalers and
flex, never fixed 390-wide assumptions.

1. **Header row** (space-between, centred)
   - Left: wallet thumb 38×38 r12 (accent-tint fill, fish/wallet icon in
     accent) + column: wallet name (14/700, text primary) / short address
     (11/500, text secondary). Whole group is one press target → wallet
     switcher (existing `WalletSwitcherSheet`).
   - Right: avatar 36×36 circle → opens Settings (existing `SettingsSheet`).
     Replaces the gear icon.
2. **Balance block** (row, align end, space-between)
   - Column: "Total balance" (13/500 secondary) + eye toggle 24×24 →
     `hiddenBalance`; balance value (`typography.balance` style from
     DESIGN.md, tabular nums); row: change "+2.8% this week" (13/700,
     success/danger) + pill "History" (icon 13 + 11/700, hairline border,
     r999) → Activity (for this lote: opens the existing
     `TransactionHistorySheet`; full screen is lote 3); carousel cue: page
     dots (active = 14×4 accent bar, inactive = 4×4 dot) + "→ BTC" hint
     (10/600 secondary) — the balance block swipes horizontally between
     chains exactly as `BalanceCardCarousel` does today (keep
     `onBlockchainChange`, `activeIndex`, dots testIDs
     `balance-carousel-dot-{i}`).
   - Right: Send 42×42 filled accent circle (flesh texture) + Receive 42×42
     outline circle. Keep testIDs `home-send-button` / `home-receive-button`
     and `sendDisabled` for watch-only.
3. **Sub-tabs row** (space-between)
   - Left: segmented text tabs **Portfolio | NFTs** (16/700 active with 48×2
     accent underline; 16/600 secondary inactive). i18n keys
     `tabs.portfolio`, `tabs.nfts` (EN + ES).
   - Right: 36×36 circle "portfolio visibility" button (outline). For this
     lote it renders and is a no-op stub with testID
     `portfolio-visibility-button` (CORE 16 is lote 4).
4. **Content**
   - Portfolio: token cards — r16, padding 16, gap 14: `TokenLogo` 44,
     name (15/700) + ticker (12/500), amount (15/700) + fiat (12/500) right
     aligned. Reuse `TokenListItem`/`TokenList` (restyle, keep
     `token-row-{SYMBOL}` testIDs, badges, press → `TokenInformationSheet`).
     Bitcoin chain keeps its current PriceChart/market-data/about content
     inside Portfolio (no asset-detail screen).
   - NFTs: the content of today's `collectibles.tsx` route, rendered as a
     component (`NftsTab`) inside Home. Route file is deleted.
5. **FAB** `+` 42×42 accent circle, absolute bottom-right (20 from edges +
   safe area), flesh texture, testID `powerups-fab`. Opens a
   `PowerupsLauncherSheet` stub (`BottomSheetContainer`, handle, heading
   "Powerups"; body empty for now — lote 2 fills it).

## Scroll behaviour (important)

- Header row is chrome (stays in `GateContainer`).
- **Portfolio tab**: balance block + sub-tabs row are **pinned**; only the
  token list scrolls beneath them.
- **NFTs tab** (and any future scrollable sub-tab): balance block scrolls
  away with the content; sub-tabs row may stick or scroll — prefer sticky
  sub-tabs (`stickyHeaderIndices`) so the user can switch back without
  scrolling up.
- Switching to NFTs while on Bitcoin: call the same chain-change path the
  dots use (`onBlockchainChange('solana', 0)`) so the balance animates to
  Solana, then render the NFTs content. Sub-tabs never hide per chain.
- Keep the existing top fade gradient and the task-engaged sink/float
  choreography (`TaskChromeContext`, `floatEntering`/`sinkExiting`).

## Removals (delete the files, not just the imports)

- `GlassTabBar/` (all files + test). `Tabs` navigator stays but renders no
  tab bar (`tabBar: () => null`); `collectibles` route deleted (content moves
  into `NftsTab`); `swap` route kept but `href: null` (becomes a powerup in
  lote 2); `settings` route already `href: null`.
- `SubAccountSelector` usage removed from Home. Component files stay (they
  move into the wallet switcher in lote 4).
- Marine snow: strip the floc/snow rendering out of `DepthBackground`
  (component stays — `LoadingScreen`, `(auth)/_layout`, `recover` and the
  tabs layout use it for the water column / depth gradient, and the loading
  screen must keep looking the same minus the snow). Delete
  `packages/shared/src/theme/depthField.ts`, `depthFieldBlizzard.ts`, their
  tests, `depthParallaxScroll` (and its writers in `index.tsx`, `SendSheet`,
  `SwapScreen`, `LockContent`), and the `water.snow` token once nothing uses
  it. Check every consumer (`LockContent`, `SwapScreen`, `SendSheet`,
  `EdgeLight`, `motion/wavefront.ts`, `spacing.ts`, `controlRadius.test.ts`)
  and remove only snow-related code. `ScalesBackground` and the depth
  gradient stay.
- `useTabChrome`: drop tab-bar metrics (`tabBarTotalHeight`,
  `floatingBottomOffset` → recompute from safe-area only), keep header
  metrics.
- Maestro flows / Playwright that reference `tab-home`, `tab-collectibles`,
  `tab-swap` need updating (search `apps/mobile/.maestro`).

## Contracts

- Do **not** change `packages/shared/src/types/ui` contracts
  (`BalanceCardPropsBase`, `ActionButtonRowPropsBase`) — `packages/ui`
  consumes them. Extend locally in `apps/mobile` if needed.
- Every new user-facing string: `t('key', 'Default')` + EN/ES locale entries
  (`packages/shared/src/locales`), per the `i18n-authoring` skill.

## DESIGN.md updates (same lote)

- §"The light theme — rejected" → light mode is now planned (deep-water
  first, light second); rewrite as "Two modes, deep-water first".
- §"The water column — marine snow and the depth ramp" → marine snow removed
  (record why: didn't convince); keep depth gradient/scales.
- §Navigation → no bottom tab bar; in-page sub-tabs; powerups FAB.
- Balance: card with caustics → plain pinned number. (Done — see git diff.)

## Verification

- `pnpm turbo run typecheck --filter=@salmon/mobile --filter=@salmon/shared`
- `pnpm turbo run test --filter=@salmon/mobile --filter=@salmon/shared`
- `pnpm turbo run lint --filter=@salmon/mobile`
- Maestro smoke on iOS Simulator (`apps/mobile/.maestro/`, from that cwd).

## Component consolidation pass (2026-09-01, after wiring)

Problem: the Home components (`BalanceHeader`, `HeaderContent`,
`TokenListItem`, `PowerupsLauncherSheet`, `PortfolioSubTabs`) were built in
parallel with the primitive kit and carry their own local styles for shapes
the kit already owns (circles, pills, cards, rows). Two circles with the same
root must be one component with different props.

Rules for the pass (owner's words: "professional, optimised for reuse via
props/styles"):

- One root per shape. `IconBubble` owns every circular/rounded icon well;
  add a pressable variant (`onPress`, `disabled`, press motion + optional
  flesh texture for `tone: 'accent'`) so Send/Receive/Back/FAB/avatar/thumb are
  all `IconBubble` — no local circle styles anywhere else.
- `Chip` owns every pill (History pill, filters, % shortcuts, provider badge).
- `Card` owns every surfaced block (token row, sheet rows, tiles).
- `ListRow` owns every leading/title/subtitle/trailing row (Browse Powerups
  row, token row body, recipients, activity).
- Components keep their public props and testIDs; only their internals change.
- Delete local StyleSheet entries that the primitive now covers; keep only
  layout glue (gaps, alignment).
- Add a variant/prop to a primitive rather than a one-off style in a consumer;
  document each variant in `contracts/component-inventory.md`.
- Work sequentially, one component at a time, running its tests after each.

## Post-consolidation fixes (owner feedback + first device run, 2026-09-01)

Run AFTER the consolidation pass (same files). Verified manually by the owner
on device — do not automate device interaction.

1. **Header is no longer a gate.** `GateContainer`/`HeaderContent` still play
   the old "compuerta" choreography (the header rises out of frame while
   content sinks) and paint a separate darker band with a rounded bottom that
   overlaps the balance block. In the new design the header sits on the same
   plane as the balance (no band, no overlap — see `product.pen` CORE 01) and
   its task-engaged motion becomes a plain fade/slide consistent with the
   content's sink/float, not a gate lifting. Keep lock-screen behaviour.
   Header layout per `.pen`: thumb 38 + two lines (name 14/700, short address
   11/500) — today it renders one line "Account #1 (9mpJ…SAd3)".
2. **Chain switch happens in place.** Swiping/tapping between chains must not
   slide the whole block (dots, hint, actions) off-screen and back. Dots, the
   "→ BTC" hint, the label and the action circles stay fixed; only the values
   (amount, change, hint text, active dot) transition in place (crossfade /
   the existing value swap motion). Keep the pan gesture.
3. **Balance size**: use `fontSize.display` (36) instead of `balance` (60) +
   `adjustsFontSizeToFit`. The `.pen` uses 38.
4. **FAB icon**: `+` (plus), not lightning — the launcher heading keeps the
   lightning icon; the FAB rotates the plus 45° when the sheet is open.
5. **Token rows**: badges + name + secondary line collide and truncate
   (`SOL · $101.39 · −1.1…`, amounts like `28896.26376 Bo…`). Badges move to
   the trailing side of the name only if they fit, else after the secondary
   line; amounts use the existing compact formatter; secondary line never
   truncates the change.
6. **NFTs grid gutter**: the NFT cards render flush to the left edge under the
   sub-tabs — apply `spacing.screenGutter` to the grid/list content on the
   NFTs tab (regression from the `NftsTab` port).
7. Root `GestureHandlerRootView` now lives in `app/_layout.tsx` (added during
   the device run); remove the per-component root inside
   `BottomSheetContainer` if it is now redundant.

## Cleanup after fixes (015)

- Delete `src/components/NftSeeAllSheet/`, `src/components/NftCarouselSection/`
  (+ skeleton, tests, barrel exports) and the commented-out see-all code in
  `NftsTab.tsx`. They are unreachable: the NFTs grid already shows everything.
