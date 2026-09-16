import type { ReactNode } from 'react';
import type { Testable } from './testable';

/**
 * ValueActionsRow — a line of text on the left and the controls that act on
 * it pinned to the right: Home's change line beside Send/Receive/Activity,
 * a token's fiat line beside Send. The geometry lives here once; what goes
 * in each slot is the caller's.
 */
export interface ValueActionsRowPropsBase<TStyle> extends Testable {
  /** The text side, with whatever wrapper the caller animates it in. */
  leading: ReactNode;
  /** The controls, pinned to the trailing edge. */
  actions?: ReactNode;
  style?: TStyle;
}
