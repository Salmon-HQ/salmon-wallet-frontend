/**
 * useTokenDetail — the chart and coin-info loading spec 019 lifts out of
 * `(tabs)/index.tsx` (the `selectedToken*` effects), so `/token/[id]` and any
 * future consumer share one implementation instead of the route re-deriving
 * it.
 *
 * Behaviour is unchanged from the sheet's: the classic CoinGecko endpoint by
 * `coingeckoId`, the contract-address fallback by mint, and neither resolves
 * when the token carries neither — the chart section and the market/about
 * cards stay hidden rather than showing an error for a token CoinGecko has
 * never heard of.
 *
 * Deps are the token's own `address`/`coingeckoId`, not the `Token` object
 * itself: the caller re-derives `token` from a reactive balance list that
 * gets a fresh array identity on every poll, and depending on the object
 * would re-fire both requests on every poll instead of only when the
 * identity actually changes.
 */
import { useEffect, useState } from 'react';
import {
  coinInfoToMarketData,
  getTokenCoinInfo,
  getTokenMarketChart,
  PERIOD_TO_DAYS,
  useCurrencyContext,
  type CoinInfo,
  type MarketData,
  type PriceChartPeriod,
  type PriceDataPoint,
  type Token,
} from '@salmon/shared';

export interface UseTokenDetailResult {
  chartData: PriceDataPoint[];
  chartPeriod: PriceChartPeriod;
  setChartPeriod: (period: PriceChartPeriod) => void;
  coinInfo: CoinInfo | null;
  marketData: MarketData | undefined;
  loading: boolean;
  chartError: boolean;
}

export function useTokenDetail(token: Token | null): UseTokenDetailResult {
  const [{ currency }] = useCurrencyContext();
  const [chartData, setChartData] = useState<PriceDataPoint[]>([]);
  const [coinInfo, setCoinInfo] = useState<CoinInfo | null>(null);
  const [chartPeriod, setChartPeriod] = useState<PriceChartPeriod>('1M');
  const [loading, setLoading] = useState(false);
  const [chartError, setChartError] = useState(false);

  const address = token?.address;
  const coingeckoId = token?.coingeckoId ?? undefined;

  useEffect(() => {
    const loadChartData = async () => {
      if (!coingeckoId && !address) return;

      setLoading(true);
      setChartError(false);
      try {
        const days = PERIOD_TO_DAYS[chartPeriod];
        const chartResponse = await getTokenMarketChart({ coingeckoId, address }, days, currency);

        if (chartResponse?.prices) {
          const priceData: PriceDataPoint[] = chartResponse.prices.map(([timestamp, price]) => ({
            timestamp,
            price,
          }));
          setChartData(priceData);
        }
      } catch (error) {
        console.error('Failed to load token chart data:', error);
        setChartError(true);
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, [address, coingeckoId, chartPeriod, currency]);

  useEffect(() => {
    const loadCoinInfo = async () => {
      if (!coingeckoId && !address) return;

      try {
        const infoResponse = await getTokenCoinInfo({ coingeckoId, address }, currency);
        if (infoResponse) {
          setCoinInfo(infoResponse);
        }
      } catch (error) {
        console.error('Failed to load token coin info:', error);
      }
    };

    loadCoinInfo();
  }, [address, coingeckoId, currency]);

  return {
    chartData,
    chartPeriod,
    setChartPeriod,
    coinInfo,
    marketData: coinInfo ? coinInfoToMarketData(coinInfo) : undefined,
    loading,
    chartError,
  };
}
