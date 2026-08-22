import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useAccountsContext,
  useBalance,
  useCurrencyContext,
  useCoinMarketData,
  coinInfoToMarketData,
  getBlockchainFromNetworkId,
  PERIOD_TO_DAYS,
  type NetworkId,
  type PriceChartPeriod,
  type PriceDataPoint,
  type MarketData,
  type Token,
} from '@salmon/shared';
import { TokenDetailPage } from '@salmon/ui';

export function TokenDetailRoute(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: tokenAddress } = useParams<{ id: string }>();

  const [state] = useAccountsContext();
  const { activeBlockchainAccount, networkId } = state;
  const [{ currency }] = useCurrencyContext();

  // Balance hook — gives us the token list
  const { tokens } = useBalance({
    account: activeBlockchainAccount,
    networkId: networkId as NetworkId | undefined,
    skip: !activeBlockchainAccount,
  });

  // Find token by address
  const token: Token | undefined = useMemo(() => {
    if (!tokenAddress) return undefined;
    const found = tokens.find((t) => t.address === tokenAddress);
    if (!found) return undefined;
    return {
      address: found.address,
      name: found.name,
      symbol: found.symbol,
      logo: found.logo ?? undefined,
      price: found.price,
      uiAmount: found.uiAmount,
      usdBalance: found.usdBalance,
      last24HoursChange:
        found.priceChange24h !== undefined ? { perc: found.priceChange24h } : undefined,
      tags: found.tags,
      coingeckoId: found.coingeckoId,
      decimals: found.decimals,
    };
  }, [tokens, tokenAddress]);

  const [chartPeriod, setChartPeriod] = useState<PriceChartPeriod>('1M');

  // Same shared hook the extension and the Bitcoin tab use: one cache, one
  // definition of what "loading" means for the chart versus for the info
  // sections. This route used to hand-roll the two fetches with
  // useState/useEffect, which is how a period change here blanked the whole
  // page while the extension's Bitcoin tab did not.
  const {
    coinInfo,
    chartData: chartDataRaw,
    infoLoading,
    chartLoading,
    chartPending,
    error: chartFetchError,
  } = useCoinMarketData({
    coinId: token?.coingeckoId ?? undefined,
    contractAddress: token?.address,
    currency,
    days: PERIOD_TO_DAYS[chartPeriod],
    enabled: !!token,
  });
  const chartData: PriceDataPoint[] = chartDataRaw ?? [];
  const marketData: MarketData | undefined = useMemo(
    () => (coinInfo ? coinInfoToMarketData(coinInfo) : undefined),
    [coinInfo]
  );

  const handleBack = useCallback(() => navigate('/home'), [navigate]);
  const handleChartPeriodChange = useCallback(
    (period: PriceChartPeriod) => setChartPeriod(period),
    []
  );

  const currentBlockchain = useMemo(() => {
    if (!networkId) return 'solana';
    const parts = networkId.split('-');
    return parts[0] || 'solana';
  }, [networkId]);

  if (!token) {
    // Token not found yet — could be loading or deep link
    return (
      <TokenDetailPage
        token={{
          address: tokenAddress || '',
          name: t('general.loading', 'Loading...'),
          symbol: '...',
          uiAmount: 0,
        }}
        chartData={[]}
        chartPeriod={chartPeriod}
        onChartPeriodChange={handleChartPeriodChange}
        coinInfo={null}
        marketData={undefined}
        chartLoading
        infoLoading
        onBack={handleBack}
      />
    );
  }

  return (
    <TokenDetailPage
      token={token}
      blockchain={getBlockchainFromNetworkId(currentBlockchain)}
      chartData={chartData}
      chartPeriod={chartPeriod}
      onChartPeriodChange={handleChartPeriodChange}
      coinInfo={coinInfo}
      marketData={marketData}
      chartLoading={chartLoading && chartData.length === 0}
      chartPending={chartPending}
      infoLoading={infoLoading && !coinInfo}
      chartError={!!chartFetchError && chartData.length === 0}
      onBack={handleBack}
    />
  );
}
