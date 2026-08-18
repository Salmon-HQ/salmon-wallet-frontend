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
 * The front no longer carries passengers. Product, 2026-08: *"Unlocking Wallet
 * sigue moviéndose y el div de tip también, cuando te dije que no debería"* —
 * the words are stationary and the mark is the only thing that moves. What the
 * module owns now is the *rhythm*: the mark sinks, the front is emitted at the
 * bottom of the sink, and it clears the screen exactly `WAVEFRONT_REST_MS`
 * before the next impact. See {@link wavefrontCalmMs}.
 *
 * Two properties are deliberate:
 *
 * - **The speed is a time, not px/s.** The front takes `WAVEFRONT_CROSS_MS`
 *   to reach the farthest corner, whatever the surface is, so
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

/** What one passenger would need in order to ride the front. */
export interface WavefrontPlan {
  /**
   * When the front *arrives* at this passenger, ms after the emission. This is
   * `d/c` — the quantity a rider's whole choreography was built on.
   */
  delayMs: number;
  /** Effective displacement, px, after cylindrical attenuation. */
  amplitude: number;
  /** How long the front takes to pass this passenger. */
  durationMs: number;
}

/**
 * How long the front takes to reach the farthest corner of the surface.
 *
 * **1400ms, and the number is set by what the eye can follow.** It was
 * `motionMs.rise` (420ms), chosen because a front crossing the screen is the
 * same *size* of event as a sheet presenting. On a real phone that was
 * unwatchable, and the reason is measurable rather than aesthetic: the distance
 * from the centre of a 393×852pt phone to its corner is ~470pt, which at a
 * ~30cm viewing distance subtends roughly 19° of visual angle. Crossing it in
 * 420ms is ~45°/s — **above the ceiling of smooth pursuit** (comfortable
 * tracking tops out around 30°/s), so the eye cannot follow the crest and has
 * to saccade to where it has already gone. What the viewer perceives is not a travelling
 * ridge but a flash and an after-image.
 *
 * At 1400ms the same 19° is covered at ~13°/s — the middle of the band the eye
 * tracks smoothly, so the crest is *followed* rather than caught. It is
 * deliberately far outside the `flick`…`tide` vocabulary: those are transitions
 * between states, and this is a physical event crossing a surface.
 *
 * Still a *time* and not a speed in px/s, so the gesture reads the same in a
 * 360px extension popup and on a phone.
 */
export const WAVEFRONT_CROSS_MS = 1400;

/**
 * Still water between one front leaving the screen and the next being emitted.
 *
 * Product, 2026-08: *"no quiero que parezca un radar."* A pulse that fires the
 * instant the previous front clears is a metronome however slow it is; the
 * pause is what makes the loop read as a disturbance settling rather than as a
 * mechanism running. It is also what keeps **one wave in flight at a time**,
 * which is the model product approved: the mark does not emit again until the
 * last front has left the screen.
 */
export const WAVEFRONT_REST_MS = 600;

/**
 * One emission per period: the crossing plus the rest. Derived, so slowing the
 * front cannot silently start overlapping two fronts.
 */
export const WAVEFRONT_PERIOD_MS = WAVEFRONT_CROSS_MS + WAVEFRONT_REST_MS;

/**
 * How long the front takes to pass one passenger — `drift`.
 *
 * Nothing rides the front any more (product, 2026-08: the words and the tips
 * must not move at all), so this is now only the pass duration
 * {@link planWavefront} reports. It is kept with that function, for the same
 * reason.
 */
export const WAVEFRONT_PASS_MS = motionMs.drift;

/**
 * How long the mark takes to sink, and therefore **how late the front is**.
 *
 * The wave is not on a parallel timer: it is born at the *bottom* of the sink,
 * at the moment of impact. So the emission is delayed by exactly the descent,
 * and one constant keeps the two in step — a change to the sink moves the ring
 * with it rather than desynchronising them.
 *
 * `flick`, the shortest token in the vocabulary, because an impact is the one
 * gesture that may be abrupt. Product, 2026-08: *"El logo sigue saltando y
 * bajando, no bajando y volviendo a su lugar."*
 */
export const WAVEFRONT_SINK_MS = motionMs.flick;

/**
 * How long the mark takes to come back up. `tide` — eight times the descent,
 * and **monotonic**: a spring that overshoots is the jump product had just had
 * removed from the words.
 */
export const WAVEFRONT_RECOVER_MS = motionMs.tide;

/**
 * Still water between the front leaving the screen and the next impact.
 *
 * **Derived, never typed in.** The trough is at `WAVEFRONT_SINK_MS`, the front
 * it emits clears the corner one crossing later, and the next trough is one
 * period after this one — so the gap is whatever `WAVEFRONT_REST_MS` is, and it
 * stays that way when the crossing changes. That identity is the rhythm product
 * asked for (*"the next sink lands as the previous wave leaves the screen"*),
 * and asserting it is cheaper than re-deriving it by eye on a device.
 */
export function wavefrontCalmMs(): number {
  const frontClearsAt = WAVEFRONT_SINK_MS + WAVEFRONT_CROSS_MS;
  const nextTroughAt = WAVEFRONT_PERIOD_MS + WAVEFRONT_SINK_MS;
  return nextTroughAt - frontClearsAt;
}

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
 * **Nothing calls this today.** The riders were removed in 2026-08 (product:
 * *"Unlocking Wallet sigue moviéndose y el div de tip también, cuando te dije
 * que no debería"* — the title, subtitle and tips are stationary now). It is
 * kept, and kept tested, because the two things it encodes are expensive to
 * rediscover and cheap to hold: **`d/c` — the d'Alembert delay that makes a
 * distance-proportional stagger a physically correct radial front** — and
 * **the 1/√d cylindrical attenuation**, which is the difference between reading
 * as one wave and reading as four things moving. Product's own words on the
 * removal were *"al menos por ahora"*.
 *
 * What was *not* kept is `startMs`, the half-a-pass centring that made a rider
 * peak as the crest passed it: it describes a passenger's curve rather than the
 * wave, so it has no meaning without one.
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

  const delayMs = Math.round((WAVEFRONT_CROSS_MS * clamped) / rMax);

  return {
    delayMs,
    amplitude: Math.max(WAVEFRONT_MIN_AMPLITUDE, attenuated),
    durationMs: WAVEFRONT_PASS_MS,
  };
}

/**
 * The hard upper bound on the handoff — how long the wait may take to leave,
 * whatever the animation does.
 *
 * A wallet may never be trapped on a loading screen by an animation that failed
 * to complete, so every caller arms a timer at this value and whichever of the
 * timer and the animation callback arrives first wins. It is the worst case of
 * {@link planWavefrontExit}: a front emitted the instant before the work
 * resolved has a whole crossing left to travel, and then the ground ebbs.
 *
 * Under reduce motion it is `ebb` alone: a user who cannot see the wave must
 * not be made to wait one out. The receipt arrives sooner, which is the point.
 */
export function wavefrontExitMs(isReduceMotionEnabled: boolean): number {
  return isReduceMotionEnabled ? motionMs.ebb : WAVEFRONT_CROSS_MS + motionMs.ebb;
}

/** How the wait leaves, given how long it has been on screen. */
export interface WavefrontExitPlan {
  /**
   * How long the ground holds before it starts to ebb: the time the front
   * still in flight needs to finish leaving the screen. `0` when the water is
   * already calm.
   */
  holdMs: number;
  /** Total time from the work resolving to the caller's handoff. */
  exitMs: number;
}

/**
 * When the wait may hand off — **not before the water is calm**.
 *
 * Product, 2026-08: *"que no se pase a la siguiente screen hasta que la última
 * onda salga de la pantalla, es decir, justo cuando el agua está calma. Esto
 * aplica siempre."*
 *
 * This replaces a fixed constant, and it replaces it in both directions:
 *
 * - A front **in flight finishes crossing**. The previous model cancelled the
 *   emission and started a fresh closing wave, which cut the visible front in
 *   half at the moment the user was most likely to be watching it.
 * - **Calm water hands off immediately.** Because one and only one front is
 *   ever in flight (see {@link WAVEFRONT_REST_MS}), a wait that resolves during
 *   the rest has nothing to wait for, and making it sit out a whole invented
 *   crossing would be latency between a decision and its receipt with nothing
 *   on screen to justify it.
 *
 * The phase is derived from elapsed time rather than read off an animation, so
 * this stays a pure function of two numbers and is testable without a frame
 * clock — the same reason the rest of this module exists.
 *
 * @param elapsedMs How long the wave has been looping when the work resolved.
 * @param isReduceMotionEnabled Platform reduce-motion signal. Keeps the short
 *   path: `ebb`, with no wave to wait out.
 */
export function planWavefrontExit(
  elapsedMs: number,
  isReduceMotionEnabled: boolean
): WavefrontExitPlan {
  if (isReduceMotionEnabled) return { holdMs: 0, exitMs: motionMs.ebb };

  // The front is in flight over `[SINK, SINK + CROSS)` of the period, because
  // it is emitted at the trough of the sink rather than at the top of the
  // period. Before the trough there is no wave on the screen yet — the water is
  // calm and the mark is on its way down — so that phase hands off at once,
  // which also keeps the worst case at one whole crossing.
  const phase = elapsedMs > 0 ? elapsedMs % WAVEFRONT_PERIOD_MS : 0;
  const holdMs =
    phase < WAVEFRONT_SINK_MS
      ? 0
      : Math.max(0, Math.round(WAVEFRONT_SINK_MS + WAVEFRONT_CROSS_MS - phase));

  return { holdMs, exitMs: holdMs + motionMs.ebb };
}
