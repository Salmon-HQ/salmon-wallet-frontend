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
  /**
   * Whether to cycle wallet tips at the bottom (default: **true**).
   *
   * _Reversal._ The default was `false`, and the argument for it was that a
   * caution belongs before the decision it guards: "always check the
   * transaction details before signing" on the screen that *follows* signing
   * teaches the user to skip security copy. Tips were opt-in, and only unlock
   * and wallet creation/recovery opted in.
   *
   * The owner reversed it: the tips are shown on every wait, on both
   * platforms. A wait is the one screen with nothing else to read, and a wait
   * that speaks only its own title is the bare screen DESIGN.md §The wait
   * already refused once when the wave was made unconditional. The prop
   * survives so a surface with a reason to suppress them still can — it is
   * the exception now, not the rule.
   */
  showTips?: boolean;
  /** Custom logo size (default: 100) */
  logoSize?: number;
  /** Custom spinner size (default: 140) */
  spinnerSize?: number;
  /**
   * Emit the wave — the mark pulses, every pulse launches a front, and the
   * screen's contents are displaced as the front reaches them, each with a
   * delay proportional to its distance from the mark (default: **`true`**).
   *
   * _Reversal, 2026-08._ This was `false`, and the transaction wait was the only
   * caller that passed it, on the argument that a boot or a key derivation has
   * nothing in the air and so deserves no choreography. Product then hit the
   * account-recovery wait and found it bare — a title over an empty screen while
   * the app does the single most consequential thing it will ever do with the
   * user's keys. Every wait is water now; the prop survives so a surface that
   * must show nothing living through itself can still opt out, which on the DOM
   * is what `bedrock` does.
   *
   * The origin is the centre of **whatever the wait occupies**, measured, not
   * the centre of the viewport — a wait rendered into a panel gets its own
   * centre with no special case.
   *
   * It **loops for as long as the wait lasts** and stops on a closing wave that
   * carries the screen off — see `onExited`. Nothing accumulates across the
   * loop: the emission is one compositor animation per element (`infinite` on
   * the DOM, `withRepeat(-1)` on the UI thread in React Native), not a timer.
   */
  waves?: boolean;
  /**
   * Called once the closing wave has left the screen, `wavefrontExitMs()` after
   * `visible` goes false. This is the handoff: a caller that must not show the
   * next screen until the water is empty keeps this one mounted until it fires.
   *
   * The duration is fixed and does not wait out the pulse in flight — a wallet
   * may not put a whole `pulseCycle` between a decision and its receipt — and
   * under reduce motion it collapses to `ebb`.
   */
  onExited?: () => void;
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
