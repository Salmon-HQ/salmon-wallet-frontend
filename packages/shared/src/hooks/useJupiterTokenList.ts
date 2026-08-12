/**
 * useJupiterTokenList
 *
 * Shared hook that fetches the Jupiter verified-token catalog for a Solana
 * network, mapped to the SwapToken shape used by swap UI. Replaces the
 * `useState + useEffect` pattern duplicated in mobile/web/extension swap entries.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/keys';
import { getTokenList } from '../api/services';
import { mapToSwapToken } from '../utils/swap';
import type { SwapToken, SwapNetworkId } from '../types/swap';

export interface UseJupiterTokenListParams {
  networkId: SwapNetworkId | undefined;
  enabled?: boolean;
}

export interface UseJupiterTokenListResult {
  tokens: SwapToken[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useJupiterTokenList(params: UseJupiterTokenListParams): UseJupiterTokenListResult {
  const { networkId, enabled = true } = params;
  const queryClient = useQueryClient();
  const isEnabled = !!networkId && enabled;

  const query = useQuery({
    queryKey: networkId
      ? queryKeys.jupiterTokenList({ networkId })
      : ['jupiter-token-list', 'disabled'],
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
      queryKey: queryKeys.jupiterTokenList({ networkId }),
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
