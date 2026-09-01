/**
 * TransactionSuccessScreen — the exchange receipt, kept at its own export
 * path and prop shape so `SwapScreen` needs no change. The rendering itself
 * — token-mark hero, arrow, rate/fee block, bridge instructions, the
 * settling wait — lives in `ReceiptScreen` (`tone="exchange"`) now; this is
 * a thin alias over it.
 */
import React from 'react';
import type { TransactionSuccessScreenProps } from '@salmon/shared';

import { ReceiptScreen } from '../ReceiptScreen';

export const TransactionSuccessScreen: React.FC<TransactionSuccessScreenProps> = (props) => (
  <ReceiptScreen tone="exchange" {...props} />
);
