import type { CSSProperties } from 'react';

/**
 * The sanctioned appearances of the scales motif — these and no others.
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
  | 'fish'
  /**
   * The refraction strip — the 24px band clipped to the top edge of every
   * thermocline (membrane) surface. Same 0.5× geometry as the membrane
   * field, but the ink is the horizontal `scales.refractionSweep` gradient;
   * the band's 0.08 opacity is applied by the mounting container. Part of the material —
   * never mounted free-standing.
   */
  | 'refraction'
  /**
   * The membrane field — the thermocline's own texture, edge to edge. Same
   * 0.5× geometry as the refraction strip but a flat *dark* ink
   * (`scales.membraneFieldStroke`; owner, 2026-08-19: dark scales, one
   * continuous field, no brighter band). Part of the material — never
   * mounted free-standing.
   */
  | 'membrane';

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
