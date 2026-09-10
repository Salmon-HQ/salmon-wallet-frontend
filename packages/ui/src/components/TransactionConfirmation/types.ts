import type { CSSProperties } from 'react';
import type {
  ConfirmationDetailsCardPropsBase,
  ConfirmationExchangePropsBase,
  TransactionConfirmationPropsBase,
} from '@salmon/shared';

export type { ConfirmationRow, ProposalDisplay } from '@salmon/shared';

/** The DOM half of the confirmation contracts: the contract plus a style. */
export interface ConfirmationDetailsCardProps extends ConfirmationDetailsCardPropsBase<CSSProperties> {}

export interface ConfirmationExchangeProps extends ConfirmationExchangePropsBase<CSSProperties> {}

export interface TransactionConfirmationProps
  extends TransactionConfirmationPropsBase<CSSProperties> {}

export interface ConfirmationButtonsProps {
  onBack: () => void;
  onConfirm: () => void;
  /** A rebuild is in flight: the confirm control spins and refuses a second press. */
  isRefreshing?: boolean;
  confirmLabel?: string;
  style?: CSSProperties;
}
