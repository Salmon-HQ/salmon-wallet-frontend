import type { Testable } from './testable';

/** `empty` is a settled answer ("nothing here"); `error` is a failed one. */
export type StateBlockTone = 'empty' | 'error';

export interface StateBlockPropsBase extends Testable {
  tone: StateBlockTone;
  title: string;
  /** Optional supporting line under the title. */
  body?: string;
  /** Present only when the state is retryable. */
  onRetry?: () => void;
  /** The retry control's label — callers own the copy, this owns the layout. */
  retryLabel?: string;
  /** The retry button's own testID, when it must differ from `testID`. */
  retryTestID?: string;
}
