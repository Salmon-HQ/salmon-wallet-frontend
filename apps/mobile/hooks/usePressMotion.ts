/**
 * Press feedback, per DESIGN.md §Motion: press → `scale(0.985)` plus specular
 * at `flick` / `current`, with a light haptic.
 *
 * A control is a surface you press, not a thing that glows: 0.985 is a
 * displacement you feel rather than a shrink you watch, and 90ms is short
 * enough to read as a physical consequence of the finger rather than as an
 * animation the finger triggered.
 *
 * **Reduced motion is the parallel mapping, not silence.** The scale is
 * travel, so it is dropped. The specular is not travel — it is a state change
 * at the touch point — so it still appears, as a step. The haptic is kept in
 * both paths: it is the feedback, not the motion.
 */
import { motionMs } from '@salmon/shared';
import type { GestureResponderEvent, ViewStyle } from 'react-native';
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type AnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import * as Haptics from '../src/utils/haptics';
import { SPECULAR_OPACITY } from '../src/components/PressSpecular';
import { timing } from '../src/utils/motion';

/** DESIGN.md's `scale(0.985)`. */
export const PRESS_SCALE = 0.985;

export interface PressMotion {
  /** Apply to the control's own animated view. */
  pressStyle: AnimatedStyle<ViewStyle>;
  /** Spread onto the touchable. */
  pressHandlers: {
    onPressIn: (event: GestureResponderEvent) => void;
    onPressOut: () => void;
  };
  /** Hand to `<PressSpecular {...specular} />` inside the control. */
  specular: {
    x: SharedValue<number>;
    y: SharedValue<number>;
    opacity: SharedValue<number>;
  };
}

export function usePressMotion(): PressMotion {
  const isReduceMotionEnabled = useReducedMotion();

  const scale = useSharedValue(1);
  const specularX = useSharedValue(0);
  const specularY = useSharedValue(0);
  const specularOpacity = useSharedValue(0);

  const flick = timing(motionMs.flick, isReduceMotionEnabled);

  const onPressIn = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    specularX.value = locationX;
    specularY.value = locationY;

    // Fire and forget: a press must not wait on the taptic engine.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // The scale is travel; under reduce motion it is dropped. The specular is
    // a state change at the touch point, so it still happens — as a step.
    if (!isReduceMotionEnabled) {
      scale.value = withTiming(PRESS_SCALE, flick);
    }
    specularOpacity.value = withTiming(SPECULAR_OPACITY, flick);
  };

  const onPressOut = () => {
    scale.value = withTiming(1, flick);
    specularOpacity.value = withTiming(0, flick);
  };

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return {
    pressStyle,
    pressHandlers: { onPressIn, onPressOut },
    specular: { x: specularX, y: specularY, opacity: specularOpacity },
  };
}

export default usePressMotion;
