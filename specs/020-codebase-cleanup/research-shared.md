All scans complete. Here is the audit.

---

# Salmon Wallet V3 — `packages/shared` architecture audit (mobile + shared scope)

Read: `AGENTS.md`, `DESIGN.md` (§Colors 241–302, §Two modes 303–315, §Typography 317–418, §Layout 420–434, §Hierarchy 393–418, shipped-status table 184–239), all of `packages/shared/src/theme/*`, all of `packages/shared/src/types/ui/*`. Every count below comes from a script or grep run against the working tree at `feat/redesign-mobile-home`.

**Headline:** the token layer is in far better shape than the file sizes suggest. Mobile has **6 hardcoded hex literals in 3 files** and 4 `rgba()` literals — the "no hardcoded styles" goal is essentially already met. The real blockers are (a) **two parallel color layers** (`colors` legacy + `semantic`), and (b) **106 module-scope `StyleSheet.create` blocks** that freeze token values at import time. Both must be resolved before a light theme is possible, and (a) should be resolved _first_ because it halves the surface of (b).

---

## 1. Theme

### 1.1 How the layer is structured today

```
packages/shared/src/theme/
  palette.ts      neutral 0→1000 (blue bias, hue ~222), salmon 50→900,
                  success/danger/warning 300/500/700.  Raw hex only, no meaning.
  semantic.ts     11 groups → depth, water, surface, text, border, status,
                  change, state, accent, scales, flesh.  Each points at a
                  palette step.  Exported BOTH as loose consts and as one
                  frozen `semantic` object (semantic.ts:316-328).
  colors.ts       LEGACY. 18 groups / 68 leaves of mixed literals + palette
                  refs.  Imports `{ scales, surface }` FROM semantic.ts (line 8).
  gradients       inside colors.ts:182-278.  21 entries, RN arrays + `*CSS` twins.
  shadows.ts      `shadows` (10 RN objects) + `shadowsCSS` (11 strings).
  spacing.ts      spacing(18) borderRadius(13) componentSizes(102)
                  contentPadding(1) borderWidth(8) opacity(7) blur(4)
  typography.ts   fontFamily(2) fontFamilyNative(8) fontSize(19) lineHeight(7)
                  fontWeight(7) letterSpacing(13) fontScaleCap(2) tabularNums(2)
  + brand / onboardingGrid / depthField / depthFieldBlizzard / flesh / scales
    (geometry, mode-invariant — no light-theme work needed)
  index.ts        barrel, plus a composed `theme` object (index.ts:186-212)
                  that has zero consumers.
```

`typography`, `spacing`, `componentSizes`, geometry and `durations` are **mode-invariant** — none of them carry a color. They need no light-theme work at all. The entire light-theme problem is confined to `semantic.ts`, `colors.ts` (incl. `gradients`), and `shadows.ts`.

### 1.2 What blocks a runtime theme switch

Everything below resolves a hex at **module-evaluation time**. RN's `StyleSheet.create` result is captured into a component's closure at import; mutating a module object afterwards cannot retroactively change it, and remounting does not re-run module init. Every one of these is a hard blocker.

| Blocker                                                                          | Location                                                                                                           | Count                                                                            |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| **Module-scope `StyleSheet.create` reading `semantic.*`**                        | `apps/mobile/src` + `apps/mobile/app`                                                                              | **80 files / 80 blocks**                                                         |
| **Module-scope `StyleSheet.create` reading `colors.*` only**                     | same                                                                                                               | **26 files**                                                                     |
| Module-scope `StyleSheet.create`, no color token (spacing/type only)             | same                                                                                                               | 34 files — no work needed                                                        |
| `semantic.*` used in JSX props / inline style, not in a stylesheet               | same                                                                                                               | **27 files** — these become correct _for free_ once `semantic` comes from a hook |
| Function-scope `StyleSheet.create` already                                       | same                                                                                                               | **0** — there is no existing dynamic pattern to build on                         |
| `semantic` destructured at module scope into MUI `createTheme`                   | `packages/ui/src/theme/index.ts:33`                                                                                | 1 (web/ext — later cycle)                                                        |
| Ditto in RN background components                                                | `apps/mobile/src/components/ScalesBackground/ScalesBackground.tsx:6`, `.../DepthBackground/DepthBackground.tsx:24` | 2                                                                                |
| `CustomDarkTheme` handed to `@react-navigation/native` `ThemeProvider`           | `apps/mobile/app/_layout.tsx:5, 229, 240`                                                                          | 1                                                                                |
| `contrast.test.ts` (25 KB) asserts ratios against a single hard-imported palette | `packages/shared/src/theme/contrast.test.ts`                                                                       | must be parameterized over modes                                                 |

**Migration surface: 106 files.** 480 total color-token references across the 80 semantic files — **average 6 per file**, max 24 (`AccountAddPanel.tsx`), min 1 (5 files). This is mechanical, not architectural. 46 of the 106 read _both_ `colors.*` and `semantic.*`, which is exactly why §1.5 (retire `colors`) must land first: otherwise every one of those files gets touched twice and both layers need light values.

### 1.3 Proposed light-theme infrastructure

**Token shape — `semantic` becomes a factory, keeping the frozen object as the dark default.**

```ts
// packages/shared/src/theme/semantic.ts
export type ThemeMode = 'dark' | 'light';
export function createSemantic(mode: ThemeMode): Semantic { … }
export const semantic = createSemantic('dark');   // unchanged export, unchanged shape
```

Keeping `export const semantic` alive is what makes this non-breaking: the 27 JSX-only files, `packages/ui`, web and extension all keep compiling untouched while mobile migrates. Do **not** ship two hand-written palettes — DESIGN.md:311 already specifies the mapping as a `Record<SemanticToken, RampRef>` resolved per mode, and DESIGN.md:243 states the ramp ordering exists precisely so light is an index re-map. One resolver map, two index tables.

Three values are theme-invariant by ruling and must be asserted as such (DESIGN.md:313): `accent.fill` = `salmon-500`, `accent.onFill`/`text.onAccent` = `neutral-1000`. One asymmetry is already known and must live in the resolver, not in a later bug report (DESIGN.md:312): light borders step to `neutral-500`, not the mirrored `neutral-300`, which measures 2.16:1 on white and fails 1.4.11.

⚠️ **Clarification gate before this package is planned.** DESIGN.md:311–313 carries a concrete index-flip table (`depth.abyss`→`neutral-25`, `surface.shelf`→`neutral-0`, `text.primary`→`neutral-950`, `text.accent`→`salmon-700`…) explicitly marked as _"the starting draft, not deleted"_. The owner now says the `.pen` light values are the source. These are two sources for the same numbers. Someone has to say which wins, per token, before implementation — and DESIGN.md:307 flags the genuinely hard part: `shadows.ts` and the light/shadow alternation are calibrated against a ground measured at 16/255 and **do not survive a ramp flip**. Light shadows must be rebuilt from the rules, not inverted.

**Where the provider lives — `packages/shared/src/contexts/ThemeContext.tsx`, RN-agnostic.**

There is a direct precedent to copy rather than invent: `packages/shared/src/contexts/CurrencyContext.tsx` is a provider that persists a preference through `getStorage()`/`STORAGE_KEYS` (lines 33, 134-135, 181-182) and is already mounted in `apps/mobile/app/_layout.tsx:76`. `packages/shared/src/hooks/useLanguage.ts:108-118, 146-147` is the same pattern as a plain hook. Follow `CurrencyContext` — appearance is app-wide state, not per-consumer.

The one RN-specific piece is reading the OS scheme (`Appearance.getColorScheme()` on mobile, `matchMedia('(prefers-color-scheme: dark)')` on web). That must **not** enter `packages/shared`. Pass it in:

```ts
<ThemeProvider systemScheme={useColorScheme()}>   // mobile supplies it
```

Provider resolves `preference ('system'|'light'|'dark') + systemScheme → mode`, memoizes `createSemantic(mode)`, exposes `useTheme(): { mode, preference, setPreference, semantic, colors }`.

**How mobile consumes it — `useThemedStyles(factory)`.**

```ts
// apps/mobile/src/theme/useThemedStyles.ts  (~20 lines)
const cache = new WeakMap<Factory, Partial<Record<ThemeMode, Styles>>>();
export function useThemedStyles<T>(factory: (s: Semantic) => T): T { … }
```

Per-file diff, all 80 semantic files:

```diff
-const styles = StyleSheet.create({ …semantic.text.primary… });
+const stylesFor = (t: Semantic) => StyleSheet.create({ …t.text.primary… });
```

plus one `const styles = useThemedStyles(stylesFor);` inside the component. Three structural lines plus a `semantic.` → `t.` rename that is safely codemoddable. The WeakMap keyed on the factory means each file's styles are still built once per mode, so there is no per-render cost — the thing `StyleSheet.create` at module scope was buying is preserved.

I considered and rejected two lazier options: mutating a module-level `semantic` object (RN captures style objects into closures at import — it does not work), and hoisting only color properties to inline `style={[styles.x, {color: t...}]}` (larger diff than the factory, and it scatters the token surface).

**How the preference persists — reuse the existing mechanism verbatim.**

The hook/service the owner asked about is `packages/shared/src/hooks/useUserConfig.ts` for `explorer`/`developerNetworks` (storage key `STORAGE_KEYS.SETTINGS`, `useUserConfig.ts:68`), and `CurrencyContext` / `useLanguage` for `currency`/`language` (dedicated keys). Appearance is a display preference like currency and language, not a network preference — give it its own key rather than widening `UserConfig`:

```ts
// packages/shared/src/storage/types.ts, in the "-- User preferences --" block (line 200)
/** Appearance preference: 'system' | 'light' | 'dark' */
APPEARANCE: 'salmon_appearance',
```

`getStorage().getItem/setItem` — identical to `CurrencyContext.tsx:134-135, 181-182`. No new persistence machinery.

**Order of migration.**

1. `createSemantic(mode)` + light resolver map + `contrast.test.ts` parameterized over both modes (dark assertions must not move).
2. `STORAGE_KEYS.APPEARANCE` + `ThemeContext` in shared, mounted in `apps/mobile/app/_layout.tsx` beside `CurrencyProvider`.
3. `useThemedStyles` + migrate the 80 semantic files, screen by screen.
4. `apps/mobile/app/_layout.tsx` `CustomDarkTheme` → mode-derived nav theme; `ScalesBackground` / `DepthBackground` module destructures.
5. Settings row "Appearance: System / Light / Dark" + `en`/`es` keys (never guess the Spanish — follow `i18n-authoring`).
6. Light `shadows` rebuilt from the rules (see the DESIGN.md:307 warning above).

Steps 1–2 are additive and ship dark-only with zero visible change — a safe first landing.

### 1.4 Legacy `colors.*` keys — who still consumes them

All 68 leaves classified by grep across `apps/mobile`, `apps/web`, `apps/extension`, `packages/ui`, `packages/shared` (tests excluded).

**Still consumed by mobile — 47 leaves.** Heaviest: `colors.text.primary` (69 mobile refs), `colors.text.secondary` (56), `colors.accent.primary` (16), `colors.background.card` (14), `colors.skeleton.base` (11), `colors.skeleton.highlight` (10), `colors.border.default` (9). Every one of these has an exact `semantic` equivalent already shipped; the whole `colors.scanner.*` sub-system (6 leaves, mobile-only, `#1a1a2e`/`#2a2a4e`/`#4a4a6e` literals) is the only group with no semantic counterpart and needs tokens invented for it.

**Zero mobile consumers — web/extension/`packages/ui` only, 11 leaves.** `text.muted`, `border.light`, `accent.tintHover`, `button.secondaryText`, `button.dangerHover`, `button.disabledText`, `interactive.surface`, `interactive.hoverSubtle`, `interactive.hoverMedium`, `card.borderActive`, `palette.pink`. Owner allows breaking web/extension — but these are all `packages/ui` consumers (the shared DOM package), so deleting them means editing `packages/ui` in the same commit. Cheaper to leave them until the web/extension redesign.

**Zero consumers anywhere — 9 leaves, safe to delete now.** `background.glass`, `change.neutral`, `button.cancelBackground`, `button.destructiveHover`, `button.inactiveBackground`, `tabBar.active`, `tabBar.inactive`, `interactive.hoverStrong`, `scanner.text`.

**`gradients` — 9 leaves with zero consumers anywhere:** `balanceCard`, `balanceCardSolana`, `balanceCardSolanaDevnet`, `balanceCardBitcoin`, `balanceCardBitcoinTestnet`, `balanceCardEthereum`, `balanceCardEthereumSepolia`, `tabBarFade`, `disabledCSS`. The `balanceCard*` family died when the balance card was redesigned; their `*CSS` twins still have web/extension consumers, so the RN-array halves are the dead ones. Preserve the Ethereum-named entries per `AGENTS.md` rule 5 unless removal is explicitly approved.

### 1.5 The structural finding: two color layers, both live

`colors.ts` is documented as legacy (`semantic.ts:12-14`: _"components move over as they are touched, rather than in one sweeping rename"_). Three years of "as they are touched" has produced a stable split, not a migration: **46 mobile files read both layers**, and `colors.ts:8` imports `{ scales, surface }` _from_ `semantic.ts`, so the legacy layer is now downstream of the new one.

For the light theme this is the difference between one resolver and two. **Retiring `colors` in mobile is the single highest-leverage change in this audit** and belongs before the light-theme package, not after.

---

## 2. `types/ui` contracts

67 exported symbols across 36 files plus the `index.ts` barrel. Consumer counts per package (`apps/mobile`, `packages/ui`, `apps/web`, `apps/extension`, `packages/shared` excluding `types/ui` itself), tests excluded.

**True dead — zero consumers anywhere outside the barrel (6):**

| Symbol                         | Location                                                |
| ------------------------------ | ------------------------------------------------------- |
| `AddressBookPanelPropsBase`    | `packages/shared/src/types/ui/address-book-panel.ts:6`  |
| `AddressAddPanelPropsBase`     | `packages/shared/src/types/ui/address-book-panel.ts:18` |
| `AddressEditPanelPropsBase`    | `packages/shared/src/types/ui/address-book-panel.ts:28` |
| `BalanceCardSkeletonPropsBase` | `packages/shared/src/types/ui/balance-card.ts:86`       |
| `SendContact`                  | `packages/shared/src/types/ui/send-sheet.ts:77`         |
| `SendOwnWallet`                | `packages/shared/src/types/ui/send-sheet.ts:93`         |

`packages/shared/src/types/ui/address-book-panel.ts` is **entirely** unconsumed — the only such file in the directory.

**Zero mobile consumers, live only in `packages/ui` (17):** `AboutPanelPropsBase`, `BackupPanelPropsBase`, `ActionButtonBase`, `ActionButtonRowPropsBase`, `BalanceCardPropsBase`, `PrivateKeyPanelPropsBase`, `SecurityPanelPropsBase`, `TokenInfoPropsBase`, `TokenFeaturesPropsBase`, `WalletHeaderPropsBase`, `WalletSwitcherSheetPropsBase`, `AccountListItemPropsBase`, `TokenBadgesSectionPropsBase`, `SendStep`, `StepConfirmationProps`, `StepAddressAmountPropsBase`, `UseSendContactsResult`.

**Recommendation.**

- **Delete now:** the whole of `address-book-panel.ts` + its 3 barrel lines, plus `BalanceCardSkeletonPropsBase`. Zero blast radius in any package — this needs no breaking-change allowance at all.
- **Delete with the barrel entries, cheap:** `SendContact` / `SendOwnWallet` are referenced only by `StepConfirmationProps` _in the same file_, which itself is `packages/ui`-only. Inline them into `StepConfirmationProps` or drop all three together when web is redesigned.
- **Keep:** the 17 `packages/ui`-only contracts. The owner allows breaking web/extension, but these are not "web code" — they are the cross-platform contracts the redesign of web/extension will be _written against_, and deleting a `*PropsBase` deletes the shape a future mobile implementation would extend. Deleting them buys ~40 lines and costs the contract. **Do not touch.**
- `UseSendContactsResult` looks mobile-dead but is live at `packages/shared/src/hooks/useSendContacts.ts:19,31`. Not dead.

---

## 3. Hooks / services / utils duplication

**Formatting/address/date/clipboard duplication: none found.** `apps/mobile/src/utils/` contains only motion and RN-platform helpers (`sinkAndFloat.ts`, `haptics.ts`/`.native.ts`, `motion.ts`, `useWaitPassage.ts`); `apps/mobile/hooks/` contains only native-capability hooks. The two mobile call sites that format (`WalletHeader.tsx:124` → `getShortAddress`, `ConversionRateDisplay.tsx:64` → `formatConversionRate`) already import from `@salmon/shared`. No local `debounce`/`sleep`/`truncate` reimplementation exists. This part of the codebase is clean.

One near-miss, flagged for visibility only: `apps/mobile/app/(app)/send/amount.tsx:88` defines a local `formatSolAmount` (`toFixed(6)` + trailing-zero trim). Genuinely different from every shared formatter — those all carry locale/currency semantics. Not drift; leave it or promote it, but it is not a bug.

**Misplaced code — exactly one candidate.**

`apps/mobile/hooks/useTokenDetail.ts` — exports `useTokenDetail`, `UseTokenDetailResult`. Full import list: `react` (`useEffect`, `useState`) and `@salmon/shared`. **Zero** `react-native` / `expo-*` / `@react-navigation` / `react-native-*` imports. RN-free and movable.

Every other file in `apps/mobile/src/utils` and `apps/mobile/hooks` is correctly app-local, each for a named reason: `react-native-reanimated` (`sinkAndFloat.ts:57`, `motion.ts`, `useWaitPassage.ts`, `usePressMotion.ts`), `expo-haptics` (`haptics.native.ts`), `expo-glass-effect` + `AccessibilityInfo` (`useMembraneMaterial.ts`), `react-native` `Platform`/`Keyboard`/`Animated` (`useSecretScreen.ts`, `useKeyboardHeight.ts`, `useCopyFeedback.ts`), `react-native-safe-area-context` (`useTabChrome.ts`, `useBottomSheetChrome.ts`), native SecureStore/LocalAuthentication (`useBiometricAuth.ts`). Nothing else should move.

**Overlapping hooks — one real overlap, and it is the same file.**

`apps/mobile/hooks/useTokenDetail.ts` hand-rolls two `useEffect` fetches with manual `loading`/`chartError` state, calling `getTokenCoinInfo` + `getTokenMarketChart`. `packages/shared/src/hooks/useCoinMarketData.ts` calls **the same two shared API functions** as a React Query hook — and its own header comment (lines 1-10) says it exists to _"replace duplicated `useState + useEffect` blocks in web/extension HomePage Bitcoin and selected-token detail flows."_ The hook built to retire this pattern shipped, and mobile still owns the pattern. Consequences: mobile gets no query-key dedup, no `keepPreviousData`, and no propagation of future caching/error fixes.

The fix collapses both findings into one change: point `apps/mobile/app/(app)/token/[id].tsx` at `useCoinMarketData` and delete `useTokenDetail`. Nothing needs to _move_ into shared — the shared hook already exists.

No other mobile-local counterpart exists for `useBalance`, `useMultiChainTokens`, `useJupiterTokenList`, or `useTransactions`; mobile screens consume those directly.

---

## 4. Dead code

### 4.1 Theme tokens with zero references outside `packages/shared/src/theme` (word-match, so destructuring is counted)

- `semantic`: `text.onGlass`, `state.loadingOpacity`, `accent.inkOnMembrane`, `scales.deepFieldHeight` (already self-documented `@deprecated` at `semantic.ts:205-211`).
- `spacing`: `lockScreenGap`, `lockScreenSectionGap`, `lockScreenPadding`, `paginationGap`, `tabBarPadding`.
- `componentSizes`: **19 of 102** — `actionButtonWidth`, `logoSizeLarge`, `successCircleSize`, `blockchainIcon`, `headerInnerHeight`, `tabBarRadius`, `tabBarPaddingTop`, `tabBarMinBottomPadding`, `tabBarItemHeight`, `tabBarHeight`, `sheetHandleWidth`, `sheetHandleHeight`, `descentTrackWidth`, `descentTrackHeight`, `descentSegmentHeight`, `swapReviewCardMinHeight`, `lockScreenLogoSize`, `lockScreenLogoSizeExtension`, `biometricButtonSize`. A further 43 have no _mobile_ consumer but are live in web/`packages/ui` (`sheetWidth*`, `dialogWidth*`, `scrollbarWidth*`, `breakpointDesktop`, `drawerWidth`…) — those are correctly DOM-only and should stay.
- `shadows`: `imageHero`, `topSheet`. `shadowsCSS.card` is dead; the other 9 `shadowsCSS` entries are web/ext-only and correct.
- `gradients`: the 9 listed in §1.4.
- `fontSize.iconMd`; `borderWidth.accent`/`thick`; `blur.lg`; `letterSpacing.tight`/`loose`/`header`.
- `theme` composed object, `packages/shared/src/theme/index.ts:186-212` — zero consumers.

⚠️ **Doc/code drift worth a human's attention, not deletion.** `DESIGN.md:224` lists `accent.inkOnMembrane` as **Shipped** for tab-bar label contrast on the membrane, and `contrast.test.ts` asserts it at 5.27:1 — but no renderer reads it. Either the tab bar regressed off the token or the doc is ahead of the code. Same class of question for `text.onGlass`. Flagging; not proposing a change.

### 4.2 Locale keys

901 EN keys flattened. 868 matched statically (including i18next `_one`/`_other` plural bases), 24 under dynamic prefixes (`activity.filters.`, `powerups.filters.`, `powerups.sections.`, `pending.`, `settings.languages.`, `password.strength.`), **9 unmatched**:

`settings.about_build`, `settings.wallets.your_wallets`, `settings.wallets.add_new_wallet`, `settings.wallets.delete_account`, `settings.wallets.cannot_delete_last`, `tabs.settings`, `general.ok`, `transactions.detail.explorerHint`, `powerups.title`.

The five `settings.*` look like leftovers from a naming that was superseded by `settings.wallets.screen_title` / `add_wallet` / `delete_confirm_title`. Caveat: 31 call sites pass a runtime-resolved key variable (`sendError`, `swapError.key`, `labelKey`, `powerup.name`…) which no static scan can trace — treat 9 as an upper bound and verify each before deleting.

**EN↔ES drift: zero.** Both files carry exactly 901 keys, fully in sync. The i18n discipline in this repo is working.

### 4.3 Exports with no production consumer in `packages/shared`

216 non-theme, non-locale files scanned. 440 exports have zero whole-word references outside their defining file and the shared barrels. Split honestly:

- **235 runtime exports** (const/function/class/enum). By area: `blockchain` 79, `utils` 50, `api` 28, `storage` 20, `motion` 19, `analytics` 12, `types` 9, `crypto` 7, `hooks` 4, `config` 3.
- **205 type-only exports**, of which **52** are hook-signature types (`Use*Params` / `Use*Result` / `Use*Options`). These are deliberate API documentation, consumed structurally. **Not dead code — do not delete them.**

Spot-checking dissolved a large fraction of the runtime list into three benign tiers, and any cleanup must sort by tier rather than deleting from the list:

- _Internal-only, correctly not exported further_ — e.g. `unlockDelayMs` (`utils/unlock-throttle.ts:61`) is called at lines 88 and 113 of its own file; it is merely over-exported through `utils/index.ts:308`.
- _Test-covered, no production caller_ — e.g. `getRequiredSol`, `isSameChain`, `getSolscanUrl`, `mergeTokenLists`, `formatUsdValue`. These have real test files; some are genuinely orphaned features, some are pre-built API.
- _Genuinely orphaned_ — `packages/shared/src/motion/wavefront.ts:257` `planWavefront` has a test that says so in its own comment: _"`planWavefront` has no caller since the riders were removed (product…)"_. `motion/crest.ts` has 14 dead exports of the same vintage.

Two areas are out of scope for change proposals per the brief and are listed as notes only: `crypto` (7 runtime, incl. `deriveEncryptionKey`, `isValidVault`) and `storage` (20 runtime, incl. every adapter factory — those are almost certainly wired dynamically by platform and the scan should not be trusted there). **Flag, do not touch.**

### 4.4 Files imported nowhere

Exactly one, across all of `packages/shared/src`:

`packages/shared/src/blockchain/ethereum/domains.ts` — zero importers, and unlike every sibling it is not re-exported from `blockchain/ethereum/index.ts`. Per `AGENTS.md` rule 5 the Ethereum surface is intentional scaffolding: **reported, not proposed for removal.**

Ruled out as false positives: `crypto/fastCrypto.native.ts`, `utils/scaling.native.ts`, `utils/ContentLoader.native.ts` (Metro platform extensions, resolved without a literal import by design) and `types/browser-extension.d.ts`, `types/crypto-modules.d.ts` (ambient declarations picked up by `tsconfig` `include`).

---

## 5. Proposed work packages

Ordered. Disjoint by file — no two packages touch the same file, so 1–4 can run in parallel.

**WP1 — Prune dead theme tokens.**
Files: `packages/shared/src/theme/{semantic.ts, spacing.ts, shadows.ts, colors.ts, typography.ts, index.ts}` + their `*.test.ts`.
Dependency: none. Direct change, no spec.
Brief: delete the §4.1 tokens (4 semantic leaves, 5 spacing, 19 componentSizes, 2 shadows + `shadowsCSS.card`, 9 gradients, 6 typography/borderWidth/blur leaves, the unused composed `theme` object), preserving every Ethereum-named gradient; run `pnpm turbo run test --filter=@salmon/shared` and `typecheck` on all five packages, since a removed token surfaces as a type error in whichever app still reads it.

**WP2 — Prune dead `types/ui` contracts.**
Files: `packages/shared/src/types/ui/address-book-panel.ts` (delete), `balance-card.ts`, `send-sheet.ts`, `types/ui/index.ts`.
Dependency: none. Direct change.
Brief: delete the 6 true-dead symbols from §2 and their barrel lines; keep all 17 `packages/ui`-only `*PropsBase` contracts untouched — they are the shapes the web/extension redesign will be written against.

**WP3 — Prune dead locale keys.**
Files: `packages/shared/src/locales/en/translation.json`, `packages/shared/src/locales/es/translation.json`.
Dependency: none. Direct change; follow the `i18n-authoring` skill.
Brief: verify each of the 9 §4.2 keys against the 31 dynamic `t(variable)` call sites, then delete from both files in the same commit so the 901↔901 parity holds.

**WP4 — Retire `useTokenDetail` onto the shared query hook.**
Files: `apps/mobile/hooks/useTokenDetail.ts` (delete), `apps/mobile/app/(app)/token/[id].tsx`.
Dependency: none. Direct change.
Brief: point the token-detail screen at `packages/shared/src/hooks/useCoinMarketData.ts` — the hook written to retire exactly this `useState`+`useEffect` pattern — and delete the mobile copy; mobile gains query-key dedup and `keepPreviousData` for free.

**WP5 — Collapse `colors` into `semantic` across mobile.** ← _the load-bearing one_
Files: the 26 `colors`-only + 46 mixed mobile files (72 files), plus new `semantic` tokens for the 6-leaf `colors.scanner.*` sub-system.
Dependency: WP1 (do not migrate tokens you are about to delete).
Spec-kit spec — the scanner tokens are a design decision, and the mapping table wants review before 72 files move.
Brief: rewrite every mobile `colors.*` reference to its `semantic.*` equivalent (`text.primary`→`text.primary`, `accent.primary`→`accent.ink`, `border.default`→`border.default`, `skeleton.*` and `scanner.*` need new tokens); delete the 9 zero-consumer `colors` leaves from §1.4; leave the 11 `packages/ui`-only leaves in place for the web cycle. This is the change that halves WP6.

**WP6 — Light-theme infrastructure + mobile migration.**
Files: `packages/shared/src/theme/semantic.ts`, `.../theme/shadows.ts`, `.../theme/contrast.test.ts`, `.../storage/types.ts`, new `packages/shared/src/contexts/ThemeContext.tsx` + `contexts/index.ts`, new `apps/mobile/src/theme/useThemedStyles.ts`, `apps/mobile/app/_layout.tsx`, the 80 module-scope stylesheet files, `apps/mobile/app/(app)/settings/*`, both locale files.
Dependency: **WP5** (hard — running this before WP5 means building a light resolver for two token layers and touching 46 files twice), and the §1.3 clarification gate must be answered first.
Spec-kit spec.
Brief: turn `semantic` into `createSemantic(mode)` behind an unchanged `export const semantic` default; add a shared, RN-agnostic `ThemeProvider` that takes `systemScheme` as a prop and persists `'system'|'light'|'dark'` under a new `STORAGE_KEYS.APPEARANCE` using the exact `CurrencyContext` storage pattern; add `useThemedStyles(factory)`; migrate the 80 stylesheets to the factory form; rebuild light `shadows` from the material rules rather than by inverting the dark values.

**Sizing WP6.** Infrastructure — `createSemantic` + light resolver map (~150 lines), `ThemeContext` (~90, closely modelled on `CurrencyContext`), `useThemedStyles` (~20), one storage key, one settings row + `en`/`es` keys, and `contrast.test.ts` parameterized over both modes with the dark assertions unmoved. That is a **2–4 day** package on its own and lands invisibly (dark-only) before any screen moves. Migration — **80 files, 480 token references, ~6 per file**, three structural lines plus a codemoddable `semantic.` → `t.` rename per file; largest is `AccountAddPanel.tsx` at 24 references. Mechanical, parallelizable by screen, **2–3 focused sessions**. The 27 JSX-only files and all 34 token-free stylesheets need no work at all. The genuine unknowns are not the file count — they are the light shadow rebuild and the `.pen`-vs-DESIGN.md source-of-truth question, both of which should be settled before the spec is written rather than discovered during it.

**Residual risk / intentionally preserved:** `packages/shared/src/crypto` and `src/storage` findings are reported and untouched; `packages/shared/src/blockchain/ethereum/domains.ts` and every Ethereum-named token stay per `AGENTS.md` rule 5; all 17 `packages/ui`-only `types/ui` contracts stay despite the breaking-change allowance; `packages/ui/src/theme/index.ts:33` and the extension/web `colors` consumers are left for the next cycle; the 52 hook-signature types in §4.3 are deliberate API surface and are excluded from every cleanup package.
