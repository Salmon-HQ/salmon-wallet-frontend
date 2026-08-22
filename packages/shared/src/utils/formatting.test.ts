import { afterEach, describe, expect, it } from 'vitest';
import i18n from 'i18next';
import {
  formatAmountWithSymbol,
  formatBaseUnits,
  formatConversionRate,
  formatEffectiveRate,
  formatLargeNumber,
  formatPercent,
  formatPercentage,
  formatRawAmount,
  formatSolFee,
  formatTokenAmount,
  formatTokenBalance,
  showPercentage,
} from './formatting';
import { formatFiatChange, formatFiatPrice, formatFiatValue } from './currencyFormatting';

/** U+2212, the typographic minus the number contract renders negatives with. */
const MINUS = '\u2212';

describe('formatTokenAmount', () => {
  it('uses a point as decimal separator under en', () => {
    expect(formatTokenAmount(0.00013129, 'en')).toBe('0.00013129');
    expect(formatTokenAmount(1.5, 'en')).toBe('1.5');
  });

  it('uses a comma as decimal separator under es', () => {
    expect(formatTokenAmount(0.00013129, 'es')).toBe('0,00013129');
    expect(formatTokenAmount(1.5, 'es')).toBe('1,5');
  });

  it('keeps BTC (8) and SOL (9) fraction precision', () => {
    expect(formatTokenAmount(0.00000001, 'en')).toBe('0.00000001');
    expect(formatTokenAmount(0.000000001, 'en')).toBe('0.000000001');
    expect(formatTokenAmount(0.000000001, 'es')).toBe('0,000000001');
  });

  it('does not group thousands, matching the raw-amount row look', () => {
    expect(formatTokenAmount(1234567.89, 'en')).toBe('1234567.89');
    expect(formatTokenAmount(1234567.89, 'es')).toBe('1234567,89');
  });

  it('accepts string amounts', () => {
    expect(formatTokenAmount('0.00013129', 'es')).toBe('0,00013129');
    expect(formatTokenAmount('42', 'en')).toBe('42');
  });

  it('falls back to en when no locale is set on i18n', () => {
    // i18n is uninitialized in this test env, so language is undefined
    expect(formatTokenAmount(0.5)).toBe('0.5');
  });

  it('returns the input unchanged when it is not a finite number', () => {
    expect(formatTokenAmount('abc', 'en')).toBe('abc');
    expect(formatTokenAmount(NaN, 'en')).toBe('NaN');
  });
});

describe('formatTokenBalance', () => {
  const originalLanguage = i18n.language;

  afterEach(() => {
    i18n.language = originalLanguage;
  });

  it('uses a point as decimal separator under en', () => {
    expect(formatTokenBalance(1.5, 10, 'en')).toBe('1.5');
    expect(formatTokenBalance(0.00013129, 10, 'en')).toBe('0.00013129');
  });

  it('uses a comma as decimal separator under es', () => {
    expect(formatTokenBalance(1.5, 10, 'es')).toBe('1,5');
    expect(formatTokenBalance(0.00013129, 10, 'es')).toBe('0,00013129');
  });

  it('follows the app language rather than the host default', () => {
    i18n.language = 'es';
    expect(formatTokenBalance(1.5)).toBe('1,5');

    i18n.language = 'en';
    expect(formatTokenBalance(1.5)).toBe('1.5');
  });

  it('trims trailing fractional zeros', () => {
    expect(formatTokenBalance(2.5, 10, 'en')).toBe('2.5');
    expect(formatTokenBalance(3, 10, 'es')).toBe('3');
  });

  it('rounds to the requested decimals', () => {
    expect(formatTokenBalance(1.123456789012, 4, 'en')).toBe('1.1235');
    expect(formatTokenBalance(1.123456789012, 4, 'es')).toBe('1,1235');
  });

  it('keeps BTC (8) and SOL (9) fraction precision', () => {
    expect(formatTokenBalance(0.00000001, 10, 'en')).toBe('0.00000001');
    expect(formatTokenBalance(0.000000001, 10, 'es')).toBe('0,000000001');
  });

  it('does not group thousands, matching the raw-amount row look', () => {
    expect(formatTokenBalance(1234567.89, 10, 'en')).toBe('1234567.89');
    expect(formatTokenBalance(1234567.89, 10, 'es')).toBe('1234567,89');
  });

  it('renders nil and zero balances as a bare zero', () => {
    expect(formatTokenBalance(undefined, 10, 'es')).toBe('0');
    expect(formatTokenBalance(null, 10, 'es')).toBe('0');
    expect(formatTokenBalance(0, 10, 'es')).toBe('0');
  });
});

describe('formatEffectiveRate', () => {
  it('derives the unit rate from the two amounts', () => {
    expect(formatEffectiveRate('1.1', 'USDC', '0.014', 'SOL')).toBe('1 USDC ≈ 0.0127273 SOL');
  });

  it('handles rates above one and thousands compaction', () => {
    expect(formatEffectiveRate('0.014', 'SOL', '1.1', 'USDC')).toBe('1 SOL ≈ 78.5714 USDC');
    expect(formatEffectiveRate('1', 'SOL', '2500000', 'BONK')).toBe('1 SOL ≈ 2500000 BONK');
  });

  it('returns null rather than printing a made-up rate', () => {
    expect(formatEffectiveRate('', 'USDC', '0.014', 'SOL')).toBeNull();
    expect(formatEffectiveRate('0', 'USDC', '0.014', 'SOL')).toBeNull();
    expect(formatEffectiveRate('1.1', 'USDC', 'abc', 'SOL')).toBeNull();
    expect(formatEffectiveRate('1.1', '', '0.014', 'SOL')).toBeNull();
  });
});

describe('formatBaseUnits', () => {
  it('renders whole and fractional parts without trailing zeros', () => {
    expect(formatBaseUnits(1_500_000_000n, 9)).toBe('1.5');
    expect(formatBaseUnits(2_000_000n, 6)).toBe('2');
    expect(formatBaseUnits(0n, 9)).toBe('0');
  });

  it('pads amounts smaller than one unit instead of dropping their leading zeros', () => {
    expect(formatBaseUnits(1n, 9)).toBe('0.000000001');
    expect(formatBaseUnits(5_000n, 9)).toBe('0.000005');
  });

  it('returns the magnitude, leaving the sign to the caller', () => {
    expect(formatBaseUnits(-2_000_000n, 6)).toBe('2');
  });

  it('stays exact past the range a float can represent', () => {
    // u64::MAX — an unlimited SPL approval. Dividing this through a `number`
    // rounds it, and a rounded amount on an approval screen is a wrong amount.
    expect(formatBaseUnits(18_446_744_073_709_551_615n, 6)).toBe('18446744073709.551615');
    expect(formatBaseUnits(9_007_199_254_740_993n, 0)).toBe('9007199254740993');
  });

  it('treats a zero-decimal mint as whole units', () => {
    expect(formatBaseUnits(42n, 0)).toBe('42');
  });
});

describe('formatPercentage', () => {
  it('renders a rise with a plus glyph and two fraction digits', () => {
    expect(formatPercentage(3.87, 'en')).toBe('+3.87%');
    expect(formatPercentage(3.87, 'es')).toBe('+3,87%');
  });

  it('renders a fall with the typographic minus, not the hyphen', () => {
    expect(formatPercentage(-0.42, 'en')).toBe(`${MINUS}0.42%`);
    expect(formatPercentage(-0.42, 'es')).toBe(`${MINUS}0,42%`);
    expect(formatPercentage(-0.42, 'en')).not.toContain('-');
  });

  it('renders zero bare, because 0.00% claims a precision it does not have', () => {
    expect(formatPercentage(0, 'en')).toBe('0%');
    expect(formatPercentage(0, 'es')).toBe('0%');
  });

  it('sets no space before the percent sign', () => {
    expect(formatPercentage(5.567, 'en')).toBe('+5.57%');
    expect(formatPercentage(5.567, 'en')).not.toContain(' ');
  });

  it('does not group a percentage, which is not a money magnitude', () => {
    expect(formatPercentage(1234.56, 'en')).toBe('+1234.56%');
    expect(formatPercentage(1234.56, 'es')).toBe('+1234,56%');
  });

  it('shows a dash rather than inventing a figure when there is none', () => {
    expect(formatPercentage(null, 'en')).toBe('-');
    expect(formatPercentage(undefined, 'en')).toBe('-');
    expect(formatPercentage(NaN, 'en')).toBe('-');
  });

  it('is what the retired percentage renderers now resolve to', () => {
    expect(showPercentage(3.87)).toBe(formatPercentage(3.87));
    expect(showPercentage(-3.87)).toBe(formatPercentage(-3.87));
  });
});

describe('formatPercent', () => {
  it('renders an undirected percentage without a sign', () => {
    expect(formatPercent(0.4, 'en')).toBe('0.40%');
    expect(formatPercent(0.4, 'es')).toBe('0,40%');
    expect(formatPercent(0.4, 'en')).not.toContain('+');
  });

  it('shares the zero and empty forms with the signed renderer', () => {
    expect(formatPercent(0, 'en')).toBe('0%');
    expect(formatPercent(null, 'en')).toBe('-');
  });
});

describe('formatConversionRate', () => {
  it('renders a rate at six significant digits in the app language', () => {
    expect(formatConversionRate(78.571428, 'en')).toBe('78.5714');
    expect(formatConversionRate(78.571428, 'es')).toBe('78,5714');
    expect(formatConversionRate(0.0127272727, 'en')).toBe('0.0127273');
  });

  it('does not group a rate, which is a token quantity', () => {
    expect(formatConversionRate(2500000, 'en')).toBe('2500000');
    expect(formatConversionRate(2500000, 'es')).toBe('2500000');
  });

  it('localizes the bounded form for rates below the display floor', () => {
    expect(formatConversionRate(0.00001, 'en')).toBe('<0.0001');
    expect(formatConversionRate(0.00001, 'es')).toBe('<0,0001');
  });

  it("still reads the backend's numeric strings", () => {
    expect(formatConversionRate('78.571428', 'en')).toBe('78.5714');
    expect(formatConversionRate('0', 'en')).toBe('0');
    expect(formatConversionRate('abc', 'en')).toBe('0');
  });
});

describe('token amount renderers', () => {
  it('renders a raw amount in the app language', () => {
    expect(formatRawAmount('1500000000', 9, undefined, 'en')).toBe('1.5');
    expect(formatRawAmount('1500000000', 9, undefined, 'es')).toBe('1,5');
  });

  it('localizes the hand-built below-threshold form', () => {
    expect(formatRawAmount('1', 9, 0.000001, 'en')).toBe('<0.000001');
    expect(formatRawAmount('1', 9, 0.000001, 'es')).toBe('<0,000001');
  });

  it('renders an amount with its symbol in the app language', () => {
    expect(formatAmountWithSymbol('1.5', 'SOL', 8, 'en')).toBe('1.5 SOL');
    expect(formatAmountWithSymbol('1.5', 'SOL', 8, 'es')).toBe('1,5 SOL');
  });

  it('renders a fee in the app language', () => {
    expect(formatSolFee(1_500_000, 'en')).toBe('0.0015 SOL');
    expect(formatSolFee(1_500_000, 'es')).toBe('0,0015 SOL');
  });

  it('compacts a large count in the app language', () => {
    expect(formatLargeNumber(2_500_000, 'en')).toBe('2.50M');
    expect(formatLargeNumber(2_500_000, 'es')).toBe('2,50M');
    expect(formatLargeNumber(null, 'en')).toBe('-');
  });
});

describe('fiat renderers', () => {
  it('groups thousands, unlike a token amount', () => {
    expect(formatFiatValue(1234567.89, 'usd', 1, 'en')).toBe('$1,234,567.89');
    expect(formatTokenAmount(1234567.89, 'en')).toBe('1234567.89');
  });

  it('follows the app language for both separators', () => {
    expect(formatFiatValue(1234567.89, 'usd', 1, 'es')).toBe('$1.234.567,89');
  });

  it('holds a fiat value at two fraction digits', () => {
    expect(formatFiatValue(1.5, 'usd', 1, 'en')).toBe('$1.50');
    expect(formatFiatValue(0.001, 'usd', 1, 'en')).toBe('$0.00');
  });

  it('gives a token price more digits below one unit than a fiat value gets', () => {
    expect(formatFiatPrice(0.00001234, 'usd', 1, 'en')).toBe('$0.000012');
    expect(formatFiatPrice(1234.5, 'usd', 1, 'en')).toBe('$1,234.50');
    expect(formatFiatPrice(null, 'usd', 1, 'en')).toBe('-');
  });

  it('signs a fiat change with the typographic minus', () => {
    expect(formatFiatChange(10.5, 'usd', 1, 'en')).toBe('+$10.50');
    expect(formatFiatChange(-5.25, 'usd', 1, 'en')).toBe(`${MINUS}$5.25`);
    expect(formatFiatChange(-5.25, 'usd', 1, 'es')).toBe(`${MINUS}$5,25`);
  });
});
