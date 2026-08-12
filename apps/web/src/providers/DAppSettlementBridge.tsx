import { useEffect } from 'react';
import { useSettleAfterTx } from '@salmon/shared';
import { onSettlementRequest } from '../utils/walletBridge';

export function DAppSettlementBridge(): null {
  const settleAfterTx = useSettleAfterTx();

  useEffect(
    () =>
      onSettlementRequest((request) => {
        settleAfterTx({
          accountId: request.accountId,
          networkId: request.networkId,
          kinds: request.kinds,
        }).catch((err) => {
          console.warn('[DAppSettlementBridge] settleAfterTx failed:', err);
        });
      }),
    [settleAfterTx]
  );

  return null;
}
