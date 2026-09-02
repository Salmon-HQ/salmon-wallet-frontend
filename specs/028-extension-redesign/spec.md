# Feature Specification: The extension side panel becomes the mobile app, on the DOM

**Feature Branch**: `feat/redesign-mobile-home` · spec dir `028-extension-redesign`
**Created**: 2026-09-02 · **Status**: Draft (owner away; lot 1 started under granted autonomy, later lots wait for the answers below)

## Owner rulings (2026-09-02)

1. **As close to identical to mobile as possible.** Same screens, same kit, same tokens, same motion vocabulary, same copy. Where a RN behaviour cannot be mirrored, the DOM alternative is chosen deliberately and written down here.
2. **Recycle everything recyclable.** Contracts (`packages/shared/src/types/ui` `PropsBase`), tokens (`createSemantic(mode)`), motion constants (`packages/shared/src/motion`), hooks, contexts, i18n and the ground geometry (`scales`, `flesh`, `depthField`) are shared already; only the rendering layer is rebuilt. `apps/mobile` must never import `packages/ui`; `packages/ui` must never import RN.
3. **The surface is the side panel**: browser-controlled width (~320–400px, user-resizable), full viewport height, no safe areas, no status bar, mouse + keyboard. `entrypoints/popup` stays the dApp-approval window only.
4. Tidy: spec per lot, kit first, screens second, one commit per lot, full CI each time.

## Parity map (from the 2026-09-02 audit)

- **Theme**: `packages/ui/src/theme/index.ts` freezes `semantic` (dark) into an MUI theme at module load; no `ThemeProvider`, no light mode, `STORAGE_KEYS.APPEARANCE` has no DOM reader.
- **Kit**: no DOM counterpart for Card, ListRow, IconBubble, KeyValueRow, SectionLabel, Chip/ChipGroup, UnderlineTabs, SearchField, SkeletonRow/ShimmerRect, StateBlock, ReceiptScreen, PortfolioSubTabs, BottomSheetContainer (DOM has `BaseSheetDialog`), HomeTabOrderSheet, DerivedAccountsSheet, PowerupsFab. Counterparts exist but drifted for ScreenHeader, WarningNotice, Button, BalanceCard (≈ BalanceHeader), WalletHeader, NftCard, TokenList, Thermocline, DepthBackground, ScalesBackground, FleshBackground, LoadingScreen, LockScreen, OnboardingLayout, BrandMark.
- **Motion**: fifteen mobile files use `packages/shared/src/motion`; zero extension files do.
- **Screens**: Home, Swap, Collectibles, Send (single page vs mobile's 4 steps), Auth flow, Activity (via ui), Token detail, Wallets (a sheet, not a screen), no Settings route (ui has `SettingsPanelStack` unused), no Powerups; extension-only: dApp connect/sign/approve, Lock route.

## DOM alternatives (decided)

| RN                                                                        | DOM                                                                                                                                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reanimated sink/float, underline travel, drag lift                        | Web Animations API / CSS transitions driven by the same `motionMs` / `SINK_FLOAT_*` constants; `prefers-reduced-motion` mirrors `useReducedMotion`                  |
| expo-linear-gradient                                                      | CSS `linear-gradient` from the same tokens (`water.gradient`, `water.fadeTop/Bottom`, `surface.raisedFade`)                                                         |
| react-native-svg patterns (scales, flesh)                                 | serialised `background-image` data URIs (already the DOM rule, DESIGN.md §The water column)                                                                         |
| expo-blur                                                                 | `backdrop-filter` on at most two fixed elements per document (DESIGN.md degradation ladder rung 4), opaque under `prefers-reduced-transparency`                     |
| gesture-handler swipe (balance) / drag (reorder) / pan-to-dismiss (sheet) | balance: arrow keys + click on dots + horizontal wheel; reorder: pointer-events drag with keyboard fallback (move up/down); sheet: Escape + backdrop click, no drag |
| expo-haptics                                                              | none (no `navigator.vibrate`)                                                                                                                                       |
| safe areas, `useTabChrome` bottom offset                                  | none; the panel's own padding tokens                                                                                                                                |
| Status bar / nav theme                                                    | `color-scheme` + `<meta name="color-scheme">` per mode                                                                                                              |

## Lots (sequential)

1. **Theme on the DOM** — `packages/ui` gains `ThemeProvider` consumption from `@salmon/shared` (`ThemeContext`, persisted in `STORAGE_KEYS.APPEARANCE`, system scheme via `matchMedia`), the resolved `createSemantic(mode)` exposed as CSS custom properties on the root (`--sw-<group>-<token>`) **and** as a `useSemantic()` hook for styled code; the MUI theme becomes a thin adapter built from the live semantic (rebuilt on mode change) so nothing breaks while the kit is ported; `createShadows(mode)` likewise. Extension `sidepanel/main.tsx` and `popup/main.tsx` mount the provider. Contrast tests already cover both modes.
2. **Kit on the DOM** — the missing components, one file each under `packages/ui/src/components/<Name>/`, each implementing the shared `PropsBase` (adding contracts to `packages/shared/src/types/ui` where mobile kept them app-local, then pointing mobile at the shared contract), styled from `useSemantic()`, motion from the shared constants. Existing drifted counterparts are rebuilt to the mobile anatomy. Storybook-free; `ui-test-authoring` tests per component.
3. **Home shell** — Home as on mobile: wallet header, balance block (chain pages, chip off-mainnet, hint hue), Portfolio | NFTs sub-tabs with the user's order (shared `useHomeTabOrder`), the NFTs tab following the network and sinking on Bitcoin, content region with the verb, ground + fades from `water.*`, Receive sheet, derived-accounts sheet.
4. **Screens** — Wallets (a screen, not a sheet), Activity + transaction detail, Send as the mobile 4-step flow, Token detail, NFT detail with send/burn, Settings route composing `SettingsPanelStack` with the Appearance row, onboarding/auth screens on `OnboardingLayout`, Lock on `LockScreen` with the wait. Powerups surface follows the same flag as mobile (off for the submission).
5. **Extension-only** — dApp connect / sign / approve and the popup window restyled on the kit (bedrock rule: no water, no scales, opaque).

## Open questions (owner)

1. **MUI**: keep it as the base under the kit, or remove it as the kit replaces each usage? (Default: keep as an adapter in lot 1, remove at the end of lot 4 if nothing reads it.)
2. **Send**: mirror mobile's 4-step stack in the panel, or keep one page with sections? (Default: mirror.)
3. **Wallets**: screen like mobile, replacing the switcher sheet? (Default: yes.)
4. **Balance swipe**: with no touch, is keyboard + dots + wheel enough, or add explicit arrows? (Default: keyboard + dots + wheel, arrows only if the dots are too small at 320px.)
5. **Web app**: it shares `packages/ui`; the kit port reaches it automatically but its pages are not rebuilt in this spec. Confirm out of scope.

## Verification

Per lot: `pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/ui --filter=@salmon/extension --filter=@salmon/web`, `pnpm format:check`, `node scripts/check-i18n.mjs`; the extension's Playwright suite when a lot touches a covered page. Owner review in Chrome's side panel at 320 and 400px, both modes.
