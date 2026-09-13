/**
 * useKaminoPositions — the Kamino Positions tab's state, shared by both twins:
 * every market Kamino lists, asked in parallel for this address's loans.
 * A market that fails to answer is counted, not fatal: the loans that did
 * arrive are still shown, with a notice that the list may be short.
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchKaminoMarkets, fetchKaminoObligations } from './api';
import { summarizeKaminoObligations, type KaminoPosition } from './positions';

export interface UseKaminoPositionsParams {
  publicKey: string | null;
}

export interface UseKaminoPositionsResult {
  positions: KaminoPosition[];
  loading: boolean;
  /** The whole read failed: nothing to show. */
  error: boolean;
  /** Markets that failed to answer while others did. */
  failedMarkets: number;
  refresh: () => Promise<void>;
}

const queryKey = (publicKey: string) => ['kamino-positions', publicKey] as const;

export async function loadKaminoPositions(publicKey: string) {
  const markets = await fetchKaminoMarkets();
  const answers = await Promise.allSettled(
    markets.map((market) =>
      fetchKaminoObligations(market.lendingMarket, publicKey).then((obligations) => ({
        market,
        obligations,
      }))
    )
  );
  const byMarket = answers.flatMap((answer) =>
    answer.status === 'fulfilled' ? [answer.value] : []
  );
  return {
    positions: summarizeKaminoObligations(byMarket),
    failedMarkets: answers.length - byMarket.length,
  };
}

export function useKaminoPositions({
  publicKey,
}: UseKaminoPositionsParams): UseKaminoPositionsResult {
  const queryClient = useQueryClient();
  const enabled = !!publicKey;
  const query = useQuery({
    queryKey: publicKey ? queryKey(publicKey) : ['kamino-positions', 'disabled'],
    queryFn: () => loadKaminoPositions(publicKey as string),
    enabled,
    staleTime: 60_000,
  });

  const refresh = useCallback(async () => {
    if (!publicKey) return;
    await queryClient.invalidateQueries({ queryKey: queryKey(publicKey) });
  }, [queryClient, publicKey]);

  return {
    positions: query.data?.positions ?? [],
    loading: enabled && query.isPending,
    error: query.isError,
    failedMarkets: query.data?.failedMarkets ?? 0,
    refresh,
  };
}
