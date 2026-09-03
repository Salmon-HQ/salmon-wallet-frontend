/**
 * useBalance Hook
 *
 * Provides wallet balance data with automatic refresh and caching.
 * Supports multiple blockchain types: Solana, Bitcoin, and Ethereum.
 *
 * All three chains follow the same pattern: calls account.getBalance() which
 * returns a rich wallet balance object via DI-injected backend functions, then
 * transforms to WalletBalance format.
 *
 * Internals are powered by @tanstack/react-query — caching, dedupe, and
 * refetch are handled by the QueryClient mounted at the app root. The public
 * return shape is preserved for backwards compatibility.
 *
 * @example
 * ```tsx
 * const { balance, loading, error, refresh, hiddenBalance, toggleHidden } = useBalance({
 *   account: activeBlockchainAccount,
 *   networkId: 'solana-mainnet',
 * });
 * ```
 */

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SolanaReadAccount } from '../blockchain/solana';
import type { BitcoinAccount } from '../blockchain/bitcoin';
import type { EthereumAccount } from '../blockchain/ethereum';
import type { BlockchainAccount, NetworkId } from '../types/blockchain';
import { isSolanaAccount, isBitcoinAccount, isEthereumAccount } from '../utils/account';
import { removeDecimals } from '../utils/decimals';
import { isMainnetNetworkId } from '../utils/network';
import { getBlockchainFromNetworkId } from '../config/blockchains';
import { queryKeys } from '../query/keys';

import { type WalletBalance, type TokenBalanceWithPrice, SOL_CONSTANTS } from '../utils/balance';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../storage';

// ============================================================================
// Types
// ============================================================================

export interface UseBalanceParams {
  account: BlockchainAccount | undefined;
  networkId?: NetworkId;
  skip?: boolean;
  includeSpam?: boolean;
}

/**
 * The three states a balance surface can be in, resolved once here so the home
 * screens cannot each re-derive it and drift apart.
 *
 * - `loading` — nothing to show yet and an attempt is pending or in flight.
 * - `error`   — nothing to show and the last attempt failed; the surface owes
 *               the user localized copy and a retry, per the PRODUCT.md
 *               "Failure modes are visible, not silent" guarantee that
 *               "you have none" and "we couldn't load this" stay distinct.
 * - `ready`   — a balance is held (cached or fresh), including an empty one.
 *               A refetch that fails on top of cached data stays `ready`; the
 *               data the user can still read is not blown away, and `isError`
 *               drives the stale-data notice beside it.
 */
export type BalanceLoadState = 'loading' | 'error' | 'ready';

export interface UseBalanceResult {
  balance: WalletBalance | null;
  tokens: TokenBalanceWithPrice[];
  usdTotal: number | undefined;
  /**
   * The native token's own quantity — SOL on Solana, BTC on Bitcoin — or
   * `undefined` when no balance is held yet.
   *
   * It exists because off mainnet there is no USD figure to report at all
   * (`withoutUsd` below), so the surfaces that print a total have nothing to
   * print. The native unit is the honest answer there, and deriving it here
   * means both apps read one implementation of "which item is native"
   * instead of each re-deriving it from the mint.
   */
  nativeAmount: number | undefined;
  changePercent: number | undefined;
  changeAmount: number | undefined;
  /** True only while there is nothing to show yet (no cached balance for this key). */
  loading: boolean;
  /** True while a fetch is in flight *and* cached data is already on screen. */
  refreshing: boolean;
  /**
   * True when this hook holds a balance for the current account+network — cached
   * or fresh. Render the data whenever this is true; use `refreshing` for a quiet
   * in-flight affordance. Skeletons belong to `!hasData`, never to `refreshing`.
   */
  hasData: boolean;
  /**
   * Resolved three-way state for skeleton / error / data. Prefer this over
   * re-deriving from `hasData` and `isError`: `hasData` alone is false in the
   * terminal error state too, so a `!hasData` skeleton never resolves.
   */
  state: BalanceLoadState;
  error: string | null;
  isError: boolean;
  refresh: () => Promise<void>;
  hiddenBalance: boolean;
  toggleHidden: () => void;
  lastUpdated: number | null;
}

// ============================================================================
// Pure fetchers (no React state)
// ============================================================================

async function fetchSolanaBalance(
  // Reading a balance needs an address, not a key: watch-only accounts come
  // through here too.
  solanaAccount: SolanaReadAccount,
  includeSpam: boolean
): Promise<WalletBalance> {
  try {
    const solanaWalletBalance = await solanaAccount.getBalance({ includeSpam });

    const items: TokenBalanceWithPrice[] = solanaWalletBalance.items.map((item) => ({
      mint: item.mint || 'solana',
      owner: solanaAccount.getReceiveAddress(),
      amount: item.amount,
      decimals: item.decimals,
      uiAmount: item.uiAmount || removeDecimals(item.amount, item.decimals),
      symbol: item.symbol,
      name: item.name,
      logo: item.logo || undefined,
      // Native SOL has no mint; Jupiter/SPL programs identify it by the
      // wrapped-SOL pubkey. The previous literal 'solana' propagated to
      // swap requests as outputMint=solana and Jupiter rejected with
      // "Invalid outputMint" → 404 No route found.
      address: item.mint || SOL_CONSTANTS.ADDRESS,
      coingeckoId: item.coingeckoId || (!item.mint ? 'solana' : undefined),
      tags: item.tags,
      price: item.price,
      usdBalance: item.usdBalance,
      priceChange24h: item.priceChange24h,
    }));

    let last24HoursChangePercent: number | undefined;
    if (
      solanaWalletBalance.usdTotal !== undefined &&
      solanaWalletBalance.last24HoursChange !== undefined &&
      solanaWalletBalance.usdTotal > 0
    ) {
      const previousTotal = solanaWalletBalance.usdTotal - solanaWalletBalance.last24HoursChange;
      if (previousTotal > 0) {
        last24HoursChangePercent = (solanaWalletBalance.last24HoursChange / previousTotal) * 100;
      }
    }

    return {
      items,
      usdTotal: solanaWalletBalance.usdTotal,
      last24HoursChange: solanaWalletBalance.last24HoursChange,
      last24HoursChangePercent,
    };
  } catch (error) {
    // Rethrow so react-query records the failure and `error`/`hasErrors`
    // surface in the UI instead of rendering an empty wallet.
    console.warn('[useBalance] Failed to fetch Solana balance:', error);
    throw error;
  }
}

async function fetchBitcoinBalance(bitcoinAccount: BitcoinAccount): Promise<WalletBalance> {
  try {
    const bitcoinWalletBalance = await bitcoinAccount.getBalance();

    const items: TokenBalanceWithPrice[] = bitcoinWalletBalance.items.map((item) => ({
      mint: item.mint || 'bitcoin',
      owner: bitcoinAccount.getReceiveAddress(),
      amount: item.amount,
      decimals: item.decimals,
      uiAmount: item.uiAmount || removeDecimals(item.amount, item.decimals),
      symbol: item.symbol,
      name: item.name,
      logo: item.logo || undefined,
      address: item.mint || 'bitcoin',
      coingeckoId: item.coingeckoId || (!item.mint ? 'bitcoin' : undefined),
      price: item.price,
      usdBalance: item.usdBalance,
      priceChange24h: item.priceChange24h,
    }));

    let last24HoursChangePercent: number | undefined;
    if (
      bitcoinWalletBalance.usdTotal !== undefined &&
      bitcoinWalletBalance.last24HoursChange !== undefined &&
      bitcoinWalletBalance.usdTotal > 0
    ) {
      const previousTotal = bitcoinWalletBalance.usdTotal - bitcoinWalletBalance.last24HoursChange;
      if (previousTotal > 0) {
        last24HoursChangePercent = (bitcoinWalletBalance.last24HoursChange / previousTotal) * 100;
      }
    }

    return {
      items,
      usdTotal: bitcoinWalletBalance.usdTotal,
      last24HoursChange: bitcoinWalletBalance.last24HoursChange,
      last24HoursChangePercent,
    };
  } catch (error) {
    console.warn('[useBalance] Failed to fetch Bitcoin balance:', error);
    throw error;
  }
}

async function fetchEthereumBalance(ethereumAccount: EthereumAccount): Promise<WalletBalance> {
  try {
    const ethereumWalletBalance = await ethereumAccount.getBalance();

    const items: TokenBalanceWithPrice[] = ethereumWalletBalance.items.map((item) => ({
      mint: item.mint || 'ethereum',
      owner: ethereumAccount.getReceiveAddress(),
      amount: item.amount,
      decimals: item.decimals,
      uiAmount: item.uiAmount || removeDecimals(item.amount, item.decimals),
      symbol: item.symbol,
      name: item.name,
      logo: item.logo || undefined,
      address: item.mint || 'ethereum',
      coingeckoId: item.coingeckoId || (!item.mint ? 'ethereum' : undefined),
      price: item.price,
      usdBalance: item.usdBalance,
      priceChange24h: item.priceChange24h,
    }));

    let last24HoursChangePercent: number | undefined;
    if (
      ethereumWalletBalance.usdTotal !== undefined &&
      ethereumWalletBalance.last24HoursChange !== undefined &&
      ethereumWalletBalance.usdTotal > 0
    ) {
      const previousTotal =
        ethereumWalletBalance.usdTotal - ethereumWalletBalance.last24HoursChange;
      if (previousTotal > 0) {
        last24HoursChangePercent = (ethereumWalletBalance.last24HoursChange / previousTotal) * 100;
      }
    }

    return {
      items,
      usdTotal: ethereumWalletBalance.usdTotal,
      last24HoursChange: ethereumWalletBalance.last24HoursChange,
      last24HoursChangePercent,
    };
  } catch (error) {
    console.warn('[useBalance] Failed to fetch Ethereum balance:', error);
    throw error;
  }
}

/**
 * Top-level fetcher used by the React Query queryFn. Routes to the per-chain
 * fetcher based on account type.
 */
/**
 * Drops every USD figure from a balance.
 *
 * A devnet SOL is not SOL, and a testnet token that happens to carry a
 * mainnet symbol is worth nothing at all — showing the mainnet asset's price
 * beside it is the one wrong answer. Unknown is the honest one, and the rows
 * already render an em-dash for it.
 */
function withoutUsd(balance: WalletBalance): WalletBalance {
  return {
    items: balance.items.map(({ price, usdBalance, priceChange24h, ...item }) => item),
  };
}

export async function fetchBalanceForAccount(
  account: BlockchainAccount,
  networkId: NetworkId,
  includeSpam: boolean
): Promise<WalletBalance> {
  const balance = await (async () => {
    if (isSolanaAccount(account)) {
      return fetchSolanaBalance(account, includeSpam);
    }
    if (isBitcoinAccount(account)) {
      return fetchBitcoinBalance(account);
    }
    if (isEthereumAccount(account)) {
      return fetchEthereumBalance(account);
    }
    // Fallback: treat as Solana for backwards compatibility
    return fetchSolanaBalance(account as SolanaReadAccount, includeSpam);
  })();

  return isMainnetNetworkId(networkId) ? balance : withoutUsd(balance);
}

// ============================================================================
// Hook
// ============================================================================

export function useBalance({
  account,
  networkId = 'solana-mainnet',
  skip = false,
  includeSpam = false,
}: UseBalanceParams): UseBalanceResult {
  const accountId = account?.getReceiveAddress() ?? '';
  const enabled = !skip && !!account && !!networkId && !!accountId;

  const query = useQuery<WalletBalance, Error>({
    queryKey: queryKeys.balance({ accountId, networkId, includeSpam }),
    queryFn: () => fetchBalanceForAccount(account!, networkId, includeSpam),
    enabled,
    staleTime: 15_000,
    refetchOnMount: 'always',
  });

  // Hidden balance is a UI preference — keep separate state with storage as before.
  const [hiddenBalance, setHiddenBalance] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hidden = await getStorageItem<boolean>(STORAGE_KEYS.HIDDEN_BALANCE);
        if (!cancelled && hidden !== null) {
          setHiddenBalance(hidden);
        }
      } catch {
        // Ignore storage errors for preference
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleHidden = useCallback(async () => {
    const newValue = !hiddenBalance;
    setHiddenBalance(newValue);
    try {
      await setStorageItem(STORAGE_KEYS.HIDDEN_BALANCE, newValue);
    } catch {
      // Ignore storage errors for preference
    }
  }, [hiddenBalance]);

  // Depends on `query.refetch`, which React Query keeps stable, rather than on
  // the query object, which is a new value on every render. A refresh handler
  // that changed identity every render replaced the props of whatever it was
  // wired to — including a native pull-to-refresh control, which is stateful on
  // the platform side and does not appreciate being handed a new callback
  // mid-gesture.
  const { refetch } = query;
  const refresh = useCallback(async () => {
    if (!enabled) return;
    await refetch();
  }, [enabled, refetch]);

  const data = query.data;
  const tokens = data?.items ?? [];
  // The native item carries the chain's own name as its mint (see the three
  // fetchers above), so the family the network belongs to identifies it.
  const nativeItem = data?.items.find(
    (item) => item.mint === getBlockchainFromNetworkId(networkId)
  );
  const nativeUiAmount =
    typeof nativeItem?.uiAmount === 'string'
      ? parseFloat(nativeItem.uiAmount)
      : nativeItem?.uiAmount;
  // Held data always wins, so a failed refetch keeps showing the balance.
  // With nothing held, a fetch in flight (including a user-pressed retry) is a
  // skeleton and a settled failure is the error state.
  const state: BalanceLoadState =
    data !== undefined ? 'ready' : query.isError && !query.isFetching ? 'error' : 'loading';
  const lastUpdated = query.dataUpdatedAt > 0 ? query.dataUpdatedAt : null;

  return {
    balance: data ?? null,
    tokens,
    usdTotal: data?.usdTotal,
    // A held balance with no native item is a real zero, not an unknown: the
    // backend answered and the wallet holds none.
    nativeAmount:
      data === undefined ? undefined : Number.isFinite(nativeUiAmount) ? nativeUiAmount : 0,
    changePercent: data?.last24HoursChangePercent,
    changeAmount: data?.last24HoursChange,
    loading: query.isPending && enabled,
    refreshing: query.isFetching && !query.isPending,
    hasData: data !== undefined,
    state,
    error: query.error?.message ?? null,
    isError: query.isError,
    refresh,
    hiddenBalance,
    toggleHidden,
    lastUpdated,
  };
}
