/**
 * DepthBackground — the water column's ground: a depth ramp and marine snow.
 *
 * The React Native half of the pair; `packages/ui` draws the same field on the
 * DOM. Both read `marineSnow` / `depthFieldTile` and the `water` tokens from
 * `@salmon/shared`, so neither platform owns the drawing and the two cannot
 * drift. The rationale for the geometry lives beside the data in
 * `packages/shared/src/theme/depthField.ts`.
 *
 * Two layers:
 *
 *  - the **ramp**, a vertical gradient darkening toward the bottom. Painted
 *    once and never moved. It suggests an abyss without drawing a floor, and
 *    because it only ever darkens the shipped ground it cannot lower any
 *    text's contrast.
 *  - the **snow**, suspended flocs across the whole ground. It is what gives
 *    the deep field's 3.2× scales something to be enormous against, and it
 *    runs to the bottom because an animal that fills the frame is not cut off
 *    at the chest. The Scales Exclusion Rule still holds, and now holds the
 *    way it is meant to: the content over the field is opaque, so the motif
 *    is never *readable* behind an amount.
 *
 * Where the DOM serialises the field into a `background-image`, this draws the
 * array directly: an image would have meant shipping a raster and picking a
 * density for it. It is mounted once in the tab layout for all tabs rather
 * than per screen.
 *
 * **Motion.** The snow sinks, continuously, at `depthDrift.pxPerSecond`, and
 * it sinks faster while a list is being scrolled — see `depthDrift` for why
 * those two numbers are what they are. Both offsets are added into a single
 * `translateY` on the container: the drift is a Reanimated shared value
 * driven by `withTiming` on the UI thread, the scroll arrives through
 * `depthParallaxScroll`, and `useAnimatedStyle` sums them. Summed, not
 * switched — the hand speeds the water up, it does not take it over. React
 * never re-renders for either.
 *
 * The loop is exactly one tile of travel, the only displacement that lands the
 * field back on a copy of itself, so the wrap shows the same pixels it left.
 * The combined offset is folded into one tile, so one spare tile above the
 * screen is all the headroom any offset can consume. The repeats are `<Use>`
 * references to a single `<Defs>` group rather than re-listed ellipses: the
 * field costs the same ~220 nodes it always did, however many copies the
 * screen needs.
 *
 * `useReducedMotion()` stops the drift and the parallax both, leaving exactly
 * the field as it shipped: still water. `AppState` freezes the drift when the
 * app leaves the foreground and resumes it from where it stopped, so a
 * backgrounded wallet is not spending battery on water nobody can see.
 */
import { LinearGradient } from 'expo-linear-gradient';
import {
  blizzard,
  blizzardHeroes,
  blizzardSnowTiled,
  depthDrift,
  depthFieldCycleMs,
  depthFieldTile,
  depthFieldTileHeight,
  marineSnowTiled,
  semantic,
} from '@salmon/shared';
import React, { useEffect } from 'react';
import { AppState, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  makeMutable,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, Ellipse, G, RadialGradient, Rect, Stop, Use } from 'react-native-svg';

import { DEBUG_SNOW_VARIANT } from '../../debug/snowVariant';

const { water } = semantic;

/**
 * The field the debug switch selects. Constants, resolved once at module
 * scope: the switch is a compare-in-live knob, not runtime state.
 */
const SNOW_FLOCS = DEBUG_SNOW_VARIANT === 'blizzard' ? blizzardSnowTiled : marineSnowTiled;
const SNOW_HEROES = DEBUG_SNOW_VARIANT === 'blizzard' ? blizzardHeroes : [];

/** The `<Defs>` id of the heroes' soft radial fill. */
const HERO_GRADIENT_ID = 'salmon-hero-floc';

/**
 * Tiles of field stacked above the screen. One is enough: the combined
 * drift-plus-parallax offset is wrapped into a single tile before it is
 * applied, so it can never pull the field further down than this.
 */
const HEADROOM_TILES = 1;

/** The `<Defs>` id the stacked copies reference. */
const SNOW_TILE_ID = 'salmon-marine-snow';

/** The tile's own bounds, so each stacked copy carries only its own flocs. */
const SNOW_CLIP_ID = 'salmon-marine-snow-tile';

/**
 * The scroll offset the field parallaxes against.
 *
 * A module-level shared value rather than a context: there is one water column
 * mounted behind the whole app, so there is exactly one thing to tell, and a
 * provider would have had to wrap screens that have no other reason to know
 * the background exists. Screens opt in with `useDepthParallaxScrollHandler`,
 * or by assigning the offset directly from a scroll callback they already run.
 */
export const depthParallaxScroll = makeMutable(0);

/**
 * Feed a `ScrollView`/`FlatList`'s offset to the water column, on the UI
 * thread. Screens that already own an `onScroll` callback can skip this and
 * assign `depthParallaxScroll.value` from it instead.
 */
export const useDepthParallaxScrollHandler = () =>
  useAnimatedScrollHandler((event) => {
    depthParallaxScroll.value = event.contentOffset.y;
  });

export interface DepthBackgroundProps {
  /**
   * Draw the marine snow field. Turn it off on any ground that carries data
   * in its upper region — the ramp alone is a background colour and is always
   * safe, the snow is a motif and is not.
   * @default true
   */
  snow?: boolean;
  style?: ViewStyle;
}

export const DepthBackground: React.FC<DepthBackgroundProps> = ({ snow = true, style }) => {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const tile = depthFieldTileHeight(width);
  const copies = Math.ceil(height / tile) + HEADROOM_TILES;
  const cycleMs = depthFieldCycleMs(tile);

  const drift = useSharedValue(0);

  useEffect(() => {
    if (!snow || reducedMotion) {
      cancelAnimation(drift);
      drift.value = 0;
      return;
    }

    // Finish the tile that is in progress at its own speed, snap back through
    // the seam (identical pixels, so the reset is not a frame anyone sees),
    // then loop. Resuming this way is what keeps a foreground/background
    // round trip from teleporting the field.
    const run = () => {
      const from = drift.value;
      drift.value = withSequence(
        withTiming(tile, { duration: (1 - from / tile) * cycleMs, easing: Easing.linear }),
        withTiming(0, { duration: 0 }),
        withRepeat(withTiming(tile, { duration: cycleMs, easing: Easing.linear }), -1, false)
      );
    };

    run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
      else cancelAnimation(drift);
    });

    return () => {
      subscription.remove();
      cancelAnimation(drift);
    };
  }, [snow, reducedMotion, tile, cycleMs, drift]);

  const fieldStyle = useAnimatedStyle(() => {
    if (reducedMotion) return { transform: [{ translateY: 0 }] };
    // Content scrolled down by `y` moves up; the far plane follows it up, only
    // a fifth as far. Added to the drift, then wrapped into one tile so the
    // offset always has stacked field behind it.
    //
    // The wrap is spelled out rather than calling `wrapDepthOffset`: this body
    // runs on the UI thread, which can only reach worklets, and the shared
    // theme package must stay free of Reanimated's directives. The shared
    // helper is still the definition of record and is what the tests assert —
    // `depth-background.test.tsx` keeps these two from drifting apart.
    const parallax = -depthParallaxScroll.value * depthDrift.parallaxFactor;
    const offset = drift.value + parallax;
    return { transform: [{ translateY: ((offset % tile) + tile) % tile }] };
  });

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <LinearGradient colors={water.gradient} style={StyleSheet.absoluteFill} />
      {snow && (
        <Animated.View
          style={[
            styles.field,
            { top: -HEADROOM_TILES * tile, height: copies * tile },
            fieldStyle,
          ]}
          pointerEvents="none"
        >
          <Svg
            style={StyleSheet.absoluteFill}
            viewBox={`0 0 ${depthFieldTile.width} ${depthFieldTile.height * copies}`}
            // The box is a whole number of tiles, so it has the tile's own
            // aspect ratio and "meet" is an exact fit rather than a
            // compromise: one uniform scale, which keeps the flocs round
            // instead of stretching them device to device.
            preserveAspectRatio="xMidYMid meet"
            pointerEvents="none"
          >
            <Defs>
              {/* One tile, clipped to itself. `marineSnowTiled` carries a copy
                  of every floc that hangs over an edge, entered from the
                  opposite one — so a floc crossing a seam is drawn as two
                  halves in two neighbouring tiles, exactly as the DOM's
                  repeated background image draws it. Without the clip both
                  halves *and* the whole floc would land on the same pixels
                  and that floc would sit at double opacity. */}
              <ClipPath id={SNOW_CLIP_ID}>
                <Rect
                  x="0"
                  y="0"
                  width={depthFieldTile.width}
                  height={depthFieldTile.height}
                />
              </ClipPath>
              {SNOW_HEROES.length > 0 && (
                // The heroes' soft edge: peak at the token to `heroCoreStop`,
                // then a fade to nothing — a near floc is a blur, never a
                // hard disc. Default units are the ellipse's own bounds, so
                // one gradient serves every hero.
                <RadialGradient id={HERO_GRADIENT_ID}>
                  <Stop offset={0} stopColor={water.snow} stopOpacity={1} />
                  <Stop offset={blizzard.heroCoreStop} stopColor={water.snow} stopOpacity={1} />
                  <Stop offset={1} stopColor={water.snow} stopOpacity={0} />
                </RadialGradient>
              )}
              <G id={SNOW_TILE_ID} clipPath={`url(#${SNOW_CLIP_ID})`}>
                {SNOW_FLOCS.map(([cx, cy, rx, ry, opacity], i) => (
                  <Ellipse
                    key={i}
                    cx={cx}
                    cy={cy}
                    rx={rx}
                    ry={ry}
                    fill={water.snow}
                    fillOpacity={opacity}
                  />
                ))}
                {SNOW_HEROES.map(([cx, cy, rx, ry, opacity, rotation], i) => (
                  <Ellipse
                    key={`hero-${i}`}
                    cx={cx}
                    cy={cy}
                    rx={rx}
                    ry={ry}
                    fill={`url(#${HERO_GRADIENT_ID})`}
                    fillOpacity={opacity}
                    rotation={rotation}
                    originX={cx}
                    originY={cy}
                  />
                ))}
              </G>
            </Defs>
            {Array.from({ length: copies }, (_, copy) => (
              <Use key={copy} href={`#${SNOW_TILE_ID}`} y={copy * depthFieldTile.height} />
            ))}
          </Svg>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  field: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
