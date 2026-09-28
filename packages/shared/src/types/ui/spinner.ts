import type { Testable } from './testable';

/**
 * Spinner — the small inline wait: a ring on the DOM, the platform's own
 * indicator on mobile. For a field, a row, a button's label while it works.
 * A whole surface that waits draws `LoadingScreen` instead (DESIGN.md §The wait).
 */
export interface SpinnerPropsBase extends Testable {
  /** The ring's ink — a text or accent token, never its own colour. */
  color: string;
  /** The box, in points. @default 20 */
  size?: number;
}

export const SPINNER_DEFAULT_SIZE = 20;
/** From this box up, mobile's indicator draws its large variant. */
export const SPINNER_LARGE_FROM = 28;
