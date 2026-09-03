# Implementation Plan: Send screens

**Branch**: `feat/redesign-mobile-home` | **Spec**: [spec.md](./spec.md)

Reuse map: `SendSheet/{SendSheet,StepAddressAmount,StepConfirmation,…}` → read first; hooks `useSendTransaction`, `useAddressValidation`, `useSendContacts`; `QRScanner`, `InputAddress`, `TokenSelector`; `TransactionSuccessScreen` (compare with CORE 07 before writing a new one); `WarningNotice`; kit primitives. Screens live under `app/(app)/send/{index,amount,review,success}.tsx` with a `_layout.tsx` sub-stack (right-slide inherited). Flow state in a small context/provider mounted at the send `_layout` (recipient, token, amount, memo) so back/forward keeps state; success clears it. Warning cards (04A/04B) = `WarningNotice` tones. Delete `SendSheet` files + barrel entries after migration; update `home` tests and Maestro send flows.

## Motion criterion (owner-approved 2026-09-01, applies after the Send agent frees index.tsx/BalanceHeader)

Eight rules from the motion audit go into DESIGN.md §Motion ("The balance
block's motion"); fixes: gate `exiting` like `entering` (A); un-nest the verb
and split `contentSwap` into per-cause flags (B, D); reset scroll fade on chain
change (F); `PendingValue` on the change row + em-dash for undefined, drop the
`= 0` defaults (G); rule 8 resolved as "both travel": the active chain dot
gains the same drift width/position transition as the sub-tab underline.
