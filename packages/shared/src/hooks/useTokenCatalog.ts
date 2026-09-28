/**
 * useTokenCatalog
 *
 * Shared hook that fetches the backend's verified-token catalogue for a
 * Solana network (`/ft/verified`, provider-agnostic: the backend picks the
 * source), mapped to the `CatalogToken` shape the pickers read.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/keys';
import { getTokenList } from '../api/services';
import type { CatalogToken } from '../types/token';
import type { SolanaNetworkId } from '../types/blockchain';
import type { TokenMetadata } from '../types/token';

/** A catalogue entry in the shape the pickers read; Solana mainnet by default. */
function toCatalogToken(token: TokenMetadata): CatalogToken {
  return {
    address: token.address,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    logo: token.logo || undefined,
    balance: 0,
    usdPrice: undefined,
    chain: 'solana',
    networkId: 'solana-mainnet',
  };
}

export interface UseTokenCatalogParams {
  networkId: SolanaNetworkId | undefined;
  enabled?: boolean;
}

export interface UseTokenCatalogResult {
  tokens: CatalogToken[];
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
      const list = await getTokenList(networkId as SolanaNetworkId);
      return list.map(toCatalogToken);
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
