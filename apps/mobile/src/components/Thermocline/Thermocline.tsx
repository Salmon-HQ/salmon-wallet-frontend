import { type Semantic } from '@salmon/shared';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useSemantic, useThemeMode } from '../../theme/useThemedStyles';

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
 * Light mode: the membrane is deferred, and what is left is its edge.
 *
 * `surface.membrane*` are two deep-neutral inks at 48% / 66% — mode-invariant
 * because the underwater material's light values are a dedicated pass (spec
 * 021; DESIGN.md:307 — rebuilt from the material rules, never inverted).
 * Painting them over a `#F6F8FB` app would put a dark grey slab where the
 * design draws a pale one, so until that pass lands a light-mode thermocline
 * renders no field at all: a transparent membrane with a `border.default`
 * hairline, which keeps the strip's geometry and the edge that says chrome
 * ends here, and lets the content behind it read at full contrast.
 */

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
 */
export function Thermocline({ tier = 'thin', style }: ThermoclineProps) {
  const mode = useThemeMode();
  const semantic = useSemantic();
  const scrim = scrimFor(semantic)[tier];
  const rung = mode === 'light' ? 'flat' : prefersReducedTransparency() ? 'opaque' : 'tint';

  const flat = StyleSheet.flatten(style) ?? {};
  const fill: StyleProp<ViewStyle> = [
    StyleSheet.absoluteFill,
    { borderRadius: (flat.borderRadius as number) ?? 0 },
  ];

  return (
    <View
      style={[
        styles.root,
        style,
        rung === 'flat' && {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: semantic.border.default,
        },
      ]}
      pointerEvents="none"
    >
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
