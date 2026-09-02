import type {
  ExchangeReceiptScreenPropsBase,
  ReceiptScreenAction as ReceiptScreenActionBase,
  TransferReceiptScreenPropsBase,
} from '@salmon/shared';

import type { KeyValueRowProps } from '../KeyValueRow';

export type ReceiptScreenAction = ReceiptScreenActionBase;

/** The mobile half of `TransferReceiptScreenPropsBase`: the contract, with
 * the RN `KeyValueRowProps` row shape. */
export interface TransferReceiptScreenProps extends Omit<TransferReceiptScreenPropsBase, 'rows'> {
  rows: KeyValueRowProps[];
}

export interface ExchangeReceiptScreenProps extends ExchangeReceiptScreenPropsBase {}

export type ReceiptScreenProps = TransferReceiptScreenProps | ExchangeReceiptScreenProps;
