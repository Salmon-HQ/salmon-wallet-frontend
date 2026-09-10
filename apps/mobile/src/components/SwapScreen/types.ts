/**
 * SwapScreen types for the mobile app (React Native).
 *
 * The contracts live in `@salmon/shared` (`types/ui/swap-screen`); this file
 * adds the platform's style type.
 */
import type { ViewStyle } from 'react-native';
import type {
  SwapAmountInputPropsBase,
  SwapInputScreenPropsBase,
  SwapScreenPropsBase,
  Testable,
} from '@salmon/shared';

export type { SwapToken, SwapChainType, SwapNetworkId } from '@salmon/shared';

export interface SwapAmountInputProps extends SwapAmountInputPropsBase<ViewStyle>, Testable {}

export interface SwapInputScreenProps extends SwapInputScreenPropsBase<ViewStyle> {}

export interface SwapScreenProps extends SwapScreenPropsBase<ViewStyle> {}
