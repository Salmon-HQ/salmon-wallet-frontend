import type { CSSProperties } from 'react';
import type { PaymentRequestSheetPropsBase, PaymentsScreenPropsBase } from '@salmon/shared';

export interface PaymentsPageProps extends PaymentsScreenPropsBase<CSSProperties> {}

export interface PaymentRequestSheetProps extends PaymentRequestSheetPropsBase<CSSProperties> {
  className?: string;
}
