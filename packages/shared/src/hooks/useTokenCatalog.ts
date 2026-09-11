/**
 * useTokenCatalog
 *
 * Shared hook that fetches the backend's verified-token catalogue for a
 * Solana network (`/ft/verified`, provider-agnostic: the backend picks the
 * source), mapped to the SwapToken shape used by swap UI.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/keys';
import { getTokenList } from '../api/services';
import { mapToSwapToken } from '../utils/swap';
import type { SwapToken, SwapNetworkId } from '../types/swap';

export interface UseTokenCatalogParams {
  networkId: SwapNetworkId | undefined;
  enabled?: boolean;
}

export interface UseTokenCatalogResult {
  tokens: SwapToken[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTokenCatalog(params: UseTokenCatalogParams): UseTokenCatalogResult {
  const { networkId, enabled = true } = params;
  const queryClient = useQueryClient();
  const isEnabled = !!networkId && enabled;

  const query = useQuery({
    queryKey: networkId ? queryKeys.tokenCatalog({ networkId }) : ['token-catalog', 'disabled'],
    queryFn: async () => {
      const list = await getTokenList(networkId as SwapNetworkId);
      return list.map((t) => mapToSwapToken(t));
    },
    enabled: isEnabled,
    staleTime: 5 * 60_000,
  });

  const refresh = useCallback(async () => {
    if (!networkId) return;
    await queryClient.invalidateQueries({
      queryKey: queryKeys.tokenCatalog({ networkId }),
    });
  }, [queryClient, networkId]);

  const error = query.error
    ? query.error instanceof Error
      ? query.error.message
      : String(query.error)
    : null;

  return {
    tokens: query.data ?? [],
    loading: isEnabled && query.isPending,
    error,
    refresh,
  };
}
