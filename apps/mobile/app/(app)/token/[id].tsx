/**
 * Token detail — CORE 02 (spec 019).
 *
 * Was `TokenInformationSheet`, a bottom sheet; it is a screen now, because
 * DESIGN.md §Sheets' state rule reserves a sheet for one state, and this
 * surface already had more than one before the redesign asked for anything
 * new — a period selector that redraws the chart, an expandable "About", a
 * pressable copy row. Portfolio's row tap pushes here with the token's mint
 * as `id`; unresolved (unknown mint, or the token list not loaded yet with
 * no account to load it from) bounces back to Home rather than rendering an
 * empty screen.
 *
 * Bitcoin has no detail screen (owner ruling, spec 019 D6): the Portfolio row
 * for it is not pressable (see `(tabs)/index.tsx`), and a `bitcoin` id typed
 * into this route resolves to nothing here either — the active account's
 * token list is Solana's, so the redirect below covers it for free.
 *
 * DEFERRED to a later spec (spec 019 D4/D5, not ruled yet): Send/Receive
 * actions on this screen, and a per-token "Recent activity" section.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  coinInfoToMarketData,
  fontFamilyNative,
  fontSize,
  formatLargeNumber,
  formatPercentage,
  getShortAddress,
  hiddenValue,
  lineHeight,
  PERIOD_TO_DAYS,
  s,
  spacing,
  tabularNums,
  useAccountsContext,
  useBalance,
  useCoinMarketData,
  useCurrencyContext,
  vs,
  type NetworkId,
  type PriceChartPeriod,
  type Token,
  type Semantic,
} from '@salmon/shared';
import {
  AboutCard,
  DepthBackground,
  KeyValueRow,
  MarketDataCard,
  PriceChart,
  ScalesBackground,
  ScreenHeader,
  TokenLogo,
} from '../../../src/components';
import { useThemedStyles } from '../../../src/theme/useThemedStyles';

const TOKEN_LOGO_SIZE = 42;

export default function TokenDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useThemedStyles(stylesFor);
  const [{ currency }, { formatValue }] = useCurrencyContext();

  const [accountState] = useAccountsContext();
  const { ready, activeAccount, activeBlockchainAccount, networkId } = accountState;

  const {
    tokens,
    state: balanceState,
    hiddenBalance,
  } = useBalance({
    account: activeBlockchainAccount,
    networkId: (networkId ?? undefined) as NetworkId | undefined,
    skip: !ready || !activeBlockchainAccount,
  });

  const token: Token | null = useMemo(() => {
    const item = tokens.find((entry) => entry.address === id);
    if (!item) return null;
    return {
      address: item.address,
      name: item.name,
      symbol: item.symbol,
      logo: item.logo,
      price: item.price,
      uiAmount: item.uiAmount,
      usdBalance: item.usdBalance ?? null,
      coingeckoId: item.coingeckoId,
      tags: item.tags,
    };
  }, [tokens, id]);

  const [chartPeriod, setChartPeriod] = useState<PriceChartPeriod>('1M');

  // Same shared hook web/extension use for their token-detail and Bitcoin
  // columns (WP4) — retires this screen's own useState+useEffect fetch pair.
  // `enabled` falls out of `useCoinMarketData` itself: it derives its own
  // token identity from coinId/contractAddress and only fires when one of
  // them is set, so a token with neither never requests.
  const {
    coinInfo,
    chartData: chartDataRaw,
    chartLoading,
    error: chartFetchError,
  } = useCoinMarketData({
    coinId: token?.coingeckoId ?? undefined,
    contractAddress: token?.address,
    currency,
    days: PERIOD_TO_DAYS[chartPeriod],
  });
  const chartData = useMemo(() => chartDataRaw ?? [], [chartDataRaw]);
  const marketData = useMemo(
    () => (coinInfo ? coinInfoToMarketData(coinInfo) : undefined),
    [coinInfo]
  );
  const loading = chartLoading && chartData.length === 0;
  const chartError = !!chartFetchError && chartData.length === 0;

  const website = coinInfo?.links?.homepage;

  // The chart's own first/last point, not the wallet's 24h figure — the
  // period selector redraws the chart, and the row under it answers "what did
  // THIS window do", the same question the chart itself is answering.
  const periodChangePercent = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].price;
    const last = chartData[chartData.length - 1].price;
    if (!first) return null;
    return ((last - first) / first) * 100;
  }, [chartData]);

  if (!ready || (balanceState === 'loading' && !token)) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <DepthBackground />
        <ScalesBackground variant="deepField" />
      </SafeAreaView>
    );
  }

  if (!activeAccount || !activeBlockchainAccount || !token) {
    return <Redirect href="/" />;
  }

  const numericAmount =
    typeof token.uiAmount === 'string' ? parseFloat(token.uiAmount) : token.uiAmount;
  const displayAmount = hiddenBalance
    ? hiddenValue
    : `${formatLargeNumber(numericAmount)} ${token.symbol}`;
  const displayFiat = hiddenBalance
    ? hiddenValue
    : token.usdBalance != null
      ? formatValue(token.usdBalance)
      : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Pushed over the tab shell, so it does not inherit the shell's water —
          the same two layers every non-Home screen mounts for itself. */}
      <DepthBackground />
      <ScalesBackground variant="deepField" />

      <ScreenHeader onBack={() => router.back()} title={token.name} subtitle={token.symbol} />

      <ScrollView
        testID="token-detail-screen"
        style={styles.body}
        contentContainerStyle={[styles.content, { paddingBottom: vs(spacing.screenGutter) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Asset balance block — CORE 02: bubble + name, amount, fiat. */}
        <View style={styles.balanceBlock} testID="token-detail-balance">
          <View style={styles.balanceHeader}>
            <TokenLogo uri={token.logo} symbol={token.symbol} size={TOKEN_LOGO_SIZE} />
            <Text style={styles.tokenName} numberOfLines={1}>
              {token.name}
            </Text>
          </View>
          <Text style={styles.amount} testID="token-detail-amount">
            {displayAmount}
          </Text>
          {displayFiat != null && (
            <Text style={styles.fiat} testID="token-detail-fiat">
              {displayFiat}
            </Text>
          )}
        </View>

        {/* Performance — current price, the chart with its own period
            selector (kept per the spec 019 D1 ruling), and the selected
            period's own change. No card around it (owner, 2026-09-01): the
            curve runs off the left screen edge and stops a gutter short of
            the right with its pulsing endpoint, the way Home's Bitcoin column
            draws it; a card would clip both. */}
        <View style={styles.performance} testID="token-detail-performance">
          <KeyValueRow
            label={t('token.detail.currentPrice', 'Current price')}
            value={token.price != null ? formatValue(token.price) : '—'}
          />
          {(loading || chartData.length > 0 || chartError) && (
            <PriceChart
              data={chartData}
              selectedPeriod={chartPeriod}
              onPeriodChange={setChartPeriod}
              loading={loading}
              error={chartError}
              bleed
            />
          )}
          {periodChangePercent != null && (
            <KeyValueRow
              testID="token-detail-period-change"
              label={t('token.detail.periodChange', '{{period}} change', {
                period: chartPeriod,
              })}
              value={formatPercentage(periodChangePercent)}
              valueTone={periodChangePercent >= 0 ? 'success' : 'danger'}
            />
          )}
        </View>

        {/* Market data — spec 019 D2 ruling: kept as a Card of KeyValueRows,
            shared with Home's Bitcoin column. */}
        <MarketDataCard data={marketData} symbol={token.symbol} />

        {/* About — spec 019 D3 ruling: description, contract address copy
            row and website link, kept as today, shared with Home's Bitcoin
            column. The contract row has no data dependency of its own (the
            mint is always known), so the card always renders even for a
            token CoinGecko has nothing to say about. */}
        <AboutCard
          description={coinInfo?.description}
          contractAddress={token.address}
          contractAddressShort={getShortAddress(token.address, 6) ?? token.address}
          website={website}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    body: {
      flex: 1,
    },
    content: {
      paddingHorizontal: s(spacing.screenGutter),
      gap: vs(spacing.screenGutter),
    },
    balanceBlock: {
      gap: vs(spacing.sm),
    },
    balanceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.md),
    },
    tokenName: {
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.heading),
      lineHeight: s(fontSize.heading) * lineHeight.snug,
      color: t.text.primary,
      flexShrink: 1,
    },
    amount: {
      ...TABULAR,
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.display),
      lineHeight: s(fontSize.display) * lineHeight.snug,
      color: t.text.primary,
    },
    fiat: {
      ...TABULAR,
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.snug,
      color: t.text.secondary,
    },
    // The block's own anatomy: rows and chart at the in-component step.
    performance: {
      gap: vs(spacing.md),
    },
  });
