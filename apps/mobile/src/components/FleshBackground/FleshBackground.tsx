/**
 * FleshBackground — the myoseptal texture of salmon flesh, for salmon fills.
 *
 * The React Native half of the pair; `packages/ui` draws the same geometry
 * through the DOM. Both read `fleshTile` / `fleshFades` / `fleshTiledStrokes`
 * from `@salmon/shared`, so neither platform owns the drawing and the two
 * cannot drift apart. The rationale for the geometry — and for why the tile
 * wrap is baked into the data rather than left to `overflow="visible"`, which
 * `react-native-svg` has no prop for — lives beside the data in
 * `packages/shared/src/theme/flesh.ts`.
 *
 * This replaced `ScalesBackground variant="fish"` inside salmon fills. Scales
 * are skin — the outside of the animal, and the right texture for a ground or
 * a plane. A filled button is mass, so the honest material for it is the cut
 * surface. It is also a matter of feature size: the seigaiha tile is far taller
 * than a 56px pill, so the eye counts scallops and reads a stamp applied on
 * top; the myosepta land ~14% of that height apart and read as material.
 *
 * No filters are used, because there are none to use: `react-native-svg`
 * (15.15.3) stubs `FeTurbulence` and `FeDisplacementMap` out entirely. The
 * irregularity is in the path data and the soft edge is stacked strokes.
 *
 * @example
 * ```tsx
 * // Inside a salmon fill, under the label
 * <FleshBackground />
 * ```
 */
import React, { useId } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Pattern, Path, Rect, Stop } from 'react-native-svg';
import {
  fleshFades,
  fleshTile,
  fleshTiledStrokes,
  fleshVariantFills,
  fleshVariantTiles,
  semantic,
  type FleshVariant,
} from '@salmon/shared';
import { DEBUG_FLESH_VARIANT } from '../../debug/fleshVariant';

export interface FleshBackgroundProps {
  /**
   * Which candidate drawing to render — see
   * `packages/shared/src/theme/fleshVariants.ts`. Exposed for tests; screens
   * leave it on the debug switch so every CTA flips together.
   * @default DEBUG_FLESH_VARIANT
   */
  variant?: FleshVariant;
  /**
   * The band colour. Must be a *pale* tint of the fill it sits on — a darker
   * band would let the texture cut label contrast instead of only raising it.
   * @default semantic.flesh.band
   */
  color?: string;
  /**
   * Tile scale. 1 is tuned for a 44-64px pill; below ~0.7 the bands crowd and
   * start to read as stripes rather than as material.
   * @default 1
   */
  scale?: number;
  /**
   * Overall strength. The default is deliberately near the visibility floor.
   * @default 1
   */
  opacity?: number;
  /** Additional styles for the container, which otherwise fills its parent. */
  style?: ViewStyle;
}

export const FleshBackground: React.FC<FleshBackgroundProps> = ({
  variant = DEBUG_FLESH_VARIANT,
  color = semantic.flesh.band,
  scale = 1,
  opacity = 1,
  style,
}) => {
  // Unique per instance. Two FleshBackgrounds sharing a hardcoded `id` would
  // both resolve to whichever pattern mounted first — the same collision
  // `ScalesBackground` fixes with `useId`. `useId` yields ":r1:"-style values;
  // the colons are stripped because they are not valid in an SVG fragment id.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const patternId = `flesh-${uid}`;
  const tile = variant === 'current' ? fleshTile : fleshVariantTiles[variant];

  // The candidate variants are filled tapered polygons at flat opacity — no
  // fade gradients, the taper does the organic work — so their pattern is a
  // plain map over the fills.
  if (variant !== 'current') {
    return (
      <View style={[styles.container, style]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern
              id={patternId}
              patternUnits="userSpaceOnUse"
              width={tile.width}
              height={tile.height}
              patternTransform={`scale(${scale})`}
            >
              {fleshVariantFills[variant].map(([d, fillOpacity], i) => (
                <Path key={i} d={d} fill={color} fillOpacity={fillOpacity * opacity} />
              ))}
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </Svg>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          {fleshFades.map((stops, i) => (
            // Down the band, not across it: the bands run across the tile, so
            // a fade stop's offset is a height. Turning this sideways would
            // smear each envelope across a band's width, not along its length.
            <LinearGradient key={i} id={`${patternId}f${i}`} x1="0" y1="0" x2="0" y2="1">
              {stops.map(([offset, stopOpacity], j) => (
                <Stop
                  key={j}
                  offset={offset}
                  stopColor={color}
                  stopOpacity={stopOpacity}
                />
              ))}
            </LinearGradient>
          ))}
          <Pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={fleshTile.width}
            height={fleshTile.height}
            patternTransform={`scale(${scale})`}
          >
            {fleshTiledStrokes.map(([d, strokeWidth, strokeOpacity, fade], i) => (
              <Path
                key={i}
                d={d}
                stroke={`url(#${patternId}f${fade})`}
                strokeOpacity={strokeOpacity * opacity}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="none"
              />
            ))}
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
