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
   * @deprecated Unread since 2026-08-19: the refraction strip merged into
   * the membrane field — its brighter top 24px stacked over the field and
   * read as a band that broke the material. The field is now one continuous
   * dark ink; there is no separate strip to toggle.
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
