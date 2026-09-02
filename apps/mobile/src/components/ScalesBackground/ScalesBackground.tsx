import { seigaihaTile, seigaihaTiledPaths, type Semantic } from '@salmon/shared';
import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Mask, Pattern, Path, Rect, Stop } from 'react-native-svg';

import { useSemantic } from '../../theme/useThemedStyles';
import type { ScalesBackgroundProps, ScalesVariant } from './types';

export type { ScalesBackgroundProps, ScalesVariant };

/**
 * The motif's three sanctioned appearances, two of which this platform draws.
 *
 * The old component had one look — a near-black stroke measured at 1.068:1
 * against its own ground — tiled edge to edge as wallpaper behind whole
 * screens, sheets and settings stacks. At that opacity it reads as
 * compression noise rather than as water. Each variant now has a job, a
 * distance, and a stroke actually visible at that distance.
 */

const variantsFor = (
  t: Semantic
): Record<ScalesVariant, { stroke: string; scale: number; fade: boolean }> => ({
  /** The far water, in the balance card's upper region. Dissolves downward. */
  deepField: { stroke: t.scales.deepFieldStroke, scale: t.scales.deepFieldScale, fade: true },
  /**
   * @deprecated No call site remains. Salmon fills carry `FleshBackground`
   * instead; see `packages/shared/src/theme/flesh.ts`.
   */
  fish: { stroke: t.scales.fishStroke, scale: t.scales.fishScale, fade: false },
  /**
   * @deprecated No call site remains — the refraction strip was retired into
   * the (now also retired) membrane field. Kept because `ScalesVariant` is a
   * shared union with three apps behind it.
   */
  refraction: { stroke: '#FFFFFF', scale: t.scales.refractionScale, fade: false },
});

/**
 * ScalesBackground — the seigaiha fish-scale motif, at one of its scales.
 *
 * Density is a depth cue: `deepField` is the far water in the balance card's
 * logo band, `fish` is the material of the primary call-to-action's own body.
 *
 * **The Scales Exclusion Rule.** The motif is never wallpaper. It goes behind
 * no address, no seed phrase, no input, no list row, no approval sheet, and
 * no numeric value. On this platform that is enforced structurally rather
 * than by convention: the component absolutely fills whatever view it is
 * mounted in, so mounting it in a small, bounded group is what keeps it off
 * everything else. It has exactly two call sites.
 *
 * @example
 * ```tsx
 * // The far water, bound to the balance card's logo group
 * <View style={styles.logoGroup}>
 *   <ScalesBackground variant="deepField" />
 *   ...
 * </View>
 *
 * // The material inside a salmon fill
 * <ScalesBackground variant="fish" />
 * ```
 */
export const ScalesBackground: React.FC<ScalesBackgroundProps> = ({
  variant = 'deepField',
  style,
}) => {
  // Unique per instance. Two ScalesBackgrounds sharing a hardcoded `id` both
  // resolve to whichever pattern mounted first, so a `fish` inside a button
  // would silently inherit the deep field. `useId` yields ":r1:"-style values;
  // the colons are stripped because they are not valid in an SVG fragment id.
  // The field crosses into light as **coral** (owner, 2026-09-01): the stroke
  // is `salmon-500` at 0.06 rather than the cold near-white at 0.03, because a
  // pale ink on a pale ground is nothing at all. The swap lives in
  // `scales.deepFieldStroke` — this component only ever asks for the token, so
  // it draws the same geometry in both modes over whatever ground
  // `DepthBackground` painted (flat `depth.column` in light, the ramp in
  // dark). The rest of the material — the water ramp, the snow, the membrane
  // tiers — still waits for its own light pass.
  const semantic = useSemantic();

  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const patternId = `scales-${uid}`;
  const fadeId = `scalesFade-${uid}`;
  const maskId = `scalesMask-${uid}`;
  const sweepId = `scalesSweep-${uid}`;

  const config = variantsFor(semantic)[variant];
  const isRefraction = variant === 'refraction';
  // The paths are drawn at the native tile size and the whole drawing is
  // scaled — stretching the tile height alone would shear it instead of
  // moving it away from the eye. 1px is the only stroke weight for a boundary
  // in this system, so the authored width is divided by the scale to survive
  // the multiplication, exactly as the DOM version does it.
  // The refraction sweep must run across the whole band, so it cannot be the
  // pattern's own stroke paint — a gradient stroke would restart inside every
  // tile. Instead the pattern is drawn in white and used as a luminance mask
  // over one full-width gradient rect.
  const strokeColor = isRefraction ? '#FFFFFF' : config.stroke;
  const strokeWidth = 1 / config.scale;
  const sweep = semantic.scales.refractionSweep;

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          {/* The tile is the pattern cell, and on iOS a cell is a
              `CGPatternCreate` bounds rect that CoreGraphics clips against —
              so the cell has to be the *rendered* size and the drawing scaled
              into it. `patternTransform` cannot do that job: at 15.15.3
              `RNSVGPainter.paintPattern` never concats the transform (only the
              gradient painters do), so iOS silently drew the tile at 1× with a
              1/scale stroke — sub-pixel hairlines that break up — while
              Android applied it to the shader matrix and drew it whole. A `G`
              matrix is an ordinary node transform, honoured by both.

              Declared before any Mask that fills with it: react-native-svg
              registers painters imperatively at parse time, so a mask that
              references the pattern before it exists captures stale bounds
              and rasterizes a shrunken patch. */}
          <Pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={seigaihaTile.width * config.scale}
            height={seigaihaTile.height * config.scale}
          >
            <G scale={config.scale}>
              {seigaihaTiledPaths.map((d, i) => (
                <Path key={i} d={d} stroke={strokeColor} strokeWidth={strokeWidth} fill="none" />
              ))}
            </G>
          </Pattern>
          {isRefraction && (
            <>
              {/* The horizontal sweep — the strip's iridescence runs across
                  the band, not down it. */}
              <LinearGradient id={sweepId} x1="0" y1="0" x2="1" y2="0">
                {sweep.map((color, i) => (
                  <Stop key={color} offset={i / (sweep.length - 1)} stopColor={color} />
                ))}
              </LinearGradient>
              {/* `maskUnits` set explicitly: on iOS Fabric, RNSVGMask derives
                  BOTH maskUnits and maskContentUnits from this one prop, and
                  the objectBoundingBox default rasterizes the mask content in
                  fraction-space anchored at the origin — the "tiny scales in
                  a corner" patch. userSpaceOnUse keeps both in user space. */}
              <Mask id={maskId} maskUnits="userSpaceOnUse">
                <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} />
              </Mask>
            </>
          )}
          {config.fade && (
            <>
              {/* Thins downward to a floor rather than to nothing. A motif
                  that reaches zero has an end, and an end partway down the
                  column is what made the field read as cropped. */}
              <LinearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#fff" stopOpacity="1" />
                <Stop offset="1" stopColor="#fff" stopOpacity={semantic.scales.deepFieldFloor} />
              </LinearGradient>
              <Mask id={maskId}>
                <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${fadeId})`} />
              </Mask>
            </>
          )}
        </Defs>
        <Rect
          width="100%"
          height="100%"
          fill={isRefraction ? `url(#${sweepId})` : `url(#${patternId})`}
          mask={config.fade || isRefraction ? `url(#${maskId})` : undefined}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
