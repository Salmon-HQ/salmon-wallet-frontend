# `apps/mobile` architecture audit — 2026-09-01

Read first: `apps/mobile/AGENTS.md`, `DESIGN.md` §Hierarchy/§Layout/§Navigation/§Sheets, `specs/015-mobile-home-shell/contracts/component-inventory.md`, `specs/019-token-detail/spec.md`. Skipped per instruction: `AccountPanels`, `AddressPanels`, `SettingsSelectors`, `SecurityPanel`, `BackupPanel`, `PrivateKeyPanel`, `AboutPanel`, `SupportSelector`, `TrustedAppsSelector`. `.code-review-graph/graph.db` exists but is stale (built 2026-08-19, before the whole redesign); every claim below is grepped and read from source instead.

---

## 1. Inventory

Legend: **KIT** = the redesign primitive kit · **KIT-SCREEN** = kit-era screen piece (composes the kit, `semantic.*`, `s()/vs()` + tokens) · **LEGACY** = pre-redesign styling (`BlurContainer`, `colors.*`, hand-drawn rows, deprecated `fontSize.*` aliases, raw numbers) · **MIXED** = kit shell with legacy branches. LOC excludes `.test.*`. Consumers are production files only (tests excluded) and exclude the component's own directory.

### `src/components`

| Dir | LOC | Class | Consumers |
|---|---:|---|---|
| `Activity` (10 files) | 1507 | MIXED — `TransactionItem`/`ActivityStates` KIT-SCREEN; `AddressCopyRow`, `ConversionRateDisplay`, `ExplorerLinkButton`, `transactionTypes` LEGACY (`colors.*`, `BlurContainer`) | 6 (`activity.tsx`, `powerups.tsx`, `send/index.tsx`, `(tabs)/swap.tsx`, `TransactionDetail/*`, `TransactionSuccessScreen`) |
| `BalanceHeader` | 509 | KIT-SCREEN | 1 (`(tabs)/index.tsx`) |
| `BlurContainer` | 175 | LEGACY (the pre-redesign card material) | 6 real `<BlurContainer>` users: `Activity/ExplorerLinkButton`, `NftCard`, `TokenList/TokenListSkeleton`, `TokenDetail/TokenAbout`, `TokenDetail/TokenMarketData`, `TokenSelector/TokenSelectorModal` (+ `BlurTargetProvider` in `(tabs)/_layout.tsx`, `BottomSheetContainer`) |
| `BottomSheetContainer` | 477 | KIT (sheet host; `colors.sheet.*`, `colors.background.secondary` remain) | 4 sheets + `activity.tsx` |
| `BottomSheetTitleHeader` | 92 | LEGACY (`colors.text.primary`, `fontSize.title` unscaled, own back button) | **1** (`TokenSelectorModal`) |
| `BrandMark` | 153 | KIT | 6 |
| `BridgeScreen` | 680 | LEGACY (`colors.*`, `ms(24*lineHeight)`, deprecated aliases) | 2, both inside `SwapScreen` |
| `Button` | 491 | KIT (`colors.button.*`, `colors.text.*` residue) | 36 |
| `Card` | 135 | **KIT** | 33 |
| `Chip` | 254 | **KIT** | 7 |
| `ConfirmSheet` | 273 | MIXED (hand-drawn sheet title, `colors.text.*`, `fontSize.lg`) | 5 (all skipped panels) |
| `DepthBackground` | 52 | KIT | 22 |
| `DerivedAccountCard` | 277 | LEGACY (`colors.card.*`, `colors.skeleton.*`, `borderRadius: 6`) | 4 (`(auth)/derived-accounts.tsx` + 3 panels) |
| `FleshBackground` | 98 | KIT | 4 |
| `GradientBackground` | 35 | LEGACY | **0 — dead** |
| `Icon` (SvgIcons) | 212 | LEGACY (`colors.text.*`) | 5; 4 of 9 exports unused (see §4) |
| `IconBubble` | 292 | **KIT** | 27 |
| `InputAddress` | 348 | LEGACY (`colors.scanner.*`, `colors.input.*`, `fontSize: 13/18`, `minHeight: 56`) | **0 JSX consumers** — the barrel only re-exports `useAddressValidation` from `@salmon/shared` |
| `KeyValueRow` | 115 | **KIT** | 13 |
| `ListRow` | 161 | **KIT** | 18 |
| `LoadingScreen` | 1002 | KIT-SCREEN (signature component; `colors.accent/text/background` residue, `lineHeight: 32/24/16`) | 9 |
| `LockOverlay` | 707 | KIT-SCREEN (`colors.input.*` in the password field) | 3 |
| `NftCard` | 361 | LEGACY (`BlurContainer`, `colors.overlay/skeleton/text.balance`) | 4 real (`nft/[id]/index`, `NftsTab`, `TransactionDetailTransfer`, `NftFlowContext`) |
| `NftsTab` | 652 | **LEGACY** (`colors.*` ×11, `ms(16)`/`ms(13)`, `vs(48)/s(24)/vs(40)/vs(8)/vs(16)`, `fontWeight:'600'`) | 3 |
| `OnboardingLayout` | 660 | KIT-SCREEN for spec 013 (its own grid system, not the redesign kit) | 13 |
| `PasswordInput` | 206 | LEGACY (`colors.input.*`, unscaled `fontSize.*`) | 4 |
| `PendingActivityBanner` | 120 | KIT-SCREEN (unscaled `fontSize.sm/xs`) | 1 (`app/_layout.tsx`) |
| `PendingValue` | 65 | KIT | 4 (`BalanceHeader` + 3 swap files) |
| `PortfolioSubTabs` | 93 | **KIT** | 1 |
| `PowerupBadge` | 94 | **KIT** | 2 |
| `PowerupsFab` | 98 | **KIT** | 1 |
| `PressSpecular` | 78 | KIT | 4 |
| `PriceChart` | 461 | MIXED (kit `UnderlineTabs` inside; `colors.skeleton.*`, `fontSize.base` unscaled) | 2 |
| `QRCode` | 52 | KIT (`'#FFFFFF'`/`'#000000'` are legitimate QR contrast) | 1 |
| `QRScanner` | 515 | LEGACY (`colors.scanner.*` = raw off-palette hex `#1a1a2e`/`#2a2a4e`/`#4a4a6e`) | 4 |
| `ReceiveSheet` | 317 | MIXED (hand-drawn title + copy button + chain badge; `colors.button/text`, `ms(24*lineHeight)`) | 2 |
| `ScalesBackground` | 185 | KIT (`'#FFFFFF'`/`'#fff'` are mask stops) | 23 |
| `ScreenHeader` | 252 | **KIT** | 22 |
| `SearchField` | 75 | **KIT** | 2 |
| `SectionLabel` | 59 | **KIT** | 13 |
| `SeedPhrase` | 516 | LEGACY (`colors.input/card/text/accent`) — but security-sensitive (`useSecretScreen`) | 5 |
| `Send` (4 files) | 481 | KIT-SCREEN (`TokenSelectList`, `RecipientInput` exemplary); `SendFailure` has `colors.text.primary` | 7 |
| `SettingsScreenLayout` | 184 | KIT-SCREEN (unscaled `fontSize.body`) | 20 (all skipped panels) |
| `ShimmerRect` | 81 | KIT | **1** (`Send/TokenSelectList`) |
| `StepIndicator` | 98 | LEGACY (`colors.step.*` = raw `#FF5C45`) | **1** (`ScreenHeader`) |
| `SubAccountSelector` | 83 | MIXED (uses `Chip`; `colors.text.secondary`) | 2 |
| `SwapScreen` (11 files) | 1949 | **LEGACY — off-limits** (`BlurContainer`, `colors.*`, `ms(n*lineHeight)`, deprecated aliases ×30) | 2 |
| `Thermocline` | 188 | KIT | 3 |
| `TokenDetail` (`TokenAbout`, `TokenMarketData`) | 488 | **LEGACY** (`BlurContainer`, `colors.skeleton/change/text/accent`, `ms(9)*lineHeight`) | 2 — only Home's Bitcoin column |
| `TokenList` (5 files) | 728 | MIXED — `TokenListItem` KIT for Solana/ETH, LEGACY for the Bitcoin branch; `TokenListSkeleton` fully LEGACY | 2 |
| `TokenLogo` | 62 | LEGACY fallback (`colors.background.tertiary`, `colors.text.secondary`) | 11 |
| `TokenSelector` (`TokenSelector.tsx`) | 226 | LEGACY | **0 — dead** |
| `TokenSelector` (`TokenSelectorModal.tsx`) | 520 | LEGACY (17 `colors.*`, own skeleton, own search input) | 1 (`SwapScreen`) |
| `TransactionDetail` (7 files) | 1094 | **KIT-SCREEN** (clean) | 1 (`activity.tsx`) |
| `TransactionSuccessScreen` | 574 | KIT-SCREEN but a *different* receipt shape than `send/success.tsx`; 4 deprecated `fontSize` aliases | 3 (`nft/[id]/success`, `send/success`, `SwapScreen`) |
| `UnderlineTabs` | 281 | **KIT** | 7 |
| `WalletHeader` | 363 | KIT-SCREEN (`lineHeight: vs(18)/vs(15)`, `size={s(23)}`) | 5 |
| `WalletInitErrorScreen` | 100 | LEGACY (`colors.background/text`) | 1 (`app/_layout.tsx`) |
| `WarningNotice` | 95 | KIT (`colors.text.primary`, unscaled `fontSize.sm`, `marginTop:1/6`, `marginBottom:2`) | 18 |
| `WatchOnlyBadge` | 56 | MIXED (`colors.text.secondary`, unscaled `fontSize.caption`) | 2 |

### `hooks/`, `src/contexts`, `src/utils`, `src/settings` — all alive, none dead

| File | LOC | Class | Consumers (prod) |
|---|---:|---|---|
| `hooks/useBiometricAuth.ts` | 424 | logic | 6 |
| `hooks/useBottomSheetChrome.ts` | 31 | KIT | 4 sheets |
| `hooks/useCopyFeedback.ts` | 102 | KIT | 8 |
| `hooks/useKeyboardHeight.ts` | 47 | logic | 6 |
| `hooks/useMembraneMaterial.ts` | 63 | KIT | 1 (`Thermocline.native`) |
| `hooks/usePressMotion.ts` | 100 | KIT | 3 (`IconBubble`, `PrimaryButton`, `SecondaryButton`) |
| `hooks/useSecretScreen.ts` | 90 | security | 7 |
| `hooks/useTabChrome.ts` | 57 | KIT | 19 |
| `hooks/useTokenDetail.ts` | 108 | KIT (spec 019) | 1 (`token/[id].tsx`) |
| `src/contexts/DeveloperModeContext.tsx` | 15 | logic | 8 |
| `src/contexts/NftFlowContext.tsx` | 404 | logic | 6 |
| `src/contexts/SendFlowContext.tsx` | 297 | logic | 7 |
| `src/contexts/TaskChromeContext.tsx` | 82 | logic | 4 |
| `src/utils/haptics{,.native}.ts` | 29 | util | 6 |
| `src/utils/motion.ts` | 52 | KIT | 28 |
| `src/utils/sinkAndFloat.ts` | 178 | KIT | 11 |
| `src/utils/useWaitPassage.ts` | 40 | KIT | 3 |
| `src/settings/panelRegistry.tsx` | 463 | screen wiring | 1 (`settings/[panel].tsx`) |
| `src/settings/returnTo.ts` | 11 | logic | 2 |
| `src/settings/types.ts` | 14 | types | many |
| `src/icons.ts` | 132 | KIT | 59 |
| `utils/{localAuthentication,secureStore}{,.native}.ts` | 88 | native shim | 2 each |

---

## 2. Duplicates to unify

### D1 — Seven skeleton implementations → one `Skeleton` primitive · **L**

Files: `src/components/TokenList/TokenListSkeleton.tsx` (123, `BlurContainer` + `ContentLoader`), `src/components/Activity/ActivityStates.tsx:31-68`, `src/components/NftCard/NftCard.tsx:245-306`, `src/components/DerivedAccountCard/DerivedAccountCardSkeleton.tsx` (120), `src/components/TokenSelector/TokenSelectorModal.tsx:92-125`, `src/components/PriceChart/PriceChart.tsx:134-179` (two: chart + period selector), `src/components/TokenDetail/TokenAbout/TokenAbout.tsx:72-84`, `src/components/TokenDetail/TokenMarketData/TokenMarketData.tsx:74-98`, plus the only non-`ContentLoader` one, `src/components/ShimmerRect/ShimmerRect.tsx` (used once, in `Send/TokenSelectList.tsx:114`).

Proposed: keep **`ShimmerRect`** as the atom (it is already reduce-motion aware) and add one composed `SkeletonRow` on top of `Card`/`ListRow`:
`<SkeletonRow leadingSize?: number, lines?: 1|2, trailingWidth?: number, count?: number, accessibilityLabel: string />`. Every `ContentLoader` block above collapses to `<SkeletonRow>` at a `Card` padding. Delete `TokenListSkeleton.tsx` and `DerivedAccountCardSkeleton.tsx`; keep `NftCardSkeleton` (grid tile, different aspect) but re-base it on `ShimmerRect`.

Consumers to re-point: `(tabs)/index.tsx:854`, `TokenList/TokenList.tsx:95,118`, `activity.tsx:210`, `NftsTab.tsx:467-468`, `(auth)/derived-accounts.tsx:62-67`, `TokenSelectorModal.tsx:345`.

Risk: **medium** — `ContentLoader` is `react-content-loader`'s SVG; swapping to the `ShimmerRect` gradient changes the loading look everywhere at once. `__tests__/components/token-list-refresh.test.tsx` asserts loading states. Reduce-motion behaviour differs (`ContentLoader` animates unconditionally; `ShimmerRect` does not).

### D2 — `TokenMarketData` / `TokenAbout` vs `token/[id].tsx`'s inline versions · **M**

Files: `src/components/TokenDetail/TokenMarketData/TokenMarketData.tsx` (304, `BlurContainer` + `colors.*`), `src/components/TokenDetail/TokenAbout/TokenAbout.tsx` (163, same), vs `app/(app)/token/[id].tsx:222-304` which re-draws both as `Card` + `KeyValueRow`.

Proposed: extract `token/[id].tsx`'s two blocks into `src/components/TokenDetail/MarketDataCard.tsx` and `AboutCard.tsx` (kit-composed), prop surface `{ data, symbol, loading }` and `{ description, contractAddress?, website?, loading }`. Home's Bitcoin column then renders the same two cards; the barrel exports stay named the same so `src/components/index.ts` does not break.

Consumers to re-point: `app/(app)/(tabs)/index.tsx:876-891`, `app/(app)/token/[id].tsx`. Then delete the two legacy dirs (they are the only remaining `BlurContainer` consumers outside swap and `NftCard`).

Risk: low. `__tests__/app/token-detail-screen.test.tsx` and `__tests__/home-*.test.tsx` pin testIDs (`token-detail-market-data`, `token-detail-about`) — keep them.

### D3 — Four hand-drawn sheet titles → one `SheetTitle` · **S**

Files: `src/components/ReceiveSheet/ReceiveSheet.tsx:103,232-239`, `src/components/Send/TokenPickerSheet.tsx:43,71-81`, `src/components/ConfirmSheet/ConfirmSheet.tsx:145-149,230-243`, `src/components/BottomSheetTitleHeader/BottomSheetTitleHeader.tsx` (its own back button, only consumer `TokenSelectorModal`).

The first two are byte-identical styles (`fontSize.headline`, `semiBold`, centred, `letterSpacing.snug`, `lineHeight.condensed`) written twice; `TokenPickerSheet` even adds `marginBottom: ms(12)` where `ReceiveSheet` does not.

Proposed: `<SheetTitle>{children}</SheetTitle>` (optionally `leading?: ReactNode` for `ConfirmSheet`'s icon) living next to `BottomSheetContainer`, passed as its `title`. Retire `BottomSheetTitleHeader` once `TokenSelectorModal` moves (swap — defer).

Risk: low. `ReceiveSheet.test.tsx`, `ConfirmSheet.test.tsx` select by text, not style.

### D4 — Two success/receipt screens · **M**

Files: `src/components/TransactionSuccessScreen/TransactionSuccessScreen.tsx` (573, the *exchange* receipt: token-mark hero, arrow, rate/fee block) vs `app/(app)/send/success.tsx` (188, CORE 07: `IconBubble` 88 seal, title, `Card` receipt of `KeyValueRow`s). `app/(app)/nft/[id]/success.tsx` (86) is a thin wrapper over the former.

The split is documented and deliberate (`send/success.tsx:1-19`) *because restyling the shared one would have redrawn swap's receipt*. That reasoning is now the only thing keeping two receipts alive.

Proposed: promote `send/success.tsx`'s composition to `src/components/ReceiptScreen/` with `{ tone: 'transfer'|'exchange', title, body, rows: KeyValueRowProps[], primary, secondary, explorerUrl?, settling? }`. Re-point `nft/[id]/success.tsx`; leave `SwapScreen`'s call on `tone="exchange"` untouched.

Risk: medium — `TransactionSuccessScreen.test.tsx` and the Maestro `tx-success-*` id vocabulary must survive. Swap is off-limits, so the `exchange` branch must render pixel-identically.

### D5 — `TokenLogo` fallback vs `IconBubble` · **S**

`src/components/TokenLogo/TokenLogo.tsx:47-57` draws its own fallback letter bubble on `colors.background.tertiary` / `colors.text.secondary` with `fontSize: ms(size * 0.32)`. The component inventory rules this fallback is `IconBubble` tone `ink`.

Proposed: `TokenLogo` renders `<IconBubble size shape="circle" tone="ink">` for the fallback branch; drop its two `colors.*`. Prop surface unchanged, 11 consumers untouched.

Risk: low. Also fixes `TokenListItem.tsx:144` (`size={s(33)} borderRadius={16.5}` — the last raw-number logo in the app).

### D6 — Three address inputs · **M**

`src/components/InputAddress/InputAddress.tsx` (312, **0 JSX consumers**), `src/components/BridgeScreen/RecipientAddressInput.tsx` (228, legacy, bridge-only), `src/components/Send/RecipientInput.tsx` (129, kit, the reference implementation).

Proposed: delete `InputAddress.tsx` (see §4 — the barrel must keep re-exporting `useAddressValidation` from `@salmon/shared` and the `ValidationState`/`BlockchainType` types, which 15 files import through it). Point `RecipientAddressInput` at `Send/RecipientInput` later, with swap/bridge.

Risk: low for the deletion (verified `<InputAddress` = 0 occurrences), **but** `src/components/InputAddress/index.ts` is a live type/hook shim — do not delete the directory, only the `.tsx`.

### D7 — Row variants that could share `ListRow` · **M**

- `app/(app)/wallets.tsx:272-395` (`WalletCard`) hand-draws a row inside `Card` because it carries a toggle and inline rename. Justifiable, but its `walletRow`/`walletInfo`/`nameRow`/`walletName`/`walletBalance` styles duplicate `ListRow`'s exactly. Proposal: `ListRow` gains `trailing` already; add nothing — instead make `WalletCard` use `ListRow` with a `titleAccessory` for the badge and a `trailing` toggle.
- `src/components/TokenList/TokenListItem.tsx:126-180` Bitcoin branch is the last hand-drawn row (`bitcoinContainer`…`bitcoinAmount`, 8 styles, `colors.change.*`, `colors.text.primary`, `fontSize.lg/xl`, `letterSpacing: ms(-0.09, 0.3)` raw). Proposal: it is a `ListRow` with `emphasis="strong"` too — the only difference is that it is not pressable, which `ListRow` already supports (`onPress` optional).
- `src/components/Activity/AddressCopyRow.tsx:160-207` (`colors.background.card`, `colors.border.default`, `width/height: 32`) is a `KeyValueRow` + `IconBubble` 32.

Risk: low–medium. `TokenListItem.test.tsx` covers the Bitcoin branch; `home-*.test.tsx` selects `token-row-*` ids.

### D8 — Three loading idioms for the same wait · **S**

`ActivityIndicator` raw: `(tabs)/index.tsx:686`, `(auth)/derived-accounts.tsx:212`, `NftsTab.tsx:301` (all `size="large" color={colors.accent.primary}`) — against `LoadingScreen` (the signature wait) and the skeleton idiom. DESIGN.md §Sheets: "the loading state is the `ContentLoader` pulse rather than a spinner."

Proposed: replace the three full-screen spinners with `LoadingScreen` or `SkeletonRow` (D1). Leave the small in-control indicators (`Button`, `RecipientInput`, `PendingActivityBanner`, `NftCard`) alone.

### D9 — Empty/error states drawn five times · **M**

`src/components/Activity/ActivityStates.tsx:77-104` (the canonical pair), `app/(app)/(tabs)/index.tsx:1053-1080` (`emptyState`/`emptyStateText`/`emptyStateSubtext`/`retryText`, all `colors.*`), `src/components/NftsTab/NftsTab.tsx:544-563`, `app/(app)/powerups.tsx:128-132`, `src/components/TokenSelector/TokenSelectorModal.tsx` (swap).

Proposed: promote `ActivityStates`' `EmptyState`/`ErrorState` out of `Activity/` into `src/components/StateBlock/` with `{ title, body?, onRetry?, retryLabel?, testID }`. Re-point Home, NftsTab, powerups; keep the `ActivityEmptyState`/`ActivityErrorState` barrel aliases so `activity.tsx` is untouched.

Risk: low. `activity-empty` / `activity-retry-button` testIDs must survive.

### D10 — Two search inputs · **S**

`src/components/SearchField/SearchField.tsx` (kit, 75 LOC) vs `src/components/TokenSelector/TokenSelectorModal.tsx:331` (own `TextInput` + `colors.*`). Swap-only — **list, don't touch.**

---

## 3. Hardcoded styles

### 3a. Raw hex — 8 occurrences, 6 of them legitimate

| File:line | Value | Verdict |
|---|---|---|
| `src/components/QRCode/QRCode.tsx:8,9` · `QRCode.native.tsx:8,9` | `'#FFFFFF'` / `'#000000'` | **Keep** — QR module contrast, not a theme colour |
| `src/components/ScalesBackground/ScalesBackground.tsx:32,100,159,160` | `'#FFFFFF'` / `'#fff'` | **Keep** — SVG mask/gradient stops, not ink |

The real hardcodes are hidden one level down, inside `packages/shared/src/theme/colors.ts` (a *legacy* palette, not `semantic`): `colors.scanner.*` = `#1a1a2e`, `#2a2a4e`, `#4a4a6e`, `#8b8b9e`, `#6b6b7e`; `colors.step.active` = `#FF5C45`; `colors.button.secondaryBackground` = `#2a3441`; `colors.card.borderActive` = `#FF5C45`; `colors.sheet.handle` = `#b9b9b9`; `colors.palette.*` = eight raw brand hexes. Every `colors.*` row below is therefore a hex in disguise.

### 3b. `colors.*` legacy palette — 149 occurrences in 44 non-skipped, non-swap files

Direct token mappings (`semantic` groups verified: `depth`, `water`, `surface`, `text`, `border`, `status`, `change`, `state`, `accent`):

| File:line(s) | Legacy token | Should be |
|---|---|---|
| `app/_layout.tsx:92` · `(tabs)/_layout.tsx:106` · `(tabs)/index.tsx:735,1026` · `(auth)/success.tsx:151` · `LoadingScreen.tsx:698` · `WalletInitErrorScreen.tsx:75` | `colors.background.primary` | `semantic.depth.abyss` |
| `(tabs)/index.tsx:1056` · `Activity/AddressCopyRow.tsx:165,200` · `Activity/ExplorerLinkButton.tsx:237` · `DerivedAccountCard.tsx:82` · `DerivedAccountCardSkeleton.tsx:113` | `colors.background.card` / `colors.card.background` | `semantic.surface.raised` |
| `TokenLogo.tsx:51` | `colors.background.tertiary` | `semantic.surface.crest` (or D5: drop for `IconBubble`) |
| `(tabs)/index.tsx:1075,686` · `(auth)/derived-accounts.tsx:212` · `NftsTab.tsx:301,340,539,573` · `TokenList/TokenList.tsx:112,113` · `TokenAbout.tsx:158` · `SeedWordGrid.tsx:80` · `PasswordInput.tsx:45` · `DerivedAccountCard.tsx:102` · `LoadingScreen.tsx:943` · `+not-found.tsx:47` | `colors.accent.primary` | `semantic.accent.ink` |
| `NftsTab.tsx:528,530` | `colors.accent.tint` / `.border` | `semantic.accent.tint` / `semantic.accent.ink` |
| `(tabs)/index.tsx:1069` · `NftsTab.tsx:561` | `colors.text.disabled` | `semantic.text.disabled` |
| 38 sites: `colors.text.primary` / `.secondary` / `.tertiary` (`Activity/*`, `Icon/SvgIcons.tsx:16,46,64,83,101,119,149,165,180`, `SeedPhrase/*`, `PasswordInput`, `InputAddress`, `WatchOnlyBadge:31,49`, `WarningNotice:75`, `BottomSheetTitleHeader:41,76`, `ConfirmSheet:237,247`, `ReceiveSheet:235,255`, `SubAccountSelector:33`, `WalletInitErrorScreen:80,87`, `TokenListItem:357`, `OnboardingText:53`, `SendFailure:83`, `(auth)/*`, `+not-found:39`) | `colors.text.*` | `semantic.text.*` (1:1) |
| `(auth)/success.tsx:154` · `AddressCopyRow.tsx:168` · `BlurContainer.tsx:86` · `BottomSheetContainer.tsx:436` · `SeedWordGrid.tsx:63` | `colors.border.default` / `colors.card.border` | `semantic.border.default` / `semantic.border.raised` |
| `TokenListItem.tsx:38` · `transactionTypes.tsx:42,43` · `TokenMarketData.tsx:125,126,133,134` | `colors.change.positive/negative` | `semantic.change.positive/negative` |
| `PrimaryButton.tsx:89,67,109` · `ReceiveSheet.tsx:290,303` | `colors.button.primaryBackground/primaryText` | `semantic.accent.fill` / `semantic.accent.onFill` |
| `SecondaryButton.tsx:123` · `TextButton.tsx:76` · `InputAddress.tsx:267` · `ScreenHeader.tsx:193` | `colors.button.disabledOpacity` | `semantic.state.disabledOpacity` |
| `NftCard.tsx:230` | `colors.text.balance` | `semantic.text.primary` |

No `semantic` equivalent exists yet — these need a token decision, not a mechanical swap: `colors.skeleton.base/highlight` (`ActivityStates:37,38`, `NftCard:278,279`, `PriceChart:141,142,165,166`, `TokenListSkeleton:31,32`, `TokenAbout:76,77`, `TokenMarketData:78,79`, `DerivedAccountCardSkeleton:51,52` — 16 sites, all removed by D1); `colors.scanner.*` (`QRScanner.tsx:83,92,104,117,135,141,149`, `QRScanner.native.tsx:147,167,192,197,214` — 12 sites, off-palette hex); `colors.input.background/border` (`PasswordInput:46,99`, `SeedWordInput:96,182,233`, `LockContent:415,603`, `InputAddress:253`); `colors.step.active/inactive` (`StepIndicator:89,92`, `PasswordStrengthBar:55`, `(auth)/password:537`); `colors.dialog.overlay`, `colors.sheet.backdrop/handle`, `colors.overlay.darkHover`, `colors.interactive.highlight`, `colors.palette.*` (`transactionTypes:44-49`, `InputAddress:49`).

### 3c. Raw font sizes / line-heights

| File:line | Current | Should be |
|---|---|---|
| `src/components/InputAddress/InputAddress.tsx:57,66,75` | `fontSize: 18` | `s(fontSize.heading)` — *or moot: file is dead (§4)* |
| `src/components/InputAddress/InputAddress.tsx:285,286,306` | `fontSize: 13` / `lineHeight: 18` | `s(fontSize.mono)` / `× lineHeight.snug` |
| `src/components/LoadingScreen/LoadingScreen.tsx:890,898,946` | `lineHeight: 32 / 24 / 16` | `s(fontSize.headline) * lineHeight.condensed`, etc. |
| `src/components/NftsTab/NftsTab.tsx:593,600` | `fontSize: ms(16)` / `ms(13)` | `ms(fontSize.bodyLg)` / `ms(fontSize.mono)` |
| `src/components/TokenDetail/TokenAbout/TokenAbout.tsx:152` | `lineHeight: ms(9) * lineHeight.tokenListItem` | `ms(fontSize.body) * lineHeight.normal` (the `9` is not on any scale) |
| `src/components/ReceiveSheet/ReceiveSheet.tsx:238` | `lineHeight: ms(24 * lineHeight.condensed)` | `ms(fontSize.headline * lineHeight.condensed)` |
| `src/components/WalletHeader/WalletHeader.tsx:341,351` | `lineHeight: vs(18)` / `vs(15)` | `vs(fontSize.bodyLg * lineHeight.snug)` / `vs(fontSize.caption * …)` |
| `src/components/SwapScreen/SwapInputScreen.tsx:235` | `fontSize: 11` | *(swap — list only)* |
| `SwapDetailRow:55,62` · `SwapReviewScreen:240,272` · `SwapTabSelector:99` · `SwapDetailsCard:110,117` · `BridgeRecipientScreen:126` · `RecipientAddressInput:156,163,210,224` · `BridgeReviewScreen:173` | `lineHeight: ms(<raw> * …)` | *(swap/bridge — list only)* |
| `app/(app)/wallets.tsx:427,475` | `fontVariant: ['tabular-nums']` | `...tabularNums.native` (The Tabular Rule names the token) |
| `(tabs)/index.tsx:1062` · `NftsTab.tsx:553,594` | `fontWeight: '500'` / `'600'` | drop — `fontFamilyNative.*` already carries the weight |

**Deprecated `fontSize` aliases (`xs`/`sm`/`base`/`lg`/`xl`) — 113 occurrences in 38 files.** Top offenders outside swap: `NftsTab` (4), `TransactionSuccessScreen` (4), `WarningNotice` (3), `TokenMarketData` (3), `TokenAbout` (3), `SeedWordInput` (3), `QRScanner` (3+2). Mapping is fixed and mechanical: `xs→micro`, `sm→caption`, `base→body`, `lg→heading`, `xl→title`, `2xl→headline`, `3xl/4xl/5xl→display`.

**Unscaled `fontSize: fontSize.*` (no `s()`/`ms()`) — 86 occurrences.** Notable in kit-era files that should know better: `app/(app)/settings/index.tsx:412`, `app/(app)/(tabs)/index.tsx:985,1060,1068,1073`, `src/components/WarningNotice/WarningNotice.tsx:67,77`, `src/components/SettingsScreenLayout/SettingsScreenLayout.tsx:155`, `src/components/Button/{PrimaryButton:111,SecondaryButton:128,TextButton:81}`, `src/components/WatchOnlyBadge/WatchOnlyBadge.tsx:51`, `src/components/PendingActivityBanner/PendingActivityBanner.tsx:111,115`.

### 3d. Sibling gaps that should be the 20 (`spacing.screenGutter`)

| File:line | Current | Note |
|---|---|---|
| `src/components/TokenList/TokenListSkeleton.tsx:112` | `marginBottom: vs(spacing.sm)` (8) | rows stand in for `TokenListItem`, which uses 20 (`TokenListItem.tsx:296`) — the list jumps on load |
| `src/components/NftsTab/NftsTab.tsx:565,577,583,589` | `vs(8)` / `vs(16)` / `vs(8)` / `vs(8)` | section header → grid, section → section; should be 20 |
| `src/components/NftsTab/NftsTab.tsx:512,534,568` | `vs(spacing.lg)` (16) | banner / empty / error seams |
| `src/components/Activity/ActivityStates.tsx:47` | `paddingTop: vs(spacing.sm)` | skeleton list vs the 20 the real rows use |
| `src/components/TransactionSuccessScreen/TransactionSuccessScreen.tsx:455,507,533` | `vs(spacing.lg)` / `vs(spacing.xl)` | mixed 16 and 20 between sibling blocks |
| `src/components/Send/TokenPickerSheet.tsx:80` | `marginBottom: ms(12)` | raw; `ReceiveSheet`'s identical title has none |
| `src/components/ConfirmSheet/ConfirmSheet.tsx:253,256` · `src/components/Activity/ExplorerLinkButton.tsx:229` · `src/components/BottomSheetTitleHeader.tsx:58` · `src/components/SettingsScreenLayout.tsx:158` | `vs(spacing.lg)` (16) | sibling seams, should be 20 |
| `src/components/NftsTab/NftsTab.tsx:546,547,548` | `vs(48)` / `s(24)` / `vs(40)` | raw numbers; empty-state padding |
| `app/(app)/(tabs)/_layout.tsx:112` | `height: 180` | fade gradient; belongs in `componentSizes` |
| `src/components/Activity/transactionTypes.tsx:73` · `:143,144,151,152` | `size={10}`, `top/right: -4 / -2` | badge glyph + offsets, raw |
| `src/components/Activity/AddressCopyRow.tsx:195,196` · `PasswordStrengthBar.tsx:76,77` · `HoldToCopyButton.tsx:119` · `DerivedAccountCard.tsx:95` · `QRScanner.tsx:114,115,116` | `width/height/borderRadius` raw ints | `componentSizes.*` / `borderRadius.*` |
| `src/components/TokenList/TokenListItem.tsx:144` | `size={s(33)} borderRadius={16.5}` | `IconBubble`/`TokenLogo` scale step (D5) |
| `src/components/TokenList/TokenListItem.tsx:363,371,381` | `letterSpacing: ms(-0.09/-0.06/-0.095, 0.3)` | `letterSpacing.snug` / `.balance` |

### 3e. `minHeight` on sheets

**None found.** `BottomSheetContainer.tsx:437` carries an explicit comment that there is no `minHeight`, per DESIGN.md §Sheets. The one deliberate exception is `Send/TokenPickerSheet.tsx:63` `height: '70%'` — documented (a virtualised list has no content to hug). All other `minHeight` hits are control heights from `componentSizes.*`, except one raw value: `src/components/InputAddress/InputAddress.tsx:255` `minHeight: 56` (dead file).

---

## 4. Dead code

Verified by grepping the symbol word-boundary across `app/ src/ hooks/ utils/ __tests__/ test-utils/`, excluding the owning directory and `src/components/index.ts`, and cross-checked for JSX usage.

| Item | LOC | Evidence |
|---|---:|---|
| `src/components/GradientBackground/` (3 files) | 35 | Zero references outside its own dir and the barrel |
| `src/components/InputAddress/InputAddress.tsx` (+ `types.ts`) | 348 | `<InputAddress` appears **only** in its own JSDoc (`InputAddress.tsx:100`). The 15 "consumers" all import `useAddressValidation` / `ValidationState` / `BlockchainType`, which `index.ts` re-exports straight from `@salmon/shared`. **Keep `index.ts`** as the shim, delete the component. |
| `src/components/TokenSelector/TokenSelector.tsx` | 226 | Zero JSX usage; `SwapScreen` uses `TokenSelectorModal` only |
| `src/components/SwapScreen/SwapTabSelector.tsx` | 119 | Imported only by `SwapScreen/index.ts`. *(Swap is off-limits for behaviour; this is a pure barrel-only orphan.)* |
| `src/components/SwapScreen/SwapDetailRow.tsx` | 68 | Same — `SwapReviewScreen` uses `SwapDetailsCard`, not this |
| `Icon/SvgIcons`: `GridViewSvgIcon`, `HomeSvgIcon`, `SwapSvgIcon` | ~60 | Tab-bar glyphs; the tab bar was deleted (DESIGN.md §Navigation). Zero consumers. |
| `Icon/SvgIcons`: `WalletSvgIcon` | ~20 | Only reference is `WalletHeader.test.tsx` — the test asserts something the component no longer renders |
| Barrel export `QRScannerDefault` (`src/components/index.ts:105`) | — | Zero importers |
| Barrel export `BlockchainId`/`BlockchainBalance`/`BlockchainNetworkInfo` re-export (`index.ts:225`) | — | Comment says it exists for the deleted `BalanceCard`; consumers now import from `@salmon/shared` directly. Verify before removal — it is a stable public path. |
| `packages/shared/src/theme/semantic.ts` `accent.inkOnMembrane` + `componentSizes.tabBarRadius` | — | DESIGN.md §Navigation states these are **intentionally retired-in-place** contract surfaces needing human sign-off. **Do not remove.** |

Also: no dead hooks, contexts, utils or settings files. No component directory lacking a barrel entry except `TokenDetail/TokenAbout` and `TokenDetail/TokenMarketData`, which are exported by deep path from `src/components/index.ts:206-211` (fine).

Missing test coverage worth noting (not dead, just unpinned): `TokenList/TokenList.tsx`, `NftsTab`, `NftCard`, `TokenLogo`, `SearchField`, `ShimmerRect`, `WarningNotice`, `DerivedAccountCard`, `SubAccountSelector`, `WatchOnlyBadge`, `TokenDetail/*`, `Send/TokenSelectList`, `Send/RecipientInput`.

---

## 5. Screens still legacy

| Route / surface | What it renders | Kit composition that replaces it |
|---|---|---|
| `app/(app)/(tabs)/index.tsx` — **Bitcoin column** (`:822-892`) | `PriceChart` (mixed) + `TokenListSkeleton` (LEGACY) + `TokenListItem` Bitcoin branch (LEGACY) + `TokenMarketData` (LEGACY) + `TokenAbout` (LEGACY) | `PriceChart` in a `Card` + `SkeletonRow` (D1) + `ListRow` non-pressable (D7) + `MarketDataCard`/`AboutCard` (D2). Owner ruling stands: no BTC detail screen, the blocks stay inline in Portfolio. |
| `app/(app)/(tabs)/index.tsx` — **empty / error state** (`:1053-1080`) | hand-drawn `View` + `colors.background.card` + `borderRadius.xl` + unscaled type | `Card` tone surface + the shared `StateBlock` (D9). Flagged as out-of-scope in the 2026-09-01 consolidation pass; it is the last one left. |
| `app/(app)/(tabs)/index.tsx` — **loading** (`:686`) | `ActivityIndicator size="large"` | `LoadingScreen` or `SkeletonRow` (D8) |
| `src/components/NftsTab/NftsTab.tsx` — **NFTs tab** | fully hand-drawn: dev banner, section headers, empty/error, grid rows; `colors.*` ×11, `ms(16)`/`ms(13)`, 7 raw spacing values, `fontWeight` literals | `Card` tone accent-tint for the dev banner; `SectionLabel` variant `group` for chain headers; `StateBlock` for empty/error; `SkeletonRow`/`NftCardSkeleton` for loading; 20 between every section. The tile itself (`NftCard`) drops `BlurContainer` for `Card`. |
| `src/components/NftCard/NftCard.tsx` | `BlurContainer` shell, `colors.overlay.darkHover`, `colors.text.balance`, own `ContentLoader` skeleton | `Card` radius `lg` + `ShimmerRect` |
| `app/(app)/(tabs)/swap.tsx` + `src/components/SwapScreen/**` + `src/components/BridgeScreen/**` | 2 629 LOC of `BlurContainer` + `colors.*` + `ms(n*lineHeight)` + 30 deprecated aliases; own token selector, own detail rows, own tab selector | **Off-limits — listed only.** When it lands: `SwapTabSelector`→`UnderlineTabs`, `SwapDetailRow`/`SwapDetailsCard`→`Card`+`KeyValueRow`, `TokenSelectorModal`→`BottomSheetContainer`+`SheetTitle`+`TokenSelectList`, `SwapAmountInput`→`Card` amount block (already built in `send/amount.tsx`). Two of its files are already dead (§4). |
| `app/(auth)/*` (11 routes) | `OnboardingLayout` grid (spec 013) — a *different, deliberate* system, not the redesign kit; 25 `colors.*`, 20 unscaled `fontSize.*` | Not a kit target. Worth only the `colors.*`→`semantic.*` mechanical pass. |
| `src/components/QRScanner/**` | `colors.scanner.*` = five off-palette hexes; no kit anywhere | `Card` / `IconBubble` / `PrimaryButton` on `semantic.surface.*`. Needs a token ruling (no `semantic` group covers a camera overlay). |
| `src/components/SeedPhrase/**` | `colors.input/card/text/accent` | Kit-able, but **security-sensitive** (`useSecretScreen`, The Seed Phrase Rule pins the ground to `surface.bedrock`). Token swap only, with the human in the loop. |
| `app/(app)/(tabs)/_layout.tsx` | a `Tabs` navigator with `tabBar={() => null}` and two screens, one of them `href: null` | The bar is gone (DESIGN.md §Navigation); this is a `Stack` wearing a `Tabs` costume. Collapsing it is a navigation change, not a styling one — flag to the owner, don't do it silently. Note the file is **currently modified in the working tree**. |

---

## 6. Proposed work packages

Disjoint by file, so P1–P4 can run in parallel. P5–P7 depend on P1/P2.

**P1 — Delete the dead** · direct change, no spec · **S**
Files: `src/components/GradientBackground/**`, `src/components/InputAddress/InputAddress.tsx` + `types.ts` (**keep `index.ts`**), `src/components/TokenSelector/TokenSelector.tsx`, `src/components/SwapScreen/SwapTabSelector.tsx`, `src/components/SwapScreen/SwapDetailRow.tsx`, `src/components/Icon/SvgIcons.tsx` (drop `GridView`/`Home`/`Swap`/`Wallet`), `src/components/index.ts`, `src/components/{TokenSelector,SwapScreen,Icon}/index.ts`, `src/components/WalletHeader/WalletHeader.test.tsx`.
Depends on: nothing. Brief: *Remove the seven zero-consumer surfaces listed in §4 and their barrel lines; `InputAddress/index.ts` must keep re-exporting `useAddressValidation` and its types from `@salmon/shared` (15 files depend on that path). Do not touch `accent.inkOnMembrane` or `componentSizes.tabBarRadius`. Verify with `pnpm turbo run typecheck test --filter=@salmon/mobile`.*

**P2 — Mechanical token pass: `colors.*` → `semantic.*`, deprecated `fontSize` aliases, `s()` scaling** · **spec-kit spec** (cross-cutting, ~44 files, 149 + 113 + 86 sites) · **L**
Files: every non-skipped, non-swap file listed in §3b/§3c. Explicitly **excludes** `SwapScreen/**`, `BridgeScreen/**`, `TokenSelector/**`, and the nine panel dirs another agent owns.
Depends on: P1 (deleting first shrinks the surface).
Brief: *One-for-one token swap per the §3b table. The eight groups with no `semantic` equivalent (`skeleton`, `scanner`, `input`, `step`, `dialog`, `sheet`, `overlay`, `palette`, `card`) are **out of scope** — they need a token ruling from the owner first; leave them and list them. Same for `SeedPhrase/**` (security-sensitive). No visual change intended: pin `contrast.test.ts` before and after.*

**P3 — One skeleton** · **spec-kit spec** (touches 9 loading surfaces) · **L**
Files: new `src/components/Skeleton/`, `src/components/ShimmerRect/**`, delete `src/components/TokenList/TokenListSkeleton.tsx` + `DerivedAccountCard/DerivedAccountCardSkeleton.tsx`, edit `Activity/ActivityStates.tsx`, `NftCard/NftCard.tsx`, `PriceChart/PriceChart.tsx`, `TokenList/TokenList.tsx`, `app/(app)/(tabs)/index.tsx`, `app/(auth)/derived-accounts.tsx`, `src/components/NftsTab/NftsTab.tsx`, barrels.
Depends on: P1. Conflicts with P2 on `ActivityStates`/`NftCard`/`PriceChart` — sequence P2 first or exclude those three from P2.
Brief: *Build `SkeletonRow` on `ShimmerRect` + `Card`; delete the seven `ContentLoader` re-implementations. Skeleton geometry must match the real row it stands in for, including the 20 sibling gap (§3d). Check the reduce-motion path: `ContentLoader` animates unconditionally, `ShimmerRect` does not.*

**P4 — One sheet title** · direct change · **S**
Files: new `src/components/BottomSheetContainer/SheetTitle.tsx`, edit `ReceiveSheet/ReceiveSheet.tsx`, `Send/TokenPickerSheet.tsx`, `ConfirmSheet/ConfirmSheet.tsx`, barrel.
Depends on: nothing. Brief: *Extract the three identical hand-drawn titles into one `SheetTitle` passed as `BottomSheetContainer`'s `title`. Leave `BottomSheetTitleHeader` alone (its only consumer is swap's modal). Delete `TokenPickerSheet`'s stray `marginBottom: ms(12)`.*

**P5 — Token detail cards shared with Home's Bitcoin column** · **spec-kit spec** (amends spec 019) · **M**
Files: new `src/components/TokenDetail/MarketDataCard.tsx` + `AboutCard.tsx`, delete `TokenDetail/TokenMarketData/**` + `TokenDetail/TokenAbout/**`, edit `app/(app)/token/[id].tsx`, `app/(app)/(tabs)/index.tsx`, barrel.
Depends on: P3 (both cards have skeleton branches). Brief: *Lift `token/[id].tsx:222-304`'s two `Card` blocks into shared components and render them in Home's Bitcoin column, removing the last two `BlurContainer` consumers outside swap and `NftCard`. Keep the `token-detail-market-data` / `token-detail-about` testIDs. Every string EN+ES; never guess a Spanish translation.*

**P6 — NFTs tab + NftCard to the kit** · **spec-kit spec** (a whole tab) · **L**
Files: `src/components/NftsTab/**`, `src/components/NftCard/**`, `__tests__/collectibles-*.test.tsx`.
Depends on: P2 (tokens), P3 (skeletons), and the `StateBlock` from P7 — or ship P7's extraction inside this package.
Brief: *`NftsTab` is the largest wholly-legacy surface left (652 LOC, 11 `colors.*`, 7 raw spacing values). Rebuild from `Card` / `SectionLabel` / `IconBubble` / `StateBlock`, 20 between every sibling. `NftCard` drops `BlurContainer` for `Card`. Preserve the `contentContainerStyle` prop contract — the Home shell owns the gutter (component-inventory, post-consolidation table).*

**P7 — Shared empty/error state + Home's remaining legacy blocks** · direct change · **M**
Files: new `src/components/StateBlock/`, edit `src/components/Activity/ActivityStates.tsx` (re-export aliases), `app/(app)/(tabs)/index.tsx` (`:686`, `:1053-1080`), `app/(app)/powerups.tsx:128-132`, barrel.
Depends on: P2. Disjoint from P6 if `NftsTab`'s call site is left for P6 to add.
Brief: *Promote `EmptyState`/`ErrorState` out of `Activity/` into a `StateBlock` with `{title, body?, onRetry?, testID}`; keep `ActivityEmptyState`/`ActivityErrorState` barrel aliases and the `activity-empty`/`activity-retry-button` testIDs. Replace Home's hand-drawn empty state and its `ActivityIndicator` with the kit equivalents.*

**P8 — Row consolidation (Bitcoin row, WalletCard, AddressCopyRow)** · direct change · **M**
Files: `src/components/TokenList/TokenListItem.tsx`, `app/(app)/wallets.tsx`, `src/components/Activity/AddressCopyRow.tsx`, `src/components/TokenLogo/TokenLogo.tsx`.
Depends on: P2. Brief: *Fold the three remaining hand-drawn rows into `ListRow`/`KeyValueRow` (§D7) and make `TokenLogo`'s fallback an `IconBubble` tone `ink` (§D5), which also kills `size={s(33)} borderRadius={16.5}`. `TokenListItem.test.tsx` covers the Bitcoin branch — run it before and after.*

**P9 — One receipt** · **spec-kit spec** (touches swap's rendering) · **M**
Files: new `src/components/ReceiptScreen/`, `src/components/TransactionSuccessScreen/**`, `app/(app)/nft/[id]/success.tsx`, `app/(app)/send/success.tsx`.
Depends on: P2. Brief: *Unify the two receipts behind `tone: 'transfer' | 'exchange'` (§D4). The `exchange` branch must render pixel-identically because `SwapScreen` consumes it and swap is off-limits. Preserve the `tx-success-*` id vocabulary the Maestro flows select by.*

---

## Residual risk and what is deliberately preserved

- **Swap and bridge are untouched** by every package above, per instruction — but they hold 2 629 LOC, the last `BlurContainer` cluster, ~30 deprecated aliases, and two files that are already dead. They will be the largest remaining debt after P1–P9.
- **Nine panel directories are excluded** (another agent owns them). `SettingsScreenLayout`, `ConfirmSheet`, `Card`, `ListRow`, `IconBubble`, `SectionLabel` and `WarningNotice` are shared with those panels — P2 and P4 touch them. Coordinate or sequence, or the two agents collide on `src/components/index.ts` and `ConfirmSheet`.
- **`app/(app)/(tabs)/_layout.tsx`, `app/(app)/_layout.tsx`, `app/(app)/settings/*` are modified in the working tree** right now. P2 and the `(tabs)/_layout.tsx` `height: 180` fix must rebase on whatever lands there.
- **Preserved on purpose, do not remove:** `accent.inkOnMembrane` and the tab bar's sizing tokens in `packages/shared/src/theme/semantic.ts` + `contrast.test.ts` (DESIGN.md §Navigation names them a contract surface needing human sign-off); the `BlockchainId`/`BlockchainBalance` re-export in `src/components/index.ts:225`; `LoadingScreen`'s size (a signature component, not bloat); `OnboardingLayout`'s separate grid system (spec 013); `Send/TokenPickerSheet`'s `height: '70%'` (a virtualised list cannot hug); `QRCode` and `ScalesBackground`'s literal `#FFFFFF`.
- **Needs an owner ruling before anyone can finish P2:** there is no `semantic` group for skeleton, scanner, input, step, dialog, sheet, overlay, card or palette colours. Roughly 45 call sites cannot be migrated until those tokens exist — P3 removes 16 of them (skeleton) for free, but the rest will still be `colors.*` when P2 closes.
- **Verification baseline** for every package: `pnpm turbo run typecheck --filter=@salmon/mobile`, then `pnpm turbo run test --filter=@salmon/mobile` (Jest). The narrow guards that matter are `src/components/{Card,ListRow,IconBubble,KeyValueRow,Chip}/*.test.tsx` for the kit, `__tests__/home-*.test.tsx` + `__tests__/components/token-list-refresh.test.tsx` for P3/P5/P7/P8, `__tests__/collectibles-*.test.tsx` for P6, and `packages/shared/src/theme/contrast.test.ts` for P2. Maestro flows are re-pointed, never run, per `apps/mobile/.maestro/AGENTS.md`.