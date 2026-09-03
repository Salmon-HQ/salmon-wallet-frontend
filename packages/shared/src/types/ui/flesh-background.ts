/**
 * FleshBackground — the myoseptal texture of salmon flesh, for salmon fills.
 * Both platforms draw `fleshTile` / `fleshFills` from the theme, so the
 * geometry cannot drift between them.
 */
export interface FleshBackgroundPropsBase<TStyle> {
  /**
   * The band colour. Must be a *pale* tint of the fill it sits on — a darker
   * band would let the texture cut label contrast instead of only raising it.
   * Defaults to the active theme's `flesh.band`.
   */
  color?: string;
  /**
   * Tile scale. 1 is tuned for a 44-64px pill; below ~0.7 the bands crowd and
   * start to read as stripes rather than as material.
   */
  scale?: number;
  /** Overall strength. The default is deliberately near the visibility floor. */
  opacity?: number;
  /** Additional styles for the container, which otherwise fills its parent. */
  style?: TStyle;
}
