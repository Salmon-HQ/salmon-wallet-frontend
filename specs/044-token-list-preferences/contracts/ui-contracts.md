# UI contracts: Token list preferences (spec 044)

The one new piece of UI is the "Show more" row. Its look waits for the owner's sign-off (plan.md §Owner sign-off, with the mocks) before it is built. Everything else is existing components in an existing place.

## Kit change: `ListRow` and `Card` announce an expanded state

`packages/shared/src/types/ui/card.ts` → `CardPropsBase` and `packages/shared/src/types/ui/list-row.ts` → `ListRowPropsBase` gain:

```ts
/** A disclosure's open state, announced to screen readers. Omit on every other row. */
accessibilityExpanded?: boolean;
```

- `packages/ui/src/components/Card/Card.tsx`: the `<button>` branch adds `aria-expanded={accessibilityExpanded}` (React omits it when `undefined`).
- `apps/mobile/src/components/Card/Card.tsx`: the `TouchableOpacity` branch adds `accessibilityState={accessibilityExpanded === undefined ? undefined : { expanded: accessibilityExpanded }}`.
- Both `ListRow`s forward the prop to `Card`. A non-pressable card ignores it.
- Tests: both `ListRow.test.tsx` gain one case (announced when set, absent when not).

## New: `TokenListFoldRow` (one per platform)

Contract in `packages/shared/src/types/ui/token-list.ts`:

```ts
/** The "Show N more" / "Show less" disclosure that closes a folded token list. */
export interface TokenListFoldRowPropsBase extends Testable {
  foldedCount: number;
  expanded: boolean;
  onToggle: () => void;
}
```

Files: `packages/ui/src/components/TokenList/TokenListFoldRow.tsx` and `apps/mobile/src/components/TokenList/TokenListFoldRow.tsx`, each with its props in the folder's `types.ts` extending the contract, exported from the folder's `index.ts`. The parity script pairs them through the existing `TokenList` folders.

Anatomy (the `ConfirmationDetailsCard` disclosure, drawn by the kit's `ListRow`):

| Part      | Value                                                                                      |
| --------- | ------------------------------------------------------------------------------------------ |
| Component | `ListRow`, `tone="clear"`, `padding="lg"` (the token rows' padding, so the label lines up) |
| Leading   | none (`null`)                                                                              |
| Title     | `wallet.show_more_tokens` with `{ count: foldedCount }`, or `wallet.show_less_tokens`      |
| Trailing  | `CaretDownIcon`, small icon size, `text.secondary`; turned 180° when `expanded`            |
| Press     | `onToggle`; role `button`; `accessibilityExpanded={expanded}`                              |
| testID    | `token-list-fold-row`                                                                      |

Tests: one render test per twin (`TokenListFoldRow.test.tsx`): label with the count, the other label when expanded, press calls `onToggle`, expanded state announced (`aria-expanded` / `accessibilityState`).

## Home placement

| App       | File                                                | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile    | `apps/mobile/app/(app)/(tabs)/index.tsx`            | `const fold = useTokenListFold({ tokens: tokenListItems, resetKey })`; `TokenList tokens={fold.tokens}`; `ListFooterComponent` starts with `<TokenListFoldRow …/>` when `fold.foldedCount > 0 && balanceState !== 'loading'`, before the Staking section and the credit. `resetKey` = `${address}:${currentNetworkId}:${visit}` (`address` = `activeBlockchainAccount?.getReceiveAddress()`, the value already passed to `useHomeStaking`), `visit` bumped by `useFocusEffect` from `expo-router` |
| Extension | `apps/extension/src/pages/home/HomePage.tsx`        | `const fold = useTokenListFold({ tokens: formattedTokens, resetKey: \`${address}:${currentNetworkId}:${currentPage === 'home'}\` })` (`address`as on mobile); passes`fold`to`PortfolioColumn`                                                                                                                                                                                                                                                                                                     |
| Extension | `apps/extension/src/pages/home/PortfolioColumn.tsx` | `TokenList tokens={fold.tokens}`; `<TokenListFoldRow …/>` right after it when `foldedCount > 0` and not loading, before the Staking `BlockList` and the credit. The empty/error branches keep testing the full list's length                                                                                                                                                                                                                                                                      |

The Bitcoin branch never calls the row: the fold hook still runs (hooks before branches) but its output is not rendered there.

## Settings

| Part               | Mobile                                                                                                                                                                                        | Extension                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Row (shared table) | `SETTINGS_GROUPS`: `{ id: 'tokenList', kind: 'panel', icon: 'stack', labelKey: 'settings.token_list' }`, second in Preferences                                                                | same table                                                                                                   |
| Glyph              | `stack: StackIcon` in `SETTINGS_ICONS`, `apps/mobile/app/(app)/settings/index.tsx`                                                                                                            | `stack: StackIcon` in `SETTINGS_ICONS`, `SettingsPanelStack.tsx`                                             |
| Trailing value     | `settingsRowValues({ …, tokenList: labels.rowValue })` in `settings/index.tsx`                                                                                                                | same in `apps/extension/src/pages/settings/SettingsPage.tsx`                                                 |
| Screen             | `tokenList` entry in `apps/mobile/src/settings/panelRegistry.tsx`: `SettingsScreenLayout` › `SectionLabel variant="group"` › `SettingsSelectorList` › `SectionLabel` › `SettingsSelectorList` | `tokenList` entry in `apps/extension/src/settings/panelRegistry.tsx`: `SettingsPanelContent` › the same four |
| Options            | `useTokenListLabels()` — `countOptions`, `minValueOptions`                                                                                                                                    | same                                                                                                         |
| Write              | `setTokenListPreference({ ...preference, maxCount })` / `{ ...preference, minValue }` from `useTokenListPreference()`                                                                         | same                                                                                                         |

Each list: `getKey = o => o.key`, `isSelected = o => o.value === preference.<half>`, `getPrimaryText = o => o.label`, no secondary text, no leading element.

## Test ids

| Element                      | id                                                   | Existing pattern                                  |
| ---------------------------- | ---------------------------------------------------- | ------------------------------------------------- |
| Settings row                 | `settings-item-token-list`                           | `getSettingsItemTestId` via `SETTINGS_ITEM_SLUGS` |
| Its trailing value           | `settings-item-token-list-value`                     | `${testID}-value` on both platforms               |
| Panel wrapper                | `settings-panel-tokenList`                           | `settings-panel-${screen}` (both platforms)       |
| Count options                | `token-list-count-all`, `-3`, `-5`, `-10`, `-20`     | `testIdPrefix` + `getKey` (`currency-option-eur`) |
| Threshold options            | `token-list-min-value-off`, `-1`, `-5`, `-10`, `-50` | same                                              |
| Fold row                     | `token-list-fold-row`                                | —                                                 |
| Token rows (read by the e2e) | `token-row-${symbol}`                                | existing                                          |

No existing id is renamed.

## Copy (`packages/shared/src/locales/{en,es}/translation.json`)

| Key                                   | English                                                        | Spanish                                                         |
| ------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| `settings.token_list`                 | Token list                                                     | Lista de tokens                                                 |
| `settings.token_list_subtitle`        | Choose how many tokens Home shows. The rest stay one tap away. | Elegí cuántos tokens muestra Inicio. El resto queda a un toque. |
| `settings.token_list_count_title`     | Tokens shown                                                   | Tokens visibles                                                 |
| `settings.token_list_min_value_title` | Hide tokens worth less than                                    | Ocultar tokens que valen menos de                               |
| `settings.token_list_all`             | All                                                            | Todos                                                           |
| `settings.token_list_off`             | Off                                                            | Desactivado                                                     |
| `settings.token_list_count`           | {{count}} tokens                                               | {{count}} tokens                                                |
| `settings.token_list_from`            | from {{value}}                                                 | desde {{value}}                                                 |
| `wallet.show_more_tokens`             | Show {{count}} more                                            | Ver {{count}} más                                               |
| `wallet.show_less_tokens`             | Show less                                                      | Ver menos                                                       |

The row's trailing value joins the count and the threshold with " · " ("3 tokens · from €5.00" / "3 tokens · desde €5.00"); with both off it reads `settings.token_list_all`. A threshold is printed by the currency formatter, so it carries the shown currency's symbol and decimals in both languages.
