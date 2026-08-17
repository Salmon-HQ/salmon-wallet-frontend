/**
 * The Surfacing — the two painted layers.
 *
 * The timing lives in `surfacing.ts`; the driving lives in
 * `TransactionSuccessScreen`. This file only draws, and it draws exactly two
 * things: the membrane that clears, and the caustic band that travels.
 *
 * Both are `pointerEvents="none"`. P4 (Caustic) is transient light in
 * DESIGN.md's plane model — additive, non-blocking, and never something a
 * finger can land on.
 */
import { semantic } from '@salmon/shared';
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { ScalesBackground } from '../ScalesBackground';
import { BAND_HEIGHT } from './surfacing';

/**
 * The sheet's membrane, clearing.
 *
 * One view filled with `surface.membraneThick`, whose opacity carries the
 * α 0.80 → 0.55 of the specification (see `MEMBRANE_OPACITY_TO`).
 *
 * ponytail: the *blur* half of "α 0.80 → 0.55 and blur 32px → 12px" is not
 * animated here, because there is nothing behind this layer to blur — the
 * sheet this screen mounts in is opaque `surface.shelf`, not a P3 membrane
 * (the material system is "specified, not built" in DESIGN.md). Animating an
 * `expo-blur` intensity over an opaque ground costs a full-screen GPU pass and
 * shows nothing. When the sheet becomes a real membrane, add an
 * `Animated.createAnimatedComponent(BlurView)` behind this view and drive
 * `intensity` off the same shared value — expo-blur exposes `intensity` as a
 * native prop and ships `getAnimatableRef`, so it animates on the UI thread.
 */
export function SurfacingMembrane({ opacity }: { opacity: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.membrane, style]}
      pointerEvents="none"
    />
  );
}

export interface CausticBandProps {
  /** 0 while the band has not been drawn yet, 1 at full strength. */
  opacity: SharedValue<number>;
  /** Vertical position of the band's top edge within the screen. */
  translateY: SharedValue<number>;
}

/**
 * The caustic band — a 140pt shaft of cold light, masked by the scales
 * geometry at 0.5×, travelling from the bottom of the sheet up to the amount.
 * It is the shaft of light hitting the fish.
 *
 * `mixBlendMode: 'screen'` is native in React Native 0.83 on both platforms
 * (Fabric only, and Android ignores it below API 29, where it composites
 * normally — at 10% on a near-black ground the two are close enough that the
 * degradation is invisible rather than wrong).
 *
 * ponytail: the specified 24px blur is carried by the variant's downward
 * gradient falloff rather than by an SVG filter. `react-native-svg` 15.15.3
 * does implement `FeGaussianBlur` natively, but a 24px blur over the seigaiha
 * strokes erases the very geometry the band is supposed to be masked by, and
 * it costs a filter pass per frame. Revisit if the band ever reads as hard.
 */
export function CausticBand({ opacity, translateY }: CausticBandProps) {
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.band, style]} pointerEvents="none">
      <ScalesBackground variant="caustic" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  membrane: {
    backgroundColor: semantic.surface.membraneThick,
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: BAND_HEIGHT,
    // Transient light adds, it does not tint. The parent sets
    // `isolation: 'isolate'` so the blend stays inside this screen.
    mixBlendMode: 'screen',
  },
});
