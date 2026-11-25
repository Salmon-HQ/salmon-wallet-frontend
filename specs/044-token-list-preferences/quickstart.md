# Quickstart: Token list preferences (spec 044)

## 1. Automated checks

```bash
export PATH="$HOME/Library/Application Support/Herd/config/nvm/versions/node/v24.21.0/bin:$PATH"
pnpm turbo run test --filter=@salmon/shared     # useUserConfig (two instances), tokenListFold, hooks, registry, DeveloperModeContext
pnpm turbo run test --filter=@salmon/ui         # ListRow expanded, TokenListFoldRow, SettingsPanelStack row
pnpm turbo run test --filter=@salmon/mobile     # ListRow expanded, TokenListFoldRow, settings index
pnpm typecheck && pnpm lint && pnpm check:parity && pnpm check:i18n && pnpm check:dead-code
pnpm --filter @salmon/extension build && pnpm check:manifest   # must show NO permission change
```

The two-instance test (research R4) must fail on the commit before the fix and pass after it: stash the fix once and watch it go red.

## 2. E2E

| Suite      | File (new)                                                        | Modelled on                                                                                    | What it does                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playwright | `apps/extension/.playwright/tests/token-list-preferences.spec.ts` | `nft-spam-filter.spec.ts` (fresh profile, setting → Home), `settings.spec.ts` (panel test ids) | Fresh profile, unlock, wait Home; count `token-row-*` (n). Settings → `settings-item-token-list` → `token-list-count-3` → back; `settings-item-token-list-value` reads "3 tokens". Home: `min(n, 3)` rows; if n > 3, `token-list-fold-row` reads "Show {n-3} more", click → n rows, "Show less" → 3. Set All, then reopen Home: n rows, no fold row. Skips when salmon-api is unreachable, like the others |
| Maestro    | `apps/mobile/.maestro/flows/smoke/settings/token-list.yaml`       | `flows/smoke/settings/currency.yaml`, `developer-networks.yaml`                                | Onboard wallet A, open settings, tap `settings-item-token-list`, screenshot, tap `token-list-count-3`, back; assert `settings-item-token-list-value`; back to Home, screenshot; when `token-list-fold-row` is visible tap it and screenshot; reopen the panel, tap `token-list-count-all`, back (the device is left as found)                                                                              |

Both read the wallet's own token count, so neither depends on what the test wallet holds. Maestro runs from `apps/mobile/.maestro/` (`./run.sh`).

## 3. Hand test (both platforms, a wallet with at least six Solana tokens and a staked position)

1. Settings → Preferences: rows read Display Language, Token list, Display Currency, Select Explorer, Appearance; Token list's trailing value reads "All".
2. Token list → Tokens shown → 3. Back: the row reads "3 tokens". Home: SOL and two tokens, "Show N more", the Staking section and the credit below it; the total is the same as before.
3. Tap "Show N more": every token, in the usual order, "Show less" at the end, staking still below. VoiceOver/TalkBack (mobile) or a screen reader (extension) announces the row as a button and its expanded state.
4. Open a token, come back: the list is folded. Switch network or wallet: folded.
5. Hide tokens worth less than → 5, with the display currency in euros: rows worth under €5 and unpriced tokens fold; SOL stays even under €5; the row reads "3 tokens · from €5.00". Switch the display currency to dollars: the threshold reads "$5.00" and the rows compare in dollars.
6. Devnet with a threshold: only SOL is visible.
7. Turn "Show unverified tokens" on, pick another explorer, quit and relaunch: the count, the threshold, the explorer and the unverified switch are all as left (the persistence fix).
8. Hide balances with the eye: the fold row still states the count; no amount appears.
9. Bitcoin page: unchanged.

## 4. Owner sign-offs before merge

- The "Show more" row's look and the Token list screen (plan.md §Owner sign-off, with the mocks), before the UI tasks start.
- The Spanish copy (contracts/ui-contracts.md §Copy), in the pull request.
- The persistence fix in `useUserConfig` (research R4): outside the constitution's gated paths, but it changes how every setting is saved.
