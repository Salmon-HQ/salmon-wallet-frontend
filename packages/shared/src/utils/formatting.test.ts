import { describe, expect, it } from 'vitest';
import { formatBaseUnits, formatEffectiveRate } from './formatting';

describe('formatEffectiveRate', () => {
  it('derives the unit rate from the two amounts', () => {
    expect(formatEffectiveRate('1.1', 'USDC', '0.014', 'SOL')).toBe('1 USDC ≈ 0.0127 SOL');
  });

  it('handles rates above one and thousands compaction', () => {
    expect(formatEffectiveRate('0.014', 'SOL', '1.1', 'USDC')).toBe('1 SOL ≈ 78.5714 USDC');
    expect(formatEffectiveRate('1', 'SOL', '2500000', 'BONK')).toBe('1 SOL ≈ 2500K BONK');
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
