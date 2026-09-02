/**
 * TransactionSuccessScreen — the exchange receipt, kept at its own export
 * path and prop shape so `SwapScreen` needs no change. The rendering lives
 * in `ReceiptScreen` (`tone="exchange"`); this is a thin alias over it, the
 * same alias mobile keeps.
 */
import React from 'react';

import { ReceiptScreen } from '../ReceiptScreen';
import type { TransactionSuccessScreenProps } from './types';

export function TransactionSuccessScreen(props: TransactionSuccessScreenProps): React.ReactElement {
  return <ReceiptScreen tone="exchange" {...props} />;
}
