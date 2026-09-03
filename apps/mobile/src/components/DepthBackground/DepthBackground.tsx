/**
 * DepthBackground — the water column's ground: a depth ramp.
 *
 * The React Native half of the pair; `packages/ui` draws the same field on the
 * DOM. Both read the `water` tokens from `@salmon/shared`, so neither
 * platform owns the drawing and the two cannot drift.
 *
 * A vertical gradient darkening toward the bottom. Painted once and never
 * moved. It suggests an abyss without drawing a floor, and because it only
 * ever darkens the shipped ground it cannot lower any text's contrast.
 *
 * It is mounted once in the tab layout for all tabs rather than per screen.
 *
 * Marine snow — a drifting field of suspended flocs over the ramp — used to
 * live here too; it was removed (didn't convince, see DESIGN.md §The water
 * column). The ramp is what remains, and it is static: no clock, no
 * parallax, nothing for `useReducedMotion` to have to stop.
 *
 * ## One drawing, both modes
 *
 * There is no light branch. `water.gradient` carries a real ramp per mode
 * (spec 022) — deep neutrals in dark, `neutral-25` down to `neutral-50` in
 * light — so the component asks for the ramp and the token knows which water
 * it is. A `mode === 'light'` fork here is what made light a flat rectangle.
 */
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useSemantic } from '../../theme/useThemedStyles';
import type { DepthBackgroundProps } from './types';

export type { DepthBackgroundProps };

/**
 * The field, and it does not repaint.
 *
 * `React.memo` keeps a parent's re-render from reaching this: it is a static
 * gradient, so the only thing that ever changes it is the mode, which arrives
 * through context and re-renders it regardless of the memo.
 */
export const DepthBackground: React.FC<DepthBackgroundProps> = React.memo(function DepthBackground({
  style,
}: DepthBackgroundProps) {
  const { water } = useSemantic();

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <LinearGradient colors={water.gradient} style={StyleSheet.absoluteFill} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
