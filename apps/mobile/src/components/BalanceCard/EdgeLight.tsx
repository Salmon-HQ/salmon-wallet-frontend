/**
 * EdgeLight — one edge of the balance carousel, lit by the chain beside it.
 *
 * The name for what this is imitating: **single-scattering volumetric lighting
 * in a participating medium**. The beam is visible by the **Tyndall effect** —
 * light travelling across your line of sight delivers no photons to your eye,
 * so a beam in *pure* water is invisible. You see it only where suspended
 * particulate scatters it back at you. (Not "god rays": those are crepuscular
 * rays from a source at infinity. Not caustics: those need a wavy surface and
 * a floor to land on, and this system has neither by rule.)
 *
 * That single fact is the brief. **The gradient is not the light — the gradient
 * is a map of how brightly the water's own texture is being lit.** The first
 * cut drew a smooth wash with nothing in it, which is a shape with no physical
 * reason to be visible, which is exactly why it read as a painted strip.
 *
 * The source is a *plane behind the card*, not a lamp beside it: the card is an
 * opaque pane suspended in water and the light spills around its whole canto.
 * That is why every falloff here runs **inward from the edge** and nothing
 * converges to a point. A point source says "there is a thing at this spot"; an
 * edge says "there is a surface on this side", and the second one is what this
 * affordance means.
 *
 * Six layers, each answering one finding:
 *
 * 1. **The spill** — the chain's colour, falling off inward on an inverse-square
 *    curve. Not linear: radiance goes as 1/r², and over a card's worth of water
 *    the geometric term dominates Beer-Lambert extinction by two orders of
 *    magnitude. A linear ramp is too bright in the mid-field and too weak at the
 *    source, which is the single most reliable "this is a gradient, not a light"
 *    tell.
 * 2. **The cold far field** — water absorbs red one to two orders of magnitude
 *    faster than blue, so a coloured light in water *must* cool as it travels:
 *    orange dies within a metre or two, purple loses its red half and collapses
 *    toward indigo, and what survives at any distance is blue-green. So the far
 *    reach is `water.light` — the token the system already licenses for cold
 *    light — and the brand hue only lives near the edge. This is why Bitcoin's
 *    orange stops competing with the accent: physics wants it small and hot with
 *    a cool halo, which is also what the palette wanted.
 * 3. **The hot band** — brightest at the vertical middle, falling toward the
 *    corners, without pinching the edge into a cone.
 * 4. **The rim** — a narrow near-white bloom at the outermost pixels. A real
 *    source clips the sensor, and a light whose brightest pixel is fully
 *    saturated brand colour reads as a coloured shape rather than as light. It
 *    is a *gradient*, never a stroke: a hard line along the canto is an outline,
 *    and an outline turns the whole thing into a sticker.
 * 5. **The scales** — the seigaiha at the deep field's own 3.2x. This is the
 *    particulate, and therefore the actual subject of the effect. It carries a
 *    uniform base alpha across the whole strip *plus* a lit copy: drawn only
 *    inside the light, the light's own boundary would become a texture-density
 *    edge, which the eye reads instantly as a mask.
 * 6. **The grain** — see `GRAIN_DOTS`. It is doing two jobs at once.
 *
 * **Deliberately not used, each for a checked reason.** `FeGaussianBlur`: on
 * Android it plateaus around `stdDeviation` 15 (software-mansion/react-native-svg
 * #2636, open) while iOS blurs correctly, so a glow tuned on a simulator would
 * ship broken to half the users. `fx`/`fy` focal points: silently ignored on
 * Android, per the library's own README. `mixBlendMode` / additive blending: RN
 * 0.77+, New Architecture only, and reported broken on Android — and it is not
 * needed here, because over a near-black ground normal alpha compositing differs
 * from additive by at most the ground's own luminance, which is nothing. What is
 * lost is *accumulation*, so each layer's peak is authored as its own sum.
 *
 * **Why it measures itself.** The seigaiha is a fixed-aspect drawing; a
 * normalised viewBox stretched to a tall narrow strip would squash its arcs.
 * Everything is laid out in real pixels off `onLayout`.
 */
import React, { useCallback, useEffect, useId, useState } from 'react';
import { AppState, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  makeMutable,
  useAnimatedProps,
  useReducedMotion,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Mask,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { semantic, seigaihaTile, seigaihaTiledPaths } from '@salmon/shared';

const { scales, water } = semantic;

const AnimatedG = Animated.createAnimatedComponent(G);

// ============================================================================
// The falloff
// ============================================================================

/**
 * How many stops each gradient gets, and — more importantly — **where they go**.
 *
 * The stops are spaced at equal steps in *alpha*, not in distance. Sampling
 * evenly in distance is what put visible steps of intensity inside the light:
 * the curve is near-vertical against the edge and near-flat further in, so
 * evenly-spaced stops leave a big alpha jump at the start and a row of
 * redundant ones at the end, and every stop where the slope changes hard is a
 * Mach band the eye picks up as a ridge. Inverting the curve and walking down
 * alpha puts the stops exactly where the light is changing fastest, so no
 * single segment ever carries more than 1/`GRADIENT_STOPS` of the range.
 *
 * This is the arithmetic half of the fix. Eight-bit quantisation in a dark
 * gradient bands no matter how many stops it has; that half is `GRAIN_DOTS`.
 */
const GRADIENT_STOPS = 28;

/**
 * The curve itself is inverse-square from a source of finite apparent size `k`,
 * normalised to reach exactly zero at the far end of its own strip:
 *
 *   alpha(t) = ((1 + t/k)^-2 - tail) / (1 - tail),  tail = (1 + 1/k)^-2
 *
 * `k` means *how big the source looks*. A large `k` decays slowly and carries
 * far; a tiny one collapses into a sliver against the edge. It is also what
 * removes the singularity — a real source has width, so the curve starts flat
 * instead of at infinity.
 *
 * What is evaluated below is that function **inverted**: walk alpha down in
 * equal steps and solve for where each one lands.
 */
const stopsFor = (k: number): readonly (readonly [number, number])[] => {
  const tail = 1 / (1 + 1 / k) ** 2;
  return Array.from({ length: GRADIENT_STOPS + 1 }, (_, index) => {
    const alpha = 1 - index / GRADIENT_STOPS;
    const scaled = alpha * (1 - tail) + tail;
    const t = Math.min(k * (1 / Math.sqrt(scaled) - 1), 1);
    return [t, alpha] as const;
  });
};

// ============================================================================
// Tunables — each with the band it was judged in
// ============================================================================

/** The chain's own colour, near the edge. Band 0.20-0.40. */
const SPILL_ALPHA = 0.3;
/** Band 0.12-0.24. Larger carries the brand hue further in. */
const SPILL_K = 0.19;

/** The cold survivor, outliving the brand hue — the absorption story, and the
 *  reason these are two layers and not one. Band 0.08-0.16 / 0.35-0.60. */
const COLD_ALPHA = 0.11;
const COLD_K = 0.5;

/** The hot band at mid-height. Band 0.10-0.26 — a strong source, not a lamp. */
const HOT_ALPHA = 0.18;
const HOT_K = 0.24;
/** How far up and down it carries, as a fraction of the strip's height. Band
 *  0.55-0.95: below 0.55 it pinches into a point and stops reading as an edge;
 *  its own ellipse must stay soft enough never to draw a visible arc. */
const HOT_SPREAD = 0.86;

/** The near-white bloom at the outermost pixels — the only place in the layer
 *  allowed to approach white. Band 0.26-0.45. */
const RIM_ALPHA = 0.32;
/** Band 0.02-0.06. Small enough to be a source, soft enough not to be a line. */
const RIM_K = 0.045;
/** Not `#fff`: deep water has no pure white in it, and `neutral-50` is the
 *  whitest thing this system owns. */
const RIM_INK = semantic.text.primary;

/** The particulate, unlit: low, uniform, across the whole strip. Drawn only
 *  inside the light, the light's edge becomes a density edge and reads as a
 *  mask. Band 0.04-0.09. */
const SCALES_BASE_ALPHA = 0.06;
/** The same texture, raised by the light. Band 0.20-0.42. */
const SCALES_LIT_ALPHA = 0.34;

/**
 * The grain, and the other half of the banding fix.
 *
 * A dark gradient quantised to 8 bits steps visibly however smooth the maths
 * underneath is — a 0.3-alpha ramp over 150px crosses roughly 75 representable
 * values, so the eye gets flat plateaus with edges between them. The web answer
 * is `feTurbulence` noise, which react-native-svg does not implement on native.
 * A tiled field of sub-pixel dots does the same job: high-frequency variation
 * across the plateau boundaries, so there is no continuous edge left to see.
 *
 * It is also the ambient particulate — the suspended matter that makes the beam
 * visible at all — which is why it is drawn across the whole strip rather than
 * only where the light is. One asset, both jobs.
 *
 * Hand-placed rather than random: a render must be deterministic, and a
 * regular lattice reads as a screen door. Radii and alphas vary so the field
 * has depth instead of looking like a texture swatch.
 */
const GRAIN_TILE = 44;
const GRAIN_DOTS: readonly (readonly [number, number, number, number])[] = [
  // x, y, r, alpha
  [3, 7, 0.6, 0.05],
  [17, 2, 1.1, 0.03],
  [31, 11, 0.5, 0.06],
  [9, 19, 1.4, 0.02],
  [24, 23, 0.7, 0.045],
  [38, 17, 0.9, 0.03],
  [6, 33, 1.2, 0.025],
  [20, 38, 0.5, 0.055],
  [35, 30, 0.8, 0.035],
  [13, 27, 0.6, 0.04],
  [41, 40, 1.0, 0.025],
  [28, 6, 0.5, 0.05],
  [2, 42, 0.7, 0.035],
  [33, 43, 0.6, 0.04],
];

/**
 * The marine snow at the edge, and the one clock that moves it.
 *
 * **Why snow rather than a shimmer.** The obvious way to make a light "alive"
 * is to make the light itself flicker, and at this depth that would be wrong.
 * A submerged lamp does not fluctuate; the medium does. And the shimmer people
 * picture — the dancing net on a pool floor — is a **caustic**, which needs a
 * wavy air/water interface between the source and the eye and dies out around
 * seven metres down. Faking one here would read as a swimming pool, which is
 * the opposite of the north star. What genuinely moves in mid-water is the
 * particulate, and its transit across a beam *is* the scintillation. So the
 * thing that moves is the only thing entitled to.
 *
 * **Direction: it sinks and it drifts outward** (owner). The sink is what keeps
 * it the same substance as the field already drifting behind the card — two
 * snows moving on different axes side by side at the card's border would read
 * as two different materials. The outward drift is the part that does the work:
 * the eye follows moving particulate, and here it is being led toward the side
 * the next chain is on. Its vertical speed is `depthDrift.pxPerSecond`, the
 * app's own snow speed, chosen there against the eye rather than the ocean —
 * "findable if you rest on it, absent if you do not". The outward component is
 * twice that, because this field is meant to be followed rather than ignored.
 *
 * **It spawns at the balance and appears at the edge.** The tile spans the
 * whole strip and beyond, so a floc genuinely travels outward across it — but
 * it is masked by the light, so it does not *exist* until the light reaches it.
 * That is not a trick to dodge the rule about motif over a figure: it is the
 * same reason the beam is visible at all. Suspended matter in dark water is
 * invisible until something shines on it.
 *
 * **One clock, module-level, shared by both edges.** Two independent repeating
 * timers would be two reasons for the GPU never to idle. It stops with the last
 * mounted edge, pauses when the app leaves the foreground, and never starts
 * under reduce motion — where the snow still draws, it simply holds still,
 * which is the parallel mapping this system uses everywhere rather than
 * removing the thing outright.
 */
/**
 * Three depths of it, and that is what makes it water instead of dirt.
 *
 * One field at one speed is a texture: every floc travels in parallel at the
 * same rate, nothing occludes anything, and a static-looking speckle on a dark
 * screen reads as a dirty panel rather than as something suspended. What sells
 * a volume is **parallax** — near flocs crossing faster than far ones — which
 * is also the standard fake for exactly this in the games literature, where it
 * is two scrolling layers at different scale and speed rather than one.
 *
 * The layers also carry the **suction**. A tiled field cannot converge on a
 * point; a translate is a translate, and every particle in one layer moves
 * parallel to every other. What it can do is change *which* layer you are
 * looking at as the eye moves outward: the far layer is slow, sinks steeply,
 * and is masked to reach deep into the card; the near layer is fast, runs
 * almost flat, and is masked tight against the canto. Track a spot from the
 * middle out to the edge and the field accelerates and flattens under you.
 * That reads as being pulled — and it costs three transforms instead of a
 * particle system.
 *
 * It is also physically the right way round: the closer to the source, the more
 * the current dominates gravity, so the near layer's paths are the flattest.
 *
 * One clock drives all three. Each layer's travel is a whole number of its own
 * tiles per cycle, so each wraps on its own lattice and none of the resets is a
 * frame anyone sees.
 */
const SNOW_CYCLE_MS = 14000;

interface SnowLayer {
  /** Pattern cell, px. Different per layer so no two lattices line up. */
  tile: number;
  /** Whole tiles travelled per cycle. The ratio is the drift angle. */
  out: number;
  down: number;
  /** Peak alpha at the canto, before the mask. */
  alpha: number;
  /** Falloff of its own visibility. Small hugs the edge; large reaches in. */
  k: number;
  /** Flocs, as [x, y, r, weight] in tile space. */
  dots: readonly (readonly [number, number, number, number])[];
}

/**
 * Hand-placed rather than random: a render must be deterministic, and a regular
 * lattice reads as a screen door. Radii and weights vary inside each layer too,
 * so a layer is a depth *band* rather than a single plane.
 */
const SNOW_LAYERS: readonly SnowLayer[] = [
  // Far: small, dim, slow, steep, and it reaches furthest into the card.
  {
    tile: 64,
    out: 2,
    down: 1,
    alpha: 0.1,
    k: 0.42,
    dots: [
      [6, 9, 0.7, 0.8],
      [23, 3, 0.55, 0.6],
      [41, 14, 0.85, 0.9],
      [57, 7, 0.6, 0.5],
      [13, 25, 0.75, 0.7],
      [34, 31, 0.6, 0.85],
      [51, 27, 0.9, 0.55],
      [3, 40, 0.65, 0.75],
      [27, 45, 0.8, 0.65],
      [46, 52, 0.6, 0.9],
      [60, 38, 0.7, 0.6],
      [17, 57, 0.85, 0.7],
      [36, 61, 0.55, 0.8],
      [9, 49, 0.6, 0.5],
    ],
  },
  // Mid.
  {
    tile: 52,
    out: 4,
    down: 1,
    alpha: 0.16,
    k: 0.28,
    dots: [
      [10, 6, 1.2, 0.85],
      [30, 12, 1.5, 0.6],
      [45, 4, 1.0, 0.95],
      [19, 22, 1.35, 0.7],
      [38, 27, 1.1, 0.9],
      [4, 33, 1.45, 0.55],
      [49, 36, 1.15, 0.8],
      [25, 43, 1.6, 0.65],
      [13, 48, 1.05, 0.9],
      [42, 49, 1.25, 0.75],
    ],
  },
  // Near: big, bright, fast, nearly flat, and only against the canto.
  {
    tile: 40,
    out: 7,
    down: 1,
    alpha: 0.26,
    k: 0.15,
    dots: [
      [7, 8, 2.3, 0.95],
      [26, 5, 1.8, 0.7],
      [16, 21, 2.7, 0.85],
      [34, 18, 1.9, 1.0],
      [5, 31, 2.1, 0.75],
      [29, 34, 2.5, 0.9],
      [19, 12, 1.7, 0.6],
      [37, 29, 2.0, 0.8],
    ],
  },
];

/** 0 to 1, linear, forever. Every layer and both edges read it; none owns it. */
const snowPhase = makeMutable(0);
let snowRunners = 0;
let snowRunning = false;
let snowStop: (() => void) | null = null;

/**
 * A floc is not a disc. It is a lit sphere, so it has a bright side, a soft
 * terminator, and a side the light never reaches — and its silhouette has no
 * edge at all, because a suspended particle scatters rather than ends.
 *
 * Both come from one gradient. `SNOW_LIT_OFFSET` pushes its centre toward the
 * light, so the bright point sits on the facing side and the far side falls to
 * nothing: that *is* the shadow, drawn as absence rather than as a dark shape,
 * which matters because a dark shape on a near-black ground is invisible
 * anyway. And a radial fill that reaches zero before the circle's own boundary
 * means the boundary is never rasterised — no hard rim, no drawn disc.
 *
 * The nearest layer carries a second, unshaded copy masked to the last few
 * pixels against the canto (`SNOW_CORE_K`). There the light is not off to one
 * side any more, it is all around: nothing occludes, so the shading fades out
 * and the floc reads at full strength and fully round. Only the near layer gets
 * it, because it is the only one that arrives.
 */
const SNOW_LIT_OFFSET = 0.2;
const SNOW_CORE_K = 0.05;

export interface EdgeLightProps {
  /** Which edge of the card this is — the side the light spills from. */
  side: 'left' | 'right';
  /** The neighbouring chain's palette, top to bottom. */
  colors: readonly string[];
}

export function EdgeLight({ side, colors }: EdgeLightProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      current.width === width && current.height === height ? current : { width, height }
    );
  }, []);

  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return undefined;
    snowRunners += 1;
    if (!snowRunning) {
      snowRunning = true;
      // Resume from wherever the phase already is rather than snapping to 0:
      // the second edge mounting must inherit the drift in flight, and a
      // foreground return must not teleport the field.
      const run = () => {
        const from = snowPhase.value;
        snowPhase.value = withSequence(
          withTiming(1, { duration: (1 - from) * SNOW_CYCLE_MS, easing: Easing.linear }),
          withTiming(0, { duration: 0 }),
          withRepeat(withTiming(1, { duration: SNOW_CYCLE_MS, easing: Easing.linear }), -1, false)
        );
      };
      run();
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') run();
        else cancelAnimation(snowPhase);
      });
      snowStop = () => {
        subscription.remove();
        cancelAnimation(snowPhase);
        snowRunning = false;
      };
    }
    return () => {
      snowRunners -= 1;
      if (snowRunners === 0) snowStop?.();
    };
  }, [reducedMotion]);

  const raw = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = {
    hue: `el-hue-${raw}`,
    spill: `el-spill-${raw}`,
    spillMask: `el-spill-m-${raw}`,
    cold: `el-cold-${raw}`,
    coldMask: `el-cold-m-${raw}`,
    hot: `el-hot-${raw}`,
    hotMask: `el-hot-m-${raw}`,
    rim: `el-rim-${raw}`,
    rimMask: `el-rim-m-${raw}`,
    litMask: `el-lit-m-${raw}`,
    scales: `el-scales-${raw}`,
    grain: `el-grain-${raw}`,
    floc: `el-floc-${raw}`,
    flocLit: `el-floc-lit-${raw}`,
    snowBase: `el-snow-${raw}`,
    snowFadeBase: `el-snow-fade-${raw}`,
    snowMaskBase: `el-snow-m-${raw}`,
    snowLit: `el-snow-lit-${raw}`,
    snowCoreFade: `el-snow-core-fade-${raw}`,
    snowCoreMask: `el-snow-core-m-${raw}`,
  };

  const { width: w, height: h } = size;
  // The light spills from the outer edge — the one against the screen.
  const edgeX = side === 'left' ? 0 : w;
  const innerX = side === 'left' ? w : 0;
  const tileScale = scales.deepFieldScale;
  // Outward is away from the card's centre, which is the direction the next
  // chain is in.
  const outward = side === 'left' ? -1 : 1;

  // `translateX`/`translateY` rather than a `transform` array: they are
  // react-native-svg's own common props, set straight onto the node, so there
  // is no array or matrix string for the animated-props bridge to parse.
  // One hook per layer, all reading the one clock — hooks cannot be called in
  // a loop, so the layers are spelled out.
  const driftFar = useAnimatedProps(() => ({
    translateX: outward * snowPhase.value * SNOW_LAYERS[0].tile * SNOW_LAYERS[0].out,
    translateY: snowPhase.value * SNOW_LAYERS[0].tile * SNOW_LAYERS[0].down,
  }));
  const driftMid = useAnimatedProps(() => ({
    translateX: outward * snowPhase.value * SNOW_LAYERS[1].tile * SNOW_LAYERS[1].out,
    translateY: snowPhase.value * SNOW_LAYERS[1].tile * SNOW_LAYERS[1].down,
  }));
  const driftNear = useAnimatedProps(() => ({
    translateX: outward * snowPhase.value * SNOW_LAYERS[2].tile * SNOW_LAYERS[2].out,
    translateY: snowPhase.value * SNOW_LAYERS[2].tile * SNOW_LAYERS[2].down,
  }));
  const drifts = [driftFar, driftMid, driftNear];

  const inwardStops = (peak: number, k: number) =>
    stopsFor(k).map(([offset, alpha], index) => (
      <Stop key={index} offset={offset} stopColor="#fff" stopOpacity={alpha * peak} />
    ));

  return (
    <View style={{ flex: 1 }} onLayout={onLayout} pointerEvents="none">
      {w > 0 && h > 0 && (
        <Svg width={w} height={h}>
          <Defs>
            {/* Patterns are declared before any mask that fills with one:
                react-native-svg registers painters at parse time, and a mask
                referencing a pattern the parser has not seen yet captures stale
                bounds and rasterises a shrunken patch. The seigaiha is drawn
                through a `<G scale>` rather than a `patternTransform`, which
                iOS silently ignores — both traps are documented in
                `ScalesBackground`, which hits them for the same reasons. */}
            <Pattern
              id={id.scales}
              patternUnits="userSpaceOnUse"
              width={seigaihaTile.width * tileScale}
              height={seigaihaTile.height * tileScale}
            >
              <G scale={tileScale}>
                {seigaihaTiledPaths.map((d, index) => (
                  <Path
                    key={index}
                    d={d}
                    stroke={water.light}
                    strokeWidth={1 / tileScale}
                    fill="none"
                  />
                ))}
              </G>
            </Pattern>
            {/* The bright point sits toward the light, so the far side of
                every floc falls away into nothing. Object-bounding-box units,
                so one definition serves every circle whatever its radius —
                and `cx`, not `fx`: the focal-point props are ignored on
                Android. */}
            <RadialGradient
              id={id.floc}
              cx={`${(0.5 + (side === 'left' ? -SNOW_LIT_OFFSET : SNOW_LIT_OFFSET)) * 100}%`}
              cy="42%"
              rx="70%"
              ry="70%"
            >
              <Stop offset="0" stopColor={water.light} stopOpacity="1" />
              <Stop offset="0.4" stopColor={water.light} stopOpacity="0.62" />
              <Stop offset="0.75" stopColor={water.light} stopOpacity="0.18" />
              <Stop offset="1" stopColor={water.light} stopOpacity="0" />
            </RadialGradient>
            {/* Centred: the floc that has arrived, lit from every side. */}
            <RadialGradient id={id.flocLit} cx="50%" cy="50%" rx="78%" ry="78%">
              <Stop offset="0" stopColor={water.light} stopOpacity="1" />
              <Stop offset="0.45" stopColor={water.light} stopOpacity="0.7" />
              <Stop offset="1" stopColor={water.light} stopOpacity="0" />
            </RadialGradient>
            {SNOW_LAYERS.map((layer, index) => (
              <Pattern
                key={`p${index}`}
                id={`${id.snowBase}-${index}`}
                patternUnits="userSpaceOnUse"
                width={layer.tile}
                height={layer.tile}
              >
                {layer.dots.map(([cx, cy, r, weight], dot) => (
                  <Circle
                    key={dot}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={`url(#${id.floc})`}
                    opacity={weight}
                  />
                ))}
              </Pattern>
            ))}
            {SNOW_LAYERS.map((layer, index) => (
              <LinearGradient
                key={`f${index}`}
                id={`${id.snowFadeBase}-${index}`}
                x1={edgeX}
                y1="0"
                x2={innerX}
                y2="0"
                gradientUnits="userSpaceOnUse"
              >
                {inwardStops(1, layer.k)}
              </LinearGradient>
            ))}
            {SNOW_LAYERS.map((_, index) => (
              <Mask
                key={`m${index}`}
                id={`${id.snowMaskBase}-${index}`}
                maskUnits="userSpaceOnUse"
              >
                <Rect
                  x="0"
                  y="0"
                  width={w}
                  height={h}
                  fill={`url(#${id.snowFadeBase}-${index})`}
                />
              </Mask>
            ))}
            {/* The arrived floc: same positions as the near layer, unshaded. */}
            <Pattern
              id={id.snowLit}
              patternUnits="userSpaceOnUse"
              width={SNOW_LAYERS[2].tile}
              height={SNOW_LAYERS[2].tile}
            >
              {SNOW_LAYERS[2].dots.map(([cx, cy, r, weight], dot) => (
                <Circle
                  key={dot}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={`url(#${id.flocLit})`}
                  opacity={weight}
                />
              ))}
            </Pattern>
            <Pattern
              id={id.grain}
              patternUnits="userSpaceOnUse"
              width={GRAIN_TILE}
              height={GRAIN_TILE}
            >
              {GRAIN_DOTS.map(([cx, cy, r, alpha], index) => (
                <Circle key={index} cx={cx} cy={cy} r={r} fill={water.light} opacity={alpha} />
              ))}
            </Pattern>

            {/* The chain, top to bottom. A one-colour chain repeats its stop so
                every palette takes the same path. */}
            <LinearGradient id={id.hue} x1="0" y1="0" x2="0" y2={h} gradientUnits="userSpaceOnUse">
              {(colors.length === 1 ? [colors[0], colors[0]] : colors).map((color, index, all) => (
                <Stop key={`${color}-${index}`} offset={index / (all.length - 1)} stopColor={color} />
              ))}
            </LinearGradient>

            {/* Every falloff runs edge -> inward. */}
            <LinearGradient
              id={id.spill}
              x1={edgeX}
              y1="0"
              x2={innerX}
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              {inwardStops(SPILL_ALPHA, SPILL_K)}
            </LinearGradient>
            <LinearGradient
              id={id.cold}
              x1={edgeX}
              y1="0"
              x2={innerX}
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              {inwardStops(COLD_ALPHA, COLD_K)}
            </LinearGradient>
            <LinearGradient
              id={id.rim}
              x1={edgeX}
              y1="0"
              x2={innerX}
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              {inwardStops(RIM_ALPHA, RIM_K)}
            </LinearGradient>

            {/* The hot band. An ellipse hugging the edge at mid-height, wide
                enough vertically that the canto stays lit corner to corner and
                its own boundary never draws an arc. */}
            <RadialGradient
              id={id.hot}
              cx={edgeX}
              cy={h / 2}
              rx={w}
              ry={h * HOT_SPREAD}
              gradientUnits="userSpaceOnUse"
            >
              {inwardStops(HOT_ALPHA, HOT_K)}
            </RadialGradient>

            <Mask id={id.spillMask} maskUnits="userSpaceOnUse">
              <Rect x="0" y="0" width={w} height={h} fill={`url(#${id.spill})`} />
            </Mask>
            <Mask id={id.coldMask} maskUnits="userSpaceOnUse">
              <Rect x="0" y="0" width={w} height={h} fill={`url(#${id.cold})`} />
            </Mask>
            <Mask id={id.hotMask} maskUnits="userSpaceOnUse">
              <Rect x="0" y="0" width={w} height={h} fill={`url(#${id.hot})`} />
            </Mask>
            <Mask id={id.rimMask} maskUnits="userSpaceOnUse">
              <Rect x="0" y="0" width={w} height={h} fill={`url(#${id.rim})`} />
            </Mask>
            {/* The snow's own visibility. A *mask* has to reach 1 where the
                thing is fully visible; reusing a paint alpha that peaks at
                0.30 multiplies the field into nothing. */}
            <LinearGradient
              id={id.snowCoreFade}
              x1={edgeX}
              y1="0"
              x2={innerX}
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              {inwardStops(1, SNOW_CORE_K)}
            </LinearGradient>
            <Mask id={id.snowCoreMask} maskUnits="userSpaceOnUse">
              <Rect x="0" y="0" width={w} height={h} fill={`url(#${id.snowCoreFade})`} />
            </Mask>
            {/* What the lit texture is allowed to exist in: the spill and the
                hot band together, so the scales brighten where the light does. */}
            <Mask id={id.litMask} maskUnits="userSpaceOnUse">
              <Rect x="0" y="0" width={w} height={h} fill={`url(#${id.spill})`} />
              <Rect x="0" y="0" width={w} height={h} fill={`url(#${id.hot})`} />
            </Mask>
          </Defs>

          {/* Dimmest to brightest, so the rim lands on top of its own spill. */}
          <G opacity={SCALES_BASE_ALPHA}>
            <Rect x="0" y="0" width={w} height={h} fill={`url(#${id.scales})`} />
          </G>
          <Rect x="0" y="0" width={w} height={h} fill={water.light} mask={`url(#${id.coldMask})`} />
          <Rect
            x="0"
            y="0"
            width={w}
            height={h}
            fill={`url(#${id.hue})`}
            mask={`url(#${id.spillMask})`}
          />
          <Rect
            x="0"
            y="0"
            width={w}
            height={h}
            fill={`url(#${id.hue})`}
            mask={`url(#${id.hotMask})`}
          />
          <G opacity={SCALES_LIT_ALPHA}>
            <Rect
              x="0"
              y="0"
              width={w}
              height={h}
              fill={`url(#${id.scales})`}
              mask={`url(#${id.litMask})`}
            />
          </G>
          {/* The drift. The mask is on the outer group and stays put; only the
              field inside it moves, so the light does not travel with the snow.
              The rect is oversized by the full travel in each direction, so a
              wrapped tile never exposes an edge. */}
          {/* Far to near, so the fast layer occludes the slow one. Each mask
              is on the outer group and stays put; only the field inside it
              moves, so the light never travels with the snow. Each rect is
              oversized by that layer's full travel, so a wrapped tile can
              never expose an edge. */}
          {SNOW_LAYERS.map((layer, index) => (
            <G
              key={`s${index}`}
              mask={`url(#${id.snowMaskBase}-${index})`}
              opacity={layer.alpha}
            >
              <AnimatedG animatedProps={drifts[index]}>
                <Rect
                  x={-layer.tile * layer.out}
                  y={-layer.tile * layer.down}
                  width={w + layer.tile * layer.out * 2}
                  height={h + layer.tile * layer.down * 2}
                  fill={`url(#${id.snowBase}-${index})`}
                />
              </AnimatedG>
            </G>
          ))}
          {/* The near layer again, unshaded, only where it has arrived. */}
          <G mask={`url(#${id.snowCoreMask})`} opacity={SNOW_LAYERS[2].alpha}>
            <AnimatedG animatedProps={driftNear}>
              <Rect
                x={-SNOW_LAYERS[2].tile * SNOW_LAYERS[2].out}
                y={-SNOW_LAYERS[2].tile * SNOW_LAYERS[2].down}
                width={w + SNOW_LAYERS[2].tile * SNOW_LAYERS[2].out * 2}
                height={h + SNOW_LAYERS[2].tile * SNOW_LAYERS[2].down * 2}
                fill={`url(#${id.snowLit})`}
              />
            </AnimatedG>
          </G>
          {/* Above the ramps it is dithering, across the whole strip it is the
              particulate. It must not be masked by the light. */}
          <Rect x="0" y="0" width={w} height={h} fill={`url(#${id.grain})`} />
          <Rect x="0" y="0" width={w} height={h} fill={RIM_INK} mask={`url(#${id.rimMask})`} />
        </Svg>
      )}
    </View>
  );
}
