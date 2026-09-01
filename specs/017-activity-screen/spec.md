# Feature Specification: Activity screen (CORE 08) with detail sheet

**Feature Branch**: `feat/redesign-mobile-home` (spec dir `017-activity-screen`)
**Created**: 2026-09-01 · **Status**: Draft

**Input**: Owner: rename the balance pill to "Activity"; drop the program pill from rows; short addresses like the header; Activity becomes a screen (rows are pressable); the transaction detail may stay a sheet opened from that screen; all pushed screens slide in and out from the right, Powerups excepted.

Depends on 015 (kit), 016 (screens, header, gate removal). Structural source: `product.pen` CORE 08 · Activity. Aesthetics: `DESIGN.md` (state rule §Sheets; screen header headline 24/14).

## User Scenarios & Testing

### US1 — Open Activity from the balance (P1)

Tapping the "Activity" pill on Home pushes the Activity screen from the right.

1. **Given** Home, **When** the pill is tapped, **Then** the Activity screen slides in from the right with `ScreenHeader` (back well, "Activity", subtitle), water column ground, screen gutter; back slides it out to the right.

### US2 — Read the list (P1)

Rows grouped by day (Today / Earlier), each row: token mark + type badge, verb ("Sent"/"Received"/"Swapped"), subtitle "To/From {short address}" (contact name when the address book knows it), amount coloured by sign, relative date. No program pill.

1. **Given** rows, **Then** no row shows a program/protocol chip; addresses render as `9mpJ…SAd3`.
2. **Given** a swap, **Then** two amounts (−/+) stack in the trailing column.
3. Failed / pending states, hidden-balance masking, pagination (load more), pull-to-refresh, error + retry, empty state all keep working as today.

### US3 — Filter (P2)

Chips ALL / SEND / RECEIVE / OTHER filter the loaded list client-side; the selection resets on leaving.

1. **Given** SEND selected, **Then** only outgoing rows show; empty state per filter.

### US4 — Detail (P1)

Tapping a row opens the existing transaction detail as a sheet over the Activity screen (explorer, share, copy, developer block unchanged).

### Edge cases

Very long contact names truncate; hidden balance masks amounts and a11y labels; loading skeleton uses the kit; lock while open → the screen sits under the lock overlay (it lives in the same stack as Wallets — verify).

## Requirements

- **FR-001** Balance pill copy: "Activity" / "Actividad"; testID `home-activity-button` kept; navigates to `/activity`.
- **FR-002** `/activity` is a stack screen (right slide), built from `ScreenHeader` + `ChipGroup` + `SectionLabel` + `ListRow`/`Card`; own water column like Wallets.
- **FR-003** Rows drop the program chip; subtitle uses `getShortAddress(addr, 4)` or the address-book name.
- **FR-004** Detail stays `TransactionDetail` inside `BottomSheetContainer`, opened from the screen.
- **FR-005** `TransactionHistorySheet` files are deleted once migrated; reusable pieces (`TransactionItem`, `ActivityStates`, `transactionTypes`, `ExplorerLinkButton`) move under an `Activity/` component folder.
- **FR-006** Navigation: every pushed screen in `app/(app)` (Settings and sub-routes, Wallets, Activity, future Send/Token/NFT detail) uses `slide_from_right` configured once in the stack options; Powerups keeps `fullScreenModal` + `slide_from_bottom`.
- **FR-007** EN + ES for all new copy; testIDs per `e2e-test-labels`; Maestro `flows/smoke/activity/*` re-pointed (not run).

## Success Criteria

- SC-001 Activity reachable in one tap from Home; back returns to Home with state intact.
- SC-002 No program chip in any row; every address in rows is short-form.
- SC-003 Unit suite green; new tests for filter logic, subtitle formatting (contact vs short address), navigation option (right slide) and the pill route.

## Assumptions

- Filters are client-side over loaded pages (the API has no type filter today).
- "OTHER" = everything that is neither send nor receive (swaps, stake, unknown).
- Detail as a full screen (CORE 09) is a later feature.
