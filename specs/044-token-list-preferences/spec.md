# Feature Specification: Token list preferences — show fewer tokens on Home, the rest behind "Show more"

**Feature Branch**: `feat/044-token-list-preferences`

**Created**: 2026-11-25

**Status**: Draft

**Input**: Linear DEV-90 "Token list @ Preferences". "In Preferences, right below Language (second position), add an entry 'Token list'. Inside, the user can do two things: limit the token list to a number — if they hold 10 tokens and choose to show 3, they see the 3 largest and then a 'Show more'; and limit by amount — 'hide any token with USD balance below: X' — if they choose 5, any token they hold less than 5 dollars of is tucked inside the 'Show more'. It applies to both apps (browser extension and mobile)."

## Why this exists

A Solana wallet collects tokens the user never asked for: airdrops, leftovers of a swap, a few cents of a memecoin. Home lists every one of them, so the handful of tokens the user actually cares about shares the screen with a long tail worth almost nothing. The only control today is the "Show unverified tokens" switch, which hides what the backend flags as spam; a legitimate token worth two cents still takes a full row.

This feature gives the user two dials, both in Settings → Preferences, both off by default so nothing changes for anyone who does not touch them: how many tokens Home shows before the rest fold away, and a value below which a token folds away. Nothing is removed from the wallet. Every folded token is one tap away behind "Show more", and every total the wallet shows still counts it, because a self-custodial wallet must never make funds look like they are gone.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Show only the largest tokens (Priority: P1)

A user holds ten tokens on Solana. In Settings → Preferences they open "Token list", the second entry under Language, and choose to show 3. Back on Home, the list shows three tokens, the largest ones, and under them a "Show more" row that says how many are folded. Tapping it unfolds the other seven in place; a "Show less" row folds them again.

**Why this priority**: it is the first half of the owner's request and the one that shortens every long list regardless of prices.

**Independent Test**: on a wallet with ten priced tokens, set the count to 3; Home shows three token rows plus "Show more (7)"; tapping it shows all ten in the same order as before; the total balance is unchanged throughout.

**Acceptance Scenarios**:

1. **Given** the count is set to N and the wallet holds more than N tokens, **When** Home shows the Solana list, **Then** it shows the first N tokens of the list's usual order, then a "Show more" row carrying the number of folded tokens.
2. **Given** the wallet holds N tokens or fewer, **When** Home shows the list, **Then** no "Show more" row appears.
3. **Given** the folded tokens are hidden, **When** the user taps "Show more", **Then** every folded token appears below the visible ones, in the list's usual order, and the row reads "Show less".
4. **Given** the list is unfolded, **When** the user taps "Show less", **Then** the list returns to N rows.
5. **Given** the count is changed in Settings, **When** the user goes back to Home, **Then** the list already follows the new count, without a restart or a refresh.

---

### User Story 2 - Fold away tokens worth little (Priority: P1)

The same user sets "hide tokens worth less than 5". Home now folds every token whose balance is worth less than 5 behind "Show more", whatever the count says.

**Why this priority**: it is the second half of the owner's request, and the one that targets dust (balances too small to be worth anything) rather than list length.

**Independent Test**: on a wallet holding tokens worth 120, 40, 6, 4.99 and 0.02, set the threshold to 5; Home shows the first three, and "Show more (2)" holds the other two.

**Acceptance Scenarios**:

1. **Given** a threshold X is set, **When** Home shows the list, **Then** every token whose value is below X is folded behind "Show more", and a token worth exactly X stays visible.
2. **Given** both a count N and a threshold X are set, **When** Home shows the list, **Then** a token stays visible only if it is among the first N and worth at least X; every other token is folded.
3. **Given** prices refresh and a token crosses the threshold, **When** the list updates, **Then** the token moves between the visible part and the folded part on that update.

---

### User Story 3 - Set it once, on either app (Priority: P2)

The "Token list" screen looks and behaves the same on the extension and on mobile: the same entry in the same place, the same choices, the same words, and the choice takes effect on Home on that app.

**Why this priority**: the two apps are twins by rule (one contract, two renderings); a setting that exists on one only is a defect, but each app is independently useful.

**Independent Test**: open Settings on each app; "Token list" is the second row under Preferences on both, opens a screen with the same two choices, and each choice changes that app's Home.

**Acceptance Scenarios**:

1. **Given** Settings is open, **When** the user looks at Preferences, **Then** the rows read Display Language, Token list, Display Currency, Select Explorer, Appearance, in that order.
2. **Given** the user sets a count or a threshold, **When** the app is closed and opened again, **Then** the choice is still in force.
3. **Given** the user switches to another wallet in the same app, **When** Home shows that wallet's list, **Then** the same choice applies to it.

### Edge Cases

- **The native coin.** SOL is pinned first in the list today and pays every network fee. It stays visible whatever the threshold, and it is the first of the N tokens the count allows (Assumptions).
- **Tokens with no price.** A token the price provider cannot price has no value to compare with the threshold. [NEEDS CLARIFICATION: when a threshold is set, does a token with no price stay visible, or fold behind "Show more"? Folding hides new tokens the user may care about; keeping them visible lets unpriced airdrops through the filter.]
- **Developer networks.** On devnet only the native coin carries a price (every other token is shown unpriced on purpose), so the threshold treats every other devnet token as unpriced.
- **Unverified tokens.** With "Show unverified tokens" off, the backend leaves spam out of the list before this feature sees it. With it on, unverified tokens are ordinary rows for both dials: they count toward N and are compared with X.
- **Hidden balances.** When the user has hidden balances with the eye toggle, folding still applies and the "Show more" row still says how many are folded; it never reveals an amount.
- **Loading, empty and error states.** While the list loads, fails, or is empty, no "Show more" row appears; those states stay as they are.
- **Every token folds.** If the threshold folds everything except the native coin, Home shows the native coin and "Show more"; the list is never empty while the wallet holds tokens.
- **Bitcoin.** The Bitcoin page shows one coin and no token list; neither dial changes it.
- **Totals.** The total balance on Home, its 24-hour change, and the aggregated total on the Wallets screen keep counting every token, folded or not.
- **Other lists.** The token pickers in Send and Swap, Activity and the NFT grid are not affected; they keep listing every token.
- **The unfolded state does not stick.** Leaving Home, switching chain or wallet, or reopening the app folds the list again.

## Requirements _(mandatory)_

### Functional Requirements

**The Settings entry**

- **FR-001**: Settings → Preferences MUST show a "Token list" row as its second row, directly under Display Language and above Display Currency, on both apps.
- **FR-002**: The row MUST open a "Token list" screen with a title, a one-line subtitle saying what the screen decides, and two choices: how many tokens Home shows, and the value below which a token is folded.
- **FR-003**: Each choice MUST offer an "off" state that shows every token, and both MUST be off on a fresh install and for every existing user, so Home looks as it does today until the user changes something.
- **FR-004**: How the user picks a value MUST reuse the controls Settings already has. [NEEDS CLARIFICATION: a fixed set of choices (for example All / 3 / 5 / 10 / 20 tokens and Off / 1 / 5 / 10 / 50 of value), drawn with the same single-choice list as Language and Currency, or a number the user types? Typing needs a numeric field that Settings does not have today.]
- **FR-005**: A choice MUST take effect on that app's Home as soon as it is made, with no restart and no new network request.
- **FR-006**: The choices MUST persist on the device across restarts and MUST apply to every wallet and every account in that app.

**Home**

- **FR-007**: The Solana token list on Home MUST keep its current order: the native coin first, then by value, largest first.
- **FR-008**: When a count N is set, only the first N tokens of that order MUST be visible; the rest MUST be folded.
- **FR-009**: When a threshold X is set, every token whose value is below X MUST be folded, except the native coin. The comparison MUST use the same value the row displays. [NEEDS CLARIFICATION: is X in US dollars, as the issue says, or in the display currency the user chose (Display Currency)? The row shows the display currency; a dollar threshold under a euro list compares against a number the user cannot see.]
- **FR-010**: When both are set, a token MUST be visible only if both rules let it through.
- **FR-011**: When at least one token is folded, a "Show more" row MUST follow the visible tokens and state how many are folded; tapping it MUST show the folded tokens in place, below the visible ones, in the same order, and turn the row into "Show less", which folds them again.
- **FR-012**: The unfolded state MUST last only while the user stays on Home's list for that chain and wallet; it MUST NOT be stored.
- **FR-013**: The "Show more" row MUST sit between the last token row and the blocks that follow the list today (staking positions, the price provider's credit), which keep their place.
- **FR-014**: Folding MUST NOT change any total, any balance, or what any other screen lists.
- **FR-015**: The "Show more" row MUST be reachable and announced as a control by screen readers, with its expanded or collapsed state, on both apps.

**Both apps**

- **FR-016**: Both apps MUST read the choices from one shared definition and apply one shared folding rule, so the two lists can never disagree on what is folded.
- **FR-017**: Every new user-facing string MUST exist in English and Spanish; the Spanish copy is written by the implementer and reviewed by the owner in the pull request, as in spec 043.
- **FR-018**: The screen and the row MUST be built from the existing components listed below; anything that does not fit them is raised with the owner before it is drawn.

### Existing components this feature reuses

The owner's rule for this feature: no new visual language. Each part maps to what Settings and Home already draw.

| Part                                        | Mobile                                                                                                                                                                                                                      | Extension (DOM)                                                                                 |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| The row in Preferences                      | The shared Settings table `packages/shared/src/settings/registry.ts` (`SETTINGS_GROUPS`, a `kind: 'panel'` row), drawn by `apps/mobile/app/(app)/settings/index.tsx`                                                        | The same table, drawn by `packages/ui/src/components/SettingsPanelStack/SettingsPanelStack.tsx` |
| Opening the screen                          | The panel registry `apps/mobile/src/settings/panelRegistry.tsx` through the existing `[panel]` route; no new route                                                                                                          | The panel registry `apps/extension/src/settings/panelRegistry.tsx`                              |
| The screen's frame                          | `apps/mobile/src/components/SettingsScreenLayout` (contract `SettingsScreenLayoutPropsBase`)                                                                                                                                | `packages/ui/src/components/SettingsPanelContent` (same contract)                               |
| A heading over each of the two choices      | `apps/mobile/src/components/SectionLabel`                                                                                                                                                                                   | `packages/ui/src/components/SectionLabel`                                                       |
| Picking a value from a set                  | `apps/mobile/src/components/SettingsSelectorList` (contract `SettingsSelectorListPropsBase`, the Language/Currency list with the trailing check)                                                                            | `packages/ui/src/components/SettingsSelectorList`                                               |
| Typing a value (only if FR-004 asks for it) | `apps/mobile/src/components/AmountEntryCard` (the decimal entry Send uses). `TextField` has no numeric keyboard today: gap                                                                                                  | `packages/ui/src/components/AmountEntryCard`. Same gap in `TextInput`                           |
| The Home list                               | `apps/mobile/src/components/TokenList` (contract `TokenListPropsBase`), in `apps/mobile/app/(app)/(tabs)/index.tsx`                                                                                                         | `packages/ui/src/components/TokenList`, in `apps/extension/src/pages/home/PortfolioColumn.tsx`  |
| The "Show more" / "Show less" row           | Gap — see below                                                                                                                                                                                                             | Gap — see below                                                                                 |
| Persisting the choice                       | The way "Show unverified tokens" is kept: the device's settings record read once by the provider above every screen (`packages/shared/src/hooks/useUserConfig.ts`, `packages/shared/src/contexts/DeveloperModeContext.tsx`) | Same                                                                                            |

**Gap — the "Show more" row.** No list in either app folds rows today. The nearest existing idiom is the "Details" disclosure of the transaction confirmation (`apps/mobile/src/components/TransactionConfirmation/ConfirmationDetailsCard.tsx`, `packages/ui/src/components/TransactionConfirmation/ConfirmationDetailsCard.tsx`): a label with a caret that turns when open, announced with its expanded state. The proposal is to reuse that idiom as a row at the end of the token list, drawn with the kit's `ListRow` (contract `ListRowPropsBase`) and its trailing caret, so no new shape enters the system. The owner approves this before it is built.

### Key Entities

- **Token list preference**: what the user chose on the "Token list" screen — a count (or off) and a value threshold (or off). One per app install, shared by every wallet.
- **Visible tokens / folded tokens**: the two parts the Home list is split into by the preference. Folded tokens are still held, still counted in every total, and shown on request.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user who sets a count of 3 on a wallet holding ten tokens sees exactly three token rows and a "Show more" row on Home, on both apps.
- **SC-002**: A user reaches the "Token list" screen from Home in three taps (avatar, Token list, a choice) on both apps.
- **SC-003**: With both choices off, Home renders the same rows in the same order as before this feature, on both apps, verified against a fixed set of wallets.
- **SC-004**: Across a test set of wallets (priced, unpriced, devnet, unverified tokens on and off, balances hidden), the total balance shown on Home is identical with the preference on and off.
- **SC-005**: For any wallet and any preference, the two apps fold the same tokens, verified by one shared test set.
- **SC-006**: Every gate the repository already runs (typecheck, lint, tests, DOM parity, i18n, dead code) stays green on both apps.

## Assumptions

- **Both dials start off.** Nobody's Home changes until they choose to; the owner's examples (3 tokens, 5 dollars) are examples, not defaults.
- **The native coin is never folded by value and counts as one of N.** SOL is pinned first today and is what pays fees; folding it would hide the one balance every action depends on. With a count of 3, the user sees SOL and the two largest other tokens.
- **"Largest" means largest by value**, the order Home already uses (the native coin first, then by value, largest first). Tokens without a price sit after priced ones, as today.
- **Global, not per wallet.** Display Currency and the unverified-tokens switch apply to the whole app; this preference does the same, so one choice covers every wallet.
- **Per app, not synced.** Like every other preference, the choice lives on the device; the extension and the phone are set separately.
- **Home's Solana list only.** The Bitcoin page has no token list; Send, Swap, Activity and NFTs are out of scope.
- **No backend change.** The list already arrives with every token and its value; folding happens on the device. The backend keeps filtering spam as it does today.
- **No analytics event.** Changing a preference reports nothing today (`docs/ANALYTICS.md`); this one does the same.
- **JS-only.** Nothing reaches native configuration: mobile receives it over the air, the extension in its next store build.
- **Out of scope**: hiding individual tokens by hand, pinning favourite tokens, sorting by anything but value, a search in the Home list, and changing what the "Show unverified tokens" switch does.
