import { semantic } from '@salmon/shared';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useMembraneMaterial } from '../../../hooks/useMembraneMaterial';
import { ScalesBackground } from '../ScalesBackground';
import type { ThermoclineProps, ThermoclineTier } from './types';

const { scales } = semantic;

/** Scrim per tier — the floor, always painted, never negotiated. */
const SCRIM: Record<ThermoclineTier, string> = {
  thin: semantic.surface.membraneThin,
  thick: semantic.surface.membraneThick,
};

/** Opaque rung — the nearest opaque plane per tier (thin → raised, thick → crest). */
const OPAQUE: Record<ThermoclineTier, string> = {
  thin: semantic.surface.raised,
  thick: semantic.surface.crest,
};

function RefractionStrip() {
  return (
    <View style={styles.refractionBand} pointerEvents="none" testID="thermocline-refraction">
      <ScalesBackground variant="refraction" />
    </View>
  );
}

/**
 * The membrane field — the same seigaiha as the strip, extended over the
 * whole surface at half the strip's opacity (owner, 2026-08-19). Same 0.5×
 * geometry and same anchor as the strip, so the strip reads as the brighter
 * top of one continuous field rather than a separate ornament. Texture, not
 * transparency: it renders on every rung, opaque included.
 */
function ScalesField() {
  return (
    <View style={styles.scalesField} pointerEvents="none" testID="thermocline-field">
      <ScalesBackground variant="refraction" />
    </View>
  );
}

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
 */
export function Thermocline({ tier = 'thin', refraction = true, style }: ThermoclineProps) {
  const material = useMembraneMaterial();
  const rung = material === 'opaque' ? 'opaque' : 'tint';
  const scrim = SCRIM[tier];

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
      <ScalesField />
      {refraction && <RefractionStrip />}
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
