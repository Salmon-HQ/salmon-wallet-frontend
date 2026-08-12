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
import { getSolanaNfts } from '../api/services/solana-nft';
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
  /** Whether the initial fetch is in flight */
  loading: boolean;
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

  const query = useQuery<Nft[], Error>({
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
    nfts: query.data ?? [],
    loading: query.isPending && isEnabled,
    error: query.error?.message ?? null,
    isError: query.isError,
    refresh: () => query.refetch().then(() => undefined),
  };
}
