import { type Semantic } from '@salmon/shared';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useSemantic } from '../../theme/useThemedStyles';

import { useMembraneMaterial } from '../../../hooks/useMembraneMaterial';
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

/**
 * Thermocline — the P3 membrane material, named after the phenomenon it is.
 *
 * A thermocline is the boundary layer between water masses of different
 * density; light crossing it refracts, so everything seen through it blurs
 * and shimmers. Tint over scrolling content is that, rendered. See
 * DESIGN.md §The thermocline.
 *
 * The material is the tint: the translucent membrane ink alone, adopted over
 * the glass/blur ladder on 2026-08-19 (owner's live comparison). The OS
 * Reduce Transparency signal (surfaced as `material === 'opaque'`) collapses
 * it to the nearest opaque plane — accessibility outranks the look.
 *
 * Use it for chrome that floats over scrolling content (tab bar, sheets,
 * sticky headers). Content is never glass; approval and seed screens are
 * `surface.bedrock`, never this. Renders background only — no pointer
 * events, no children. Evolves the former `Membrane` component; the
 * `surface.membrane*` tokens keep their name.
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
  const material = useMembraneMaterial();
  const rung = material === 'opaque' ? 'opaque' : 'tint';
  const scrim = scrimFor(semantic)[tier];

  // The root owns the geometry and clips the strip; every rung fills it, so
  // switching rungs never moves the layout by a pixel.
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
