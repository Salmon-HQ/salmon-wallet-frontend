/**
 * The swap-adjacent types that belong to the core, not to the Swap Powerup:
 * the network alias the token catalogue is keyed on, the token shape the
 * catalogue hook returns, and the exchange graphic the receipt and the
 * confirmation both draw. The Powerup's own contract lives in
 * `powerups/swap/types.ts`.
 */

import type { SolanaNetworkId, BlockchainType } from './blockchain';

/** Network ID for swap operations */
export type SwapNetworkId = SolanaNetworkId;

/** Chain type for swap — alias of the canonical BlockchainType. */
export type SwapChainType = BlockchainType;

/**
 * Token data for swap operations (UI representation)
 */
export interface SwapToken {
  /** Token mint address */
  address: string;
  /** Token symbol (e.g., "SOL", "USDC") */
  symbol: string;
  /** Token name */
  name?: string;
  /** Token decimals */
  decimals: number;
  /** Token logo URL */
  logo?: string;
  /** User's balance of this token */
  balance?: number;
  /** USD price per token */
  usdPrice?: number;
  /** Chain this token belongs to */
  chain?: SwapChainType;
  /** Network ID (e.g., 'solana-mainnet', 'bitcoin-mainnet', 'ethereum-mainnet') */
  networkId?: string;
}

/**
 * One side of the exchange graphic: the token being sent or received.
 */
export interface SwapReviewExchangeSide {
  /** Microcopy above the side (e.g., "You Send", "You Receive (estimated)") */
  label: string;
  /** Token logo URL; the symbol renders as fallback when missing */
  logo?: string;
  /** Token symbol, used for the logo fallback */
  symbol: string;
  /** Amount with symbol (e.g., "0.009 SOL") */
  amount: string;
  /** USD equivalent (e.g., "~$84.65") */
  usdValue?: string;
  /** Whether the amount is being recalculated */
  pendingAmount?: boolean;
  /** Whether the USD equivalent is being recalculated */
  pendingUsdValue?: boolean;
  /**
   * Render this side's amount one rank up (success receipts give the
   * received amount the greater hierarchy).
   */
  emphasis?: boolean;
}

/** The exchange side under the name the core reads. */
export type ExchangeSide = SwapReviewExchangeSide;
