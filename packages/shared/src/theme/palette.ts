/**
 * Primitive color ramps for Salmon Wallet — "Deep Water".
 *
 * This file holds raw color values only. Nothing here encodes meaning; the
 * semantic layer in `semantic.ts` decides what each step is *for*. Keeping the
 * two apart is what lets a light theme ship later as a re-mapping of ramp
 * indices instead of a second palette.
 *
 * Neutrals run 0 (lightest) to 1000 (deepest) and carry a fixed blue bias
 * (hue ~222) so the whole app reads as one cold body of water. `neutral-950`
 * and `neutral-900` are the two backgrounds the product already shipped and
 * are preserved exactly; `975` and `1000` are new, and let surfaces go deeper
 * than the previous palette allowed.
 *
 * Contrast ratios quoted in comments are against `neutral-950` (#10131C), the
 * default card surface, and are asserted in `contrast.test.ts`.
 *
 * Works for both React Native (Expo) and Web (WXT+Vite extension).
 */

/** Cold neutral ramp, hue ~222. Index 0 is lightest, 1000 is deepest. */
export const neutral = {
  0: '#FFFFFF',
  25: '#F6F8FB',
  50: '#EDF1F7',
  100: '#DDE3ED',
  200: '#C3CBDA',
  300: '#A7B1C4',
  400: '#8B96AD',
  500: '#6F7B95',
  600: '#58637B',
  700: '#414B61',
  800: '#2C3547',
  850: '#212938',
  /** Existing product background (secondary) */
  900: '#161C2D',
  925: '#1B2233',
  /** Existing product background (primary) */
  950: '#10131C',
  975: '#0B0F19',
  1000: '#070911',
} as const;

/**
 * Brand ramp. `salmon-500` is the product's existing `#FF5C45`, unchanged.
 *
 * The physics of this color decide how it may be used: as ink on dark ground
 * it measures 6.07:1, but white text on a salmon fill is only 3.06:1 and fails
 * WCAG AA. Salmon is therefore a light source seen from below — ink first, and
 * when it must be a fill, the type on it is `neutral-1000` (6.50:1).
 */
export const salmon = {
  50: '#FFF1EE',
  100: '#FFDDD6',
  200: '#FFBFB2',
  300: '#FF9E8B',
  400: '#FF7B63',
  /** Brand accent — unchanged from the original palette */
  500: '#FF5C45',
  600: '#E64A34',
  700: '#BF3A28',
  800: '#8F2B1E',
  900: '#5C1B13',
} as const;

/**
 * Status ramps, hue-separated from salmon on purpose so a red error and a
 * salmon call-to-action never read as the same object on a narrow surface.
 */
export const success = {
  300: '#7BEFCB',
  /** Default ink — 9.99:1 */
  500: '#33D6A6',
  700: '#14795C',
} as const;

export const danger = {
  300: '#FF9FAF',
  /** Default ink — 6.80:1. Deliberately rosier than salmon-500. */
  500: '#FF6B85',
  700: '#A32036',
} as const;

export const warning = {
  300: '#FFD37A',
  /** Default ink — 10.14:1 */
  500: '#FFB020',
  700: '#7A5205',
} as const;

export const palette = { neutral, salmon, success, danger, warning } as const;

export type Neutral = typeof neutral;
export type Salmon = typeof salmon;
export type Palette = typeof palette;
