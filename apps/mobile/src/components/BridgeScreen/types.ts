import type { ViewStyle } from 'react-native';
import type {
  BridgeScreenChain as BridgeChain,
  BridgeScreenToken as BridgeToken,
  BridgeScreenEstimate as BridgeEstimate,
  BridgeScreenExchange as BridgeExchange,
  RecipientAddressInputPropsBase,
  BridgeRecipientScreenPropsBase,
  BridgeReviewScreenPropsBase,
} from '@salmon/shared';

// Re-export shared data types for consumers
export type { BridgeChain, BridgeToken, BridgeEstimate, BridgeExchange };

/**
 * Props for RecipientAddressInput component (React Native)
 */
export interface RecipientAddressInputProps extends RecipientAddressInputPropsBase<ViewStyle> {}

/**
 * Props for BridgeRecipientScreen sub-component (React Native)
 */
export interface BridgeRecipientScreenProps extends BridgeRecipientScreenPropsBase<ViewStyle> {}

/**
 * Props for BridgeReviewScreen sub-component (React Native)
 */
export interface BridgeReviewScreenProps extends BridgeReviewScreenPropsBase<ViewStyle> {}
