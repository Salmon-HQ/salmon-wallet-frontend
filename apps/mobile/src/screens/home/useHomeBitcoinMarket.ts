/**
 * Bitcoin's coin info + chart for the Home Portfolio column, via the shared
 * React Query hook — the same one the extension's HomePage and this app's
 * token detail screen use. Bitcoin lives inside Portfolio because it has no
 * asset-detail screen of its own.
 */

import { useMemo } from 'react';
import {
  BLOCKCHAIN_TO_COINGECKO,
  PERIOD_TO_DAYS,
  buildBitcoinToken,
  coinInfoToMarketData,
  useCoinMarketData,
  type PriceChartPeriod,
  type PriceDataPoint,
} from '@salmon/shared';
import type { BlockchainId, MarketData } from '../../components';

interface UseHomeBitcoinMarketOptions {
  currentChain: BlockchainId;
  currentNetworkId: string;
  currency: string;
  chartPeriod: PriceChartPeriod;
  /** The active chain's native amount and total, for the Bitcoin row. */
  nativeAmount: number | undefined;
  usdTotal: number | undefined;
}

export function useHomeBitcoinMarket({
  currentChain,
  currentNetworkId,
  currency,
  chartPeriod,
  nativeAmount,
  usdTotal,
}: UseHomeBitcoinMarketOptions) {
  const bitcoinCoinId = currentChain === 'bitcoin' ? BLOCKCHAIN_TO_COINGECKO.bitcoin : undefined;
  const {
    coinInfo,
    chartData: chartDataRaw,
    chartLoading: dataLoading,
    error: dataError,
  } = useCoinMarketData({
    coinId: bitcoinCoinId,
    currency,
    days: PERIOD_TO_DAYS[chartPeriod],
    enabled: currentChain === 'bitcoin',
    // A test network's coin has no market: the hook returns nothing off
    // mainnet rather than quoting the mainnet asset's price (spec 026).
    networkId: currentNetworkId,
  });
  const chartData: PriceDataPoint[] = chartDataRaw ?? [];
  const chartError = !!dataError && chartData.length === 0;

  // Transform CoinInfo to MarketData for MarketDataCard
  const marketData: MarketData | undefined = useMemo(() => {
    if (!coinInfo) return undefined;
    return coinInfoToMarketData(coinInfo);
  }, [coinInfo]);

  const token = useMemo(
    () => buildBitcoinToken(coinInfo, nativeAmount, usdTotal),
    [coinInfo, nativeAmount, usdTotal]
  );

  return { coinInfo, chartData, dataLoading, chartError, marketData, token };
}

export type HomeBitcoinMarket = ReturnType<typeof useHomeBitcoinMarket>;
