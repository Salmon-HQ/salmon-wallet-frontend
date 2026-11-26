# Contract: screens, test ids and copy (spec 045)

The owner approved the mocks in plan.md §Owner sign-off on 2026-11-25, as drawn: on the onboarding step a tap on an option saves it and goes to the password screen, nothing is preselected, and there is no Continue button.

## Onboarding step "Choose your networks"

| Piece        | Extension                                                                                                                                                                 | Mobile                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Screen       | `packages/ui/src/components/AuthFlow/NetworkChoicePage.tsx` (new, from `createNetworkChoiceScreen`), re-exported by `apps/extension/src/pages/auth/NetworkChoicePage.tsx` | `apps/mobile/app/(auth)/networks.tsx` (new route, from `createNetworkChoiceScreen`) |
| Reached from | `App.tsx` `handleCreateComplete` / `handleRecoverComplete` → `authStep 'networks'`                                                                                        | `create.tsx` / `recover.tsx` push `/(auth)/networks` with their params              |
| Leads to     | `authStep 'password'`; Back → `create` / `recover`                                                                                                                        | push `/(auth)/password`, same params; Back → `router.back`                          |
| Ground       | `background={<WaterColumn />}`                                                                                                                                            | `float`                                                                             |
| Parity       | `SCREENS['(auth)/networks'] = 'packages/ui/src/components/AuthFlow/NetworkChoicePage.tsx'`                                                                                |                                                                                     |

Layout: `OnboardingLayout` `variant="content"` (recover's and password's variant, so the hero holds still across the step); `chrome` = `ScreenHeader` with back and step dots (create 3 of 4, recover 2 of 3); `mark` = `GlobeIcon`; `title` = `OnboardingTitle`; `body` = one `SettingsSelectorList` with two rows, primary + secondary text, no leading well, nothing selected; no `secondary`, no `action` (a row is the action).

Test ids: `onboarding-networks-screen` (layout), `onboarding-networks-back` (header), `onboarding-networks-option-solana-bitcoin`, `onboarding-networks-option-solana-only` (`testIdPrefix="onboarding-networks-option"`).

## Settings row "Bitcoin"

| Piece       | Value                                                                                                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry    | `{ id: 'bitcoin', kind: 'toggle', icon: 'currencyBtc', labelKey: 'settings.bitcoin', descriptionKey: 'settings.bitcoin_description', testId: 'settings-bitcoin-toggle' }`, last row of `settings.sections.preferences` |
| Row test id | `settings-item-bitcoin` (`getSettingsItemTestId('bitcoin')`; no slug entry needed)                                                                                                                                     |
| Drawn by    | the existing toggle branch: `SettingsPanelStack.tsx:243`, mobile `settings/index.tsx:253`                                                                                                                              |
| Wiring      | `toggles.bitcoin = { checked: bitcoinEnabled, onChange: handleToggleBitcoin }` on both roots                                                                                                                           |
| Glyph       | `currencyBtc: CurrencyBtcIcon` in both `SETTINGS_ICONS` tables; one export line in each `icons.ts`                                                                                                                     |

## Confirmation "Hide Bitcoin?"

`<ConfirmDialog {...bitcoinConfirm} />` inside `SettingsPanelStack`; `<ConfirmSheet {...bitcoinConfirm} />` in mobile `settings/index.tsx`. Not a danger sheet: Cancel is the secondary shell, the confirm is the primary. Test ids are the sheet's own: `confirm-dialog-confirm`, `confirm-dialog-cancel`.

## Private key screen

`PrivateKeyPanel` (DOM) and mobile `panelRegistry.tsx` `privateKey` pass `bitcoinEnabled` from `useDeveloperModeSettings()` to `buildNetworkListFromAccount`. No visual change.

## Copy (10 keys, English and Spanish)

English is the owner's (decisions 6 and 7) except the confirmation, which is proposed here. Spanish is written by the implementer in voseo and reviewed by the owner in the pull request (spec FR-022).

| Key                                          | English                                                                                      | Spanish                                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `wallet.networks.title`                      | Choose your networks                                                                         | Elegí tus redes                                                                                     |
| `wallet.networks.solana_bitcoin`             | Solana + Bitcoin                                                                             | Solana + Bitcoin                                                                                    |
| `wallet.networks.solana_bitcoin_description` | Use Solana and Bitcoin in one wallet.                                                        | Usá Solana y Bitcoin en una sola wallet.                                                            |
| `wallet.networks.solana_only`                | Solana only                                                                                  | Solo Solana                                                                                         |
| `wallet.networks.solana_only_description`    | You can add Bitcoin later in Settings.                                                       | Podés sumar Bitcoin después en Configuración.                                                       |
| `settings.bitcoin`                           | Bitcoin                                                                                      | Bitcoin                                                                                             |
| `settings.bitcoin_description`               | Show Bitcoin in your wallet                                                                  | Mostrar Bitcoin en tu wallet                                                                        |
| `settings.bitcoin_off_title`                 | Hide Bitcoin?                                                                                | ¿Ocultar Bitcoin?                                                                                   |
| `settings.bitcoin_off_message`               | Your Bitcoin stays in your wallet. It shows again when you turn Bitcoin back on in Settings. | Tus bitcoins siguen en tu wallet. Vuelven a verse cuando activás Bitcoin otra vez en Configuración. |
| `settings.bitcoin_off_confirm`               | Hide Bitcoin                                                                                 | Ocultar Bitcoin                                                                                     |

The cancel button keeps `actions.cancel`.
