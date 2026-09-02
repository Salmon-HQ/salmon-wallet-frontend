# Feature Specification: The extension side panel becomes the mobile app, on the DOM

**Feature Branch**: `feat/redesign-mobile-home` · spec dir `028-extension-redesign`
**Created**: 2026-09-02 · **Status**: Approved by the owner 2026-09-02 (answers below); lots 1–5 landed 2026-09-02; MUI removed; `check-dom-parity` strict in CI

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

### Lot 1 — what landed (2026-09-02)

- `packages/ui/src/theme/ThemeProvider.tsx` — `SalmonThemeProvider` wraps the
  shared `ThemeProvider` and feeds it `systemScheme` from
  `matchMedia('(prefers-color-scheme: dark)')`, subscribed (a system switch
  moves the app while it is open). It exposes `useSemantic()`, `useThemeMode()`
  and `useShadows()` under the mobile names and shapes, with the same
  fall-back-to-deep-water contract mobile's `useThemedStyles` has, so a kit leaf
  rendered outside the provider is dark rather than a crash.
- `packages/ui/src/theme/cssVars.ts` — `semanticToCssVars(semantic)` flattens
  the resolved set to `--sw-<group>-<token>`, joining every further level with
  another `-`: tuples index by position (`--sw-water-gradient-0`), records take
  their key (`--sw-water-crestShadow-color`, `--sw-chain-hintInk-bitcoin`).
  Token names keep their camelCase so a variable is greppable from its token.
  `applySemanticCssVars` writes them on `document.documentElement` together with
  `color-scheme`, on every mode change.
- `packages/ui/src/theme/index.ts` — the MUI theme is now an adapter:
  `createSalmonTheme(tokens, mode)` builds it from a resolved set, and
  `salmonThemeFor(mode)` memoises one theme per mode in a module `Map` (MUI's
  theme is an identity every styled component is keyed on, so it must not be
  rebuilt per render). `salmonTheme` stays as `salmonThemeFor('dark')`, marked
  `@deprecated`, for consumers not yet inside the provider — dark is unchanged
  byte for byte, which `theme.test.ts` still asserts.
- The three roots (`apps/extension` sidepanel + popup, `apps/web`) mount
  `<SalmonThemeProvider>` where they mounted MUI's `ThemeProvider`; MUI's now
  lives inside ours, which is what lets a mode change rebuild it. Both extension
  html entries declare `<meta name="color-scheme" content="dark light">`.
- Switching, for verification only: the stored `STORAGE_KEYS.APPEARANCE`
  preference and the system scheme. No Settings row — that is lot 4.

Deviations worth knowing: `createShadows` is exposed through `useShadows()` but
is **not** fed into the MUI theme — no MUI slot reads an elevation today, and
wiring one would change dark. No component was restyled; the kit still reads
the static `semantic`, which is the dark set, until lot 2 moves it onto
`useSemantic()`.

### Lot 3.6 — web retired (2026-09-02)

`apps/web` is deleted, with its deploy workflow, its E2E job, its root scripts
and the `packages/ui` components only it read. The extension is the only DOM
app; `.web` platform files in `packages/shared` resolve for it. The mobile
app drops its react-native-web twins too.

### Lots 4–5 — what landed (2026-09-02)

- Lock and the seven onboarding screens on `OnboardingLayout`; Wallets as a
  screen; Settings as mobile's registry with trailing values and switches;
  Activity with the detail in a sheet; token and NFT detail; Send in four
  steps with the NFT on the same flow; the dApp approval views and the popup
  on the kit under the bedrock rule, approval content byte-identical.
- Every DOM component reads `useSemantic()`; MUI, `recharts` and
  `keen-slider` left both manifests; the send-flow state lives once in
  `packages/shared/src/hooks/useSendFlowState.ts`.
- The gate: `scripts/check-dom-parity.mjs` (theme / twins / contract / dead /
  screens) with its own fixtures, strict in CI. Platform differences live only
  in its maps, each with a reason.

## Owner answers (2026-09-02, multiple choice)

1. **MUI**: adapter now; removed at the end of lot 4 if nothing reads it — removed 2026-09-02.
2. **Send**: the mobile 4-step flow.
3. **Wallets**: a screen like mobile, replacing the switcher sheet.
4. **Balance without touch**: keyboard arrows + click on the dots + horizontal wheel; the same keyboard/wheel navigation applies to the sub-tab row when it overflows the panel and must move both ways.
5. **Web**: out of scope — the web app is being retired and will be deleted; it only has to keep building until then.

## Verification

Per lot: `pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/ui --filter=@salmon/extension` (web retired in lot 3.6), `pnpm format:check`, `node scripts/check-i18n.mjs`; the extension's Playwright suite when a lot touches a covered page. Owner review in Chrome's side panel at 320 and 400px, both modes.
