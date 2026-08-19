import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Which tier of the material this surface is. `thin` may only carry
 * `text.primary` at ≥15px / weight ≥500; anything secondary needs `thick`.
 * See DESIGN.md §the scrim floor.
 */
export type ThermoclineTier = 'thin' | 'thick';

/**
 * What kind of chrome the surface is. On Android only a `sheet` may blur
 * (at most one blur per screen, ratified 2026-08-18); `chrome` — tab bar,
 * sticky header — lands on the opaque rung there.
 */
export type ThermoclineSurface = 'sheet' | 'chrome';

export interface ThermoclineProps {
  surface: ThermoclineSurface;
  /** @default 'thin' */
  tier?: ThermoclineTier;
  /**
   * The 24px refraction strip clipped to the top edge — part of the
   * material, on by default.
   * @default true
   */
  refraction?: boolean;
  /**
   * Geometry (position, radius, border). The same object is handed to every
   * rung so the layout does not move by a pixel between them.
   */
  style?: StyleProp<ViewStyle>;
  /** Blur rung only — gradient border color, as the tab bar wears today. */
  borderColor?: string;
  borderWidth?: number;
}
