import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Which tier of the material this surface is. `thin` may only carry
 * `text.primary` at ≥15px / weight ≥500; anything secondary needs `thick`.
 * See DESIGN.md §the scrim floor.
 */
export type ThermoclineTier = 'thin' | 'thick';

export interface ThermoclineProps {
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
  /** Unread since the tint adoption (2026-08-19) — the blur rung wore them. */
  borderColor?: string;
  borderWidth?: number;
}
