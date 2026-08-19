import type { CSSProperties } from 'react';
import type { TransactionDetailModalPropsBase } from '@salmon/shared';

// Re-export Transaction for consumers
export type { Transaction } from '@salmon/shared';

/**
 * Props for the TransactionDetailModal component (Web/Extension)
 */
export interface TransactionDetailModalProps extends TransactionDetailModalPropsBase<CSSProperties> {
  /** Additional CSS class for the dialog */
  className?: string;
  /**
   * Active network ID (e.g. 'solana-mainnet', 'bitcoin-testnet') used to pick
   * the right block explorer. Falls back to Solana mainnet when omitted.
   */
  networkId?: string | null;
}
