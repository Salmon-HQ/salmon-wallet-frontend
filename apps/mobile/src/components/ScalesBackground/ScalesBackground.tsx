import { seigaihaTile, seigaihaTiledPaths, semantic } from '@salmon/shared';
import React, { useId } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, G, LinearGradient, Mask, Pattern, Path, Rect, Stop } from 'react-native-svg';

const { scales } = semantic;

/**
 * The motif's three sanctioned appearances, two of which this platform draws.
 *
 * The old component had one look — a near-black stroke measured at 1.068:1
 * against its own ground — tiled edge to edge as wallpaper behind whole
 * screens, sheets and settings stacks. At that opacity it reads as
 * compression noise rather than as water. Each variant now has a job, a
 * distance, and a stroke actually visible at that distance.
 */
export type ScalesVariant = 'deepField' | 'fish' | 'caustic';

/**
 * `#9FE0EF` at 10%. DESIGN.md §The Surfacing specifies the caustic light by
 * value and the theme has no token for it — `scales` carries the motif's three
 * grounded appearances, not a transient one. Kept here with the other strokes
 * rather than at the call site so the motif's ink stays in one file.
 */
const CAUSTIC_STROKE = 'rgba(159, 224, 239, 0.10)';

const VARIANTS: Record<ScalesVariant, { stroke: string; scale: number; fade: boolean }> = {
  /** The far water, in the balance card's upper region. Dissolves downward. */
  deepField: { stroke: scales.deepFieldStroke, scale: scales.deepFieldScale, fade: true },
  /**
   * @deprecated No call site remains. Salmon fills carry `FleshBackground`
   * instead; see `packages/shared/src/theme/flesh.ts`.
   */
  fish: { stroke: scales.fishStroke, scale: scales.fishScale, fade: false },
  /**
   * The caustic band of The Surfacing — the transient one. Same 0.5× as the
   * refraction strip, because it is the same light seen moving instead of at
   * rest, and it fades downward so the band reads as a shaft with a leading
   * edge rather than as a rectangle of pattern.
   *
   * Never mount it anywhere but the completed-transaction confirmation: it is
   * the signature moment, and a signature used twice is a texture.
   */
  caustic: { stroke: CAUSTIC_STROKE, scale: scales.refractionScale, fade: true },
};

export interface ScalesBackgroundProps {
  /**
   * Which of the sanctioned appearances to draw.
   * @default "deepField"
   */
  variant?: ScalesVariant;
  /**
   * Additional styles for the container. The container fills its parent, so
   * *where* the motif may appear is decided by which parent you mount it in —
   * that is deliberate, see the exclusion rule below.
   */
  style?: ViewStyle;
}

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
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const patternId = `scales-${uid}`;
  const fadeId = `scalesFade-${uid}`;
  const maskId = `scalesMask-${uid}`;

  const config = VARIANTS[variant];
  // The paths are drawn at the native tile size and the whole drawing is
  // scaled — stretching the tile height alone would shear it instead of
  // moving it away from the eye. 1px is the only stroke weight for a boundary
  // in this system, so the authored width is divided by the scale to survive
  // the multiplication, exactly as the DOM version does it.
  const strokeColor = config.stroke;
  const strokeWidth = 1 / config.scale;

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          {config.fade && (
            <>
              {/* Thins downward to a floor rather than to nothing. A motif
                  that reaches zero has an end, and an end partway down the
                  column is what made the field read as cropped. The caustic
                  is the exception: it is a shaft of light with a leading
                  edge, so it does go to nothing. */}
              <LinearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#fff" stopOpacity="1" />
                <Stop
                  offset="1"
                  stopColor="#fff"
                  stopOpacity={variant === 'caustic' ? 0 : scales.deepFieldFloor}
                />
              </LinearGradient>
              <Mask id={maskId}>
                <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${fadeId})`} />
              </Mask>
            </>
          )}
          {/* The tile is the pattern cell, and on iOS a cell is a
              `CGPatternCreate` bounds rect that CoreGraphics clips against —
              so the cell has to be the *rendered* size and the drawing scaled
              into it. `patternTransform` cannot do that job: at 15.15.3
              `RNSVGPainter.paintPattern` never concats the transform (only the
              gradient painters do), so iOS silently drew the tile at 1× with a
              1/scale stroke — sub-pixel hairlines that break up — while
              Android applied it to the shader matrix and drew it whole. A `G`
              matrix is an ordinary node transform, honoured by both. */}
          <Pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={seigaihaTile.width * config.scale}
            height={seigaihaTile.height * config.scale}
          >
            <G scale={config.scale}>
              {seigaihaTiledPaths.map((d, i) => (
                <Path
                  key={i}
                  d={d}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
              ))}
            </G>
          </Pattern>
        </Defs>
        <Rect
          width="100%"
          height="100%"
          fill={`url(#${patternId})`}
          mask={config.fade ? `url(#${maskId})` : undefined}
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
