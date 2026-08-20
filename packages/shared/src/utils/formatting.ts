/**
 * Amount and Currency Formatting Utilities
 * Migrated from salmon-wallet-v2/src/utils/amount.js
 *
 * Provides formatting functions for displaying amounts, percentages,
 * and currency values in the UI.
 */

import round from 'lodash-es/round';
import isNil from 'lodash-es/isNil';
import i18n from 'i18next';
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

/**
 * The typographic minus, U+2212 — not the hyphen.
 *
 * DESIGN.md §Colors' Three-Channel State Rule: direction is carried by a
 * glyph, never by a hue, so the glyph has to be the real one. The hyphen is a
 * word-breaking mark and renders narrower than the plus it is set against,
 * which breaks the column alignment §Typography's Tabular Rule asks for.
 */
export const MINUS_SIGN = '\u2212';

/**
 * Fraction digits for a percentage, per the ratified number contract.
 */
const PERCENTAGE_FRACTION_DIGITS = 2;

/**
 * Significant digits for an exchange rate, per the ratified number contract.
 */
const RATE_SIGNIFICANT_DIGITS = 6;

/**
 * Below this, a rate is shown as a bounded "less than" rather than a figure
 * whose digits would all be noise.
 */
const RATE_MIN_DISPLAY = 0.0001;

// ============================================================================
// Locale Resolution
// ============================================================================

/**
 * Resolves the locale every renderer in this module formats against.
 *
 * PRODUCT.md's i18n constraint: the app's language decides how a number
 * reads, never the host locale. `Intl` defaults to the runtime's locale, so
 * every call site here has to name a locale explicitly or an English UI on a
 * Spanish device silently prints Spanish separators.
 *
 * @param locale - Explicit override, mostly for tests
 * @returns The active i18next language, falling back to English
 */
export function resolveLocale(locale?: string): string {
  return locale || i18n.language || 'en';
}

/**
 * The single `Intl.NumberFormat` entry point for this module.
 *
 * Nothing user-visible may go through `toFixed`: it always emits a period and
 * so contradicts the app language under Spanish. Routing every renderer
 * through here keeps that impossible to forget.
 *
 * @param value - The number to render
 * @param options - `Intl.NumberFormat` options for the value's role
 * @param locale - Explicit override; defaults to the active language
 * @returns The rendered number
 */
export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions,
  locale?: string
): string {
  return numberFormatFor(resolveLocale(locale), options).format(value);
}

/**
 * The formatters this module has already built, keyed by locale and options.
 *
 * Constructing an `Intl.NumberFormat` is roughly an order of magnitude dearer
 * than formatting with one — it resolves a locale and builds a native
 * formatter — and this module is the choke point every rendered figure passes
 * through. A transaction row alone renders several, so a list pays the
 * construction once per figure per render on the JS thread, during the same
 * frames a sheet is animating open.
 *
 * The set of (locale, options) pairs is fixed by the call sites in this
 * module, so the map is bounded by the number of number *roles* the contract
 * defines, not by anything the user or the data can grow.
 */
const numberFormatters = new Map<string, Intl.NumberFormat>();

function numberFormatFor(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  const cached = numberFormatters.get(key);
  if (cached) return cached;
  const formatter = new Intl.NumberFormat(locale, options);
  numberFormatters.set(key, formatter);
  return formatter;
}

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
 * Formats a token amount for display, with the decimal separator following
 * the app's active i18n language — never the OS locale and never a hardcode.
 *
 * Token rows previously interpolated the raw `uiAmount` into the string,
 * leaving the number→string conversion to the runtime; on some devices that
 * conversion tracks the OS locale, so an English UI showed "0,00013129 BTC".
 * Formatting explicitly against `i18n.language` pins the separator to the
 * language the rest of the copy is in: '.' under en, ',' under es.
 *
 * Grouping is disabled to match the raw-amount look the rows already have,
 * and up to 9 fraction digits are kept so BTC (8) and SOL (9) precision
 * survive intact.
 *
 * @param amount - Token amount in UI units (number, or its string form)
 * @param locale - Override locale; defaults to the active i18next language
 * @returns The formatted amount, or the input as-is when not a finite number
 *
 * @example
 * ```typescript
 * formatTokenAmount(0.00013129, 'en') // '0.00013129'
 * formatTokenAmount(0.00013129, 'es') // '0,00013129'
 * ```
 */
export function formatTokenAmount(amount: number | string, locale?: string): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (typeof value !== 'number' || !isFinite(value)) return String(amount);

  return formatNumber(
    value,
    {
      maximumFractionDigits: 9,
      // A token amount is an exact quantity compared digit by digit, so a
      // thousands separator is noise — and under Spanish it collides with the
      // decimal separator. Grouping is a fiat affordance only.
      useGrouping: false,
    },
    locale
  );
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
 * Renders the magnitude of a percentage: two fraction digits, no space before
 * the `%`, decimal separator following the app language.
 *
 * Zero is rendered bare — `0.00%` advertises a precision that informs nothing.
 */
function formatPercentageMagnitude(value: number, locale?: string): string {
  if (value === 0) {
    return `${formatNumber(0, { maximumFractionDigits: 0 }, locale)}%`;
  }
  return `${formatNumber(
    Math.abs(value),
    {
      minimumFractionDigits: PERCENTAGE_FRACTION_DIGITS,
      maximumFractionDigits: PERCENTAGE_FRACTION_DIGITS,
      // A percentage is not a magnitude of money; it gets no grouping.
      useGrouping: false,
    },
    locale
  )}%`;
}

/**
 * The percentage renderer for a *change* — a value whose direction is part of
 * what it says: `+3.87%`, `−0.42%`, `0%`.
 *
 * The sign is always present and always a glyph, per DESIGN.md §Colors'
 * Three-Channel State Rule: colour alone never carries state, so the direction
 * has to survive being read in monochrome. The negative uses the typographic
 * minus rather than the hyphen so `+` and `−` set to the same width, which is
 * what §Typography's Tabular Rule needs to hold a column.
 *
 * For a percentage with no direction — a fee, a slippage tolerance, a price
 * impact — use `formatPercent`, which renders the same digits without a sign.
 *
 * @param value - The percentage, already scaled (3.87 renders as '+3.87%')
 * @param locale - Override locale; defaults to the active i18next language
 * @returns The formatted percentage, or '-' when there is no number to show
 *
 * @example
 * ```typescript
 * formatPercentage(3.87, 'en')   // '+3.87%'
 * formatPercentage(-0.42, 'en')  // '−0.42%'
 * formatPercentage(-0.42, 'es')  // '−0,42%'
 * formatPercentage(0, 'en')      // '0%'
 * formatPercentage(null, 'en')   // '-'
 * ```
 */
export function formatPercentage(
  value: number | null | undefined,
  locale?: string
): string {
  if (isNil(value) || !isFinite(value)) return '-';
  const magnitude = formatPercentageMagnitude(value, locale);
  if (isPositive(value)) return `+${magnitude}`;
  if (isNegative(value)) return `${MINUS_SIGN}${magnitude}`;
  return magnitude;
}

/**
 * Formats a percentage value for display with sign and percentage symbol
 *
 * @deprecated Use `formatPercentage`, which this now delegates to. The
 * `decimals` argument is ignored: the ratified number contract fixes a
 * percentage at two fraction digits so two rows never disagree about how
 * precise the same kind of figure is.
 *
 * @param perc - The percentage value to format
 * @returns Formatted percentage string with sign and % symbol
 */
export function showPercentage(perc: number, _decimals?: number): string {
  return formatPercentage(perc);
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

/**
 * Compact form for a large count — a token supply, not a money magnitude.
 *
 * Distinguished from the other renderers by the K/M/B suffixes: the figure is
 * read for its order of magnitude, so digits past the second are dropped
 * rather than grouped. The uncompacted tail is below 1000, where grouping
 * would not apply anyway, so it renders as a plain token amount.
 *
 * @param value - The count in whole units
 * @param locale - Override locale; defaults to the active i18next language
 * @returns The compacted count, or '-' when there is no number to show
 */
export function formatLargeNumber(
  value: number | undefined | null,
  locale?: string
): string {
  if (isNil(value)) return '-';
  const compact = (scaled: number, suffix: string) =>
    `${formatNumber(
      scaled,
      { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false },
      locale
    )}${suffix}`;
  if (value >= 1_000_000_000) return compact(value / 1_000_000_000, 'B');
  if (value >= 1_000_000) return compact(value / 1_000_000, 'M');
  if (value >= 1_000) return compact(value / 1_000, 'K');
  return formatTokenAmount(value, locale);
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
  minThreshold: number = 0.000001,
  locale?: string
): string {
  const rawAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(rawAmount)) return '0';

  const safeDecimals = typeof decimals === 'number' && !isNaN(decimals) ? decimals : 0;
  const formattedAmount = rawAmount / Math.pow(10, safeDecimals);

  if (formattedAmount === 0) return '0';
  // The threshold is a number the user reads, so it follows the app language
  // like every other figure on the row rather than carrying a baked-in point.
  if (formattedAmount < minThreshold) return `<${formatTokenAmount(minThreshold, locale)}`;
  if (formattedAmount >= 1000000)
    return `${formatNumber(
      formattedAmount / 1000000,
      { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false },
      locale
    )}M`;
  if (formattedAmount >= 1000)
    return `${formatNumber(
      formattedAmount / 1000,
      { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false },
      locale
    )}K`;
  if (formattedAmount >= 1) return formatTokenAmount(round(formattedAmount, 4), locale);

  return formatTokenAmount(round(formattedAmount, 6), locale);
}

/**
 * Formats an available balance for display: rounded to `decimals` fraction
 * digits, then rendered by `formatTokenAmount`.
 *
 * This used to build its string with `toFixed` plus a trailing-zero trim,
 * which always emits '.' and whose trim regex only ever matched a '.'
 * separator. Per PRODUCT.md's i18n constraint the app's language — not the
 * host locale — decides how a number reads, so the rendering is delegated
 * rather than reimplemented: `formatTokenAmount` already ties `Intl` to
 * `i18n.language`, disables grouping and trims trailing zeros in any locale.
 * What is left here is the rounding, which is what distinguishes the two:
 * this one takes a caller-supplied precision. The default matches the 9
 * fraction digits `formatTokenAmount` renders — and the deepest supported
 * chain — so the signature does not promise precision the renderer drops.
 *
 * Display only: callers must derive amounts from the numeric balance, never
 * by parsing this string back.
 *
 * @param value - Balance in UI units
 * @param decimals - Fraction digits to round to before rendering
 * @param locale - Override locale; defaults to the active i18next language
 * @returns The formatted balance, or '0' when the balance is nil or zero
 *
 * @example
 * ```typescript
 * formatTokenBalance(1.5, 9, 'en')  // '1.5'
 * formatTokenBalance(1.5, 9, 'es')  // '1,5'
 * ```
 */
export function formatTokenBalance(
  value: number | undefined | null,
  decimals: number = 9,
  locale?: string
): string {
  if (value === undefined || value === null) return '0';
  if (value === 0) return '0';
  return formatTokenAmount(Number(value.toFixed(decimals)), locale);
}

/** @deprecated Use `formatFiatPrecise` from `currencyFormatting` for multi-currency support. */
export function formatUsdPrecise(value: number | undefined | null, decimals: number = 4): string {
  if (value === undefined || value === null) return (0).toFixed(decimals);
  return value.toFixed(decimals);
}

export function formatAmountWithSymbol(
  amount: string | number,
  symbol: string,
  decimals: number = 8,
  locale?: string
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return `0 ${symbol}`;
  return `${formatTokenAmount(round(numAmount, decimals), locale)} ${symbol}`;
}

/**
 * @deprecated Use `formatPercentage`, which this now delegates to. It was
 * character-for-character `formatPercentChange` and differed from
 * `showPercentage` only in spacing, which is exactly the drift the ratified
 * number contract collapses.
 */
export function formatPercentageCompact(value: number | undefined | null): string {
  return formatPercentage(value);
}

export function formatSolFee(lamports: number, locale?: string): string {
  const sol = lamports / 1_000_000_000;
  return `${formatTokenAmount(round(sol, 7), locale)} SOL`;
}

/**
 * Effective rate line for a completed exchange, derived from the amounts the
 * flow already has: "1 USDC ≈ 0.0127 SOL". Returns null when either amount is
 * missing or non-positive — a receipt must not print a made-up rate.
 */
export function formatEffectiveRate(
  inAmount: string | number,
  inSymbol: string,
  outAmount: string | number,
  outSymbol: string,
  locale?: string
): string | null {
  const inValue = typeof inAmount === 'string' ? parseFloat(inAmount) : inAmount;
  const outValue = typeof outAmount === 'string' ? parseFloat(outAmount) : outAmount;
  if (!isFinite(inValue) || !isFinite(outValue) || inValue <= 0 || outValue <= 0) return null;
  if (!inSymbol || !outSymbol) return null;
  // The rate travels as a number, not as a string another function parses
  // back: a formatted figure is a rendering, and re-reading one is how a
  // localized separator turns into a wrong amount.
  return `1 ${inSymbol} ≈ ${formatConversionRate(outValue / inValue, locale)} ${outSymbol}`;
}

/**
 * Renders an exchange rate at six significant digits, per the ratified number
 * contract: a rate is read across its whole range, so a fixed number of
 * fraction digits either starves the small end or pads the large one.
 *
 * Takes the rate as a number wherever the caller has one. The string overload
 * exists because the backend sends rates as numeric strings; it must never be
 * handed an already-formatted figure, whose separator would parse wrong.
 *
 * Grouping is off: a rate is a token quantity, not a money magnitude.
 *
 * @param rate - The rate, as a number or the backend's numeric string
 * @param locale - Override locale; defaults to the active i18next language
 * @returns The rendered rate, '0' when there is none, or a bounded '<' form
 */
export function formatConversionRate(rate: number | string, locale?: string): string {
  const numericRate = typeof rate === 'string' ? parseFloat(rate) : rate;
  if (!isFinite(numericRate) || numericRate === 0) return '0';
  const options: Intl.NumberFormatOptions = {
    maximumSignificantDigits: RATE_SIGNIFICANT_DIGITS,
    useGrouping: false,
  };
  if (numericRate < RATE_MIN_DISPLAY) {
    return `<${formatNumber(RATE_MIN_DISPLAY, options, locale)}`;
  }
  return formatNumber(numericRate, options, locale);
}

/**
 * Format balance for display
 *
 * @param amount - Balance amount
 * @param decimals - Number of decimal places to show
 * @returns Formatted balance string
 */
/** @deprecated Use `formatTokenBalance`, which renders in the app language. */
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
 * The percentage renderer for a value with no direction — a fee, a slippage
 * tolerance, a price impact. Same digits as `formatPercentage`, without the
 * sign: prefixing a fee with `+` would read it as a gain.
 *
 * @param value - The percentage, already scaled (0.4 renders as '0.40%')
 * @param locale - Override locale; defaults to the active i18next language
 * @returns The formatted percentage, or '-' when there is no number to show
 *
 * @example
 * ```typescript
 * formatPercent(0.4, 'en')  // '0.40%'
 * formatPercent(0.4, 'es')  // '0,40%'
 * formatPercent(0, 'en')    // '0%'
 * ```
 */
export function formatPercent(value: number | null | undefined, locale?: string): string {
  if (isNil(value) || !isFinite(value)) return '-';
  const magnitude = formatPercentageMagnitude(value, locale);
  return isNegative(value) ? `${MINUS_SIGN}${magnitude}` : magnitude;
}

/**
 * @deprecated Use `formatPercentage`. This is character-for-character
 * `formatPercentageCompact` and predates the ratified number contract: it
 * pads zero to '+0.00%' and signs with a hyphen. It is left intact because
 * its only remaining consumer is a test outside this batch's file list.
 */
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
