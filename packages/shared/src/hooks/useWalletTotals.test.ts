/**
 * The aggregated total on the wallets screen (CORE 10, FR-005).
 *
 * Arithmetic only — the query layer is `useQueries` reading a cache the rest
 * of the app fills, and the thing that can actually go wrong here is which
 * wallets get counted.
 */
import { describe, expect, it } from 'vitest';

import { sumIncludedTotals } from './useWalletTotals';

describe('sumIncludedTotals', () => {
  it('adds up every wallet when nothing is excluded', () => {
    expect(sumIncludedTotals(['a', 'b', 'c'], [], { a: 10, b: 2.5, c: 0.25 })).toBe(12.75);
  });

  it('leaves out the wallets the user excluded', () => {
    expect(sumIncludedTotals(['a', 'b', 'c'], ['b'], { a: 10, b: 2.5, c: 0.25 })).toBe(10.25);
  });

  it('counts a wallet with no answer yet as zero rather than dropping the sum', () => {
    expect(sumIncludedTotals(['a', 'b'], [], { a: 10, b: undefined })).toBe(10);
  });

  it('is zero when every wallet is excluded — the screen must never let this happen', () => {
    expect(sumIncludedTotals(['a', 'b'], ['a', 'b'], { a: 10, b: 5 })).toBe(0);
  });

  it('ignores exclusions for wallets that no longer exist', () => {
    expect(sumIncludedTotals(['a'], ['gone'], { a: 7 })).toBe(7);
  });
});
