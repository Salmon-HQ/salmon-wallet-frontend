# Feature Specification: Send flow as screens (CORE 04–07)

**Feature Branch**: `feat/redesign-mobile-home` (spec dir `018-send-screens`)
**Created**: 2026-09-01 · **Status**: Draft

Send becomes four stack screens per the state rule (`DESIGN.md` §Sheets): recipient → amount → review → success, replacing `SendSheet`'s steps. Structural source: `product.pen` CORE 04 (+04A wrong network, 04B uninitialized), 05, 06, 07. Right-slide navigation (017); the flesh/kit/theme rules of 015/016 apply; the 20-pt component gap rule applies.

## User Stories

### US1 — Choose a recipient (P1)

Send circle on Home pushes `/send`: `ScreenHeader` ("Send", "Choose who will receive your assets."), a token row above the address input (`ListRow`, `send-selected-token`, opens the shared `TokenPickerSheet`), address input (existing `InputAddress` incl. QR scan and validation), "Recent" `SectionLabel` + recent/contact rows (`ListRow` in `Card`: initial avatar 38 accent-tint, name 14/700, short address 12/500, chevron), sticky `PrimaryButton` "Continue".

**Owner ruling (2026-09-01)**: the token is chosen here, first, not on the amount screen — the amount screen's copy of the row is read-only. Review keeps a "Change" affordance that reopens the same `TokenPickerSheet`; picking a token whose balance no longer covers the typed amount sends the user back to `/send/amount` to fix it, otherwise Review stays put.

1. Valid address or recipient tap → Continue enabled → `/send/amount`.
2. **04A**: address from another network → inline warning card ("Not a Solana address…"), Continue disabled.
3. **04B**: valid but uninitialized account → informational warning ("The first transfer will initialize this account…"), Continue enabled.
4. Contacts come from the address book; recents from recent transactions. Watch-only accounts cannot reach `/send` (Send disabled on Home, guard on the route).

### US2 — Enter the amount (P1)

`/send/amount`: header "Send {TICKER}" + "Enter the amount to send."; "Available" `KeyValueRow`; amount entry `Card` (value 46/700 tabular, ticker 14/700, fiat approx 13/500); shortcuts `ChipGroup` 25%/50%/75%/Max; recipient summary `Card` (`KeyValueRow` To / Address); optional memo input; fee `Card` (`KeyValueRow` network fee / estimated arrival); `PrimaryButton` "Review send".

1. Token comes from the flow's context, chosen on `/send` (US1); this screen's token row is read-only and only restates the balance the header's "Send {TICKER}" already named.
2. Max accounts for fees exactly as today; invalid/zero amounts keep Review disabled; balance-exceeded shows today's error.

### US3 — Review and sign (P1)

`/send/review`: header "Review send" + "Check the details before signing."; transaction summary (existing summary/`ConfirmSheet` content as `Card`+`KeyValueRow`s); memo `Card` when present; simulation/security `WarningNotice`; `SecondaryButton` "Cancel" (pops to Home) above the confirm `PrimaryButton` (biometric/password exactly as today). The wait ("the loading screen") is unchanged.

### US4 — Success (P1)

`/send/success`: success seal (`IconBubble` 88 ink, icon 48 success), "Sent successfully" 28/700, body "{amount} is on its way to {name}.", receipt `Card` (`KeyValueRow` Amount/To/Status/Memo), `SecondaryButton` "View transaction" (detail sheet or explorer as today) + `PrimaryButton` "Return home" (pops to Home). No back gesture to review.

### Edge cases

Failure path keeps today's error surface; app lock mid-flow → lock overlay covers (stack screens) and the flow's state survives unlock; hidden balance does not mask the amount being typed; ES expansion fits; deep links/dApp-initiated sends (if any reach SendSheet today) keep working or are listed.

## Requirements

- FR-001 Routes `/send`, `/send/amount`, `/send/review`, `/send/success` (nested stack), right-slide; Home's Send pushes `/send`.
- FR-002 Business logic is reused, not rewritten: `useSendTransaction`, validation, fee estimation, `useSendContacts`, QR scan — the same hooks `SendSheet` uses today.
- FR-003 `SendSheet` (and its step components) are deleted once nothing imports them; shared pieces move to `src/components/Send/`.
- FR-004 Kit-only composition; 20-pt gaps between sibling blocks; screen headers per the standard composition.
- FR-005 Every string EN+ES (reuse existing send copy; never guess new Spanish).
- FR-006 testIDs per e2e-labels; Maestro `flows/actions/send/*` re-pointed (not run).
- FR-007 The task-engaged choreography (Home sinking under the flow) keeps working or is deliberately retired for Send-as-screens — decide with the motion audit's outcome and record it.

## Success Criteria

- SC-001 A send completes end-to-end on-device exactly as before (same tx, fees, receipt).
- SC-002 No `SendSheet` references remain; suites green; new tests for 04A/04B gating, shortcut math, route guards.
- SC-003 Back behaves: recipient→Home, amount→recipient, review→amount, success→only "Return home".
