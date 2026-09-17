import type { ViewStyle } from 'react-native';
import type {
  PaymentRequestListPropsBase,
  PaymentRequestSheetPropsBase,
  PaymentsAskSheetPropsBase,
  PaymentsHistoryPropsBase,
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

export interface PaymentRequestListProps extends PaymentRequestListPropsBase<ViewStyle> {}

/** The DOM's page is a sheet here (owner, 2026-09-17); its `onBack` is this sheet's close. */
export interface PaymentsHistorySheetProps extends PaymentsHistoryPropsBase<ViewStyle> {
  visible: boolean;
  /** A fixed height, up to Home's sub-tab row — the ask sheet's. */
  height?: number;
}
