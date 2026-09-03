import type { CSSProperties } from 'react';
import type {
  ExchangeReceiptScreenPropsBase,
  ReceiptScreenAction as ReceiptScreenActionBase,
  TransferReceiptScreenPropsBase,
} from '@salmon/shared';

import type { KeyValueRowProps } from '../KeyValueRow';

export type ReceiptScreenAction = ReceiptScreenActionBase;

/** The DOM half of `TransferReceiptScreenPropsBase`: the contract, the DOM
 * `KeyValueRowProps` row shape, plus a style. */
export interface TransferReceiptScreenProps extends Omit<TransferReceiptScreenPropsBase, 'rows'> {
  rows: KeyValueRowProps[];
  style?: CSSProperties;
  className?: string;
}

/** The DOM half of `ExchangeReceiptScreenPropsBase`: the contract plus a style. */
export interface ExchangeReceiptScreenProps extends ExchangeReceiptScreenPropsBase {
  style?: CSSProperties;
  className?: string;
}

export type ReceiptScreenProps = TransferReceiptScreenProps | ExchangeReceiptScreenProps;
