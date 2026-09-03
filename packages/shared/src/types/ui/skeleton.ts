import type { ListRowPadding } from './list-row';
import type { Testable } from './testable';

/** The shimmering placeholder rectangle every skeleton is built from. */
export interface ShimmerRectPropsBase {
  width: number;
  height: number;
  borderRadius?: number;
}

/** SkeletonRow — a `Card` at the row's own padding, standing in for a `ListRow`. */
export interface SkeletonRowPropsBase extends Testable {
  /** The leading mark's size — a token logo, an avatar, a checkbox. Default 40. */
  leadingSize?: number;
  /** One line (a single value) or two (title + subtitle). Default 2. */
  lines?: 1 | 2;
  /** Width of the trailing value placeholder. Omit for a row with no trailing slot. */
  trailingWidth?: number;
  /** How many rows to stand in for, 20 apart — the component gap. Default 1. */
  count?: number;
  /** The row's own `Card` padding — match the real `ListRow` it stands in for. */
  padding?: ListRowPadding;
  accessibilityLabel?: string;
}
