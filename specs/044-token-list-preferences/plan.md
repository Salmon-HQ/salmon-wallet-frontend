# Implementation Plan: Token list preferences

**Branch**: `feat/044-token-list-preferences` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/044-token-list-preferences/spec.md` (Linear DEV-90), with the owner's decisions of 2026-11-25 recorded in it: fixed presets on the existing single-choice list, the threshold in the display currency through the row's conversion, unpriced tokens fold, both rules must pass, SOL never folded by value and counted in N, staked positions never folded and never counted, the unfolded state not stored, unverified tokens ordinary, both off by default, global per device, Home's Solana list only, the row states its choice, the "Show more" row subject to the owner's visual sign-off.

## Summary

One pure function in `packages/shared` splits Home's Solana token list into visible and folded tokens from two stored choices (a count and a threshold in the display currency), exempting native SOL from the threshold and staked positions from both. A shared hook holds the unfolded state per Home visit; both Homes pass the visible part to the `TokenList` they already draw and close it with a new "Show more" row, the kit's `ListRow` drawn as the confirmation's "Details" disclosure. Settings gains a "Token list" row second in Preferences, opening a screen made of the frame, two section labels and two `SettingsSelectorList`s. The choice is one optional field of the existing settings record, carried by the provider that already carries "Show unverified tokens". Before any of it, a separate commit fixes a real, reproduced bug that lets one settings writer erase another's field, which would otherwise erase this preference too. No new dependency, no storage key, no permission, no backend change, no analytics event.

## Technical Context

**Language/Version**: TypeScript 5 strict, React 19; React Native / Expo (`apps/mobile`), DOM via WXT MV3 (`apps/extension`) over `@salmon/ui`.

**Primary Dependencies**: none new. `expo-router` `useFocusEffect` (installed, used by `OnboardingLayout`), `fast-check` for the property test (already used by `*.security.test.ts`).

**Storage**: one optional field, `UserConfig.tokenList`, in the existing `STORAGE_KEYS.SETTINGS` record (data-model.md). `packages/shared/src/storage` is not touched.

**Testing**: Vitest (`packages/shared`, `packages/ui`), Jest (`apps/mobile`); Playwright and Maestro, one each; gates `check:parity`, `check:i18n`, `check:dead-code`, coverage ratchets.

**Target Platform**: iOS/Android (JS-only, OTA-able) and the extension side panel.

**Project Type**: pnpm + turbo monorepo, two apps on two shared packages.

**Performance Goals**: folding is one pass over at most a few hundred tokens per render, memoised on the list, the preference and the rate; no request.

**Constraints**: twins on one contract; no new visual language beyond the one row; the DOM clone ceiling only goes down (the two registry entries and the two rows are markup over shared hooks).

**Scale/Scope**: 1 bug fix (1 file + 1 test), 1 pure module + 1 hook module + 3 test files in shared, 4 changed shared files, 2 contract additions, 1 new row per twin, 2 kit twins gaining one optional prop, 2 Homes, 2 registries, 2 Settings roots, 10 translation keys, 2 e2e files, 4 docs.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status | How                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Ownership boundaries             | PASS   | Rule, presets, labels, fold state, persistence, settings table, copy: `packages/shared`. Row contract: `packages/shared/src/types/ui`. DOM row: `packages/ui`. RN row: `apps/mobile`. Screen markup: each app's panel registry. Focus wiring: each Home.                                                                                                                        |
| II. Consumers named                 | PASS   | §Consumers below, from a grep of every changed export. Every change is additive (optional props, new union members, new exports); no export path or barrel renamed.                                                                                                                                                                                                             |
| III. Wallet safety (NON-NEGOTIABLE) | PASS   | Nothing in `crypto/`, `storage/`, signing or auth. The persistence fix is in `hooks/useUserConfig.ts` and keeps using `getStorage()` as it does today; flagged for the reviewer because it changes how every setting is saved (research R4). Folding never hides staked funds and never changes a total (FR-013, FR-017).                                                       |
| IV. Bilingual strings               | PASS   | 10 keys, English and Spanish in contracts/ui-contracts.md; Spanish written by the implementer per the owner's standing trust for UI copy (spec FR-020), reviewed in the PR.                                                                                                                                                                                                     |
| V. Functional coverage first        | PASS   | The rule is test-first with 20 vectors and a property test; hooks and the bug fix have their own tests; one render test per new row twin. One e2e per app, because the setting's effect crosses Settings → Home.                                                                                                                                                                |
| VI. Ask rather than guess           | PASS   | Every product question decided by the owner (spec). Open for the owner, each with a default, listed at the top of tasks.md: the row's and the screen's look (sign-off below), the token-visit refold (research R6), whether staked positions count toward N, and whether the screen is registry markup or a panel component (research R8). Group C of tasks.md waits for these. |
| Platform constraints                | PASS   | No `app.json`, plugin or permission change; `check:manifest` shows no diff. No identifier renamed.                                                                                                                                                                                                                                                                              |
| Design tokens                       | PASS   | The row is `ListRow` + `CaretDownIcon` at kit sizes and semantic inks; no literal.                                                                                                                                                                                                                                                                                              |

Post-design re-check: unchanged. The one kit change (`accessibilityExpanded` on `Card`/`ListRow`) is additive and closes an accessibility gap the disclosure idiom worked around by hand.

## Architecture decisions

| Piece                              | Lives in                                                                                                      | Reuses                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Which tokens fold                  | `utils/tokenListFold.ts` `foldTokenList` (pure)                                                               | `isNativeSol`, `STAKED_SOL_KEY`/`STAKED_SKR_KEY`, the context's `convert` (R1–R3)                             |
| Presets, validation                | same file (`TOKEN_LIST_*_PRESETS`, `normalizeTokenListPreference`)                                            | —                                                                                                             |
| Stored choice                      | `UserConfig.tokenList`, `useUserConfig` (`tokenListPreference`, `setTokenListPreference`)                     | The existing settings record and its writer, fixed first (R4)                                                 |
| Live choice for every screen       | `DeveloperModeContext` + `useTokenListPreference()`                                                           | The provider already above every screen (R5)                                                                  |
| Fold state per Home                | `hooks/useTokenListPreference.ts` `useTokenListFold`                                                          | `useCurrencyContext().convert` (R6)                                                                           |
| Settings copy (options, row value) | same file, `useTokenListLabels`                                                                               | `formatValue`, `exchangeRate` (R3), the `appearanceRows` idiom                                                |
| Settings row                       | `settings/registry.ts` (`SETTINGS_GROUPS`, `settingsRowValues`), `types/settings.ts` (`SettingsScreen`, slug) | Both Settings roots' existing renderers (R9)                                                                  |
| Settings screen                    | `tokenList` entry in each `panelRegistry.tsx`                                                                 | `SettingsScreenLayout` / `SettingsPanelContent`, `SectionLabel`, `SettingsSelectorList` (R8)                  |
| "Show more" row                    | `TokenListFoldRow` in each `TokenList` folder, contract in `types/ui/token-list.ts`                           | `ListRow` (+ `accessibilityExpanded`), `CaretDownIcon`, the `ConfirmationDetailsCard` disclosure anatomy (R7) |

What is deliberately not built: a new storage key or context (R4, R5), a panel component per platform for the screen (R8; the owner may ask for it), a dollar threshold or converted presets (owner decision), rounding the compared value to cents (R3, accepted edge).

## The persistence fix (first commit, its own test)

Real and pre-existing (research R4, reproduced with a failing test on this branch). `useUserConfig` instances each spread a private copy of the whole settings record into every write; seven call sites keep several instances alive at once, so the explorer panel's write erases "Show unverified tokens" written moments before by the provider, and the reverse. The new preference would be lost the same way.

Fix: in `packages/shared/src/hooks/useUserConfig.ts`, a module-level `persistPatch(patch)` serialises writes on one promise chain and does read-merge-write on the stored record; every setter passes only its own field and sets local state from the merged result; the mount-time defaults write runs only when a default was missing. No public API change, no `storage/` change.

Commit: `fix(settings): a setting written in one place no longer erases another`, with `useUserConfig.instances.test.tsx`: the reproduction (two instances, unverified then explorer, both kept) and the reverse order, plus two setters from two instances fired without awaiting between them.

## Owner sign-off: the "Show more" row and the Token list screen

The row is the one new piece of UI. It is built only after the owner approves these mocks (plain ASCII; widths and copy are indicative, every visual is an existing kit part).

**Home, folded** (count 3, staked SOL held; the total counts everything):

```text
┌────────────────────────────────────────┐
│ (A) Wallet A ▾                 ⧉    ⚙  │
│                                        │
│               €1,284.50                │
│              ▲ €26.40 today            │
│                                        │
│   Portfolio    NFTs                    │
│   ─────────                            │
│ ┌────────────────────────────────────┐ │
│ │ (◎) Solana                 2.10 SOL│ │
│ │     SOL · €180.20 · +1.2%    €378.42│ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ (J) Jupiter                 820 JUP│ │
│ │     JUP · €0.75 · -0.4%      €615.00│ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ (B) Bonk                  9.1M BONK│ │
│ │     BONK · €0.00002 · +3.0%  €182.00│ │
│ └────────────────────────────────────┘ │
│   Show 7 more                       ⌄  │  ← new: ListRow, clear tone, caret
│                                        │
│   Staking                              │
│ ┌────────────────────────────────────┐ │
│ │ (◎) Staked SOL             0.60 SOL│ │
│ │     Solana                   €108.12│ │
│ └────────────────────────────────────┘ │
│          Prices by CoinGecko           │
└────────────────────────────────────────┘
```

**Home, expanded** (same wallet, after tapping the row):

```text
┌────────────────────────────────────────┐
│               €1,284.50                │
│   Portfolio    NFTs                    │
│   ─────────                            │
│ ┌────────────────────────────────────┐ │
│ │ (◎) Solana                   €378.42│ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ (J) Jupiter                  €615.00│ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ (B) Bonk                     €182.00│ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ (U) USD Coin                   €0.92│ │  ← the seven folded tokens,
│ └────────────────────────────────────┘ │    same rows, same order
│   …  (six more token rows)             │
│ ┌────────────────────────────────────┐ │
│ │ (?) Unknown token                 — │ │
│ └────────────────────────────────────┘ │
│   Show less                         ⌃  │  ← same row, caret turned
│                                        │
│   Staking                              │
│ ┌────────────────────────────────────┐ │
│ │ (◎) Staked SOL               €108.12│ │
│ └────────────────────────────────────┘ │
│          Prices by CoinGecko           │
└────────────────────────────────────────┘
```

**Settings, Preferences group, and the Token list screen** (pushed panel, as Language and Currency):

```text
┌────────────────────────────────────────┐   ┌────────────────────────────────────────┐
│ ‹  Settings                            │   │ ‹  Token list                          │
│                                        │   │    Choose how many tokens Home shows.  │
│ PREFERENCES                            │   │    The rest stay one tap away.         │
│ ┌────────────────────────────────────┐ │   │                                        │
│ │ (文) Display Language      English │ │   │ Tokens shown                           │
│ └────────────────────────────────────┘ │   │ ┌────────────────────────────────────┐ │
│ ┌────────────────────────────────────┐ │   │ │ All                                │ │
│ │ (≣) Token list 3 tokens · from €5.00│ │   │ └────────────────────────────────────┘ │
│ └────────────────────────────────────┘ │   │ ┌────────────────────────────────────┐ │
│ ┌────────────────────────────────────┐ │   │ │ 3 tokens                         ✓ │ │
│ │ (€) Display Currency           EUR │ │   │ └────────────────────────────────────┘ │
│ └────────────────────────────────────┘ │   │   5 tokens · 10 tokens · 20 tokens     │
│ ┌────────────────────────────────────┐ │   │   (one row each, same card)            │
│ │ (↗) Select Explorer        Solscan │ │   │                                        │
│ └────────────────────────────────────┘ │   │ Hide tokens worth less than            │
│ ┌────────────────────────────────────┐ │   │ ┌────────────────────────────────────┐ │
│ │ (◐) Appearance              System │ │   │ │ Off                                │ │
│ └────────────────────────────────────┘ │   │ └────────────────────────────────────┘ │
│                                        │   │   €1.00                                │
│ ADVANCED …                             │   │ ┌────────────────────────────────────┐ │
└────────────────────────────────────────┘   │ │ €5.00                            ✓ │ │
                                             │ └────────────────────────────────────┘ │
                                             │   €10.00 · €50.00                      │
                                             └────────────────────────────────────────┘
```

(`≣` stands for the `StackIcon` glyph; each option is its own `SettingsSelectorList` row card with the trailing check, exactly as on the Currency screen.)

## Consumers of what changes in `packages/shared` and `packages/ui`

Counts are files outside tests, from `grep -rlw <name>` over `apps` and `packages` on this branch.

| Export (change)                                                                                                             | Consumers                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useUserConfig` (internal write path; result gains two fields)                                                              | 7 call sites: `DeveloperModeContext.tsx`, `useSettingsPanelData.ts`, `useAvailableNetworks.ts`, `useWalletsScreen.ts`, `useDerivedAccountsScan.ts`, extension `SettingsPage.tsx`, mobile `settings/index.tsx`. None destructures a field that changes.                                                                             |
| `UserConfig` (+ `tokenList?`)                                                                                               | `types/account.ts`, `useUserConfig.ts` only                                                                                                                                                                                                                                                                                        |
| `DeveloperModeContextValue` (+ 2 members), new `useTokenListPreference`                                                     | Provider mounted by extension `AppProviders.tsx`, mobile `app/(app)/_layout.tsx` (re-export `apps/mobile/src/contexts/DeveloperModeContext.tsx`); readers `useDeveloperModeSettings` (extension `panelRegistry.tsx`, `HomePage.tsx`, `useDeveloperModeToggles.ts`), `useUnverifiedTokens` (11), `useDeveloperMode` (9) — unchanged |
| `CardPropsBase` (+ optional `accessibilityExpanded`)                                                                        | DOM `Card` + `types.ts`, mobile `Card/types.ts`, `kit/createBlockList.tsx`; `Card` itself is used in 110 files, none affected (prop optional, rendered only when set)                                                                                                                                                              |
| `ListRowPropsBase` (+ same)                                                                                                 | DOM `ListRow` + `types.ts`, mobile `ListRow/types.ts`, `kit/createBlockList.tsx`; `ListRow` used in 55 component files, none affected                                                                                                                                                                                              |
| `TokenListPropsBase` file (+ `TokenListFoldRowPropsBase`)                                                                   | `TokenList/types.ts` on both platforms; `TokenListPropsBase` itself unchanged                                                                                                                                                                                                                                                      |
| `SETTINGS_GROUPS` (+ row)                                                                                                   | mobile `settings/index.tsx`, `SettingsPanelStack.tsx`, `registry.test.ts` (gains a case for the Preferences order, US4 AC1)                                                                                                                                                                                                        |
| `SettingsIconName` (+ `'stack'`)                                                                                            | mobile `settings/index.tsx` and `SettingsPanelStack.tsx` (`Record<SettingsIconName, …>`: both maps gain `stack`, typecheck enforces)                                                                                                                                                                                               |
| `SettingsValueRowId`, `settingsRowValues` (+ `tokenList`)                                                                   | extension `SettingsPage.tsx`, mobile `settings/index.tsx`, `SettingsPanelStack/types.ts` (re-export), `registry.test.ts`                                                                                                                                                                                                           |
| `SettingsScreen` (+ `'tokenList'`)                                                                                          | 13 files; both `PanelRegistry` types are `Partial<Record<…>>`, so no other registry changes                                                                                                                                                                                                                                        |
| `SETTINGS_ITEM_SLUGS` (+ `tokenList`)                                                                                       | `getSettingsItemTestId` → mobile `settings/index.tsx`, `SettingsPanelStack.tsx`                                                                                                                                                                                                                                                    |
| New: `foldTokenList`, presets, `normalizeTokenListPreference`, `useTokenListFold`, `useTokenListLabels`, `TokenListFoldRow` | Both Homes, both registries, both Settings roots (each export has a reader on both platforms, so `check:dead-code` and the parity "dead contract" check stay green)                                                                                                                                                                |

## Files to create or modify

| Package / app     | File                                                                                 | Change                                                                                                  | Component reused                                               |
| ----------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `packages/shared` | `src/hooks/useUserConfig.ts`                                                         | Commit 1: `persistPatch` read-merge-write queue. Later: `tokenListPreference`, `setTokenListPreference` | —                                                              |
|                   | `src/hooks/useUserConfig.instances.test.tsx` (new)                                   | Commit 1: the reproduction and the concurrency case                                                     | —                                                              |
|                   | `src/utils/tokenListFold.ts` + `.test.ts` (new)                                      | The rule, presets, normaliser; tests first (contracts/token-list-fold.md)                               | `isNativeSol`, staking keys                                    |
|                   | `src/hooks/useTokenListPreference.ts` + `.test.tsx` (new)                            | `useTokenListFold`, `useTokenListLabels`                                                                | `useCurrencyContext`                                           |
|                   | `src/types/account.ts`                                                               | `UserConfig.tokenList?`                                                                                 | —                                                              |
|                   | `src/contexts/DeveloperModeContext.tsx` (+ test)                                     | Carry the preference; `useTokenListPreference()`                                                        | the existing provider                                          |
|                   | `src/settings/registry.ts` (+ `registry.test.ts`)                                    | Row, `'stack'`, `tokenList` row value                                                                   | `SETTINGS_GROUPS`, `settingsRowValues`                         |
|                   | `src/types/settings.ts`                                                              | `'tokenList'` screen, slug `token-list`                                                                 | `getSettingsItemTestId`                                        |
|                   | `src/types/ui/card.ts`, `src/types/ui/list-row.ts`                                   | `accessibilityExpanded?`                                                                                | —                                                              |
|                   | `src/types/ui/token-list.ts`                                                         | `TokenListFoldRowPropsBase`                                                                             | —                                                              |
|                   | `src/utils/index.ts`, `src/hooks/index.ts`, `src/contexts/index.ts`                  | Named exports                                                                                           | —                                                              |
|                   | `src/locales/en/translation.json`, `es/translation.json`                             | 10 keys                                                                                                 | —                                                              |
| `packages/ui`     | `src/components/Card/Card.tsx`                                                       | `aria-expanded`                                                                                         | `Card`                                                         |
|                   | `src/components/ListRow/ListRow.tsx` (+ test)                                        | Forward the prop                                                                                        | `ListRow`                                                      |
|                   | `src/components/TokenList/TokenListFoldRow.tsx` + test (new), `types.ts`, `index.ts` | The row                                                                                                 | `ListRow`, `CaretDownIcon`                                     |
|                   | `src/components/SettingsPanelStack/SettingsPanelStack.tsx`                           | `stack: StackIcon`                                                                                      | `SettingsPanelStack`                                           |
| `apps/extension`  | `src/settings/panelRegistry.tsx`                                                     | `tokenList` panel                                                                                       | `SettingsPanelContent`, `SectionLabel`, `SettingsSelectorList` |
|                   | `src/pages/settings/SettingsPage.tsx`                                                | `tokenList` row value                                                                                   | `settingsRowValues`                                            |
|                   | `src/pages/home/HomePage.tsx`                                                        | `useTokenListFold`, pass to column                                                                      | —                                                              |
|                   | `src/pages/home/PortfolioColumn.tsx`                                                 | Visible tokens; row before Staking                                                                      | `TokenList`, `TokenListFoldRow`, `BlockList`                   |
|                   | `.playwright/tests/token-list-preferences.spec.ts` (new)                             | E2E                                                                                                     | —                                                              |
| `apps/mobile`     | `src/components/Card/Card.tsx`                                                       | `accessibilityState.expanded`                                                                           | `Card`                                                         |
|                   | `src/components/ListRow/ListRow.tsx` (+ test)                                        | Forward the prop                                                                                        | `ListRow`                                                      |
|                   | `src/components/TokenList/TokenListFoldRow.tsx` + test (new), `types.ts`, `index.ts` | The row                                                                                                 | `ListRow`, `CaretDownIcon`                                     |
|                   | `src/settings/panelRegistry.tsx`                                                     | `tokenList` panel                                                                                       | `SettingsScreenLayout`, `SectionLabel`, `SettingsSelectorList` |
|                   | `app/(app)/settings/index.tsx`                                                       | `stack: StackIcon`, `tokenList` row value                                                               | `settingsRowValues`                                            |
|                   | `app/(app)/(tabs)/index.tsx`                                                         | `useTokenListFold`, `useFocusEffect` visit key, row first in the footer                                 | `TokenList`, `TokenListFoldRow`, `BlockList`                   |
|                   | `.maestro/flows/smoke/settings/token-list.yaml` (new)                                | E2E                                                                                                     | —                                                              |
| root / docs       | `DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/ANALYTICS.md`, `CLAUDE.md`                | §Documentation                                                                                          | —                                                              |

## Commit order

1. `fix(settings): a setting written in one place no longer erases another` — `useUserConfig` + its test (red first).
2. `feat(shared): token list folding rule` — `tokenListFold` tests, then the module.
3. `feat(shared): token list preference in settings` — `UserConfig`, `useUserConfig`, `DeveloperModeContext`, hooks + tests, the row's plumbing (screen id, slug, row value) and the four keys `useTokenListLabels` reads. The `SETTINGS_GROUPS` row, the `'stack'` glyph and the other six keys wait for commit 5, where their readers land, so this commit draws nothing and `check:i18n` finds no orphan.
4. `feat(kit): ListRow announces an expanded state` — after the owner's sign-off on the mocks.
5. `feat: Token list in Settings and folding on Home, both apps` — the `TokenListFoldRow` twins and their contract, the Settings row, registries, Settings roots, Homes. The twins ride here because `check:dead-code` reports the mobile row unused until the mobile Home renders it.
6. `test(e2e): token list preferences` and `docs: token list preferences; DESIGN.md and ARCHITECTURE.md match the code`.

## Documentation (same PR)

- **`DESIGN.md`**: add the "Token list" screen to the Settings description and the "Show more" disclosure where lists are described (a folded list ends with a clear `ListRow` disclosure; staking is never folded). Correct the statements that disagree with the code (items 1–3 in `DESIGN.md`, item 4 in `docs/ARCHITECTURE.md`), each verified on this branch:
  1. `DESIGN.md:688` says single-pick selectors (language, currency, explorer) "stay sheets". They are pushed panels: `SettingsPanelContent` in the DOM stack, the `[panel]` route on mobile (`apps/mobile/app/(app)/settings/[panel].tsx`). Rewrite as pushed screens of the Settings stack.
  2. MUI is described as shipping at `DESIGN.md:198, 395, 613, 628, 635, 645, 758` ("MUI theme", `MuiOutlinedInput`, `.Mui-focusVisible`, "MUI baseline"), while `DESIGN.md:726`, `packages/ui/src/icons.ts:26` and `packages/ui/src/theme/index.ts` say MUI left on 2026-09-02, and no `package.json` lists `@mui`. Rewrite those passages against `packages/ui/src/theme` (`ThemeProvider`, `cssVars`, `fieldShell`), or mark them as retired where nothing replaced them.
  3. `DESIGN.md:665` says chips are "never for selection state", while `ChipGroup` is "a horizontally scrollable row of single-select chips" (`packages/ui/src/components/Chip/ChipGroup.tsx:2`, mobile twin) used for selection in Send's amount shortcuts (`apps/mobile/app/(app)/send/amount.tsx:184`, `packages/ui/src/components/SendPage/StepAmount.tsx`), Swap and the Payments ask sheet. State the rule the code follows: lateral navigation choices take the underline; a one-shot value pick inside a form may use `ChipGroup`.
  4. `docs/ARCHITECTURE.md:46` lists language among the flow states that live once in `packages/shared`. The extension reads `useLanguage` from `@salmon/shared` (`packages/shared/src/hooks/useLanguage.ts`), but mobile keeps its own (`apps/mobile/src/i18n/useLanguage.ts`, SecureStore), imported by `apps/mobile/src/settings/panelRegistry.tsx`. Say so in the line.
- **`docs/ANALYTICS.md:167`**: add "token list" to the Settings preferences that report nothing.
- **`CLAUDE.md`**: the SPECKIT pointer moves to this plan (done in this commit).

## Open risks and departures

- **Refold after a token visit** (research R6): opening a token from the unfolded list and coming back folds the list, as decided. If the owner wants it to stay open across a token visit, `resetKey` drops the "on screen" part.
- **Presets in weak currencies**: 1–50 of the display currency is a few cents in yen or pesos; decided by the owner (same numbers in every currency), recorded in the spec's assumptions.
- **Half-cent boundary** (research R3): a value that rounds up to the threshold on the row still folds.
- **Wrapped SOL** held as a token is treated as native by the existing sort and by the rule (research R1).
- **Settings screen as registry markup** rather than a panel component (research R8), because the brief limits new components to the row; moving it into a `TokenListPanel` twin later changes no behaviour.
- **Persistence fix** changes how every setting is saved; outside the constitution's gated paths but worth a careful review.

## Project Structure

### Documentation (this feature)

```text
specs/044-token-list-preferences/
├── plan.md              # this file
├── spec.md              # decided 2026-11-25
├── research.md          # R1–R10, the persistence reproduction
├── data-model.md        # stored preference, fold, state
├── quickstart.md        # checks, e2e, hand test, sign-offs
├── contracts/
│   ├── token-list-fold.md   # shared rule + hooks + test vectors
│   └── ui-contracts.md      # kit change, row, Home placement, Settings, test ids, copy
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared/src/
├── hooks/useUserConfig.ts                 # persistPatch (commit 1); tokenList preference
├── hooks/useUserConfig.instances.test.tsx # NEW: two instances keep each other's fields
├── hooks/useTokenListPreference.ts        # NEW: useTokenListFold, useTokenListLabels
├── utils/tokenListFold.ts                 # NEW: foldTokenList, presets, normaliser
├── contexts/DeveloperModeContext.tsx      # + tokenListPreference, useTokenListPreference
├── settings/registry.ts                   # + tokenList row, 'stack', row value
├── types/{account,settings}.ts            # + UserConfig.tokenList, 'tokenList' screen + slug
├── types/ui/{card,list-row,token-list}.ts # + accessibilityExpanded, TokenListFoldRowPropsBase
└── locales/{en,es}/translation.json       # 10 keys

packages/ui/src/components/
├── Card/Card.tsx, ListRow/ListRow.tsx     # aria-expanded
├── TokenList/TokenListFoldRow.tsx         # NEW
└── SettingsPanelStack/SettingsPanelStack.tsx  # stack glyph

apps/extension/
├── src/settings/panelRegistry.tsx         # tokenList panel
├── src/pages/settings/SettingsPage.tsx    # row value
├── src/pages/home/{HomePage,PortfolioColumn}.tsx  # fold
└── .playwright/tests/token-list-preferences.spec.ts  # NEW

apps/mobile/
├── src/components/{Card,ListRow}/…        # accessibilityState.expanded
├── src/components/TokenList/TokenListFoldRow.tsx  # NEW
├── src/settings/panelRegistry.tsx         # tokenList panel
├── app/(app)/settings/index.tsx           # glyph, row value
├── app/(app)/(tabs)/index.tsx             # fold, focus key
└── .maestro/flows/smoke/settings/token-list.yaml  # NEW
```

**Structure Decision**: everything that decides — which tokens fold, which choices exist, what the row says, when the list folds again, how the choice is saved — is one implementation in `packages/shared`, so the twins only draw: one row each, one registry entry each, and the wiring on each Home.

## Complexity Tracking

| Violation                                       | Why Needed                                                                               | Simpler Alternative Rejected Because                                                                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| A kit contract change (`Card`, `ListRow`)       | FR-018: the row must announce its expanded state, and `ListRow` cannot today             | A hand-drawn button (as `ConfirmationDetailsCard` does) is a second disclosure shape, against the owner's "no new visual language" rule |
| A fix to a shared persistence path in a feature | The new preference is erased by the same bug that erases existing settings (research R4) | Shipping the preference on the buggy writer loses it; a separate storage key needs constitution III sign-off and leaves the bug         |
