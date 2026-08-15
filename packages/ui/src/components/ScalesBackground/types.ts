import type { CSSProperties } from 'react';

/**
 * The three — and only three — sanctioned appearances of the scales motif.
 *
 * The motif is the water column's texture and its density is a depth cue, so
 * each appearance is a different distance from the eye rather than a different
 * decoration. A fourth use is a bug; see `The Scales Exclusion Rule`.
 */
export type ScalesVariant =
  /** On `depth.column`, behind the balance header only. 3.2x, dissolving. */
  | 'deepField'
  /** Inside the primary CTA's salmon fill, and only there. 1.0x. */
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
