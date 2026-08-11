import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useAccountsContext,
  useBalance,
  useCurrencyContext,
  getMarketChart,
  getCoinInfo,
  coinInfoToMarketData,
  getBlockchainFromNetworkId,
  PERIOD_TO_DAYS,
  type NetworkId,
  type PriceChartPeriod,
  type PriceDataPoint,
  type CoinInfo,
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
      last24HoursChange: found.priceChange24h !== undefined ? { perc: found.priceChange24h } : undefined,
      tags: found.tags,
      coingeckoId: found.coingeckoId,
      decimals: found.decimals,
    };
  }, [tokens, tokenAddress]);

  // Chart & market data state
  const [chartData, setChartData] = useState<PriceDataPoint[]>([]);
  const [chartPeriod, setChartPeriod] = useState<PriceChartPeriod>('1M');
  const [coinInfo, setCoinInfo] = useState<CoinInfo | null>(null);
  const [marketData, setMarketData] = useState<MarketData | undefined>(undefined);
  const [chartLoading, setChartLoading] = useState(false);

  // Fetch chart data
  useEffect(() => {
    if (!token?.coingeckoId) return;
    let cancelled = false;
    setChartLoading(true);

    const days = PERIOD_TO_DAYS[chartPeriod];
    getMarketChart(token.coingeckoId, days, currency)
      .then((res) => {
        if (cancelled) return;
        if (res?.prices) {
          setChartData(res.prices.map(([ts, price]: [number, number]) => ({ timestamp: ts, price })));
        }
      })
      .catch((e) => console.error('Failed to load chart data:', e))
      .finally(() => { if (!cancelled) setChartLoading(false); });

    return () => { cancelled = true; };
  }, [token?.coingeckoId, chartPeriod, currency]);

  // Fetch coin info (once per token)
  useEffect(() => {
    if (!token?.coingeckoId) return;
    let cancelled = false;

    getCoinInfo(token.coingeckoId, currency)
      .then((info) => {
        if (cancelled || !info) return;
        setCoinInfo(info);
        setMarketData(coinInfoToMarketData(info));
      })
      .catch((e) => console.error('Failed to load coin info:', e));

    return () => { cancelled = true; };
  }, [token?.coingeckoId, currency]);

  const handleBack = useCallback(() => navigate('/home'), [navigate]);
  const handleChartPeriodChange = useCallback((period: PriceChartPeriod) => setChartPeriod(period), []);

  const currentBlockchain = useMemo(() => {
    if (!networkId) return 'solana';
    const parts = networkId.split('-');
    return parts[0] || 'solana';
  }, [networkId]);

  if (!token) {
    // Token not found yet — could be loading or deep link
    return <TokenDetailPage
      token={{ address: tokenAddress || '', name: t('general.loading', 'Loading...'), symbol: '...', uiAmount: 0 }}
      chartData={[]}
      chartPeriod={chartPeriod}
      onChartPeriodChange={handleChartPeriodChange}
      coinInfo={null}
      marketData={undefined}
      loading
      onBack={handleBack}
    />;
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
      loading={chartLoading && chartData.length === 0}
      onBack={handleBack}
    />
  );
}
