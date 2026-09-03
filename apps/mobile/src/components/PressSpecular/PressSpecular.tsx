/**
 * The press specular — the one place a cold light colour touches a control.
 *
 * DESIGN.md §Shadow Vocabulary: "a 90ms 12%-opacity radial at the touch point,
 * 120px radius, `screen` blend, in a cold `#9FE0EF`. The only place a cold
 * light color touches a control, and it is transient."
 *
 * Drawn with `react-native-svg`'s `RadialGradient` rather than a filter: the
 * shape is a falloff, not a blur, and the same primitive already draws the
 * glassy border in `BlurContainer`, so it is known to work on both platforms.
 *
 * The control that mounts this must clip its own bounds (`overflow: 'hidden'`)
 * — the highlight is 240pt across and would otherwise spill past a 56pt pill.
 */
import React, { useId } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useSemantic } from '../../theme/useThemedStyles';
import type { PressSpecularProps } from './types';

export type { PressSpecularProps };

/** DESIGN.md's 120px radius. */
export const SPECULAR_RADIUS = 120;
/** DESIGN.md's 12%. */
export const SPECULAR_OPACITY = 0.12;

const SIZE = SPECULAR_RADIUS * 2;

export function PressSpecular({ x, y, opacity }: PressSpecularProps) {
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, '');
  /** The cold light — the token the wait's crest shares. */
  const specularInk = useSemantic().water.light;

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x.value - SPECULAR_RADIUS },
      { translateY: y.value - SPECULAR_RADIUS },
    ],
  }));

  return (
    <Animated.View style={[styles.layer, style]} pointerEvents="none">
      <Svg width={SIZE} height={SIZE}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={specularInk} stopOpacity="1" />
            <Stop offset="1" stopColor={specularInk} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={SIZE} height={SIZE} fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIZE,
    height: SIZE,
    // Transient light adds; it does not tint the fill underneath it.
    mixBlendMode: 'screen',
  },
});

export default PressSpecular;
