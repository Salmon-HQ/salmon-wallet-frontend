/**
 * ReceiptScreen — the one receipt, two tones.
 *
 * `transfer` is CORE 07's composition (a seal, a sentence, and a receipt
 * card of rows under two actions) — what `send/success.tsx` first drew and
 * `nft/[id]/success.tsx` now shares. `exchange` is the graphic receipt swap
 * has always rendered (token-mark hero, arrow, rate/fee block) under its
 * `tx-success-*` e2e vocabulary — moved here byte-for-byte from
 * `TransactionSuccessScreen`, which is now a thin alias over this tone so
 * `SwapScreen` needs no change. The two tones do not share a prop shape:
 * `exchange` keeps `TransactionSuccessScreenProps`, the shared contract swap
 * already speaks; `transfer` takes the CORE 07 shape (rows, primary/secondary
 * actions) new callers compose against.
 *
 * `TransferReceipt` is required lazily rather than imported: it pulls in
 * `Card`/`IconBubble`, which `ExchangeReceipt` (and every swap render) has no
 * business loading. A static import would load both subtrees for every
 * consumer of either tone, including `TransactionSuccessScreen`'s own test
 * suite, which mocks `@salmon/shared`'s `semantic` down to what the exchange
 * receipt reads.
 */
import React from 'react';

import { ExchangeReceipt } from './ExchangeReceipt';
import type { ReceiptScreenProps } from './types';

export type {
  ExchangeReceiptScreenProps,
  ReceiptScreenAction,
  ReceiptScreenProps,
  TransferReceiptScreenProps,
} from './types';

export const ReceiptScreen: React.FC<ReceiptScreenProps> = (props) => {
  if (props.tone === 'transfer') {
    const { TransferReceipt } = require('./TransferReceipt') as typeof import('./TransferReceipt');
    const { tone: _tone, ...rest } = props;
    return <TransferReceipt {...rest} />;
  }
  const { tone: _tone, ...rest } = props;
  return <ExchangeReceipt {...rest} />;
};
