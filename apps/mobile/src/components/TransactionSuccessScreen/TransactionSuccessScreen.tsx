/**
 * TransactionSuccessScreen — the exchange receipt, kept at its own export
 * path and prop shape so `SwapScreen` needs no change. The rendering itself
 * — token-mark hero, arrow, rate/fee block, the settling wait — lives in
 * `ReceiptScreen` (`tone="exchange"`) now; this is a thin alias over it.
 */
import React from 'react';

import { ReceiptScreen } from '../ReceiptScreen';
import type { TransactionSuccessScreenProps } from './types';

export type { TransactionSuccessScreenProps };

export const TransactionSuccessScreen: React.FC<TransactionSuccessScreenProps> = (props) => (
  <ReceiptScreen tone="exchange" {...props} />
);
