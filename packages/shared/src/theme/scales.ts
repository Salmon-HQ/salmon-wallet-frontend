/**
 * The seigaiha fish-scale motif, as path data, owned here so mobile and DOM
 * draw one drawing instead of two copies of it.
 *
 * Companion to `flesh.ts`, and it inherits that file's hard-won constraint:
 * `react-native-svg`'s `Pattern` has no `overflow="visible"` — it accepts
 * x/y/width/height/viewBox/transform and nothing else — and on iOS a pattern
 * cell is a `CGPatternCreate` bounds rect, which CoreGraphics clips against.
 * So anything leaving the tile is simply lost on that platform. The wrap is
 * therefore baked into the data: `seigaihaTiledPaths` repeats each curve at
 * the tile displacements it actually reaches, so a clipped cell loses nothing
 * and both renderers draw the same field. `scales.test.ts` asserts it.
 */

/** One period of the drawing, in the units the paths are authored in. */
export const seigaihaTile = { width: 806.4, height: 25.2 } as const;

/**
 * The drawing itself: two rows of 28 identical arcs, one path per row.
 *
 * Generated, never drawn by hand — the previous hand-exported data had
 * uneven arc widths, asymmetric arcs and a baseline that stair-stepped
 * 0.95 units across the tile, so the cusps of one row missed the arc
 * apexes of the row below by up to 1.23 units. These strings come from a
 * four-constant formula (regenerate with it rather than editing numbers):
 *
 *   w = 28.8     arc width; tile width = 28·w
 *   rise = 12.6  arc height; tile height = 2·rise (row-to-row offset = rise)
 *   c = 16.8     control-point drop = 4/3·rise, which lands the cubic's
 *                apex at t = 0.5 exactly `rise` above the baseline — so
 *                every cusp of row N sits *exactly* on the apex of the
 *                row-N+1 arc below it
 *   phase = 0.1  x/y inset so no cusp or apex lies exactly on a tile edge
 *                (edge-tangent ink is where cell clipping produces seams)
 *
 *   row 1: baseline y = phase + rise, cusps at x = phase + i·w
 *   row 2: row 1 translated by (−w/2, +rise)
 *   each arc: M x0 y0 C x0 (y0−c) (x0+w) (y0−c) (x0+w) y0
 */
export const seigaihaPaths: readonly string[] = [
  /** Row 1 */
  'M0.1 12.7C0.1 -4.1 28.9 -4.1 28.9 12.7C28.9 -4.1 57.7 -4.1 57.7 12.7C57.7 -4.1 86.5 -4.1 86.5 12.7C86.5 -4.1 115.3 -4.1 115.3 12.7C115.3 -4.1 144.1 -4.1 144.1 12.7C144.1 -4.1 172.9 -4.1 172.9 12.7C172.9 -4.1 201.7 -4.1 201.7 12.7C201.7 -4.1 230.5 -4.1 230.5 12.7C230.5 -4.1 259.3 -4.1 259.3 12.7C259.3 -4.1 288.1 -4.1 288.1 12.7C288.1 -4.1 316.9 -4.1 316.9 12.7C316.9 -4.1 345.7 -4.1 345.7 12.7C345.7 -4.1 374.5 -4.1 374.5 12.7C374.5 -4.1 403.3 -4.1 403.3 12.7C403.3 -4.1 432.1 -4.1 432.1 12.7C432.1 -4.1 460.9 -4.1 460.9 12.7C460.9 -4.1 489.7 -4.1 489.7 12.7C489.7 -4.1 518.5 -4.1 518.5 12.7C518.5 -4.1 547.3 -4.1 547.3 12.7C547.3 -4.1 576.1 -4.1 576.1 12.7C576.1 -4.1 604.9 -4.1 604.9 12.7C604.9 -4.1 633.7 -4.1 633.7 12.7C633.7 -4.1 662.5 -4.1 662.5 12.7C662.5 -4.1 691.3 -4.1 691.3 12.7C691.3 -4.1 720.1 -4.1 720.1 12.7C720.1 -4.1 748.9 -4.1 748.9 12.7C748.9 -4.1 777.7 -4.1 777.7 12.7C777.7 -4.1 806.5 -4.1 806.5 12.7',
  /** Row 2 — row 1 translated by (−w/2, +rise) */
  'M-14.3 25.3C-14.3 8.5 14.5 8.5 14.5 25.3C14.5 8.5 43.3 8.5 43.3 25.3C43.3 8.5 72.1 8.5 72.1 25.3C72.1 8.5 100.9 8.5 100.9 25.3C100.9 8.5 129.7 8.5 129.7 25.3C129.7 8.5 158.5 8.5 158.5 25.3C158.5 8.5 187.3 8.5 187.3 25.3C187.3 8.5 216.1 8.5 216.1 25.3C216.1 8.5 244.9 8.5 244.9 25.3C244.9 8.5 273.7 8.5 273.7 25.3C273.7 8.5 302.5 8.5 302.5 25.3C302.5 8.5 331.3 8.5 331.3 25.3C331.3 8.5 360.1 8.5 360.1 25.3C360.1 8.5 388.9 8.5 388.9 25.3C388.9 8.5 417.7 8.5 417.7 25.3C417.7 8.5 446.5 8.5 446.5 25.3C446.5 8.5 475.3 8.5 475.3 25.3C475.3 8.5 504.1 8.5 504.1 25.3C504.1 8.5 532.9 8.5 532.9 25.3C532.9 8.5 561.7 8.5 561.7 25.3C561.7 8.5 590.5 8.5 590.5 25.3C590.5 8.5 619.3 8.5 619.3 25.3C619.3 8.5 648.1 8.5 648.1 25.3C648.1 8.5 676.9 8.5 676.9 25.3C676.9 8.5 705.7 8.5 705.7 25.3C705.7 8.5 734.5 8.5 734.5 25.3C734.5 8.5 763.3 8.5 763.3 25.3C763.3 8.5 792.1 8.5 792.1 25.3',
];

/**
 * Translates a path. Every number in this data is one half of an `x y` pair,
 * in order (`M x y`, then `C x1 y1 x2 y2 x y`), so parity is the whole parser.
 */
export const shiftSeigaiha = (d: string, dx: number, dy: number): string => {
  let i = 0;
  return d.replace(/-?\d*\.?\d+/g, (n) => {
    const shifted = Number(n) + (i++ % 2 === 0 ? dx : dy);
    return String(Number(shifted.toFixed(5)));
  });
};

const { width: W, height: H } = seigaihaTile;

/**
 * The paths a renderer actually draws: the drawing, plus a copy of every curve
 * that reaches past an edge, displaced by a whole tile so it re-enters at the
 * opposite one. Row 1 overruns the right edge by `phase`; row 2 overruns the
 * left edge by `w/2 − phase` and its cusps hang `phase` below the bottom edge,
 * so it comes back from the right, from above, and from both at the corner.
 * This is the `overflow="visible"` the DOM would give us for free.
 */
export const seigaihaTiledPaths: readonly string[] = [
  ...seigaihaPaths,
  shiftSeigaiha(seigaihaPaths[0], -W, 0),
  shiftSeigaiha(seigaihaPaths[1], W, 0),
  shiftSeigaiha(seigaihaPaths[1], 0, -H),
  shiftSeigaiha(seigaihaPaths[1], W, -H),
];
