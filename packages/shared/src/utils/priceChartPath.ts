/**
 * The price chart's geometry, on both platforms: the padded bounds of a
 * series, its resampling to one fixed point count, and the smooth path.
 *
 * Every period's series is resampled to `RESAMPLE_POINTS` so two periods
 * always yield same-length arrays — which is what makes the curve
 * interpolable when the range changes, instead of a hard swap.
 *
 * Mobile keeps its own copy of `buildLinePath` marked `'worklet'`: it runs on
 * the UI thread inside a Reanimated derived value every frame of the morph,
 * and a worklet may not call into ordinary JS. The two must stay identical —
 * `priceChartPath.test.ts` pins this one; mobile's test pins the twin.
 */
import type { PriceDataPoint } from '../types';

export const RESAMPLE_POINTS = 64;

export interface ChartBounds {
  min: number;
  max: number;
}

/** Min and max of the series with a tenth of the range as headroom on each side. */
export function getDataBounds(data: readonly PriceDataPoint[]): ChartBounds {
  if (data.length === 0) return { min: 0, max: 0 };
  let min = data[0].price;
  let max = data[0].price;
  for (const point of data) {
    if (point.price < min) min = point.price;
    if (point.price > max) max = point.price;
  }
  const padding = (max - min) * 0.1;
  return { min: min - padding, max: max + padding };
}

/**
 * Resample a series to `RESAMPLE_POINTS` y-pixel values — linear over the
 * index space, already scaled into chart coordinates (higher price, smaller y).
 */
export function resampleYs(
  data: readonly PriceDataPoint[],
  height: number,
  bounds: ChartBounds
): number[] {
  if (data.length === 0) return [];
  const { min, max } = bounds;
  const range = max - min || 1;
  const ys: number[] = [];
  for (let i = 0; i < RESAMPLE_POINTS; i++) {
    const pos = data.length === 1 ? 0 : (i / (RESAMPLE_POINTS - 1)) * (data.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(lo + 1, data.length - 1);
    const frac = pos - lo;
    const price = data[lo].price + (data[hi].price - data[lo].price) * frac;
    ys.push(height - ((price - min) / range) * height);
  }
  return ys;
}

/** The smooth quadratic-bezier line path from resampled y values. */
export function buildLinePath(ys: readonly number[], width: number): string {
  if (ys.length === 0) return '';
  const step = width / (ys.length - 1);
  let path = `M 0 ${ys[0]}`;
  for (let i = 1; i < ys.length; i++) {
    const prevX = (i - 1) * step;
    const midX = prevX + step / 2;
    path += ` Q ${prevX} ${ys[i - 1]} ${midX} ${(ys[i - 1] + ys[i]) / 2}`;
  }
  path += ` L ${width} ${ys[ys.length - 1]}`;
  return path;
}
