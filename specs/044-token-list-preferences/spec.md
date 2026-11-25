# Feature Specification: Token list preferences — show fewer tokens on Home, the rest behind "Show more"

**Feature Branch**: `feat/044-token-list-preferences`

**Created**: 2026-11-25

**Status**: Draft, decided 2026-11-25

**Input**: Linear DEV-90 "Token list @ Preferences". "In Preferences, right below Language (second position), add an entry 'Token list'. Inside, the user can do two things: limit the token list to a number — if they hold 10 tokens and choose to show 3, they see the 3 largest and then a 'Show more'; and limit by amount — 'hide any token with USD balance below: X' — if they choose 5, any token they hold less than 5 dollars of is tucked inside the 'Show more'. It applies to both apps (browser extension and mobile)."

## Why this exists

A Solana wallet collects tokens the user never asked for: airdrops, leftovers of a swap, a few cents of a memecoin. Home lists every one of them, so the handful of tokens the user actually cares about shares the screen with a long tail worth almost nothing. The only control today is the "Show unverified tokens" switch, which hides what the backend flags as spam; a legitimate token worth two cents still takes a full row.

This feature gives the user two dials, both in Settings → Preferences, both off by default so nothing changes for anyone who does not touch them: how many tokens Home shows before the rest fold away, and a value below which a token folds away. Nothing is removed from the wallet. Every folded token is one tap away behind "Show more", every total the wallet shows still counts it, and staked positions are never folded, because a self-custodial wallet must never make funds look like they are gone.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Show only the largest tokens (Priority: P1)

A user holds ten tokens on Solana. In Settings → Preferences they open "Token list", the second entry under Display Language, and pick 3 under "Tokens shown". Back on Home, the list shows three tokens, the largest ones, and under them a "Show 7 more tokens" row. Tapping it unfolds the other seven in place; a "Show less" row folds them again.

**Why this priority**: it is the first half of the owner's request and the one that shortens every long list regardless of prices.

**Independent Test**: on a wallet with ten priced tokens, set the count to 3; Home shows three token rows plus "Show 7 more tokens"; tapping it shows all ten in the same order as before; the total balance is unchanged throughout.

**Acceptance Scenarios**:

1. **Given** the count is set to N and the wallet holds more than N tokens, **When** Home shows the Solana list, **Then** it shows the first N tokens of the list's usual order, then a "Show more" row carrying the number of folded tokens.
2. **Given** the wallet holds N tokens or fewer, **When** Home shows the list, **Then** no "Show more" row appears.
3. **Given** the folded tokens are hidden, **When** the user taps "Show more", **Then** every folded token appears below the visible ones, in the list's usual order, and the row reads "Show less".
4. **Given** the list is unfolded, **When** the user taps "Show less", **Then** the list returns to N rows.
5. **Given** the count is changed in Settings, **When** the user goes back to Home, **Then** the list already follows the new count, folded, without a restart or a refresh.
6. **Given** the list is unfolded, **When** the user opens a token (or any other screen) and comes back to Home, **Then** the list is still unfolded, as they left it.
7. **Given** the list is unfolded, **When** the user switches chain, wallet or account, changes either choice, or reopens the app, **Then** Home shows the list folded again.

---

### User Story 2 - Fold away tokens worth little (Priority: P1)

The same user picks 5 under "Hide tokens worth less than". Home now folds every token whose balance is worth less than 5 in their display currency behind "Show more", whatever the count says. Native SOL stays visible whatever it is worth.

**Why this priority**: it is the second half of the owner's request, and the one that targets dust (balances too small to be worth anything) rather than list length.

**Independent Test**: on a wallet holding SOL worth 2, and tokens worth 120, 40, 6, 4.99, 0.02 and one with no price, set the threshold to 5; Home shows SOL and the tokens worth 120, 40 and 6, and "Show 3 more" holds the other three.

**Acceptance Scenarios**:

1. **Given** a threshold X is set, **When** Home shows the list, **Then** every token whose value in the display currency is below X is folded behind "Show more", and a token worth exactly X stays visible.
2. **Given** a threshold X is set, **When** a token has no price, **Then** it is folded behind "Show more".
3. **Given** a threshold X is set and SOL is worth less than X, **When** Home shows the list, **Then** SOL stays visible, first.
4. **Given** both a count N and a threshold X are set, **When** Home shows the list, **Then** a token stays visible only if it is among the first N and worth at least X; every other token is folded.
5. **Given** prices refresh and a token crosses the threshold, **When** the list updates, **Then** the token moves between the visible part and the folded part on that update.
6. **Given** the display currency is euros and the threshold is 5, **When** Home compares a token with it, **Then** it compares the euro value the token's row shows with 5 euros, rounded as the row prints it: a token that reads 5.00 stays visible.

---

### User Story 3 - Staked funds are always on Home (Priority: P1)

A user has SOL staked with a validator and SKR staked. They set the count to 3 and the threshold to 50. Home still shows every staked position in its Staking section, whatever it is worth, and none of them takes one of the three places.

**Why this priority**: a staked position is the user's money locked away from the token list; folding it would make funds look gone, which is the one failure a self-custodial wallet exists to prevent.

**Independent Test**: on a wallet with SOL, five tokens and two staked positions worth 0.5 each, set the count to 3 and the threshold to 50; Home shows three token rows at most, "Show more", and both staked positions in the Staking section.

**Acceptance Scenarios**:

1. **Given** a count N or a threshold X is set, **When** Home shows a wallet with staked positions, **Then** every staked position appears, whatever it is worth, and none of them is folded.
2. **Given** a count N is set, **When** Home counts the N visible tokens, **Then** staked positions are not counted: N tokens and every staked position are on screen.
3. **Given** the list is folded, **When** the user taps "Show more", **Then** the staked positions keep their place below the token list.

---

### User Story 4 - Set it once, on either app (Priority: P2)

The "Token list" screen looks and behaves the same on the extension and on mobile: the same entry in the same place, the same choices, the same words, and the choice takes effect on Home on that app.

**Why this priority**: the two apps are twins by rule (one contract, two renderings); a setting that exists on one only is a defect, but each app is independently useful.

**Independent Test**: open Settings on each app; "Token list" is the second row under Preferences on both, opens a screen with the same two lists of choices, and each choice changes that app's Home.

**Acceptance Scenarios**:

1. **Given** Settings is open, **When** the user looks at Preferences, **Then** the rows read Display Language, Token list, Display Currency, Select Explorer, Appearance, in that order.
2. **Given** both dials are off, **When** the user looks at the "Token list" row, **Then** its trailing edge reads "All"; with a count of 3 and a threshold of 5 euros it reads "3 tokens · from €5.00".
3. **Given** the user sets a count or a threshold, **When** the app is closed and opened again, **Then** the choice is still in force.
4. **Given** the user switches to another wallet in the same app, **When** Home shows that wallet's list, **Then** the same choice applies to it.
5. **Given** the user changes another setting (the explorer, "Show unverified tokens", Developer Networks) after choosing a count, **When** the app is opened again, **Then** the count is still the one chosen, and so is every other setting.

### Edge Cases

- **The native coin.** SOL is pinned first in the list and pays every network fee. It is never folded by value, and it is the first of the N tokens the count allows.
- **Staked positions.** Staked SOL and staked SKR are shown in Home's Staking section, below the token list, and neither dial touches them. A wallet whose SOL and staked positions already add up to more than N still shows all of them: with a count of 3, SOL, two staked positions and the two largest other tokens are on screen, because the staked rows do not use any of the three places.
- **Tokens with no price.** A token the price provider cannot price has no value to compare. When a threshold is set it is folded; with the threshold off it stays where the list puts it today.
- **Developer networks.** On devnet only the native coin carries a price (every other token is shown unpriced on purpose), so with a threshold set every other devnet token is folded and Home shows SOL and "Show more".
- **Unverified tokens.** With "Show unverified tokens" off, the backend leaves spam out of the list before this feature sees it. With it on, unverified tokens are ordinary rows for both dials: they count toward N and are compared with X.
- **Hidden balances.** When the user has hidden balances with the eye toggle, folding still applies and the "Show more" row still says how many are folded; it never reveals an amount.
- **Loading, empty and error states.** While the list loads, fails, or is empty, no "Show more" row appears; those states stay as they are.
- **Every token folds.** If the threshold folds everything except the native coin, Home shows the native coin and "Show more"; the list is never empty while the wallet holds tokens.
- **Changing the display currency.** The threshold keeps its number and reads it in the new currency: a threshold of 5 chosen under euros means 5 yen after a switch to yen. The "Token list" row and screen show it in the new currency, so the user sees what is in force.
- **Exchange rates unavailable.** When the wallet cannot get a rate for the chosen currency, rows show US dollars, and the threshold is compared with the same dollar figure the row shows.
- **Bitcoin.** The Bitcoin page shows one coin and no token list; neither dial changes it.
- **Totals.** The total balance on Home, its 24-hour change, and the aggregated total on the Wallets screen keep counting every token, folded or not.
- **Other lists.** The token pickers in Send and Swap, Activity and the NFT grid are not affected; they keep listing every token.
- **The unfolded state is not stored.** Opening a token (or any other screen) and coming back leaves the list as the user left it (owner, 2026-11-25). Switching chain, wallet or account, changing either dial, or reopening the app folds the list again.

## Requirements _(mandatory)_

### Functional Requirements

**The Settings entry**

- **FR-001**: Settings → Preferences MUST show a "Token list" row as its second row, directly under Display Language and above Display Currency, on both apps.
- **FR-002**: The row MUST open a "Token list" screen with a title, a one-line subtitle saying what the screen decides, and two choices, each under its own heading: "Tokens shown" and "Hide tokens worth less than".
- **FR-003**: "Tokens shown" MUST offer exactly All, 3, 5, 10 and 20. "Hide tokens worth less than" MUST offer exactly Off, 1, 5, 10 and 50, each written in the user's display currency. Each is a single choice from the list Language and Currency use, marked by the trailing check; there is no field to type a number.
- **FR-004**: Both choices MUST be All and Off on a fresh install and for every existing user, so Home looks as it does today until the user changes something.
- **FR-005**: A choice MUST take effect on that app's Home as soon as it is made, with no restart and no new network request.
- **FR-006**: The choices MUST persist on the device across restarts and MUST apply to every wallet and every account in that app. They are not synced between devices.
- **FR-007**: The "Token list" row MUST state the current choice on its trailing edge, as Display Language and Display Currency do: "All" when both are off; otherwise the count ("3 tokens"), the threshold ("from €5.00"), or both joined by " · ".
- **FR-008**: Changing any other setting MUST NOT reset or alter either choice, and choosing a value here MUST NOT reset or alter any other setting.

**Home**

- **FR-009**: The Solana token list on Home MUST keep its current order: the native coin first, then by value, largest first.
- **FR-010**: When a count N is set, only the first N tokens of that order MUST be visible; the rest MUST be folded. The native coin counts as one of the N.
- **FR-011**: When a threshold X is set, every token whose value is below X MUST be folded, except the native coin. X is in the user's display currency, and the value compared is the one the token's row displays, through the same conversion. A token with no price MUST be folded.
- **FR-012**: When both are set, a token MUST be visible only if both rules let it through.
- **FR-013**: Staked positions MUST NOT be folded by either rule and MUST NOT count toward N. They stay in Home's Staking section, below the token list.
- **FR-014**: When at least one token is folded, a "Show more" row MUST follow the visible tokens and state how many are folded; tapping it MUST show the folded tokens in place, below the visible ones, in the same order, and turn the row into "Show less", which folds them again.
- **FR-015**: The unfolded state MUST last only for that chain, wallet and account with the same choices, while the app stays open; it MUST NOT be stored. Opening a token or any other screen and coming back to Home MUST leave it as it was (owner, 2026-11-25). Switching chain, wallet or account, changing either choice, or reopening the app folds the list again.
- **FR-016**: The "Show more" row MUST sit between the last token row and the blocks that follow the list today (the Staking section, the price provider's credit), which keep their place.
- **FR-017**: Folding MUST NOT change any total, any balance, or what any other screen lists.
- **FR-018**: The "Show more" row MUST be reachable and announced as a control by screen readers, with its expanded or collapsed state, on both apps.

**Both apps**

- **FR-019**: Both apps MUST read the choices from one shared definition and apply one shared folding rule, so the two lists can never disagree on what is folded.
- **FR-020**: Every new user-facing string MUST exist in English and Spanish; the Spanish copy is written by the implementer and reviewed by the owner in the pull request, as in spec 043.
- **FR-021**: The screen and the row MUST be built from the existing components listed below. The "Show more" row is the one new piece of UI, and the owner signs off its look before it is built.
- **FR-022**: Changing either choice MUST report nothing to analytics, like every other preference.

### Existing components this feature reuses

The owner's rule for this feature: no new visual language. Each part maps to what Settings and Home already draw.

| Part                                   | Mobile                                                                                                                                                                                                                        | Extension (DOM)                                                                                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The row in Preferences                 | The shared Settings table `packages/shared/src/settings/registry.ts` (`SETTINGS_GROUPS`, a `kind: 'panel'` row; trailing value from `settingsRowValues`), drawn by `apps/mobile/app/(app)/settings/index.tsx`                 | The same table, drawn by `packages/ui/src/components/SettingsPanelStack/SettingsPanelStack.tsx`, values from `apps/extension/src/pages/settings/SettingsPage.tsx` |
| The row's glyph                        | `StackIcon` from `apps/mobile/src/icons.ts`, mapped in the screen's `SETTINGS_ICONS`                                                                                                                                          | `StackIcon` from `packages/ui/src/icons.ts`, mapped in `SettingsPanelStack`'s `SETTINGS_ICONS`                                                                    |
| Opening the screen                     | The panel registry `apps/mobile/src/settings/panelRegistry.tsx` through the existing `[panel]` route; no new route                                                                                                            | The panel registry `apps/extension/src/settings/panelRegistry.tsx`                                                                                                |
| The screen's frame                     | `apps/mobile/src/components/SettingsScreenLayout` (contract `SettingsScreenLayoutPropsBase`)                                                                                                                                  | `packages/ui/src/components/SettingsPanelContent` (same contract)                                                                                                 |
| A heading over each of the two choices | `apps/mobile/src/components/SectionLabel`                                                                                                                                                                                     | `packages/ui/src/components/SectionLabel`                                                                                                                         |
| Picking a value from a set             | `apps/mobile/src/components/SettingsSelectorList` (contract `SettingsSelectorListPropsBase`, the Language/Currency list with the trailing check; its props type is declared in the component file)                            | `packages/ui/src/components/SettingsSelectorList`                                                                                                                 |
| The Home list                          | `apps/mobile/src/components/TokenList` (contract `TokenListPropsBase`), in `apps/mobile/app/(app)/(tabs)/index.tsx`                                                                                                           | `packages/ui/src/components/TokenList`, in `apps/extension/src/pages/home/PortfolioColumn.tsx`                                                                    |
| The Staking section (unchanged)        | `BlockList` built by `stakingSectionBlocks` (`packages/shared/src/utils/stakingBlocks.ts`), in the list's footer                                                                                                              | The same blocks, under the list in `PortfolioColumn.tsx`                                                                                                          |
| The "Show more" / "Show less" row      | The kit's `apps/mobile/src/components/ListRow` (contract `ListRowPropsBase`) with a turning caret — see below                                                                                                                 | `packages/ui/src/components/ListRow` — see below                                                                                                                  |
| Persisting the choice                  | The way "Show unverified tokens" is kept: the device's settings record (`packages/shared/src/hooks/useUserConfig.ts`), read once by the provider above every screen (`packages/shared/src/contexts/DeveloperModeContext.tsx`) | Same                                                                                                                                                              |

**The "Show more" row.** No list in either app folds rows today. The row reuses the "Details" disclosure of the transaction confirmation (`apps/mobile/src/components/TransactionConfirmation/ConfirmationDetailsCard.tsx`, `packages/ui/src/components/TransactionConfirmation/ConfirmationDetailsCard.tsx`): a label with a caret that turns when open, announced with its expanded state. It is drawn with the kit's `ListRow` at the end of the token list, so no new shape enters the system. `ListRow` cannot announce an expanded state today, so it gains that one optional property; nothing else about it changes. The owner signs off the row's look before it is built (plan.md carries the mock).

### Key Entities

- **Token list preference**: what the user chose on the "Token list" screen — a count (All, 3, 5, 10 or 20) and a value threshold in the display currency (Off, 1, 5, 10 or 50). One per app install, shared by every wallet.
- **Visible tokens / folded tokens**: the two parts the Home list is split into by the preference. Folded tokens are still held, still counted in every total, and shown on request.
- **Staked position**: a staking row in Home's Staking section (staked SOL, staked SKR). Outside the token list and outside the preference.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user who sets a count of 3 on a wallet holding ten tokens sees exactly three token rows and a "Show more" row on Home, on both apps.
- **SC-002**: A user reaches the "Token list" screen from Home in three taps (avatar, Token list, a choice) on both apps.
- **SC-003**: With both choices off, Home renders the same rows in the same order as before this feature, on both apps, verified against a fixed set of wallets.
- **SC-004**: Across a test set of wallets (priced, unpriced, devnet, unverified tokens on and off, balances hidden, staked positions), the total balance shown on Home is identical with the preference on and off.
- **SC-005**: For any wallet and any preference, the two apps fold the same tokens, verified by one shared test set.
- **SC-006**: Every gate the repository already runs (typecheck, lint, tests, DOM parity, i18n, dead code) stays green on both apps.
- **SC-007**: For any wallet and any preference, every staked position appears on Home.

## Assumptions

- **Both dials start off.** Nobody's Home changes until they choose to; the owner's examples (3 tokens, 5 dollars) are examples, not defaults.
- **The native coin is never folded by value and counts as one of N.** SOL is pinned first and is what pays fees; folding it would hide the one balance every action depends on. With a count of 3, the user sees SOL and the two largest other tokens.
- **"Largest" means largest by value**, the order Home already uses: the native coin first, then by value, largest first, with a token that has no price counted as worth nothing, so unpriced tokens sit at the end among the tokens worth zero.
- **The same presets in every currency.** The thresholds are the numbers 1, 5, 10 and 50 in whatever currency the user displays; they are not converted from dollars.
- **Global, not per wallet.** Display Currency and the unverified-tokens switch apply to the whole app; this preference does the same, so one choice covers every wallet.
- **Per app, not synced.** Like every other preference, the choice lives on the device; the extension and the phone are set separately.
- **Home's Solana list only.** The Bitcoin page has no token list; Send, Swap, Activity and NFTs are out of scope.
- **No backend change.** The list already arrives with every token and its value; folding happens on the device. The backend keeps filtering spam as it does today.
- **No analytics event.** Changing a preference reports nothing (`docs/ANALYTICS.md`); this one does the same.
- **JS-only.** Nothing reaches native configuration: mobile receives it over the air, the extension in its next store build.
- **Out of scope**: hiding individual tokens by hand, pinning favourite tokens, sorting by anything but value, a search in the Home list, typing a custom count or threshold, and changing what the "Show unverified tokens" switch does.
