import type { KeyValueRowPropsBase } from './key-value-row';
import type { TransactionSuccessScreenProps } from './transaction-success-screen';

export interface ReceiptScreenAction {
  label: string;
  onPress: () => void;
  testID?: string;
}

export interface TransferReceiptScreenPropsBase {
  tone: 'transfer';
  title: string;
  body?: string;
  rows: KeyValueRowPropsBase[];
  primary: ReceiptScreenAction;
  secondary?: ReceiptScreenAction;
  explorerUrl?: string;
  settling?: boolean;
  testID?: string;
}

export interface ExchangeReceiptScreenPropsBase extends TransactionSuccessScreenProps {
  tone: 'exchange';
}

export type ReceiptScreenPropsBase =
  TransferReceiptScreenPropsBase | ExchangeReceiptScreenPropsBase;
