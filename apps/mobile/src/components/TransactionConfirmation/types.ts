/**
 * TransactionConfirmation types for the mobile app (React Native).
 *
 * The contracts live in `@salmon/shared` (`types/ui/transaction-confirmation`);
 * this file adds the platform's style type.
 */
import type { ViewStyle } from 'react-native';
import type {
  ConfirmationDetailsCardPropsBase,
  ConfirmationExchangePropsBase,
  TransactionConfirmationPropsBase,
} from '@salmon/shared';

export type { ConfirmationRow, ProposalDisplay } from '@salmon/shared';

export interface ConfirmationDetailsCardProps extends ConfirmationDetailsCardPropsBase<ViewStyle> {}

export interface ConfirmationExchangeProps extends ConfirmationExchangePropsBase<ViewStyle> {}

export interface TransactionConfirmationProps extends TransactionConfirmationPropsBase<ViewStyle> {}

export interface ConfirmationButtonsProps {
  onBack: () => void;
  onConfirm: () => void;
  /** A rebuild is in flight: the confirm control spins and refuses a second press. */
  isRefreshing?: boolean;
  /** The review is not ready to be confirmed (a dApp preview still running or unreadable). */
  confirmDisabled?: boolean;
  /** Confirm must be held, not tapped (the extension's hold-to-approve cases). */
  requiresHold?: boolean;
  confirmLabel?: string;
  style?: ViewStyle;
}
