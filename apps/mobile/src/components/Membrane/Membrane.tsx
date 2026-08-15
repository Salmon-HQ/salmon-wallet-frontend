import { semantic } from '@salmon/shared';
import { GlassView } from 'expo-glass-effect';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useMembraneMaterial } from '../../../hooks/useMembraneMaterial';
import { BlurContainer } from '../BlurContainer';

export interface MembraneProps {
  /**
   * Geometry of the membrane (position, radius, border). The same object is
   * handed to every rung so the layout does not move by a pixel between them.
   */
  style?: StyleProp<ViewStyle>;
  /** Blur rung only — intensity passed through to `expo-blur`. */
  blurIntensity?: number;
  /** Blur rung only — tint composited under the blur. */
  blurBackgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  /**
   * Scrim painted *inside* the native glass. `tintColor` on `GlassView` is not
   * a contractual fixed alpha, and the scrim floor in DESIGN.md is not
   * negotiable, so the tint is drawn explicitly instead.
   */
  scrim?: string;
}

/**
 * A P3 membrane — the only translucent plane in the system.
 *
 * Use it for chrome that floats over scrolling content (tab bar, sticky
 * header). Do not use it for content: per DESIGN.md's "Content Is Never Glass"
 * rule a surface that does not overlap scrolling content is opaque, and per
 * the "Bedrock" rule the dApp approval sheet and every seed-phrase view are
 * `surface.bedrock` at α 1.00 — never a membrane.
 *
 * Renders background only; it takes no pointer events and no children.
 */
export function Membrane({
  style,
  blurIntensity,
  blurBackgroundColor,
  borderColor,
  borderWidth,
  scrim = semantic.surface.membraneThick,
}: MembraneProps) {
  const material = useMembraneMaterial();

  if (material === 'liquidGlass') {
    return (
      <GlassView
        style={[style, styles.transparentFill]}
        glassEffectStyle="regular"
        colorScheme="dark"
        isInteractive={false}
        pointerEvents="none"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]} pointerEvents="none" />
      </GlassView>
    );
  }

  if (material === 'opaque') {
    return <View style={[style, styles.opaqueFill]} pointerEvents="none" />;
  }

  return (
    <BlurContainer
      style={style}
      blurIntensity={blurIntensity}
      backgroundColor={blurBackgroundColor}
      borderColor={borderColor}
      borderWidth={borderWidth}
      useGradientBorder
      pointerEvents="none"
    >
      <></>
    </BlurContainer>
  );
}

const styles = StyleSheet.create({
  // The native glass supplies the material; an RN backgroundColor on top of it
  // would be a second, undocumented scrim.
  transparentFill: {
    backgroundColor: 'transparent',
  },
  // Rung 5: the membrane collapses to the nearest opaque plane. Edges and
  // geometry are untouched.
  opaqueFill: {
    backgroundColor: semantic.surface.raised,
  },
});

export default Membrane;
