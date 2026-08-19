import { semantic } from '@salmon/shared';
import { GlassView } from 'expo-glass-effect';
import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useMembraneMaterial } from '../../../hooks/useMembraneMaterial';
import { thermoclineVariant } from '../../debug/thermoclineVariant';
import { BlurContainer } from '../BlurContainer';
import { ScalesBackground } from '../ScalesBackground';
import type { ThermoclineProps, ThermoclineTier } from './types';

const { scales } = semantic;

/**
 * Blur strength per rung of the ladder. iOS below 26 is specified at
 * intensity 60 for the thin tier; thick scales it by the tier's blur radius
 * ratio (32px / 20px). Android's rung is pinned at 40 (DESIGN.md, rung 3).
 */
const BLUR_INTENSITY: Record<ThermoclineTier, number> = { thin: 60, thick: 96 };
const ANDROID_BLUR_INTENSITY = 40;

/** Scrim per tier — the floor, always painted, never negotiated. */
const SCRIM: Record<ThermoclineTier, string> = {
  thin: semantic.surface.membraneThin,
  thick: semantic.surface.membraneThick,
};

/** Rung 5 — the nearest opaque plane per tier (thin → raised, thick → crest). */
const OPAQUE: Record<ThermoclineTier, string> = {
  thin: semantic.surface.raised,
  thick: semantic.surface.crest,
};

type Rung = 'liquidGlass' | 'blur' | 'opaque' | 'tint';

/**
 * Which rung this surface renders. The OS Reduce Transparency signal
 * (surfaced as `material === 'opaque'`) wins over everything, including the
 * debug variant — accessibility outranks the owner's eye. Android is
 * faithful to its platform: blur only on a sheet, only on SDK 31+ (the same
 * gate `dimezisBlurViewSdk31Plus` applies), at most one per screen; chrome
 * lands on rung 5 there.
 */
function resolveRung(
  material: ReturnType<typeof useMembraneMaterial>,
  surface: ThermoclineProps['surface']
): Rung {
  if (material === 'opaque') return 'opaque';
  if (thermoclineVariant === 'opaque') return 'opaque';
  if (thermoclineVariant === 'tint') return 'tint';
  if (Platform.OS === 'android') {
    return surface === 'sheet' && Number(Platform.Version) >= 31 ? 'blur' : 'opaque';
  }
  return material;
}

function RefractionStrip() {
  return (
    <View style={styles.refractionBand} pointerEvents="none" testID="thermocline-refraction">
      <ScalesBackground variant="refraction" />
    </View>
  );
}

/**
 * Thermocline — the P3 membrane material, named after the phenomenon it is.
 *
 * A thermocline is the boundary layer between water masses of different
 * density; light crossing it refracts, so everything seen through it blurs
 * and shimmers. Blur + tint over scrolling content is not a metaphor for
 * that — it is that, rendered. See DESIGN.md §The thermocline.
 *
 * Use it for chrome that floats over scrolling content (tab bar, sheets,
 * sticky headers). Content is never glass; approval and seed screens are
 * `surface.bedrock`, never this. Renders background only — no pointer
 * events, no children. Evolves the former `Membrane` component; the
 * `surface.membrane*` tokens keep their name.
 */
export function Thermocline({
  surface,
  tier = 'thin',
  refraction = true,
  style,
  borderColor,
  borderWidth,
}: ThermoclineProps) {
  const material = useMembraneMaterial();
  const rung = resolveRung(material, surface);
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
      {rung === 'liquidGlass' && (
        <GlassView
          style={[fill, styles.transparentFill]}
          glassEffectStyle="regular"
          colorScheme="dark"
          isInteractive={false}
          pointerEvents="none"
        >
          {/* Scrim painted explicitly — `tintColor` is not a contractual
              fixed alpha, and the scrim floor is not negotiable. */}
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]}
            pointerEvents="none"
            testID="thermocline-scrim"
          />
        </GlassView>
      )}
      {rung === 'blur' && (
        // The scrim is the BlurView's own background, composited over the
        // blur — same floor, one native surface.
        <BlurContainer
          style={fill}
          blurIntensity={Platform.OS === 'android' ? ANDROID_BLUR_INTENSITY : BLUR_INTENSITY[tier]}
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
      {refraction && <RefractionStrip />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  // The native glass supplies the material; an RN backgroundColor on top of
  // it would be a second, undocumented scrim.
  transparentFill: {
    backgroundColor: 'transparent',
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
