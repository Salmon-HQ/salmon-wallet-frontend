/**
 * Currency Formatting Utilities
 *
 * Pure functions for formatting fiat values in any supported currency.
 * All accept a USD amount + currency code + exchange rate and produce
 * locale-appropriate strings.
 *
 * @module utils/currencyFormatting
 */

import round from 'lodash-es/round';
import isNil from 'lodash-es/isNil';
import { CURRENCY_MAP, type CurrencyCode } from '../types/currency';

// ============================================================================
// Helpers
// ============================================================================

function convert(usdAmount: number, rate: number): number {
  return usdAmount * rate;
}

function getDecimals(code: CurrencyCode): number {
  return CURRENCY_MAP[code]?.decimals ?? 2;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get the symbol for a currency code.
 *
 * @example getCurrencySymbol('eur') // '€'
 */
export function getCurrencySymbol(code: CurrencyCode): string {
  return CURRENCY_MAP[code]?.symbol ?? '$';
}

/**
 * Get the uppercase label for a currency code.
 *
 * @example getCurrencyLabel('eur') // 'EUR'
 */
export function getCurrencyLabel(code: CurrencyCode): string {
  return code.toUpperCase();
}

/**
 * Format a USD amount as a fiat value with symbol.
 * Replaces `showAmount`.
 *
 * @example formatFiatValue(100.567, 'eur', 0.925) // '€93.02'
 * @example formatFiatValue(100.567, 'jpy', 155.5) // '¥15,638'
 * @example formatFiatValue(null, 'eur', 0.925) // '-'
 */
export function formatFiatValue(
  usdAmount: number | null | undefined,
  code: CurrencyCode,
  rate: number
): string {
  if (isNil(usdAmount)) return '-';

  const converted = convert(usdAmount, rate);
  const decimals = getDecimals(code);
  const symbol = getCurrencySymbol(code);
  const rounded = round(converted, decimals);

  // Use locale formatting for thousands separators
  const formatted = rounded.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${symbol}${formatted}`;
}

/**
 * Format a USD amount as a large-number fiat string (e.g. $1.23B, €456.78M).
 * Replaces `formatUSD`.
 *
 * @example formatFiatLarge(1_500_000_000, 'eur', 0.925) // '€1.39B'
 * @example formatFiatLarge(null, 'eur', 0.925) // '-'
 */
export function formatFiatLarge(
  usdAmount: number | null | undefined,
  code: CurrencyCode,
  rate: number
): string {
  if (isNil(usdAmount)) return '-';

  const converted = convert(usdAmount, rate);
  const symbol = getCurrencySymbol(code);
  const decimals = getDecimals(code);

  if (converted >= 1_000_000_000) return `${symbol}${(converted / 1_000_000_000).toFixed(2)}B`;
  if (converted >= 1_000_000) return `${symbol}${(converted / 1_000_000).toFixed(2)}M`;
  if (converted >= 1_000) return `${symbol}${(converted / 1_000).toFixed(2)}K`;

  return `${symbol}${converted.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Format an absolute change value with sign and currency symbol.
 * Replaces `showAbsoluteChange`.
 *
 * @example formatFiatChange(10.5, 'eur', 0.925)  // '+€9.71'
 * @example formatFiatChange(-5.25, 'usd', 1)     // '-$5.25'
 * @example formatFiatChange(null, 'usd', 1)       // null
 */
export function formatFiatChange(
  usdAmount: number | null | undefined,
  code: CurrencyCode,
  rate: number
): string | null {
  if (isNil(usdAmount)) return null;

  const converted = convert(Math.abs(usdAmount), rate);
  const decimals = getDecimals(code);
  const symbol = getCurrencySymbol(code);
  const rounded = round(converted, decimals);
  const val = rounded.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (usdAmount > 0) return `+${symbol}${val}`;
  if (usdAmount < 0) return `-${symbol}${val}`;
  return `${symbol}${val}`;
}

/**
 * Format a USD amount with high precision (no symbol). Caller adds label.
 * Replaces `formatUsdPrecise`.
 *
 * @example formatFiatPrecise(1234.5678, 'eur', 0.925, 4) // '1141.93'
 */
export function formatFiatPrecise(
  usdAmount: number | null | undefined,
  code: CurrencyCode,
  rate: number,
  dec?: number
): string {
  const decimals = dec ?? getDecimals(code);
  if (isNil(usdAmount)) return (0).toFixed(decimals);
  const converted = convert(usdAmount, rate);
  return converted.toFixed(decimals);
}

/**
 * Format using Intl.NumberFormat for the given currency.
 * Useful for chart tooltips / precise locale formatting.
 * Replaces extension's local `Intl.NumberFormat('en-US', { currency: 'USD' })`.
 *
 * @example formatFiatIntl(1234.56, 'eur') // '€1,234.56'
 */
export function formatFiatIntl(amount: number, code: CurrencyCode): string {
  const decimals = getDecimals(code);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code.toUpperCase(),
    minimumFractionDigits: decimals,
    maximumFractionDigits: Math.max(decimals, 6),
  }).format(amount);
}
