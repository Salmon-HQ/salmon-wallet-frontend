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
import { MINUS_SIGN, formatNumber } from './formatting';

// ============================================================================
// Helpers
// ============================================================================

function convert(usdAmount: number, rate: number): number {
  return usdAmount * rate;
}

function getDecimals(code: CurrencyCode): number {
  return CURRENCY_MAP[code]?.decimals ?? 2;
}

/**
 * `Intl` options for a fiat magnitude: the currency's own fraction digits,
 * fixed, and thousands grouping on.
 *
 * Grouping is what separates fiat from a token amount in the ratified number
 * contract. A fiat value is a magnitude read at a glance, where the grouping
 * is the whole point; a token amount is an exact quantity compared digit by
 * digit, where the separator is noise.
 */
function fiatOptions(decimals: number): Intl.NumberFormatOptions {
  return {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  };
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
  rate: number,
  locale?: string
): string {
  if (isNil(usdAmount)) return '-';

  const converted = convert(usdAmount, rate);
  const decimals = getDecimals(code);
  const symbol = getCurrencySymbol(code);
  const rounded = round(converted, decimals);

  return `${symbol}${formatNumber(rounded, fiatOptions(decimals), locale)}`;
}

/**
 * Formats a USD amount as a *token price*, which is the one fiat role that
 * cannot take fixed cents: two fraction digits above one unit, but up to six
 * below, so a sub-cent asset reads as its price rather than as '$0.00'.
 *
 * Distinguished from `formatFiatValue` by that split alone — a balance or a
 * portfolio total is a magnitude and stays at fixed cents.
 *
 * @param usdAmount - The price in USD
 * @param code - Display currency
 * @param rate - USD-to-display-currency rate
 * @param locale - Override locale; defaults to the active i18next language
 * @returns The formatted price, or '-' when there is no number to show
 *
 * @example formatFiatPrice(0.00001234, 'usd', 1, 'en') // '$0.000012'
 * @example formatFiatPrice(1234.5, 'usd', 1, 'en')     // '$1,234.50'
 */
export function formatFiatPrice(
  usdAmount: number | null | undefined,
  code: CurrencyCode,
  rate: number,
  locale?: string
): string {
  if (isNil(usdAmount)) return '-';

  const converted = convert(usdAmount, rate);
  const decimals = getDecimals(code);
  const symbol = getCurrencySymbol(code);
  const isSubUnit = Math.abs(converted) < 1;

  return `${symbol}${formatNumber(
    converted,
    {
      minimumFractionDigits: isSubUnit ? 0 : decimals,
      maximumFractionDigits: isSubUnit ? Math.max(decimals, 6) : decimals,
      useGrouping: true,
    },
    locale
  )}`;
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
  rate: number,
  locale?: string
): string {
  if (isNil(usdAmount)) return '-';

  const converted = convert(usdAmount, rate);
  const symbol = getCurrencySymbol(code);
  const decimals = getDecimals(code);
  const compact = (scaled: number, suffix: string) =>
    `${symbol}${formatNumber(
      scaled,
      { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true },
      locale
    )}${suffix}`;

  if (converted >= 1_000_000_000) return compact(converted / 1_000_000_000, 'B');
  if (converted >= 1_000_000) return compact(converted / 1_000_000, 'M');
  if (converted >= 1_000) return compact(converted / 1_000, 'K');

  return `${symbol}${formatNumber(converted, fiatOptions(decimals), locale)}`;
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
  rate: number,
  locale?: string
): string | null {
  if (isNil(usdAmount)) return null;

  const converted = convert(Math.abs(usdAmount), rate);
  const decimals = getDecimals(code);
  const symbol = getCurrencySymbol(code);
  const rounded = round(converted, decimals);
  const val = formatNumber(rounded, fiatOptions(decimals), locale);

  // The typographic minus, matching the percentage beside it: DESIGN.md
  // §Colors' Three-Channel State Rule makes direction a glyph, and
  // §Typography's Tabular Rule needs that glyph to set at the plus's width.
  if (usdAmount > 0) return `+${symbol}${val}`;
  if (usdAmount < 0) return `${MINUS_SIGN}${symbol}${val}`;
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
  dec?: number,
  locale?: string
): string {
  const decimals = dec ?? getDecimals(code);
  const options = fiatOptions(decimals);
  if (isNil(usdAmount)) return formatNumber(0, options, locale);
  return formatNumber(convert(usdAmount, rate), options, locale);
}

/**
 * Format using Intl.NumberFormat for the given currency.
 * Useful for chart tooltips / precise locale formatting.
 * Replaces extension's local `Intl.NumberFormat('en-US', { currency: 'USD' })`.
 *
 * @example formatFiatIntl(1234.56, 'eur') // '€1,234.56'
 */
export function formatFiatIntl(amount: number, code: CurrencyCode, locale?: string): string {
  const decimals = getDecimals(code);
  // A chart tooltip shows a token price, so it follows the token-price rule:
  // fixed cents at or above one unit, more digits only below it, where the
  // alternative is every sub-cent point reading as the same '0.00'.
  const isSubUnit = Math.abs(amount) < 1;
  return formatNumber(
    amount,
    {
      style: 'currency',
      currency: code.toUpperCase(),
      minimumFractionDigits: isSubUnit ? 0 : decimals,
      maximumFractionDigits: isSubUnit ? Math.max(decimals, 6) : decimals,
    },
    locale
  );
}
