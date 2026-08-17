/**
 * The crest — how the wavefront is *painted*, as a pure function.
 *
 * `wavefront.ts` owns when the front arrives. This module owns what it looks
 * like when it does, and it exists for the same reason: two platforms draw the
 * same front, and a shape tuned in one of them is a shape that has drifted.
 *
 * ## What is being drawn, and its actual name
 *
 * Not an outline. A **refraction crest**: across the *thickness* of the ring the
 * inner face returns light and the outer face falls into shadow, which is what a
 * raised ridge of water lit from above looks like from directly overhead.
 *
 * The physics is the standard height-field shading result — the light term is
 * driven by the *derivative* of the height field, not by its height. A crest is
 * a bump `h(r)`; the surface normal tilts with `∂h/∂r`, so the inward-facing
 * slope and the outward-facing slope catch light with opposite sign and the
 * single bump paints as a light band immediately followed by a dark one. It is
 * the same construction as a **bevel/emboss** (lit rim, shaded underside)
 * rotated into a radial band — which is exactly the bezel this system already
 * puts on a filled button, and exactly what a two-sided `ridge` border is.
 *
 * ## Why it is a gradient band and not two strokes
 *
 * A hairline stroke reads as an *outline* — a boundary drawn around a region. A
 * band with a light-to-dark ramp across it reads as *relief*, because relief is
 * the only thing in the physical world that produces that luminance profile. The
 * ramp is also what buys contrast on this ground: the water is `#10131c`, so the
 * shadow has very little room to go darker in absolute terms, and most of what
 * the eye reads at the ridge is **Mach banding** — the edge enhancement lateral
 * inhibition performs on exactly this light/dark adjacency. A hard ridge with a
 * modest alpha therefore looks stronger than a soft one with a large alpha.
 *
 * ## Why the numbers are here
 *
 * Every parameter is a named constant with a physical meaning, so tuning the
 * crest is a number change in one file rather than a rewrite in two. The
 * alternate readings that were captured and rejected are listed under
 * {@link CREST_VARIANTS}; switching to one is editing the six constants below.
 *
 * @module motion/crest
 */

import { accent } from '../theme/semantic';

// ============================================================================
// Shape
// ============================================================================

/**
 * Band thickness, as a fraction of the front's radius.
 *
 * A fraction and not a pixel count, because the front is drawn once at its
 * final size and *scaled down*: only `transform` and `opacity` ever animate, so
 * the paint never leaves the compositor. The band therefore thickens as the
 * front travels, which is also what a real wave packet does as it disperses.
 */
export const CREST_BAND = 0.05;

/**
 * Where the ridge line sits inside the band. `0` puts it on the outer edge,
 * `1` on the inner edge. At `0.5` the light face and the shadow face get equal
 * thickness — "mitad claro adentro, mitad oscuro afuera", literally.
 */
export const CREST_RIDGE = 0.5;

/**
 * Distance between the light peak and the shadow peak, as a fraction of the
 * band. This is the falloff hardness: small values put the two faces almost on
 * top of each other and the ridge snaps, large values smear it into a swell.
 */
export const CREST_FALLOFF = 0.22;

/** Peak alpha of the lit inner face. */
export const CREST_LIGHT_ALPHA = 0.7;

/**
 * Peak alpha of the shaded outer face.
 *
 * Black, not a darker brand colour: the shadow is an absence of returned light,
 * and tinting it makes the crest read as two coloured rings instead of one lit
 * ridge.
 */
export const CREST_SHADOW_ALPHA = 0.7;

/**
 * How many crests are alive at once. Each extra one trails the last by
 * {@link CREST_SPACING} of the crossing at {@link CREST_DECAY} of its alpha —
 * a wave train rather than a single pulse.
 */
export const CREST_COUNT = 2;

/** Spacing between successive crests, as a fraction of one crossing. */
export const CREST_SPACING = 0.16;

/** Alpha multiplier applied to each crest behind the leading one. */
export const CREST_DECAY = 0.45;

/**
 * How far into the crossing the crest holds full alpha before dissipating, as a
 * fraction of the crossing.
 *
 * This one was set by measurement, not by taste. With the crest fading linearly
 * across the whole crossing, a centre-column luminance sweep of the rendered
 * frame at mid-crossing put the lit face **24 levels** above the `#10131c`
 * ground but the shaded face only **2.6 levels** below it: the fade had scrubbed
 * the profile down to about 30% before the front was halfway out, and the half
 * of the effect that has the least contrast to spend is the half that vanishes
 * first. Holding the alpha and dropping it late keeps both faces alive over the
 * part of the crossing where riders are actually being displaced.
 */
export const CREST_FADE_FROM = 0.75;

/** The lit face. Salmon as *ink*: the front is light returning, not a fill. */
export const CREST_LIGHT_COLOR = accent.ink;

/** The shaded face. */
export const CREST_SHADOW_COLOR = '#000000';

// ============================================================================
// Derived
// ============================================================================

/** One stop of the crest's radial ramp. */
export interface CrestStop {
  /** Position along the radius, 0 at the origin and 1 at the front. */
  offset: number;
  color: string;
  opacity: number;
}

/**
 * The crest's radial ramp, as gradient stops.
 *
 * Four stops is the minimum that expresses the profile and it is also the
 * maximum that is useful: transparent at the inner foot, the light peak, the
 * shadow peak, transparent at the outer foot. The interpolation *between* the
 * two peaks is the ridge itself, so `CREST_FALLOFF` alone controls how hard the
 * turnover is and no fifth stop is needed to shape it.
 *
 * @param alpha Overall multiplier — how alive this crest is (1 for the leading
 *   one, less for the ones trailing it).
 */
export function crestStops(alpha = 1): CrestStop[] {
  const lightAt = 1 - CREST_BAND * (CREST_RIDGE + CREST_FALLOFF / 2);
  const shadowAt = 1 - CREST_BAND * (CREST_RIDGE - CREST_FALLOFF / 2);
  return [
    { offset: 1 - CREST_BAND, color: CREST_LIGHT_COLOR, opacity: 0 },
    { offset: lightAt, color: CREST_LIGHT_COLOR, opacity: CREST_LIGHT_ALPHA * alpha },
    { offset: shadowAt, color: CREST_SHADOW_COLOR, opacity: CREST_SHADOW_ALPHA * alpha },
    { offset: 1, color: CREST_SHADOW_COLOR, opacity: 0 },
  ];
}

/**
 * One entry per crest alive at once: how far behind the leading front it runs,
 * as a fraction of the crossing, and how bright it is.
 */
export function crestTrain(): { lag: number; alpha: number }[] {
  return Array.from({ length: CREST_COUNT }, (_, index) => ({
    lag: index * CREST_SPACING,
    alpha: CREST_DECAY ** index,
  }));
}

/**
 * A CSS `radial-gradient` painting the crest inside a box of the front's final
 * diameter. Pre-drawn once and moved by `transform: scale()` alone — the
 * gradient itself is never animated, so the layer is rasterised once and the
 * front stays on the compositor.
 */
export function crestGradientCSS(alpha = 1): string {
  const stops = crestStops(alpha)
    .map(({ offset, color, opacity }) => `${rgba(color, opacity)} ${(offset * 100).toFixed(2)}%`)
    .join(', ');
  // `closest-side` on a square box puts the gradient's 100% exactly on the
  // front's radius, so a stop's `offset` and its CSS percentage are the same
  // number and the two platforms cannot disagree about where the ridge is.
  return `radial-gradient(circle closest-side, transparent 0%, ${stops})`;
}

/** `#rrggbb` plus an alpha, as `rgba()`. The one colour utility this needs. */
function rgba(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
}

/**
 * The three readings that were drawn, captured on a 402×874 viewport and
 * measured. Documentation, not code: switching to one means editing the
 * constants above to match, so the next person tuning this starts from measured
 * alternatives rather than from zero.
 *
 * The measurement is a luminance sweep down the centre column of the rendered
 * frame, above the mark. "Ridge contrast" is the lit peak minus the darkest
 * point of the shaded face immediately outside it — the number that decides
 * whether the band reads as relief or as ink. The `#10131c` ground measures 17.
 *
 * | reading | ridge contrast @180ms | @300ms | shaded face vs ground |
 * | ------- | --------------------- | ------ | --------------------- |
 * | ridge   | 85.6                  | 84.0   | −9.1 / −11.0          |
 * | swell   | 42.0                  | 40.7   | −6.0 / **+1.3**       |
 * | train   | 79.0                  | 83.1   | −10.8 / −11.1         |
 *
 * - **ridge** — a tight bright ridge, one crest. `BAND 0.03`, `FALLOFF 0.18`,
 *   `LIGHT_ALPHA 0.75`, `SHADOW_ALPHA 0.7`, `COUNT 1`. Legible and clean, but a
 *   single expanding line is still closer to an outline than to water.
 * - **swell** — a wide soft swell, one crest. `BAND 0.16`, `FALLOFF 0.7`,
 *   `LIGHT_ALPHA 0.35`, `SHADOW_ALPHA 0.35`, `COUNT 1`. **Rejected on the
 *   numbers, not on taste:** by mid-crossing the shaded face measures *above*
 *   the ground, because a falloff that wide smears the light across the shadow.
 *   It is a glow. The relief is gone, and the relief was the request.
 * - **train** — shipped. `BAND 0.05`, `FALLOFF 0.22`, `LIGHT_ALPHA 0.7`,
 *   `SHADOW_ALPHA 0.7`, `COUNT 2`. Matches the single ridge's contrast to within
 *   a level and adds the second crest, which is what makes it read as *water*
 *   rather than as one expanding shape.
 */
export const CREST_VARIANTS = ['ridge', 'swell', 'train'] as const;
