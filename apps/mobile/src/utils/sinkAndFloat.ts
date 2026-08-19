/**
 * The sink and the float — the mobile expression of a content swap, spoken in
 * the water's own vertical.
 *
 * The verb (owner, 2026-08-18): **leaving is sinking** — the outgoing content
 * drops `SINK_FLOAT_TRAVEL` accelerating on the `sink` curve, its opacity
 * falling the way light falls with depth (slowly at first, fast at the end —
 * the same accelerating bezier, never linear). **Arriving is floating** — the
 * incoming content rises the same distance decelerating on `current`
 * (buoyancy: no overshoot, per the system rule that nothing bounces), fading
 * in as it comes up. It grew out of the fade-through this file replaces: the
 * fade and the `scale(0.97)` settle survive, and the travel is what is new —
 * the swap now has the direction the rest of the system already speaks (the
 * wait goes down, The Surfacing comes up).
 *
 * Durations and curves come from the shared vocabulary: `ebb` (180ms, `sink`)
 * for the exit, `drift` (280ms, `current`) for the entrance — exit faster
 * than enter, as everywhere else in the system.
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
 * How far things travel, dp. The owner's band is 12–16; dial it here and every
 * consumer (home's chain swap, onboarding, the swap steps, the wait's exit)
 * moves together.
 */
export const SINK_FLOAT_TRAVEL = 12;
/** Where the incoming content settles from. Felt, not seen — same 0.97 the route transition uses. */
export const FLOAT_ENTER_SCALE = 0.97;
/** The float's length — `drift`, the system's element-enter window. */
export const FLOAT_IN_MS = motionMs.drift;
/** The sink's length — `ebb`, the system's element-exit window. Shorter than the float, always. */
export const SINK_OUT_MS = motionMs.ebb;
/**
 * The beat between the sink and the float (owner, 2026-08-18): without it the
 * two halves overlap and the eye never reads the double gesture. The float
 * waits out the whole sink **plus** a short perceptible pause (90ms — under
 * ~80 the beat vanishes, over ~150 it reads as lag). Tunable: the owner
 * calibrates on the device.
 *
 * Pass it as `delayMs` **only where something actually sinks first** — a
 * keyed content swap (home's chain switch), a step change with a real exit.
 * On arrivals with no prior sink (first mount of a screen, the wait's own
 * float) the same delay is pure lag; those sites pass nothing.
 */
export const FLOAT_DELAY_MS = SINK_OUT_MS + 90;

/** Per-call overrides, for a consumer whose geometry wants its own numbers. */
export interface SinkFloatOptions {
  /** Travel distance in dp. Defaults to {@link SINK_FLOAT_TRAVEL}. */
  distance?: number;
  /** Travel duration in ms — pass a `motionMs` token, never a literal. */
  durationMs?: number;
  /**
   * Wait this long before the float begins. Defaults to 0 — see
   * {@link FLOAT_DELAY_MS} for when (and when not) to pass it.
   */
  delayMs?: number;
}

/**
 * Entering half: rise `distance` decelerating (`current` — buoyancy, no
 * overshoot) while fading in and settling from `scale(0.97)`.
 *
 * @param isReduceMotionEnabled From Reanimated's `useReducedMotion()`.
 * @returns An `entering` prop for `Animated.View`, or `undefined` for a cut.
 */
export function floatEntering(
  isReduceMotionEnabled: boolean,
  { distance = SINK_FLOAT_TRAVEL, durationMs = FLOAT_IN_MS, delayMs = 0 }: SinkFloatOptions = {}
): EntryExitAnimationFunction | undefined {
  if (isReduceMotionEnabled) return undefined;
  const config = timing(durationMs, false);
  return () => {
    'worklet';
    const rise = (toValue: number) =>
      delayMs > 0 ? withDelay(delayMs, withTiming(toValue, config)) : withTiming(toValue, config);
    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateY: distance }, { scale: FLOAT_ENTER_SCALE }],
      },
      animations: {
        opacity: rise(1),
        transform: [{ translateY: rise(0) }, { scale: rise(1) }],
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
