import type { SwapReviewExchangeSide } from '../swap';

/**
 * Props for the unified TransactionSuccessScreen component.
 *
 * Used by both send and swap flows on mobile and extension.
 */
export interface TransactionSuccessScreenProps {
  /**
   * Exchange graphic for swap receipts: sent logo → arrow → received logo
   * with amounts, the received side one rank up. When present it replaces
   * the plain `summary` line as the hero; `summary` still feeds the pending
   * loader's subtitle.
   */
  exchange?: {
    send: SwapReviewExchangeSide;
    receive: SwapReviewExchangeSide;
  };
  /** Effective rate line for the receipt (e.g., "1 USDC ≈ 0.0127 SOL") */
  exchangeRate?: string;
  /** Salmon fee as shown at review (e.g., "0.85%"), when the flow has it */
  exchangeFee?: string;
  /** Screen title (e.g., "Send Complete", "Swap Complete") */
  title: string;
  /** Transaction summary (e.g., "5.0 SOL to 7hQ9...xK2f" or "5.0 SOL → 84.65 USDC") */
  summary: string;
  /** Pre-built explorer URL for the transaction, null if unavailable */
  explorerUrl: string | null;
  /** Callback when user taps "Continue" to navigate home */
  onContinue: () => void;
  /**
   * True while the same-chain settlement is still waiting for the indexer to
   * reflect the new balance. When set, the success screen is replaced by the
   * full-screen loader so the user cannot return home to a stale balance.
   */
  settling?: boolean;
  /**
   * Title shown by the loader while `settling` is true (e.g., "Processing
   * swap"). Falls back to `title` when omitted. Keep the wording distinct
   * from the success title — e2e flows wait on the success text to know the
   * transaction has settled.
   */
  pendingTitle?: string;
}
