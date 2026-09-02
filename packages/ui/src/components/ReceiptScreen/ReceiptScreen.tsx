/**
 * ReceiptScreen — the one receipt, two tones, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/ReceiptScreen/ReceiptScreen.tsx`.
 * `transfer` is CORE 07's composition (a seal, a sentence, and a receipt card
 * of rows under two actions); `exchange` is the graphic receipt swap has
 * always rendered. The two tones do not share a prop shape, exactly as on
 * mobile — see `types.ts`.
 *
 * Both tones are static-imported here rather than lazily required as mobile
 * does: mobile's lazy `require` exists to keep `Card`/`IconBubble` (and the
 * RN Jest mocks that come with them) out of `ExchangeReceipt`'s own test
 * suite. The DOM bundler tree-shakes per route regardless of how the two
 * tones are imported here, so there is no equivalent cost to dodge.
 */
import React from 'react';

import { ExchangeReceipt } from './ExchangeReceipt';
import { TransferReceipt } from './TransferReceipt';
import type { ReceiptScreenProps } from './types';

export type {
  ExchangeReceiptScreenProps,
  ReceiptScreenAction,
  ReceiptScreenProps,
  TransferReceiptScreenProps,
} from './types';

export function ReceiptScreen(props: ReceiptScreenProps) {
  if (props.tone === 'transfer') {
    const { tone: _tone, ...rest } = props;
    return <TransferReceipt {...rest} />;
  }
  const { tone: _tone, ...rest } = props;
  return <ExchangeReceipt {...rest} />;
}
