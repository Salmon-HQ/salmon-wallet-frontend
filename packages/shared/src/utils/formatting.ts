/**
 * Amount and Currency Formatting Utilities
 * Migrated from salmon-wallet-v2/src/utils/amount.js
 *
 * Provides formatting functions for displaying amounts, percentages,
 * and currency values in the UI.
 */

import round from 'lodash-es/round';
import isNil from 'lodash-es/isNil';
import type { PriceDataPoint } from '../types/ui';

// ============================================================================
// Types
// ============================================================================

/**
 * Label type for percentage values
 */
export type LabelType = 'positive' | 'negative' | 'neutral';

/**
 * Currency information for formatting
 */
export interface Currency {
  /** Number of decimal places for the currency */
  decimals: number;
  /** Currency symbol (e.g., 'SOL', 'ETH', 'BTC') */
  symbol: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Placeholder string for hidden/masked values
 *
 * @example
 * ```typescript
 * const displayValue = isPrivacyMode ? hiddenValue : showAmount(100);
 * // isPrivacyMode=true  -> '·······'
 * // isPrivacyMode=false -> '$100.00'
 * ```
 */
export const hiddenValue = '·······';

// ============================================================================
// Amount Formatting Functions
// ============================================================================

/**
 * Formats a numeric amount with a specified number of decimals
 *
 * @param amount - The raw amount to format
 * @param decimals - Number of decimal places
 * @returns Formatted amount string
 *
 * @example
 * ```typescript
 * formatAmount(1234567890, 9)  // '1.23456789'
 * formatAmount(100000000, 8)   // '1'
 * formatAmount(50000000, 8)    // '0.5'
 * ```
 */
export function formatAmount(amount: number, decimals: number): string {
  const divisor = Math.pow(10, decimals);
  const result = amount / divisor;
  return result.toString();
}

/**
 * Formats a base-unit amount exactly, with no floating point anywhere.
 *
 * `formatAmount` divides through a `number` and loses precision above
 * 2^53 — a real range for u64 token amounts. On a screen where the figure is
 * the reason the user is deciding, a rounded amount is a wrong amount, so this
 * splits the integer digits with string arithmetic instead.
 *
 * The sign is dropped: the magnitude is returned, and the caller supplies the
 * `+`/`−` glyph so direction is a channel of its own.
 *
 * @param amount - Amount in the mint's base units. Sign is ignored.
 * @param decimals - The mint's decimals.
 * @returns The magnitude, with trailing fractional zeros trimmed.
 *
 * @example
 * ```typescript
 * formatBaseUnits(1_500_000_000n, 9)  // '1.5'
 * formatBaseUnits(-2_000_000n, 6)     // '2'
 * formatBaseUnits(1n, 9)              // '0.000000001'
 * ```
 */
export function formatBaseUnits(amount: bigint, decimals: number): string {
  const magnitude = amount < 0n ? -amount : amount;
  if (decimals <= 0) return magnitude.toString();

  const digits = magnitude.toString().padStart(decimals + 1, '0');
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = digits.slice(digits.length - decimals).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}

/**
 * Formats an amount as a USD dollar value
 *
 * @deprecated Use `formatFiatValue` from `currencyFormatting` for multi-currency support.
 *
 * @param amount - The amount to format (can be null or undefined)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with dollar sign, or '-' if amount is nil
 */
export function showAmount(amount: number | null | undefined, decimals: number = 2): string {
  return !isNil(amount) ? `$${round(amount, decimals).toFixed(decimals)}` : '-';
}

/**
 * Formats a numeric value with a specified number of decimals (without currency symbol)
 *
 * @param amount - The amount to format (can be null or undefined)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string, or '-' if amount is nil
 *
 * @example
 * ```typescript
 * showValue(100.567)       // '100.57'
 * showValue(100.567, 4)    // '100.5670'
 * showValue(null)          // '-'
 * showValue(undefined)     // '-'
 * showValue(0)             // '0.00'
 * ```
 */
export function showValue(amount: number | null | undefined, decimals: number = 2): string {
  return !isNil(amount) ? `${round(amount, decimals).toFixed(decimals)}` : '-';
}

// ============================================================================
// Percentage Functions
// ============================================================================

/**
 * Checks if a percentage value is positive (greater than zero)
 *
 * @param perc - The percentage value to check
 * @returns True if the percentage is positive
 *
 * @example
 * ```typescript
 * isPositive(5.5)   // true
 * isPositive(0)     // false
 * isPositive(-3.2)  // false
 * ```
 */
export function isPositive(perc: number): boolean {
  return perc > 0;
}

/**
 * Checks if a percentage value is negative (less than zero)
 *
 * @param perc - The percentage value to check
 * @returns True if the percentage is negative
 *
 * @example
 * ```typescript
 * isNegative(-5.5)  // true
 * isNegative(0)     // false
 * isNegative(3.2)   // false
 * ```
 */
export function isNegative(perc: number): boolean {
  return perc < 0;
}

/**
 * Checks if a percentage value is neutral (zero or falsy)
 *
 * @param perc - The percentage value to check
 * @returns True if the percentage is neutral (zero, null, undefined, or NaN)
 *
 * @example
 * ```typescript
 * isNeutral(0)         // true
 * isNeutral(5)         // false
 * isNeutral(-5)        // false
 * isNeutral(NaN)       // true
 * isNeutral(undefined) // true (when called with undefined)
 * ```
 */
export function isNeutral(perc: number | null | undefined): boolean {
  return !perc;
}

/**
 * Returns a label type based on whether the percentage is positive, negative, or neutral
 *
 * @param perc - The percentage value to evaluate
 * @returns Label type: 'positive', 'negative', or 'neutral'
 *
 * @example
 * ```typescript
 * getLabelValue(5.5)   // 'positive'
 * getLabelValue(-3.2)  // 'negative'
 * getLabelValue(0)     // 'neutral'
 *
 * // Useful for applying conditional styles
 * const labelType = getLabelValue(priceChange);
 * // Use labelType to apply appropriate CSS class or color
 * ```
 */
export function getLabelValue(perc: number): LabelType {
  if (isPositive(perc)) {
    return 'positive';
  } else if (isNegative(perc)) {
    return 'negative';
  }
  return 'neutral';
}

/**
 * Formats a percentage value for display with sign and percentage symbol
 *
 * @param perc - The percentage value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string with sign and % symbol
 *
 * @example
 * ```typescript
 * showPercentage(5.567)       // '+5.57 %'
 * showPercentage(-3.214)      // '-3.21 %'
 * showPercentage(0)           // '0.00 %'
 * showPercentage(5.567, 1)    // '+5.6 %'
 * showPercentage(NaN)         // '0.00 %'
 * ```
 */
export function showPercentage(perc: number, decimals: number = 2): string {
  const val = round(isNaN(perc) ? 0 : perc, decimals).toFixed(decimals);
  if (isPositive(perc)) {
    return `+${val} %`;
  } else if (isNegative(perc)) {
    return `${val} %`;
  }
  return `${val} %`;
}

// ============================================================================
// Currency Formatting Functions
// ============================================================================

/**
 * Formats an amount with its currency symbol
 *
 * @param amount - The raw amount to format (in smallest unit, e.g., lamports)
 * @param currency - Currency object containing decimals and symbol
 * @returns Formatted string with amount and currency symbol
 *
 * @example
 * ```typescript
 * const solana: Currency = { decimals: 9, symbol: 'SOL' };
 * formatCurrency(1500000000, solana)  // '1.5 SOL'
 *
 * const usdc: Currency = { decimals: 6, symbol: 'USDC' };
 * formatCurrency(1000000, usdc)       // '1 USDC'
 *
 * const btc: Currency = { decimals: 8, symbol: 'BTC' };
 * formatCurrency(100000000, btc)      // '1 BTC'
 * ```
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const { decimals, symbol } = currency;
  return `${formatAmount(amount, decimals)} ${symbol}`;
}

/**
 * Formats an absolute price change with sign and dollar symbol
 *
 * @deprecated Use `formatFiatChange` from `currencyFormatting` for multi-currency support.
 *
 * @param absChange - The absolute change value (can be null or undefined)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with sign and dollar symbol, or null if absChange is nil
 */
export function showAbsoluteChange(
  absChange: number | null | undefined,
  decimals: number = 2
): string | null {
  if (isNil(absChange)) {
    return null;
  }
  const val = round(Math.abs(absChange), decimals).toFixed(decimals);
  if (isPositive(absChange)) {
    return `+$${val}`;
  } else if (isNegative(absChange)) {
    return `-$${val}`;
  }
  return `$${val}`;
}

// ============================================================================
// Large Number & Display Formatting
// ============================================================================

export function formatLargeNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toLocaleString();
}

/** @deprecated Use `formatFiatLarge` from `currencyFormatting` for multi-currency support. */
export function formatUSD(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-';
  return `$${formatLargeNumber(value)}`;
}

/**
 * Format a raw blockchain amount (in smallest units like lamports/wei)
 * with smart precision and K/M suffixes.
 * Different from formatAmount() which returns a simple string.
 */
export function formatRawAmount(
  amount: string | number,
  decimals: number,
  minThreshold: number = 0.000001
): string {
  const rawAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(rawAmount)) return '0';

  const safeDecimals = typeof decimals === 'number' && !isNaN(decimals) ? decimals : 0;
  const formattedAmount = rawAmount / Math.pow(10, safeDecimals);

  if (formattedAmount === 0) return '0';
  if (formattedAmount < minThreshold) return `<${minThreshold}`;
  if (formattedAmount >= 1000000) return `${(formattedAmount / 1000000).toFixed(2)}M`;
  if (formattedAmount >= 1000) return `${(formattedAmount / 1000).toFixed(2)}K`;
  if (formattedAmount >= 1) return formattedAmount.toFixed(4).replace(/\.?0+$/, '');

  return formattedAmount.toFixed(6).replace(/\.?0+$/, '');
}

export function formatTokenBalance(
  value: number | undefined | null,
  decimals: number = 10
): string {
  if (value === undefined || value === null) return '0';
  if (value === 0) return '0';
  return value.toFixed(decimals).replace(/\.?0+$/, '');
}

/** @deprecated Use `formatFiatPrecise` from `currencyFormatting` for multi-currency support. */
export function formatUsdPrecise(value: number | undefined | null, decimals: number = 4): string {
  if (value === undefined || value === null) return (0).toFixed(decimals);
  return value.toFixed(decimals);
}

export function formatAmountWithSymbol(
  amount: string | number,
  symbol: string,
  decimals: number = 8
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return `0 ${symbol}`;
  const formatted = numAmount.toFixed(decimals).replace(/\.?0+$/, '');
  return `${formatted} ${symbol}`;
}

export function formatPercentageCompact(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatSolFee(lamports: number): string {
  const sol = lamports / 1_000_000_000;
  return `${sol.toFixed(7).replace(/\.?0+$/, '')} SOL`;
}

export function formatConversionRate(rate: string): string {
  const numericRate = parseFloat(rate);
  if (isNaN(numericRate) || numericRate === 0) return '0';
  if (numericRate < 0.0001) return '<0.0001';
  if (numericRate >= 1000) {
    const kValue = numericRate / 1000;
    return `${kValue.toFixed(2).replace(/\.?0+$/, '')}K`;
  }
  return numericRate.toFixed(4).replace(/\.?0+$/, '');
}

/**
 * Format balance for display
 *
 * @param amount - Balance amount
 * @param decimals - Number of decimal places to show
 * @returns Formatted balance string
 */
export function formatBalance(amount: number, decimals: number = 4): string {
  if (amount === 0) return '0';

  if (amount < 0.0001) {
    return '<0.0001';
  }

  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M`;
  }

  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(2)}K`;
  }

  return amount.toFixed(decimals);
}

/**
 * Format USD value for display
 *
 * @deprecated Use `formatFiatValue` from `currencyFormatting` for multi-currency support.
 *
 * @param amount - USD amount
 * @returns Formatted USD string
 */
export function formatUsdValue(amount: number | undefined): string {
  if (amount === undefined || amount === null) {
    return '-';
  }

  if (amount === 0) {
    return '$0.00';
  }

  if (amount < 0.01) {
    return '<$0.01';
  }

  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  }

  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(2)}K`;
  }

  return `$${amount.toFixed(2)}`;
}

/**
 * Format percentage change
 *
 * @param percent - Percentage value
 * @returns Formatted percentage string with sign
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatPercentChange(percent: number | undefined): string {
  if (percent === undefined || percent === null) {
    return '-';
  }

  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

// ============================================================================
// Price Impact Severity
// ============================================================================

export type PriceImpactSeverity = 'safe' | 'warning' | 'high';

export const PRICE_IMPACT_THRESHOLDS = {
  safe: 0.5,
  warning: 1,
} as const;

/**
 * Returns the severity level for a price impact percentage string.
 */
export function getPriceImpactSeverity(value: string): PriceImpactSeverity {
  const numericValue = parseFloat(value);
  if (isNaN(numericValue) || numericValue < PRICE_IMPACT_THRESHOLDS.safe) return 'safe';
  if (numericValue <= PRICE_IMPACT_THRESHOLDS.warning) return 'warning';
  return 'high';
}

// ============================================================================
// Price Performance
// ============================================================================

/**
 * Returns true if the last data point's price is >= the first's.
 */
export function isPositivePerformance(data: PriceDataPoint[]): boolean {
  if (data.length < 2) return true;
  return data[data.length - 1].price >= data[0].price;
}
