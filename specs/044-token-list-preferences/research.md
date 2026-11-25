# Research: Token list preferences (spec 044)

Every decision below was checked against the code on `feat/044-token-list-preferences` (base `141c176c`). No external source is needed: the feature is a client-side rule over data the wallet already holds. Line numbers are at that base.

## R1. Where the Home list comes from and in what order

**Facts**:

- Solana balances are sorted once, in shared code: `SolanaReadAccount.getBalance` (`packages/shared/src/blockchain/solana/SolanaReadAccount.ts:202-209`) puts native SOL first (`!mint || mint === SOL_CONSTANTS.ADDRESS`) and the rest by `usdBalance` descending, with a missing price counted as 0.
- `useBalance` (`packages/shared/src/hooks/useBalance.ts:120-139`) maps each item; native SOL gets `address: SOL_CONSTANTS.ADDRESS`. Both Homes then map to the kit's `Token` with `mapBalanceToToken` (`packages/shared/src/hooks/useHomeShell.ts:373`): mobile `apps/mobile/app/(app)/(tabs)/index.tsx:474` (`tokenListItems`), extension `apps/extension/src/pages/home/HomePage.tsx:596` (`formattedTokens`).
- The lists render those arrays as given: mobile `index.tsx:959-985` (`TokenList` with a `ListFooterComponent`), extension `apps/extension/src/pages/home/PortfolioColumn.tsx:129-145`.

**Decision**: the folding rule runs on the mapped `Token[]` right before it reaches `TokenList`, on both Homes, and never re-sorts. Native SOL is recognised by `isNativeSol(token.address)` (`packages/shared/src/utils/tokens.ts:55`), the same test the sort uses.

**Consequence recorded, not fixed**: a wallet that holds wrapped SOL as a token gets the same address, so the sort and the rule both treat it as native (pinned, never folded by value). That is the sort's existing behaviour and a harmless one (it shows rather than hides).

## R2. Staked positions are outside the list, and the rule exempts them anyway

**Facts** (owner decision 2026-11-25: staking is never folded and never takes a place):

- Staked SOL and staked SKR come from `useHomeStaking` (`packages/shared/src/hooks/useStaking.ts:73-93`), called by mobile `index.tsx:340` and extension `HomePage.tsx:257`. Each position is a `Token` whose `address` is `STAKED_SOL_KEY` (`'staked-sol'`) or `STAKED_SKR_KEY` (`'staked-skr'`) (`packages/shared/src/utils/staking.ts:18-19`).
- They are never merged into the token array. `stakingSectionBlocks` (`packages/shared/src/utils/stakingBlocks.ts:11-40`) turns them into a titled `BlockList`, built at mobile `index.tsx:630-638` and extension `PortfolioColumn.tsx:71-74`, and drawn after the token list: mobile inside the list's footer (`index.tsx:967-975`), extension under it (`PortfolioColumn.tsx:136-140`).
- Their value is in Home's total through `withStakes` (`useStaking.ts:66`), not through the token list.

**Decision**: the Homes keep passing only liquid tokens to the rule, so staking is untouched by construction. The pure function also treats any token with a staked address as always visible and outside the count, so that if a later change merges staking rows into the list, the owner's rule still holds; a unit test pins it. The "Show more" row is placed before the Staking section, so unfolding never moves it.

## R3. The display-currency conversion

**Facts**: each token row prints its value with `formatValue` from `useCurrencyContext` (`packages/ui/src/components/TokenList/TokenListItem.tsx:49`, `apps/mobile/src/components/TokenList/TokenListItem.tsx:64`), which is `formatFiatValue(usd, shown, exchangeRate)` (`packages/shared/src/contexts/CurrencyContext.tsx:197-200`). `shown` falls back to `usd` and `exchangeRate` to 1 when there is no rate for the chosen currency (`CurrencyContext.tsx:128-131`). `convert(usd) = usd * exchangeRate` (`CurrencyContext.tsx:195`) is the same multiplication.

**Decision**: the rule takes `convert` from the context and compares `convert(token.usdBalance) >= minValue`. With no rate, both the row and the rule are in dollars, so the user still compares against what they see. The threshold's labels (Settings options and the row's trailing value) are printed with `formatValue(minValue / exchangeRate)`, so they carry the shown currency's symbol and decimals ("€5.00", "¥5", "$1.00").

**Accepted edge**: the comparison uses the unrounded value. A token worth €4.996 prints as "€5.00" and folds under "less than €5.00". Half a cent at the boundary; rounding to the shown currency's decimals would need a new export from `currencyFormatting.ts` and a new member of `CurrencyActions` (20 consumers). Not worth it for this feature.

**Alternatives**: a dollar threshold (rejected by the owner: the user cannot see dollar values under another currency); converting the presets from dollars (rejected: the owner chose the same numbers in every currency).

## R4. The settings persistence problem — real, reproduced

**Claim under test**: each `useUserConfig` instance keeps its own copy of the whole `UserConfig` and writes all of it back, so one instance can overwrite a field another instance just wrote.

**Code path** (`packages/shared/src/hooks/useUserConfig.ts`):

- Each instance loads the stored record into its own `useState` on mount and whenever its `blockchain`/`environment` key changes (`:175-236`), and writes it straight back (`:201-202`, "Persist any defaults").
- Every setter builds `{ ...userConfig, <its field> }` from that private copy and writes the whole object: `changeExplorer` `:241`, `toggleDeveloperNetworks` `:281`, `setShowUnverifiedTokens` `:321`, `setIncludedInTotal` `:346`, `markDerivedScanned` `:378`.
- More than two instances are live at once. Seven call sites: `DeveloperModeContext.tsx:63` (the provider above every screen, owner of developer networks and unverified tokens), `useSettingsPanelData.ts:59` (explorer), `useAvailableNetworks.ts:288` (one per caller: mobile Home, extension Home, `useSendContacts`, `useSettingsPanelData`), `useWalletsScreen.ts:73` (total exclusions), `useDerivedAccountsScan.ts:206` (scan marks), and read-only instances in `apps/extension/src/pages/settings/SettingsPage.tsx:51` and `apps/mobile/app/(app)/settings/index.tsx:119`.

**Reproduction on the extension, one Settings visit**: opening Settings mounts `useSettingsPanelRegistry` (`SettingsPage.tsx:62`), whose `useSettingsPanelData` instance loads the record. Turning "Show unverified tokens" on writes through the provider's instance. Picking an explorer then writes the panel instance's copy, which predates the toggle: `showUnverifiedTokens` disappears from storage. The provider still shows it on until the next launch; then it is off. The reverse also happens: a later Developer Networks toggle writes the provider's copy, which still holds the old explorer.

**Failing test, run on this branch** (Vitest, the in-memory storage mock of `useUserConfig.total.test.tsx`):

```ts
it('keeps a field one instance wrote when another instance writes its own', async () => {
  const provider = renderHook(() => useUserConfig({ activeBlockchainAccount: account }));
  const panel = renderHook(() => useUserConfig({ activeBlockchainAccount: account }));
  await waitFor(() => expect(provider.result.current.isLoading).toBe(false));
  await waitFor(() => expect(panel.result.current.isLoading).toBe(false));

  await act(async () => {
    await provider.result.current.setShowUnverifiedTokens(true);
  });
  await act(async () => {
    await panel.result.current.changeExplorer('solanaFm');
  });

  const stored = store.get('settings');
  expect(stored.explorers.SOLANA).toBe('solanaFm'); // passes
  expect(stored.showUnverifiedTokens).toBe(true); // FAILS: received undefined
});
```

Output: `AssertionError: expected undefined to be true`. The bug is real and predates this feature. The token list preference would be lost the same way: chosen through the provider, then erased by the next explorer pick, wallet-total toggle or derived-account scan.

**Decision — read-modify-write, one queue, inside `useUserConfig.ts`**: a module-level `persistPatch(patch)` chains every write on one promise, and each write reads the stored record, merges only the caller's fields, writes the result and returns it. Every setter calls it with its own field instead of spreading its private copy, then sets its local state from the merged record. The mount-time write happens only when a default was actually missing, through the same queue. About 25 changed lines; no API change for any caller.

- Touches `packages/shared/src/storage`? **No.** The fix is in `packages/shared/src/hooks/useUserConfig.ts` and calls the existing `getStorage().getItem/setItem` as it does today. No storage key, adapter or encryption changes. It changes how settings are persisted, so the reviewer should read it with that in mind, but it is outside the paths the constitution gates.
- Lands as its own first commit, `fix(settings): a setting written in one place no longer erases another`, with the test above plus one that fires two setters from two instances without awaiting between them (the queue's reason).

**Alternatives**:

- One shared instance for the whole app (lift `useUserConfig` into a context): the right shape long-term, but it rewires seven call sites, two of which key the explorer on a network they compute themselves. Larger and riskier than the bug needs.
- Give the token list preference its own storage key and context, like Display Currency: avoids the shared record but adds a key to `packages/shared/src/storage/types.ts` (constitution III sign-off) and leaves the existing bug in place for every other field.

## R5. Holding the preference and reading it on Home

**Decision**: the preference is one optional field of `UserConfig` (`packages/shared/src/types/account.ts:247`), `tokenList?: { maxCount: number | null; minValue: number | null }`, exposed by `useUserConfig` and carried by `DeveloperModeContext` next to `showUnverifiedTokens`. That provider is mounted once above every screen (mobile `apps/mobile/app/(app)/_layout.tsx`, extension `apps/extension/src/AppProviders.tsx`), so a choice made in Settings reaches Home on the next render with no reload (FR-005) — the reason "Show unverified tokens" lives there (`DeveloperModeContext.tsx:1-15`).

A stored value that is not one of the presets (a corrupted record, a future preset read by an older build) reads as off, so a bad record can only ever show more tokens, never fewer.

**Alternatives**: a new context (one more provider in both trees for two numbers); reading `useUserConfig` directly on Home (a new instance that only reloads on network change, the staleness the comment at mobile `index.tsx:302-307` documents).

## R6. The unfolded state and when it folds again

**Facts**: on mobile the Home tab stays mounted under every pushed screen (Settings, a token, Wallets are stack routes). On the extension, `HomePage` stays mounted too and swaps its body by `currentPage` (`HomePage.tsx:173`, Settings at `:794`, token detail at `:396-400`).

**Decision (owner Q1, 2026-11-25: a token visit leaves the list as it was)**: the state lives in a shared hook, `useTokenListFold({ tokens, address, networkId })`, called once per Home. It folds again whenever the address, the network or the preference changes; the hook builds that key itself, so neither Home can add a part of its own. `address` is the active account's receive address (it changes with the wallet and with the account). Because both Homes stay mounted under every screen they open, plain component state survives a token visit (or any other screen) and the return to Home with no "on screen" part and no focus listener. A relaunch starts from `useState(false)`. Nothing is stored (FR-015).

**Consequence**: opening a token from the unfolded list and coming back shows the list still unfolded; so does a visit to Send, Settings or Activity. Switching wallet, account or network, changing the preference, or relaunching folds it.

## R7. The "Show more" row: `ListRow` needs one optional property

**Facts**: `ListRowPropsBase` (`packages/shared/src/types/ui/list-row.ts`) and `CardPropsBase` (`packages/shared/src/types/ui/card.ts`) carry `onPress`, `accessibilityRole` and `accessibilityLabel`, but no expanded state. The DOM `Card` renders a `<button>` with `aria-label` only (`packages/ui/src/components/Card/Card.tsx:83-90`); mobile's renders a `TouchableOpacity` with role and label (`apps/mobile/src/components/Card/Card.tsx:128-131`). `ConfirmationDetailsCard` gets its expanded announcement by drawing its own `<button aria-expanded>` / `TouchableOpacity accessibilityState={{ expanded }}` (DOM `ConfirmationDetailsCard.tsx:55-58`, mobile `:79-82`).

**Decision**: add `accessibilityExpanded?: boolean` to `CardPropsBase` and `ListRowPropsBase`; `ListRow` forwards it to `Card`, and `Card` renders `aria-expanded` (DOM) / `accessibilityState={{ expanded }}` (mobile) only when it is defined. Every existing row renders exactly as before. The row itself is a new `TokenListFoldRow` per platform inside the existing `TokenList` folders (so the parity script pairs it with no map entry), on a new contract `TokenListFoldRowPropsBase` in `packages/shared/src/types/ui/token-list.ts`: `ListRow` with `tone="clear"`, no leading mark, the label as title, `CaretDownIcon` trailing and turned 180° when open — the disclosure's own anatomy.

**Alternatives**: drawing a bare button like `ConfirmationDetailsCard` (a second disclosure shape in the kit, which the owner's "no new visual language" rule excludes); putting the fold inside `TokenList` itself (mobile would have to splice the row into a footer the host owns, and the list would read two contexts).

## R8. The Settings screen is composed in the panel registries

**Facts**: every other Preferences screen is a twin panel component (`AppearanceSelector`, `CurrencySelector`, `LanguageSelector`) that wraps `SettingsPanelContent` / `SettingsScreenLayout` around one `SettingsSelectorList`. The option lists come from shared helpers where they need copy (`appearanceRows`, `packages/shared/src/utils/appearanceOptions.ts:46`).

**Decision**: the screen is made once in shared, `createTokenListPanel` in `packages/shared/src/kit/` (the `createBlockList` pattern), from a platform's frame, `SectionLabel` and `SettingsSelectorList`; each registry makes it at load and its `tokenList` entry renders it. Its options and labels come from `useTokenListLabels`. Writing the same markup in both registries put the cross-platform clone count over its ceiling, so the markup lives once.

## R9. The Settings row

**Decision**: `SETTINGS_GROUPS` gains `{ id: 'tokenList', kind: 'panel', icon: 'stack', labelKey: 'settings.token_list' }` second in Preferences; `SettingsScreen` gains `'tokenList'`; `SETTINGS_ITEM_SLUGS` gains `tokenList: 'token-list'` (row test id `settings-item-token-list`); `SettingsIconName` gains `'stack'`, mapped to `StackIcon` in both `SETTINGS_ICONS` (present in `packages/ui/src/icons.ts` and `apps/mobile/src/icons.ts`). `SettingsValueRowId` gains `'tokenList'` and `settingsRowValues` takes the already translated `tokenList` string, built by `useTokenListLabels().rowValue`.

## R10. Analytics, i18n, e2e

- **Analytics**: `docs/ANALYTICS.md:167` lists Settings preferences among the actions that answer no reported metric. This one joins that list in the same sentence; no event, no property.
- **i18n**: keys in `packages/shared/src/locales/{en,es}/translation.json` (contracts/ui-contracts.md). Spanish in the voseo the file already uses ("Elegí…"); "Inicio" is Home's Spanish name (`tabs.home`). Written by the implementer and reviewed by the owner (spec FR-020).
- **E2E**: one Playwright spec modelled on `apps/extension/.playwright/tests/nft-spam-filter.spec.ts` (fresh profile, a setting changed, its effect read on Home) and `settings.spec.ts` (the panel test-id contract). One Maestro flow modelled on `apps/mobile/.maestro/flows/smoke/settings/currency.yaml` (open a Preferences panel, pick, back) and `developer-networks.yaml` (a setting turned on and back off, so the run leaves the device as it found it). Both read the wallet's own row count first, so they do not depend on how many tokens the test wallet holds.
