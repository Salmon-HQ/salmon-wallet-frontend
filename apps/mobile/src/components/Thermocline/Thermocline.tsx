import { semantic } from '@salmon/shared';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { thermoclineVariant } from '../../debug/thermoclineVariant';
import { BlurContainer } from '../BlurContainer';
import { ScalesBackground } from '../ScalesBackground';
import type { ThermoclineProps, ThermoclineTier } from './types';

const { scales } = semantic;

/** Rung 4 blur radii per tier (20px thin / 32px thick), as expo-blur intensity. */
const BLUR_INTENSITY: Record<ThermoclineTier, number> = { thin: 60, thick: 96 };

const SCRIM: Record<ThermoclineTier, string> = {
  thin: semantic.surface.membraneThin,
  thick: semantic.surface.membraneThick,
};

const OPAQUE: Record<ThermoclineTier, string> = {
  thin: semantic.surface.raised,
  thick: semantic.surface.crest,
};

/**
 * Rung 4's `@supports (backdrop-filter: blur(1px))` gate, in its JS form.
 * Without support the tint alone still holds the scrim floor — the alpha is
 * derived from a pure-white worst case, so blur is aesthetic, not
 * contractual.
 */
function supportsBackdropBlur(): boolean {
  try {
    return (
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('backdrop-filter', 'blur(1px)')
    );
  } catch {
    return false;
  }
}

/** Rung 5 entry on the DOM: the OS signal, `prefers-reduced-transparency`. */
function prefersReducedTransparency(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-transparency: reduce)').matches
    );
  } catch {
    return false;
  }
}

/**
 * Thermocline — web (react-native-web) build of the material. Same contract
 * as the native file, minus the native glass rungs: tint always, blur when
 * the browser supports `backdrop-filter`, and the opaque plane when the OS
 * asks for reduced transparency. See `Thermocline.native.tsx` for the
 * material's full story.
 */
export function Thermocline({
  surface: _surface,
  tier = 'thin',
  refraction = true,
  style,
  borderColor,
  borderWidth,
}: ThermoclineProps) {
  const scrim = SCRIM[tier];
  const reduced = prefersReducedTransparency();
  const rung =
    reduced || thermoclineVariant === 'opaque'
      ? 'opaque'
      : thermoclineVariant === 'tint' || !supportsBackdropBlur()
        ? 'tint'
        : 'blur';

  const flat = StyleSheet.flatten(style) ?? {};
  const fill: StyleProp<ViewStyle> = [
    StyleSheet.absoluteFill,
    { borderRadius: (flat.borderRadius as number) ?? 0 },
  ];

  return (
    <View style={[styles.root, style]} pointerEvents="none">
      {rung === 'blur' && (
        <BlurContainer
          style={fill}
          blurIntensity={BLUR_INTENSITY[tier]}
          blurTint="systemThickMaterialDark"
          backgroundColor={scrim}
          borderColor={borderColor}
          borderWidth={borderWidth}
          useGradientBorder
          pointerEvents="none"
        >
          <></>
        </BlurContainer>
      )}
      {rung === 'opaque' && (
        <View
          style={[fill, { backgroundColor: OPAQUE[tier] }]}
          pointerEvents="none"
          testID="thermocline-opaque"
        />
      )}
      {rung === 'tint' && (
        <View
          style={[fill, { backgroundColor: scrim }]}
          pointerEvents="none"
          testID="thermocline-scrim"
        />
      )}
      {refraction && (
        <View style={styles.refractionBand} pointerEvents="none" testID="thermocline-refraction">
          <ScalesBackground variant="refraction" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  refractionBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: scales.refractionHeight,
    opacity: scales.refractionOpacity,
    overflow: 'hidden',
  },
});

export default Thermocline;
