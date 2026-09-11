import type { KeyValueRowPropsBase } from './key-value-row';
import type { SwapReviewExchangeSide } from '../swap';

export interface ReceiptScreenAction {
  label: string;
  onPress: () => void;
  testID?: string;
}

export interface TransferReceiptScreenPropsBase {
  tone: 'transfer';
  title: string;
  body?: string;
  rows: KeyValueRowPropsBase[];
  primary: ReceiptScreenAction;
  secondary?: ReceiptScreenAction;
  explorerUrl?: string;
  settling?: boolean;
  testID?: string;
}

/** The graphic receipt an exchange renders: token-mark hero, arrow, rate/fee block. */
export interface ExchangeReceiptScreenPropsBase {
  tone: 'exchange';
  /**
   * Sent logo → arrow → received logo with amounts, the received side one
   * rank up. When present it replaces the plain `summary` line as the hero;
   * `summary` still feeds the pending loader's subtitle.
   */
  exchange?: {
    send: SwapReviewExchangeSide;
    receive: SwapReviewExchangeSide;
  };
  /** Effective rate line (e.g., "1 USDC ≈ 0.0127 SOL") */
  exchangeRate?: string;
  /** Salmon fee as shown at review (e.g., "0.85%"), when the flow has it */
  exchangeFee?: string;
  title: string;
  /** Transaction summary (e.g., "5.0 SOL → 84.65 USDC") */
  summary: string;
  /** Pre-built explorer URL for the transaction, null if unavailable */
  explorerUrl: string | null;
  onContinue: () => void;
  /**
   * True while the same-chain settlement is still waiting for the indexer to
   * reflect the new balance. When set, the receipt is replaced by the
   * full-screen loader so the user cannot return home to a stale balance.
   */
  settling?: boolean;
  /**
   * Title shown by the loader while `settling` is true. Falls back to
   * `title` when omitted. Keep the wording distinct from the success title —
   * e2e flows wait on the success text to know the transaction has settled.
   */
  pendingTitle?: string;
}

export type ReceiptScreenPropsBase =
  TransferReceiptScreenPropsBase | ExchangeReceiptScreenPropsBase;
