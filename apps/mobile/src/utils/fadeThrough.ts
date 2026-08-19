/**
 * Fade-through — the mobile expression of a top-level content swap.
 *
 * Material Design's "fade through" pattern: when content is replaced under a
 * frame that stays put (Home's per-chain content under the balance card and
 * chain selector), the outgoing view fades out fast and the incoming one
 * fades in while settling from `scale(0.97)`. Nothing travels, so the swap
 * reads as an arrival instead of a cut.
 *
 * Durations and curves come from the shared vocabulary: `flick` (90ms,
 * `sink`) for the exit, `contentSwap` (200ms, `current`) for the entrance —
 * exit faster than enter, as everywhere else in the system.
 *
 * Reduce motion: both helpers return `undefined`, which hands Reanimated no
 * layout animation at all — the swap is the instant cut it was before.
 */
import { motionMs } from '@salmon/shared';
import { withTiming, type EntryExitAnimationFunction } from 'react-native-reanimated';

import { curve, timing } from './motion';

/** Where the incoming content settles from. Felt, not seen — same 0.97 the route transition uses. */
export const FADE_THROUGH_ENTER_SCALE = 0.97;

/**
 * Entering half: fade in + settle from `scale(0.97)` over `contentSwap`.
 *
 * @param isReduceMotionEnabled From Reanimated's `useReducedMotion()`.
 * @returns An `entering` prop for `Animated.View`, or `undefined` for a cut.
 */
export function fadeThroughEntering(
  isReduceMotionEnabled: boolean
): EntryExitAnimationFunction | undefined {
  if (isReduceMotionEnabled) return undefined;
  const config = timing(motionMs.contentSwap, false);
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ scale: FADE_THROUGH_ENTER_SCALE }] },
      animations: {
        opacity: withTiming(1, config),
        transform: [{ scale: withTiming(1, config) }],
      },
    };
  };
}

/**
 * Exiting half: fade out over a `flick` on the accelerating `sink` curve —
 * gone before the incoming content finishes arriving.
 *
 * @param isReduceMotionEnabled From Reanimated's `useReducedMotion()`.
 * @returns An `exiting` prop for `Animated.View`, or `undefined` for a cut.
 */
export function fadeThroughExiting(
  isReduceMotionEnabled: boolean
): EntryExitAnimationFunction | undefined {
  if (isReduceMotionEnabled) return undefined;
  const config = timing(motionMs.flick, false, curve.sink);
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 1 },
      animations: { opacity: withTiming(0, config) },
    };
  };
}
