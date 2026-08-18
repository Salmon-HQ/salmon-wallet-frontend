import { useCopyFeedback as useSharedCopyFeedback } from '@salmon/shared';
import type { CopyFeedbackKey } from '@salmon/shared';
import { useCallback, useState } from 'react';
import { Animated } from 'react-native';

/**
 * Copied-tick feedback for copy buttons.
 *
 * Mobile wrapper over the shared `useCopyFeedback` (which owns the
 * `copied` state and the `motionMs.feedbackHold` auto-revert), adding the
 * native scale-in animation for the tick. `reset()` hides it immediately
 * (e.g. when a sheet closes).
 * Render the tick inside an `Animated.View` using `scale`.
 */
export function useCopyFeedback() {
  const { copied, copiedKey, trigger: showCopied, reset } = useSharedCopyFeedback();
  const [scale] = useState(() => new Animated.Value(0));

  const trigger = useCallback(
    (key?: CopyFeedbackKey) => {
      showCopied(key);
      scale.setValue(0.4);
      Animated.spring(scale, {
        toValue: 1,
        speed: 20,
        bounciness: 8,
        useNativeDriver: true,
      }).start();
    },
    [showCopied, scale]
  );

  return { copied, copiedKey, scale, trigger, reset };
}
