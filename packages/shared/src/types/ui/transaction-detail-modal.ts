import type { Transaction } from '../index';

/**
 * Props for the TransactionDetail component (base — platform-agnostic).
 *
 * The detail itself owns no visibility: the surface that shows it (a sheet,
 * a modal) decides when it is on screen, so this contract carries only what
 * the detail actually renders — no `visible`/`onClose`.
 */
export interface TransactionDetailPropsBase<TStyle> {
  /** Transaction to display details for */
  transaction: Transaction | null;
  /** Callback when "View on Explorer" is triggered */
  onViewExplorer?: (transaction: Transaction) => void;
  /** Callback when the transaction hash is copied */
  onCopyHash?: (hash: string) => void;
  /** Callback when the share action is triggered */
  onShare?: (transaction: Transaction) => void;
  /** Optional custom styles */
  style?: TStyle;
}
