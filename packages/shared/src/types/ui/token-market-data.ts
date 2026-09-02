import type { Testable } from './testable';

/**
 * Market data for a token
 */
export interface MarketData {
  /** Current price in USD */
  currentPrice?: number;
  /** Market capitalization in USD */
  marketCap?: number;
  /** Market cap rank */
  marketCapRank?: number | null;
  /** 24-hour trading volume in USD */
  volume24h?: number;
  /** 24h high price */
  high24h?: number;
  /** 24h low price */
  low24h?: number;
  /** Circulating supply */
  circulatingSupply?: number;
  /** Total supply */
  totalSupply?: number | null;
  /** Maximum supply (if applicable) */
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
 * The "Market data" card of a token's detail screen — a `Card` of
 * `KeyValueRow`s. Mobile's `MarketDataCard` and the DOM's `TokenMarketData`
 * read this one shape; no `data` renders nothing, `loading` renders the
 * skeleton.
 */
export interface TokenMarketDataPropsBase extends Testable {
  data: MarketData | undefined;
  /** Token symbol appended to the supply rows (e.g. "BTC", "SOL") */
  symbol?: string;
  loading?: boolean;
}
