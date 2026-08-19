/**
 * Candidate flesh textures — two alternatives to the shipped `flesh.ts`
 * drawing, generated here at import time so a retune is a constant change,
 * never a redraw (the `scales.ts` lesson: nothing hand-drawn).
 *
 * Why they exist: audited against photos of real salmon, the shipped texture
 * reads as wallpaper — too many veins (~3×), uniform stroke width, each wave
 * independent. Real myosepta are FEW, wide apart, each band swells in the
 * middle and thins at the tips, and neighbouring bands sweep together.
 *
 * Both variants are therefore drawn as FILLED tapered paths (a polygon
 * outlined around a centreline with a varying half-width), not uniform
 * strokes. The soft edge is a wider, fainter copy of the same polygon under
 * the crisp one — no SVG filters, because `react-native-svg` (15.15.3) stubs
 * `FeTurbulence`/`FeDisplacementMap` and blurring a pattern tile is the kind
 * of per-frame cost a button background must not pay.
 *
 * Shared guarantees, inherited from `flesh.ts`:
 *  - Pale-only: variants are drawn in the same `semantic.flesh.band` token the
 *    renderers already use, so the texture can only raise luminance under a
 *    label; label contrast is untouched by construction.
 *  - Seamless tiling: every centreline and every width profile is periodic
 *    over the tile in both axes, so the band leaving one edge is exactly the
 *    band entering the opposite edge — position, slope and width all agree.
 *  - No louder on average: fewer bands, so each one may sit a hair above the
 *    old per-stroke opacities while total ink over a tile stays in the same
 *    ballpark. The 0.2 opacity ceiling from `flesh.test.ts` still holds.
 *
 * Which variant renders is a debug-time choice — see
 * `apps/mobile/src/debug/fleshVariant.ts` (and its mirror constant in
 * `packages/ui/src/components/FleshBackground/fleshVariant.ts`).
 */

/** The switchable texture choices. `'current'` is the shipped `flesh.ts`. */
export type FleshVariant = 'current' | 'marbled';

/** One filled band pass: `[path, fillOpacity]`. */
export type FleshFill = readonly [d: string, opacity: number];

const TWO_PI = Math.PI * 2;

/* ------------------------------------------------------------------------ *
 * marbled — wide tapered veins sweeping together in nested arcs.
 * The organic option, closest to the reference photos.
 * ------------------------------------------------------------------------ */

/** Veins per tile width. 3 over a 150px tile = 50px apart (was ~14px). */
const MARBLED_BANDS = 3;

/**
 * How far each vein bows sideways as it sweeps down the tile, in tile units.
 * All veins share the one bow, which is what makes them nest as arcs that
 * barrel together (myosepta) instead of independent wiggles.
 */
const MARBLED_ARC_AMP = 10;

/**
 * Vein half-profile: `[min, max]` width in tile units. The vein swells to
 * `max` mid-tile and thins to `min` at the tips — `min` stays visible so the
 * tile edge never shows a bare row (the seam lesson from `flesh.test.ts`).
 */
const MARBLED_WIDTH: readonly [number, number] = [2, 7];

/**
 * Ink: `[core, halo]` fill opacity. Fewer veins, so the core sits a hair
 * under the old 0.2 top-pass while total ink per tile stays comparable.
 */
const MARBLED_INK: readonly [number, number] = [0.16, 0.05];

export const marbledTile = { width: 150, height: 88 } as const;

/* ------------------------------------------------------------------------ *
 * ------------------------------------------------------------------------ */

/** Vs stacked per tile height. 3 over 84px = 28px apart. */


/* ------------------------------------------------------------------------ *
 * Generation
 * ------------------------------------------------------------------------ */

/** The halo pass is this much wider than the core it softens. */
const HALO_SPREAD = 1.9;

type Sample = readonly [x: number, y: number, halfWidth: number];

/** A closed polygon around a centreline: down one edge, back up the other. */
const outline = (samples: ReadonlyArray<Sample>, spread: number, across: 'x' | 'y'): string => {
  const edge = (side: 1 | -1) =>
    samples.map(([x, y, half]) => {
      const offset = side * half * spread;
      const [px, py] = across === 'x' ? [x + offset, y] : [x, y + offset];
      return `${px.toFixed(2)},${py.toFixed(2)}`;
    });
  const left = edge(-1);
  const right = edge(1).reverse();
  return `M ${left.join(' L ')} L ${right.join(' L ')} Z`;
};

const buildMarbled = (): ReadonlyArray<FleshFill> => {
  const { width: W, height: H } = marbledTile;
  const S = W / MARBLED_BANDS;
  const [wMin, wMax] = MARBLED_WIDTH;
  const [core, halo] = MARBLED_INK;
  const STEPS = 22;

  const fills: FleshFill[] = [];
  for (let k = 0; k < MARBLED_BANDS; k += 1) {
    const samples: Sample[] = [];
    for (let i = 0; i <= STEPS; i += 1) {
      const t = i / STEPS;
      const y = t * H;
      // Shared bow (fundamental + a fixed 0.35 second harmonic for the
      // unequal lobes) — periodic over H, so slope and position both hand
      // off cleanly at the tile edge.
      const bow =
        MARBLED_ARC_AMP * (Math.sin(TWO_PI * t) + 0.35 * Math.sin(2 * TWO_PI * t + 1.1));
      // Rake: one band-slot of drift per tile height, so the band leaving
      // the bottom is exactly the next band entering the top.
      const x = (k + 0.5) * S + S * t + bow;
      // Swell mid-tile, thin (never zero) at the tips; periodic over H.
      const half = (wMin + (wMax - wMin) * (0.5 - 0.5 * Math.cos(TWO_PI * t))) / 2;
      samples.push([x, y, half]);
    }
    // Wrap copies wherever the halo's ink reaches past a vertical tile edge —
    // react-native-svg's Pattern has no overflow, so the wrap is baked in.
    const reach = samples.map(([x, , half]) => [x - half * HALO_SPREAD, x + half * HALO_SPREAD]);
    const minX = Math.min(...reach.map(([lo]) => lo));
    const maxX = Math.max(...reach.map(([, hi]) => hi));
    const shifts = [0, ...(minX < 0 ? [W] : []), ...(maxX > W ? [-W] : [])];
    for (const dx of shifts) {
      const shifted = samples.map(([x, y, half]) => [x + dx, y, half] as const);
      fills.push([outline(shifted, HALO_SPREAD, 'x'), halo]);
      fills.push([outline(shifted, 1, 'x'), core]);
    }
  }
  return fills;
};


/** Tile per candidate variant, keyed for the renderers' switch. */
export const fleshVariantTiles = {
  marbled: marbledTile,
} as const;

/**
 * The filled passes per candidate variant, wrap copies included — a renderer
 * only has to map over the array, exactly like `fleshTiledStrokes`.
 */
export const fleshVariantFills: Record<'marbled', ReadonlyArray<FleshFill>> = {
  marbled: buildMarbled(),
};
