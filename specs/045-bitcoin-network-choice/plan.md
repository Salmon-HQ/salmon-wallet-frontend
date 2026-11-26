# Implementation Plan: Bitcoin network choice

**Branch**: `feat/045-bitcoin-network-choice` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/045-bitcoin-network-choice/spec.md` (Linear DEV-204), with the owner's decisions of 2026-11-25 recorded in it: one choice per device; asked on create and recover-from-phrase only; the warning always shown; earlier installs keep Bitcoin on and are not asked; the step right before the password screen; the owner's copy; the switch last in Preferences; no Bitcoin scan while off; Bitcoin contacts hidden, never deleted; nothing reported to analytics.

## Summary

One predicate in `packages/shared`, `isNetworkChosen`, decides whether a network may be shown; the existing rule `visibleNetworkIds` applies it before everything else, and the four surfaces outside that rule (private key screen, the two derived-account searches, the stored session network) call it directly. The choice is one optional field of the existing settings record (`bitcoinEnabled`, absent = on), written through `useUserConfig`'s queue, which gains a listener so every mounted reader sees a write at once. Onboarding writes through one new entry point, `saveBitcoinChoice`, from a step made once in shared (`createNetworkChoiceScreen`) and drawn by both apps between the phrase and the password. Settings gains a fourth toggle row, last in Preferences, whose "off" opens the existing confirmation sheet. A session standing on Bitcoin moves to Solana mainnet when the switch goes off and whenever the app opens with it off. No new dependency, no storage key, no permission, no backend change, no new analytics event, nothing under `storage/` or `crypto/`.

## Technical Context

**Language/Version**: TypeScript 5 strict, React 19; React Native / Expo (`apps/mobile`), DOM via WXT MV3 (`apps/extension`) over `@salmon/ui`.

**Primary Dependencies**: none new. `CurrencyBtcIcon` comes from the Phosphor packages both apps already ship.

**Storage**: one optional field, `UserConfig.bitcoinEnabled`, in the existing `STORAGE_KEYS.SETTINGS` record (data-model.md). `packages/shared/src/storage` and `crypto` are not touched.

**Testing**: Vitest (`packages/shared`, `packages/ui`), Jest (`apps/mobile`); Maestro and Playwright, one new flow each plus the onboarding helpers; gates `check:parity`, `check:i18n`, `check:dead-code`, `check:cycles`, coverage ratchets.

**Target Platform**: iOS/Android (JS-only, OTA-able) and the extension side panel and popup.

**Project Type**: pnpm + turbo monorepo, two apps on two shared packages.

**Performance Goals**: the rule is a filter over at most six network ids per render; the listener adds one function call per mounted `useUserConfig` instance per settings write. With Bitcoin off the app makes zero Bitcoin requests (SC-006).

**Constraints**: twins on one contract; no new visual language; the cross-platform clone count is at its ceiling (§Parity); onboarding is an auth flow (constitution III): the plan adds a step and changes no key handling.

**Scale/Scope**: 1 predicate + 1 rule parameter, 1 settings field with its setter, entry point and listener, 1 provider effect, 1 toggle-hook extension, 2 functions with an optional parameter, 1 kit factory, 1 new screen per twin, 1 registry row, 2 icon exports, 10 translation keys, 2 onboarding hosts (extension `App.tsx`, mobile `create`/`recover`/`_layout`), 4 step constants, 2 e2e flows new and 5 e2e files edited, 3 docs.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status        | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Ownership boundaries             | PASS          | Predicate, rule, setting, entry point, session move, toggle and confirmation logic, onboarding screen, copy: `packages/shared`. DOM screen and dialog: `packages/ui`. RN route and sheet: `apps/mobile`. Step routing: each app's onboarding host.                                                                                                                                                                                                                                                                                         |
| II. Consumers named                 | PASS          | §Consumers, from a grep of every changed export. Every change is additive (optional parameters, new members, new exports); no export path or barrel renamed.                                                                                                                                                                                                                                                                                                                                                                               |
| III. Wallet safety (NON-NEGOTIABLE) | PASS, flagged | Nothing in `crypto/`, `storage/` or signing. The onboarding flow (an auth flow) gains a step that writes one display preference and never sees the phrase: the mnemonic stays in the existing stash / `authData` and reaches the password step exactly as today. Address derivation (`getScanNetworks*`, `ensureMirrorNetworks`) is deliberately not filtered (research R11). Flagged for the reviewer: the auth hosts change (`App.tsx`, `create.tsx`, `recover.tsx`, `_layout.tsx`, the step counts in `PasswordPage` / `password.tsx`). |
| IV. Bilingual strings               | PASS          | 10 keys in English and Spanish (contracts/ui-contracts.md §Copy); English onboarding and Settings copy is the owner's; the confirmation copy and the Spanish are reviewed by the owner in the pull request (spec FR-022).                                                                                                                                                                                                                                                                                                                  |
| V. Functional coverage first        | PASS          | The rule, the setting, the listener, the session move, the toggle flow, both scans and the kit screen are test-first in `packages/shared`; one render test per new twin and per changed Settings root; one e2e per app, because the choice crosses onboarding → Home → Settings → Home.                                                                                                                                                                                                                                                    |
| VI. Ask rather than guess           | PASS          | Every product question decided (spec §Clarifications). The two plan questions and the mocks were answered by the owner on 2026-11-25 (§Owner sign-off). Placement of the onboarding screen follows the spec 044 kit pattern.                                                                                                                                                                                                                                                                                                               |
| Platform constraints                | PASS          | No `app.json`, plugin or permission change; `check:manifest` shows no diff. No identifier renamed.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Design tokens                       | PASS          | Only existing kit parts at kit sizes and semantic inks: `OnboardingLayout`, `ScreenHeader`, `SettingsSelectorList`, the toggle row, `ConfirmSheet` / `ConfirmDialog`, Phosphor glyphs at `componentSizes.logoSizeSmall` and `iconSize.md`.                                                                                                                                                                                                                                                                                                 |

_Twin components_: one new twin pair (the onboarding screen) and changes to two existing pairs (the Settings roots, the private key panels). Measured on this branch before any change: **cross-platform clones 2264 lines, ceiling 2264; same-side clones 870, ceiling 870** (`cloneLines` from `scripts/check-dom-parity.mjs`; `pnpm check:parity:report` → "106 twin pairs, 0 findings"). See §Parity for what the design adds.

Post-design re-check: unchanged. The listener is the one change that reaches every setting; it is additive (no write path removed) and has its own reproduction test.

## Architecture decisions

| Piece                                | Lives in                                                                                                 | Reuses                                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| May this network be shown            | `utils/network.ts` `isNetworkChosen` (pure)                                                              | —                                                                                          |
| Which networks are offered           | `visibleNetworkIds` (+ `bitcoinEnabled`), `useAvailableNetworks`                                         | The spec 026 rule and every surface already on it (research R1, R6)                        |
| Stored choice                        | `UserConfig.bitcoinEnabled`, `useUserConfig` (`bitcoinEnabled`, `setBitcoinEnabled`)                     | The settings record and its write queue                                                    |
| Every reader sees a write            | `useUserConfig` listener in `persistPatch` (research R2)                                                 | `applyConfig`, `commit`                                                                    |
| Onboarding write                     | `saveBitcoinChoice` (research R7)                                                                        | `persistPatch`                                                                             |
| Session never stranded on Bitcoin    | `setBitcoinEnabled(false, options)`; effect in `DeveloperModeProvider` (research R4)                     | `ToggleDeveloperNetworksOptions`, `changeNetwork`                                          |
| Live choice for every screen         | `DeveloperModeContext` (+ `bitcoinEnabled`, `setBitcoinEnabled`)                                         | The provider above every unlocked screen                                                   |
| Settings switch and warning          | `settings/registry.ts` row; `useDeveloperModeToggles` (`handleToggleBitcoin`, `bitcoinConfirm`)          | Both roots' toggle branch, `ConfirmSheet` / `ConfirmDialog` (research R9)                  |
| Private key screen, derived searches | `buildNetworkListFromAccount`, `findDerivedAccounts`, `useAccountAddFlow.selectDerive` (research R5)     | `isNetworkChosen`                                                                          |
| Onboarding screen                    | `kit/createNetworkChoiceScreen.tsx`; `NetworkChoicePage` (DOM), `(auth)/networks` (mobile) (research R8) | `OnboardingLayout`, `OnboardingTitle`, `ScreenHeader`, `SettingsSelectorList`, `GlobeIcon` |

What is deliberately not built: a second context or storage key for the choice (R2, R3); an override parameter on `useAvailableNetworks` (R2); a guard against the add-wallet path reaching the step (unreachable, R8); a balance lookup before the warning (decision 3); removing the now-redundant `developerNetworks` override seams (they keep working; a later cleanup).

## The onboarding write

- **Entry point**: `saveBitcoinChoice(enabled)` in `hooks/useUserConfig.ts` is `persistPatch({ bitcoinEnabled: enabled })` with no source instance. It is the only new export of the write path; `persistPatch` stays module-private.
- **Who calls it**: the shared step `createNetworkChoiceScreen`, on an option tap; it awaits the write, then calls the host's `onContinue` (extension: `setAuthStep('password')`; mobile: `router.push('/(auth)/password', params)`). A double tap continues once; a rejected write keeps the screen.
- **Mobile, first Home**: the provider mounts with `(app)` after the vault is written; its `useUserConfig` loads the record from storage, where the value already is because the write resolved before the password step appeared.
- **Extension, first Home**: the provider has been mounted since boot (`AppProviders.tsx:35`) with the record loaded; the listener hands it the merged record when `saveBitcoinChoice` lands, so its `bitcoinEnabled` is already off when the first Home renders. Without the listener it would stay on until the extension is reopened; the listener test reproduces exactly this.
- **Later setups**: "Remove all wallets" keeps the settings record; the next phrase setup asks again and overwrites. Seed Vault, private key and watch-only setups write nothing.

## Owner sign-off: the onboarding step, the Settings row, the confirmation

**Approved by the owner on 2026-11-25: the three mocks below (onboarding step, Settings row, confirmation) are built as drawn** (plain ASCII; widths and copy indicative; every visual is an existing kit part). Both apps draw the same grid; the extension popup is narrower.

The owner's answers of 2026-11-25:

- **Q1 — one tap.** Tapping an option saves the choice and goes to the password screen. Nothing is preselected (FR-006) and there is no Continue button: the action band stays empty because each row is the action. One screen, one tap (SC-002).
- **Q2 — the automatic move reports one network switch: accepted.** When the session moves from Bitcoin to Solana (switch turned off, or the app opens with it off), the accounts layer reports the existing `network_switched` event with `chain: solana` if analytics consent is on, as the Developer Networks move already does. The choice itself is never reported, on onboarding or in Settings.
- **Clone ceiling.** `CROSS_PLATFORM_CLONE_LINES_MAX` (2264) may be raised to the measured number if the new twins' data lines need it, with the dated comment `docs/DOM-PARITY.md` asks for; anything that is copied logic is hoisted into `packages/shared` instead. `SAME_SIDE_CLONE_LINES_MAX` does not move (§Parity).

**Onboarding step** (create shown; recover is identical with dots 2 of 3):

```text
Mobile                                   Extension (popup)
┌──────────────────────────────────┐     ┌──────────────────────────────┐
│ ‹                     ● ● ● ○    │     │ ‹                 ● ● ● ○    │  ← ScreenHeader: back + dots
│                                  │     │                              │
│              (globe)             │     │            (globe)           │  ← mark: GlobeIcon
│                                  │     │                              │
│       Choose your networks       │     │     Choose your networks     │  ← OnboardingTitle
│                                  │     │                              │
│ ┌──────────────────────────────┐ │     │ ┌──────────────────────────┐ │
│ │ Solana + Bitcoin             │ │     │ │ Solana + Bitcoin         │ │  ← SettingsSelectorList row
│ │ Use Solana and Bitcoin in    │ │     │ │ Use Solana and Bitcoin   │ │    primary + secondary text,
│ │ one wallet.                  │ │     │ │ in one wallet.           │ │    no well, no check
│ └──────────────────────────────┘ │     │ └──────────────────────────┘ │
│ ┌──────────────────────────────┐ │     │ ┌──────────────────────────┐ │
│ │ Solana only                  │ │     │ │ Solana only              │ │
│ │ Just Solana. You can add     │ │     │ │ Just Solana. You can add │ │
│ │ Bitcoin later in Settings.   │ │     │ │ Bitcoin later in         │ │
│ └──────────────────────────────┘ │     │ │ Settings.                │ │
│                                  │     │ └──────────────────────────┘ │
│                                  │     │                              │  ← no secondary, no action:
│                                  │     │                              │    a tap on a row saves and
└──────────────────────────────────┘     └──────────────────────────────┘    goes to the password screen
```

**Settings, Preferences group** (the new row is last; Off shown):

```text
Mobile                                   Extension (side panel)
┌──────────────────────────────────┐     ┌──────────────────────────────┐
│ ‹  Settings                      │     │ ‹  Settings                  │
│                                  │     │                              │
│ PREFERENCES                      │     │ PREFERENCES                  │
│ ┌──────────────────────────────┐ │     │ ┌──────────────────────────┐ │
│ │ (文) Display Language English│ │     │ │ (文) Display Language  EN│ │
│ └──────────────────────────────┘ │     │ └──────────────────────────┘ │
│   Token list · Display Currency  │     │   Token list · Currency ·    │
│   · Select Explorer · Appearance │     │   Explorer · Appearance      │
│   (one row each, unchanged)      │     │   (one row each, unchanged)  │
│ ┌──────────────────────────────┐ │     │ ┌──────────────────────────┐ │
│ │ (₿) Bitcoin            ( o—) │ │     │ │ (₿) Bitcoin       ( o—)  │ │  ← new: toggle row,
│ │     Show Bitcoin in your     │ │     │ │     Show Bitcoin in your │ │    CurrencyBtc glyph,
│ │     wallet                   │ │     │ │     wallet               │ │    same row as Developer
│ └──────────────────────────────┘ │     │ └──────────────────────────┘ │    Networks
│                                  │     │                              │
│ ADVANCED …                       │     │ ADVANCED …                   │
└──────────────────────────────────┘     └──────────────────────────────┘
```

(`₿` stands for the `CurrencyBtcIcon` glyph in the row's leading well; `( o—)` is the switch off, `(—o )` on.)

**Confirmation when turning Bitcoin off** (the existing sheet, not a danger sheet):

```text
Mobile (ConfirmSheet)                    Extension (ConfirmDialog)
┌──────────────────────────────────┐     ┌──────────────────────────────┐
│ ‹  Settings          (dimmed)    │     │ ‹  Settings      (dimmed)    │
│ …                                │     │ …                            │
├──────────────────────────────────┤     ├──────────────────────────────┤
│              ───                 │     │            ───               │
│         Hide Bitcoin?            │     │       Hide Bitcoin?          │  ← title
│ ┌──────────────────────────────┐ │     │ ┌──────────────────────────┐ │
│ │ Your Bitcoin stays in your   │ │     │ │ Your Bitcoin stays in    │ │  ← message, in a card
│ │ wallet. It shows again when  │ │     │ │ your wallet. It shows    │ │
│ │ you turn Bitcoin back on in  │ │     │ │ again when you turn      │ │
│ │ Settings.                    │ │     │ │ Bitcoin back on in       │ │
│ └──────────────────────────────┘ │     │ │ Settings.                │ │
│ ┌─────────────┐ ┌──────────────┐ │     │ └──────────────────────────┘ │
│ │   Cancel    │ │ Hide Bitcoin │ │     │ ┌──────────┐ ┌─────────────┐ │
│ └─────────────┘ └──────────────┘ │     │ │  Cancel  │ │Hide Bitcoin │ │  ← secondary · primary
└──────────────────────────────────┘     │ └──────────┘ └─────────────┘ │
                                         └──────────────────────────────┘
```

Cancel (or the handle, backdrop, back gesture, Escape) closes it with the switch still on; confirming moves the session to Solana if it stood on Bitcoin, then turns the switch off.

## Every Bitcoin surface and how it is hidden

From `grep -rli bitcoin` over `apps/extension/src`, `apps/mobile/{app,src,hooks,utils}`, `packages/ui/src`, `packages/shared/src` (tests excluded), each file opened. Research R5, R6 and R11 carry the reasoning.

| Surface                                           | File:line                                                                                                                                                                                               | How it is hidden                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| The offer (rule)                                  | `packages/shared/src/utils/network.ts:252`                                                                                                                                                              | `isNetworkChosen` first in `visibleNetworkIds`                                                           |
| The offer (hook)                                  | `packages/shared/src/hooks/useAvailableNetworks.ts:184, 288`                                                                                                                                            | passes its instance's `bitcoinEnabled`; live through the listener                                        |
| Home chain switch                                 | `HomePage.tsx:140`, mobile `(tabs)/index.tsx:310`; `utils/network.ts:172`                                                                                                                               | follows the offer; one main network → no switch                                                          |
| Balance prefetch                                  | `HomePage.tsx:274`, mobile `(tabs)/index.tsx:354`                                                                                                                                                       | iterates the offer                                                                                       |
| Bitcoin column + market data                      | `PortfolioColumn.tsx:115`, mobile `(tabs)/index.tsx:953`; `useHomeMarketData.ts:44`, `useHomeBitcoinMarket.ts:36`                                                                                       | only on `currentChain === 'bitcoin'`; unreachable once the session is on Solana                          |
| Stored session network                            | `useHomeShell.ts:182`, `useAccountsSelection.ts:160`                                                                                                                                                    | moved to `solana-mainnet` by `setBitcoinEnabled` and the provider effect (`DeveloperModeContext.tsx:45`) |
| Receive, Send, Activity, Wallets totals, explorer | `useWalletsScreen.ts:82`, `useBalance`, `useTransactions`, `useUserConfig` explorer                                                                                                                     | read the session network, kept on Solana                                                                 |
| Settings network panel                            | mobile `src/settings/panelRegistry.tsx:295`, `useSettingsPanelData.ts:69`                                                                                                                               | follows the offer                                                                                        |
| Address book (Settings, Send)                     | `useSettingsPanelData.ts:76`, `useSendContacts.ts:44` → `useAddressbook.ts:72`                                                                                                                          | adapter built from the offer skips Bitcoin contacts; stored list untouched                               |
| Private key screen                                | `utils/account.ts:374`; `PrivateKeyPanel.tsx:79`, mobile `panelRegistry.tsx:231`                                                                                                                        | `buildNetworkListFromAccount(account, bitcoinEnabled)`                                                   |
| Derived search: rescan / Check derivables         | `useDerivedAccountsScan.ts:142`                                                                                                                                                                         | `findDerivedAccounts(…, bitcoinEnabled)`                                                                 |
| Derived search: add-wallet → derive               | `useAccountAddFlow.ts:264` (rows drawn by both `DerivedAccountCard`s)                                                                                                                                   | filters `getScanNetworks()` with `isNetworkChosen`                                                       |
| Scanned / pasted Bitcoin address                  | `utils/scan-payload.ts:26`                                                                                                                                                                              | `wrongChain` on Solana, unchanged                                                                        |
| NFT screens (ordinals)                            | `useHomeShell.ts:229`, mobile `nft/[id]/send.tsx:69`, `StepRecipient.tsx:197`                                                                                                                           | NFTs offered only on Solana, unchanged                                                                   |
| Not hidden, on purpose                            | `useAccountsSecurity.ts:122` (protect screen); `getScanNetworks*` at `PasswordPage.tsx:180`, `password.tsx:270`, `useAccountAddFlow.ts:437`, `useDerivedAccountsScan.ts:330`; `useEnsureMirrorNetworks` | safety screen before any setting applies; address derivation keeps every phrase wallet's Bitcoin address |
| Not live                                          | `useMultiChainTokens.ts:147`                                                                                                                                                                            | no importer outside the barrel                                                                           |

Every other match is a type, a theme token, a chain mark, a blockchain implementation or a branch reached only on the Bitcoin page.

## Consumers of what changes in `packages/shared` and `packages/ui`

Files outside tests, from `grep -rlw <name>` over `apps` and `packages` on this branch.

| Export (change)                                                                               | Consumers                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `visibleNetworkIds` (+ optional `bitcoinEnabled`)                                             | `useAvailableNetworks.ts`; barrel `utils/index.ts:286`. Omitted = today's behaviour                                                                                                                                                              |
| `useUserConfig` (result + 2 members; listener in the write path)                              | 7 call sites: `DeveloperModeContext.tsx`, `useSettingsPanelData.ts`, `useAvailableNetworks.ts`, `useWalletsScreen.ts`, `useDerivedAccountsScan.ts`, extension `SettingsPage.tsx`, mobile `settings/index.tsx`. None destructures a changed field |
| `UserConfig` (+ `bitcoinEnabled?`)                                                            | `types/account.ts`, `useUserConfig.ts`                                                                                                                                                                                                           |
| `DeveloperModeContextValue` (+ 2 members)                                                     | provider in extension `AppProviders.tsx`, mobile `app/(app)/_layout.tsx`; readers `useDeveloperModeSettings` (extension `panelRegistry.tsx`, `HomePage.tsx`, `useDeveloperModeToggles.ts`), unchanged                                            |
| `useDeveloperModeToggles` (+ 3 members)                                                       | `SettingsPanelStack.tsx`, mobile `settings/index.tsx`                                                                                                                                                                                            |
| `SettingsToggleKey` (+ `'bitcoin'`), `SETTINGS_GROUPS` (+ row)                                | `SettingsPanelStack.tsx`, mobile `settings/index.tsx` (both `Record<SettingsToggleKey, …>` toggle maps gain `bitcoin`, typecheck enforces), `registry.test.ts`                                                                                   |
| `SettingsIconName` (+ `'currencyBtc'`)                                                        | `SettingsPanelStack.tsx`, mobile `settings/index.tsx` (`Record<SettingsIconName, …>`)                                                                                                                                                            |
| `buildNetworkListFromAccount` (+ optional arg)                                                | `PrivateKeyPanel.tsx`, mobile `panelRegistry.tsx`                                                                                                                                                                                                |
| `findDerivedAccounts` (+ optional arg)                                                        | `useDerivedAccountsScan.ts`; barrel `hooks/index.ts:247`                                                                                                                                                                                         |
| `CREATE_FLOW_STEPS` (3 → 4)                                                                   | `CreateWalletPage.tsx`, `PasswordPage.tsx` (DOM); mobile keeps its own copies in `create.tsx:51`, `password.tsx:93`                                                                                                                              |
| New: `isNetworkChosen`, `saveBitcoinChoice`, `createNetworkChoiceScreen`, `NetworkChoicePage` | each has a reader on both platforms by the commit that adds it, so `check:dead-code` stays green                                                                                                                                                 |

## Files to create or modify

| Package / app     | File                                                                                         | Change                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `packages/shared` | `src/utils/network.ts` (+ test)                                                              | `isNetworkChosen`; `visibleNetworkIds` step 3                                   |
|                   | `src/types/account.ts`                                                                       | `UserConfig.bitcoinEnabled?`                                                    |
|                   | `src/hooks/useUserConfig.ts` (+ `useUserConfig.bitcoin.test.tsx` new, `.instances.test.tsx`) | listener; `bitcoinEnabled`, `setBitcoinEnabled`; `saveBitcoinChoice` (commit 4) |
|                   | `src/hooks/useAvailableNetworks.ts` (+ test)                                                 | pass `bitcoinEnabled`                                                           |
|                   | `src/contexts/DeveloperModeContext.tsx` (+ test)                                             | carry the choice; the session move                                              |
|                   | `src/utils/account.ts` (+ test)                                                              | `buildNetworkListFromAccount` argument                                          |
|                   | `src/hooks/useDerivedAccountsScan.ts`, `useAccountAddFlow.ts` (+ tests)                      | the two searches                                                                |
|                   | `src/hooks/useDeveloperModeToggles.ts` (+ test)                                              | `handleToggleBitcoin`, `bitcoinConfirm`                                         |
|                   | `src/settings/registry.ts` (+ test)                                                          | row, `'bitcoin'`, `'currencyBtc'`                                               |
|                   | `src/kit/createNetworkChoiceScreen.tsx` + test (new), `src/kit/index.ts`                     | the onboarding screen                                                           |
|                   | `src/locales/en/translation.json`, `es/translation.json`                                     | 10 keys                                                                         |
| `packages/ui`     | `src/icons.ts`                                                                               | `CurrencyBtcIcon` export                                                        |
|                   | `src/components/SettingsPanelStack/SettingsPanelStack.tsx` (+ test)                          | glyph, toggle entry, `<ConfirmDialog {...bitcoinConfirm} />`                    |
|                   | `src/components/PrivateKeyPanel/PrivateKeyPanel.tsx`                                         | pass the choice                                                                 |
|                   | `src/components/AuthFlow/NetworkChoicePage.tsx` + test (new), `types.ts`, `index.ts`         | the DOM screen                                                                  |
|                   | `src/components/AuthFlow/CreateWalletPage.tsx`, `RecoverWalletPage.tsx`, `PasswordPage.tsx`  | step counts                                                                     |
| `apps/extension`  | `src/pages/auth/NetworkChoicePage.tsx` (new re-export), `src/entrypoints/popup/App.tsx`      | the `'networks'` step                                                           |
|                   | `.playwright/helpers.ts`, `scripts/lib.mjs`, `tests/analytics-consent-prompt.spec.ts`        | the extra step                                                                  |
|                   | `.playwright/tests/bitcoin-network-choice.spec.ts` (new)                                     | E2E                                                                             |
| `apps/mobile`     | `src/icons.ts`                                                                               | `CurrencyBtcIcon` export                                                        |
|                   | `app/(app)/settings/index.tsx` (+ test)                                                      | glyph, toggle entry, `<ConfirmSheet {...bitcoinConfirm} />`                     |
|                   | `src/settings/panelRegistry.tsx`                                                             | pass the choice to the private key list                                         |
|                   | `app/(auth)/networks.tsx` (new), `__tests__/app/networks.test.tsx` (new), `_layout.tsx`      | the route and its `Stack.Screen` (gesture back on, like `recover`)              |
|                   | `app/(auth)/create.tsx`, `recover.tsx`, `password.tsx`, `seed-warning.tsx`                   | push `networks`; step counts                                                    |
|                   | `.maestro/subflows/recover-walletA.yaml`, `recover-walletB.yaml`                             | the extra step, `NETWORK_CHOICE` parameter                                      |
|                   | `.maestro/flows/smoke/settings/bitcoin.yaml` (new), `.maestro/suites/smoke.yaml`             | E2E                                                                             |
| root / docs       | `scripts/check-dom-parity.mjs`                                                               | `SCREENS['(auth)/networks']`; the ceiling only if §Parity needs it              |
|                   | `DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/ANALYTICS.md`, `CLAUDE.md`                        | §Documentation                                                                  |

## Parity

Measured before the change: cross-platform clones **2264 / 2264**, same-side **870 / 870** (both at their ceiling, so any copied line trips the gate).

What the design adds across the platforms:

- The onboarding screen is made once in shared (`createNetworkChoiceScreen`), so each twin is the factory call plus its navigation: expected **0** cloned lines (below jscpd's 5-line / 50-token minimum).
- `currencyBtc: CurrencyBtcIcon` in both `SETTINGS_ICONS` tables: **+1** line inside an already-cloned table (spec 044's `stack` glyph moved the count by exactly 1).
- `bitcoin: { checked: bitcoinEnabled, onChange: handleToggleBitcoin }` in both toggle maps: **+1** if the maps sit inside a cloned block, 0 otherwise.
- The confirmation is one spread line per root (`{...bitcoinConfirm}`), with the copy composed in the hook: **0**.

Expected total **+1 to +2**. Owner decision of 2026-11-25: `CROSS_PLATFORM_CLONE_LINES_MAX` may be raised to the measured number if the new twins' data lines need it, with the dated comment `docs/DOM-PARITY.md` asks for and the reason in the commit; any clone pair that computes something (copied logic) is hoisted into `packages/shared` instead of absorbed by the ceiling. The number is measured with `cloneLines` at each UI commit. Same-side must stay at 870 or below and its ceiling does not move: the mobile route and the DOM page share nothing with the other onboarding screens because the screen is the factory's.

## Test plan (test-first)

Shared, Vitest, written before the code they cover:

1. **Rule** (`network.test.ts`): the nine vectors of contracts/network-choice.md.
2. **Setting** (`useUserConfig.bitcoin.test.tsx`, new): absent reads on and writes nothing; `false` reads off; `setBitcoinEnabled(false)` shows at once and the stored record keeps every other field; standing on `bitcoin-mainnet` → `changeNetwork('solana-mainnet')` resolves before the record is written; standing on Solana → no `changeNetwork`; turning on never moves the session.
3. **AGENTS.md: a saved setting shows at once and keeps a second tap** (`useUserConfig.instances.test.tsx`, `tapWhileSaving`): off then on before the first write lands → the screen reads off, then on, and the stored record ends on; the same with the listener in place (the writer is not reset mid-tap).
4. **Listener** (`useUserConfig.instances.test.tsx`): a second instance sees another instance's `setBitcoinEnabled` without remounting (commit 1), and `saveBitcoinChoice(false)` (commit 4, with the entry point). Fails without the listener (stash once).
5. **Offer** (`useAvailableNetworks.test.ts`): choice off → `networks.bitcoin` empty, `allNetworks` without Bitcoin, Developer Networks on or off; a write from another instance re-renders the hook (commit 1), and a `saveBitcoinChoice` from outside does too (commit 4).
6. **Provider** (`DeveloperModeContext.test.tsx`): exposes the choice; off + session on Bitcoin → one `changeNetwork('solana-mainnet')`; on, or session on Solana, or record still loading → none.
7. **Toggle flow** (`useDeveloperModeToggles.test.tsx`): on → writes; off → `bitcoinConfirm.visible`, nothing written; `onClose` → nothing written, `bitcoinEnabled` still true; `onConfirm` → session moves, then the write.
8. **Registry** (`registry.test.ts`): Preferences ends with the `bitcoin` toggle; its test id.
9. **Private key list** (`account.test.ts`): `false` drops `bitcoin-mainnet` and `bitcoin-testnet`; omitted keeps them.
10. **Searches** (`useDerivedAccountsScan.test.tsx`, `useAccountAddFlow.test.tsx`): off → the balance lookup is never called for a Bitcoin network and no Bitcoin row is offered; on → as today.
11. **Onboarding screen** (`createNetworkChoiceScreen.test.tsx`): two options, none selected, test ids; a tap writes then continues once; two quick taps continue once; a rejected write does not continue.

Twins: `NetworkChoicePage.test.tsx` (ui) and `__tests__/app/networks.test.tsx` (mobile; a test file under `app/` would become a route) render the factory with each platform's kit and assert the test ids; `SettingsPanelStack` (ui) and `settings/index` (mobile) tests draw the Bitcoin row last in Preferences and open the dialog / sheet on "off".

End to end (quickstart.md §2): the recover subflows and Playwright helpers gain the step and keep Bitcoin on, so every existing flow behaves as today, `blockchain-switcher.yaml` included. The two new flows reach their main assertion on **Wallet A** (a phrase wallet holding SOL, USDC and a dust token on mainnet, with a Bitcoin account): set up "Solana only" → no Bitcoin option on Home; turn Bitcoin on → the Bitcoin option appears (proving the wallet holds Bitcoin, so the "absent" assertions bite); turn it off through the confirmation → it is gone and Home stands on Solana.

## Commit order

Each commit passes the pre-commit gates on its own (`check:dead-code` included, so no export lands before its reader).

1. `feat(shared): Bitcoin network choice, the rule and the setting` — `isNetworkChosen`, `visibleNetworkIds`, `UserConfig.bitcoinEnabled`, the listener, `bitcoinEnabled` / `setBitcoinEnabled`, `useAvailableNetworks`, the provider's value and session move, the two searches, `buildNetworkListFromAccount`'s argument; tests 1–6, 9, 10 first. Draws nothing.
2. **Owner sign-off on the mocks**: given on 2026-11-25 (§Owner sign-off).
3. `feat: Bitcoin switch in Settings, both apps` — registry row, glyph exports, `useDeveloperModeToggles`, both roots with the confirmation, both private key callers, the 5 `settings.*` keys; tests 7, 8 and the root tests. Clone count measured.
4. `feat: choose networks during setup, both apps` — `saveBitcoinChoice`, `createNetworkChoiceScreen`, both twins, `App.tsx`, mobile route and `_layout`, `create` / `recover` handoff, step counts, `SCREENS` entry, the ceiling if needed with its reason, the 5 `wallet.networks.*` keys; test 11, the `saveBitcoinChoice` cases of tests 4 and 5, and the twin tests.
5. `test(e2e): Bitcoin network choice` — subflows, helpers, the two new flows, the smoke suite entry.
6. `docs: Bitcoin network choice in DESIGN.md, ARCHITECTURE.md and ANALYTICS.md`.

## Documentation (same PR)

- **`DESIGN.md`**: in "The screens, in short" (`DESIGN.md:689`), Settings: Preferences ends with the Bitcoin switch, the only switch outside Advanced, and turning it off asks first in the standard confirmation sheet. In the onboarding grid section (`DESIGN.md:376-388`): the "Choose your networks" step between the phrase and the password on create and recover, its two `SettingsSelectorList` rows with nothing preselected and no action band, and the step counts (create 4, recover 3, Seed Vault 2).
- **`docs/ARCHITECTURE.md:41`** (Spanish, as the file is): which networks the app offers is one rule in `utils/network.ts` (`visibleNetworkIds` / `isNetworkChosen`), narrowed by the backend, the wallet, Developer Networks and the user's Bitcoin choice; Bitcoin addresses are still derived for every phrase wallet while Bitcoin is hidden. Line 46: `useUserConfig` hands every write to the other mounted readers.
- **`docs/ANALYTICS.md:167`**: add "Bitcoin" to the Settings preferences that report nothing, and the onboarding network question to what is not reported; note that moving the session off Bitcoin reports `network_switched` like any other switch (per owner Q2).
- **`CLAUDE.md`**: the SPECKIT pointer moves to this plan (done in this commit).

## Open risks

- **The listener changes how every setting reaches the screens** (research R2). Additive, tested, and it removes a known staleness; flagged for review. Ceiling recorded: two instances writing within milliseconds of each other can show the other's record until their own write lands.
- **Auth hosts change** (constitution III, flagged): a step is inserted between the phrase and the password on both apps. The mnemonic's path (stash on mobile, `authData` on the extension) is not touched; mobile's `password` screen keeps `gestureEnabled: false`, and the new route allows back like `recover`, since no key material is written before the password.
- **Stranding if the move fails**: if `changeNetwork('solana-mainnet')` returned without moving (a phrase wallet always holds Solana mainnet, so this needs a damaged wallet), `useHomeShell`'s index would stay stale and the Bitcoin column could render. The provider effect retries on the next change of `networkId` or the choice; no extra guard is added.
- **Automatic move reports `network_switched`**: accepted by the owner on 2026-11-25 (Q2). It carries the destination family only; the choice itself is never reported.
- **Clone ceiling**: both ceilings are at their limit. Owner decision of 2026-11-25: the cross-platform ceiling may rise to the measured number for the new twins' data lines, with a dated comment; copied logic is hoisted instead; the same-side ceiling does not move (§Parity).
- **Step dots** are hard-coded in seven places across the twins (research R8, plus mobile `seed-warning.tsx:101`, which draws the create flow's first step as 1 of 3 with a literal); a missed one shows a wrong count, caught by the twin render tests. Mobile `password.tsx:391` gives Seed Vault the recover count today, so it gains its own branch (Seed Vault stays 2 of 2).
- **`isAddingAccount`** in the extension's `App.tsx` is unreachable today (research R8). If a later change reconnects `HomePage.onAddAccount`, the step would be asked when adding a wallet; FR-008 then needs a guard on `accounts.length === 0`.

## Project Structure

### Documentation (this feature)

```text
specs/045-bitcoin-network-choice/
├── plan.md              # this file
├── spec.md              # decided 2026-11-25
├── research.md          # R1–R11, every surface verified
├── data-model.md        # the stored choice, the offer, the session move
├── quickstart.md        # checks, e2e, hand test, sign-offs
├── contracts/
│   ├── network-choice.md    # shared rule, setting, entry point, provider, toggles, kit screen, vectors
│   └── ui-contracts.md      # onboarding step, Settings row, confirmation, test ids, copy
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared/src/
├── utils/network.ts                      # isNetworkChosen; visibleNetworkIds + bitcoinEnabled
├── utils/account.ts                      # buildNetworkListFromAccount(account, bitcoinEnabled)
├── types/account.ts                      # UserConfig.bitcoinEnabled
├── hooks/useUserConfig.ts                # listener; bitcoinEnabled, setBitcoinEnabled; saveBitcoinChoice
├── hooks/useAvailableNetworks.ts         # passes the choice
├── hooks/useDerivedAccountsScan.ts       # findDerivedAccounts(…, bitcoinEnabled)
├── hooks/useAccountAddFlow.ts            # selectDerive filter
├── hooks/useDeveloperModeToggles.ts      # handleToggleBitcoin, bitcoinConfirm
├── contexts/DeveloperModeContext.tsx     # bitcoinEnabled, setBitcoinEnabled, session move
├── settings/registry.ts                  # bitcoin toggle row, currencyBtc
├── kit/createNetworkChoiceScreen.tsx     # NEW: the onboarding step
└── locales/{en,es}/translation.json      # 10 keys

packages/ui/src/
├── icons.ts                              # CurrencyBtcIcon
├── components/SettingsPanelStack/…       # glyph, toggle, ConfirmDialog
├── components/PrivateKeyPanel/…          # passes the choice
└── components/AuthFlow/NetworkChoicePage.tsx  # NEW; step counts in Create/Recover/Password

apps/extension/
├── src/entrypoints/popup/App.tsx         # 'networks' step
├── src/pages/auth/NetworkChoicePage.tsx  # NEW re-export
└── .playwright/…                         # helpers + bitcoin-network-choice.spec.ts (NEW)

apps/mobile/
├── src/icons.ts                          # CurrencyBtcIcon
├── app/(app)/settings/index.tsx          # glyph, toggle, ConfirmSheet
├── src/settings/panelRegistry.tsx        # passes the choice
├── app/(auth)/networks.tsx               # NEW route; _layout, create, recover, password
└── .maestro/…                            # subflows + flows/smoke/settings/bitcoin.yaml (NEW)
```

**Structure Decision**: everything that decides — whether a network may be shown, what is stored, who sees a write, where the session goes, what the warning says, what the onboarding step does — is one implementation in `packages/shared`, so the twins only draw: one screen each from one factory, one toggle entry and one sheet spread in each Settings root, and the step's place in each onboarding host.

## Complexity Tracking

| Violation                                    | Why Needed                                                                                                                                           | Simpler Alternative Rejected Because                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| A listener in the shared settings write path | The extension's provider is mounted before onboarding and would keep showing Bitcoin after "Solana only"; three readers use their own stale instance | An override parameter on `useAvailableNetworks` touches four callers and still leaves the extension's onboarding stale |
| A change inside the auth flow hosts          | The spec places the question before the password screen (decision 5)                                                                                 | Asking after the wallet exists puts a decision between the password and Home, and the owner chose before the password  |
