import { describe, expect, it } from 'vitest';
import { RESAMPLE_POINTS, buildLinePath, getDataBounds, resampleYs } from './priceChartPath';

const HEIGHT = 200;
const WIDTH = 300;

describe('priceChartPath', () => {
  it('pads the bounds by a tenth of the range on each side', () => {
    expect(getDataBounds([])).toEqual({ min: 0, max: 0 });
    expect(
      getDataBounds([
        { timestamp: 1, price: 10 },
        { timestamp: 2, price: 20 },
      ])
    ).toEqual({ min: 9, max: 21 });
  });

  it('resamples any series length to one point count — what makes two periods morph', () => {
    const short = [
      { timestamp: 1, price: 10 },
      { timestamp: 2, price: 20 },
    ];
    const long = Array.from({ length: 500 }, (_, i) => ({ timestamp: i, price: i }));
    const bounds = { min: 0, max: 100 };
    expect(resampleYs(short, HEIGHT, bounds)).toHaveLength(RESAMPLE_POINTS);
    expect(resampleYs(long, HEIGHT, bounds)).toHaveLength(RESAMPLE_POINTS);
    expect(resampleYs([{ timestamp: 1, price: 50 }], HEIGHT, bounds)).toHaveLength(RESAMPLE_POINTS);
  });

  it('maps prices into chart coordinates — higher price, smaller y', () => {
    const ys = resampleYs(
      [
        { timestamp: 1, price: 0 },
        { timestamp: 2, price: 100 },
      ],
      HEIGHT,
      { min: 0, max: 100 }
    );
    expect(ys[0]).toBe(HEIGHT);
    expect(ys[ys.length - 1]).toBe(0);
  });

  it('returns nothing for nothing', () => {
    expect(resampleYs([], HEIGHT, { min: 0, max: 0 })).toEqual([]);
    expect(buildLinePath([], WIDTH)).toBe('');
  });

  it('builds a smooth path spanning the full chart width', () => {
    const ys = resampleYs(
      [
        { timestamp: 1, price: 5 },
        { timestamp: 2, price: 7 },
        { timestamp: 3, price: 6 },
      ],
      HEIGHT,
      { min: 0, max: 10 }
    );
    const path = buildLinePath(ys, WIDTH);
    expect(path.startsWith('M 0 ')).toBe(true);
    expect(path).toContain('Q ');
    expect(path.endsWith(`L ${WIDTH} ${ys[ys.length - 1]}`)).toBe(true);
  });
});
