import type { Testable } from '@salmon/shared';

/** `empty` is a settled answer ("nothing here"); `error` is a failed one. */
export type StateBlockTone = 'empty' | 'error';

export interface StateBlockProps extends Testable {
  tone: StateBlockTone;
  title: string;
  /** Optional supporting line under the title. */
  body?: string;
  /** Present only when the state is retryable. */
  onRetry?: () => void;
  /** The retry control's label — callers own the copy, this component owns the layout. */
  retryLabel?: string;
  /**
   * The retry button's own testID, when it must differ from `testID` (the
   * wrapper's). Falls back to `testID` so a caller with one stable id can
   * still pass only that.
   */
  retryTestID?: string;
}
