import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getShortAddress, truncateHash } from './address';

const RUNS = { numRuns: 200 };

const ELLIPSIS = '...';

/** Base58 is the alphabet a Solana address is drawn from. */
const base58 = fc.string({
  unit: fc.constantFrom(...'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'),
  minLength: 1,
  maxLength: 88,
});

const hex = fc.string({
  unit: fc.constantFrom(...'0123456789abcdef'),
  minLength: 1,
  maxLength: 128,
});

describe('address truncation property invariants', () => {
  it('never invents characters the address does not have', () => {
    // A truncated address is what the user compares against a block explorer,
    // so both visible ends must come verbatim from the real address.
    fc.assert(
      fc.property(base58, fc.integer({ min: 1, max: 12 }), (address, chars) => {
        const short = getShortAddress(address, chars) as string;
        if (short === address) return;
        const [start, end] = short.split(ELLIPSIS);
        expect(address.startsWith(start)).toBe(true);
        expect(address.endsWith(end)).toBe(true);
      }),
      RUNS
    );
  });

  it('never renders longer than the address it stands for', () => {
    fc.assert(
      fc.property(base58, fc.integer({ min: 1, max: 12 }), (address, chars) => {
        const short = getShortAddress(address, chars) as string;
        expect(short.length).toBeLessThanOrEqual(
          Math.max(address.length, chars * 2 + ELLIPSIS.length)
        );
      }),
      RUNS
    );
  });

  it('leaves an address short enough to read in full untouched', () => {
    fc.assert(
      fc.property(base58, fc.integer({ min: 1, max: 12 }), (address, chars) => {
        if (address.length > chars * 2 + ELLIPSIS.length) return;
        expect(getShortAddress(address, chars)).toBe(address);
      }),
      RUNS
    );
  });

  it('truncates a hash from both ends or not at all', () => {
    fc.assert(
      fc.property(hex, fc.integer({ min: 1, max: 12 }), (hash, chars) => {
        const truncated = truncateHash(hash, chars);
        if (hash.length < chars * 2 + ELLIPSIS.length) {
          expect(truncated).toBe(hash);
          return;
        }
        expect(truncated.startsWith(hash.slice(0, chars))).toBe(true);
        expect(truncated.endsWith(hash.slice(-chars))).toBe(true);
        expect(truncated.length).toBe(chars * 2 + ELLIPSIS.length);
      }),
      RUNS
    );
  });
});
