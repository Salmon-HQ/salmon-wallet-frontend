/**
 * StepIndicator - Shows progress through multi-step flows
 *
 * A fixed row of dots with one salmon dot that travels between them.
 *
 * It used to re-colour a different dot on every step, which meant the whole
 * indicator was a new element each time and the header it sits in read as a
 * navigation event rather than as a position changing. Only the active
 * position changes, so only the active position moves: the track of dots and
 * the chevron beside it hold still while the salmon dot slides. Same principle
 * as the balance card, which does not remount when the chain changes.
 */
import { View, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, componentSizes, motionMs } from '@salmon/shared';
import { timing } from '../../utils/motion';
import type { StepIndicatorProps } from './types';

/** Centre-to-centre distance between two dots. */
const stride = componentSizes.stepDotSize + componentSizes.stepDotGap;

export function StepIndicator({ totalSteps, currentStep }: StepIndicatorProps) {
  const isReduceMotionEnabled = useReducedMotion();
  // Zero-indexed position of the salmon dot, in dots.
  const position = useSharedValue(Math.max(0, currentStep - 1));

  useEffect(() => {
    position.value = withTiming(
      Math.max(0, currentStep - 1),
      timing(motionMs.drift, isReduceMotionEnabled)
    );
  }, [currentStep, position, isReduceMotionEnabled]);

  const activeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value * stride }],
  }));

  return (
    <View style={styles.container}>
      {/* The track: every dot, inactive, and none of them ever moves. */}
      <View style={styles.track}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <View key={index} style={[styles.dot, styles.dotInactive]} />
        ))}
      </View>
      {/* The one thing that actually changed. */}
      <Animated.View style={[styles.dot, styles.dotActive, styles.active, activeStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: componentSizes.stepDotGap,
  },
  dot: {
    width: componentSizes.stepDotSize,
    height: componentSizes.stepDotSize,
    borderRadius: componentSizes.stepDotSize / 2,
  },
  active: {
    position: 'absolute',
    left: 0,
  },
  dotActive: {
    backgroundColor: colors.step.active,
  },
  dotInactive: {
    backgroundColor: colors.step.inactive,
  },
});
