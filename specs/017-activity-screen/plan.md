# Implementation Plan: Activity screen

**Branch**: `feat/redesign-mobile-home` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

## Summary
Move the activity list from `TransactionHistorySheet` into `app/(app)/activity.tsx`, rename the Home pill, strip the program chip, short addresses, add client-side filters, keep the detail as a sheet, and set right-slide transitions for all pushed screens in one place.

## Technical context
Same stack as 015/016. Reuse: `TransactionItem`, `ActivityStates`, `transactionTypes`, `ExplorerLinkButton` (from the just-restyled sheet), `useTransactions`, `useAddressbook` (contact names), `getShortAddress`, `ScreenHeader`, `ChipGroup`, `SectionLabel`, `ListRow`, `Card`, `BottomSheetContainer` + `TransactionDetail`.

## Steps
1. `app/(app)/_layout.tsx` (+ `(tabs)/settings/_layout.tsx`): `screenOptions.animation = 'slide_from_right'`, `gestureDirection: 'horizontal'`; Powerups screen overrides with `fullScreenModal` + `slide_from_bottom`. One test asserting the options.
2. New `src/components/Activity/` — move `TransactionItem`, `ActivityStates`, `transactionTypes`, `ExplorerLinkButton` there; `TransactionItem`: remove the protocol `Chip`, subtitle = contact name ?? `To/From {getShortAddress(addr, 4)}`.
3. `app/(app)/activity.tsx` — water column, `ScreenHeader` (title `transactions.title`, subtitle new key), `ChipGroup` filters (`activity.filters.all|send|receive|other`), grouped list (reuse the day-grouping from the sheet), states, load more, pull-to-refresh; row press → `TransactionDetail` sheet (local state). Mount data via `useTransactions` with the same params Home used; Home no longer holds transaction state for the sheet.
4. Home: pill label `home.activity` ("Activity"/"Actividad"), press → `router.push('/activity')`; remove `TransactionHistorySheet` usage, its state and handlers from `index.tsx`.
5. Delete `src/components/TransactionHistorySheet/` (remaining files + tests + barrel); update barrel exports for `Activity/`.
6. Maestro `flows/smoke/activity/*` + any flow that opened the history sheet → `home-activity-button` then `activity-screen`.
7. Verify: `pnpm turbo run typecheck lint test --filter=@salmon/mobile --filter=@salmon/shared`.
