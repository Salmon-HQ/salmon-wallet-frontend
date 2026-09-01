import { type Semantic } from '@salmon/shared';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useSemantic } from '../../theme/useThemedStyles';

import type { ThermoclineProps, ThermoclineTier } from './types';

/** Scrim per tier — the floor, always painted, never negotiated. */
const scrimFor = (t: Semantic): Record<ThermoclineTier, string> => ({
  thin: t.surface.membraneThin,
  thick: t.surface.membraneThick,
});

/** Opaque rung — the nearest opaque plane per tier (thin → raised, thick → crest). */
const opaqueFor = (t: Semantic): Record<ThermoclineTier, string> => ({
  thin: t.surface.raised,
  thick: t.surface.crest,
});

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
 *
 * The material is tint + scrim only (2026-09-01) — the membrane field, the
 * flat dark scales layer that used to cover the whole surface, is retired.
 * See DESIGN.md §The thermocline, "The membrane field."
 *
 * The rung is decided by the material preference alone, in both modes:
 * `opaque` when the OS asks for reduced transparency, `tint` otherwise.
 * Light's tint tokens (`membraneThin`/`membraneThick`, white 0.85/0.95) are
 * the ones spec 021 defined for exactly this — there is no light-only rung.
 */
export function Thermocline({ tier = 'thin', style }: ThermoclineProps) {
  const semantic = useSemantic();
  const scrim = scrimFor(semantic)[tier];
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
          style={[fill, { backgroundColor: opaqueFor(semantic)[tier] }]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
});

export default Thermocline;
