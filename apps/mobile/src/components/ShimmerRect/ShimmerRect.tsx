import { borderRadius, componentSizes, durationMs, ms } from '@salmon/shared';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

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

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(componentSizes.shimmerOffset, {
        duration: durationMs.shimmer,
        easing: Easing.inOut(Easing.ease),
      }),
      -1
    );
  }, [translateX]);

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
