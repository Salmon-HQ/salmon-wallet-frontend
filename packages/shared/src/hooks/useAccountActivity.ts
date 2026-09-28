/**
 * useAccountActivity — refresh what the wallet shows when the chain says the
 * account was touched.
 *
 * Nothing else notices a receive: the balance, the activity and the NFT grid
 * only change when something asks for them again, so an incoming payment or
 * NFT stayed invisible until the next focus or pull-to-refresh. The account's
 * own RPC is asked to report every confirmed transaction that mentions the
 * address, and each one refreshes the account's queries — now, and again as
 * the indexer catches up.
 *
 * Solana only: the other chains have no subscription the wallet holds open.
 *
 * @module hooks/useAccountActivity
 */

import { useEffect } from 'react';
import { address } from '@solana/kit';

import { useSettleAfterTx } from '../query/invalidation';
import type { BlockchainAccount } from '../types/blockchain';
import { isSolanaAccount } from '../utils/account';

/** A burst of notifications (one transaction, several logs) is one refresh. */
const ACTIVITY_DEBOUNCE_MS = 1_500;
/** The indexer lags the chain; refetch again as it catches up. */
const ACTIVITY_SETTLE_DELAYS_MS = [8_000, 25_000];
/** A dropped socket is reopened after this long. */
const RESUBSCRIBE_DELAY_MS = 5_000;

export function useAccountActivity(
  account: BlockchainAccount | null | undefined,
  avatarAccountId?: string
): void {
  const settleAfterTx = useSettleAfterTx();

  useEffect(() => {
    if (!account || !isSolanaAccount(account)) return undefined;
    const receiveAddress = account.getReceiveAddress();
    const networkId = account.getNetworkId();
    const abort = new AbortController();
    let debounce: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        settleAfterTx({
          accountId: receiveAddress,
          avatarAccountId,
          networkId,
          kinds: ['balance', 'transactions', 'nfts', 'avatar-nfts'],
          settlementDelaysMs: ACTIVITY_SETTLE_DELAYS_MS,
        }).catch((err) => console.warn('[useAccountActivity] refresh failed:', err));
      }, ACTIVITY_DEBOUNCE_MS);
    };

    const listen = async () => {
      while (!abort.signal.aborted) {
        try {
          const notifications = await account
            .getRpcSubscriptions()
            .logsNotifications({ mentions: [address(receiveAddress)] }, { commitment: 'confirmed' })
            .subscribe({ abortSignal: abort.signal });
          for await (const notification of notifications) {
            void notification;
            refresh();
          }
        } catch (err) {
          if (abort.signal.aborted) return;
          console.warn('[useAccountActivity] subscription dropped, reopening:', err);
        }
        await new Promise((resolve) => setTimeout(resolve, RESUBSCRIBE_DELAY_MS));
      }
    };
    void listen();

    return () => {
      abort.abort();
      clearTimeout(debounce);
    };
  }, [account, avatarAccountId, settleAfterTx]);
}
