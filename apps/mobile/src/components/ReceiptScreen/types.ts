import type { TransactionSuccessScreenProps } from '@salmon/shared';

import type { KeyValueRowProps } from '../KeyValueRow';

export interface ReceiptScreenAction {
  label: string;
  onPress: () => void;
  testID?: string;
}

export interface TransferReceiptScreenProps {
  tone: 'transfer';
  title: string;
  body?: string;
  rows: KeyValueRowProps[];
  primary: ReceiptScreenAction;
  secondary?: ReceiptScreenAction;
  explorerUrl?: string;
  settling?: boolean;
  testID?: string;
}

export interface ExchangeReceiptScreenProps extends TransactionSuccessScreenProps {
  tone: 'exchange';
}

export type ReceiptScreenProps = TransferReceiptScreenProps | ExchangeReceiptScreenProps;
