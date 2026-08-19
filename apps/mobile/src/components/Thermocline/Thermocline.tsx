import { semantic } from '@salmon/shared';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ScalesBackground } from '../ScalesBackground';
import type { ThermoclineProps, ThermoclineTier } from './types';

const { scales } = semantic;

const SCRIM: Record<ThermoclineTier, string> = {
  thin: semantic.surface.membraneThin,
  thick: semantic.surface.membraneThick,
};

const OPAQUE: Record<ThermoclineTier, string> = {
  thin: semantic.surface.raised,
  thick: semantic.surface.crest,
};

/** Opaque-rung entry on the DOM: the OS signal, `prefers-reduced-transparency`. */
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
 * as the native file: the tint alone (adopted 2026-08-19), collapsing to the
 * opaque plane when the OS asks for reduced transparency. See
 * `Thermocline.native.tsx` for the material's full story.
 */
export function Thermocline({ tier = 'thin', refraction = true, style }: ThermoclineProps) {
  const scrim = SCRIM[tier];
  const rung = prefersReducedTransparency() ? 'opaque' : 'tint';

  const flat = StyleSheet.flatten(style) ?? {};
  const fill: StyleProp<ViewStyle> = [
    StyleSheet.absoluteFill,
    { borderRadius: (flat.borderRadius as number) ?? 0 },
  ];

  return (
    <View style={[styles.root, style]} pointerEvents="none">
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
      {/* The membrane field — the strip's seigaiha over the whole surface at
          half its opacity; texture, not transparency, so it renders on every
          rung. See Thermocline.native.tsx. */}
      <View style={styles.scalesField} pointerEvents="none" testID="thermocline-field">
        <ScalesBackground variant="refraction" />
      </View>
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
  scalesField: {
    ...StyleSheet.absoluteFillObject,
    opacity: scales.membraneFieldOpacity,
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
