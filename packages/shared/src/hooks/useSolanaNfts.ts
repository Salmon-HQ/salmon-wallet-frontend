/**
 * useSolanaNfts Hook
 *
 * Centralized Solana NFT list fetcher used by the collectibles screens
 * across mobile, web, and extension. Replaces the inline `fetchAllNfts`
 * state machines that lived in each platform.
 *
 * Internals are powered by `@tanstack/react-query` — caching, dedupe, and
 * refetch are handled by the QueryClient mounted at app roots.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query/keys';
import { getSolanaNfts, type SolanaNftPageWalk } from '../api/services/solana-nft';
import type { Nft } from '../types/nft';
import type { NetworkId } from '../types/blockchain';

// ============================================================================
// Types
// ============================================================================

export interface UseSolanaNftsParams {
  /** Owner public key whose NFTs are fetched */
  publicKey: string | undefined;
  /** Network the NFTs are sourced from (e.g. 'solana-mainnet', 'solana-devnet') */
  networkId: NetworkId | undefined;
  /** When true, asks the backend to include blacklisted / spam-scored NFTs */
  includeSpam?: boolean;
  /** When false, the underlying query is disabled */
  enabled?: boolean;
}

export interface UseSolanaNftsResult {
  /** Canonical NFT list (already filtered by the BE for spam unless includeSpam=true) */
  nfts: Nft[];
  /** True only while there is nothing to show yet (no cached list for this key). */
  loading: boolean;
  /** True while a fetch is in flight *and* a cached list is already on screen. */
  refreshing: boolean;
  /**
   * True when this hook holds an NFT list for the current owner+network — cached
   * or fresh. Render the list whenever this is true; use `refreshing` for a quiet
   * in-flight affordance. Skeletons belong to `!hasData`, never to `refreshing`.
   */
  hasData: boolean;
  /**
   * True when some pages loaded and a later one failed, so the list on screen
   * is short. Distinct from `isError`, which means nothing loaded at all: a
   * partial list is worth showing, it just must not be presented as complete.
   */
  partial: boolean;
  /** Error message if the fetch failed */
  error: string | null;
  /** Whether an error occurred */
  isError: boolean;
  /** Manually refetch the NFT list */
  refresh: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useSolanaNfts(params: UseSolanaNftsParams): UseSolanaNftsResult {
  const { publicKey, networkId, includeSpam = false, enabled = true } = params;
  const isEnabled = !!enabled && !!publicKey && !!networkId;
  const accountId = publicKey ?? '';

  const query = useQuery<SolanaNftPageWalk, Error>({
    queryKey: queryKeys.solanaNfts({
      accountId,
      networkId: (networkId ?? 'solana-mainnet') as NetworkId,
      includeSpam,
    }),
    queryFn: () => getSolanaNfts(networkId as string, publicKey as string, false, { includeSpam }),
    enabled: isEnabled,
    staleTime: 60_000,
  });

  return {
    nfts: query.data?.nfts ?? [],
    loading: query.isPending && isEnabled,
    refreshing: query.isFetching && !query.isPending,
    hasData: query.data !== undefined,
    partial: query.data?.partial ?? false,
    error: query.error?.message ?? null,
    isError: query.isError,
    refresh: () => query.refetch().then(() => undefined),
  };
}
