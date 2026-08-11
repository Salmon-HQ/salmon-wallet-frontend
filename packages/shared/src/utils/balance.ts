// ============================================================================
// Types
// ============================================================================

/**
 * Token balance with metadata
 */
export interface TokenBalance {
  /** Token mint address */
  mint: string;
  /** Owner wallet address */
  owner: string;
  /** Raw balance amount */
  amount: string | number;
  /** Token decimals */
  decimals: number;
  /** Human-readable balance */
  uiAmount: number;
  /** Token symbol (e.g., 'SOL', 'USDC') */
  symbol: string;
  /** Token name */
  name: string;
  /** Token logo URL */
  logo?: string;
  /** Token address (same as mint) */
  address: string;
  /** CoinGecko ID for price lookups */
  coingeckoId?: string;
  /** Token tags */
  tags?: string[];
  /** Token program */
  program?: string;
  /** Token-2022 extensions */
  extensions?: unknown[];
}

/**
 * Token balance with price information
 */
export interface TokenBalanceWithPrice extends TokenBalance {
  /** Current price in USD */
  price?: number;
  /** Balance value in USD */
  usdBalance?: number;
  /** 24h price change percentage */
  priceChange24h?: number;
}

/**
 * Complete wallet balance response
 */
export interface WalletBalance {
  /** Total USD value of all tokens */
  usdTotal?: number;
  /** 24h change in USD */
  last24HoursChange?: number;
  /** 24h change percentage */
  last24HoursChangePercent?: number;
  /** List of token balances */
  items: TokenBalanceWithPrice[];
}

// ============================================================================
// Constants
// ============================================================================

/** SOL token constants */
export const SOL_CONSTANTS = {
  DECIMALS: 9,
  SYMBOL: 'SOL',
  NAME: 'Solana',
  LOGO: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',
  ADDRESS: 'So11111111111111111111111111111111111111112',
  COINGECKO_ID: 'solana',
  TAGS: ['community', 'moonshot-verified', 'strict', 'verified', 'major'] as string[],
} as const;

/** Lamports per SOL */
export const LAMPORTS_PER_SOL = 1_000_000_000;

// ============================================================================
// Bigint Balance Helpers
// ============================================================================

/**
 * Check if a balance is zero
 *
 * @param balance - Balance to check
 * @returns True if balance is zero
 */
export function isZeroBalance(balance: bigint): boolean {
  return balance === 0n;
}

/**
 * Compare two balances
 *
 * @param a - First balance
 * @param b - Second balance
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareBalances(a: bigint, b: bigint): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
