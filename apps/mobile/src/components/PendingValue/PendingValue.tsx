/**
 * PendingValue - a value that is being recalculated, in place.
 *
 * React Native expression of the shared `PendingValuePropsBase` contract; see
 * the web twin in `packages/ui` for the reasoning. The container keeps its
 * blur, border and label — none of that is loading — and only the number
 * breathes, for as long as the request that can change it is in flight.
 *
 * Reduce motion: the loop is not started (a `*Cycle` is a cycle length, not a
 * transition). The value rests at the dimmed end of the breath instead.
 */
import { opacity, motionMs } from '@salmon/shared';
import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { curve, timing } from '../../utils/motion';
import type { PendingValueProps } from './types';

export const PendingValue: React.FC<PendingValueProps> = ({
  pending = false,
  children,
  style,
}) => {
  const value = useSharedValue<number>(opacity.full);
  const isReduceMotionEnabled = useReducedMotion();

  useEffect(() => {
    if (!pending) {
      value.value = withTiming(
        opacity.full,
        timing(motionMs.swell, isReduceMotionEnabled, curve.settle)
      );
      return;
    }
    if (isReduceMotionEnabled) {
      value.value = opacity.disabled;
      return;
    }
    value.value = withRepeat(
      withTiming(opacity.disabled, {
        duration: motionMs.pulseCycle / 2,
        easing: curve.current,
      }),
      -1,
      true
    );
  }, [pending, isReduceMotionEnabled, value]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: value.value }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

export default PendingValue;
