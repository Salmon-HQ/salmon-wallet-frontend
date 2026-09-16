import type { CSSProperties } from 'react';
import type {
  PaymentRequestSheetPropsBase,
  PaymentsAskSheetPropsBase,
  PaymentsScreenPropsBase,
} from '@salmon/shared';

export interface PaymentsPageProps extends PaymentsScreenPropsBase<CSSProperties> {}

export interface PaymentsAskSheetProps extends PaymentsAskSheetPropsBase<CSSProperties> {
  className?: string;
}

export interface PaymentRequestSheetProps extends PaymentRequestSheetPropsBase<CSSProperties> {
  className?: string;
}
