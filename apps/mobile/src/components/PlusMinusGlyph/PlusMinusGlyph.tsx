/**
 * PlusMinusGlyph — the two-bar glyph the Powerup install/uninstall control
 * turns instead of swapping.
 *
 * Two identical bars, drawn once as a horizontal rectangle. The fixed one
 * never moves; the other starts rotated a quarter turn to stand vertical, so
 * together they read as a plus. `minus` turns that second bar a further 90°
 * — from vertical onto the fixed bar — so the two overlap exactly and read
 * as a single minus. It is one glyph turning, not a plus icon swapped for a
 * minus icon.
 */
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { motionMs, s } from '@salmon/shared';
import { curve, timing } from '../../utils/motion';
import { useSemantic } from '../../theme/useThemedStyles';
import type { PlusMinusGlyphProps } from './types';

const DEFAULT_SIZE = 22;
/** Phosphor bold's own stroke-to-glyph ratio. */
const STROKE_RATIO = 1 / 11;
/** Vertical at rest (a plus); a further 90° lands it flat on the fixed bar. */
const PLUS_ROTATION = 90;
const MINUS_ROTATION = 180;

export const PlusMinusGlyph: React.FC<PlusMinusGlyphProps> = ({
  minus,
  size = DEFAULT_SIZE,
  color,
}) => {
  const t = useSemantic();
  const isReduceMotionEnabled = useReducedMotion();
  const ink = color ?? t.text.primary;

  const box = s(size);
  const stroke = Math.max(2, Math.round(box * STROKE_RATIO));

  const rotateTiming = useMemo(
    () => timing(motionMs.drift, isReduceMotionEnabled, curve.current),
    [isReduceMotionEnabled]
  );
  const rotation = useSharedValue(minus ? MINUS_ROTATION : PLUS_ROTATION);
  useEffect(() => {
    rotation.value = withTiming(minus ? MINUS_ROTATION : PLUS_ROTATION, rotateTiming);
  }, [minus, rotateTiming, rotation]);

  const turningBarStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const bar = { width: box, height: stroke, top: (box - stroke) / 2, backgroundColor: ink };

  return (
    <View testID="plus-minus-glyph" style={{ width: box, height: box }}>
      <View testID="plus-minus-glyph-fixed-bar" style={[styles.bar, bar]} />
      <Animated.View
        testID="plus-minus-glyph-turning-bar"
        style={[styles.bar, bar, turningBarStyle]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    borderRadius: 1,
  },
});

export default PlusMinusGlyph;
