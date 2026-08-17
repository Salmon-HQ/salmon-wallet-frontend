/**
 * Marine snow geometry — the suspended matter of the water column, as data.
 *
 * Why this exists. The scales motif's deep field is drawn at 3.2×, and a
 * scale that large is supposed to read as *enormous* — a fish close enough to
 * fill the frame. It does not, on its own: a big arc with nothing between the
 * eye and it is equally readable as a small arc nearby. Scale is not a
 * property of an object, it is a property of the space in front of it.
 *
 * Marine snow is that space. Real flocs are composite organic aggregates,
 * conventionally everything above 0.5 mm equivalent spherical diameter and
 * ranging to a few centimetres, porous and off-white, held together by
 * zooplankton mucus — which is why they are drawn here as squashed ellipses
 * rather than dots (Alldredge & Silver 1988, via NOAA Ocean Exploration
 * "What is marine snow?"; Giering et al., Front. Mar. Sci. 2020). They sink at
 * ~10–100 m/day, on the order of 0.6 mm/s: real marine snow does not visibly
 * fall, which is why the drift below is a chosen number rather than a measured
 * one — see `depthDrift`.
 *
 * Three things the perception literature says this buys, and they are the
 * three properties the data encodes:
 *
 *  1. **Aerial perspective.** Scattering lays a veiling luminance over
 *     anything distant, so contrast and internal detail fall off with
 *     distance. Underwater the scattering length is metres rather than
 *     kilometres, so the falloff is steep. Encoded as three bands: near flocs
 *     are larger and brighter, far flocs smaller and dimmer.
 *  2. **Texture gradient.** Elements of assumed-uniform size project smaller
 *     and *denser* the farther away they are (Gibson 1955). Encoded by
 *     biasing each band's vertical placement: the near band sits high in the
 *     field, the far band pools toward the bottom.
 *  3. **Interposition.** A floc that overlaps the scales is unambiguously
 *     nearer, which fixes depth order; order plus the contrast gradient is
 *     what converts "far" into a distance, and distance plus retinal angle is
 *     what finally reads as a *size*. Held et al., "Using Blur to Affect
 *     Perceived Distance and Size" (ACM TOG 29(2), 2010) is the same argument
 *     run in the other direction — flatten the gradient and a real city reads
 *     as a model.
 *
 * One honest note on the physics: real marine-snow concentration *peaks* in
 * the upper 100–200 m and thins below it, so denser-toward-the-bottom is not
 * a bathymetric profile. It is the texture gradient of point 2 — density with
 * *distance from the eye* — and in this app's column the deeper part of the
 * frame is the farther part. The gradient is honest about what it encodes; it
 * is not a claim about the ocean at 40 m.
 *
 * Constraints that shaped the data, both inherited from `flesh.ts`:
 *
 *  1. NO FILTERS. `react-native-svg` (15.15.3) implements `FeTurbulence` and
 *     `FeDisplacementMap` as no-ops, so procedural noise does not exist on
 *     mobile. Every irregularity here — position, size, squash, brightness —
 *     is baked into the literals below, generated once from a seeded source
 *     and never randomised at render time. That is also what lets the DOM
 *     renderer serialise the field to a data URI: the drawing is a constant.
 *  2. CONTRAST IS CAPPED. Every particle's authored opacity is a multiplier
 *     on `semantic.water.snow`, which is itself under the 1.4:1 ceiling for a
 *     non-informational stroke. A multiplier is ≤ 1 by construction, so no
 *     particle can be brighter than the token; `contrast.test.ts` asserts the
 *     token, and `depthField.test.ts` asserts the multipliers.
 *
 * The field is one drawing, `depthFieldTile` units, scaled uniformly from the
 * column's width and anchored to the top of the ground. It repeats vertically
 * and only vertically: horizontal repetition is what makes a particle field
 * read as wallpaper, because the eye finds the seam by comparing two points at
 * the same height. Vertical repetition at a period of one full column height
 * puts at most one seam in the frame at a time, and it is what makes the drift
 * below a loop instead of a rewind.
 *
 * **The field runs the full height of the column, and that is the point.** It
 * used to stop in a 360px band that faded out before the first data row, which
 * put the entire motif exactly where the balance card covers it and left the
 * empty lower half of every screen bare — a fish cut off at the chest. The
 * band existed because the token rows were translucent, so a full-height field
 * would have been legible *through* an amount. That translucency was itself
 * off-system (`DESIGN.md`: content is opaque by default, translucency is a
 * privilege of floating chrome), so the fix was to make the rows opaque and
 * let the content occlude the motif, which is what The Scales Exclusion Rule
 * asks for in the first place: the rule says the motif is never *readable*
 * behind a value, not that the ground must be blank there.
 *
 * Depth is therefore carried by the two cues that survive occlusion — the
 * vertical brightness ramp baked into every floc's opacity, and the size and
 * density gradient between the bands — instead of by a crop.
 */

/**
 * The field's authored size. Wider than the widest column (430px) and taller
 * than the tallest column it has to cover, so the uniform "cover" scale never
 * runs out of drawing in either direction.
 */
export const depthFieldTile = { width: 440, height: 960 } as const;

/**
 * How the field moves. Marine snow is snow because it *sinks*: it is matter
 * falling out of the lit water, so the drift is downward and never upward.
 *
 * **`pxPerSecond` — why 3.** The real thing sinks at ~0.6 mm/s and is
 * therefore invisible, so the number cannot be taken from the ocean; it has to
 * be chosen against the eye. The brief is narrow: the drift must be
 * *findable* if you rest on it and *absent* if you do not, because a particle
 * field the eye catches unprompted stops being water and becomes a game's
 * weather system.
 *
 * At a phone's ~35 cm viewing distance one degree of visual angle is roughly
 * 34 px, so 3 px/s is about 0.09°/s — 5 arcmin/s. Fixated, with the static
 * frame of the screen as a reference, human velocity discrimination bottoms
 * out near 1–2 arcmin/s, so this sits a small multiple above the floor: stare
 * at one floc and it is unmistakably moving. Glance at the screen for half a
 * second and it has travelled 1.5 px, which is below the threshold for a
 * low-contrast target with no reference nearby. It is also ~1/60 of the
 * ~6°/s at which smooth motion starts to capture attention on its own, which
 * is the value that matters most here: The Surfacing is the system's only
 * light event and ambient motion must not compete with it.
 *
 * The speed is in **screen pixels**, not tile units, so it is the same
 * apparent velocity on a 400 px side panel and a 1440 px window — the tile
 * scales with the column's width, so a tile-unit speed would have run six
 * times faster on the desktop. The cycle length is derived from it rather
 * than authored; see `depthFieldCycleMs`.
 *
 * **`parallaxFactor` — why 0.2.** The field is the far plane, so it must move
 * *less* than the content in front of it; that ratio is the whole cue. One
 * fifth means a 600 px list scroll shifts the water 120 px — enough travel to
 * read as a separate plane, small enough that the content still clearly owns
 * the gesture. It is added to the drift, never substituted for it: the hand
 * moves the water faster for a moment, and the water keeps sinking either way.
 */
export const depthDrift = {
  pxPerSecond: 3,
  parallaxFactor: 0.2,
} as const;

/**
 * The tile's on-screen height for a column of `widthPx`.
 *
 * The scale is driven by width alone. It used to be CSS `cover` — the larger
 * of the two ratios — because a single non-repeating drawing had to reach the
 * bottom of the column on its own. Now that the field repeats vertically the
 * height ratio has nothing left to do, and width-driven is the honest scale:
 * it is identical to `cover` on every proportion wider than 440:960 (which is
 * every real window and phone) and it stops cropping the sides on the ones
 * that are narrower.
 */
export const depthFieldTileHeight = (widthPx: number): number =>
  (widthPx * depthFieldTile.height) / depthFieldTile.width;

/**
 * How long one full loop takes, in milliseconds, for a tile of
 * `tileHeightPx`. The loop is exactly one tile of travel — that is the only
 * displacement at which the field lands back on a copy of itself, so it is the
 * only one that can repeat without a visible jump.
 */
export const depthFieldCycleMs = (tileHeightPx: number): number =>
  (tileHeightPx / depthDrift.pxPerSecond) * 1000;

/**
 * Fold a drift-plus-parallax offset back into `[0, tileHeightPx)`.
 *
 * The renderers hang two extra tiles of field above the top of the column, so
 * any offset in that range is covered by drawing that already exists. Wrapping
 * is invisible because the field at offset `tileHeightPx` is the same pixels
 * as the field at 0.
 */
export const wrapDepthOffset = (offsetPx: number, tileHeightPx: number): number =>
  ((offsetPx % tileHeightPx) + tileHeightPx) % tileHeightPx;

/**
 * One floc: `[cx, cy, rx, ry, opacity]`. `opacity` is a multiplier on the
 * `water.snow` token, never an absolute alpha.
 */
export type SnowFloc = readonly [cx: number, cy: number, rx: number, ry: number, opacity: number];

export const marineSnow: ReadonlyArray<SnowFloc> = [
  [264.86, 0.7, 3.99, 3.43, 0.77],
  [250.43, 0.78, 4.43, 2.91, 0.73],
  [272.62, 1.6, 4.3, 2.77, 0.85],
  [109.25, 2.51, 0.91, 0.73, 0.33],
  [184.44, 5.62, 2.95, 2.58, 0.74],
  [73.13, 6.12, 2.62, 1.89, 0.51],
  [38.99, 6.89, 3.71, 2.99, 0.83],
  [332.85, 14.55, 4.27, 3.78, 0.76],
  [11.72, 18.8, 3.72, 2.94, 0.83],
  [47.47, 31.07, 3.33, 2.9, 0.86],
  [98.06, 38.62, 2.19, 1.8, 0.44],
  [27.23, 40.83, 2.36, 1.5, 0.61],
  [221.16, 41.91, 0.88, 0.67, 0.24],
  [372.32, 49.73, 1.42, 1.17, 0.34],
  [338.32, 56.14, 2.07, 1.28, 0.56],
  [185.58, 57.88, 0.98, 0.65, 0.3],
  [212.89, 62.02, 2.74, 1.92, 0.43],
  [363.55, 66.58, 2.89, 1.9, 0.73],
  [129.65, 75.64, 1.99, 1.84, 0.54],
  [6.84, 80.64, 1.06, 0.75, 0.26],
  [9.65, 82.71, 3.5, 2.86, 0.88],
  [176.88, 85.95, 1.38, 1.25, 0.34],
  [247.18, 88.6, 2.53, 1.8, 0.5],
  [303.24, 92.69, 2.19, 1.43, 0.58],
  [407.31, 110.43, 1.49, 0.93, 0.33],
  [159.5, 113.43, 1.58, 1.31, 0.27],
  [380.61, 117.67, 2.21, 2.0, 0.43],
  [294.75, 118.27, 4.11, 2.89, 0.73],
  [349.5, 126.54, 2.21, 1.64, 0.49],
  [313.12, 132.31, 2.39, 1.55, 0.51],
  [100.28, 133.09, 1.58, 0.96, 0.28],
  [394.4, 135.38, 1.16, 0.84, 0.31],
  [223.99, 151.46, 1.04, 0.9, 0.32],
  [54.02, 151.76, 0.88, 0.76, 0.35],
  [89.17, 159.0, 2.27, 1.56, 0.46],
  [77.18, 164.13, 1.09, 0.84, 0.34],
  [37.31, 175.13, 1.85, 1.15, 0.39],
  [112.51, 182.83, 1.29, 0.86, 0.22],
  [403.2, 189.67, 1.48, 0.99, 0.28],
  [352.81, 193.32, 2.26, 1.53, 0.52],
  [381.52, 205.24, 1.58, 1.15, 0.28],
  [272.32, 206.89, 3.6, 2.2, 0.79],
  [352.42, 210.43, 3.5, 2.47, 0.65],
  [403.64, 221.77, 1.19, 1.01, 0.33],
  [73.15, 228.09, 1.12, 0.82, 0.32],
  [115.59, 231.27, 1.27, 1.12, 0.23],
  [168.32, 234.66, 1.32, 1.15, 0.31],
  [423.19, 235.97, 4.27, 2.61, 0.64],
  [49.99, 237.88, 4.43, 2.92, 0.71],
  [190.7, 238.96, 4.48, 4.05, 0.62],
  [79.48, 248.9, 2.0, 1.79, 0.53],
  [41.77, 269.27, 1.16, 0.81, 0.25],
  [102.21, 273.91, 1.19, 0.8, 0.31],
  [422.07, 278.44, 1.43, 1.23, 0.26],
  [425.52, 279.6, 1.29, 1.1, 0.21],
  [31.71, 288.2, 1.33, 1.08, 0.2],
  [51.87, 288.79, 1.42, 0.97, 0.25],
  [186.55, 293.45, 0.87, 0.75, 0.29],
  [58.95, 294.23, 2.01, 1.61, 0.38],
  [76.36, 307.02, 1.46, 1.07, 0.2],
  [16.34, 309.64, 3.69, 3.2, 0.56],
  [324.76, 313.32, 1.18, 0.88, 0.23],
  [141.06, 316.21, 1.24, 0.99, 0.27],
  [227.83, 319.25, 1.41, 1.26, 0.26],
  [336.97, 319.52, 1.55, 1.09, 0.22],
  [54.08, 321.06, 1.44, 1.05, 0.24],
  [366.65, 321.67, 1.64, 1.03, 0.22],
  [63.57, 326.81, 2.54, 2.04, 0.39],
  [295.77, 327.46, 2.1, 1.54, 0.37],
  [132.16, 337.23, 2.5, 1.67, 0.42],
  [293.6, 383.95, 1.43, 1.03, 0.28],
  [247.76, 386.39, 2.11, 1.36, 0.5],
  [275.29, 393.87, 0.98, 0.69, 0.23],
  [43.69, 395.92, 2.81, 2.49, 0.6],
  [332.65, 397.98, 1.43, 1.23, 0.2],
  [141.21, 401.86, 2.24, 1.52, 0.34],
  [183.93, 405.41, 2.41, 1.85, 0.45],
  [92.36, 410.19, 2.33, 1.6, 0.43],
  [225.8, 411.82, 0.91, 0.75, 0.21],
  [41.6, 416.25, 2.49, 1.64, 0.33],
  [157.17, 420.59, 1.61, 1.17, 0.25],
  [19.77, 429.34, 1.19, 1.04, 0.23],
  [94.62, 430.37, 2.59, 2.04, 0.39],
  [390.99, 436.85, 2.36, 1.68, 0.39],
  [436.3, 447.16, 0.99, 0.63, 0.26],
  [314.61, 454.51, 1.1, 0.8, 0.25],
  [207.03, 456.01, 2.4, 1.68, 0.39],
  [193.94, 459.78, 2.84, 2.04, 0.65],
  [304.23, 461.65, 1.75, 1.29, 0.27],
  [66.41, 462.96, 2.64, 2.25, 0.33],
  [69.52, 471.32, 2.23, 1.78, 0.32],
  [409.25, 474.29, 1.51, 1.21, 0.24],
  [186.49, 480.59, 1.69, 1.29, 0.26],
  [107.71, 484.92, 2.64, 2.09, 0.37],
  [38.92, 485.29, 1.52, 1.22, 0.21],
  [61.97, 507.49, 0.96, 0.78, 0.23],
  [391.86, 509.52, 2.72, 1.85, 0.43],
  [292.41, 511.47, 1.45, 1.03, 0.24],
  [264.13, 522.0, 1.71, 1.37, 0.22],
  [332.74, 529.77, 1.83, 1.37, 0.32],
  [247.44, 530.24, 1.34, 1.04, 0.24],
  [384.51, 532.12, 2.19, 1.73, 0.42],
  [184.11, 536.92, 0.89, 0.83, 0.17],
  [10.35, 541.11, 1.18, 0.77, 0.18],
  [45.82, 541.65, 1.37, 0.83, 0.17],
  [10.39, 542.52, 2.2, 1.58, 0.4],
  [176.51, 545.61, 0.9, 0.68, 0.21],
  [400.33, 550.7, 2.96, 1.8, 0.52],
  [206.07, 553.96, 2.21, 1.33, 0.42],
  [187.35, 554.4, 2.54, 1.63, 0.29],
  [70.92, 555.4, 2.23, 1.72, 0.4],
  [266.19, 561.48, 2.12, 1.76, 0.33],
  [386.95, 564.72, 2.65, 1.98, 0.34],
  [379.91, 574.97, 1.9, 1.68, 0.28],
  [31.94, 578.16, 1.96, 1.36, 0.33],
  [341.61, 580.63, 1.94, 1.43, 0.28],
  [256.64, 582.68, 1.17, 0.79, 0.17],
  [375.15, 584.39, 4.4, 2.7, 0.45],
  [253.93, 589.25, 1.85, 1.28, 0.3],
  [40.52, 592.47, 1.38, 1.02, 0.25],
  [373.4, 596.85, 2.0, 1.78, 0.37],
  [275.71, 604.82, 1.62, 1.01, 0.22],
  [140.95, 611.3, 1.21, 0.78, 0.23],
  [257.6, 613.14, 1.38, 0.88, 0.17],
  [35.61, 619.07, 2.3, 1.82, 0.33],
  [158.25, 619.63, 2.17, 1.45, 0.34],
  [198.09, 619.93, 1.58, 1.09, 0.14],
  [1.93, 624.8, 1.06, 0.72, 0.19],
  [57.03, 629.77, 1.27, 1.11, 0.15],
  [107.16, 633.31, 2.45, 1.72, 0.37],
  [304.55, 635.13, 1.97, 1.47, 0.35],
  [177.78, 640.16, 1.38, 0.96, 0.14],
  [169.42, 640.17, 2.68, 1.82, 0.32],
  [67.88, 645.14, 1.65, 1.54, 0.15],
  [257.62, 649.14, 1.48, 1.03, 0.23],
  [33.32, 650.34, 1.04, 0.65, 0.18],
  [41.52, 655.87, 1.05, 0.66, 0.19],
  [113.01, 657.14, 1.6, 1.44, 0.17],
  [53.25, 657.71, 0.9, 0.83, 0.17],
  [278.64, 658.89, 2.6, 1.68, 0.27],
  [255.16, 668.31, 1.92, 1.52, 0.29],
  [220.55, 669.22, 1.53, 1.27, 0.2],
  [194.0, 669.68, 1.13, 0.72, 0.19],
  [357.0, 674.64, 1.69, 1.04, 0.22],
  [333.99, 679.34, 0.95, 0.75, 0.2],
  [381.64, 692.3, 2.29, 2.04, 0.28],
  [276.85, 694.71, 1.52, 1.16, 0.17],
  [107.19, 696.51, 1.34, 1.17, 0.19],
  [300.04, 696.93, 2.75, 2.01, 0.25],
  [399.24, 702.27, 1.14, 0.89, 0.18],
  [436.08, 703.47, 1.3, 1.01, 0.14],
  [226.48, 703.52, 0.97, 0.59, 0.14],
  [111.81, 721.38, 0.98, 0.9, 0.21],
  [48.8, 726.98, 1.74, 1.44, 0.17],
  [418.49, 727.96, 1.09, 1.01, 0.19],
  [218.62, 733.22, 1.85, 1.44, 0.33],
  [126.26, 733.45, 1.6, 1.45, 0.19],
  [360.51, 736.9, 0.95, 0.58, 0.13],
  [22.9, 739.26, 1.34, 1.08, 0.14],
  [201.07, 741.7, 1.2, 0.99, 0.13],
  [312.22, 742.21, 2.18, 1.58, 0.3],
  [221.2, 743.3, 1.0, 0.65, 0.18],
  [193.16, 744.76, 2.26, 1.39, 0.32],
  [56.1, 744.81, 1.73, 1.38, 0.17],
  [66.94, 746.94, 1.67, 1.28, 0.13],
  [204.05, 755.51, 1.53, 1.16, 0.18],
  [153.15, 756.63, 1.53, 0.96, 0.16],
  [22.74, 763.12, 1.28, 1.1, 0.13],
  [285.51, 763.61, 0.9, 0.83, 0.18],
  [171.99, 765.49, 0.87, 0.57, 0.17],
  [21.34, 772.9, 1.63, 1.35, 0.16],
  [231.14, 781.59, 1.31, 1.11, 0.15],
  [265.38, 786.6, 1.62, 1.31, 0.18],
  [63.64, 791.08, 1.67, 1.16, 0.17],
  [65.04, 791.69, 0.97, 0.65, 0.15],
  [26.55, 797.5, 0.87, 0.69, 0.18],
  [70.22, 803.75, 3.44, 2.99, 0.35],
  [435.57, 804.78, 1.5, 1.33, 0.19],
  [118.13, 812.02, 1.26, 0.95, 0.16],
  [114.28, 813.68, 1.34, 1.18, 0.16],
  [259.18, 816.01, 1.39, 1.21, 0.17],
  [55.88, 822.72, 2.3, 1.49, 0.24],
  [106.64, 824.54, 2.6, 1.65, 0.3],
  [250.71, 827.09, 1.62, 1.31, 0.14],
  [227.46, 827.29, 1.66, 1.19, 0.12],
  [161.11, 831.78, 2.1, 1.64, 0.27],
  [59.25, 835.72, 1.38, 0.86, 0.12],
  [318.85, 836.04, 3.72, 2.28, 0.36],
  [253.56, 850.59, 1.71, 1.2, 0.18],
  [146.14, 851.35, 1.21, 1.06, 0.18],
  [100.84, 853.18, 1.62, 1.48, 0.11],
  [158.5, 853.85, 1.29, 0.91, 0.14],
  [4.14, 866.4, 1.66, 1.23, 0.14],
  [130.13, 867.84, 1.41, 1.02, 0.14],
  [364.61, 885.42, 2.63, 2.01, 0.21],
  [120.83, 886.38, 1.25, 0.97, 0.11],
  [101.68, 886.64, 2.79, 1.92, 0.26],
  [176.71, 887.74, 2.52, 1.58, 0.23],
  [340.03, 889.26, 3.88, 2.55, 0.33],
  [392.99, 891.91, 1.81, 1.47, 0.27],
  [385.5, 893.79, 0.96, 0.64, 0.14],
  [388.63, 901.37, 2.88, 2.23, 0.38],
  [354.18, 903.28, 1.32, 1.1, 0.14],
  [389.94, 904.79, 1.18, 0.74, 0.14],
  [143.17, 909.03, 2.21, 1.76, 0.2],
  [376.16, 912.88, 1.32, 0.98, 0.16],
  [415.24, 917.64, 1.32, 0.88, 0.1],
  [432.27, 918.89, 1.47, 0.89, 0.16],
  [177.12, 920.05, 1.72, 1.44, 0.1],
  [125.41, 923.26, 4.39, 3.13, 0.38],
  [231.44, 930.29, 1.1, 0.97, 0.11],
  [156.99, 942.71, 1.09, 0.7, 0.1],
  [204.8, 943.9, 1.33, 1.13, 0.1],
  [144.57, 944.98, 1.07, 0.82, 0.13],
  [126.06, 954.42, 1.7, 1.57, 0.14],
  [107.3, 954.94, 1.43, 0.89, 0.14],
  [434.39, 957.8, 0.91, 0.58, 0.13],
  [427.86, 959.63, 1.74, 1.5, 0.11],
];

/**
 * The field as a standalone SVG document.
 *
 * The DOM half uses this as a `background-image` data URI rather than mounting
 * one live SVG node per floc: DESIGN.md requires the extension's deep field to
 * be an image composited once rather than a full-viewport SVG the browser can
 * be asked to repaint, and a serialised constant is the cheapest way to
 * satisfy that on all three DOM targets at once. It matters more now that the
 * field is the height of the column: a data URI at full height is still one
 * composited layer, where the same drawing as live nodes would not be. Mobile
 * draws the same array through `react-native-svg`, where an image would have
 * meant shipping a raster and picking a density for it.
 *
 * `width`/`height` are set so the image has an intrinsic size and CSS can
 * scale it with `cover` — a single uniform scale, which is what keeps the
 * flocs round on any column proportion.
 */
export const marineSnowSvg = (color: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${depthFieldTile.width}" height="${depthFieldTile.height}" viewBox="0 0 ${depthFieldTile.width} ${depthFieldTile.height}">` +
  marineSnow
    .map(
      ([cx, cy, rx, ry, opacity]) =>
        `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" fill-opacity="${opacity}"/>`
    )
    .join('') +
  `</svg>`;
