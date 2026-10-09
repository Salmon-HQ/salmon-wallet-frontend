import type { Testable } from './testable';

/** A share of a whole, as a filled track with an optional legend under it. */
export interface ProgressBarPropsBase extends Testable {
  /** 0–1; clamped. */
  value: number;
  startLabel?: string;
  endLabel?: string;
  accessibilityLabel: string;
}

/** The filled share as a whole percent, 0–100, for both twins. */
export const progressPercent = (value: number): number =>
  Math.round(Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)) * 100);
