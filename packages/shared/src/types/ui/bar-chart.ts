import type { Testable } from './testable';

/** A row of bars, one per value, scaled to the largest; the last one is lit. */
export interface BarChartPropsBase extends Testable {
  values: readonly number[];
  accessibilityLabel: string;
}

/** Each bar's height as a share of the tallest, 0–1, for both twins. */
export const barHeights = (values: readonly number[]): number[] => {
  const max = Math.max(0, ...values);
  return values.map((v) => (max > 0 && v > 0 ? v / max : 0));
};
