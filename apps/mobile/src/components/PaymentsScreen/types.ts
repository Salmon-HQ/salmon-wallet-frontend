import type { ViewStyle } from 'react-native';
import type {
  PaymentRequestSheetPropsBase,
  PaymentsAskSheetPropsBase,
  PaymentsScreenPropsBase,
} from '@salmon/shared';

export interface PaymentsScreenProps extends PaymentsScreenPropsBase<ViewStyle> {}

export interface PaymentsAskSheetProps extends PaymentsAskSheetPropsBase<ViewStyle> {}

export interface PaymentRequestSheetProps extends PaymentRequestSheetPropsBase<ViewStyle> {}
