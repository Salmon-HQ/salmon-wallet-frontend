# Contract: UI contracts (one base per pair, both twins extend)

## `packages/shared/src/types/ui/payments-screen.ts`

```ts
export interface PaymentsScreenPropsBase<TStyle> extends Testable {
  publicKey: string; // resolved by Home (runbook §1.1)
  networkId: string | null;
  onNavigateHome?: () => void;
  style?: TStyle;
}

export interface PaymentRequestSheetPropsBase<TStyle> extends Testable {
  visible: boolean;
  onClose: () => void;
  request: PaymentRequest | null; // null while closing
  uri: string; // the encoded transfer request
  accountLabel: string; // the `label` the QR carries
  status: PaymentRequestStatusView; // derived by the Powerup's hook, rendered as rows
  onCopy: () => boolean | Promise<boolean>;
  onShare?: () => void; // mobile share sheet; DOM omits
  onRemove: () => void;
  style?: TStyle;
}

export interface PaymentRequestStatusView {
  state: 'pending' | 'paid' | 'expired';
  rows: readonly FactsCardRow[]; // For / Expires in / Status / Paid by — built once in shared
  explorerUrl?: string;
  checkFailed: boolean;
}
```

Twins: `apps/mobile/src/components/PaymentsScreen/{PaymentsScreen,PaymentRequestSheet}.tsx` with `types.ts` extending the bases with `ViewStyle`; `packages/ui/src/components/PaymentsPage/{PaymentsPage,PaymentRequestSheet}.tsx` with `types.ts` extending with `CSSProperties`. Parity `MAP`: `PaymentsScreen: ['PaymentsPage']`. Mobile tab: `apps/mobile/src/screens/PaymentsTab.tsx` (`PowerupTabProps` → `PaymentsScreen`). DOM: `PaymentsPage` exported from `packages/ui/src/powerups.ts` (`null` in `.off.ts`), mounted in `apps/extension/src/pages/home/powerupBodies.tsx`.

## Shared logic the twins render (`packages/shared/src/powerups/payments/`)

```ts
export function usePaymentsScreenLogic(params: {
  publicKey: string;
  networkId: string | null;
  accountId: string;
  accountLabel: string;
}): {
  form: {
    amount: string;
    setAmount(v: string): void;
    note: string;
    setNote(v: string): void;
    expiry: ExpiryKey;
    setExpiry(k: ExpiryKey): void;
    fiatLine: string;
    canCreate: boolean;
    amountError: PaymentsErrorKey | null;
  };
  token: { symbol: 'USDC'; decimals: 6; logo?: string } | null; // null ⇒ error state "USDC not available here"
  create(): Promise<PaymentRequest>; // generates the reference, persists, opens the sheet
  requests: readonly PaymentRequest[]; // this account, this network, newest first
  open: PaymentRequest | null;
  openRequest(id: string): void;
  closeRequest(): void;
  remove(id: string): void;
  uriFor(r: PaymentRequest): string;
  statusFor(r: PaymentRequest): PaymentRequestStatusView;
  copy(r: PaymentRequest): Promise<boolean>;
  loading: boolean;
  error: PaymentsErrorKey | null;
};

export const EXPIRY_OPTIONS: readonly { key: 'h1' | 'h24' | 'd7'; ms: number; labelKey: string }[];
export const PAYMENTS_STATUS_POLL_MS = 5_000;
```

`usePaymentRequestStatus(request, networkId)` polls while `request.status === 'pending'` and the sheet is open, writes the settlement through the store, and stops on `paid`/`expired`/unmount.

## Kit change: `QRCodePropsBase.brandKnockout?: boolean`

Both `QRCode` twins draw the centred brand-mark knockout `ReceiveSheet` draws today (`QR_LOGO_KNOCKOUT_RATIO`, `ecLevel="H"` forced when set). `ReceiveSheet` twins switch to the prop; the request sheet uses it. No visual change to Receive.

## Composition (both twins, blocks only)

Tab root (`paddingTop: 0`, sides `spacing.headerPadding`): `AmountEntryCard` → `TextField` note → `ChipGroup variant="outline"` expiry → `PrimaryButton` (fixed narrow step) → `SectionLabel variant="caps"` → rows (`ListRow`) / `StateBlock` / `SkeletonRow`. Sheet: `BottomSheetContainer` → `QRCode brandKnockout` → amount (the balance type style through the existing text tokens) → `FactsCard rows={status.rows}` → `SecondaryButton` Copy / Share → `SecondaryButton` Remove. Gaps between siblings `spacing.screenGutter` (DESIGN.md §Layout).

## Translation keys (Powerup, `payments.*`)

`catalog.name`, `catalog.description`, `catalog.about`, `catalog.actions.ask`, `catalog.actions.track`, `form.amountPlaceholder`, `form.note`, `form.notePlaceholder`, `form.expiry`, `form.expiry.h1`, `form.expiry.h24`, `form.expiry.d7`, `form.create`, `list.title`, `list.empty.title`, `list.empty.body`, `list.noNote`, `sheet.title`, `sheet.for`, `sheet.expiresIn`, `sheet.status`, `sheet.paidBy`, `sheet.copy`, `sheet.share`, `sheet.remove`, `status.pending`, `status.paid`, `status.expired`, `status.checkFailed`, `errors.usdcUnavailable`, `errors.amountInvalid`, `errors.amountTooManyDecimals`. English in this lot; Spanish from the owner.
