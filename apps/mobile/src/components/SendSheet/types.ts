import type { ViewStyle } from 'react-native';
import type {
  SendStep,
  SendToken,
  SendSheetPropsBase,
  StepTokenSelectProps,
  StepAddressAmountPropsBase,
  StepConfirmationProps as StepConfirmationPropsBase,
  BlockchainType,
} from '@salmon/shared';

// Re-export shared types for convenience
export type { SendStep, SendToken, BlockchainType, StepTokenSelectProps };

/**
 * Props for the confirmation step (React Native).
 *
 * The send hook lives inside this step, so the sheet above it cannot see that
 * a transfer is in flight — and the sheet is where the dismissal paths
 * (backdrop, swipe, hardware back) are decided. This callback is the mobile
 * shell's only way to learn it must stop being dismissible.
 */
export interface StepConfirmationProps extends StepConfirmationPropsBase {
  onSendingChange?: (sending: boolean) => void;
}

/**
 * Props for the SendSheet component (React Native)
 */
export interface SendSheetProps extends SendSheetPropsBase<ViewStyle> {}

/**
 * Props for the address and amount step (React Native)
 */
export interface StepAddressAmountProps extends StepAddressAmountPropsBase {}
