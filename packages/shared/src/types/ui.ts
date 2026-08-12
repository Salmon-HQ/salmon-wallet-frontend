/**
 * Shared UI types for @salmon/shared
 * Used by both mobile (React Native) and extension (React DOM)
 */

// ============================================================================
// Network Types
// ============================================================================

/**
 * Network information for display
 */
export interface NetworkInfo {
  /** Network identifier */
  id: string;
  /** Network display name */
  name: string;
  /** Network logo URL */
  logo?: string;
}

// ============================================================================
// Token Types
// ============================================================================

/**
 * Token data structure representing a cryptocurrency token
 * Base interface used by both mobile and extension
 */
export interface Token {
  /** Unique token address/mint */
  address: string;
  /** Token display name */
  name: string;
  /** Token symbol (e.g., 'SOL', 'ETH') */
  symbol: string;
  /** Token logo URL */
  logo?: string;
  /** Current price per token in USD */
  price?: number;
  /** User's token balance (formatted for display) */
  uiAmount: string | number;
  /** User's token balance in USD */
  usdBalance?: number | null;
  /** 24-hour price change information */
  last24HoursChange?: {
    /** Percentage change */
    perc: number;
    /** Absolute change in USD */
    abs?: number;
  } | null;
  /** Token tags (e.g., 'verified', 'strict', 'community') */
  tags?: string[];
  /** Whether the token is verified (has 'verified' or 'strict' tag) */
  isVerified?: boolean;
  /** CoinGecko ID for fetching market data */
  coingeckoId?: string | null;
}

// ============================================================================
// Price Chart Types
// ============================================================================

/**
 * Time period options for price chart
 *
 * CoinGecko Free Tier (Demo API) limits:
 * - Maximum 365 days of historical data
 * - 1 day = 5-minute intervals
 * - 1-90 days = hourly intervals
 * - 90+ days = daily intervals (00:00 UTC)
 *
 * 'All' requires paid tier for >365 days
 */
export type PriceChartPeriod = '1H' | '1D' | '1W' | '1M' | '3M' | '1Y';
// Future: Add 'All' when upgrading to paid CoinGecko tier
// export type PriceChartPeriod = '1H' | '1D' | '1W' | '1M' | '3M' | '1Y' | 'All';

/**
 * Single data point in price history
 */
export interface PriceDataPoint {
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Price value at this timestamp */
  price: number;
}

/**
 * Available time periods for the chart
 * Based on CoinGecko Free Tier limits (max 365 days)
 */
export const PRICE_CHART_PERIODS: PriceChartPeriod[] = [
  '1H', // Uses 1 day of data with 5-min intervals
  '1D', // 1 day, 5-min intervals
  '1W', // 7 days, hourly intervals
  '1M', // 30 days, hourly intervals
  '3M', // 90 days, hourly intervals
  '1Y', // 365 days, daily intervals
  // 'All', // Requires paid CoinGecko tier for >365 days
];

// ============================================================================
// Loading Screen Types
// ============================================================================

/**
 * Base props for LoadingScreen component (platform-agnostic)
 */
export interface LoadingScreenBaseProps {
  /** Whether the loading screen is visible */
  visible: boolean;
  /** Optional title to display */
  title?: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Custom tips to cycle through (defaults to wallet tips) */
  tips?: string[];
  /** Interval in ms to change tips (default: 4000) */
  tipInterval?: number;
  /** Whether to show tips (default: true) */
  showTips?: boolean;
  /** Custom logo size (default: 100) */
  logoSize?: number;
  /** Custom spinner size (default: 140) */
  spinnerSize?: number;
}

/**
 * Translation key identifiers for loading screen tips.
 * Resolve via t() at render time in LoadingScreen components.
 */
export const DEFAULT_WALLET_TIP_KEYS = [
  'general.tips.0',
  'general.tips.1',
  'general.tips.2',
  'general.tips.3',
  'general.tips.4',
  'general.tips.5',
  'general.tips.6',
  'general.tips.7',
  'general.tips.8',
  'general.tips.9',
] as const;

/** @deprecated Use DEFAULT_WALLET_TIP_KEYS instead */
export const DEFAULT_WALLET_TIPS = DEFAULT_WALLET_TIP_KEYS;

// ============================================================================
// Token Features Types
// ============================================================================

/**
 * Individual token feature/characteristic
 */
export interface TokenFeature {
  /** Feature name (e.g., "Native Token", "DeFi", "Governance") */
  label: string;
  /** Optional icon name */
  icon?: string;
  /** Badge background color (defaults to accent color) */
  color?: string;
}
