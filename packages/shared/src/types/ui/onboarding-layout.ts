import type { ReactNode } from 'react';
import type { Testable } from './testable';

/**
 * The onboarding layout contract, shared by the DOM and React Native
 * implementations.
 *
 * One prop per slot, in the order the slots are drawn. Every slot occupies its
 * reserved height whether or not it is filled, so passing `undefined` leaves
 * the band empty rather than collapsing it — that is the whole point of the
 * grid, and it is why these are slot props rather than `children`.
 *
 * Reserved heights live in `theme/onboardingGrid`; both implementations read
 * that one table rather than re-deriving spacing per screen.
 */
export interface OnboardingLayoutPropsBase extends Testable {
  /** Back affordance and step dots. */
  chrome?: ReactNode;
  /**
   * Replaces the mark for a screen that draws something else in that band
   * (nothing does today). Omit to draw the salmon mark at the grid's size.
   */
  mark?: ReactNode;
  /** Screen title. */
  title?: ReactNode;
  /** One-line description under the title. */
  description?: ReactNode;
  /** The flexible slot: inputs, seed grid, account list, long copy. Scrolls. */
  body?: ReactNode;
  /** Helper links, terms lines, error and throttle copy. */
  assist?: ReactNode;
  /** One secondary action. */
  secondary?: ReactNode;
  /** The primary action. Bottom-most control in the stack. */
  action?: ReactNode;
  /**
   * Unlock draws the larger mark — it is the size the `mark` band is reserved
   * at, so every other screen's smaller mark centres inside the same band and
   * does not move when the user arrives from unlock.
   */
  variant?: 'onboarding' | 'unlock';
  /**
   * Lets `body` scroll internally. Off by default: most screens have a body
   * that fits, and a scroll view that never scrolls still eats touch handling.
   */
  scrollBody?: boolean;
}
