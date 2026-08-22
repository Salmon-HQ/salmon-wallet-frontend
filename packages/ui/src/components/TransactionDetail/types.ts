import type { CSSProperties } from 'react';
import type { TransactionDetailModalPropsBase } from '@salmon/shared';

// Re-export Transaction for consumers
export type { Transaction } from '@salmon/shared';

/**
 * Props for the TransactionDetail component (Web/Extension).
 *
 * The detail is a step inside the activity surface, not a surface of its own,
 * so it owns no visibility: the page that shows it decides when it is on
 * screen (DESIGN.md §The sink and the float — the transition verb).
 */
export interface TransactionDetailProps extends Omit<
  TransactionDetailModalPropsBase<CSSProperties>,
  'visible' | 'onClose'
> {
  /** Additional CSS class for the step container */
  className?: string;
  /**
   * Active network ID (e.g. 'solana-mainnet', 'bitcoin-testnet') used to pick
   * the right block explorer. Falls back to Solana mainnet when omitted.
   */
  networkId?: string | null;
}
