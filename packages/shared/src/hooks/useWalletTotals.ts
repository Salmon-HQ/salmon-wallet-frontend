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
 * chain the home balance reads — one chain, one source (DESIGN.md §Chain
 * identity: every surface reads the chain from `networkId`).
 *
 * A wallet's total is the sum of **every** derived account it holds on that
 * network, not just the one the user happens to be standing on (owner,
 * 2026-09-02): Wallets answers "what is in this wallet", and a seed's money is
 * spread across its paths. Home is unchanged — it shows the active
 * sub-account, which is what picking one in Wallets is for.
 */
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import { queryKeys } from '../query/keys';
import type { Account } from '../types/account';
import type { BlockchainAccount, NetworkId } from '../types/blockchain';
import { fetchBalanceForAccount } from './useBalance';

export interface UseWalletTotalsParams {
  /** Every wallet to price. */
  accounts: Account[];
  /** The network the screen is reading. */
  networkId: NetworkId | undefined;
  /** Derivation indexes the user has hidden, per wallet — left out of the sum. */
  hiddenDerivedAccounts?: Record<string, number[]>;
  includeSpam?: boolean;
}

/** One priced address: a wallet's derived account on the network being read. */
export interface WalletBalanceEntry {
  walletId: string;
  index: number;
  address: string | undefined;
  blockchainAccount: BlockchainAccount;
}

export interface UseWalletTotalsResult {
  /** Wallet id → fiat total, or `undefined` while it has no answer yet. */
  totals: Record<string, number | undefined>;
  /** True while at least one wallet is still without a number. */
  loading: boolean;
}

/**
 * Every address that counts towards a wallet's total on one network.
 *
 * Pulled out of the hook so the two rules it encodes — every derived account
 * counts, a hidden one does not — can be tested without a query client.
 */
export function walletBalanceEntries(
  accounts: Account[],
  networkId: NetworkId | undefined,
  hiddenDerivedAccounts: Record<string, number[]> = {}
): WalletBalanceEntry[] {
  if (!networkId) return [];
  return accounts.flatMap((account) => {
    const hidden = hiddenDerivedAccounts[account.id] ?? [];
    return (account.networksAccounts?.[networkId] ?? []).flatMap((blockchainAccount, index) =>
      blockchainAccount && !hidden.includes(index)
        ? [
            {
              walletId: account.id,
              index,
              address: blockchainAccount.getReceiveAddress?.(),
              blockchainAccount,
            },
          ]
        : []
    );
  });
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
  hiddenDerivedAccounts,
  includeSpam = false,
}: UseWalletTotalsParams): UseWalletTotalsResult {
  const entries = useMemo(
    () => walletBalanceEntries(accounts, networkId, hiddenDerivedAccounts),
    [accounts, networkId, hiddenDerivedAccounts]
  );

  const results = useQueries({
    queries: entries.map(({ blockchainAccount, address }) => ({
      queryKey: queryKeys.balance({
        accountId: address ?? '',
        networkId: networkId ?? ('solana-mainnet' as NetworkId),
        includeSpam,
      }),
      queryFn: () => fetchBalanceForAccount(blockchainAccount, networkId!, includeSpam),
      enabled: Boolean(address && networkId),
    })),
  });

  return useMemo(() => {
    // Every wallet is present from the start, at `undefined`, so a wallet whose
    // chains have not answered yet reads as "no number yet" rather than as a
    // zero balance.
    const totals: Record<string, number | undefined> = {};
    for (const account of accounts) totals[account.id] = undefined;

    let loading = false;
    entries.forEach(({ walletId }, index) => {
      const result = results[index];
      const value = result?.data?.usdTotal;
      if (value != null) totals[walletId] = (totals[walletId] ?? 0) + value;
      if (result?.isPending) loading = true;
    });
    return { totals, loading };
    // `results` is a fresh array every render; its identity is not a signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, entries, results.map((r) => r.dataUpdatedAt).join(','), results.length]);
}
