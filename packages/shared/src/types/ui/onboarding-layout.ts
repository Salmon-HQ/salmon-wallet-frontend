import type { ReactNode } from 'react';
import type { OnboardingVariant } from '../../theme/onboardingGrid';
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
   * Which family the screen belongs to, and therefore which reserved-height
   * table it reads. `identity` (the default) makes the mark the hero — welcome,
   * the biometric opt-in, success. `credential` adds a secret to that cluster —
   * setting a password. `lock` is the unlock screen in every state, with its
   * empty description band collapsed. `content` hands the middle of the screen
   * to what fills `body` — the seed screens, the consent copy, the
   * derived-account list.
   *
   * Slots are at an identical Y across every screen of one variant; between
   * variants the mark and the body differ deliberately.
   */
  variant?: OnboardingVariant;
  /**
   * Lets `body` scroll internally. Off by default: most screens have a body
   * that fits, and a scroll view that never scrolls still eats touch handling.
   */
  scrollBody?: boolean;
}
