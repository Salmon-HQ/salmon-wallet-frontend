import { borderRadius, componentSizes, motionMs, ms } from '@salmon/shared';
import type { ShimmerRectPropsBase } from '@salmon/shared';
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
import { useSemantic } from '../../theme/useThemedStyles';

type ShimmerRectProps = ShimmerRectPropsBase;

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

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

  // The band reads the mode's skeleton pair: a fixed white wash vanished on
  // a white card.
  const { skeleton } = useSemantic();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[
        styles.container,
        { width, height, borderRadius: radius, backgroundColor: skeleton.base },
      ]}
    >
      <AnimatedLinearGradient
        colors={[skeleton.base, skeleton.highlight, skeleton.base]}
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
  },
});
