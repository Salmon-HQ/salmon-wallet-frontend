/**
 * useMultiChainTokens Hook
 *
 * Combines tokens from all blockchain accounts (Solana, Bitcoin, Ethereum)
 * into a unified array.
 *
 * Features:
 * - Fetches balances from all chains the user has accounts for
 * - Normalizes token data into a unified format
 * - Identifies chain type for each token
 *
 * Internally each chain's balance flows through `useBalance`, which is now
 * a `react-query` query under the hood. The `refresh()` method fans out to
 * each underlying query's `refetch()`. Loading / refreshing flags derive
 * from the per-chain query state — no manual refresh-trigger counter.
 *
 * @module hooks/useMultiChainTokens
 */

import { useCallback, useMemo } from 'react';
import type { Account } from '../types/account';
import type { BlockchainAccount, BlockchainType, NetworkId } from '../types/blockchain';
import type { UnifiedToken } from '../types/token';
import { useBalance, type UseBalanceResult } from './useBalance';
import { MAINNET_NETWORK_ID } from '../utils/network';

/**
 * Chain identifier for unified tokens.
 * Alias of the canonical BlockchainType.
 */
export type ChainType = BlockchainType;

/**
 * Parameters for the useMultiChainTokens hook
 */
export interface UseMultiChainTokensParams {
  /** The active account containing all network accounts */
  activeAccount: Account | undefined;
  /** Whether to skip fetching */
  skip?: boolean;
}

/**
 * Return type for the useMultiChainTokens hook
 */
export interface UseMultiChainTokensResult {
  /** All tokens from all chains combined */
  tokens: UnifiedToken[];
  /** Tokens grouped by chain */
  tokensByChain: Record<ChainType, UnifiedToken[]>;
  /** Whether any chain is still loading */
  loading: boolean;
  /** Whether any chain is currently refetching (background refresh) */
  refreshing: boolean;
  /** Whether all chains have loaded */
  ready: boolean;
  /** Errors from any chain */
  errors: Record<ChainType, string | null>;
  /** Whether any chain has errors */
  hasErrors: boolean;
  /** Most recent dataUpdatedAt across the underlying queries (or null) */
  lastUpdated: number | null;
  /** Refresh all balances by refetching every underlying query */
  refresh: () => Promise<void>;
  /** Get tokens for a specific chain */
  getTokensForChain: (chain: ChainType) => UnifiedToken[];
  /** Featured tokens (top 5 by USD value across all chains) */
  featuredTokens: UnifiedToken[];
}

// ============================================================================
// Constants
// ============================================================================

/** Network IDs for each chain (uses canonical source) */
const NETWORK_IDS = MAINNET_NETWORK_ID;

// ============================================================================
// Helpers
// ============================================================================

function toUnifiedTokens(
  state: UseBalanceResult,
  chain: ChainType,
  networkId: string
): UnifiedToken[] {
  return state.tokens.map((token) => ({
    symbol: token.symbol || '',
    name: token.name || token.symbol || '',
    address: token.address || token.mint || '',
    decimals: token.decimals || 9,
    logo: token.logo || undefined,
    balance: token.uiAmount || 0,
    usdPrice: token.price,
    usdBalance: token.usdBalance,
    chain,
    networkId,
  }));
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

/**
 * Hook for fetching and combining tokens from all blockchain accounts.
 *
 * - Gets blockchain accounts for Solana, Bitcoin, and Ethereum
 * - Fetches balances for each chain via `useBalance` (react-query under the hood)
 * - Combines all tokens into a unified format
 * - Provides helpers for chain filtering
 *
 * @example
 * ```tsx
 * const { tokens, loading } = useMultiChainTokens({ activeAccount });
 * ```
 */
export function useMultiChainTokens(params: UseMultiChainTokensParams): UseMultiChainTokensResult {
  const { activeAccount, skip = false } = params;

  // Resolve per-chain blockchain accounts
  const solanaAccount = useMemo(() => {
    if (!activeAccount?.networksAccounts) return undefined;
    const accounts = activeAccount.networksAccounts[NETWORK_IDS.solana];
    return accounts?.find((a) => a !== null) as BlockchainAccount | undefined;
  }, [activeAccount]);

  const bitcoinAccount = useMemo(() => {
    if (!activeAccount?.networksAccounts) return undefined;
    const accounts = activeAccount.networksAccounts[NETWORK_IDS.bitcoin];
    return accounts?.find((a) => a !== null) as BlockchainAccount | undefined;
  }, [activeAccount]);

  const ethereumAccount = useMemo(() => {
    if (!activeAccount?.networksAccounts) return undefined;
    const accounts = activeAccount.networksAccounts[NETWORK_IDS.ethereum];
    return accounts?.find((a) => a !== null) as BlockchainAccount | undefined;
  }, [activeAccount]);

  // Per-chain balance queries
  const solanaBalance = useBalance({
    account: solanaAccount,
    networkId: NETWORK_IDS.solana as NetworkId,
    skip: skip || !solanaAccount,
  });

  const bitcoinBalance = useBalance({
    account: bitcoinAccount,
    networkId: NETWORK_IDS.bitcoin as NetworkId,
    skip: skip || !bitcoinAccount,
  });

  const ethereumBalance = useBalance({
    account: ethereumAccount,
    networkId: NETWORK_IDS.ethereum as NetworkId,
    skip: skip || !ethereumAccount,
  });

  // Per-chain unified token lists
  const solanaTokens = useMemo(
    () => toUnifiedTokens(solanaBalance, 'solana', NETWORK_IDS.solana),
    [solanaBalance]
  );
  const bitcoinTokens = useMemo(
    () => toUnifiedTokens(bitcoinBalance, 'bitcoin', NETWORK_IDS.bitcoin),
    [bitcoinBalance]
  );
  const ethereumTokens = useMemo(
    () => toUnifiedTokens(ethereumBalance, 'ethereum', NETWORK_IDS.ethereum),
    [ethereumBalance]
  );

  // Combined token list (filtered + sorted)
  const tokens = useMemo(() => {
    const allTokens: UnifiedToken[] = [...solanaTokens, ...bitcoinTokens, ...ethereumTokens].filter(
      (token) => {
        const hasName = !!token.name && token.name !== 'Unknown Token';
        const hasSymbol = !!token.symbol && token.symbol !== 'UNKNOWN';
        return hasName || hasSymbol;
      }
    );

    return allTokens.sort((a, b) => (b.usdBalance || 0) - (a.usdBalance || 0));
  }, [solanaTokens, bitcoinTokens, ethereumTokens]);

  const tokensByChain = useMemo(
    () => ({
      solana: solanaTokens,
      bitcoin: bitcoinTokens,
      ethereum: ethereumTokens,
    }),
    [solanaTokens, bitcoinTokens, ethereumTokens]
  );

  // Loading = any chain is in initial pending state
  const loading = solanaBalance.loading || bitcoinBalance.loading || ethereumBalance.loading;
  // Refreshing = any chain currently refetching in the background
  const refreshing =
    solanaBalance.refreshing || bitcoinBalance.refreshing || ethereumBalance.refreshing;

  const ready = !loading && tokens.length > 0;

  const errors = useMemo(
    () => ({
      solana: solanaBalance.error,
      bitcoin: bitcoinBalance.error,
      ethereum: ethereumBalance.error,
    }),
    [solanaBalance.error, bitcoinBalance.error, ethereumBalance.error]
  );

  const featuredTokens = useMemo(() => tokens.slice(0, 5), [tokens]);

  const getTokensForChain = useCallback(
    (chain: ChainType) => tokensByChain[chain] || [],
    [tokensByChain]
  );

  const lastUpdated = useMemo(() => {
    const candidates = [
      solanaBalance.lastUpdated,
      bitcoinBalance.lastUpdated,
      ethereumBalance.lastUpdated,
    ].filter((v): v is number => typeof v === 'number');
    return candidates.length > 0 ? Math.max(...candidates) : null;
  }, [solanaBalance.lastUpdated, bitcoinBalance.lastUpdated, ethereumBalance.lastUpdated]);

  const refresh = useCallback(async () => {
    const refreshes: Promise<void>[] = [];
    if (solanaAccount) refreshes.push(solanaBalance.refresh());
    if (bitcoinAccount) refreshes.push(bitcoinBalance.refresh());
    if (ethereumAccount) refreshes.push(ethereumBalance.refresh());
    await Promise.all(refreshes);
  }, [
    solanaAccount,
    solanaBalance,
    bitcoinAccount,
    bitcoinBalance,
    ethereumAccount,
    ethereumBalance,
  ]);

  return {
    tokens,
    tokensByChain,
    loading,
    refreshing,
    ready,
    errors,
    hasErrors: Object.values(errors).some((e) => e !== null),
    lastUpdated,
    refresh,
    getTokensForChain,
    featuredTokens,
  };
}
