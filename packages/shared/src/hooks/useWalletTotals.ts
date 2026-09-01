/**
 * useWalletTotals — one fiat total per wallet, for a screen that lists them all.
 *
 * `useBalance` answers for the wallet the user is looking at; the wallets
 * screen has to answer for every wallet at once, and a hook cannot be called
 * in a loop. So this reads the **same** query key and the same fetcher through
 * `useQueries`: whatever `useBalance` and `usePrefetchBalances` have already
 * put in the cache is what this paints, and nothing is fetched twice.
 *
 * The total is the one for the network currently on screen, which is the same
 * number the home balance shows for the active wallet — one chain, one source
 * (DESIGN.md §Chain identity: every surface reads the chain from `networkId`).
 */
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import { queryKeys } from '../query/keys';
import type { Account } from '../types/account';
import type { NetworkId } from '../types/blockchain';
import { fetchBalanceForAccount } from './useBalance';

export interface UseWalletTotalsParams {
  /** Every wallet to price. */
  accounts: Account[];
  /** The network the screen is reading. */
  networkId: NetworkId | undefined;
  /** Derivation index in use; keep it aligned with the active balance query. */
  pathIndex?: number;
  includeSpam?: boolean;
}

export interface UseWalletTotalsResult {
  /** Wallet id → fiat total, or `undefined` while it has no answer yet. */
  totals: Record<string, number | undefined>;
  /** True while at least one wallet is still without a number. */
  loading: boolean;
}

/**
 * The aggregated total: the sum of the wallets the user has left included.
 *
 * A wallet with no answer yet counts as zero rather than as unknown — the card
 * shows a number that grows as the chains answer, which is what the home
 * balance does too. Pulled out of the screen so the arithmetic can be tested
 * without a renderer.
 */
export function sumIncludedTotals(
  walletIds: string[],
  excludedFromTotal: string[],
  totals: Record<string, number | undefined>
): number {
  return walletIds.reduce(
    (sum, id) => (excludedFromTotal.includes(id) ? sum : sum + (totals[id] ?? 0)),
    0
  );
}

export function useWalletTotals({
  accounts,
  networkId,
  pathIndex = 0,
  includeSpam = false,
}: UseWalletTotalsParams): UseWalletTotalsResult {
  const entries = useMemo(
    () =>
      accounts.map((account) => {
        const blockchainAccount = networkId
          ? (account.networksAccounts?.[networkId]?.[pathIndex] ??
            account.networksAccounts?.[networkId]?.[0])
          : undefined;
        const address = blockchainAccount?.getReceiveAddress?.();
        return { walletId: account.id, blockchainAccount, address };
      }),
    [accounts, networkId, pathIndex]
  );

  const results = useQueries({
    queries: entries.map(({ blockchainAccount, address }) => ({
      queryKey: queryKeys.balance({
        accountId: address ?? '',
        networkId: networkId ?? ('solana-mainnet' as NetworkId),
        includeSpam,
      }),
      queryFn: () => fetchBalanceForAccount(blockchainAccount!, networkId!, includeSpam),
      enabled: Boolean(blockchainAccount && address && networkId),
    })),
  });

  return useMemo(() => {
    const totals: Record<string, number | undefined> = {};
    let loading = false;
    entries.forEach(({ walletId }, index) => {
      const result = results[index];
      totals[walletId] = result?.data?.usdTotal;
      if (result?.isPending) loading = true;
    });
    return { totals, loading };
    // `results` is a fresh array every render; its identity is not a signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, results.map((r) => r.dataUpdatedAt).join(','), results.length]);
}
