/**
 * Price-related domain types.
 *
 * Previously defined in api/services/price.ts.
 *
 * @module types/price
 */

// ============================================================================
// Chart & market data
// ============================================================================

/**
 * Market chart response data.
 */
export interface MarketChartData {
  /** Price data points [timestamp, price][] */
  prices: [number, number][];
  /** Market cap data points [timestamp, market_cap][] */
  marketCaps: [number, number][];
  /** Volume data points [timestamp, volume][] */
  totalVolumes: [number, number][];
}

/**
 * Market data for a coin.
 */
export interface CoinMarketData {
  /** Current price in USD */
  currentPrice?: number;
  /** 24h price change in USD */
  priceChange24h?: number;
  /** 24h price change percentage */
  priceChangePercentage24h?: number;
  /** Market capitalization */
  marketCap?: number;
  /** Market cap rank */
  marketCapRank?: number | null;
  /** 24h trading volume */
  totalVolume?: number;
  /** 24h high price */
  high24h?: number;
  /** 24h low price */
  low24h?: number;
  /** Circulating supply */
  circulatingSupply?: number;
  /** Total supply */
  totalSupply?: number | null;
  /** Maximum supply */
  maxSupply?: number | null;
  /** All-time high price */
  ath?: number;
  /** ATH change percentage */
  athChangePercentage?: number;
  /** ATH date */
  athDate?: string;
  /** All-time low price */
  atl?: number;
  /** ATL change percentage */
  atlChangePercentage?: number;
  /** ATL date */
  atlDate?: string;
}

/**
 * Links associated with a coin.
 */
export interface CoinLinks {
  /** Project homepage URL */
  homepage?: string;
  /** Twitter/X handle or URL */
  twitter?: string;
}

/**
 * Detailed coin information.
 */
export interface CoinInfo {
  /** Coin ID */
  id: string;
  /** Coin symbol */
  symbol: string;
  /** Coin name */
  name: string;
  /** Description text */
  description?: string;
  /** Image URL */
  image?: string;
  /** Market data */
  marketData?: CoinMarketData;
  /** Links */
  links?: CoinLinks;
}
