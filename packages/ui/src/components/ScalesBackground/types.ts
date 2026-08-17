import type { CSSProperties } from 'react';

/**
 * The three — and only three — sanctioned appearances of the scales motif.
 *
 * The motif is the water column's texture and its density is a depth cue, so
 * each appearance is a different distance from the eye rather than a different
 * decoration. A fourth use is a bug; see `The Scales Exclusion Rule`.
 */
export type ScalesVariant =
  /** On `depth.column`, the full height of its parent. 3.2x, thinning. */
  | 'deepField'
  /**
   * @deprecated No call site remains. Salmon fills carry `FleshBackground`
   * instead — a filled button is mass, not surface, and the seigaiha tile is
   * taller than a pill, so it read as a stamp applied on top rather than as
   * the button's own material. Kept because this union is a public export
   * with three apps behind it.
   */
  | 'fish';

export interface ScalesBackgroundProps {
  /** Which of the sanctioned appearances to draw. Defaults to `deepField`. */
  variant?: ScalesVariant;
  strokeColor?: string;
  strokeWidth?: number;
  patternHeight?: number;
  topOffset?: number;
  style?: CSSProperties;
  className?: string;
}
