/**
 * The myoseptal texture of salmon flesh — the "marbled" drawing — generated
 * here at import time so a retune is a constant change, never a redraw (the
 * `scales.ts` lesson: nothing hand-drawn).
 *
 * Companion to the scales motif, and deliberately its opposite. Scales are
 * skin: the outside of the animal, and the right texture for a ground or a
 * plane. A filled button is mass, not surface — it is the inside of the thing
 * — so the honest material for it is what you see when the fish is cut open:
 * the myosepta, pale sheets of collagen and lipid separating the muscle
 * blocks.
 *
 * Audited against photos of real salmon: myosepta are FEW, wide apart, each
 * band swells in the middle and thins at the tips, and neighbouring bands
 * sweep together. The veins are therefore drawn as FILLED tapered paths (a
 * polygon outlined around a centreline with a varying half-width), not
 * uniform strokes. The soft edge is a wider, fainter copy of the same polygon
 * under the crisp one — no SVG filters, because `react-native-svg` (15.15.3)
 * stubs `FeTurbulence`/`FeDisplacementMap` and blurring a pattern tile is the
 * kind of per-frame cost a button background must not pay.
 *
 * Guarantees:
 *  - Pale-only: the veins are drawn in the `semantic.flesh.band` token the
 *    renderers use, so the texture can only raise luminance under a label;
 *    label contrast is untouched by construction. Introducing a fill darker
 *    than the salmon ground would break that; `flesh.test.ts` asserts the
 *    0.2 opacity ceiling.
 *  - Seamless tiling: every centreline and every width profile is periodic
 *    over the tile in both axes, so the band leaving one edge is exactly the
 *    band entering the opposite edge — position, slope and width all agree.
 *    Wrap copies are baked into the data wherever ink reaches past a vertical
 *    tile edge, because `react-native-svg`'s Pattern has no overflow.
 */

/** One filled band pass: `[path, fillOpacity]`. */
export type FleshFill = readonly [d: string, opacity: number];

const TWO_PI = Math.PI * 2;

/** Veins per tile width. 3 over a 150px tile = 50px apart. */
const BANDS = 3;

/**
 * How far each vein bows sideways as it sweeps down the tile, in tile units.
 * All veins share the one bow, which is what makes them nest as arcs that
 * barrel together (myosepta) instead of independent wiggles.
 */
const ARC_AMP = 10;

/**
 * Vein half-profile: `[min, max]` width in tile units. The vein swells to
 * `max` mid-tile and thins to `min` at the tips — `min` stays visible so the
 * tile edge never shows a bare row.
 */
const WIDTH: readonly [number, number] = [2, 7];

/**
 * Ink: `[core, halo]` fill opacity. Few veins, so the core sits just under
 * the 0.2 ceiling `flesh.test.ts` enforces.
 */
const INK: readonly [number, number] = [0.16, 0.05];

/** The drawing's native tile, in the units the paths are authored in. */
export const fleshTile = { width: 150, height: 88 } as const;

/** The halo pass is this much wider than the core it softens. */
const HALO_SPREAD = 1.9;

type Sample = readonly [x: number, y: number, halfWidth: number];

/** A closed polygon around a centreline: down one edge, back up the other. */
const outline = (samples: ReadonlyArray<Sample>, spread: number): string => {
  const edge = (side: 1 | -1) =>
    samples.map(([x, y, half]) => `${(x + side * half * spread).toFixed(2)},${y.toFixed(2)}`);
  const left = edge(-1);
  const right = edge(1).reverse();
  return `M ${left.join(' L ')} L ${right.join(' L ')} Z`;
};

const build = (): ReadonlyArray<FleshFill> => {
  const { width: W, height: H } = fleshTile;
  const S = W / BANDS;
  const [wMin, wMax] = WIDTH;
  const [core, halo] = INK;
  const STEPS = 22;

  const fills: FleshFill[] = [];
  for (let k = 0; k < BANDS; k += 1) {
    const samples: Sample[] = [];
    for (let i = 0; i <= STEPS; i += 1) {
      const t = i / STEPS;
      const y = t * H;
      // Shared bow (fundamental + a fixed 0.35 second harmonic for the
      // unequal lobes) — periodic over H, so slope and position both hand
      // off cleanly at the tile edge.
      const bow = ARC_AMP * (Math.sin(TWO_PI * t) + 0.35 * Math.sin(2 * TWO_PI * t + 1.1));
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
      fills.push([outline(shifted, HALO_SPREAD), halo]);
      fills.push([outline(shifted, 1), core]);
    }
  }
  return fills;
};

/**
 * The filled passes both renderers draw, wrap copies included — a renderer
 * only has to map over the array.
 */
export const fleshFills: ReadonlyArray<FleshFill> = build();
