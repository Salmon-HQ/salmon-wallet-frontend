# Quickstart: Bitcoin network choice (spec 045)

## 1. Automated checks

```bash
export PATH="$HOME/Library/Application Support/Herd/config/nvm/versions/node/v24.21.0/bin:$PATH"
pnpm turbo run test --filter=@salmon/shared     # network rule, useUserConfig (bitcoin, instances), provider move, toggles, scans, kit screen
pnpm turbo run test --filter=@salmon/ui         # NetworkChoicePage, SettingsPanelStack Bitcoin row + dialog
pnpm turbo run test --filter=@salmon/mobile     # networks route, settings index Bitcoin row + sheet
pnpm typecheck && pnpm lint && pnpm check:parity && pnpm check:i18n && pnpm check:dead-code && pnpm check:cycles
pnpm --filter @salmon/extension build && pnpm check:manifest   # must show NO permission change
```

The listener test (research R2) must fail before the change: a second `useUserConfig` instance does not see `saveBitcoinChoice` without remounting. Stash the listener once and watch it go red.

## 2. E2E

| Suite      | File                                                                                        | Change | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Maestro    | `subflows/recover-walletA.yaml`, `subflows/recover-walletB.yaml`                            | edit   | After `recover-next-button`, wait for `onboarding-networks-screen`, tap `onboarding-networks-option-${NETWORK_CHOICE \|\| 'solana-bitcoin'}`, then `password-input` as today. Every flow that onboards (through `onboard-walletA/B.yaml`, `recover-account.yaml`, `analytics-prompt.yaml`) keeps Bitcoin on, as today                                                                                                                                                                                    |
| Maestro    | `flows/smoke/settings/bitcoin.yaml`                                                         | new    | `clearState`, recover Wallet A with `NETWORK_CHOICE: solana-only`, decline consent; Home: assert `balance-chain-selector-option-bitcoin.*` **not visible**. Settings → `settings-bitcoin-toggle` on → back; assert the Bitcoin option **visible** (Wallet A holds Bitcoin, so this proves the off-assertion bites); tap it. Settings → toggle off → assert "Hide Bitcoin?" → `confirm-dialog-confirm` → back; assert the Bitcoin option not visible and the Solana total shown. Screenshots at each step |
| Playwright | `helpers.ts` `unlockOrRecover`, `scripts/lib.mjs`, `tests/analytics-consent-prompt.spec.ts` | edit   | Click `onboarding-networks-option-solana-bitcoin` between `recover-next-button` and `password-input`                                                                                                                                                                                                                                                                                                                                                                                                     |
| Playwright | `tests/bitcoin-network-choice.spec.ts`                                                      | new    | Fresh profile, recover Wallet A choosing Solana only, then the same three assertions as the Maestro flow through `settings-item-bitcoin` / `settings-bitcoin-toggle` and the dialog. Skips when salmon-api is unreachable, like the others                                                                                                                                                                                                                                                               |

Unaffected: `flows/smoke/auth/create-account.yaml` (stops at the phrase), `flows/actions/reset/remove-all-wallets.yaml` (stops at welcome), `tests/onboarding-grid.spec.ts` (measures welcome, seed warning and recover only). Maestro runs from `apps/mobile/.maestro/` (`./run.sh`).

## 3. Hand test (both apps)

1. Fresh install → Create: welcome, seed warning, phrase, **Choose your networks** (dots 3 of 4), password. Neither option is selected. Tap "Solana only" → password. Finish: Home shows the Solana total and no chain switch.
2. Receive, Send, Activity, Wallets, the network panel, the private key screen, the address book: Solana only. Scan or paste a Bitcoin address in Send: "This address belongs to a different network".
3. Settings → Preferences: last row "Bitcoin", off. Turn it on: back on Home, "Solana | Bitcoin" is there with the same address and balance as before.
4. Stand on Bitcoin, Settings → turn Bitcoin off: "Hide Bitcoin?" appears. Cancel: the switch is still on. Turn it off again and confirm: back on Home, it stands on Solana, no switch.
5. Developer Networks on: Solana Devnet appears, Bitcoin Testnet does not.
6. Relaunch: the switch is where it was left. Change language, currency, token list, unverified tokens: the Bitcoin switch does not move.
7. Recover from phrase: the same question at dots 2 of 3. Seed Vault (Seeker): no question.
8. Extension, two windows: turn Bitcoin off in the side panel while the popup stands on Bitcoin; reopen the popup: it stands on Solana.
9. Update an install from the previous build: no question, Bitcoin shown, the switch on.
10. Remove all wallets, set up again: the question is asked again and its answer applies.

## 4. Owner sign-offs

- The mocks in plan.md §Owner sign-off: approved on 2026-11-25, as drawn (one tap on the onboarding step).
- The cross-platform clone ceiling: owner decision of 2026-11-25, raised to the measured number only for the new twins' data lines, with a dated comment; copied logic is hoisted instead (plan.md §Parity).
- The Spanish copy and the proposed confirmation copy (contracts/ui-contracts.md §Copy), in the pull request.
- The listener added to `useUserConfig`'s write path (research R2): outside the constitution's gated paths, but it changes how every setting reaches the screens.
