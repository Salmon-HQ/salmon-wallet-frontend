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
 *     kilometres, so the falloff is steep.
 *  2. **Texture gradient.** Elements of assumed-uniform size project smaller
 *     and *denser* the farther away they are (Gibson 1955). Encoded by
 *     biasing vertical placement with depth: the near flocs sit high in the
 *     field, the far ones pool toward the bottom.
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
 * density gradient down the field — instead of by a crop.
 *
 * ---
 *
 * **How size and opacity are generated, and why they are one decision.**
 *
 * The field used to author size and opacity as two independent numbers, and
 * they disagreed: opacity tracked depth strongly (r = -0.69 against `cy`)
 * while size barely tracked it at all (r = -0.27). That leaves the field full
 * of mixed signals — a *large* floc that is *faint* is neither near nor far,
 * it is just a smudge — and a mixed signal is what flattens a depth ramp. It
 * also meant the largest flocs (rx up to 4.48) read as objects rather than as
 * suspended matter, because nothing about them said "close".
 *
 * Every floc now carries one hidden parameter instead: `z`, its optical
 * distance, spanning `[1, depthRampZFar]`. Size and opacity are both functions of
 * that single `z`, so they cannot decorrelate again:
 *
 *  - **size** follows the projective law, `rx = depthRamp.rxNear / z` (`depthRampSize`) — the exact
 *    statement of the texture gradient in point 2: an object of fixed real
 *    size subtends an angle inversely proportional to its distance.
 *  - **opacity** follows Beer–Lambert veiling, `exp(-depthRampMu * (z - 1))` (`depthRampOpacity`) — the
 *    exact statement of the aerial perspective in point 1: transmittance
 *    decays exponentially through a scattering medium.
 *
 * The result is that a near floc is larger *and* stronger and a far floc is
 * smaller *and* fainter, always, with `corr(rx, opacity) = 1.00`. That
 * covariance is the whole point — the eye reads "distant" from several cues
 * agreeing far more readily than from any one of them shouting. It is pinned
 * by `depthField.test.ts`, which fails if a future edit makes a bigger floc
 * fainter than a smaller one.
 *
 * `z` itself is a blend, 70% of the floc's rank by its original size and 30%
 * of its height down the tile, re-ranked to a uniform spread. The size term
 * preserves the spatial character of the field that was already judged; the
 * height term is what put the texture gradient into the *size* data rather
 * than only into the brightness, and it is why `corr(cy, rx)` doubled.
 *
 * **Continuous, not layered.** Three discrete plates would be easier to
 * reason about, and this file used to describe itself as having them. They
 * are wrong here for two reasons. A 218-particle field sorted into three
 * sizes reads as a sprite sheet rather than as water — the eye finds the three
 * classes and the illusion of a volume collapses into three stickers. And the
 * one thing discrete plates genuinely buy, a different parallax rate per
 * plate, is unavailable: both renderers move the whole field on a single
 * transform (see `depthDrift`), and splitting that into three layers is a
 * motion change, which this field's motion is not.
 *
 * **Why the far end could not get much smaller.** The brief was to shrink the
 * flocs, and most of that lands on the near end (max rx 4.48 → 2.55, -43%)
 * because the far end was already on its floor. `depthRamp.rxFar` is 0.85 tile units,
 * which on the narrowest column this ships in — a ~400px extension side panel
 * at dpr 1 — is a 0.8px radius: the smallest ellipse that still rasterises as
 * a dot rather than as a smudge of antialiasing. Below that a particle does
 * not read as distant, it reads as absent. The same floor applies to opacity
 * and is the harder of the two; see `depthRamp.opacityFar`.
 *
 * **No blur cue, deliberately.** Softness is the third classical depth cue
 * (Held et al., below) and `FeGaussianBlur` is the one filter primitive
 * `react-native-svg` actually implements. It is still not used. At these
 * sizes it buys nothing that the size ramp does not already buy — a Gaussian
 * on a 1px ellipse spreads the same ink over more pixels, which is to say it
 * lowers the peak alpha of a particle that is already within two 8-bit levels
 * of the ground, and the far end is floor-bound precisely there. The far
 * flocs get their softness free anyway: at under a pixel of radius the
 * rasteriser's own antialiasing is the blur. A filter on the `<Defs>` group
 * that the mobile renderer `<Use>`s through a `clipPath` is also exactly the
 * fragile combination this file's first constraint exists to avoid.
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
 * is the value that matters most here: the wave's ring is the system's only
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

/**
 * The depth ramp the baked flocs were generated from, and are still checked
 * against.
 *
 * Nothing reads this at render time — the field is literals, as constraint 1
 * requires. It is here because the law is the actual design decision and the
 * literals are only its output: `depthField.test.ts` re-derives every floc's
 * `z` from its `rx` and asserts the opacity that `z` implies, so a hand-edit
 * that brightens one floc without growing it fails the suite instead of
 * quietly flattening the ramp.
 *
 * `rxFar` is a rendering floor, not a taste choice: 0.85 tile units is a
 * 0.8px radius on the narrowest column this ships in (a ~400px extension side
 * panel at dpr 1), which is the smallest ellipse that still rasterises as a
 * dot. `opacityFar` is the same kind of floor one layer down — a multiplier
 * of 0.10 on `water.snow` composites to about 2 levels in 255 against the
 * ramp's lightest stop, which is the least a particle can differ from the
 * ground and still be a particle rather than panel dither.
 */
export const depthRamp = {
  /** Ellipse radius at `z = 1`, in tile units. */
  rxNear: 2.55,
  /** Ellipse radius at `z = zFar`. The rasteriser's floor; see above. */
  rxFar: 0.85,
  /** Opacity multiplier at `z = zFar`. The panel's floor; see above. */
  opacityFar: 0.1,
} as const;

/** Optical distance of the farthest floc. Derived: size is `rxNear / z`. */
export const depthRampZFar = depthRamp.rxNear / depthRamp.rxFar;

/** Beer–Lambert extinction, fixed by requiring `opacityFar` at `zFar`. */
export const depthRampMu = -Math.log(depthRamp.opacityFar) / (depthRampZFar - 1);

/** The floc size a given optical distance projects to. */
export const depthRampSize = (z: number): number => depthRamp.rxNear / z;

/** The opacity multiplier a given optical distance is veiled to. */
export const depthRampOpacity = (z: number): number => Math.exp(-depthRampMu * (z - 1));

export const marineSnow: ReadonlyArray<SnowFloc> = [
  [264.86, 0.7, 2.48, 2.13, 0.97],
  [250.43, 0.78, 2.55, 1.68, 1],
  [272.62, 1.6, 2.53, 1.63, 0.99],
  [109.25, 2.51, 1.04, 0.83, 0.19],
  [184.44, 5.62, 2.4, 2.1, 0.93],
  [73.13, 6.12, 2.22, 1.6, 0.84],
  [38.99, 6.89, 2.44, 1.96, 0.95],
  [332.85, 14.55, 2.5, 2.22, 0.98],
  [11.72, 18.8, 2.46, 1.94, 0.96],
  [47.47, 31.07, 2.37, 2.07, 0.92],
  [98.06, 38.62, 2.07, 1.7, 0.77],
  [27.23, 40.83, 2.15, 1.37, 0.81],
  [221.16, 41.91, 1.02, 0.78, 0.18],
  [372.32, 49.73, 1.39, 1.15, 0.38],
  [338.32, 56.14, 1.89, 1.17, 0.67],
  [185.58, 57.88, 1.06, 0.7, 0.2],
  [212.89, 62.02, 2.26, 1.58, 0.86],
  [363.55, 66.58, 2.3, 1.51, 0.88],
  [129.65, 75.64, 1.84, 1.7, 0.64],
  [6.84, 80.64, 1.09, 0.77, 0.21],
  [9.65, 82.71, 2.33, 1.91, 0.9],
  [176.88, 85.95, 1.35, 1.22, 0.36],
  [247.18, 88.6, 2.17, 1.54, 0.82],
  [303.24, 92.69, 1.96, 1.28, 0.7],
  [407.31, 110.43, 1.44, 0.9, 0.41],
  [159.5, 113.43, 1.53, 1.27, 0.47],
  [380.61, 117.67, 2.03, 1.83, 0.74],
  [294.75, 118.27, 2.42, 1.7, 0.94],
  [349.5, 126.54, 2, 1.48, 0.73],
  [313.12, 132.31, 2.12, 1.37, 0.79],
  [100.28, 133.09, 1.52, 0.92, 0.46],
  [394.4, 135.38, 1.11, 0.81, 0.23],
  [223.99, 151.46, 1.03, 0.89, 0.18],
  [54.02, 151.76, 0.98, 0.84, 0.16],
  [89.17, 159, 2.06, 1.41, 0.76],
  [77.18, 164.13, 1.07, 0.82, 0.2],
  [37.31, 175.13, 1.68, 1.05, 0.55],
  [112.51, 182.83, 1.2, 0.8, 0.27],
  [403.2, 189.67, 1.37, 0.92, 0.37],
  [352.81, 193.32, 1.98, 1.34, 0.72],
  [381.52, 205.24, 1.46, 1.06, 0.42],
  [272.32, 206.89, 2.24, 1.37, 0.85],
  [352.42, 210.43, 2.2, 1.56, 0.83],
  [403.64, 221.77, 1.1, 0.93, 0.22],
  [73.15, 228.09, 1.05, 0.77, 0.19],
  [115.59, 231.27, 1.15, 1.01, 0.24],
  [168.32, 234.66, 1.22, 1.06, 0.28],
  [423.19, 235.97, 2.28, 1.39, 0.87],
  [49.99, 237.88, 2.32, 1.53, 0.89],
  [190.7, 238.96, 2.35, 2.13, 0.91],
  [79.48, 248.9, 1.69, 1.51, 0.56],
  [41.77, 269.27, 1.04, 0.73, 0.19],
  [102.21, 273.91, 1.07, 0.72, 0.21],
  [422.07, 278.44, 1.31, 1.13, 0.34],
  [425.52, 279.6, 1.14, 0.97, 0.24],
  [31.71, 288.2, 1.19, 0.97, 0.27],
  [51.87, 288.79, 1.27, 0.87, 0.31],
  [186.55, 293.45, 0.95, 0.82, 0.14],
  [58.95, 294.23, 1.67, 1.34, 0.55],
  [76.36, 307.02, 1.31, 0.96, 0.34],
  [16.34, 309.64, 2.19, 1.9, 0.83],
  [324.76, 313.32, 1.05, 0.78, 0.19],
  [141.06, 316.21, 1.09, 0.87, 0.21],
  [227.83, 319.25, 1.25, 1.12, 0.3],
  [336.97, 319.52, 1.35, 0.95, 0.36],
  [54.08, 321.06, 1.3, 0.94, 0.33],
  [366.65, 321.67, 1.45, 0.91, 0.42],
  [63.57, 326.81, 2.04, 1.64, 0.75],
  [295.77, 327.46, 1.65, 1.21, 0.53],
  [132.16, 337.23, 1.97, 1.32, 0.71],
  [293.6, 383.95, 1.24, 0.9, 0.3],
  [247.76, 386.39, 1.63, 1.05, 0.52],
  [275.29, 393.87, 0.96, 0.68, 0.15],
  [43.69, 395.92, 2.1, 1.86, 0.78],
  [332.65, 397.98, 1.23, 1.06, 0.29],
  [141.21, 401.86, 1.71, 1.16, 0.57],
  [183.93, 405.41, 1.86, 1.43, 0.65],
  [92.36, 410.19, 1.83, 1.25, 0.63],
  [225.8, 411.82, 0.92, 0.76, 0.13],
  [41.6, 416.25, 1.88, 1.24, 0.66],
  [157.17, 420.59, 1.34, 0.97, 0.35],
  [19.77, 429.34, 1.03, 0.9, 0.18],
  [94.62, 430.37, 1.91, 1.51, 0.68],
  [390.99, 436.85, 1.79, 1.27, 0.61],
  [436.3, 447.16, 0.96, 0.61, 0.15],
  [314.61, 454.51, 0.99, 0.72, 0.16],
  [207.03, 456.01, 1.81, 1.27, 0.63],
  [193.94, 459.78, 2.09, 1.5, 0.78],
  [304.23, 461.65, 1.48, 1.09, 0.43],
  [66.41, 462.96, 1.94, 1.65, 0.7],
  [69.52, 471.32, 1.66, 1.33, 0.54],
  [409.25, 474.29, 1.25, 1, 0.3],
  [186.49, 480.59, 1.38, 1.05, 0.38],
  [107.71, 484.92, 1.9, 1.51, 0.68],
  [38.92, 485.29, 1.26, 1.01, 0.31],
  [61.97, 507.49, 0.92, 0.75, 0.13],
  [391.86, 509.52, 1.93, 1.31, 0.69],
  [292.41, 511.47, 1.18, 0.84, 0.27],
  [264.13, 522, 1.37, 1.09, 0.37],
  [332.74, 529.77, 1.42, 1.06, 0.4],
  [247.44, 530.24, 1.08, 0.84, 0.21],
  [384.51, 532.12, 1.56, 1.23, 0.48],
  [184.11, 536.92, 0.89, 0.83, 0.12],
  [10.35, 541.11, 0.98, 0.64, 0.16],
  [45.82, 541.65, 1.08, 0.65, 0.21],
  [10.39, 542.52, 1.57, 1.13, 0.49],
  [176.51, 545.61, 0.9, 0.68, 0.12],
  [400.33, 550.7, 2.01, 1.22, 0.74],
  [206.07, 553.96, 1.59, 0.95, 0.5],
  [187.35, 554.4, 1.76, 1.13, 0.59],
  [70.92, 555.4, 1.59, 1.23, 0.5],
  [266.19, 561.48, 1.52, 1.27, 0.46],
  [386.95, 564.72, 1.85, 1.38, 0.65],
  [379.91, 574.97, 1.42, 1.25, 0.4],
  [31.94, 578.16, 1.44, 1, 0.41],
  [341.61, 580.63, 1.43, 1.05, 0.41],
  [256.64, 582.68, 0.97, 0.65, 0.15],
  [375.15, 584.39, 2.14, 1.31, 0.8],
  [253.93, 589.25, 1.39, 0.96, 0.38],
  [40.52, 592.47, 1.07, 0.79, 0.2],
  [373.4, 596.85, 1.47, 1.31, 0.43],
  [275.71, 604.82, 1.28, 0.8, 0.32],
  [140.95, 611.3, 0.99, 0.64, 0.16],
  [257.6, 613.14, 1.05, 0.67, 0.2],
  [35.61, 619.07, 1.6, 1.27, 0.51],
  [158.25, 619.63, 1.49, 1, 0.44],
  [198.09, 619.93, 1.21, 0.84, 0.28],
  [1.93, 624.8, 0.91, 0.62, 0.13],
  [57.03, 629.77, 1, 0.87, 0.17],
  [107.16, 633.31, 1.64, 1.15, 0.53],
  [304.55, 635.13, 1.4, 1.05, 0.39],
  [177.78, 640.16, 1.03, 0.72, 0.19],
  [169.42, 640.17, 1.8, 1.22, 0.62],
  [67.88, 645.14, 1.27, 1.18, 0.31],
  [257.62, 649.14, 1.12, 0.78, 0.23],
  [33.32, 650.34, 0.9, 0.56, 0.12],
  [41.52, 655.87, 0.91, 0.57, 0.12],
  [113.01, 657.14, 1.22, 1.1, 0.29],
  [53.25, 657.71, 0.88, 0.81, 0.11],
  [278.64, 658.89, 1.7, 1.1, 0.56],
  [255.16, 668.31, 1.36, 1.08, 0.36],
  [220.55, 669.22, 1.16, 0.97, 0.25],
  [194, 669.68, 0.93, 0.59, 0.13],
  [357, 674.64, 1.29, 0.79, 0.32],
  [333.99, 679.34, 0.88, 0.69, 0.11],
  [381.64, 692.3, 1.54, 1.37, 0.47],
  [276.85, 694.71, 1.12, 0.86, 0.23],
  [107.19, 696.51, 1.02, 0.89, 0.18],
  [300.04, 696.93, 1.75, 1.28, 0.59],
  [399.24, 702.27, 0.92, 0.72, 0.13],
  [436.08, 703.47, 0.99, 0.77, 0.16],
  [226.48, 703.52, 0.89, 0.54, 0.11],
  [111.81, 721.38, 0.88, 0.81, 0.11],
  [48.8, 726.98, 1.3, 1.08, 0.33],
  [418.49, 727.96, 0.9, 0.83, 0.12],
  [218.62, 733.22, 1.32, 1.03, 0.34],
  [126.26, 733.45, 1.16, 1.05, 0.25],
  [360.51, 736.9, 0.87, 0.53, 0.11],
  [22.9, 739.26, 1.01, 0.81, 0.17],
  [201.07, 741.7, 0.95, 0.78, 0.14],
  [312.22, 742.21, 1.41, 1.02, 0.39],
  [221.2, 743.3, 0.89, 0.58, 0.12],
  [193.16, 744.76, 1.5, 0.92, 0.45],
  [56.1, 744.81, 1.28, 1.02, 0.32],
  [66.94, 746.94, 1.24, 0.95, 0.3],
  [204.05, 755.51, 1.1, 0.84, 0.22],
  [153.15, 756.63, 1.1, 0.69, 0.22],
  [22.74, 763.12, 0.96, 0.82, 0.15],
  [285.51, 763.61, 0.86, 0.79, 0.1],
  [171.99, 765.49, 0.86, 0.56, 0.1],
  [21.34, 772.9, 1.18, 0.98, 0.26],
  [231.14, 781.59, 0.97, 0.82, 0.15],
  [265.38, 786.6, 1.16, 0.93, 0.25],
  [63.64, 791.08, 1.21, 0.84, 0.28],
  [65.04, 791.69, 0.87, 0.58, 0.11],
  [26.55, 797.5, 0.85, 0.68, 0.1],
  [70.22, 803.75, 1.73, 1.51, 0.58],
  [435.57, 804.78, 1.06, 0.94, 0.2],
  [118.13, 812.02, 0.94, 0.71, 0.14],
  [114.28, 813.68, 0.97, 0.86, 0.15],
  [259.18, 816.01, 1.01, 0.88, 0.17],
  [55.88, 822.72, 1.48, 0.96, 0.44],
  [106.64, 824.54, 1.58, 1, 0.49],
  [250.71, 827.09, 1.13, 0.92, 0.24],
  [227.46, 827.29, 1.17, 0.84, 0.26],
  [161.11, 831.78, 1.33, 1.04, 0.35],
  [59.25, 835.72, 1, 0.62, 0.17],
  [318.85, 836.04, 1.78, 1.09, 0.61],
  [253.56, 850.59, 1.2, 0.84, 0.27],
  [146.14, 851.35, 0.91, 0.8, 0.13],
  [100.84, 853.18, 1.11, 1.01, 0.22],
  [158.5, 853.85, 0.93, 0.66, 0.14],
  [4.14, 866.4, 1.14, 0.85, 0.24],
  [130.13, 867.84, 1, 0.73, 0.17],
  [364.61, 885.42, 1.55, 1.18, 0.48],
  [120.83, 886.38, 0.91, 0.71, 0.12],
  [101.68, 886.64, 1.61, 1.11, 0.51],
  [176.71, 887.74, 1.51, 0.95, 0.45],
  [340.03, 889.26, 1.72, 1.13, 0.58],
  [392.99, 891.91, 1.23, 1, 0.29],
  [385.5, 893.79, 0.86, 0.57, 0.1],
  [388.63, 901.37, 1.62, 1.26, 0.52],
  [354.18, 903.28, 0.95, 0.79, 0.14],
  [389.94, 904.79, 0.89, 0.56, 0.12],
  [143.17, 909.03, 1.33, 1.06, 0.35],
  [376.16, 912.88, 0.94, 0.7, 0.14],
  [415.24, 917.64, 0.93, 0.62, 0.13],
  [432.27, 918.89, 1.02, 0.61, 0.18],
  [177.12, 920.05, 1.17, 0.98, 0.26],
  [125.41, 923.26, 1.77, 1.26, 0.6],
  [231.44, 930.29, 0.87, 0.77, 0.11],
  [156.99, 942.71, 0.87, 0.56, 0.11],
  [204.8, 943.9, 0.94, 0.8, 0.14],
  [144.57, 944.98, 0.86, 0.66, 0.11],
  [126.06, 954.42, 1.13, 1.04, 0.23],
  [107.3, 954.94, 0.98, 0.61, 0.16],
  [434.39, 957.8, 0.85, 0.54, 0.1],
  [427.86, 959.63, 1.15, 0.99, 0.25],
];

/** Does the floc's ink reach past the tile's top or bottom edge? */
const crossesTop = ([, cy, , ry]: SnowFloc): boolean => cy - ry < 0;
const crossesBottom = ([, cy, , ry]: SnowFloc): boolean => cy + ry > depthFieldTile.height;

/** The same floc, a whole tile up or down. */
const wrapFloc = ([cx, cy, rx, ry, opacity]: SnowFloc, dy: number): SnowFloc => [
  cx,
  cy + dy,
  rx,
  ry,
  opacity,
];

/**
 * The flocs a renderer actually draws: the field, plus the exact continuation
 * of every floc that hangs over an edge, entered from the opposite one.
 *
 * Both renderers clip the field to the tile — the DOM because the drawing is a
 * `viewBox`'d document repeated as a background image, mobile because a
 * `react-native-svg` `Pattern` cell is a `CGPatternCreate` bounds rect on iOS
 * and a shader bitmap on Android. A floc is a closed shape, so clipping one
 * does not thin it, it *bisects* it: a circle with a straight edge, which
 * reads as a deliberate half-moon rather than as a particle. Four flocs sit
 * astride the horizontal edges, and now that the field repeats and drifts they
 * would parade that cut down the screen once per cycle.
 *
 * Vertical only, because the field repeats vertically only: the left and right
 * edges are the column's own edges, where a floc has nowhere to re-enter from.
 * `depthField.test.ts` asserts that no floc crosses those.
 */
export const marineSnowTiled: ReadonlyArray<SnowFloc> = [
  ...marineSnow,
  ...marineSnow.filter(crossesTop).map((floc) => wrapFloc(floc, depthFieldTile.height)),
  ...marineSnow.filter(crossesBottom).map((floc) => wrapFloc(floc, -depthFieldTile.height)),
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
  marineSnowTiled
    .map(
      ([cx, cy, rx, ry, opacity]) =>
        `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" fill-opacity="${opacity}"/>`
    )
    .join('') +
  `</svg>`;
