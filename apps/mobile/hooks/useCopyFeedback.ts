import { motionMs } from '@salmon/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

/**
 * Copied-tick feedback for copy buttons.
 *
 * `trigger()` shows the tick with a scale-in animation and auto-reverts after
 * `motionMs.feedbackHold`; `reset()` hides it immediately (e.g. when a sheet
 * closes). The hold is reading time, not travel, so reduced motion must not
 * shorten it.
 * Render the tick inside an `Animated.View` using `scale`.
 */
export function useCopyFeedback() {
  const [copied, setCopied] = useState(false);
  const [scale] = useState(() => new Animated.Value(0));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingReset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearPendingReset();
    setCopied(false);
  }, [clearPendingReset]);

  const trigger = useCallback(() => {
    clearPendingReset();
    setCopied(true);
    scale.setValue(0.4);
    Animated.spring(scale, {
      toValue: 1,
      speed: 20,
      bounciness: 8,
      useNativeDriver: true,
    }).start();
    timeoutRef.current = setTimeout(() => {
      setCopied(false);
      timeoutRef.current = null;
    }, motionMs.feedbackHold);
  }, [clearPendingReset, scale]);

  // Clear the pending reset on unmount
  useEffect(() => clearPendingReset, [clearPendingReset]);

  return { copied, scale, trigger, reset };
}
