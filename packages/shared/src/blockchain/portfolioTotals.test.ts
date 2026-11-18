import { describe, expect, it } from 'vitest';
import { calculateLast24HoursChange, summarizeBalance } from './portfolioTotals';

describe('calculateLast24HoursChange', () => {
  it('returns 0 for an empty or zero total', () => {
    expect(calculateLast24HoursChange([], 0)).toBe(0);
    expect(calculateLast24HoursChange([{ usdBalance: 10, priceChange24h: 5 }], 0)).toBe(0);
  });

  it('subtracts what the priced items were worth 24h ago', () => {
    // 110 today after +10% was 100 yesterday
    expect(calculateLast24HoursChange([{ usdBalance: 110, priceChange24h: 10 }], 110)).toBeCloseTo(
      10
    );
    // 90 today after -10% was 100 yesterday
    expect(calculateLast24HoursChange([{ usdBalance: 90, priceChange24h: -10 }], 90)).toBeCloseTo(
      -10
    );
  });

  it('counts an item without a 24h change as unchanged', () => {
    const items = [
      { usdBalance: 110, priceChange24h: 10 },
      { usdBalance: 50 },
      { usdBalance: 20, priceChange24h: null },
    ];
    expect(calculateLast24HoursChange(items, 180)).toBeCloseTo(10);
  });

  it('ignores items with no USD balance', () => {
    expect(
      calculateLast24HoursChange([{ priceChange24h: 50 }, { usdBalance: 0, priceChange24h: 50 }], 5)
    ).toBe(0);
  });
});

describe('summarizeBalance', () => {
  it('reports zero totals when no item carries a price', () => {
    const items = [{ priceChange24h: 4 }, {}];
    expect(summarizeBalance(items)).toEqual({ usdTotal: 0, last24HoursChange: 0, items });
  });

  it('sums the priced items and keeps the list as given', () => {
    const items = [{ usdBalance: 110, priceChange24h: 10 }, { usdBalance: 50 }, {}];
    const result = summarizeBalance(items);
    expect(result.usdTotal).toBe(160);
    expect(result.last24HoursChange).toBeCloseTo(10);
    expect(result.items).toBe(items);
  });

  it('treats a zero USD balance as priced', () => {
    expect(summarizeBalance([{ usdBalance: 0 }])).toMatchObject({
      usdTotal: 0,
      last24HoursChange: 0,
    });
  });
});
