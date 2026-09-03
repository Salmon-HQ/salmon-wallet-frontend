/**
 * ScalesBackground — the seigaiha fish-scale motif, at one of its sanctioned
 * scales. Density is a depth cue, so each appearance is a distance from the
 * eye rather than a decoration; a fourth use is a bug (The Scales Exclusion
 * Rule, DESIGN.md §The water column).
 */
export type ScalesVariant =
  /** On the water column, the full height of its parent. Thinning downward. */
  | 'deepField'
  /**
   * @deprecated No call site remains. Salmon fills carry `FleshBackground`
   * instead — a filled button is mass, not surface.
   */
  | 'fish'
  /**
   * @deprecated No call site remains — the refraction strip was retired into
   * the (now also retired) membrane field.
   */
  | 'refraction';

export interface ScalesBackgroundPropsBase<TStyle> {
  /** Which of the sanctioned appearances to draw. Defaults to `deepField`. */
  variant?: ScalesVariant;
  /**
   * Additional styles for the container. It fills its parent, so *where* the
   * motif may appear is decided by which parent it is mounted in.
   */
  style?: TStyle;
}
