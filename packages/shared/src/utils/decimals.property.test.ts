import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { parseAmount, btcToSatoshis, satoshisToBtc, SATOSHIS_PER_BTC } from './decimals';
import { formatBaseUnits } from './formatting';

const RUNS = { numRuns: 200 };

/** u64 is the width of a Solana/SPL token amount. */
const MAX_U64 = 2n ** 64n - 1n;

/** 21e6 BTC expressed in satoshis — the whole supply that can ever exist. */
const MAX_SATOSHIS = 21_000_000 * SATOSHIS_PER_BTC;

describe('decimals property invariants', () => {
  it('round-trips every base-unit amount through its rendered form', () => {
    // The pair a send flow relies on: the figure shown to the user must parse
    // back to the exact base units that go into the transaction.
    fc.assert(
      fc.property(fc.bigInt({ min: 0n, max: MAX_U64 }), fc.integer({ min: 0, max: 18 }), (x, d) => {
        expect(parseAmount(formatBaseUnits(x, d), d)).toBe(x);
      }),
      RUNS
    );
  });

  it('accepts any decimal string within the asset precision', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 18 }),
        fc.bigInt({ min: 0n, max: MAX_U64 }),
        fc.string({ unit: fc.constantFrom(...'0123456789'), minLength: 0, maxLength: 18 }),
        (d, whole, fractionDigits) => {
          const fraction = fractionDigits.slice(0, d);
          const input = fraction ? `${whole}.${fraction}` : `${whole}`;
          expect(typeof parseAmount(input, d)).toBe('bigint');
        }
      ),
      RUNS
    );
  });

  it('rejects a fraction finer than the asset can represent', () => {
    // Silently truncating here would let a user sign an amount they did not type.
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 17 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 5 }),
        (d, whole, extra) => {
          const fraction = '1'.padStart(d + extra, '0');
          expect(() => parseAmount(`${whole}.${fraction}`, d)).toThrow();
        }
      ),
      RUNS
    );
  });

  it('round-trips satoshis through BTC across the whole supply', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: MAX_SATOSHIS }), (sats) => {
        expect(btcToSatoshis(satoshisToBtc(sats))).toBe(BigInt(sats));
      }),
      RUNS
    );
  });

  it('keeps satoshi ordering when converting to BTC', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_SATOSHIS }),
        fc.integer({ min: 0, max: MAX_SATOSHIS }),
        (a, b) => {
          if (a === b) return;
          expect(satoshisToBtc(a) < satoshisToBtc(b)).toBe(a < b);
        }
      ),
      RUNS
    );
  });
});
