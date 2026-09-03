/**
 * TokenMarketData — the "Market data" `Card` of `KeyValueRow`s, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/TokenDetail/MarketDataCard.tsx`,
 * on the same `TokenMarketDataPropsBase`. Kit-composed only; no `data`
 * renders nothing, `loading` renders the skeleton.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  fontFamily,
  fontSize,
  fontWeight,
  formatLargeNumber,
  lineHeight,
  spacing,
  useCurrencyContext,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { SkeletonRow } from '../SkeletonRow';
import type { TokenMarketDataProps } from './types';

export function TokenMarketData({
  data,
  symbol,
  loading = false,
  testID = 'token-detail-market-data',
  style,
  className,
}: TokenMarketDataProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const [, { formatValue }] = useCurrencyContext();

  if (loading) {
    return (
      <SkeletonRow
        testID={testID}
        lines={1}
        count={5}
        accessibilityLabel={t('token.marketData.title', 'Market data')}
        style={style}
        className={className}
      />
    );
  }

  if (!data) return null;

  const withSymbol = (amount: number) =>
    `${formatLargeNumber(amount)}${symbol ? ` ${symbol}` : ''}`;

  return (
    <Card padding="lg" gap={spacing.md} testID={testID} style={style} className={className}>
      <span style={titleStyle(semantic)}>{t('token.marketData.title', 'Market data')}</span>
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
          value={withSymbol(data.circulatingSupply)}
        />
      )}
      {data.totalSupply != null && (
        <KeyValueRow
          label={t('token.marketData.totalSupply', 'Total Supply')}
          value={withSymbol(data.totalSupply)}
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

const titleStyle = (t: Semantic): React.CSSProperties => ({
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.bold,
  fontSize: fontSize.bodyLg,
  lineHeight: `${fontSize.bodyLg * lineHeight.snug}px`,
  color: t.text.primary,
});
