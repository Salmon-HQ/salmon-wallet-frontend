import type { CSSProperties } from 'react';
import type { TransactionDetailPropsBase } from '@salmon/shared';

// Re-export the transaction shapes the detail's variant files consume
export type {
  NftAttribute,
  SwapConversionRate,
  Transaction,
  TransactionTokenAmount,
} from '@salmon/shared';

/**
 * Props for the TransactionDetail component (DOM).
 *
 * The detail is the content of a sheet over the Activity screen, not a sheet
 * of its own, so it owns no visibility: the surface that shows it decides
 * when it is on screen.
 */
export interface TransactionDetailProps extends TransactionDetailPropsBase<CSSProperties> {
  /** Additional CSS class for the container */
  className?: string;
  /**
   * Active network ID (e.g. 'solana-mainnet', 'bitcoin-testnet') used to pick
   * the right block explorer. Falls back to Solana mainnet when omitted.
   */
  networkId?: string | null;
}
