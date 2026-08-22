/**
 * usePrefetchBalances — warm the cache for the chains the user has *not*
 * selected, so switching to one paints a number instead of a skeleton.
 *
 * Why this exists. Balance queries are keyed per account *and* per network
 * (`queryKeys.balance`), so the first visit to a chain in a session has nothing
 * cached and legitimately shows a skeleton. `gcTime` (24h) makes every *later*
 * visit instant, but the first one is the one the user notices, because
 * switching chains is a two-tap round trip they make constantly.
 *
 * Cost. `staleTime: Infinity` here means the prefetch fires only when the cache
 * holds nothing at all for that key — one extra request per inactive chain per
 * app load, not per switch. Freshness is not this hook's job: `useBalance`
 * still refetches on mount and on focus for whichever chain is actually being
 * shown, so a prefetched number is never what the user ends up reading for
 * long — it is what they read for the first 300ms instead of a shimmer.
 *
 * Hover/focus prefetching was the alternative and is worse here: the extension
 * arrows and the mobile swipe give no hover, and a press-then-fetch still lands
 * after the transition has finished.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../query/keys';
import type { Account } from '../types/account';
import type { NetworkId } from '../types/blockchain';
import { fetchBalanceForAccount } from './useBalance';

export interface UsePrefetchBalancesParams {
  /** The active wallet — carries a blockchain account per network. */
  account: Account | undefined;
  /** Every network the wallet can show, active one included (it is skipped). */
  networkIds: NetworkId[];
  /** The network currently on screen; `useBalance` already owns it. */
  activeNetworkId: NetworkId | undefined;
  /** Derivation index in use; keep it aligned with the active balance query. */
  pathIndex?: number;
  includeSpam?: boolean;
}

export function usePrefetchBalances({
  account,
  networkIds,
  activeNetworkId,
  pathIndex = 0,
  includeSpam = false,
}: UsePrefetchBalancesParams): void {
  const queryClient = useQueryClient();
  // Join the ids so a re-render with an equivalent array does not re-run the
  // effect; the list is three chains long at most.
  const networkKey = networkIds.join(',');

  useEffect(() => {
    if (!account || !activeNetworkId) return;

    for (const networkId of networkKey.split(',').filter(Boolean) as NetworkId[]) {
      if (networkId === activeNetworkId) continue;

      const blockchainAccount =
        account.networksAccounts[networkId]?.[pathIndex] ??
        account.networksAccounts[networkId]?.[0];
      if (!blockchainAccount) continue;

      const accountId = blockchainAccount.getReceiveAddress();
      if (!accountId) continue;

      void queryClient.prefetchQuery({
        queryKey: queryKeys.balance({ accountId, networkId, includeSpam }),
        queryFn: () => fetchBalanceForAccount(blockchainAccount, networkId, includeSpam),
        // Only fetch when the cache is empty for this chain. Anything already
        // there is good enough to paint, and the chain's own hook revalidates
        // it the moment it becomes the active one.
        staleTime: Infinity,
      });
    }
  }, [queryClient, account, networkKey, activeNetworkId, pathIndex, includeSpam]);
}
