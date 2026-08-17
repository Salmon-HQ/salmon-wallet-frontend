import { borderRadius, componentSizes, motionMs, ms } from '@salmon/shared';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { curve } from '../../utils/motion';

interface ShimmerRectProps {
  width: number;
  height: number;
  borderRadius?: number;
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const GRADIENT_COLORS = [
  'rgba(255,255,255,0.08)',
  'rgba(255,255,255,0.18)',
  'rgba(255,255,255,0.08)',
] as const;

export const ShimmerRect: React.FC<ShimmerRectProps> = ({
  width,
  height,
  borderRadius: customBorderRadius,
}) => {
  const translateX = useSharedValue(-componentSizes.shimmerOffset);
  const radius = customBorderRadius ?? ms(borderRadius.sm);
  const isReduceMotionEnabled = useReducedMotion();

  useEffect(() => {
    // A cycle length is not a transition: resolving it to 0 would spin the
    // band infinitely fast. Under reduce motion the loop is not sped up, it is
    // not started — the placeholder simply sits at `state.hover`.
    if (isReduceMotionEnabled) return;

    translateX.value = withRepeat(
      withTiming(componentSizes.shimmerOffset, {
        duration: motionMs.shimmerCycle,
        easing: curve.current,
      }),
      -1
    );
  }, [translateX, isReduceMotionEnabled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.container, { width, height, borderRadius: radius }]}>
      <AnimatedLinearGradient
        colors={[...GRADIENT_COLORS]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[
          {
            width: componentSizes.shimmerWidth,
            height,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
