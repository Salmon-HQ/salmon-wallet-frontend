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
import type { useSendTransaction } from '@salmon/shared';

// Re-export shared types for convenience
export type { SendStep, SendToken, BlockchainType, StepTokenSelectProps };

/**
 * Props for the confirmation step (React Native).
 *
 * The send hook is the sheet's, not this step's. Once the transfer is
 * committed the sheet hands the screen to the wait and this step unmounts, so
 * a hook owned here would take the in-flight transaction's only observer with
 * it — the outcome (success *and* failure) would never reach the level that
 * has to report it.
 */
export interface StepConfirmationProps extends StepConfirmationPropsBase {
  sendHook: ReturnType<typeof useSendTransaction>;
}

/**
 * Props for the SendSheet component (React Native)
 */
export interface SendSheetProps extends SendSheetPropsBase<ViewStyle> {}

/**
 * Props for the address and amount step (React Native)
 */
export interface StepAddressAmountProps extends StepAddressAmountPropsBase {}
