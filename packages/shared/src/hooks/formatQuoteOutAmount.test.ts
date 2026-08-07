import { describe, it, expect } from 'vitest';
import { formatQuoteOutAmount } from './useSwapScreenLogic';
import type { SwapQuote } from '../types/swap';

/** Minimal quote carrying only what the formatter reads. */
function quote(output: unknown): SwapQuote {
  return { output } as unknown as SwapQuote;
}

describe('formatQuoteOutAmount', () => {
  it('scales the raw amount by the quote’s own decimals', () => {
    expect(formatQuoteOutAmount(quote({ amount: 14262181, decimals: 9 }))).toBe('0.014262181');
  });

  it('handles a six-decimal token', () => {
    expect(formatQuoteOutAmount(quote({ amount: 1049854, decimals: 6 }))).toBe('1.049854');
  });

  // The backend fills output.decimals from a server-side token lookup, so a
  // miss arrives as undefined. Formatting anyway with the token list's decimals
  // rendered 14.262397 SOL for a real 0.014262181 SOL quote — a 1000x
  // overstatement on the screen where the user signs.
  it('refuses to guess when the quote omits decimals', () => {
    expect(formatQuoteOutAmount(quote({ amount: 14262181 }))).toBeNull();
  });

  it('refuses a non-numeric decimals value', () => {
    expect(formatQuoteOutAmount(quote({ amount: 14262181, decimals: '9' }))).toBeNull();
  });

  // Quote providers send amounts as strings; that has always been coerced.
  it('accepts a string amount', () => {
    expect(formatQuoteOutAmount(quote({ amount: '2500000', decimals: 6 }))).toBe('2.5');
  });

  it('refuses a missing or unparseable amount', () => {
    expect(formatQuoteOutAmount(quote({ decimals: 9 }))).toBeNull();
    expect(formatQuoteOutAmount(quote({ amount: 'abc', decimals: 9 }))).toBeNull();
  });

  it('refuses an absent output block', () => {
    expect(formatQuoteOutAmount(quote(undefined))).toBeNull();
  });
});
