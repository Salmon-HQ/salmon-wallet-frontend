/**
 * Shadow definitions for Salmon Wallet
 * Provides both React Native and CSS shadow formats
 */

import { neutral } from './palette';
import type { ThemeMode } from './semantic';

/**
 * React Native shadow properties — the deep-water table.
 *
 * Every value below is calibrated against a ground measured at 16/255
 * (DESIGN.md §Two modes): the shadows are black, heavy, and legible only
 * because there is almost no light left to remove. They are the dark mode's
 * numbers and they are not the light mode's.
 */
const shadowsDark = {
  /**
   * Shadow Vocabulary — the gate's collapsed header bar. The gate is a
   * sheet-like surface hanging from the top of the screen, and this is the
   * ambient its bottom edge casts on the content scrolling beneath it — the
   * downward counterpart of `sheet`. Registered into the vocabulary as-is
   * (values unchanged): the edge needs the shadow to read as an edge.
   */
  header: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 12,
  },
  /** Balance card shadow */
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 16,
  },
  /** Logo icon shadow */
  logo: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  /** Balance text shadow */
  balanceText: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 8,
  },
  /** Floating button / CTA glow — matches shadowsCSS.button */
  button: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.64,
    shadowRadius: 12,
    elevation: 8,
  },
  /** Subtle shadow for inputs and small elevated elements */
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  /** Medium shadow for NFT cards and image thumbnails */
  nftCard: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 9,
    elevation: 6,
  },
  /** Bottom sheet upward shadow */
  sheet: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 20,
  },
} as const;

/** One React Native elevation, in the shape RN's style props take. */
export interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export type ShadowTable = Record<keyof typeof shadowsDark, ShadowStyle>;

/**
 * The light table, rebuilt from the material rules rather than inverted
 * (DESIGN.md:307 — the dark numbers live in a headroom a light ground does
 * not have, so flipping them produces smears, not elevation).
 *
 * The rule, in one line: **on a light ground an object's elevation reads as a
 * soft neutral-900 ambient at low alpha.** Same geometry — offset, blur and
 * Android `elevation` all say how far off the plane the object is, and that
 * distance does not change with the mode — a cool near-black ink instead of
 * pure black so the shadow belongs to the same cold body of water as the
 * neutrals, and every alpha scaled to a fifth, because on white a 0.8 shadow
 * is a hole rather than a lift.
 *
 * One knob (`LIGHT_ALPHA_SCALE`) rather than eight hand-tuned numbers: the
 * owner tunes the light mode on device, and a single multiplier is the thing
 * that is actually tunable. Two entries will likely want their own value once
 * that pass happens — `balanceText` and `button` are glows, not elevations,
 * and a glow on a light ground usually wants to be nothing at all.
 */
const LIGHT_INK = neutral[900];
const LIGHT_ALPHA_SCALE = 0.2;

const shadowsLight: ShadowTable = Object.fromEntries(
  Object.entries(shadowsDark).map(([name, shadow]) => [
    name,
    {
      ...shadow,
      shadowColor: LIGHT_INK,
      shadowOpacity: Number((shadow.shadowOpacity * LIGHT_ALPHA_SCALE).toFixed(3)),
    },
  ])
) as ShadowTable;

/** The elevation table for one mode. */
export function createShadows(mode: ThemeMode): ShadowTable {
  return mode === 'dark' ? shadowsDark : shadowsLight;
}

/**
 * The deep-water table, resolved once at module load — unchanged in shape and
 * in value, so every app that reads `shadows` as a static object keeps working.
 */
export const shadows = shadowsDark;

/**
 * CSS box-shadow values for web
 */
export const shadowsCSS = {
  none: 'none',
  /** Subtle shadow for cards */
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.18)',
  /** Default shadow */
  md: '0 2px 4px -1px rgba(0, 0, 0, 0.23), 0 4px 5px 0 rgba(0, 0, 0, 0.14)',
  /** Elevated shadow for modals, dropdowns */
  lg: '0 4px 8px -2px rgba(0, 0, 0, 0.3), 0 8px 16px -4px rgba(0, 0, 0, 0.2)',
  /** Header/card elements (Figma: 0px 10px 20px rgba(0,0,0,0.9)) */
  header: '0 10px 20px rgba(0, 0, 0, 0.9)',
  /**
   * Elevation E2 — the ambient a raised card casts on the plane below it.
   * A real offset and a real blur, rather than a bigger version of `card`:
   * depth here is material and edge, and the ambient only says "this object
   * is off the ground".
   */
  cardAmbient: '0 8px 24px -8px rgba(3, 6, 12, 0.45)',
  /** The lit rim. Every membrane and every raised card gets it. */
  rimHighlight: 'inset 0 1px 0 rgba(226, 236, 255, 0.14)',
  /** The underside, opposite the rim. */
  rimShade: 'inset 0 -1px 0 rgba(3, 6, 12, 0.50)',
  /**
   * Both rims at once — the bezel an object gets so it reads as a body with a
   * top and an underside rather than a flat rectangle.
   *
   * It is deliberately 1px each: what a filled control is missing is an *edge*,
   * not an interior. A heavier inset reads as *pressed*, and a primary button
   * that looks pressed at rest spends the affordance it needs and leaves the
   * real press (scale + specular) with nothing left to say.
   *
   * Usable verbatim on both platforms: React Native (0.83) parses this CSS
   * string in `processBoxShadow` and clips it to the view's own radius, so the
   * rim follows a pill end the way the DOM's does. One caveat, measured in the
   * RN source rather than assumed: Android draws inset shadows only from API 29
   * (`MIN_INSET_BOX_SHADOW_SDK_VERSION`); below that the bezel is absent and
   * nothing else changes.
   */
  bezel: 'inset 0 1px 0 rgba(226, 236, 255, 0.14), inset 0 -1px 0 rgba(3, 6, 12, 0.50)',
  /** Button / floating CTA shadow */
  button: '0 0 12px rgba(0, 0, 0, 0.64)',
} as const;

export type Shadows = typeof shadows;
export type ShadowsCSS = typeof shadowsCSS;
