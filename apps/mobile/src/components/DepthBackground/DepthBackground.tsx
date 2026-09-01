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
 */
import { LinearGradient } from 'expo-linear-gradient';
import { semantic } from '@salmon/shared';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

const { water } = semantic;

export interface DepthBackgroundProps {
  style?: ViewStyle;
}

/**
 * The field, and it does not repaint.
 *
 * `React.memo` keeps a parent's re-render from reaching this: it is a static
 * gradient, so there is nothing here a re-render would ever need to change.
 */
export const DepthBackground: React.FC<DepthBackgroundProps> = React.memo(function DepthBackground({
  style,
}: DepthBackgroundProps) {
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
