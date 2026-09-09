import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatAmount, formatBalance, formatAmountWithSymbol, formatBaseUnits } from './formatting';

const RUNS = { numRuns: 200 };

/** Renderers take an explicit locale so the assertions do not depend on i18n state. */
const EN = 'en';

const MAX_U64 = 2n ** 64n - 1n;

/** A realistic UI-unit balance: below the point where display switches to K/M. */
const uiBalance = fc.double({ min: 0.0001, max: 999.999, noNaN: true, noDefaultInfinity: true });

/** Reads a rendered magnitude back into base units, exactly. */
const decodeBaseUnits = (rendered: string, decimals: number): bigint => {
  const [whole, fraction = ''] = rendered.split('.');
  return BigInt(whole + fraction.padEnd(decimals, '0'));
};

describe('formatAmount property invariants', () => {
  it('renders a value that reads back as the same number', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        fc.integer({ min: 0, max: 18 }),
        (amount, decimals) => {
          const rendered = formatAmount(amount, decimals);
          expect(rendered).not.toMatch(/NaN|Infinity/);
          expect(Number(rendered)).toBe(amount / 10 ** decimals);
        }
      ),
      RUNS
    );
  });
});

describe('formatBaseUnits property invariants', () => {
  it('never emits exponential notation or more digits than the mint has', () => {
    // This is the figure on a signing screen: an "1e-7" there is unreadable and
    // a digit past the mint's precision is a number the chain cannot represent.
    fc.assert(
      fc.property(
        fc.bigInt({ min: -MAX_U64, max: MAX_U64 }),
        fc.integer({ min: 0, max: 18 }),
        (x, d) => {
          const rendered = formatBaseUnits(x, d);
          expect(rendered).toMatch(/^\d+(\.\d+)?$/);
          const fraction = rendered.split('.')[1] ?? '';
          expect(fraction.length).toBeLessThanOrEqual(d);
        }
      ),
      RUNS
    );
  });

  it('renders the magnitude, dropping the sign but never the value', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: MAX_U64 }), fc.integer({ min: 0, max: 18 }), (x, d) => {
        expect(formatBaseUnits(-x, d)).toBe(formatBaseUnits(x, d));
      }),
      RUNS
    );
  });

  it('preserves ordering, so a larger amount never renders as a smaller one', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: MAX_U64 }),
        fc.bigInt({ min: 0n, max: MAX_U64 }),
        fc.integer({ min: 0, max: 18 }),
        (a, b, d) => {
          if (a === b) return;
          const lower = a < b ? a : b;
          const higher = a < b ? b : a;
          // Decoded as bigints: a u64 amount is past the exact range of Number,
          // so comparing the rendered strings numerically would let a rounding
          // tie hide a real inversion.
          expect(decodeBaseUnits(formatBaseUnits(lower, d), d)).toBeLessThan(
            decodeBaseUnits(formatBaseUnits(higher, d), d)
          );
        }
      ),
      RUNS
    );
  });
});

describe('balance renderer property invariants', () => {
  it('rounds a balance to within half a unit in the last displayed place', () => {
    fc.assert(
      fc.property(uiBalance, fc.integer({ min: 2, max: 8 }), (value, decimals) => {
        const rendered = formatBalance(value, decimals);
        expect(rendered).not.toMatch(/NaN|Infinity/);
        expect(Math.abs(parseFloat(rendered) - value)).toBeLessThanOrEqual(0.5 * 10 ** -decimals);
      }),
      RUNS
    );
  });

  it('always ends in the symbol it was given', () => {
    fc.assert(
      fc.property(
        uiBalance,
        fc.constantFrom('SOL', 'BTC', 'USDC', 'ETH'),
        fc.integer({ min: 2, max: 8 }),
        (value, symbol, decimals) => {
          const rendered = formatAmountWithSymbol(value, symbol, decimals, EN);
          expect(rendered.endsWith(` ${symbol}`)).toBe(true);
          const numeric = parseFloat(rendered.slice(0, -symbol.length - 1));
          expect(Math.abs(numeric - value)).toBeLessThanOrEqual(0.5 * 10 ** -decimals);
        }
      ),
      RUNS
    );
  });
});
