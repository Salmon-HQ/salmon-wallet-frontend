/**
 * MarketDataCard — the "Market data" `Card` of `KeyValueRow`s.
 *
 * Lifted out of `token/[id].tsx` (spec 019 D2) so Home's Bitcoin column can
 * render the same card instead of the legacy `BlurContainer`-based
 * `TokenMarketData`. Kit-composed only; no `data` renders nothing, same as
 * the route did inline.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  fontFamilyNative,
  fontSize,
  formatLargeNumber,
  lineHeight,
  s,
  spacing,
  useCurrencyContext,
  type Semantic,
} from '@salmon/shared';

import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { SkeletonRow } from '../Skeleton';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { MarketData } from './types';

export interface MarketDataCardProps {
  data: MarketData | undefined;
  symbol?: string;
  loading?: boolean;
  testID?: string;
}

export function MarketDataCard({
  data,
  symbol,
  loading = false,
  testID = 'token-detail-market-data',
}: MarketDataCardProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const [, { formatValue }] = useCurrencyContext();

  if (loading) {
    return <SkeletonRow testID={testID} lines={1} count={5} accessibilityLabel={t('token.marketData.title', 'Market data')} />;
  }

  if (!data) return null;

  return (
    <Card padding="lg" gap={spacing.md} testID={testID}>
      <Text style={styles.cardTitle}>{t('token.marketData.title', 'Market data')}</Text>
      {data.marketCap !== undefined && (
        <KeyValueRow
          label={t('token.marketData.marketCap', 'Market Cap')}
          value={formatValue(data.marketCap)}
        />
      )}
      {data.volume24h !== undefined && (
        <KeyValueRow
          label={t('token.marketData.volume24h', '24h Volume')}
          value={formatValue(data.volume24h)}
        />
      )}
      {data.circulatingSupply !== undefined && (
        <KeyValueRow
          label={t('token.marketData.circulatingSupply', 'Circulating Supply')}
          value={`${formatLargeNumber(data.circulatingSupply)}${symbol ? ` ${symbol}` : ''}`}
        />
      )}
      {data.totalSupply != null && (
        <KeyValueRow
          label={t('token.marketData.totalSupply', 'Total Supply')}
          value={`${formatLargeNumber(data.totalSupply)}${symbol ? ` ${symbol}` : ''}`}
        />
      )}
      {data.ath !== undefined && (
        <KeyValueRow
          label={t('token.marketData.allTimeHigh', 'All-Time High')}
          value={formatValue(data.ath)}
        />
      )}
    </Card>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    cardTitle: {
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.bodyLg),
      lineHeight: s(fontSize.bodyLg) * lineHeight.snug,
      color: t.text.primary,
    },
  });
