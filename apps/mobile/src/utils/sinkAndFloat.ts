/**
 * The sink and the float — the mobile expression of a content swap, spoken in
 * the water's own vertical.
 *
 * The verb: **leaving is sinking** — the outgoing content recedes to
 * `SINK_EXIT_SCALE` and drops `SINK_FLOAT_TRAVEL` accelerating on the `sink`
 * curve, its opacity falling the way light falls with depth. **Arriving is
 * floating** — the incoming content rises the same distance from
 * `FLOAT_ENTER_SCALE` and comes to rest on `settle` (buoyancy: no overshoot,
 * per the system rule that nothing bounces).
 *
 * Scale carries the depth and travel is only an accent — the re-weighting
 * DESIGN.md records under §The verb reads as depth, not as a slide. The
 * geometry's derivation and every tuning band live with the constants in
 * `@salmon/shared` (`motion/sinkFloat`); this module only draws them.
 *
 * Recalibrated against the water's own clock: the verb used to run on
 * generic-UI numbers (`ebb` 180 / `drift` 280, 12dp) while the water in this
 * system runs at 700–2000ms — the logo's return is 720, the wavefront's
 * crossing 2000. At that ratio the swap read as a fade with a direction, not
 * as something leaving and entering water. The acceptance bar: *"tiene que
 * parecer que sale del agua."* So the clock, the distance and the opacity are
 * all re-derived from The Surfacing
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
  CHROME_SCALE,
  FLOAT_DELAY_MS,
  FLOAT_ENTER_SCALE,
  FLOAT_IN_MS,
  SINK_EXIT_SCALE,
  SINK_FLOAT_STAGGER_MS,
  SINK_FLOAT_TRAVEL,
  SINK_OUT_MS,
} from '@salmon/shared';
import { withDelay, withTiming, type EntryExitAnimationFunction } from 'react-native-reanimated';

import { curve, timing } from './motion';

/**
 * The verb's numbers — distance, the two depths, chrome's shallower depth, the
 * two clocks, the beat and the stagger — are owned by `@salmon/shared`
 * (`motion/sinkFloat`), because the verb is drawn twice: Reanimated here, CSS
 * animations in `packages/ui`. Each constant's derivation and its tuning band
 * are documented there.
 *
 * Re-exported so mobile consumers keep importing them from the module that
 * also hands them the animations.
 */
export {
  CHROME_SCALE,
  FLOAT_DELAY_MS,
  FLOAT_ENTER_SCALE,
  FLOAT_IN_MS,
  SINK_EXIT_SCALE,
  SINK_FLOAT_STAGGER_MS,
  SINK_FLOAT_TRAVEL,
  SINK_OUT_MS,
};

/** Per-call overrides, for a consumer whose geometry wants its own numbers. */
export interface SinkFloatOptions {
  /** Travel distance in dp. Defaults to {@link SINK_FLOAT_TRAVEL}. */
  distance?: number;
  /**
   * How deep this surface goes — the scale the float rises from and the sink
   * recedes to. Defaults to the content depths ({@link FLOAT_ENTER_SCALE} /
   * {@link SINK_EXIT_SCALE}); chrome passes {@link CHROME_SCALE}, which is
   * half as deep, so a header never out-speaks the content it frames.
   */
  scale?: number;
  /** Travel duration in ms — pass a `motionMs` token or a constant above, never a bare literal. */
  durationMs?: number;
  /**
   * Wait this long before the float begins. Defaults to 0 — see
   * {@link FLOAT_DELAY_MS} for when (and when not) to pass it.
   */
  delayMs?: number;
}

/**
 * Entering half: arrive from depth — the scale releases from
 * `FLOAT_ENTER_SCALE` and the small `distance` rises with it on `settle`
 * (buoyancy running out — the same damped landing as the Surfacing's amount,
 * no overshoot) while the light returns on `sink`'s accelerating bezier
 * (Beer–Lambert: slow, then fast at the end — see the module note).
 *
 * @param isReduceMotionEnabled From Reanimated's `useReducedMotion()`.
 * @returns An `entering` prop for `Animated.View`, or `undefined` for a cut.
 */
export function floatEntering(
  isReduceMotionEnabled: boolean,
  options: SinkFloatOptions = {}
): EntryExitAnimationFunction | undefined {
  if (isReduceMotionEnabled) return undefined;
  const {
    durationMs = FLOAT_IN_MS,
    delayMs = 0,
    distance = SINK_FLOAT_TRAVEL,
    scale: enterScale = FLOAT_ENTER_SCALE,
  } = options;
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
 * Exiting half: go away from the viewer — the scale recedes to
 * `SINK_EXIT_SCALE` on `settle` (a landing, not a drop: the recession is where
 * the content comes to rest, and nothing bounces) while the small `distance`
 * and the light both accelerate on `sink` — like light with depth, fast at the
 * end, never linear. Compositing over the water ramp keeps the tint.
 *
 * @param isReduceMotionEnabled From Reanimated's `useReducedMotion()`.
 * @returns An `exiting` prop for `Animated.View`, or `undefined` for a cut.
 */
export function sinkExiting(
  isReduceMotionEnabled: boolean,
  options: SinkFloatOptions = {}
): EntryExitAnimationFunction | undefined {
  if (isReduceMotionEnabled) return undefined;
  const {
    durationMs = SINK_OUT_MS,
    distance = SINK_FLOAT_TRAVEL,
    scale: exitScale = SINK_EXIT_SCALE,
  } = options;
  const config = timing(durationMs, false, curve.sink);
  const recede = timing(durationMs, false, curve.settle);
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
      animations: {
        opacity: withTiming(0, config),
        transform: [
          { translateY: withTiming(distance, config) },
          { scale: withTiming(exitScale, recede) },
        ],
      },
    };
  };
}
