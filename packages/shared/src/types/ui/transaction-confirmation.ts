/**
 * Core's confirmation screen — the one screen every Powerup proposal is
 * signed from (spec 027 §2). Rendered by the platform host from
 * `useSignatureRequestHost()`; one contract, two twins.
 */
import type { ConfirmationRow, ProposalDisplay } from '../../core/confirmation/types';
import type { ExchangeSide } from '../../core/confirmation/types';

/** The grouped detail rows; advanced rows fold behind a "Details" disclosure. */
export interface ConfirmationDetailsCardPropsBase<TStyle> {
  rows: ConfirmationRow[];
  advancedRows?: ConfirmationRow[];
  style?: TStyle;
}

/** Sent logo → arrow → received logo, amounts and USD values underneath. */
export interface ConfirmationExchangePropsBase<TStyle> {
  send: ExchangeSide;
  receive: ExchangeSide;
  style?: TStyle;
}

/** Who asks: icon (or the globe), name, and the domain the user can check (spec 043). */
export interface RequesterRowPropsBase {
  name?: string;
  icon?: string | null;
  domain: string;
  testID?: string;
}

/**
 * The requester's icon when it may be drawn: an `https:` address only. An
 * `http:` icon is valid by the standard but never loaded, so a network on the
 * way cannot swap it.
 */
export function requesterIconSource(icon: string | null | undefined): string | null {
  return icon?.startsWith('https:') ? icon : null;
}

export interface TransactionConfirmationPropsBase<TStyle> {
  display: ProposalDisplay;
  /**
   * Who asks, drawn as an identity row above the details (a Solana Pay
   * merchant). Absent, the screen is exactly the Powerup one.
   */
  requester?: { name: string; icon?: string | null; domain: string };
  onBack: () => void;
  onConfirm: () => void;
  /** The confirm control's label: countdown, or "Refresh Quote" once expired */
  confirmLabel: string;
  /** A rebuild is in flight: the values a fresh quote can change say so */
  isRefreshing?: boolean;
  /** The review is not ready to confirm (a dApp preview still running or unreadable) */
  confirmDisabled?: boolean;
  /** Confirm must be held, not tapped (the dApp approval hold cases) */
  requiresHold?: boolean;
  /** The last signing failure, a translation key, drawn on the screen */
  error?: string | null;
  style?: TStyle;
}
