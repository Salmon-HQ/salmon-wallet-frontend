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
import { getCoinInfo, getTokenMarketChart } from '../api/services';
import type { CoinInfo } from '../types/price';

export interface MarketChartPoint {
  timestamp: number;
  price: number;
}

export interface UseCoinMarketDataParams {
  coinId: string | undefined;
  /**
   * Token contract address (mint). Fallback chart source for tokens
   * without a CoinGecko coin ID — coin info is still gated by coinId.
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
  // Chart identity: CoinGecko coin ID when available, otherwise the mint
  // (contract-address fallback). Coin info exists only for coinId tokens.
  const chartId = coinId ?? (contractAddress ? `contract:solana:${contractAddress}` : undefined);
  const infoEnabled = enabled && !!coinId;
  const chartEnabled = enabled && !!chartId;
  const queryClient = useQueryClient();

  const results = useQueries({
    queries: [
      {
        queryKey: coinId ? queryKeys.coinInfo({ coinId, currency }) : ['coin-info', 'disabled'],
        queryFn: () => getCoinInfo(coinId as string, currency),
        enabled: infoEnabled,
        staleTime: 60_000,
      },
      {
        queryKey: chartId
          ? queryKeys.marketChart({ coinId: chartId, currency, days })
          : ['market-chart', 'disabled'],
        queryFn: () => getTokenMarketChart({ coingeckoId: coinId, address: contractAddress }, days, currency),
        enabled: chartEnabled,
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
    if (!chartId) return;
    await Promise.all([
      coinId
        ? queryClient.invalidateQueries({ queryKey: queryKeys.coinInfo({ coinId, currency }) })
        : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: queryKeys.marketChart({ coinId: chartId, currency, days }) }),
    ]);
  }, [queryClient, coinId, chartId, currency, days]);

  return {
    coinInfo: infoQuery.data ?? null,
    chartData,
    loading: (infoEnabled && infoQuery.isPending) || (chartEnabled && chartQuery.isPending),
    error,
    refresh,
  };
}
