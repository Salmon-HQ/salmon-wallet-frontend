import type { ReactNode } from 'react';
/**
 * The Payments Powerup's contracts — both twins extend them
 * (`apps/mobile/src/components/PaymentsScreen`, `packages/ui/src/components/PaymentsPage`).
 */
import type { NetworkEnvironment } from '../../config/explorers';
import type { FactsCardRow } from './facts-card';
import type { Testable } from './testable';

export interface PaymentsScreenPropsBase<TStyle> extends Testable {
  /** The active account's address on `networkId`, resolved by Home. */
  publicKey: string;
  networkId: string | null;
  onNavigateHome?: () => void;
  /** Opens the platform's Send with its scanner up; absent, the Pay action is not offered. */
  onPay?: () => void;
  /** Opens the history screen (every request, paid and expired included); absent, the action is not offered. */
  onHistory?: () => void;
  style?: TStyle;
}

/** One request as the list draws it: what both twins hand `ListRow`, `KeyValueRow` and `IconBubble`. */
export interface PaymentRequestRow {
  id: string;
  state: 'pending' | 'paid' | 'expired';
  listRow: {
    title: string;
    subtitle: string;
    padding: 'lg';
    accessibilityRole: 'button';
    onPress: () => void;
  };
  /** The trailing state, for a `KeyValueRow` with no label. */
  trailing: { label: ''; value: string; valueTone: 'primary' | 'success' | 'secondary' };
  /** The leading mark, minus the platform's glyph module. */
  bubble: { size: 40; shape: 'rounded'; tone: 'accent-tint'; iconWeight: 'bold' };
}

/**
 * The list of requests with the sheet that opens one — the block the tab
 * (pending only) and the history screen (everything) both draw.
 */
export interface PaymentRequestListPropsBase<TStyle> extends Testable {
  rows: readonly PaymentRequestRow[];
  empty: { title: string; body: string };
  sheet: Omit<PaymentRequestSheetPropsBase<TStyle>, 'style' | 'testID'>;
  style?: TStyle;
}

/** The history screen: every request this account made on this device, newest first. */
export interface PaymentsHistoryPropsBase<TStyle> extends Testable {
  publicKey: string;
  networkId: string | null;
  onBack: () => void;
  style?: TStyle;
}

/** The ask form's blocks, composed once in shared; both twins spread them. */
export interface PaymentsFormView {
  amountLabel: string;
  amountCard: {
    value: string;
    onChangeValue: (value: string) => void;
    placeholder: string;
    subtext: string;
  };
  noteLabel: string;
  noteField: {
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
    maxLength: number;
    error?: string;
  };
  expiryLabel: string;
  expiryChips: {
    options: { key: string; label: string }[];
    value: string;
    onChange: (key: string) => void;
    size: 'md';
    fill: true;
    variant: 'outline';
  };
  createButton: { onPress: () => void; disabled: boolean; loading: boolean; label: string };
  /** A create that failed: a `KeyValueRow` with no label, in the danger ink. */
  errorRow?: { label: ''; value: string; valueTone: 'danger' };
}

export interface PaymentsAskSheetPropsBase<TStyle> extends Testable {
  visible: boolean;
  onClose: () => void;
  title: string;
  form: PaymentsFormView;
  style?: TStyle;
  /** Rendered inside the sheet: the request sheet a create opens, as this sheet's child. */
  children?: ReactNode;
}

/** What the sheet shows about one request, derived once in shared. */
export interface PaymentRequestStatusView {
  state: 'pending' | 'paid' | 'expired';
  /** For / Expires in / Status / Paid by / Paid — already translated. */
  rows: readonly FactsCardRow[];
  /** The settling signature, when paid. */
  signature?: string;
  /** What the explorer button takes, when paid. */
  explorer?: { txHash: string; blockchain: 'SOLANA'; environment: NetworkEnvironment };
  /** The last poll failed; what is shown is the last known state. */
  checkFailed: boolean;
}

export interface PaymentRequestSheetPropsBase<TStyle> extends Testable {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** The encoded transfer request the code carries; empty while nothing is open. */
  uri: string;
  /** The code and the copy control show only while the request can still be paid. */
  showCode: boolean;
  /** The amount line, already formatted with its symbol. */
  amountLabel: string;
  status: PaymentRequestStatusView | null;
  checkFailedNotice?: string;
  copyButton: { onPress: () => void; label: string };
  removeButton: { onPress: () => void; label: string };
  style?: TStyle;
}
