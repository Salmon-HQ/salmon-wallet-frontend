import type { ViewStyle } from 'react-native';
import type { TransactionDetailModalPropsBase } from '@salmon/shared';

// Re-export Transaction for consumers
export type { Transaction } from '@salmon/shared';

/**
 * Props for the TransactionDetail component (React Native).
 *
 * The detail is a step inside the activity sheet, not a sheet of its own, so
 * it owns no visibility: the surface that shows it decides when it is on
 * screen (DESIGN.md §The sink and the float — the transition verb).
 */
export interface TransactionDetailProps extends Omit<
  TransactionDetailModalPropsBase<ViewStyle>,
  'visible' | 'onClose'
> {
  /**
   * Active network ID (e.g. 'solana-mainnet', 'bitcoin-testnet') used to pick
   * the right block explorer. Falls back to Solana mainnet when omitted.
   */
  networkId?: string | null;
}
