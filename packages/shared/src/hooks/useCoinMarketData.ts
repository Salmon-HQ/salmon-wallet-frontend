/**
 * useCoinMarketData
 *
 * Shared React Query hook that fetches CoinGecko coin info + market chart in
 * parallel. Replaces duplicated `useState + useEffect` blocks in web/extension
 * HomePage Bitcoin and selected-token detail flows.
 */

import { useCallback, useMemo } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
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
  /**
   * Either half is still on its first fetch.
   *
   * @deprecated Read `infoLoading` and `chartLoading` instead. The period
   * selector only re-keys the chart query, so a combined flag turns a chart
   * refresh into a whole-screen skeleton — the bug this pair exists to fix.
   */
  loading: boolean;
  /** Coin info has never resolved for this token+currency. */
  infoLoading: boolean;
  /** No price series has ever resolved for this token+currency. */
  chartLoading: boolean;
  /**
   * The series in hand belongs to the previously selected `days` while the
   * newly selected one is in flight (react-query `keepPreviousData`).
   */
  chartPending: boolean;
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

  // Two separate `useQuery` calls rather than one `useQueries`: only the chart
  // takes `placeholderData`, and `useQueries` builds its observers from a fresh
  // array on every render, so `keepPreviousData` there has no previous result
  // to hand back and the series comes out empty anyway.
  const infoQuery = useQuery({
    queryKey: tokenId
      ? queryKeys.coinInfo({ coinId: tokenId, currency })
      : ['coin-info', 'disabled'],
    queryFn: () => getTokenCoinInfo({ coingeckoId: coinId, address: contractAddress }, currency),
    enabled: isEnabled,
    staleTime: 60_000,
  });

  const chartQuery = useQuery({
    queryKey: tokenId
      ? queryKeys.marketChart({ coinId: tokenId, currency, days })
      : ['market-chart', 'disabled'],
    queryFn: () =>
      getTokenMarketChart({ coingeckoId: coinId, address: contractAddress }, days, currency),
    enabled: isEnabled,
    staleTime: 60_000,
    // `days` is part of this key, so every period press is a cache miss.
    // Handing back the previous period's series keeps a drawn chart on screen
    // while the new one arrives, instead of a skeleton. The chart is one
    // request per period by necessity — the endpoint is `?days=N` and its
    // granularity changes with N (5-minute points at days=1, hourly at 7-90,
    // daily at 365), so no range can be derived from another and there is
    // nothing to batch.
    placeholderData: keepPreviousData,
  });

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
    infoLoading: isEnabled && infoQuery.isPending,
    chartLoading: isEnabled && chartQuery.isPending,
    chartPending: isEnabled && chartQuery.isPlaceholderData,
    error,
    refresh,
  };
}
