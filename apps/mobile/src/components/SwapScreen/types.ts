/**
 * SwapScreen types for the mobile app (React Native)
 *
 * Re-exports shared swap types with ViewStyle for React Native.
 */
import type { ViewStyle } from 'react-native';
import type { Testable } from '@salmon/shared';

// Re-export all base types from shared
export type {
  // Network & Chain
  SwapNetworkId,
  SwapChainType,
  // Backend API types
  SwapOrderResponse,
  SwapQuote,
  // UI types
  SwapToken,
  SwapDetailItem,
  SwapScreenStep,
} from '@salmon/shared';

// Import generic prop types from shared
import type {
  SwapAmountInputProps as SwapAmountInputPropsBase,
  SwapDetailRowProps as SwapDetailRowPropsBase,
  SwapDetailsCardProps as SwapDetailsCardPropsBase,
  SwapReviewExchangeProps as SwapReviewExchangePropsBase,
  SwapReviewScreenProps as SwapReviewScreenPropsBase,
  SwapInputScreenProps as SwapInputScreenPropsBase,
  SwapScreenProps as SwapScreenPropsBase,
  SwapScreenStep,
} from '@salmon/shared';

/**
 * Current step in swap flow (React Native version)
 * @deprecated Use SwapScreenStep from @salmon/shared instead
 */
export type SwapStep = SwapScreenStep;

/**
 * Props for SwapAmountInput component (React Native)
 */
export interface SwapAmountInputProps extends SwapAmountInputPropsBase<ViewStyle>, Testable {}

/**
 * Props for SwapDetailRow component (React Native)
 */
export interface SwapDetailRowProps extends SwapDetailRowPropsBase<ViewStyle> {}

/**
 * Props for SwapDetailsCard component (React Native)
 */
export interface SwapDetailsCardProps extends SwapDetailsCardPropsBase<ViewStyle> {}

/**
 * Props for SwapReviewExchange component (React Native)
 */
export interface SwapReviewExchangeProps extends SwapReviewExchangePropsBase<ViewStyle> {}

/**
 * Props for SwapReviewScreen sub-component (React Native)
 */
export interface SwapReviewScreenProps extends SwapReviewScreenPropsBase<ViewStyle> {}

/**
 * Props for SwapInputScreen sub-component (React Native)
 */
export interface SwapInputScreenProps extends SwapInputScreenPropsBase<ViewStyle> {}

/**
 * Props for main SwapScreen component (React Native)
 */
export interface SwapScreenProps extends SwapScreenPropsBase<ViewStyle> {}
