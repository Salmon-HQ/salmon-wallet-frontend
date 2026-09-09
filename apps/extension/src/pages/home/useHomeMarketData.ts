/**
 * The two coin-market reads Home makes: Bitcoin's (inside Portfolio, since
 * Bitcoin has no asset-detail screen of its own) and the selected token's
 * (behind the token detail page). Both go through the shared React Query hook;
 * this only shapes the results for the views.
 */

import { useMemo } from 'react';
import {
  BLOCKCHAIN_TO_COINGECKO,
  PERIOD_TO_DAYS,
  buildBitcoinToken,
  coinInfoToMarketData,
  useCoinMarketData,
  type BlockchainId,
  type MarketData,
  type PriceChartPeriod,
  type PriceDataPoint,
  type Token,
} from '@salmon/shared';

interface UseHomeMarketDataOptions {
  currentChain: BlockchainId;
  currency: string;
  /** The active chain's native amount and total, for the Bitcoin row. */
  nativeAmount: number | undefined;
  usdTotal: number | undefined;
  bitcoinChartPeriod: PriceChartPeriod;
  selectedToken: Token | null;
  selectedTokenChartPeriod: PriceChartPeriod;
  /** True while the token detail page is the one on screen. */
  tokenDetailOpen: boolean;
}

export function useHomeMarketData({
  currentChain,
  currency,
  nativeAmount,
  usdTotal,
  bitcoinChartPeriod,
  selectedToken,
  selectedTokenChartPeriod,
  tokenDetailOpen,
}: UseHomeMarketDataOptions) {
  // Bitcoin coin info + chart via shared React Query hook
  const bitcoinCoinId = currentChain === 'bitcoin' ? BLOCKCHAIN_TO_COINGECKO.bitcoin : undefined;
  const {
    coinInfo: bitcoinCoinInfo,
    chartData: bitcoinChartDataRaw,
    infoLoading: bitcoinInfoLoading,
    chartLoading: bitcoinChartLoading,
    chartPending: bitcoinChartPending,
    error: bitcoinDataError,
  } = useCoinMarketData({
    coinId: bitcoinCoinId,
    currency,
    days: PERIOD_TO_DAYS[bitcoinChartPeriod],
    enabled: currentChain === 'bitcoin',
  });
  const bitcoinChartData: PriceDataPoint[] = bitcoinChartDataRaw ?? [];

  // Transform CoinInfo to MarketData for TokenMarketData component
  const bitcoinMarketData: MarketData | undefined = useMemo(() => {
    if (!bitcoinCoinInfo) return undefined;
    return coinInfoToMarketData(bitcoinCoinInfo);
  }, [bitcoinCoinInfo]);

  const bitcoinToken = useMemo(
    () => buildBitcoinToken(bitcoinCoinInfo, nativeAmount, usdTotal),
    [bitcoinCoinInfo, nativeAmount, usdTotal]
  );

  // Selected token chart + coin info via shared React Query hook.
  // Tokens without a coingeckoId fall back to the contract-address chart
  // endpoint via their mint (handled inside the hook/service).
  const selectedTokenCoinId = selectedToken?.coingeckoId ?? undefined;
  const {
    coinInfo: selectedTokenCoinInfo,
    chartData: selectedTokenChartDataRaw,
    infoLoading: selectedTokenInfoLoading,
    chartLoading: selectedTokenChartLoading,
    chartPending: selectedTokenChartPending,
    error: selectedTokenError,
  } = useCoinMarketData({
    coinId: selectedTokenCoinId,
    contractAddress: selectedToken?.address,
    currency,
    days: PERIOD_TO_DAYS[selectedTokenChartPeriod],
    enabled: !!selectedToken && tokenDetailOpen,
  });
  const selectedTokenChartData: PriceDataPoint[] = selectedTokenChartDataRaw ?? [];
  const selectedTokenMarketData: MarketData | undefined = useMemo(
    () => (selectedTokenCoinInfo ? coinInfoToMarketData(selectedTokenCoinInfo) : undefined),
    [selectedTokenCoinInfo]
  );

  return {
    bitcoin: {
      coinInfo: bitcoinCoinInfo,
      chartData: bitcoinChartData,
      infoLoading: bitcoinInfoLoading,
      chartLoading: bitcoinChartLoading,
      chartPending: bitcoinChartPending,
      error: bitcoinDataError,
      marketData: bitcoinMarketData,
      token: bitcoinToken,
    },
    selectedToken: {
      coinInfo: selectedTokenCoinInfo,
      chartData: selectedTokenChartData,
      infoLoading: selectedTokenInfoLoading,
      chartLoading: selectedTokenChartLoading,
      chartPending: selectedTokenChartPending,
      error: selectedTokenError,
      marketData: selectedTokenMarketData,
    },
  };
}

export type HomeBitcoinMarketData = ReturnType<typeof useHomeMarketData>['bitcoin'];
