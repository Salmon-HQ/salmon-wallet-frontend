/**
 * DepthBackground — the water column's ground, a depth ramp read from
 * `water.gradient`. Painted once, never moved; both platforms draw it from
 * the same token, so neither owns the drawing.
 */
export interface DepthBackgroundPropsBase<TStyle> {
  /** Additional styles for the container, which otherwise fills its parent. */
  style?: TStyle;
}
