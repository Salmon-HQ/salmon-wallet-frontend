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
 *
 * **The tile is one period of the drawing, not the artboard it was exported
 * from.** The two rows are the same curve translated by (-14.4073, +12.5459),
 * and each row's ink spans exactly 805.589 units horizontally. The old tile
 * was 822 × 26 — 16.4 units too wide and 0.9 too tall — so every repeat left
 * a bare column and a bare band where no arc was drawn. The period below is
 * measured from the data: width is each row's own span, height is twice the
 * row-to-row offset.
 */

/** One period of the drawing, in the units the paths are authored in. */
export const seigaihaTile = { width: 805.589, height: 25.0918 } as const;

/** The drawing itself: two rows of arcs, each authored in two halves. */
export const seigaihaPaths: readonly string[] = [
  /** Row 1 — left half */
  'M15.0858 13.8306C14.7343 1.01231 39.3378 -7.21907 43.5555 13.8306C44.9615 -1.01168 69.0729 -5.33023 72.7283 13.8307C73.0798 0.337654 96.4179 -6.40963 101.198 13.8307C101.55 2.02432 124.114 -7.75896 130.019 13.8307C131.425 -0.674348 154.904 -5.06029 158.84 13.8307C158.84 2.02432 181.476 -7.2861 187.662 13.4937C188.013 2.02432 210.297 -7.2861 216.483 13.4937C217.889 -0.674348 240.805 -5.12716 245.304 13.4937C246.007 0.000319639 269.556 -5.93676 273.774 13.4937C274.828 1.34966 296.409 -6.81383 302.595 13.1563C303.65 1.68699 325.512 -7.0837 331.416 13.1563C332.471 2.36166 353.489 -7.35356 360.238 13.1563C360.238 2.02432 383.365 -7.0837 388.707 13.1563C389.762 4.04833 410.288 -8.7029 417.88 13.1563',
  /** Row 1 — right half */
  'M417.881 13.5576C417.529 0.73936 442.133 -7.49202 446.35 13.5576C447.756 -1.28463 471.868 -5.60318 475.523 13.5577C475.875 0.0647045 499.213 -6.68258 503.993 13.5577C504.344 1.75137 526.909 -8.03191 532.814 13.5577C534.22 -0.947298 557.699 -5.33324 561.635 13.5577C561.635 1.75137 584.271 -7.55904 590.457 13.2207C590.808 1.75137 613.092 -7.55904 619.278 13.2207C620.684 -0.947298 643.6 -5.40011 648.099 13.2207C648.802 -0.27263 672.351 -6.20971 676.569 13.2207C677.623 1.07671 699.204 -7.08678 705.39 12.8834C706.445 1.41404 728.307 -7.35664 734.211 12.8834C735.266 2.08871 756.284 -7.62651 763.033 12.8834C763.033 1.75137 786.16 -7.35664 791.502 12.8834C792.557 3.77538 813.083 -8.97585 820.675 12.8834',
  /** Row 2 — left half (offset) */
  'M0.678533 26.3765C0.327098 13.5582 24.9305 5.32683 29.1483 26.3765C30.5542 11.5342 54.6657 7.21566 58.321 26.3766C58.6725 12.8836 82.0107 6.13627 86.7908 26.3766C87.1423 14.5702 109.707 4.78693 115.612 26.3766C117.018 11.8716 140.497 7.48561 144.433 26.3766C144.433 14.5702 167.068 5.2598 173.255 26.0396C173.606 14.5702 195.89 5.2598 202.076 26.0396C203.482 11.8716 226.398 7.41874 230.897 26.0396C231.6 12.5462 255.149 6.60914 259.367 26.0396C260.421 13.8956 282.002 5.73207 288.188 25.7022C289.242 14.2329 311.104 5.4622 317.009 25.7022C318.064 14.9076 339.082 5.19234 345.83 25.7022C345.83 14.5702 368.958 5.4622 374.3 25.7022C375.355 16.5942 395.881 3.843 403.473 25.7022',
  /** Row 2 — right half (offset) */
  'M403.473 26.1035C403.122 13.2853 427.725 5.05388 431.943 26.1035C433.349 11.2613 457.461 6.94271 461.116 26.1036C461.467 12.6106 484.806 5.86332 489.586 26.1036C489.937 14.2973 512.502 4.51399 518.407 26.1036C519.813 11.5986 543.292 7.21266 547.228 26.1036C547.228 14.2973 569.863 4.98685 576.049 25.7666C576.401 14.2973 598.685 4.98685 604.871 25.7666C606.277 11.5986 629.193 7.14579 633.692 25.7666C634.395 12.2733 657.944 6.33619 662.162 25.7666C663.216 13.6226 684.797 5.45912 690.983 25.4293C692.037 13.9599 713.899 5.18925 719.804 25.4293C720.859 14.6346 741.877 4.91939 748.625 25.4293C748.625 14.2973 771.753 5.18925 777.095 25.4293C778.15 16.3213 798.676 3.57005 806.268 25.4293',
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
 * opposite one. Row 1's right half overruns the right edge by half an arc;
 * row 2's arc cusps hang below the bottom edge and its right half does both.
 * This is the `overflow="visible"` the DOM would give us for free.
 */
export const seigaihaTiledPaths: readonly string[] = [
  ...seigaihaPaths,
  shiftSeigaiha(seigaihaPaths[1], -W, 0),
  shiftSeigaiha(seigaihaPaths[3], -W, 0),
  shiftSeigaiha(seigaihaPaths[2], 0, -H),
  shiftSeigaiha(seigaihaPaths[3], 0, -H),
  shiftSeigaiha(seigaihaPaths[3], -W, -H),
];
