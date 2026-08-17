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
 * fall, which is half the argument for the field being static.
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
 * The field does not tile. It is one drawing, `fieldTile` units, scaled to the
 * column's width and anchored to the top of the ground — repetition is the
 * fastest way for a particle field to stop reading as space and start reading
 * as wallpaper. The lower third fades to nothing so the field is spent before
 * the first data row: The Scales Exclusion Rule covers this motif too.
 */

/** The field's authored size. Wider than the widest column (430px) on purpose. */
export const depthFieldTile = { width: 440, height: 360 } as const;

/**
 * One floc: `[cx, cy, rx, ry, opacity]`. `opacity` is a multiplier on the
 * `water.snow` token, never an absolute alpha.
 */
export type SnowFloc = readonly [cx: number, cy: number, rx: number, ry: number, opacity: number];

export const marineSnow: ReadonlyArray<SnowFloc> = [
  [78.96, 3.11, 3.81, 3.71, 0.06],
  [113.62, 14.62, 2.71, 2.42, 0.24],
  [114.04, 19.63, 2.25, 1.41, 0.27],
  [426.13, 30.29, 3.17, 2.84, 0.62],
  [204.77, 32.29, 2.45, 1.91, 0.53],
  [87.07, 33.27, 2.03, 1.31, 0.53],
  [67.69, 33.43, 1.87, 1.41, 0.52],
  [330.89, 34.35, 4.36, 4.33, 0.74],
  [25.81, 34.51, 2.04, 1.85, 0.51],
  [276.11, 44.72, 2.47, 2.24, 0.56],
  [244.04, 54.72, 2.44, 1.73, 0.47],
  [186.67, 58.02, 2.18, 1.45, 0.54],
  [4.93, 60.14, 1.89, 1.25, 0.51],
  [105.74, 66.52, 1.24, 1.11, 0.31],
  [42.29, 68.07, 1.48, 0.97, 0.32],
  [34.07, 69.15, 1.04, 0.91, 0.26],
  [25.53, 69.32, 3.55, 3.24, 0.77],
  [149.37, 82.17, 3.34, 1.98, 0.85],
  [99.05, 94.99, 2.63, 2.53, 0.5],
  [423.64, 96.17, 2.58, 2.16, 0.46],
  [410.73, 102.72, 3.83, 2.72, 0.87],
  [278.2, 106.35, 2.48, 1.79, 0.52],
  [370.89, 107.17, 1.22, 1.22, 0.29],
  [97.89, 109.7, 1.68, 1.65, 0.27],
  [39.61, 111.43, 3.75, 2.46, 0.77],
  [104.55, 112.37, 0.92, 0.9, 0.33],
  [235.95, 113.97, 2.3, 1.64, 0.57],
  [308.71, 114.43, 2.55, 2.24, 0.48],
  [405.68, 120.51, 2.14, 1.54, 0.52],
  [19.72, 131.66, 1.17, 0.83, 0.26],
  [337.4, 132.74, 1.37, 1.14, 0.27],
  [347.31, 137.93, 3.44, 3.22, 0.8],
  [278.36, 141.41, 4.17, 2.76, 0.93],
  [276.45, 142.95, 2.26, 2.15, 0.52],
  [421.37, 147.39, 0.9, 0.77, 0.29],
  [157.64, 148.4, 4.08, 3.42, 0.88],
  [129.84, 156.04, 1.52, 1.21, 0.27],
  [88.33, 159.7, 4.13, 3.99, 0.86],
  [281.31, 164.42, 2.43, 2.08, 0.46],
  [439.38, 165.23, 1.45, 1, 0.32],
  [371.82, 167.07, 1.15, 0.87, 0.29],
  [325.46, 167.75, 2.07, 1.91, 0.52],
  [36.68, 168.08, 1.44, 1.22, 0.31],
  [178.65, 173.75, 1.23, 1.16, 0.34],
  [92.12, 181.06, 0.95, 0.95, 0.26],
  [313.25, 183.72, 1.49, 1.27, 0.32],
  [62.62, 184.35, 1.41, 0.83, 0.28],
  [22.12, 185.33, 0.98, 0.95, 0.26],
  [230.17, 186.05, 1.61, 1.14, 0.27],
  [371.95, 192.38, 2.25, 2.05, 0.6],
  [265.08, 193.65, 4.2, 3.78, 0.94],
  [65.8, 193.92, 1.14, 1.07, 0.25],
  [233.36, 196.64, 1.12, 0.95, 0.33],
  [126.46, 201.73, 1.16, 1.16, 0.27],
  [185.56, 204.69, 1.89, 1.2, 0.51],
  [199.44, 204.79, 1.27, 0.94, 0.25],
  [183.83, 206.79, 1.52, 1.04, 0.29],
  [232.21, 210.57, 2.79, 2.02, 0.48],
  [276.61, 212.57, 2.23, 2.1, 0.47],
  [373.75, 214.84, 1.42, 1.19, 0.32],
  [28.89, 215.21, 2.16, 1.73, 0.47],
  [119.14, 217.35, 3.16, 2.73, 0.78],
  [281.71, 224.11, 2.66, 2.3, 0.42],
  [338.93, 225.02, 0.94, 0.65, 0.26],
  [264.63, 227.48, 1.22, 1.14, 0.22],
  [70.68, 231.48, 2.46, 2.23, 0.48],
  [404.62, 232.77, 1.45, 0.88, 0.24],
  [169.57, 233.25, 1.56, 1.51, 0.22],
  [320.17, 234.03, 0.9, 0.77, 0.22],
  [75.53, 234.97, 1.55, 1.19, 0.25],
  [252.47, 244.15, 1.17, 1.15, 0.21],
  [177.12, 246.39, 2.48, 2.11, 0.34],
  [431.21, 249.2, 1.53, 1.33, 0.19],
  [87.61, 249.73, 2.44, 2.26, 0.31],
  [362.75, 256.37, 1.3, 0.84, 0.15],
  [351.13, 261.25, 2.39, 1.51, 0.26],
  [363.96, 263.23, 0.93, 0.91, 0.14],
  [277.47, 264.08, 1.69, 1.52, 0.11],
  [275.48, 264.52, 1.13, 1.12, 0.15],
  [201.32, 264.72, 1.07, 0.95, 0.11],
  [109.13, 267.8, 0.99, 0.67, 0.13],
  [197.47, 269.1, 2.49, 2.18, 0.22],
  [310.64, 270.46, 1.16, 0.92, 0.1],
  [333.12, 270.57, 1.68, 1.54, 0.12],
  [148.04, 271.8, 2.25, 1.76, 0.22],
  [279.23, 272.05, 0.94, 0.79, 0.09],
  [36.25, 275.11, 1.7, 1.68, 0.1],
  [146.76, 275.43, 1.65, 1.37, 0.1],
  [233.9, 277.43, 1.65, 1.31, 0.09],
  [300.58, 286.83, 1.68, 1.45, 0.07],
  [294.27, 288.17, 1.17, 0.97, 0.06],
  [199.23, 292.79, 1.52, 1.44, 0.07],
  [163.1, 294.78, 1.32, 1.01, 0.06],
  [150.92, 295.15, 1.52, 1.15, 0.06],
  [385.42, 297.66, 1.41, 0.97, 0.06],
];

/**
 * The field as a standalone SVG document.
 *
 * The DOM half uses this as a `background-image` data URI rather than mounting
 * 95 live SVG nodes: DESIGN.md requires the extension's deep field to be an
 * image composited once rather than a full-viewport SVG the browser can be
 * asked to repaint, and a serialised constant is the cheapest way to satisfy
 * that on all three DOM targets at once. Mobile draws the same array through
 * `react-native-svg`, where an image would have meant shipping a raster.
 *
 * `width`/`height` are set so the image has an intrinsic size and CSS can
 * scale it by height alone, keeping the flocs circular on any column width.
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
