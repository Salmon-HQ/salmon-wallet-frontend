/**
 * useSkrScreenLogic — the SKR tab on both twins (spec 040): reads the
 * position through the shared staking query and SKR's market data, and lays
 * them out with `skrView`; `skrBlocks` turns the result into the tab.
 */
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrencyContext } from '../../contexts/CurrencyContext';
import { useCoinMarketData } from '../../hooks/useCoinMarketData';
import { useSkrStake } from '../../hooks/useStaking';
import type { PriceChartPeriod } from '../../types';
import { formatFiatPrice } from '../../utils/currencyFormatting';
import { formatPercentage } from '../../utils/formatting';
import { PERIOD_TO_DAYS } from '../../utils/price-constants';
import type { SkrMarket, SkrScreenInput } from './skrBlocks';
import { skrView, type SkrView } from './skrView';

export interface UseSkrScreenLogicParams {
  publicKey: string;
}

export interface UseSkrScreenLogicResult extends SkrScreenInput {
  view: SkrView | null;
  market: SkrMarket;
}

// CoinGecko lists SKR as `seeker`.
const SKR_COINGECKO_ID = 'seeker';
const SKR_MINT = 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3';

export function useSkrScreenLogic({ publicKey }: UseSkrScreenLogicParams): UseSkrScreenLogicResult {
  const { t, i18n } = useTranslation();
  const [{ currency }, { formatValue }] = useCurrencyContext();
  const [period, setPeriod] = useState<PriceChartPeriod>('1M');
  const coin = useCoinMarketData({
    coinId: SKR_COINGECKO_ID,
    contractAddress: SKR_MINT,
    currency,
    days: PERIOD_TO_DAYS[period],
  });
  const chartData = useMemo(() => coin.chartData ?? [], [coin.chartData]);
  const query = useSkrStake(publicKey);
  // Read once per mount: "staked for N days" does not need to tick.
  const [now] = useState(Date.now);
  const view = useMemo(
    () =>
      query.data
        ? skrView(query.data, {
            t,
            formatValue,
            formatDate: (ms) => new Date(ms).toLocaleDateString(i18n.language),
            now,
            locale: i18n.language,
          })
        : null,
    [query.data, t, formatValue, i18n.language, now]
  );

  const market = useMemo((): SkrMarket => {
    const data = coin.coinInfo?.marketData;
    const first = chartData[0]?.price;
    const last = chartData[chartData.length - 1]?.price;
    const change = first && last !== undefined ? ((last - first) / first) * 100 : null;
    return {
      ...(coin.coinInfo?.image ? { logo: coin.coinInfo.image } : {}),
      // The coin info is already in the user's currency.
      price:
        data?.currentPrice === undefined
          ? null
          : formatFiatPrice(data.currentPrice, currency, 1, i18n.language),
      change:
        change === null
          ? null
          : {
              label: `${formatPercentage(change, i18n.language)} · ${period}`,
              tone: change < 0 ? 'negative' : 'positive',
            },
      totalSupply: data?.totalSupply ?? null,
      circulatingSupply: data?.circulatingSupply ?? null,
    };
  }, [coin.coinInfo, chartData, currency, i18n.language, period]);

  const { refetch } = query;
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const state = view ? (view.empty ? 'empty' : 'ready') : query.isError ? 'error' : 'loading';
  return {
    state,
    view,
    market,
    refresh,
    chart: {
      data: chartData,
      selectedPeriod: period,
      onPeriodChange: setPeriod,
      loading: coin.chartLoading && chartData.length === 0,
      error: !!coin.error && chartData.length === 0,
    },
  };
}
