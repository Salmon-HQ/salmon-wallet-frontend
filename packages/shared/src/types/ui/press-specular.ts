import type { Testable } from './testable';

/**
 * The press specular — DESIGN.md §Shadow Vocabulary: "a 90ms 12%-opacity
 * radial at the touch point, 120px radius, `screen` blend" in `water.light`.
 *
 * The geometry is the contract. The press signal itself is not: on native it
 * is a Reanimated shared value driven by the gesture, on the DOM a boolean
 * from `usePressed()`, so each platform names its own inputs on top of this.
 */
export const SPECULAR_RADIUS = 120;
export const SPECULAR_OPACITY = 0.12;

/** Decorative: never a hit target, never announced. */
export interface PressSpecularPropsBase extends Testable {}
