/**
 * The crest — how the wavefront is *painted*, as a pure function.
 *
 * `wavefront.ts` owns when the front arrives. This module owns what it looks
 * like when it does, and it exists for the same reason: two platforms draw the
 * same front, and a shape tuned in one of them is a shape that has drifted.
 *
 * ## What is being drawn, and its actual name
 *
 * Not an outline, and not one crest either. A **wave train**: a handful of thin
 * concentric rings travelling together, alternating lit and shadowed, decaying
 * outward. Product's reference photographs of a droplet on water all show the
 * same thing — five to a dozen rings across the frame — and it is the *train*
 * that reads as water. One expanding band, however carefully shaded, reads as a
 * hoop, which is exactly what product called it: *"no estás haciendo lo que te
 * dije de crear la crest como corresponde, con sombras a los costados y 'luz'
 * arriba."*
 *
 * Each ring is a **refraction crest**: the crown returns light and both flanks
 * fall into shadow, which is what a raised ridge of water reads like from
 * directly overhead. The physics is the standard height-field shading result —
 * the light term follows the *derivative* of the height field, not its height.
 * What that derivative gives you depends on where the light is: a ridge lit from
 * one side paints as a light band followed by a dark one; a ridge seen from
 * above a diffuse sky returns most along its crown, where the normal points back
 * at the viewer, and falls away on both slopes. **The second is the only one a
 * radial gradient can honestly draw**, because a radial gradient varies with
 * radius alone: it has no direction to put a light source in, so an asymmetric
 * radial profile silently claims the light is at the centre of the screen and
 * the front acquires a wrong side as it grows.
 *
 * ## The ground, and why this shape and not a brighter one
 *
 * The wait stands on `#0B0F19` — luminance **16 out of 255**. The light has
 * ~240 levels of headroom above that and a shadow has **16 below it, in total**.
 * A literally symmetric light-and-shadow profile is therefore unbuildable here:
 * the lit side shouts and the dark side has nowhere to go. The first attempt
 * measured **+101 / −9** on a captured frame and read as a bright teal rope with
 * no shadow at all.
 *
 * The references show the way out, and it is perceptual rather than tonal. A
 * dark ring in those photographs is not dark in absolute terms — it is dark
 * *because it sits immediately against a lit ring*. Simultaneous contrast, and
 * the Mach banding lateral inhibition performs on exactly this adjacency, does
 * the work the palette cannot. So: many thin rings rather than one thick band,
 * a light immediately beside every dark, a low crown alpha so the split is near
 * 3:1 rather than 11:1, and a faint base lift under the whole train so the
 * shadows have somewhere to descend from.
 *
 * ## Why it is stops and not strokes
 *
 * A hairline stroke reads as an *outline* — a boundary drawn around a region. A
 * band that darkens, brightens and darkens again across its thickness reads as
 * *relief*, because relief is the only thing in the physical world that produces
 * that luminance profile (Ramachandran, *Nature* 331:163, the light-from-above
 * prior). And a train of them is more **stops on the same node**, not more
 * nodes: the whole thing stays one pre-painted radial gradient moved by
 * `transform: scale()` alone, so five rings cost what one band cost.
 *
 * ## Why the numbers are here
 *
 * Every parameter is a named constant with a physical meaning, so tuning the
 * train is a number change in one file rather than a rewrite in two. The
 * readings that were captured and rejected are listed under
 * {@link CREST_VARIANTS}; switching to one is editing the constants below.
 *
 * @module motion/crest
 */

import { semantic } from '../theme/semantic';

// ============================================================================
// Shape
// ============================================================================

/**
 * Total thickness of the wave train, as a fraction of the front's radius.
 *
 * A fraction and not a pixel count, because the front is drawn once at its
 * final size and *scaled down*: only `transform` and `opacity` ever animate, so
 * the paint never leaves the compositor. The train therefore spreads as the
 * front travels, which is also what a real wave packet does as it disperses.
 *
 * 0.05 → 0.14 → 0.30. The width is not one band getting fatter: it is the room
 * {@link CREST_RINGS} thin rings need in order to sit side by side with calm
 * water between them.
 */
export const CREST_BAND = 0.3;

/**
 * How many lit rings travel in the train.
 *
 * **This is the property that makes it read as water rather than as a hoop.**
 * Five is enough to be unmistakably a train and few enough that each ring still
 * gets room to be a line rather than a band.
 */
export const CREST_RINGS = 5;

/**
 * Where the lit crown sits inside each ring's cell. `0.5` centres it, which is
 * what puts a shadow line on both sides of every lit line.
 */
export const CREST_RIDGE = 0.5;

/**
 * Half-width of one line, as a fraction of the ring spacing.
 *
 * **Line weight, not tube weight.** In the top-down reference the bright bands
 * are a small fraction of the spacing between them and most of the area is the
 * calm tone in between. The rejected band was ~25–30px of near-opaque teal,
 * which is why it read as an object laid on the screen rather than as a surface
 * being disturbed.
 */
export const CREST_FALLOFF = 0.12;

/**
 * Width of the transparent foot at each end of the train, as a fraction of the
 * train's thickness.
 *
 * Not decoration: past its last stop a radial gradient extends that stop's
 * colour outward forever, so a near-opaque shadow landing on offset 1 would
 * flood the entire screen outside the front with black. The feet are what make
 * the train end.
 */
export const CREST_FOOT = 0.05;

/**
 * Peak alpha of the innermost, strongest lit crown.
 *
 * Cut 0.7 → 0.22 by measurement, not by taste. At 0.6 the crown rendered **101
 * levels above** a ground its flanks can only fall **16 below** — an eleven to
 * one split, which the eye resolves as "a bright object" rather than "relief".
 * At 0.22 a captured frame measured the crown **+39** against flanks at **−14**,
 * a ratio near 3:1 with 54 levels between crown and flank.
 */
export const CREST_LIGHT_ALPHA = 0.22;

/**
 * Peak alpha of a shadow line.
 *
 * Black, not a darker brand colour: the shadow is an absence of returned light,
 * and tinting it makes the train read as coloured rings instead of relief.
 * Near-opaque because it has to be — 16 levels is the entire budget below the
 * ground, so anything less than most of it is not a shadow, it is a gap.
 */
export const CREST_SHADOW_ALPHA = 0.9;

/**
 * Alpha of the calm lift between the lines — felt, never seen as an edge.
 *
 * This is the tonal shift every reference photograph shows: the water
 * immediately around a disturbance is not the value of still water far from it.
 * On this ground it is also load-bearing rather than decorative, because it is
 * the base the shadow lines descend *from*.
 */
export const CREST_LIFT_ALPHA = 0.05;

/**
 * Amplitude multiplier per ring, travelling outward.
 *
 * The riders already attenuate as 1/√d, because a circular wave spreads its
 * energy over a growing perimeter; the paint has to show the same decay or the
 * train contradicts the motion it is supposed to be causing. In the references
 * the inner rings are sharp and strong and the outer ones fade — 0.62 per ring
 * puts the fifth at 15% of the first, which is where a ring becomes a
 * suggestion rather than a line.
 */
export const CREST_RING_DECAY = 0.62;

/**
 * How many crest *nodes* are alive at once.
 *
 * **One** (2026-08), and the train lives inside it as gradient stops rather
 * than as extra nodes. Product asked for a single wave in flight: *"está bien
 * si querés que sea una onda a la vez (que hasta que no salga de la pantalla el
 * icono no genera otra onda)."* {@link CREST_SPACING} and {@link CREST_DECAY}
 * survive so raising this back to 2 is one edit.
 */
export const CREST_COUNT = 1;

/** Spacing between successive crest nodes, as a fraction of one crossing. */
export const CREST_SPACING = 0.16;

/** Alpha multiplier applied to each crest node behind the leading one. */
export const CREST_DECAY = 0.45;

/**
 * How far into the crossing the train holds full alpha before dissipating, as a
 * fraction of the crossing.
 *
 * This one was set by measurement, not by taste. With the crest fading linearly
 * across the whole crossing, a centre-column luminance sweep of the rendered
 * frame at mid-crossing put the lit face **24 levels** above the ground but the
 * shaded face only **2.6 levels** below it: the fade had scrubbed the profile to
 * about 30% before the front was halfway out, and the half of the effect with
 * the least contrast to spend is the half that vanishes first.
 *
 * Raised 0.75 → 0.85 with the slower crossing: 15% of 1400ms is still 210ms of
 * fade, and the far riders — the tips at the bottom of the surface — were being
 * displaced by a train that had already dimmed to nothing.
 */
export const CREST_FADE_FROM = 0.85;

/**
 * The lit crowns' default colour.
 *
 * Owner ruling, 2026-09-01, supersedes the cold-ink argument this constant
 * used to carry: the crest and the marks on the wait and the lock are the
 * brand accent in both modes, not `water.light` — see DESIGN.md §The wait.
 * `accent.fill` is the button's own salmon, invariant across modes (owner,
 * 2026-09-02: the fish and the waves are the colour of the buttons, not the
 * darker text ink light uses for AA). A caller under a live theme may still
 * pass its own colour to {@link crestStops} / {@link crestGradientCSS}.
 */
export const CREST_LIGHT_COLOR = semantic.accent.fill;

/** The shadow lines. */
export const CREST_SHADOW_COLOR = '#000000';

// ============================================================================
// Derived
// ============================================================================

/** What a stop is doing in the profile. */
export type CrestStopRole = 'foot' | 'lift' | 'crown' | 'shadow';

/** One stop of the train's radial ramp. */
export interface CrestStop {
  /** Position along the radius, 0 at the origin and 1 at the front. */
  offset: number;
  color: string;
  opacity: number;
  /**
   * Structural role. Platforms ignore it — they only need offset, colour and
   * opacity — but it is what lets the tests assert the *structure* (rings
   * alternating, decaying outward) instead of re-deriving it from alphas that a
   * tuning pass is free to change.
   */
  role: CrestStopRole;
}

/**
 * The train's radial ramp, as gradient stops.
 *
 * Transparent at the inner foot, then `CREST_RINGS` cells each carrying a
 * boundary shadow line and a lit crown, every line a thin spike between two
 * stops of the calm lift, amplitude decaying outward, transparent again at the
 * outer foot.
 *
 * The alternation is the point. A dark line immediately beside a light one is
 * seen as shadow at a fraction of the contrast it would need on its own, which
 * is the only way to get relief onto a ground with 16 levels of room beneath it.
 *
 * @param alpha Overall multiplier — how alive this crest node is (1 for the
 *   leading one, less for any trailing it).
 * @param lightColor The lit crowns' colour. Defaults to {@link CREST_LIGHT_COLOR}
 *   (dark's `accent.ink`); a caller under a live theme passes its own
 *   resolved colour so the crest follows the mode.
 */
export function crestStops(alpha = 1, lightColor: string = CREST_LIGHT_COLOR): CrestStop[] {
  const inner = 1 - CREST_BAND;
  const foot = CREST_BAND * CREST_FOOT;
  const start = inner + foot;
  const spacing = (CREST_BAND - 2 * foot) / CREST_RINGS;
  const half = spacing * CREST_FALLOFF;

  const stops: CrestStop[] = [{ offset: inner, color: lightColor, opacity: 0, role: 'foot' }];
  // The lift decays with its ring like everything else: a calm level that stayed
  // put while the crowns faded would eventually sit *above* the outer crowns,
  // and a ring dimmer than the water around it is a groove, not a crest.
  const lift = (offset: number, decay: number) => {
    stops.push({
      offset,
      color: lightColor,
      opacity: CREST_LIFT_ALPHA * decay * alpha,
      role: 'lift',
    });
  };

  for (let ring = 0; ring <= CREST_RINGS; ring += 1) {
    const decay = CREST_RING_DECAY ** Math.min(ring, CREST_RINGS - 1);
    const boundary = start + ring * spacing;

    lift(boundary - half, decay);
    stops.push({
      offset: boundary,
      color: CREST_SHADOW_COLOR,
      opacity: CREST_SHADOW_ALPHA * decay * alpha,
      role: 'shadow',
    });
    lift(boundary + half, decay);

    if (ring === CREST_RINGS) break;

    const crown = start + (ring + CREST_RIDGE) * spacing;
    lift(crown - half, decay);
    stops.push({
      offset: crown,
      color: lightColor,
      opacity: CREST_LIGHT_ALPHA * decay * alpha,
      role: 'crown',
    });
    lift(crown + half, decay);
  }

  stops.push({ offset: 1, color: lightColor, opacity: 0, role: 'foot' });
  return stops;
}

/**
 * Full width of one line as a fraction of the front's radius — the number
 * {@link CREST_FALLOFF} actually buys, exposed so a test can assert the rings
 * stay line-weight however the train's thickness or ring count is retuned.
 */
export function crestLineWidth(): number {
  const spacing = (CREST_BAND * (1 - 2 * CREST_FOOT)) / CREST_RINGS;
  return 2 * spacing * CREST_FALLOFF;
}

/**
 * One entry per crest node alive at once: how far behind the leading front it
 * runs, as a fraction of the crossing, and how bright it is.
 */
export function crestTrain(): { lag: number; alpha: number }[] {
  return Array.from({ length: CREST_COUNT }, (_, index) => ({
    lag: index * CREST_SPACING,
    alpha: CREST_DECAY ** index,
  }));
}

/**
 * A CSS `radial-gradient` painting the train inside a box of the front's final
 * diameter. Pre-drawn once and moved by `transform: scale()` alone — the
 * gradient itself is never animated, so the layer is rasterised once and the
 * front stays on the compositor.
 */
export function crestGradientCSS(alpha = 1, lightColor: string = CREST_LIGHT_COLOR): string {
  const stops = crestStops(alpha, lightColor)
    .map(({ offset, color, opacity }) => `${rgba(color, opacity)} ${(offset * 100).toFixed(2)}%`)
    .join(', ');
  // `closest-side` on a square box puts the gradient's 100% exactly on the
  // front's radius, so a stop's `offset` and its CSS percentage are the same
  // number and the two platforms cannot disagree about where the rings are.
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
 * The readings that were drawn, captured on a real device and measured.
 * Documentation, not code: switching to one means editing the constants above
 * to match, so the next person tuning this starts from measured alternatives
 * rather than from zero.
 *
 * The measurement is a luminance sweep along a radius of the rendered frame.
 * "Ridge contrast" is the lit peak minus the darkest point of the shaded band
 * beside it — the number that decides whether the paint reads as relief or as
 * ink. The ground measures 16–17.
 *
 * - **ridge** — a tight bright ridge, one crest, asymmetric, salmon.
 *   `BAND 0.03`, `FALLOFF 0.18`, `LIGHT_ALPHA 0.75`, `SHADOW_ALPHA 0.7`,
 *   `COUNT 1`. Ridge contrast 85.6 at 180ms. Legible and clean, but a single
 *   expanding line is closer to an outline than to water.
 * - **swell** — a wide soft swell, one crest, asymmetric. `BAND 0.16`,
 *   `FALLOFF 0.7`, `LIGHT_ALPHA 0.35`, `SHADOW_ALPHA 0.35`. **Rejected on the
 *   numbers:** by mid-crossing the shaded face measured *above* the ground,
 *   because a falloff that wide smears the light across the shadow. It is a
 *   glow, and relief was the request.
 * - **train** — two asymmetric salmon crests. `BAND 0.05`, `FALLOFF 0.22`,
 *   `LIGHT_ALPHA 0.7`, `COUNT 2`. Shipped 2026-08 and replaced the same month:
 *   on a real phone the second ring read as a radar sweep and the salmon read
 *   as a brand element crossing the screen.
 * - **rope** — the first symmetric, cold reading. `BAND 0.09`, `FALLOFF 0.3`,
 *   `LIGHT_ALPHA 0.6`, `SHADOW_ALPHA 0.75`. Measured **+101 / −9** against a
 *   ground of 16: an eleven-to-one split, which is a bright teal tube with no
 *   visible shadow. The colour was right and the shape was not.
 * - **ripple** — shipped. A five-ring train: `BAND 0.3`, `RINGS 5`,
 *   `FALLOFF 0.12`, `RING_DECAY 0.62`, `LIGHT_ALPHA 0.22`, `SHADOW_ALPHA 0.9`,
 *   `LIFT_ALPHA 0.05`, `FADE_FROM 0.85`, light `water.light`. Thin alternating
 *   lines over a faint lift, decaying outward. Relief carried by the *structure*
 *   of the ramp rather than by absolute contrast, which is the only thing that
 *   works on a ground this dark.
 */
export const CREST_VARIANTS = ['ridge', 'swell', 'train', 'rope', 'ripple'] as const;
