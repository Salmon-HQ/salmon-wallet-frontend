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
 * ## Light mode: the ground is flat, and that is a deferral
 *
 * `water.gradient` is a pair of deep neutrals, mode-invariant on purpose —
 * the underwater material's light values are a dedicated pass (spec 021,
 * "flesh/scales/water"; DESIGN.md:307 says the material is rebuilt from its
 * rules, never inverted). Until that pass lands, light mode paints
 * `depth.column` flat: a ramp made of two dark stops on a `#F6F8FB` app would
 * be a black rectangle, and a ramp made of two barely-different light stops
 * is a gradient nobody can see. Flat is the honest placeholder, not the
 * intended end state.
 */
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { useSemantic, useThemeMode } from '../../theme/useThemedStyles';

export interface DepthBackgroundProps {
  style?: ViewStyle;
}

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
  const mode = useThemeMode();
  const { water, depth } = useSemantic();

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {mode === 'light' ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: depth.column }]} />
      ) : (
        <LinearGradient colors={water.gradient} style={StyleSheet.absoluteFill} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
