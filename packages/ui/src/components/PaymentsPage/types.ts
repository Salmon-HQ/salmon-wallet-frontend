import type { CSSProperties } from 'react';
import type {
  PaymentRequestListPropsBase,
  PaymentRequestSheetPropsBase,
  PaymentsAskSheetPropsBase,
  PaymentsHistoryPropsBase,
  PaymentsScreenPropsBase,
} from '@salmon/shared';

export interface PaymentsPageProps extends PaymentsScreenPropsBase<CSSProperties> {}

export interface PaymentsAskSheetProps extends PaymentsAskSheetPropsBase<CSSProperties> {
  className?: string;
}

export interface PaymentRequestSheetProps extends PaymentRequestSheetPropsBase<CSSProperties> {
  className?: string;
}

export interface PaymentRequestListProps extends PaymentRequestListPropsBase<CSSProperties> {
  className?: string;
}

export interface PaymentsHistoryPageProps extends PaymentsHistoryPropsBase<CSSProperties> {
  className?: string;
}
