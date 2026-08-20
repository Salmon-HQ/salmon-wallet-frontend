/**
 * EdgeLight — one edge of the balance carousel, lit by the chain beside it.
 *
 * What it imitates: light spilling around a pane suspended in water. The
 * source is a *plane behind the card*, not a lamp beside it, which is why the
 * falloff runs **inward from the edge** and nothing converges to a point. A
 * point source says "there is a thing at this spot"; an edge says "there is a
 * surface on this side", and the second one is what this affordance means.
 *
 * **One native view per edge.** The first cut drew this in SVG: per edge four
 * `<Pattern>`s (one of them the seigaiha, 168 cubic Béziers a cell), seven
 * gradients and seven masks, with an animated `<G>` inside. A mask forces the
 * renderer to draw content and mask into separate layers and composite them
 * per pixel, on the CPU, while the draw-command list is being recorded — and
 * animating the group invalidated the whole `<Svg>`, so all of it was redone
 * every frame. Measured on a Galaxy S20 FE with `dumpsys gfxinfo framestats`:
 * `draw (record)` 113.5 ms with the light, 0.0 ms without it; total frame
 * 245.8 ms against 11.1 ms. React (0.1 ms of traversals) and Reanimated
 * (1.8 ms) were innocent. `expo-linear-gradient` is a native view painted by a
 * system shader and never enters draw-command recording at all, so the whole
 * cost goes away.
 *
 * **What survived the move**, because none of it needed SVG:
 *
 * 1. **The inverse-square falloff.** Radiance goes as 1/r², and over a card's
 *    worth of water the geometric term dominates Beer-Lambert extinction by
 *    two orders of magnitude. A linear ramp is too bright in the mid-field and
 *    too weak at the source, which is the single most reliable "this is a
 *    gradient, not a light" tell.
 * 2. **The near-white rim** at the outermost pixels. A real source clips the
 *    sensor, and a light whose brightest pixel is fully saturated brand colour
 *    reads as a coloured shape rather than as light.
 * 3. **The cold far field.** Water absorbs red one to two orders of magnitude
 *    faster than blue, so a coloured light in water *must* cool as it travels.
 *    The brand hue lives near the canto and `semantic.water.light` — the token
 *    the system already licenses for cold light (DESIGN.md §The wait) —
 *    outlives it.
 * 4. **The chain's own colours**, mirrored per side, so the bright end is
 *    always against the screen.
 *
 * **What was dropped, deliberately:** the marine snow and its clock, the
 * seigaiha inside the light, the grain, and the radial hot band at mid-height.
 * The first three were the 113 ms; the fourth cannot exist in a linear
 * gradient, which has exactly one axis.
 *
 * **The one-axis problem.** The SVG version ran the hue *down* the edge while
 * the alpha ran *inward* — two axes, which is why it needed masks. A linear
 * gradient does one. The inward axis is the one that carries the meaning (it
 * is the falloff, and the falloff is what makes it read as light), so the hue
 * travels along it instead: the chain's palette is spent in the first fifth of
 * the strip — Solana purple at the canto, blue, then green — and the cold
 * survivor takes everything past it. This is an approximation of the original
 * and it is the right one to take: a vertical hue ramp was decoration, an
 * inward one is the absorption story from finding 3 drawn literally.
 */
import { semantic } from '@salmon/shared';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

const { water } = semantic;

// ============================================================================
// The falloff
// ============================================================================

/**
 * How many stops each component curve gets, and — more importantly — **where
 * they go**.
 *
 * The stops are spaced at equal steps in *alpha*, not in distance. Sampling
 * evenly in distance is what put visible steps of intensity inside the light:
 * the curve is near-vertical against the edge and near-flat further in, so
 * evenly-spaced stops leave a big alpha jump at the start and a row of
 * redundant ones at the end, and every stop where the slope changes hard is a
 * Mach band the eye picks up as a ridge. Inverting the curve and walking down
 * alpha puts the stops exactly where the light is changing fastest, so no
 * single segment ever carries more than 1/`GRADIENT_STOPS` of the range.
 */
const GRADIENT_STOPS = 28;

/**
 * Inverse-square from a source of finite apparent size `k`, normalised to
 * reach exactly zero at the far end of its own strip:
 *
 *   alpha(t) = ((1 + t/k)^-2 - tail) / (1 - tail),  tail = (1 + 1/k)^-2
 *
 * `k` means *how big the source looks*. A large `k` decays slowly and carries
 * far; a tiny one collapses into a sliver against the edge. It is also what
 * removes the singularity — a real source has width, so the curve starts flat
 * instead of at infinity.
 */
const falloff = (t: number, k: number): number => {
  const tail = 1 / (1 + 1 / k) ** 2;
  return ((1 + t / k) ** -2 - tail) / (1 - tail);
};

/** The same curve inverted: where does this alpha land? */
const distanceFor = (k: number, alpha: number): number => {
  const tail = 1 / (1 + 1 / k) ** 2;
  const scaled = alpha * (1 - tail) + tail;
  return Math.min(k * (1 / Math.sqrt(scaled) - 1), 1);
};

/** Walk alpha down in equal steps and solve for where each one lands. */
const stopsFor = (k: number): readonly number[] =>
  Array.from({ length: GRADIENT_STOPS + 1 }, (_, index) =>
    distanceFor(k, 1 - index / GRADIENT_STOPS)
  );

// ============================================================================
// Tunables — each with the band it was judged in
// ============================================================================

/** The chain's own colour, near the edge. Band 0.20-0.40. */
const SPILL_ALPHA = 0.3;
/** Band 0.12-0.24. Larger carries the brand hue further in.
 *
 *  `k` is the only knob that lengthens the light without touching its head:
 *  `falloff(0, k)` is exactly 1 for every `k`, so the alpha at the canto — and
 *  therefore the hot near-white where all the layers overlap — is invariant
 *  under this change. Raising the alpha instead would have brightened the
 *  source, and widening the strip would have moved where the light *ends*
 *  rather than how far it carries.
 *
 *  `SPILL_K` and `COLD_K` are scaled together by the same factor, which keeps
 *  the reach ordering intact: the cold layer still overtakes every brand hue
 *  well inside the strip and stays ahead to the far end, so the far field is
 *  water-coloured and not chain-coloured. */
const SPILL_K = 0.228;

/** The cold survivor, outliving the brand hue. Band 0.08-0.16 / 0.35-0.60. */
const COLD_ALPHA = 0.11;
const COLD_K = 0.6;

/** The near-white bloom at the outermost pixels — the only place in the layer
 *  allowed to approach white. Band 0.26-0.45. */
const RIM_ALPHA = 0.32;
/** Band 0.02-0.06. Small enough to be a source, soft enough not to be a line. */
const RIM_K = 0.045;
/** Not `#fff`: deep water has no pure white in it, and `neutral-50` is the
 *  whitest thing this system owns. */
const RIM_INK = semantic.text.primary;

// ============================================================================
// The hue ramp, inward
// ============================================================================

const rgb = (hex: string): readonly [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/**
 * One layer per hue, stacked — not one ramp that travels through them.
 *
 * A single gradient that *changes* hue along its run has a transition, and on a
 * curve this steep every transition lands inside the first fifth of the strip
 * where nearly all the alpha lives. Three colours crammed into that band read
 * as a ribbon: purple, cyan and green in legible stripes. Bitcoin never showed
 * it because one colour has no transition to see.
 *
 * So each hue gets its own layer, and a layer of one hue cannot band. What the
 * eye reads is the **sum**: over a near-black ground normal alpha compositing
 * differs from additive by at most the ground's own luminance, so the layers
 * genuinely add where they overlap rather than the top one hiding the rest.
 * Against the canto all of them overlap and the result is a hot near-white;
 * further in only the longest-reaching hue survives.
 *
 * That makes the reach ordering the whole design, and it is not a taste call:
 * water absorbs red one to two orders of magnitude faster than blue, so a hue
 * carrying red dies first. `HUE_REACH` scales each layer's `k` by where its
 * wavelength sits, shortest for the reddest. The colour gradient across the
 * strip stops being decoration and becomes the absorption, drawn.
 */
const HUE_REACH = [0.72, 1.32, 1.0] as const;

/** How far a hue carries, by how much red it holds — reddest dies soonest. */
const reachFor = (hex: string, index: number, total: number): number => {
  if (total === 1) return 1;
  const [r, , b] = rgb(hex);
  // Blue-dominant survives, red-dominant does not. Falls back to the authored
  // order when a palette is too neutral to rank.
  const measured = 0.72 + 0.6 * (b / (r + b || 1));
  return Number.isFinite(measured) ? measured : (HUE_REACH[index] ?? 1);
};

export interface EdgeLightProps {
  /** Which edge of the card this is — the side the light spills from. */
  side: 'left' | 'right';
  /** The neighbouring chain's palette, brightest end first. */
  colors: readonly string[];
}

export function EdgeLight({ side, colors }: EdgeLightProps) {
  // `expo-linear-gradient` types both lists as "at least two", which the
  // arithmetic below always satisfies but the compiler cannot see through a
  // `map`.
  type AtLeastTwo<T> = readonly [T, T, ...T[]];

  // Mirrored: the bright end is the edge against the screen.
  const bright = { x: side === 'left' ? 0 : 1, y: 0.5 };
  const dark = { x: side === 'left' ? 1 : 0, y: 0.5 };

  /** One single-hue falloff. Alpha is shared across the palette so the sum at
   *  the canto stays where it was tuned, however many hues a chain has. */
  const layer = (hex: string, peak: number, k: number, key: string) => {
    const locations = stopsFor(k);
    const stops = locations.map((t) => {
      const [r, g, b] = rgb(hex);
      return `rgba(${r}, ${g}, ${b}, ${(falloff(t, k) * peak).toFixed(4)})`;
    });
    return (
      <LinearGradient
        key={key}
        colors={stops as unknown as AtLeastTwo<string>}
        locations={locations as unknown as AtLeastTwo<number>}
        start={bright}
        end={dark}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    );
  };

  const share = SPILL_ALPHA / Math.sqrt(colors.length);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Cold first: it reaches furthest, so everything else lands on top. */}
      {layer(water.light, COLD_ALPHA, COLD_K, 'cold')}
      {colors.map((hex, index) =>
        layer(hex, share, SPILL_K * reachFor(hex, index, colors.length), `hue-${index}`)
      )}
      {/* The source itself, last and brightest. Never pure white. */}
      {layer(RIM_INK, RIM_ALPHA, RIM_K, 'rim')}
    </View>
  );
}
