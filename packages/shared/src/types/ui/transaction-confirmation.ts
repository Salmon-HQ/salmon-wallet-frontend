/**
 * Core's confirmation screen — the one screen every Powerup proposal is
 * signed from (spec 027 §2). Rendered by the platform host from
 * `useSignatureRequestHost()`; one contract, two twins.
 */
import type { ConfirmationRow, ProposalDisplay } from '../../core/confirmation/types';
import type { SwapReviewExchangeSide } from '../swap';

/** The grouped detail rows; advanced rows fold behind a "Details" disclosure. */
export interface ConfirmationDetailsCardPropsBase<TStyle> {
  rows: ConfirmationRow[];
  advancedRows?: ConfirmationRow[];
  style?: TStyle;
}

/** Sent logo → arrow → received logo, amounts and USD values underneath. */
export interface ConfirmationExchangePropsBase<TStyle> {
  send: SwapReviewExchangeSide;
  receive: SwapReviewExchangeSide;
  style?: TStyle;
}

export interface TransactionConfirmationPropsBase<TStyle> {
  display: ProposalDisplay;
  onBack: () => void;
  onConfirm: () => void;
  /** The confirm control's label: countdown, or "Refresh Quote" once expired */
  confirmLabel: string;
  /** A rebuild is in flight: the values a fresh quote can change say so */
  isRefreshing?: boolean;
  /** The last signing failure, a translation key, drawn on the screen */
  error?: string | null;
  /** The proposal's network: its data provider's credit is drawn under the details */
  networkId?: string | null;
  style?: TStyle;
}
