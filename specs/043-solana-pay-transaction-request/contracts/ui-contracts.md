# Contract: UI pieces (both twins)

The owner reviews UI before it is built; this file is that description.

## New: `SolanaPayRequestSheetPropsBase` (`packages/shared/src/types/ui/solana-pay-request-sheet.ts`)

The sheet that opens over the Send recipient step when a transaction-request link is scanned or pasted, and stays only until the review is ready.

```ts
export interface SolanaPayRequestSheetPropsBase {
  visible: boolean;
  /** Known as soon as the link is read; label and icon arrive with the GET. */
  merchant: { domain: string; label?: string; icon?: string | null };
  phase: 'contacting' | 'preparing' | 'failed';
  /** Translation key of the failure, and the merchant's own words when it sent some. */
  error?: { key: string; merchantMessage?: string } | null;
  /** Offered on reachability failures only (FR-009), never on unsafe transactions. */
  onRetry?: () => void;
  onClose: () => void;
}
```

Layout (kit blocks only, tokens only): identity row (icon in an `IconBubble` or the globe placeholder, label as title, domain under it via the kit's hostname display); a status line with the kit spinner ("Contacting merchant…" / "Preparing payment…"); on failure a `WarningNotice` with the reason and, when present, "The merchant says: …" in plain text; buttons Retry (when allowed) and Close. DOM: `packages/ui/src/components/SolanaPayRequestSheet/` on `BottomSheetContainer`. Mobile: `apps/mobile/src/components/SolanaPayRequestSheet/` on its `BottomSheetContainer`. Same name both sides, so the parity map needs no entry. Icon: DOM `<img referrerPolicy="no-referrer">`, mobile `expo-image`, `https:` only (research R9).

## Changed: core confirmation screen (`TransactionConfirmation` twins + `ConfirmationHost` twins)

- `display.requester` present → an identity row above the detail card (same look as the sheet's). Absent → screen exactly as today (every Powerup, MWA).
- DOM `TransactionConfirmation` starts honouring `confirmDisabled` and `requiresHold` (the contract has declared them since spec 036; only the mobile twin implemented them). Hold uses the kit `HoldToApproveButton`.
- Both hosts pass `display.requiresHold` / `display.confirmDisabled` through.

Review content for a merchant payment (rows from `dappTransactionDisplay` with the new inputs):

1. identity row: merchant label, icon, domain;
2. "Wallet" — the signing account;
3. one row per asset leaving (−) and arriving (+), from the simulation;
4. "Message" — the merchant's message, when sent;
5. "Network fee" — `0.000005 SOL` when the user pays it, or "Paid by `Abcd…wxyz`" when a sponsor does;
6. warnings exactly as for a dApp (approval, unreadable program, would fail, no effect, undetermined), with hold-to-confirm in the same cases;
7. confirm disabled with "Not enough SOL for the network fee" when the user pays and cannot.

Title "Review payment", pending wave "Paying {{label}}", receipt the core receipt with title "Payment sent".

## Changed: Send recipient step

- Mobile `apps/mobile/app/(app)/send/index.tsx` and DOM `packages/ui/src/components/SendPage/StepRecipient.tsx` + `SendPage.tsx`: a `transactionRequest` outcome opens the sheet instead of an error. After the receipt is dismissed, the Send flow closes (mobile `router.replace('/')`, DOM `onBack`). Cancel on the review returns to the recipient step with the field cleared.
- Mobile `QRScanner`: new prop `acceptTransactionRequests` (Send only). Elsewhere (address book form, NFT send) a transaction-request code shows the rejection "This is a payment link. Open it from Send."
- DOM NFT send: pasting a payment link shows `send.request.errors.paymentLinkNotHere`.

## Copy (keys, English drafted by the implementer, Spanish written by the implementer)

`solanaPay.contacting`, `solanaPay.preparing`, `solanaPay.reviewTitle`, `solanaPay.paying`, `solanaPay.receiptTitle`, `solanaPay.merchantMessage`, `solanaPay.message`, `solanaPay.feePaidBy`, `solanaPay.notEnoughSolForFee`, `solanaPay.refreshed`, `solanaPay.retry`, `solanaPay.errors.{watchOnly,malformedLink,unreachable,merchantError,unreadable,malformedIcon,malformedTransaction,invalidSignature,notForThisAccount,alreadySigned,missingSignature,staleOrWrongNetwork,expired,accountChanged}`, `send.request.errors.paymentLinkNotHere`, `qrScanner.paymentLinkOnlyInSend`. Removed: `send.request.errors.transactionRequest`.
