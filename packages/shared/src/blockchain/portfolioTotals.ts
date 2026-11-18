interface PricedItem {
  usdBalance?: number;
  priceChange24h?: number | null;
}

/**
 * Reduces priced items into the portfolio 24h delta in USD. Items without
 * `priceChange24h` contribute their USD balance unchanged, so a
 * partially-priced wallet still produces a meaningful number.
 */
export function calculateLast24HoursChange(items: PricedItem[], usdTotal: number): number {
  if (!usdTotal) return 0;

  let previousTotal = 0;
  for (const item of items) {
    if (!item.usdBalance) continue;
    previousTotal +=
      item.priceChange24h !== undefined && item.priceChange24h !== null
        ? item.usdBalance / (1 + item.priceChange24h / 100)
        : item.usdBalance;
  }

  return previousTotal === 0 ? 0 : usdTotal - previousTotal;
}

/**
 * Portfolio totals for a list of balance items the API already priced. A
 * wallet where no item carries a price reports zero rather than a total
 * built from nothing.
 */
export function summarizeBalance<T extends PricedItem>(
  items: T[]
): { usdTotal: number; last24HoursChange: number; items: T[] } {
  if (!items.some((item) => item.usdBalance !== undefined)) {
    return { usdTotal: 0, last24HoursChange: 0, items };
  }

  const usdTotal = items.reduce((total, item) => (item.usdBalance || 0) + total, 0);
  return { usdTotal, last24HoursChange: calculateLast24HoursChange(items, usdTotal), items };
}
