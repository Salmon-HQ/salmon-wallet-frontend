import type { ConfirmSheetPropsBase } from '@salmon/shared';

/** The DOM half of mobile's `ConfirmSheet` — the same contract, the same sheet. */
export interface ConfirmDialogProps extends ConfirmSheetPropsBase {
  /** Test id for the confirm button, so e2e and unit tests can select it. */
  confirmTestID?: string;
}
