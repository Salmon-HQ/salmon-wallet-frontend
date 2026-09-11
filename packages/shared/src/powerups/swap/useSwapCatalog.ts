/**
 * useSwapCatalog — what the "You Receive" side lists beyond the wallet's own
 * tokens: the verified catalogue for the swap network, and a search past it.
 * One hook, so both twins (`SwapScreen`, `SwapPage`) feed the shared logic
 * the same catalogue and the same search, and neither host has to know.
 */
import { useCallback } from 'react';
import { searchTokens } from '../../api/services/tokens';
import { useTokenCatalog } from '../../hooks/useTokenCatalog';
import type { SwapNetworkId, SwapToken } from '../../types/swap';
import { mapToSwapToken } from '../../utils/swap';
import { SWAP_NETWORK_ID } from './types';

export interface UseSwapCatalogResult {
  catalogTokens: SwapToken[];
  onSearchTokens: (query: string) => Promise<SwapToken[]>;
}

export function useSwapCatalog(): UseSwapCatalogResult {
  const { tokens: catalogTokens } = useTokenCatalog({
    networkId: SWAP_NETWORK_ID as SwapNetworkId,
  });

  const onSearchTokens = useCallback(async (query: string): Promise<SwapToken[]> => {
    try {
      const results = await searchTokens(query, SWAP_NETWORK_ID);
      return results.map((token) => mapToSwapToken(token));
    } catch (error) {
      // A failed search is an empty page, never a failed screen.
      console.error('[useSwapCatalog] token search failed:', error);
      return [];
    }
  }, []);

  return { catalogTokens, onSearchTokens };
}
