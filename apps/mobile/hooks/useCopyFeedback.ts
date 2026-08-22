import {
  motionEasing,
  motionMs,
  resolveMotionMs,
  useCopyFeedback as useSharedCopyFeedback,
} from '@salmon/shared';
import type { CopyFeedbackKey } from '@salmon/shared';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

/** Where the tick grows from. Felt as an arrival, not a pop-in. */
const TICK_ENTER_SCALE = 0.4;

/**
 * Copied-tick feedback for copy buttons.
 *
 * Mobile wrapper over the shared `useCopyFeedback` (which owns the
 * `copied` state and the `motionMs.feedbackHold` auto-revert), adding the
 * native scale animation for the tick — both ways. The entrance grows the
 * tick in on `settle` over `swell`; when the hold expires the tick sinks
 * back out on `sink` over `ebb` before `copied` reverts, so the icon swap
 * reads as a return instead of a hard cut. Nothing bounces.
 *
 * The returned `copied`/`copiedKey` lag the shared state by the exit
 * animation, which is what keeps the tick mounted while it leaves —
 * consumers keep their plain `copied ? tick : copyIcon` ternaries.
 * `reset()` hides it immediately (e.g. when a sheet closes).
 *
 * Reduce motion: durations resolve to 0 (`resolveMotionMs`), so the tick
 * steps in and out but the `feedbackHold` reading time is untouched.
 *
 * Render the tick inside an `Animated.View` using `scale`.
 */
export function useCopyFeedback() {
  const { copied, copiedKey, trigger, reset: sharedReset } = useSharedCopyFeedback();
  const [scale] = useState(() => new Animated.Value(0));
  // RN-core reduce-motion signal (the path `durations.ts` documents), rather
  // than Reanimated's hook — this file is reached from Jest suites that
  // cannot host Reanimated's native worklets.
  const [isReduceMotionEnabled, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  // Lags `copiedKey` on the way out, so the tick stays mounted while it
  // sinks. Holding the key itself (rather than a flag plus a ref) keeps the
  // rendered value in state — render must never read a ref.
  const [shownKey, setShownKey] = useState<CopyFeedbackKey | true | null>(null);

  useEffect(() => {
    if (copied) {
      setShownKey(copiedKey);
      scale.setValue(TICK_ENTER_SCALE);
      Animated.timing(scale, {
        toValue: 1,
        duration: resolveMotionMs(motionMs.swell, isReduceMotionEnabled),
        easing: Easing.bezier(...motionEasing.settle.native),
        useNativeDriver: true,
      }).start();
      return;
    }
    const exitMs = resolveMotionMs(motionMs.ebb, isReduceMotionEnabled);
    const exit = Animated.timing(scale, {
      toValue: 0,
      duration: exitMs,
      easing: Easing.bezier(...motionEasing.sink.native),
      useNativeDriver: true,
    });
    exit.start();
    // Unmount on a timer of the same length rather than the animation
    // callback: native-driver completions never arrive under Jest, and a
    // timer is just as deterministic on device.
    const hideAt = setTimeout(() => setShownKey(null), exitMs);
    return () => {
      clearTimeout(hideAt);
      exit.stop();
    };
  }, [copied, copiedKey, scale, isReduceMotionEnabled]);

  const reset = useCallback(() => {
    sharedReset();
    scale.stopAnimation();
    scale.setValue(0);
    setShownKey(null);
  }, [sharedReset, scale]);

  return {
    copied: shownKey !== null,
    copiedKey: shownKey,
    scale,
    trigger,
    reset,
  };
}
