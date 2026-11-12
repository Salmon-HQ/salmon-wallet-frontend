import type { CSSProperties } from 'react';
import type {
  ConfirmationDetailsCardPropsBase,
  ConfirmationExchangePropsBase,
  RequesterRowPropsBase,
  TransactionConfirmationPropsBase,
} from '@salmon/shared';

export interface RequesterRowProps extends RequesterRowPropsBase {}

export type { ConfirmationRow, ProposalDisplay } from '@salmon/shared';

/** The DOM half of the confirmation contracts: the contract plus a style. */
export interface ConfirmationDetailsCardProps extends ConfirmationDetailsCardPropsBase<CSSProperties> {}

export interface ConfirmationExchangeProps extends ConfirmationExchangePropsBase<CSSProperties> {}

export interface TransactionConfirmationProps extends TransactionConfirmationPropsBase<CSSProperties> {}

export interface ConfirmationButtonsProps {
  onBack: () => void;
  onConfirm: () => void;
  /** A rebuild is in flight: the confirm control spins and refuses a second press. */
  isRefreshing?: boolean;
  /** The review is not ready to be confirmed. */
  confirmDisabled?: boolean;
  /** Confirm must be held, not tapped. */
  requiresHold?: boolean;
  confirmLabel?: string;
  style?: CSSProperties;
}
