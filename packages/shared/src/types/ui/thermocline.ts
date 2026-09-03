/**
 * Which tier of the material this surface is. `thin` may only carry
 * `text.primary` at ≥15px / weight ≥500; anything secondary needs `thick`.
 * See DESIGN.md §the scrim floor.
 */
export type ThermoclineTier = 'thin' | 'thick';

export interface ThermoclinePropsBase {
  /** @default 'thin' */
  tier?: ThermoclineTier;
}
