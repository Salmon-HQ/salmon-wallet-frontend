/**
 * The scaling formulas both platforms share. The design reference is
 * iPhone 17 Pro Max, 440 x 956 points; each platform supplies how it reads
 * the screen (`scaling.ts` on the DOM, `scaling.native.ts` on React Native).
 *
 * @example
 * ```tsx
 * import { s, vs, ms } from '@salmon/shared';
 *
 * const styles = StyleSheet.create({
 *   container: {
 *     paddingHorizontal: s(24), // scales with the screen's width
 *     height: vs(60),           // scales with its height
 *     fontSize: ms(14),         // half of the linear scaling
 *     lineHeight: ms(20, 0.3),  // 30% of it
 *   },
 * });
 * ```
 */
export const DESIGN_WIDTH = 440;
export const DESIGN_HEIGHT = 956;

interface Scalers {
  /** Horizontal: widths, horizontal padding, margins and gaps. */
  s: (size: number) => number;
  /** Vertical: heights, vertical padding, margins and gaps. */
  vs: (size: number) => number;
  /**
   * Moderate: font sizes and anything that should not follow the screen all
   * the way. `factor` is the share of the linear scaling applied, 0 to 1.
   */
  ms: (size: number, factor?: number) => number;
  /** Moderate, on the vertical axis. */
  mvs: (size: number, factor?: number) => number;
}

export function createScalers(getDimensions: () => { width: number; height: number }): Scalers {
  const s = (size: number): number => (getDimensions().width / DESIGN_WIDTH) * size;
  const vs = (size: number): number => (getDimensions().height / DESIGN_HEIGHT) * size;
  const ms = (size: number, factor = 0.5): number => size + (s(size) - size) * factor;
  const mvs = (size: number, factor = 0.5): number => size + (vs(size) - size) * factor;
  return { s, vs, ms, mvs };
}
