/**
 * useTransactions Hook
 *
 * Fetches and manages transaction history for multi-chain wallet addresses.
 * Supports Solana, Bitcoin, and Ethereum networks.
 * Provides pagination, caching, and transforms API data to UI-friendly format.
 *
 * Internals are powered by @tanstack/react-query's `useInfiniteQuery` —
 * caching, dedupe, refetch-on-focus, and invalidation are handled by the
 * QueryClient mounted at the app root. The public return shape is preserved
 * for backwards compatibility.
 *
 * @example
 * ```tsx
 * const {
 *   transactions,
 *   loading,
 *   error,
 *   hasMore,
 *   loadMore,
 *   refresh,
 * } = useTransactions({
 *   address: walletAddress,
 *   networkId: 'solana-mainnet', // or 'bitcoin-mainnet', 'ethereum-mainnet', etc.
 *   account: activeBlockchainAccount,
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { BlockchainAccount, NetworkId } from '../types/blockchain';
import type { Transaction, TransactionItem } from '../types/transaction';
import { isSolanaAccount, getBlockchainFromNetworkId } from '../utils/account';
import { transformSolanaTransaction, transformMultichainTransaction } from '../utils/transactions';
import { queryKeys } from '../query/keys';

/**
 * Options for the useTransactions hook
 */
export interface UseTransactionsParams {
  /** Wallet address to fetch transactions for */
  address: string | undefined;
  /** Network identifier (supports Solana, Bitcoin, and Ethereum networks) */
  networkId?: NetworkId;
  /** Initial page size */
  pageSize?: number;
  /** Whether to skip initial fetch */
  skip?: boolean;
  /** Blockchain account instance (used for DI-based transaction fetching) */
  account?: BlockchainAccount;
}

/**
 * Return type for the useTransactions hook
 */
export interface UseTransactionsResult {
  /** Processed transactions */
  transactions: Transaction[];
  /** True only while there is nothing to show yet (no cached pages for this key). */
  loading: boolean;
  /**
   * True when this hook holds transaction pages for the current account+network —
   * cached or fresh. Render the rows whenever this is true; use `refreshing` for a
   * quiet in-flight affordance. Skeletons belong to `!hasData`, never to
   * `refreshing`.
   */
  hasData: boolean;
  /** Whether more data is being loaded */
  loadingMore: boolean;
  /** Whether a refresh is in progress */
  refreshing: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether an error occurred */
  isError: boolean;
  /** Whether there are more transactions to load */
  hasMore: boolean;
  /** Load more transactions */
  loadMore: () => Promise<void>;
  /** Refresh all transactions */
  refresh: () => Promise<void>;
  /** Total number of transactions loaded */
  totalCount: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default page size */
const DEFAULT_PAGE_SIZE = 20;

/** Stale time (60s) — RQ default refetchOnWindowFocus only fires when stale */
const STALE_TIME_MS = 60 * 1000;

// ============================================================================
// Pure fetcher
// ============================================================================

interface TransactionPage {
  items: Transaction[];
  nextCursor: string | undefined;
}

interface FetchPageArgs {
  account: BlockchainAccount;
  networkId: NetworkId;
  pageParam: string | undefined;
  pageSize: number;
}

async function fetchTransactionsPage({
  account,
  networkId,
  pageParam,
  pageSize,
}: FetchPageArgs): Promise<TransactionPage> {
  const blockchain = getBlockchainFromNetworkId(networkId);

  if (isSolanaAccount(account)) {
    const response = await account.getRecentTransactions({
      nextPageToken: pageParam,
      pageSize,
    });
    return {
      items: response.data.map(transformSolanaTransaction),
      nextCursor: response.pageToken,
    };
  }

  const response = await account.getRecentTransactions({
    nextPageToken: pageParam,
    pageSize,
  });
  return {
    items: response.items.map((tx) =>
      transformMultichainTransaction(tx as unknown as TransactionItem, blockchain)
    ),
    nextCursor: response.nextPageToken,
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for fetching and managing transaction history
 *
 * @param options - Hook configuration options
 * @returns Transaction data and state
 */
export function useTransactions({
  address,
  networkId = 'solana-mainnet',
  pageSize = DEFAULT_PAGE_SIZE,
  skip = false,
  account,
}: UseTransactionsParams): UseTransactionsResult {
  const queryClient = useQueryClient();
  const enabled = !!address && !!account && !skip;

  // Use address as accountId for query key (matches existing call sites that
  // identify wallets by their public address).
  const queryKey = queryKeys.transactions({
    accountId: address ?? '',
    networkId,
  });

  const query = useInfiniteQuery<
    TransactionPage,
    Error,
    { pages: TransactionPage[]; pageParams: Array<string | undefined> },
    typeof queryKey,
    string | undefined
  >({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchTransactionsPage({
        account: account as BlockchainAccount,
        networkId,
        pageParam,
        pageSize,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: STALE_TIME_MS,
    enabled,
  });

  const transactions = useMemo<Transaction[]>(() => {
    if (!query.data) return [];
    // Dedup by id across pages (preserves first occurrence order).
    const seen = new Set<string>();
    const out: Transaction[] = [];
    for (const page of query.data.pages) {
      for (const tx of page.items) {
        if (seen.has(tx.id)) continue;
        seen.add(tx.id);
        out.push(tx);
      }
    }
    return out;
  }, [query.data]);

  const loadMore = useCallback(async () => {
    if (!query.hasNextPage || query.isFetchingNextPage || query.isPending) return;
    await query.fetchNextPage();
  }, [query]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const errorMessage = query.error
    ? query.error instanceof Error
      ? query.error.message
      : 'Failed to fetch transactions'
    : null;

  const loading = query.isPending && enabled;
  const refreshing = query.isFetching && !query.isPending && !query.isFetchingNextPage;

  return {
    transactions,
    loading,
    hasData: query.data !== undefined,
    loadingMore: query.isFetchingNextPage,
    refreshing,
    error: errorMessage,
    isError: query.isError,
    hasMore: !!query.hasNextPage,
    loadMore,
    refresh,
    totalCount: transactions.length,
  };
}
