import type { ViewStyle } from 'react-native';
import type {
  PaymentRequestSheetPropsBase,
  PaymentsAskSheetPropsBase,
  PaymentsScreenPropsBase,
} from '@salmon/shared';

export interface PaymentsScreenProps extends PaymentsScreenPropsBase<ViewStyle> {
  /** The ask sheet's fixed height (up to Home's sub-tab row); hugs content until measured. */
  sheetHeight?: number;
}

export interface PaymentsAskSheetProps extends PaymentsAskSheetPropsBase<ViewStyle> {
  /** A fixed height for the sheet, so the keyboard covers the form and not the sheet. */
  height?: number;
}

export interface PaymentRequestSheetProps extends PaymentRequestSheetPropsBase<ViewStyle> {}
