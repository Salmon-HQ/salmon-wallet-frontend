/**
 * The sink and the float — the mobile expression of a content swap, spoken in
 * the water's own vertical.
 *
 * The verb (owner, 2026-08-18): **leaving is sinking** — the outgoing content
 * drops `SINK_FLOAT_TRAVEL` accelerating on the `sink` curve, its opacity
 * falling the way light falls with depth. **Arriving is floating** — the
 * incoming content rises the same distance and comes to rest on `settle`
 * (buoyancy: no overshoot, per the system rule that nothing bounces).
 *
 * Recalibrated against the water's own clock (owner, 2026-08-18): the verb
 * used to run on generic-UI numbers (`ebb` 180 / `drift` 280, 12dp) while the
 * water in this system runs at 700–2000ms — the logo's return is 720, the
 * wavefront's crossing 2000. At that ratio the swap read as a fade with a
 * direction, not as something leaving and entering water. The acceptance bar:
 * *"tiene que parecer que sale del agua."* So the clock, the distance and the
 * opacity are all re-derived from The Surfacing
 * (`TransactionSuccessScreen/surfacing.ts`, `packages/shared/src/motion`)
 * rather than from any generic motion spec:
 *
 * - **Viscosity.** The float takes `FLOAT_IN_MS` (drift×2 — the band the
 *   owner set is 450–650); the sink takes `SINK_OUT_MS` (tide/2, band
 *   320–400) — shorter, but still viscous, accelerating exactly as the
 *   logo's own sink does.
 * - **Beer–Lambert light.** Opacity is not linear in time. `depthField`
 *   computes a particle's opacity as `exp(-μ·depth)`: as something rises the
 *   light comes back slowly at first and fast at the end. The entering
 *   opacity therefore runs on the accelerating `sink` bezier — the
 *   vocabulary's closest curve to that exponential — while the *travel* runs
 *   on `settle`, the long damped tail the Surfacing's amount lands on. The
 *   combination is what makes the start read slow (the thing is moving but
 *   barely lit) and the arrival heavily damped. Sinking is the mirror: the
 *   light goes out accelerating, on the same curve as the drop.
 *
 * Every number below is a **named tunable**: the owner calibrates by eye on
 * the device, so distance and duration are also per-call overrides.
 *
 * Reduce motion: both helpers return `undefined`, which hands Reanimated no
 * layout animation at all — the swap is an instant cut.
 */
import {
  FLOAT_DELAY_MS,
  FLOAT_ENTER_SCALE,
  FLOAT_IN_MS,
  SINK_FLOAT_STAGGER_MS,
  SINK_FLOAT_TRAVEL,
  SINK_OUT_MS,
} from '@salmon/shared';
import { withDelay, withTiming, type EntryExitAnimationFunction } from 'react-native-reanimated';

import { verbDepth } from '../debug/verbDepth';
import { curve, timing } from './motion';

/**
 * The verb's numbers — distance, entering scale, the two clocks, the beat and
 * the stagger — are owned by `@salmon/shared` (`motion/sinkFloat`), because
 * the verb is drawn twice: Reanimated here, CSS animations in `packages/ui`.
 * Each constant's derivation and its tuning band are documented there.
 *
 * Re-exported so mobile consumers keep importing them from the module that
 * also hands them the animations.
 */
export {
  FLOAT_DELAY_MS,
  FLOAT_ENTER_SCALE,
  FLOAT_IN_MS,
  SINK_FLOAT_STAGGER_MS,
  SINK_FLOAT_TRAVEL,
  SINK_OUT_MS,
};

/*
 * ——— The `pushback` re-weighting (behind `debug/verbDepth`) ———
 *
 * Diagnosis: in the shipped verb, translation dominates and there is no scale
 * on the exit, so the swap reads as a Y-slide. Scale is the Z cue (Material
 * shared-Z-axis, iOS sheet push-back, aerial perspective — DESIGN.md is the
 * authority). Pushback re-weights the same verb: scale carries the depth,
 * travel shrinks to a buoyancy accent. Clocks, curves, the beat and the
 * stagger are the shared ones above — only the geometry changes.
 */

/**
 * Pushback travel, dp — the buoyancy accent, no longer the carrier.
 * Band 0–10: at 0 the swap is pure depth (may read as a crossfade-zoom),
 * above ~10 the slide starts to compete with the scale again.
 */
export const PUSHBACK_TRAVEL = 8;
/**
 * Where the outgoing content recedes to — the push-back itself.
 * Band 0.88–0.93: above ~0.93 the recession is too subtle to out-speak the
 * travel; below ~0.88 it reads as a shrink, not a depth.
 */
export const PUSHBACK_SINK_SCALE = 0.9;
/**
 * Where the incoming content arrives from. 0.90 = arrival from depth (small
 * → full, the mirror of the sink — one continuous Z axis). The alternative
 * worth an eye: 1.06 = arrival from the viewer's side (large → full), the
 * Material shared-Z-axis pairing where old and new pass each other.
 */
export const PUSHBACK_ENTER_SCALE = 0.9;

/** Per-call overrides, for a consumer whose geometry wants its own numbers. */
export interface SinkFloatOptions {
  /** Travel distance in dp. Defaults to {@link SINK_FLOAT_TRAVEL}. */
  distance?: number;
  /** Travel duration in ms — pass a `motionMs` token or a constant above, never a bare literal. */
  durationMs?: number;
  /**
   * Wait this long before the float begins. Defaults to 0 — see
   * {@link FLOAT_DELAY_MS} for when (and when not) to pass it.
   */
  delayMs?: number;
}

/**
 * Entering half: rise `distance` on `settle` (buoyancy running out — the same
 * damped landing as the Surfacing's amount, no overshoot) while the light
 * returns on `sink`'s accelerating bezier (Beer–Lambert: slow, then fast at
 * the end — see the module note) and the scale releases from 0.96.
 *
 * @param isReduceMotionEnabled From Reanimated's `useReducedMotion()`.
 * @returns An `entering` prop for `Animated.View`, or `undefined` for a cut.
 */
export function floatEntering(
  isReduceMotionEnabled: boolean,
  options: SinkFloatOptions = {}
): EntryExitAnimationFunction | undefined {
  if (isReduceMotionEnabled) return undefined;
  const { durationMs = FLOAT_IN_MS, delayMs = 0 } = options;
  // Under `pushback` the default travel is the accent, and the entering scale
  // is the arrival from depth; a per-call `distance` override still maps onto
  // the travel in both variants — the scale stays the verb's own.
  const isPushback = verbDepth === 'pushback';
  const distance = options.distance ?? (isPushback ? PUSHBACK_TRAVEL : SINK_FLOAT_TRAVEL);
  const enterScale = isPushback ? PUSHBACK_ENTER_SCALE : FLOAT_ENTER_SCALE;
  // Travel and light on their own curves — one physical event, two media.
  const travel = timing(durationMs, false, curve.settle);
  const light = timing(durationMs, false, curve.sink);
  return () => {
    'worklet';
    const rise = (toValue: number, config: typeof travel) =>
      delayMs > 0 ? withDelay(delayMs, withTiming(toValue, config)) : withTiming(toValue, config);
    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateY: distance }, { scale: enterScale }],
      },
      animations: {
        opacity: rise(1, light),
        transform: [{ translateY: rise(0, travel) }, { scale: rise(1, travel) }],
      },
    };
  };
}

/**
 * Exiting half: drop `distance` accelerating on `sink`, opacity falling on the
 * same curve — like light with depth, fast at the end, never linear.
 *
 * @param isReduceMotionEnabled From Reanimated's `useReducedMotion()`.
 * @returns An `exiting` prop for `Animated.View`, or `undefined` for a cut.
 */
export function sinkExiting(
  isReduceMotionEnabled: boolean,
  options: SinkFloatOptions = {}
): EntryExitAnimationFunction | undefined {
  if (isReduceMotionEnabled) return undefined;
  const { durationMs = SINK_OUT_MS } = options;
  const config = timing(durationMs, false, curve.sink);
  if (verbDepth === 'pushback') {
    // The outgoing recedes: scale settles to PUSHBACK_SINK_SCALE (the
    // settle-family curve — a landing, not a drop) while the small travel and
    // the light run the sink curve unchanged. Compositing over the water ramp
    // stays the tint. A per-call `distance` override maps onto the travel.
    const distance = options.distance ?? PUSHBACK_TRAVEL;
    const recede = timing(durationMs, false, curve.settle);
    return () => {
      'worklet';
      return {
        initialValues: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
        animations: {
          opacity: withTiming(0, config),
          transform: [
            { translateY: withTiming(distance, config) },
            { scale: withTiming(PUSHBACK_SINK_SCALE, recede) },
          ],
        },
      };
    };
  }
  const distance = options.distance ?? SINK_FLOAT_TRAVEL;
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
      animations: {
        opacity: withTiming(0, config),
        transform: [{ translateY: withTiming(distance, config) }],
      },
    };
  };
}
