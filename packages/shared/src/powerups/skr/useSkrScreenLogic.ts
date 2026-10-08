/**
 * useSkrScreenLogic — the SKR tab on both twins (spec 039): reads the
 * position through the shared staking query and lays it out with `skrView`.
 */
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrencyContext } from '../../contexts/CurrencyContext';
import { useCoinMarketData } from '../../hooks/useCoinMarketData';
import type { PriceChartPeriod } from '../../types';
import type { PriceChartPropsBase } from '../../types/ui/price-chart';
import { PERIOD_TO_DAYS } from '../../utils/price-constants';
import { useSkrStake } from '../../hooks/useStaking';
import type { FactsCardRow } from '../../types/ui/facts-card';
import { skrView } from './skrView';

export interface UseSkrScreenLogicParams {
  publicKey: string;
}

export interface UseSkrScreenLogicResult {
  state: 'loading' | 'error' | 'empty' | 'ready';
  summary: FactsCardRow[];
  history: FactsCardRow[];
  refresh: () => Promise<void>;
  /** SKR's price, for the same chart the token screen draws. */
  chart: Omit<PriceChartPropsBase<never>, 'style'>;
}

// CoinGecko lists SKR as `seeker`.
const SKR_COINGECKO_ID = 'seeker';
const SKR_MINT = 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3';

export function useSkrScreenLogic({ publicKey }: UseSkrScreenLogicParams): UseSkrScreenLogicResult {
  const { t, i18n } = useTranslation();
  const [{ currency }, { formatValue }] = useCurrencyContext();
  const [period, setPeriod] = useState<PriceChartPeriod>('1M');
  const market = useCoinMarketData({
    coinId: SKR_COINGECKO_ID,
    contractAddress: SKR_MINT,
    currency,
    days: PERIOD_TO_DAYS[period],
  });
  const chartData = market.chartData ?? [];
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
          })
        : null,
    [query.data, t, formatValue, i18n.language, now]
  );
  const { refetch } = query;
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const state = view ? (view.empty ? 'empty' : 'ready') : query.isError ? 'error' : 'loading';
  return {
    state,
    summary: view?.summary ?? [],
    history: view?.history ?? [],
    refresh,
    chart: {
      data: chartData,
      selectedPeriod: period,
      onPeriodChange: setPeriod,
      loading: market.chartLoading && chartData.length === 0,
      error: !!market.error && chartData.length === 0,
    },
  };
}
