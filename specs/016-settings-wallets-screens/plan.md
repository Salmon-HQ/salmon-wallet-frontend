# Implementation Plan: Gate removal + Settings and Wallets screens

**Branch**: `feat/redesign-mobile-home` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

## Summary

Delete the gate (`GateContainer` lift choreography + panel host) and replace it
with two expo-router stack screens — Settings (existing panels as screen
bodies) and Wallets (CORE 10) — sharing one add-wallet route. Lock screen keeps
a minimal container.

## Technical Context

Same as 015 (RN/Expo, expo-router, Reanimated, `@salmon/shared`). Kit from 015:
`ScreenHeader`, `Card`, `ListRow`, `IconBubble`, `Chip`, `KeyValueRow`,
`SectionLabel`.

## Current state to remove / reuse

- `apps/mobile/src/components/GateContainer/{GateContainer,HeaderContent,LockContent,types}.tsx` — header row + lock content + gate state machine (`collapsed | expanded | locked`, `translateY`, `concealed`, `showExpanded`, `PanelHost`). Keep: lock content, header row. Remove: everything else.
- `apps/mobile/app/(app)/(tabs)/_layout.tsx` ~l.400–1000 — `GateContainer` + two `PanelHost`s mounting `SettingsSheet` and `WalletSwitcherSheet` with a big `onNavigate(SettingsScreen)` switch rendering `AccountAvatarPanel`, `SecurityPanel`, `PrivateKeyPanel`, `LanguageSelector`, `CurrencySelector`, `ExplorerSelector`, `NetworkSelector`, `AddressBookPanel`, `AddressAddPanel`, `AddressEditPanel`, `TrustedAppsSelector`, `SupportSelector`, `AccountsPanel`, `AccountEditPanel`, `AccountNamePanel`, `AccountAddPanel`, `BackupPanel`, `AboutPanel`. These panel components become screen bodies.
- `apps/mobile/src/components/{SettingsSheet,WalletSwitcherSheet,SettingsPanelStack,SettingsHeaderContext,SettingsScreenLayout,PanelHost,SubAccountSelector}` — audit: reuse bodies, delete sheet/gate wrappers.
- Routes: `app/(app)/(tabs)/settings/{_layout,index}.tsx` are placeholders ("real UI renders as a sheet from the Gate") → become real. Add `app/(app)/wallets/…` (or `(tabs)/wallets`) for CORE 10 and `app/(app)/settings/accounts/add` shared by both.
- `TaskChromeContext` — keep for tasks; drop gate-only fields.

## Screens

- **Settings** (`/settings`): `ScreenHeader` title + sections as `SectionLabel` caps + `Card` groups of `ListRow`s (leading `IconBubble` 40 surface, trailing chevron/value). Sub-routes per `SettingsScreen` key.
- **Wallets** (`/wallets`, CORE 10): header (back 38, "Wallets" 20/700, subtitle 13/500) · `Card` tone ink p18: label 13/600 + eye 17, value 30/700, "N of M wallets included" 12/500 · heading row "Include in total" / "Check to include" 12/700 · per wallet `Card` p16 (active: accent stroke): `IconBubble` 44 circle (ink for active, accent-tint otherwise), name 15/700 + rename `IconBubble` 24 surface (icon 13), balance 12/500, include check 22 (accent / muted) · "Add wallet" outlined `Card` (dashed/hairline) with plus 18 accent + label 14/700. Derived accounts: expandable per wallet using `SubAccountSelector` chips restyled with `Chip`.
- **Add wallet** (`/settings/accounts/add`): existing `AccountAddPanel` body; `returnTo` param decides where completion lands (Wallets or Settings → Accounts).

## Motion

Header row: sink/float with content only. Screen push/pop: native stack transition; no custom gate motion anywhere.

## Verification

`pnpm turbo run typecheck lint test --filter=@salmon/mobile`; grep SC-001; Maestro smoke files under `.maestro/flows/smoke/settings/` and `mobile/wallet-switcher` re-pointed (do not run — owner tests by hand).

## Header weight vs balance (owner ruling 2026-09-01) — four token/colour changes, no layout change

Measured against `product.pen` CORE 01: header row 38 pt, name 14/700 primary,
address 11/500 muted; balance 38/700; gap 20. Keep responsiveness (`s()`/`vs()`).

1. `packages/shared/src/theme/typography.ts`: `fontSize.balance` 60 → **38**
   (doc comment: "the total balance, and nothing else"); keep `letterSpacing.balance`
   and tabular figures. Home `BalanceHeader` uses `fontSize.balance` again (not
   `display`). Consumers that misuse the token move to `display` (36):
   `packages/ui/src/components/SwapScreen/SwapAmountInput.tsx`,
   `apps/mobile/src/components/SwapScreen/SwapAmountInput.tsx`, and any other
   non-balance use (`packages/ui/.../TokenListItem.tsx` — check). `packages/ui/BalanceCard`
   keeps the token (it IS the balance; web/extension pick up 38 ahead of their redesign —
   accepted by the owner). Update tests that pin 60.
2. Header copy-address glyph: `text.accent` → `text.secondary` (no salmon in the header;
   Send + FAB are the living elements).
3. Header short address: `text.secondary` → `text.tertiary` (the `.pen`'s muted), keep 12
   (nearest step to 11).
4. Profile picture: no accent ring/border; neutral hairline at most. Size stays 38; if it
   still competes after 1–3, drop to 36 (owner's call, ask).

## Rulings folded in (2026-09-01, afternoon)

- `spacing.screenTop` = 12 (status bar already breathes; 28 read as empty water).
- Wallet header row is Home-only; pushed screens never show it.
- Pushed-screen header = `.pen` "Receive header": back well 38 + title 20/700 in a row (gap 12), subtitle 13/500 below.
- Avatar (left) is a circle, like the gear.
- Thermocline: membrane scales field retired; membrane alphas lowered; `Card` tone `surface` = thin membrane + hairline (background shows through cards).
- Sub-tabs: sliding underline + interpolated type, N tabs; "Loading your collectibles…" header removed.
- Flesh texture on every solid accent fill (Send, FAB, PrimaryButton, accent tiles).

## Powerups: FAB opens Browse as a full-height screen (owner ruling 2026-09-01, evening)

- The `+` FAB pushes a full-height screen that slides up from the bottom and covers
  everything (header included): it IS POWERUPS 02 · Browse — title "Browse Powerups"
  (lightning 17 accent + 20/700) + subtitle 12/500, **no back chevron**; search pill;
  filters All / Featured / Official / Community (`ChipGroup` sm); first section
  **INSTALLED** (grid tiles, ex-launcher POWERUPS 01: tile = `Card` p[12,8] + `IconBubble`
  48 rounded + label 12/700 — Swap is the one real installed powerup today); then
  FEATURED (`Card` ink: `IconBubble` 48 rounded accent, `PowerupBadge`s, title 18/700,
  description 12/500), OFFICIAL and COMMUNITY (`ListRow` in `Card`: `IconBubble` 44
  rounded accent-tint, title 14/700, subtitle 11/500, trailing `PowerupBadge`).
- The same FAB stays on the Browse screen in the same spot, rotated to × (`open`);
  tapping it (or the system back / swipe-down) dismisses the screen downward and the
  FAB returns to +.
- `PowerupsLauncherSheet` is deleted (files included).
- Catalogue: mock entries from the `.pen` (Wallet Guard, Staking, Auto-compound, NFT
  Floor Watch) live behind a developer flag (`useDeveloperMode` / an explicit
  `SHOW_MOCK_POWERUPS` constant); without the flag only the real catalogue (Swap,
  installed) renders and the other sections show their empty state.
- Screen header type (2026-09-01 evening): title `headline` 24/700, subtitle `body` 14/500 — the `.pen`'s 20/13 read too small on device; DESIGN.md's headline role for screen headers wins.
- Sub-tab switch on Solana must not replay the balance entering animation (remount artefact); Solana family match includes devnet.
