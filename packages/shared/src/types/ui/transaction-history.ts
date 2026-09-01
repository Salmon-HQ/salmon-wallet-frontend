import type { Transaction } from '../index';

/**
 * Props for TransactionItem component (base - platform-agnostic)
 */
export interface TransactionItemPropsBase<TStyle> {
  /** Transaction data */
  transaction: Transaction;
  /** Press handler */
  onPress?: (transaction: Transaction) => void;
  /** Whether to hide balance values */
  hiddenBalance?: boolean;
  /** Custom styles */
  style?: TStyle;
}
