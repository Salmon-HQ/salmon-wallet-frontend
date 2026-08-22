/**
 * The "Current" motion vocabulary, expressed for React Native.
 *
 * `packages/shared/src/theme/durations.ts` owns the vocabulary — the
 * `flick`…`tide` ramp, the four curves, and `resolveMotionMs`. This module is
 * the mobile *expression* of it and invents nothing: it turns the shared
 * curves' four coefficients into Reanimated `Easing` objects once, and gives
 * call sites a single call that already carries the reduce-motion decision.
 *
 * Why the wrapper exists at all: every `withTiming` needs a duration *and* a
 * curve *and* the reduce-motion resolution, and repeating those three at
 * twenty call sites is how a codebase ends up with 100/150/200/250/300/350ms
 * again. One helper keeps the decision in one place.
 *
 * Reduce-motion signal: `useReducedMotion()` from Reanimated, which reads the
 * same `AccessibilityInfo` state on both platforms and keeps it on the UI
 * thread. Pass its boolean in; this module stays a pure function of it so it
 * can be tested without a renderer.
 */
import { motionEasing, resolveMotionMs } from '@salmon/shared';
import { Easing, type EasingFunctionFactory } from 'react-native-reanimated';

/**
 * The four curves, instantiated once. `motionEasing.*.native` ships the same
 * four coefficients the CSS string carries, so mobile and web cannot drift.
 */
export const curve = {
  /** Heavy exponential out — the default for anything entering or changing. */
  current: Easing.bezier(...motionEasing.current.native),
  /** Longer tail, monotonic — a value coming to rest. */
  settle: Easing.bezier(...motionEasing.settle.native),
  /** Accelerating out — exits only. */
  sink: Easing.bezier(...motionEasing.sink.native),
  /** ~4% overshoot — success confirmations only. */
  swellIn: Easing.bezier(...motionEasing.swellIn.native),
} as const;

/**
 * A `withTiming` config built from the vocabulary.
 *
 * @param ms Travel duration from `motionMs` — never a literal, and never a
 *   `*Cycle` value or `feedbackHold` (see `resolveMotionMs`).
 * @param isReduceMotionEnabled From Reanimated's `useReducedMotion()`.
 * @param easing One of `curve`; defaults to `current`, the system default.
 */
export function timing(
  ms: number,
  isReduceMotionEnabled: boolean,
  easing: EasingFunctionFactory = curve.current
): { duration: number; easing: EasingFunctionFactory } {
  return { duration: resolveMotionMs(ms, isReduceMotionEnabled), easing };
}
