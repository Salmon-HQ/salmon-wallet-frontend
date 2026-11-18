import { describe, expect, it } from 'vitest';
import { hiddenValue, showPercentage } from './formatting';
import { tokenRowDisplay } from './tokenRowDisplay';

const formatValue = (value: number) => `$${value.toFixed(2)}`;
const sol = {
  symbol: 'SOL',
  price: 101.39,
  uiAmount: '1.2',
  usdBalance: 121.67,
  last24HoursChange: { perc: -1.1, abs: -1.3 },
};

describe('tokenRowDisplay', () => {
  it('prints ticker, price and change as one line, and the amount with its symbol', () => {
    const row = tokenRowDisplay(sol as never, false, formatValue);

    expect(`${row.tickerSegment}${row.displayPrice}${row.changeSegment}`).toBe(
      `SOL · $101.39 · ${showPercentage(-1.1)}`
    );
    expect(row.displayTokenAmount).toBe('1.2 SOL');
    expect(row.displayUsdValue).toBe('$121.67');
    expect(row.changeTone).toBe('negative');
  });

  it('hides every figure, printed or spoken, in privacy mode', () => {
    const row = tokenRowDisplay(sol as never, true, formatValue);

    expect(row.displayPrice).toBe(hiddenValue);
    expect(row.displayUsdValue).toBe(hiddenValue);
    expect(row.displayTokenAmount).toBe(hiddenValue);
    expect(row.spokenAmount).toBe(hiddenValue);
    expect(row.spokenPrice).toBe(hiddenValue);
  });

  it('prints the ticker alone when there is no price and no change', () => {
    const row = tokenRowDisplay(
      { symbol: 'XYZ', price: null, uiAmount: 3, usdBalance: null } as never,
      false,
      formatValue
    );

    expect(row.tickerSegment).toBe('XYZ');
    expect(row.displayPrice).toBeNull();
    expect(row.changeSegment).toBeNull();
    expect(row.displayUsdValue).toBeNull();
    expect(row.changeTone).toBe('neutral');
  });

  it('prints the change without a separator when there is no price', () => {
    const row = tokenRowDisplay(
      { ...sol, price: null, last24HoursChange: { perc: 2, abs: 1 } } as never,
      false,
      formatValue
    );

    expect(row.tickerSegment).toBe('SOL · ');
    expect(row.changeSegment).toBe(showPercentage(2));
    expect(row.changeTone).toBe('positive');
  });

  it('compacts a large holding and keeps a dust balance digit for digit', () => {
    const big = tokenRowDisplay(
      { ...sol, symbol: 'BONK', uiAmount: '28896.26376' } as never,
      false,
      formatValue
    );
    const dust = tokenRowDisplay({ ...sol, uiAmount: '0.000012' } as never, false, formatValue);

    expect(big.displayTokenAmount).toMatch(/^28\.9\d?K BONK$/);
    expect(dust.displayTokenAmount).toBe('0.000012 SOL');
  });
});
