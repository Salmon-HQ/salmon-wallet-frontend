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
 * `translateY` on the container: the drift is a module-level shared value
 * driven by `withTiming` on the UI thread — one clock for every field on
 * screen, see `depthDriftOffset` — the scroll arrives through
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
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, Ellipse, G, RadialGradient, Rect, Stop, Use } from 'react-native-svg';

const { water } = semantic;

/** The field — constants, resolved once at module scope. */
const SNOW_FLOCS = blizzardSnowTiled;
const SNOW_HEROES = blizzardHeroes;

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
 * The field's own clock, and there is exactly **one** of it.
 *
 * It used to be a per-instance `useSharedValue`, which was invisible while one
 * field was mounted and wrong the moment two were: the wait screen paints its
 * own ground over the one already behind it, so a wait that opened mid-cycle
 * started a second field at phase 0 and the wait's exit swapped it back for a
 * field that had kept drifting. That swap is the snow *jumping* when the wave
 * leaves — up to one tile of displacement in a single frame. It was never
 * parallax: the parallax offset is module-level too and is identical for every
 * field on screen.
 *
 * One clock for every field means every field draws the same pixels, so a
 * field mounting or unmounting over another is not an event anyone can see.
 * The first field to mount starts it; later ones inherit the phase in flight;
 * it is only cancelled when the last one goes.
 */
const depthDriftOffset = makeMutable(0);

/** How many mounted fields are currently drawing off `depthDriftOffset`. */
let depthDriftRunners = 0;

/**
 * The tile the clock is currently travelling, or `0` when nothing is running.
 *
 * The refcount alone was not enough to decide whether to start the drift. A
 * field arriving while another is already mounted inherits the phase in
 * flight, which is the point — but only while the clock is travelling the tile
 * that field wraps by. The travel is `0 → tile` and the wrap in the animated
 * style folds by `tile`, so if the two are different numbers the field steps by
 * the difference once per cycle. A rotation is the case that gets there: the
 * tile is derived from the window's width, the effect re-runs on the new one,
 * and the refcount never returns to 1, so the clock was left running the old
 * tile with every field wrapping by the new one.
 *
 * Keyed on the geometry instead, the clock restarts exactly when it has to and
 * never when it does not — and `run()` always resumes from the value in
 * flight, so restarting is continuous rather than a reset.
 */
let depthDriftTile = 0;

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

/**
 * The field, and it does not repaint.
 *
 * `React.memo` is load-bearing rather than an optimisation. A field's phase is
 * a transform on a layer that is already composited (DESIGN.md §The water
 * column) — but a *React* re-render of an `Animated.View` re-commits the style
 * props React knows about, and what React knows about an animated style is the
 * value captured at mount, not the phase the UI thread has since driven it to
 * (`createAnimatedComponent/PropsFilter`: after the first render the style
 * resolves to the initial-props map). It also rebuilds the field's whole Svg
 * subtree, ~220 nodes, in the commit.
 *
 * That matters only where something re-renders the field, and exactly one
 * place does: the wait paints its own water column over the ground already
 * behind it (DESIGN.md §The wait), and the wait re-renders — it measures its
 * frame and its emitter on mount, and it cycles a tip every few seconds for as
 * long as it stands. The ground behind it re-renders for none of that. So the
 * only field the user is looking at during a wait was the only one being
 * re-committed, which is why the snow's jump read as coupled to the wait
 * rather than to the water: it was.
 *
 * Memoised, a parent's re-render cannot reach the field at all. The field
 * re-renders for the two things that genuinely change it — its own props, and
 * the window's dimensions — and for nothing else.
 */
export const DepthBackground: React.FC<DepthBackgroundProps> = React.memo(function DepthBackground({
  snow = true,
  style,
}: DepthBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const tile = depthFieldTileHeight(width);
  const copies = Math.ceil(height / tile) + HEADROOM_TILES;
  const cycleMs = depthFieldCycleMs(tile);

  const drift = depthDriftOffset;

  useEffect(() => {
    // Nothing to run, and nothing to stop either: a field that draws no snow
    // and a reduced-motion device both leave the clock alone rather than
    // resetting a value another mounted field may be drifting on.
    if (!snow || reducedMotion) return undefined;

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

    // The first field starts the clock; a second one mounting over it inherits
    // the phase already in flight, which is the whole point. `run()` always
    // resumes from the current value, so re-running it — on a resume, or after
    // a rotation changed the tile — is continuous rather than a reset.
    depthDriftRunners += 1;
    if (depthDriftTile !== tile) {
      depthDriftTile = tile;
      run();
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
      else cancelAnimation(drift);
    });

    return () => {
      subscription.remove();
      depthDriftRunners -= 1;
      if (depthDriftRunners === 0) {
        cancelAnimation(drift);
        depthDriftTile = 0;
      }
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
          style={[styles.field, { top: -HEADROOM_TILES * tile, height: copies * tile }, fieldStyle]}
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
                <Rect x="0" y="0" width={depthFieldTile.width} height={depthFieldTile.height} />
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
});

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
