/**
 * Balance Tests
 * Tests for pure balance and formatting utilities
 */

import { describe, it, expect } from 'vitest';

import {
  createSolBalance,
  LAMPORTS_PER_SOL,
  SOL_CONSTANTS,
} from '../../utils/balance';
import {
  formatBalance,
  formatUsdValue,
  formatPercentChange,
} from '../../utils/formatting';

// ============================================================================
// Test Data
// ============================================================================

const MOCK_OWNER = '7XaXJK8z9Y5J1x6W4Xz7R3Q5L9T3N6D4M8F2K1H5G9P2';

// ============================================================================
// formatBalance Tests
// ============================================================================

describe('formatBalance', () => {
  it('should format zero as "0"', () => {
    expect(formatBalance(0)).toBe('0');
  });

  it('should format very small amounts as "<0.0001"', () => {
    expect(formatBalance(0.00001)).toBe('<0.0001');
    expect(formatBalance(0.000099)).toBe('<0.0001');
  });

  it('should format small amounts with 4 decimals by default', () => {
    expect(formatBalance(0.1234)).toBe('0.1234');
    expect(formatBalance(1.5678)).toBe('1.5678');
    expect(formatBalance(99.9999)).toBe('99.9999');
  });

  it('should format amounts >= 1000 with K suffix', () => {
    expect(formatBalance(1000)).toBe('1.00K');
    expect(formatBalance(1500)).toBe('1.50K');
    expect(formatBalance(999999)).toBe('1000.00K');
  });

  it('should format amounts >= 1000000 with M suffix', () => {
    expect(formatBalance(1000000)).toBe('1.00M');
    expect(formatBalance(2500000)).toBe('2.50M');
    expect(formatBalance(123456789)).toBe('123.46M');
  });

  it('should respect custom decimal places', () => {
    expect(formatBalance(1.23456789, 2)).toBe('1.23');
    expect(formatBalance(1.23456789, 6)).toBe('1.234568');
    expect(formatBalance(0.123456, 0)).toBe('0');
  });

  it('should handle edge cases', () => {
    expect(formatBalance(0.0001)).toBe('0.0001');
    expect(formatBalance(999.9999)).toBe('999.9999');
    expect(formatBalance(1000.1234, 2)).toBe('1.00K');
  });

  it('should handle negative numbers', () => {
    // Note: formatBalance does not handle negatives well - the < 0.0001 check
    // catches all negative numbers since any negative number < 0.0001
    expect(formatBalance(-5.5)).toBe('<0.0001');
    expect(formatBalance(-1000)).toBe('<0.0001');
    expect(formatBalance(-0.00001)).toBe('<0.0001');
  });
});

// ============================================================================
// formatUsdValue Tests
// ============================================================================

describe('formatUsdValue', () => {
  it('should return "-" for undefined', () => {
    expect(formatUsdValue(undefined)).toBe('-');
  });

  it('should return "-" for null', () => {
    expect(formatUsdValue(null as any)).toBe('-');
  });

  it('should format zero as "$0.00"', () => {
    expect(formatUsdValue(0)).toBe('$0.00');
  });

  it('should format very small amounts as "<$0.01"', () => {
    expect(formatUsdValue(0.001)).toBe('<$0.01');
    expect(formatUsdValue(0.009)).toBe('<$0.01');
  });

  it('should format small amounts with 2 decimals', () => {
    expect(formatUsdValue(0.01)).toBe('$0.01');
    expect(formatUsdValue(1.5)).toBe('$1.50');
    expect(formatUsdValue(99.99)).toBe('$99.99');
    expect(formatUsdValue(123.456)).toBe('$123.46');
  });

  it('should format amounts >= 1000 with K suffix', () => {
    expect(formatUsdValue(1000)).toBe('$1.00K');
    expect(formatUsdValue(1500)).toBe('$1.50K');
    expect(formatUsdValue(999999)).toBe('$1000.00K');
  });

  it('should format amounts >= 1000000 with M suffix', () => {
    expect(formatUsdValue(1000000)).toBe('$1.00M');
    expect(formatUsdValue(2500000)).toBe('$2.50M');
    expect(formatUsdValue(123456789)).toBe('$123.46M');
  });

  it('should handle edge cases', () => {
    expect(formatUsdValue(0.01)).toBe('$0.01');
    expect(formatUsdValue(999.99)).toBe('$999.99');
    expect(formatUsdValue(1000.1234)).toBe('$1.00K');
  });

  it('should handle negative numbers', () => {
    // Note: formatUsdValue does not handle negatives well - the < 0.01 check
    // catches all negative numbers since any negative number < 0.01
    expect(formatUsdValue(-5.5)).toBe('<$0.01');
    expect(formatUsdValue(-1000)).toBe('<$0.01');
    expect(formatUsdValue(-0.001)).toBe('<$0.01');
  });
});

// ============================================================================
// formatPercentChange Tests
// ============================================================================

describe('formatPercentChange', () => {
  it('should return "-" for undefined', () => {
    expect(formatPercentChange(undefined)).toBe('-');
  });

  it('should return "-" for null', () => {
    expect(formatPercentChange(null as any)).toBe('-');
  });

  it('should format zero as "+0.00%"', () => {
    expect(formatPercentChange(0)).toBe('+0.00%');
  });

  it('should format positive percentages with "+" sign', () => {
    expect(formatPercentChange(5.2)).toBe('+5.20%');
    expect(formatPercentChange(12.345)).toBe('+12.35%');
    expect(formatPercentChange(100)).toBe('+100.00%');
  });

  it('should format negative percentages with "-" sign', () => {
    expect(formatPercentChange(-5.2)).toBe('-5.20%');
    expect(formatPercentChange(-12.345)).toBe('-12.35%');
    expect(formatPercentChange(-100)).toBe('-100.00%');
  });

  it('should format very small percentages', () => {
    expect(formatPercentChange(0.01)).toBe('+0.01%');
    expect(formatPercentChange(-0.01)).toBe('-0.01%');
  });

  it('should format large percentages', () => {
    expect(formatPercentChange(1234.56)).toBe('+1234.56%');
    expect(formatPercentChange(-999.99)).toBe('-999.99%');
  });
});

// ============================================================================
// createSolBalance Tests
// ============================================================================

describe('createSolBalance', () => {
  it('should create SOL balance from lamports', () => {
    const lamports = 2000000000; // 2 SOL
    const owner = MOCK_OWNER;

    const result = createSolBalance(lamports, owner);

    expect(result).toEqual({
      mint: SOL_CONSTANTS.ADDRESS,
      owner,
      amount: lamports,
      decimals: SOL_CONSTANTS.DECIMALS,
      uiAmount: 2,
      symbol: SOL_CONSTANTS.SYMBOL,
      name: SOL_CONSTANTS.NAME,
      logo: SOL_CONSTANTS.LOGO,
      address: SOL_CONSTANTS.ADDRESS,
      coingeckoId: SOL_CONSTANTS.COINGECKO_ID,
      tags: ['community', 'moonshot-verified', 'strict', 'verified', 'major'],
    });
  });

  it('should handle zero lamports', () => {
    const result = createSolBalance(0, MOCK_OWNER);

    expect(result.amount).toBe(0);
    expect(result.uiAmount).toBe(0);
  });

  it('should calculate correct uiAmount for various lamport values', () => {
    expect(createSolBalance(LAMPORTS_PER_SOL, MOCK_OWNER).uiAmount).toBe(1);
    expect(createSolBalance(LAMPORTS_PER_SOL * 10, MOCK_OWNER).uiAmount).toBe(10);
    expect(createSolBalance(500000000, MOCK_OWNER).uiAmount).toBe(0.5);
    expect(createSolBalance(123456789, MOCK_OWNER).uiAmount).toBeCloseTo(0.123456789, 9);
  });

  it('should handle very small lamport amounts', () => {
    const result = createSolBalance(1, MOCK_OWNER);

    expect(result.uiAmount).toBe(1 / LAMPORTS_PER_SOL);
    expect(result.uiAmount).toBeCloseTo(0.000000001, 9);
  });

  it('should handle very large lamport amounts', () => {
    const lamports = LAMPORTS_PER_SOL * 1000000; // 1 million SOL
    const result = createSolBalance(lamports, MOCK_OWNER);

    expect(result.uiAmount).toBe(1000000);
  });

  it('should preserve owner address', () => {
    const owner1 = 'Owner1111111111111111111111111111111111111111';
    const owner2 = 'Owner2222222222222222222222222222222222222222';

    expect(createSolBalance(1000000000, owner1).owner).toBe(owner1);
    expect(createSolBalance(1000000000, owner2).owner).toBe(owner2);
  });

  it('should always use SOL constants', () => {
    const result = createSolBalance(1000000000, MOCK_OWNER);

    expect(result.symbol).toBe('SOL');
    expect(result.name).toBe('Solana');
    expect(result.decimals).toBe(9);
    expect(result.address).toBe(SOL_CONSTANTS.ADDRESS);
    expect(result.mint).toBe(SOL_CONSTANTS.ADDRESS);
    expect(result.coingeckoId).toBe('solana');
    expect(result.logo).toContain('trustwallet');
  });

  it('should handle fractional SOL amounts correctly', () => {
    const testCases = [
      { lamports: 100000000, expected: 0.1 },
      { lamports: 10000000, expected: 0.01 },
      { lamports: 1000000, expected: 0.001 },
      { lamports: 100000, expected: 0.0001 },
      { lamports: 10000, expected: 0.00001 },
      { lamports: 1000, expected: 0.000001 },
      { lamports: 100, expected: 0.0000001 },
      { lamports: 10, expected: 0.00000001 },
      { lamports: 1, expected: 0.000000001 },
    ];

    testCases.forEach(({ lamports, expected }) => {
      const result = createSolBalance(lamports, MOCK_OWNER);
      expect(result.uiAmount).toBeCloseTo(expected, 9);
    });
  });
});

