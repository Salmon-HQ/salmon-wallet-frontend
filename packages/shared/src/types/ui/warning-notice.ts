import type { ReactNode } from 'react';

/** `error` blocks an action (red); `warning` is advisory (amber). */
export type WarningNoticeTone = 'error' | 'warning';

/**
 * Props for the WarningNotice component (base - platform-agnostic).
 *
 * An icon-led alert banner used wherever a security or failure state must be
 * impossible to miss (approval screens, scan failures, stalled settlements).
 */
export interface WarningNoticePropsBase {
  /** Visual tone of the banner. Defaults to `error`. */
  tone?: WarningNoticeTone;
  /** Short, bold headline of the notice. */
  title: string;
  /** Optional body content rendered under the title. */
  children?: ReactNode;
  /**
   * Optional action (e.g. a small retry button) rendered under the body.
   * Each platform provides its own pressable element.
   */
  action?: ReactNode;
}
