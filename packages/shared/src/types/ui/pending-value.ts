/**
 * PendingValue — contract for "this number is being recalculated".
 *
 * The container never becomes a skeleton. A row, a card or a panel that is
 * already on screen stays on screen; what loads is the value inside it, and
 * only the values a request can actually change. A skeleton drawn over
 * something that already exists and will not change tells the user the screen
 * is being built, when in fact a number is being updated.
 */
import type { ReactNode } from 'react';

export interface PendingValuePropsBase<TStyle> {
  /**
   * Whether the wrapped value is currently being recalculated. While true the
   * value breathes in place; when it settles it returns to full opacity. Pass
   * it only for values the in-flight request can change — a value that is
   * always the same must show nothing.
   */
  pending?: boolean;
  /** The value itself — text, usually a formatted amount. */
  children: ReactNode;
  /** Custom style */
  style?: TStyle;
}
