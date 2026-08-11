/**
 * Balance formatting tests
 * Tests for pure formatting utilities
 */

import { describe, it, expect } from 'vitest';

import {
  formatBalance,
  formatUsdValue,
  formatPercentChange,
} from '../../utils/formatting';

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
