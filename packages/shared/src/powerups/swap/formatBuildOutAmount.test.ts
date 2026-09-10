import { describe, it, expect } from 'vitest';
import { formatBuildOutAmount } from './useSwapScreenLogic';
import type { SwapBuildResponse } from './types';

/** Minimal build carrying only what the formatter reads. */
function build(output: unknown): SwapBuildResponse {
  return { output } as unknown as SwapBuildResponse;
}

describe('formatBuildOutAmount', () => {
  it('scales the raw amount by the build’s own decimals', () => {
    expect(formatBuildOutAmount(build({ amount: '14262181', decimals: 9 }))).toBe('0.014262181');
  });

  it('handles a six-decimal token', () => {
    expect(formatBuildOutAmount(build({ amount: '1049854', decimals: 6 }))).toBe('1.049854');
  });

  // The backend fills output.decimals from a server-side token lookup, so a
  // miss arrives as undefined. Formatting anyway with the token list's decimals
  // rendered 14.262397 SOL for a real 0.014262181 SOL quote — a 1000x
  // overstatement on the screen where the user signs.
  it('refuses to guess when the build omits decimals', () => {
    expect(formatBuildOutAmount(build({ amount: '14262181' }))).toBeNull();
  });

  it('refuses a non-numeric decimals value', () => {
    expect(formatBuildOutAmount(build({ amount: '14262181', decimals: '9' }))).toBeNull();
  });

  it('refuses a non-numeric amount', () => {
    expect(formatBuildOutAmount(build({ amount: 'abc', decimals: 9 }))).toBeNull();
  });
});
