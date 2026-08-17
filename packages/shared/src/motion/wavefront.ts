/**
 * The wavefront — the timing of the wait's ripple, as a pure function.
 *
 * A wavefront is `f(t − d/c)`: one curve, delayed in proportion to the distance
 * from the origin. That is d'Alembert's solution, and it is also the definition
 * of a distance-based stagger. **A physically correct radial front needs no
 * shader, no WebGL and no native module — it needs a per-element delay
 * proportional to distance.** What a shader would add is not the front, it is
 * the deformation of each element's *interior*, and that costs a store release
 * on mobile (`react-native-svg` implements neither `FeTurbulence` nor
 * `FeDisplacementMap`; Skia is a native module and this app ships OTA updates
 * with `runtimeVersion.policy: appVersion`) for 3px of displacement.
 *
 * This module owns the arithmetic and nothing else, so the choreography is
 * testable without a renderer or a frame clock — the same pattern the mobile
 * Surfacing already uses in `surfacing.ts`. Each platform draws it twice:
 * Reanimated in `apps/mobile`, Emotion keyframes in `packages/ui`.
 *
 * Two properties are deliberate:
 *
 * - **The speed is a time, not px/s.** The front takes `WAVEFRONT_CROSS_MS`
 *   (`motionMs.rise`) to reach the farthest corner, whatever the surface is, so
 *   the same gesture reads the same in a 360px extension popup and on a 393×852
 *   phone. Marine snow is measured in px/s because it is *ambient*; the wave is
 *   measured in time because it is an *event*.
 * - **Amplitude falls off as 1/√d.** A circular (cylindrical) wave spreads its
 *   energy over a perimeter growing with d, so amplitude ∝ 1/√d. This is the
 *   difference between reading as one wave and reading as four things moving.
 *
 * @module motion/wavefront
 */

import { motionMs } from '../theme/durations';
import { componentSizes } from '../theme/spacing';

/** A point in the same coordinate system as the origin. Platform-measured. */
export interface WavefrontPoint {
  x: number;
  y: number;
}

/** The surface the front has to cross. */
export interface WavefrontBounds {
  width: number;
  height: number;
}

/** What one passenger needs in order to ride the front. */
export interface WavefrontPlan {
  /** When this passenger starts moving, ms after the emission. */
  delayMs: number;
  /** Effective displacement, px, after cylindrical attenuation. */
  amplitude: number;
  /** How long the front takes to pass this passenger. */
  durationMs: number;
}

/**
 * How long the front takes to reach the farthest corner. `motionMs.rise` — the
 * same window as a sheet or a route, because a front crossing the screen is the
 * same size of event.
 */
export const WAVEFRONT_CROSS_MS = motionMs.rise;

/**
 * One emission per `pulseCycle`. The front occupies `rise` of it and the rest
 * is stillness, which is what keeps a wait from becoming a show even though it
 * now loops for as long as the wait lasts.
 */
export const WAVEFRONT_PERIOD_MS = motionMs.pulseCycle;

/** How long the front takes to pass one passenger. */
export const WAVEFRONT_PASS_MS = motionMs.swell;

/**
 * Amplitude floor, px. Below a pixel the displacement is not rendered, and a
 * passenger that does not move is a hole in the front rather than a far one.
 */
export const WAVEFRONT_MIN_AMPLITUDE = 1;

/**
 * Distance from the origin to the farthest corner of `bounds`. Used as the
 * normaliser so the front always finishes crossing in `WAVEFRONT_CROSS_MS`
 * whatever the surface measures.
 */
export function wavefrontRadius(origin: WavefrontPoint, bounds: WavefrontBounds): number {
  const dx = Math.max(origin.x, bounds.width - origin.x);
  const dy = Math.max(origin.y, bounds.height - origin.y);
  return Math.hypot(dx, dy);
}

/**
 * Plan one passenger's ride.
 *
 * @param rider Centre of the passenger.
 * @param origin Centre of the emitter — the logo.
 * @param bounds The surface being crossed.
 * @param isReduceMotionEnabled Platform reduce-motion signal.
 * @returns `null` under reduce motion: nothing is started at all, rather than
 *   run instantly. A parallel mapping lives in the words and in the descent,
 *   not in a zero-length version of a motion the user cannot see.
 */
export function planWavefront(
  rider: WavefrontPoint,
  origin: WavefrontPoint,
  bounds: WavefrontBounds,
  isReduceMotionEnabled: boolean
): WavefrontPlan | null {
  if (isReduceMotionEnabled) return null;

  const rMax = wavefrontRadius(origin, bounds);
  if (!(rMax > 0)) return null;

  const distance = Math.hypot(rider.x - origin.x, rider.y - origin.y);
  const clamped = Math.min(distance, rMax);

  // 1/√(1 + d/d₀), with the near-field reference at half the radius. Equal to
  // the full amplitude at the origin (where 1/√d alone would diverge) and
  // asymptotically the cylindrical law once d is large.
  const nearField = rMax / 2;
  const attenuated = componentSizes.waveAmplitude / Math.sqrt(1 + clamped / nearField);

  return {
    delayMs: Math.round((WAVEFRONT_CROSS_MS * clamped) / rMax),
    amplitude: Math.max(WAVEFRONT_MIN_AMPLITUDE, attenuated),
    durationMs: WAVEFRONT_PASS_MS,
  };
}

/**
 * How long the closing wave takes to leave the screen — and therefore how long
 * the wait holds before it hands off to the receipt.
 *
 * The exit is **not** "wait out the pulse in flight". If the work resolves just
 * after an emission, waiting for that emission to clear adds up to a whole
 * `pulseCycle` of latency between a decision and its receipt, which a wallet
 * may not spend. Instead the loop is cancelled, the closing wave is emitted
 * immediately, and the handoff is at a fixed, testable time.
 *
 * Under reduce motion it is `ebb` alone: a user who cannot see the wave must
 * not be made to wait one out. The receipt arrives sooner, which is the point.
 */
export function wavefrontExitMs(isReduceMotionEnabled: boolean): number {
  return isReduceMotionEnabled ? motionMs.ebb : WAVEFRONT_CROSS_MS + motionMs.ebb;
}
