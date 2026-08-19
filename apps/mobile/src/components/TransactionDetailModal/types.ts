import type { ViewStyle } from 'react-native';
import type { TransactionDetailModalPropsBase } from '@salmon/shared';

// Re-export Transaction for consumers
export type { Transaction } from '@salmon/shared';

/**
 * Props for the TransactionDetailModal component (React Native)
 */
export interface TransactionDetailModalProps extends TransactionDetailModalPropsBase<ViewStyle> {
  /**
   * Active network ID (e.g. 'solana-mainnet', 'bitcoin-testnet') used to pick
   * the right block explorer. Falls back to Solana mainnet when omitted.
   */
  networkId?: string | null;
}
