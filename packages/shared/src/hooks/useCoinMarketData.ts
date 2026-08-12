/**
 * useCoinMarketData
 *
 * Shared React Query hook that fetches CoinGecko coin info + market chart in
 * parallel. Replaces duplicated `useState + useEffect` blocks in web/extension
 * HomePage Bitcoin and selected-token detail flows.
 */

import { useCallback, useMemo } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/keys';
import { getTokenCoinInfo, getTokenMarketChart } from '../api/services';
import type { CoinInfo } from '../types/price';

export interface MarketChartPoint {
  timestamp: number;
  price: number;
}

export interface UseCoinMarketDataParams {
  coinId: string | undefined;
  /**
   * Token contract address (mint). Fallback chart and coin-info source
   * for tokens without a CoinGecko coin ID.
   */
  contractAddress?: string;
  currency: string;
  days: 1 | 7 | 30 | 90 | 365;
  enabled?: boolean;
}

export interface UseCoinMarketDataResult {
  coinInfo: CoinInfo | null;
  chartData: MarketChartPoint[] | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCoinMarketData(params: UseCoinMarketDataParams): UseCoinMarketDataResult {
  const { coinId, contractAddress, currency, days, enabled = true } = params;
  // Token identity: CoinGecko coin ID when available, otherwise the mint
  // (contract-address fallback for both chart and coin info).
  const tokenId = coinId ?? (contractAddress ? `contract:solana:${contractAddress}` : undefined);
  const isEnabled = enabled && !!tokenId;
  const queryClient = useQueryClient();

  const results = useQueries({
    queries: [
      {
        queryKey: tokenId
          ? queryKeys.coinInfo({ coinId: tokenId, currency })
          : ['coin-info', 'disabled'],
        queryFn: () =>
          getTokenCoinInfo({ coingeckoId: coinId, address: contractAddress }, currency),
        enabled: isEnabled,
        staleTime: 60_000,
      },
      {
        queryKey: tokenId
          ? queryKeys.marketChart({ coinId: tokenId, currency, days })
          : ['market-chart', 'disabled'],
        queryFn: () =>
          getTokenMarketChart({ coingeckoId: coinId, address: contractAddress }, days, currency),
        enabled: isEnabled,
        staleTime: 60_000,
      },
    ],
  });

  const [infoQuery, chartQuery] = results;

  const chartData = useMemo<MarketChartPoint[] | null>(() => {
    const data = chartQuery.data;
    if (!data?.prices) return null;
    return data.prices.map(([timestamp, price]) => ({ timestamp, price }));
  }, [chartQuery.data]);

  const errorObj = infoQuery.error ?? chartQuery.error;
  const error = errorObj ? (errorObj instanceof Error ? errorObj.message : String(errorObj)) : null;

  const refresh = useCallback(async () => {
    if (!tokenId) return;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.coinInfo({ coinId: tokenId, currency }),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.marketChart({ coinId: tokenId, currency, days }),
      }),
    ]);
  }, [queryClient, tokenId, currency, days]);

  return {
    coinInfo: infoQuery.data ?? null,
    chartData,
    loading: isEnabled && (infoQuery.isPending || chartQuery.isPending),
    error,
    refresh,
  };
}
