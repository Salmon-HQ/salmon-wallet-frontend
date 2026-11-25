# Tasks: Token list preferences — show fewer tokens on Home, the rest behind "Show more"

**Input**: Design documents from `specs/044-token-list-preferences/` (Linear DEV-90)

**Prerequisites**: plan.md, spec.md (owner decisions 2026-11-25), research.md, data-model.md, contracts/token-list-fold.md, contracts/ui-contracts.md, quickstart.md

**Tests**: test-first for every rule (the persistence fix, the folding rule, the preference hooks, the kit change, the row, the Home wiring). A test task is written and seen failing before its implementation task starts.

**Node**: every command runs after `export PATH="$HOME/Library/Application Support/Herd/config/nvm/versions/node/v24.21.0/bin:$PATH"`. Single test files run as `pnpm --filter <package> test <path relative to the package>` (Vitest for `@salmon/shared`, `@salmon/ui`, `@salmon/extension`; Jest for `@salmon/mobile`).

**Placement rule**: every decision (which tokens fold, the presets, the labels, when the list folds again, how the choice is saved) lives in `packages/shared`; the twins only draw. `CROSS_PLATFORM_CLONE_LINES_MAX` in `scripts/check-dom-parity.mjs` must not go up.

## Open owner questions

Each has the default the documents assume today. Tasks that change if the answer changes carry the question's tag.

- **Q1 — refold after a token visit.** Default: opening a token from the unfolded list and coming back shows the list folded again (research R6, plan §Open risks). A different answer changes only how each Home builds `resetKey` (drop the "on screen" part). Affects T029, T030, T044.
- **Q2 — staked positions and the count N.** Default: staked positions never count toward N and are never folded (spec FR-013, US3 AC2, data-model step 1). A different answer changes vectors 16–18 of contracts/token-list-fold.md, FR-013, US3 AC2 and the rule's step 1. Affects T005, T006.
- **Q3 — where the Token list screen lives.** Default: inline in each app's panel registry (`tokenList` entry), no new component (research R8). The alternative is a `TokenListPanel` twin per platform with the same markup. Affects T026, T027.

## Three groups, three stopping points

| Group | Phases | Ships as                                                                                                 | UI change |
| ----- | ------ | -------------------------------------------------------------------------------------------------------- | --------- |
| A     | 1      | `fix(settings): a setting written in one place no longer erases another`                                 | none      |
| B     | 2      | `feat(shared): token list folding rule`, then `feat(shared): token list preference in settings`          | none      |
| C     | 3–6    | `feat(kit): …`, `feat: Token list in Settings and folding on Home, both apps`, `test(e2e): …`, `docs: …` | all       |

Each group ends on a checkpoint where every gate is green, so the work can stop there and the branch is still mergeable.

**What moved from B to C, and why.** Three pieces the plan files under the shared foundation land with their first consumer in group C, so that group B adds no visible UI and keeps every gate green:

- The `tokenList` row in `SETTINGS_GROUPS` and the `'stack'` glyph name: adding the row draws it on both Settings screens (a row with no panel behind it), and adding `'stack'` to `SettingsIconName` forces both apps' `SETTINGS_ICONS` maps. Group B adds the row's plumbing only (screen id, slug, row value).
- Six of the ten translation keys (`settings.token_list`, `settings.token_list_subtitle`, `settings.token_list_count_title`, `settings.token_list_min_value_title`, `wallet.show_more_tokens`, `wallet.show_less_tokens`): `scripts/check-i18n.mjs` fails on a key nothing reads, and their readers are the row, the screen and the "Show more" row. Group B adds the four keys `useTokenListLabels` reads.
- `TokenListFoldRowPropsBase` and `accessibilityExpanded`: the parity check's "dead" rule fails on a contract under `packages/shared/src/types/ui` with no consumer on any platform.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US4 from spec.md

---

## Phase 1: Group A — the settings persistence fix (blocks everything)

**Purpose**: the pre-existing bug of research R4. Two `useUserConfig` instances each write their private copy of the whole settings record, so one erases the field the other just wrote. The new preference would be erased the same way. No UI.

- [x] T001 Write the failing test NEW `packages/shared/src/hooks/useUserConfig.instances.test.tsx` with the in-memory storage mock of `packages/shared/src/hooks/useUserConfig.total.test.tsx`: (a) research R4's reproduction — instance one `setShowUnverifiedTokens(true)`, then instance two `changeExplorer('solanaFm')`, stored record keeps both; (b) the reverse order (explorer first through one instance, `toggleDeveloperNetworks` through the other, explorer kept); (c) two setters on two instances fired without awaiting between them (`Promise.all`), both fields stored; (d) mounting an instance on a record that already has every default writes nothing (`setItem` not called). Run `pnpm --filter @salmon/shared test src/hooks/useUserConfig.instances.test.tsx` and see (a)–(c) fail (`expected undefined to be true`) before T002.
- [x] T002 Fix `packages/shared/src/hooks/useUserConfig.ts`: a module-level `persistPatch(patch: Partial<UserConfig>): Promise<UserConfig>` chained on one promise, each write reading the stored record through `getStorage().getItem`, merging only the patch, writing with `setItem` and returning the merged record; `changeExplorer`, `toggleDeveloperNetworks`, `setShowUnverifiedTokens`, `setIncludedInTotal`, `markDerivedScanned` pass only their own field and set local state from the result; the mount-time defaults write runs only when a default was missing, through the same queue. No public type change, nothing in `packages/shared/src/storage`. Proof: `pnpm --filter @salmon/shared test src/hooks/useUserConfig` (T001 plus the existing `useUserConfig.test.ts`, `useUserConfig.total.test.tsx`, `useUserConfig.developer.test.tsx`, `useUserConfig.derived.test.tsx`) all green. Depends on T001.
- [x] T003 Group A checkpoint: `pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/ui --filter=@salmon/extension --filter=@salmon/mobile` green (the seven `useUserConfig` call sites of research R4 are unchanged and their tests pass). Stash the T002 change once and watch T001 go red again (quickstart §1). Commit only the two files as `fix(settings): a setting written in one place no longer erases another`. Depends on T002.

**Checkpoint A**: the bug is fixed on its own commit; nothing visible changed. The work may stop here.

---

## Phase 2: Group B — the shared foundation (no UI)

**Purpose**: everything that decides, in `packages/shared`, with its tests. Neither app draws anything new yet.

### The folding rule (commit `feat(shared): token list folding rule`)

- [x] T004 [P] Add `tokenList?: { maxCount: number | null; minValue: number | null }` to `UserConfig` in `packages/shared/src/types/account.ts` (inline shape, so `types/` does not import from `utils/` and `pnpm check:cycles` stays clean). Proof: `pnpm --filter @salmon/shared typecheck`.
- [x] T005 [P] (owner Q2) Write the failing tests NEW `packages/shared/src/utils/tokenListFold.test.ts`: all 20 vectors of contracts/token-list-fold.md (vector 19 as a `fast-check` property: `visible` and `folded` together are the input, each in input order, nothing duplicated; vector 20: the input array is not mutated), and every `normalizeTokenListPreference` case listed there (`undefined`, `null`, `{}` → default; `{ maxCount: 3, minValue: 5 }` kept; `{ maxCount: 4 }`, `{ maxCount: '3' }`, `{ maxCount: -1 }`, `{ minValue: NaN }`, `{ minValue: 2 }` → that half `null`, the other kept). `SOL` is `SOL_CONSTANTS.ADDRESS`, `sSOL`/`sSKR` are `STAKED_SOL_KEY`/`STAKED_SKR_KEY` from `packages/shared/src/utils/staking.ts`. Run `pnpm --filter @salmon/shared test src/utils/tokenListFold.test.ts` and see it fail (module missing).
- [x] T006 (owner Q2) Implement NEW `packages/shared/src/utils/tokenListFold.ts`: `TOKEN_LIST_COUNT_PRESETS`, `TOKEN_LIST_MIN_VALUE_PRESETS`, `TokenListPreference`, `DEFAULT_TOKEN_LIST_PREFERENCE`, `normalizeTokenListPreference`, `foldTokenList` exactly as the contract and the walk in data-model.md §TokenListFold (staked → visible without taking a place; `isNativeSol` from `packages/shared/src/utils/tokens.ts` exempt from the threshold; unpriced = `null`, `undefined` or not finite; strict `<` folds; never re-sorts). Export from `packages/shared/src/utils/index.ts`. Proof: `pnpm --filter @salmon/shared test src/utils/tokenListFold.test.ts` green. Depends on T005.
- [x] T007 Commit T005–T006 as `feat(shared): token list folding rule` after `pnpm --filter @salmon/shared typecheck && pnpm --filter @salmon/shared lint && pnpm check:dead-code && pnpm check:cycles` pass. Depends on T006.

### The preference (commit `feat(shared): token list preference in settings`)

- [x] T008 Add failing cases to `packages/shared/src/hooks/useUserConfig.instances.test.tsx`: `tokenListPreference` reads `DEFAULT_TOKEN_LIST_PREFERENCE` when the record has no `tokenList` and nothing is written on mount (FR-004); a stored non-preset half reads as `null`; `setTokenListPreference({ maxCount: 3, minValue: 5 })` on one instance followed by `changeExplorer` and `setShowUnverifiedTokens` on another keeps all three fields, and the reverse order too (FR-008, US4 AC5). Run `pnpm --filter @salmon/shared test src/hooks/useUserConfig.instances.test.tsx` and see the new cases fail. Depends on T003, T006.
- [x] T009 Add `tokenListPreference` (through `normalizeTokenListPreference`) and `setTokenListPreference(next)` (through `persistPatch({ tokenList: next })`) to `UseUserConfigResult` in `packages/shared/src/hooks/useUserConfig.ts`. Proof: `pnpm --filter @salmon/shared test src/hooks/useUserConfig` green. Depends on T008.
- [x] T010 Write the failing test NEW `packages/shared/src/contexts/DeveloperModeContext.test.tsx` (storage mocked as in `useUserConfig.total.test.tsx`, provider rendered with a test account): `useTokenListPreference()` outside the provider returns `DEFAULT_TOKEN_LIST_PREFERENCE` and a no-op setter; inside it returns the stored preference; calling the setter re-renders a second reader under the same provider with the new value, without remount (FR-005); `useUnverifiedTokens()` and `useDeveloperMode()` return what they return today. Run `pnpm --filter @salmon/shared test src/contexts/DeveloperModeContext.test.tsx` and see it fail. Depends on T009.
- [x] T011 Carry the preference in `packages/shared/src/contexts/DeveloperModeContext.tsx`: `DeveloperModeContextValue` gains `tokenListPreference` and `setTokenListPreference`, fed by the provider's existing `useUserConfig` instance; default value `DEFAULT_TOKEN_LIST_PREFERENCE` and a no-op; NEW reader `useTokenListPreference()`; export it from `packages/shared/src/contexts/index.ts`. Proof: `pnpm --filter @salmon/shared test src/contexts/DeveloperModeContext.test.tsx` green, and `pnpm --filter @salmon/mobile test __tests__/app/developer-mode-scope.test.tsx` unchanged and green. Depends on T010.
- [x] T012 [P] Add the four keys `useTokenListLabels` reads to `packages/shared/src/locales/en/translation.json` and `packages/shared/src/locales/es/translation.json`, text exactly as contracts/ui-contracts.md §Copy: `settings.token_list_all`, `settings.token_list_off`, `settings.token_list_count`, `settings.token_list_from`. Proof: `pnpm check:i18n` green once T014 reads them (run at T017).
- [x] T013 Write the failing tests NEW `packages/shared/src/hooks/useTokenListPreference.test.tsx` (jsdom; `DeveloperModeContext` and `CurrencyContext` mocked the way `packages/shared/src/contexts/CurrencyContext.test.tsx` and `useUserConfig.*.test.tsx` do): `useTokenListFold` — fold follows a preference change without remount; `expanded` is false on mount, `toggle` flips it, it returns to false on a new `resetKey` and on a preference change; `tokens` is `visible` folded and `visible` then `folded` expanded; `foldedCount` = folded length; the threshold is compared through `convert` (a rate of 1.5 keeps a 4-dollar token under a threshold of 5). `useTokenListLabels` — `countOptions` keys `all, 3, 5, 10, 20` and `minValueOptions` keys `off, 1, 5, 10, 50` with values `null` then the presets; `rowValue` in the four shapes ("All", "3 tokens", "from $5.00", "3 tokens · from $5.00") in USD and in EUR ("from €5.00", printed with `formatValue(minValue / exchangeRate)`). Run `pnpm --filter @salmon/shared test src/hooks/useTokenListPreference.test.tsx` and see it fail. Depends on T011.
- [x] T014 Implement NEW `packages/shared/src/hooks/useTokenListPreference.ts` (`useTokenListFold`, `useTokenListLabels`, per contracts/token-list-fold.md; `foldTokenList` memoised on tokens, preference and `convert`); export both from `packages/shared/src/hooks/index.ts`. Proof: `pnpm --filter @salmon/shared test src/hooks/useTokenListPreference.test.tsx` green. Depends on T012, T013.
- [x] T015 [P] Add failing cases to `packages/shared/src/settings/registry.test.ts`: `settingsRowValues({ …, tokenList: '3 tokens' }).tokenList === '3 tokens'` and absent when not passed; `getSettingsItemTestId('tokenList') === 'settings-item-token-list'`. Run `pnpm --filter @salmon/shared test src/settings/registry.test.ts` and see them fail.
- [x] T016 Row plumbing, no visible row: `'tokenList'` in `SettingsScreen` and `tokenList: 'token-list'` in `SETTINGS_ITEM_SLUGS` (`packages/shared/src/types/settings.ts`); `'tokenList'` in `SettingsValueRowId`, optional `tokenList?: string` in `SettingsRowValueInputs`, passed through by `settingsRowValues` (`packages/shared/src/settings/registry.ts`). `SETTINGS_GROUPS` and `SettingsIconName` are not touched here (T023). Proof: `pnpm --filter @salmon/shared test src/settings/registry.test.ts` green and `pnpm typecheck` green on all four packages (both `PanelRegistry` types are `Partial<Record<…>>`). Depends on T015.
- [x] T017 Group B checkpoint: `pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/ui --filter=@salmon/extension --filter=@salmon/mobile`, `pnpm test:security`, `pnpm check:i18n`, `pnpm check:parity`, `pnpm check:dead-code`, `pnpm check:cycles` all green. If knip reports a new export as unused, export it through the barrel its consumers will import in group C rather than deleting it. Commit T004 and T008–T016 as `feat(shared): token list preference in settings`. Depends on T014, T016.

**Checkpoint B**: the rule, the stored choice and its labels exist and are tested; Home and Settings look exactly as before. The work may stop here.

---

## Group C — UI on both apps

**BLOCKED** until the owner signs off the "Show more" row and the Token list screen (plan.md §Owner sign-off, the three mocks). No task in Phases 3–6 starts before T018.

- [ ] T018 Record the owner's sign-off on the mocks of plan.md §Owner sign-off and the answers to Q1–Q3, with the date, in `specs/044-token-list-preferences/plan.md` (that section and §Open risks) and, where an answer differs from the default, in spec.md, data-model.md, research.md and the tasks tagged with that question before they start. Proof: `git diff specs/044-token-list-preferences` shows the recorded decisions.

## Phase 3: The kit change and the "Show more" row (US1) — commit `feat(kit): ListRow announces an expanded state`

**Goal**: a disclosure row built from `ListRow`, announced with its expanded state on both apps (FR-014, FR-018).

**Independent test**: both `TokenListFoldRow.test.tsx` and both `ListRow.test.tsx` green.

- [ ] T019 [P] [US1] Add failing cases to `packages/ui/src/components/ListRow/ListRow.test.tsx` (pressable row with `accessibilityExpanded` renders `aria-expanded="true"`/`"false"`; without it no `aria-expanded`) and to `apps/mobile/src/components/ListRow/ListRow.test.tsx` (`accessibilityState` `{ expanded }` when set; absent when not). Run `pnpm --filter @salmon/ui test src/components/ListRow/ListRow.test.tsx` and `pnpm --filter @salmon/mobile test src/components/ListRow/ListRow.test.tsx`; see them fail. Depends on T018.
- [ ] T020 [US1] Kit change per contracts/ui-contracts.md §Kit change: `accessibilityExpanded?: boolean` in `CardPropsBase` (`packages/shared/src/types/ui/card.ts`) and `ListRowPropsBase` (`packages/shared/src/types/ui/list-row.ts`); `packages/ui/src/components/Card/Card.tsx` `<button>` branch adds `aria-expanded`; `apps/mobile/src/components/Card/Card.tsx` `TouchableOpacity` branch adds `accessibilityState` only when defined; both `ListRow.tsx` forward it. Proof: the two T019 files green, plus `pnpm --filter @salmon/ui test src/components/Card` and `pnpm --filter @salmon/mobile test src/components/Card` unchanged and green. Depends on T019.
- [ ] T021 [US1] Contract and copy for the row: `TokenListFoldRowPropsBase` in `packages/shared/src/types/ui/token-list.ts`, exported from `packages/shared/src/types/ui/index.ts`; `wallet.show_more_tokens` and `wallet.show_less_tokens` in both `packages/shared/src/locales/{en,es}/translation.json`, text as contracts/ui-contracts.md §Copy. Proof: `pnpm --filter @salmon/shared typecheck`; `pnpm check:parity` and `pnpm check:i18n` go green with T022–T023 (run at T024). Depends on T018.
- [ ] T022 [P] [US1] DOM row: failing test first in NEW `packages/ui/src/components/TokenList/TokenListFoldRow.test.tsx` (label "Show 7 more" with `foldedCount` 7, "Show less" when expanded, click calls `onToggle`, `aria-expanded` follows `expanded`, `data-testid="token-list-fold-row"`), then NEW `packages/ui/src/components/TokenList/TokenListFoldRow.tsx` (anatomy table of contracts/ui-contracts.md: `ListRow tone="clear" padding="lg"`, no leading, `CaretDownIcon` turned 180° when expanded, `text.secondary`), props in `packages/ui/src/components/TokenList/types.ts`, export from `packages/ui/src/components/TokenList/index.ts` and `packages/ui/src/components/index.ts`. Proof: `pnpm --filter @salmon/ui test src/components/TokenList/TokenListFoldRow.test.tsx`. Depends on T020, T021.
- [ ] T023 [P] [US1] Mobile twin: failing test first in NEW `apps/mobile/src/components/TokenList/TokenListFoldRow.test.tsx` (same four cases, `accessibilityState.expanded`, `testID="token-list-fold-row"`), then NEW `apps/mobile/src/components/TokenList/TokenListFoldRow.tsx`, props in `apps/mobile/src/components/TokenList/types.ts`, export from `apps/mobile/src/components/TokenList/index.ts` and `apps/mobile/src/components/index.ts`. Proof: `pnpm --filter @salmon/mobile test src/components/TokenList/TokenListFoldRow.test.tsx`. Depends on T020, T021.
- [ ] T024 [US1] Kit checkpoint: `pnpm --filter @salmon/ui test` and `pnpm --filter @salmon/mobile test` green; commit T019–T020 alone as `feat(kit): ListRow announces an expanded state` (an optional prop, nothing renders differently). T021–T023 stay uncommitted until T036: knip only treats `apps/mobile/app/**` as an entry, so the mobile twin exported from `apps/mobile/src/components/index.ts` is reported unused by `pnpm check:dead-code` (a pre-commit gate) until Home renders it in T030; `pnpm check:parity` (twins paired through the `TokenList` folders, no dead contract, clone ceiling not raised) and `pnpm check:i18n` are run here and must be green. Depends on T022, T023.

## Phase 4: The Settings row and the Token list screen (US4)

**Goal**: "Token list" is the second row of Preferences on both apps, states its choice, and opens a screen with the two choices (FR-001–FR-003, FR-007).

**Independent test**: US4 AC1–AC2 on both apps (T025, T028 tests; the e2e of Phase 6).

- [ ] T025 [P] [US4] Add a failing case to `packages/shared/src/settings/registry.test.ts`: the Preferences group's row ids read `language, tokenList, currency, explorer, appearance` (US4 AC1) and the `tokenList` row is `{ kind: 'panel', icon: 'stack', labelKey: 'settings.token_list' }`. Run `pnpm --filter @salmon/shared test src/settings/registry.test.ts`; see it fail. Depends on T018.
- [ ] T026 [US4] (owner Q3) The row and the extension screen: `'stack'` in `SettingsIconName` and the row second in Preferences (`packages/shared/src/settings/registry.ts`); `stack: StackIcon` in `SETTINGS_ICONS` of `packages/ui/src/components/SettingsPanelStack/SettingsPanelStack.tsx` and of `apps/mobile/app/(app)/settings/index.tsx`; keys `settings.token_list`, `settings.token_list_subtitle`, `settings.token_list_count_title`, `settings.token_list_min_value_title` in both locale files; the `tokenList` entry in `apps/extension/src/settings/panelRegistry.tsx` (`SettingsPanelContent` › `SectionLabel variant="group"` › `SettingsSelectorList` › `SectionLabel` › `SettingsSelectorList`, options from `useTokenListLabels()`, writes through `useTokenListPreference()`, `getKey`/`isSelected`/`getPrimaryText` as contracts/ui-contracts.md §Settings, `testIdPrefix` giving `token-list-count-*` and `token-list-min-value-*`). Proof: T025 green, `pnpm typecheck` green; the registries have no unit test today, so the screen's proof is the Playwright spec T031. Depends on T014, T016, T025.
- [ ] T027 [US4] (owner Q3) The mobile screen: `tokenList` entry in `apps/mobile/src/settings/panelRegistry.tsx` (`SettingsScreenLayout` › the same four parts, same options and writes, same test ids), reached through the existing `[panel]` route. Proof: `pnpm --filter @salmon/mobile typecheck`; the screen's proof is the Maestro flow T032. Depends on T026.
- [ ] T028 [P] [US4] The row's trailing value on both apps: `tokenList: useTokenListLabels().rowValue` passed to `settingsRowValues` in `apps/extension/src/pages/settings/SettingsPage.tsx` and in `apps/mobile/app/(app)/settings/index.tsx`. Tests first: a case in `packages/ui/src/components/SettingsPanelStack/SettingsPanelStack.test.tsx` (`rowValues.tokenList` rendered at `settings-item-token-list-value`) and NEW `apps/mobile/__tests__/app/settings-token-list-row.test.tsx` modelled on `settings-appearance-row.test.tsx` (row second in Preferences, value "All" by default and "3 tokens · from $5.00" with that preference). Proof: `pnpm --filter @salmon/ui test src/components/SettingsPanelStack` and `pnpm --filter @salmon/mobile test __tests__/app/settings-token-list-row.test.tsx`. Depends on T026.

## Phase 5: Home folds the list (US1, US2, US3)

**Goal**: both Homes render the visible tokens, then the "Show more" row, then the Staking section and the credit, unchanged (FR-009–FR-017).

**Independent test**: US1–US3 independent tests of spec.md on each app (T029, T030 tests; hand test T044).

- [ ] T029 [US1] (owner Q1) Extension Home: `const fold = useTokenListFold({ tokens: formattedTokens, resetKey: \`${address}:${currentNetworkId}:${currentPage === 'home'}\` })`in`apps/extension/src/pages/home/HomePage.tsx`, passed to `apps/extension/src/pages/home/PortfolioColumn.tsx`, which renders `TokenList tokens={fold.tokens}`and`TokenListFoldRow`right after it when`fold.foldedCount > 0`and not loading, before the Staking`BlockList`and the credit; empty and error branches keep testing the full list's length; the Bitcoin branch never renders the row. Tests first in`apps/extension/src/pages/home/HomePage.test.tsx`: count 3 over five tokens → three `token-row-*`and "Show 2 more"; click → five rows and "Show less"; staking rows present in both states; threshold 5 folds a token worth 4.99 and an unpriced one while SOL worth 2 stays; loading → no row; both off → same rows as without the feature (SC-003); total balance unchanged (SC-004). Proof:`pnpm --filter @salmon/extension test src/pages/home/HomePage.test.tsx`. Depends on T024, T014.
- [ ] T030 [US1] (owner Q1) Mobile Home: `useTokenListFold({ tokens: tokenListItems, resetKey })` in `apps/mobile/app/(app)/(tabs)/index.tsx`, `resetKey` = `${address}:${currentNetworkId}:${visit}` with `address` the value already passed to `useHomeStaking` and `visit` bumped by `useFocusEffect` from `expo-router`; `TokenList tokens={fold.tokens}`; `ListFooterComponent` starts with `TokenListFoldRow` when `fold.foldedCount > 0 && balanceState !== 'loading'`, before the Staking section and the credit. Tests first in NEW `apps/mobile/__tests__/home-token-list-fold.test.tsx` modelled on `apps/mobile/__tests__/home-subtabs.test.tsx`: the same cases as T029, plus a focus change folds the list again. Proof: `pnpm --filter @salmon/mobile test __tests__/home-token-list-fold.test.tsx`. Depends on T024, T014.

## Phase 6: E2E and documentation

- [ ] T031 [P] [US4] NEW `apps/extension/.playwright/tests/token-list-preferences.spec.ts` modelled on `nft-spam-filter.spec.ts` and `settings.spec.ts`, steps as quickstart §2 (count n, set 3, value "3 tokens", `min(n, 3)` rows, fold row "Show {n-3} more" when n > 3, expand and fold, set All, n rows and no fold row; skips when salmon-api is unreachable). Proof: `pnpm --filter @salmon/extension build && pnpm --filter @salmon/extension e2e token-list-preferences` green; `pnpm check:e2e-selectors` green. Depends on T026, T028, T029.
- [ ] T032 [P] [US4] NEW `apps/mobile/.maestro/flows/smoke/settings/token-list.yaml` modelled on `currency.yaml` and `developer-networks.yaml`, steps as quickstart §2, ending with `token-list-count-all` so the device is left as found; add it under `# Settings panels` in `apps/mobile/.maestro/suites/smoke.yaml`, after `language.yaml`. Proof: `cd apps/mobile/.maestro && ./run.sh flows/smoke/settings/token-list.yaml` green on the simulator; `pnpm check:e2e-selectors` green. Depends on T027, T028, T030.
- [ ] T033 [P] `DESIGN.md`: add the Token list screen to the Settings description and the "Show more" disclosure where lists are described (a folded list ends with a clear `ListRow` disclosure; staking is never folded); correct the three stale statements of plan.md §Documentation items 1–3 — single-pick selectors are pushed panels, not sheets (`DESIGN.md:688`); the MUI passages (`DESIGN.md:198, 395, 613, 628, 635, 645, 758`) rewritten against `packages/ui/src/theme` or marked retired; chips may carry a one-shot value pick in a form through `ChipGroup` (`DESIGN.md:665`). Proof: `grep -n "stay sheets\|MuiOutlinedInput\|Mui-focusVisible\|never for selection state" DESIGN.md` prints nothing and `npx prettier --check DESIGN.md` passes.
- [ ] T034 [P] `docs/ARCHITECTURE.md:46`, the fourth stale statement (plan.md §Documentation item 4): language lives in `packages/shared` for the extension, while mobile keeps its own `apps/mobile/src/i18n/useLanguage.ts`. Proof: `npx prettier --check docs/ARCHITECTURE.md`.
- [ ] T035 [P] `docs/ANALYTICS.md:167`: add "token list" to the Settings preferences that report nothing (FR-022). Proof: `grep -n "token list" docs/ANALYTICS.md` prints line 167; `npx prettier --check docs/ANALYTICS.md`.
- [ ] T036 Commit the row twins and the Settings and Home work (T021–T023, T025–T030) as `feat: Token list in Settings and folding on Home, both apps`, then T031–T032 as `test(e2e): token list preferences` and T033–T035 as `docs: token list preferences; DESIGN.md and ARCHITECTURE.md match the code`. Depends on T030, T032, T035.

**Checkpoint C**: every story works on both apps; the final verification below runs on this state.

---

## Phase 7: Final verification

Every command from the repository root, after the Node `PATH` export. Raw output goes to the session scratchpad; the PR body carries the commands and their exit codes.

- [ ] T037 `pnpm typecheck` green.
- [ ] T038 `pnpm lint` green.
- [ ] T039 Unit tests per package, each green: `pnpm --filter @salmon/shared test`, `pnpm --filter @salmon/ui test`, `pnpm --filter @salmon/extension test`, `pnpm --filter @salmon/mobile test`.
- [ ] T040 `pnpm test:security` green (the `*.security.test.ts` suites; this feature adds none, so the run proves nothing in them broke).
- [ ] T041 The gates `.githooks/pre-commit` runs, each green: `git diff --name-only main... | xargs pnpm exec prettier --check --ignore-unknown`, `pnpm check:no-secrets`, `pnpm check:hidden-unicode`, `pnpm check:parity`, `pnpm check:dead-code`, `pnpm check:cycles`, `pnpm check:single-kit`; plus `pnpm check:i18n` and `pnpm check:e2e-selectors`.
- [ ] T042 `pnpm --filter @salmon/extension build && pnpm check:manifest`: build succeeds and the manifest shows no permission change.
- [ ] T043 [P] Coverage ratchet: `pnpm test:coverage`; raise `thresholds` in the `packages/shared` and `packages/ui` Vitest configs and `coverageThreshold` in the `apps/mobile` Jest config where coverage went up.
- [ ] T044 (owner Q1) Hand test, quickstart §3 steps 1–9 on both apps. On a real phone the owner taps and Claude only reads screenshots. Record the results in the PR body.

---

## Dependencies

- Phase 1 (A): T001 → T002 → T003. Blocks everything.
- Phase 2 (B): T004, T005 together; T005 → T006 → T007. T008 ← (T003, T006) → T009 → T010 → T011 → T013 → T014 (also ← T012). T015 → T016. T017 ← (T014, T016).
- Group C: every task ← T018 (owner sign-off). T019 → T020; T021 independent of T019–T020; T022, T023 ← (T020, T021); T024 ← (T022, T023). T025 → T026 (also ← T014, T016) → T027; T028 ← T026. T029, T030 ← (T024, T014). T031 ← (T026, T028, T029); T032 ← (T027, T028, T030); T033–T035 any time after T018. T036 ← (T030, T032, T035).
- Phase 7 after T036; T044 last.

## Parallel examples

- Group B: T004 with T005; T012 and T015 with anything in the preference chain.
- Kit: T019 with T021; then T022 with T023.
- Settings and Home: T028 with T029 and T030 once their dependencies are done (different files).
- Docs and e2e: T031, T032, T033, T034, T035 together.
- Verification: T043 with T037–T042.

## Implementation strategy

1. Group A first, on its own commit: a real bug that also affects every existing setting.
2. Group B: the rule, then the preference. After T017 the branch is mergeable with no visible change.
3. Wait for the owner's sign-off and the answers to Q1–Q3 (T018). Then group C: kit and row, Settings, Home, e2e and docs.
4. Final verification (Phase 7), then the PR, with the Spanish copy and the persistence fix called out for the owner's review (quickstart §4).
