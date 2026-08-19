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
import { motionMs } from '@salmon/shared';
import { withDelay, withTiming, type EntryExitAnimationFunction } from 'react-native-reanimated';

import { curve, timing } from './motion';

/**
 * How far things travel, dp. Owner's band is 24–40 (12–16 read as a nudge,
 * not as depth); dial it here and every consumer (home's chain swap,
 * onboarding, the swap steps, the wait's exit) moves together.
 */
export const SINK_FLOAT_TRAVEL = 28;
/**
 * Where the incoming content settles from. 0.96 rather than the route
 * transition's 0.97: a touch more pressure at depth, still felt rather than
 * seen — below ~0.95 it starts to read as zoom.
 */
export const FLOAT_ENTER_SCALE = 0.96;
/**
 * The float's length — drift×2 (560ms). Owner's band: 450–650. Long enough
 * to sit on the water's clock (between `rise` 420 and `tide` 720), short
 * enough that a step change never feels like The Surfacing.
 */
export const FLOAT_IN_MS = motionMs.drift * 2;
/**
 * The sink's length — tide/2 (360ms). Owner's band: 320–400. Shorter than
 * the float, always — but no longer `ebb`: water swallows things at its own
 * speed.
 */
export const SINK_OUT_MS = motionMs.tide / 2;
/**
 * The beat between the sink and the float (owner, 2026-08-18): without it the
 * two halves overlap and the eye never reads the double gesture. The float
 * waits out the whole sink **plus** a short perceptible pause (band 90–120ms
 * — under ~80 the beat vanishes, over ~150 it reads as lag). Tunable: the
 * owner calibrates on the device.
 *
 * Pass it as `delayMs` **only where something actually sinks first** — a
 * keyed content swap (home's chain switch), a step change with a real exit.
 * On arrivals with no prior sink (first mount of a screen, the wait's own
 * float) the same delay is pure lag; those sites pass nothing.
 */
export const FLOAT_DELAY_MS = SINK_OUT_MS + 90;
/**
 * The step between bands when a surface arrives in pieces (onboarding's
 * float region, the swap review). Inherited from the Surfacing's chrome
 * stagger (`motionMs.stagger`, 24ms); owner's band is 24–40. Small groups
 * only — never more than 4–5 steps.
 */
export const SINK_FLOAT_STAGGER_MS = motionMs.stagger;

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
  { distance = SINK_FLOAT_TRAVEL, durationMs = FLOAT_IN_MS, delayMs = 0 }: SinkFloatOptions = {}
): EntryExitAnimationFunction | undefined {
  if (isReduceMotionEnabled) return undefined;
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
        transform: [{ translateY: distance }, { scale: FLOAT_ENTER_SCALE }],
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
  { distance = SINK_FLOAT_TRAVEL, durationMs = SINK_OUT_MS }: SinkFloatOptions = {}
): EntryExitAnimationFunction | undefined {
  if (isReduceMotionEnabled) return undefined;
  const config = timing(durationMs, false, curve.sink);
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
