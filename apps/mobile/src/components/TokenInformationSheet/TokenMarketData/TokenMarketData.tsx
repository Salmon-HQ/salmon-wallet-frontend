import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import { ContentLoader, Rect } from '@salmon/shared';
import {
  colors,
  fontFamilyNative,
  fontSize,
  ms,
  vs,
  s,
  formatLargeNumber,
  formatPercentageCompact,
  formatDateString,
  useCurrencyContext,
  borderRadius,
  spacing,
} from '@salmon/shared';
import { BlurContainer } from '../../BlurContainer';
import type { TokenMarketDataProps } from './types';

/**
 * Single market data row component (label left, value right)
 */
const MarketDataRow: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
}> = ({ label, value, valueColor }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
  </View>
);

/**
 * TokenMarketData component for displaying token market statistics
 *
 * Features:
 * - Glassmorphism container
 * - Grid layout with market stats
 * - Loading skeleton state
 * - Formatted numbers (1.5B, 2.3M, etc.)
 *
 * @example
 * ```tsx
 * <TokenMarketData
 *   data={{
 *     marketCap: 50000000000,
 *     volume24h: 1500000000,
 *     circulatingSupply: 400000000,
 *     totalSupply: 500000000,
 *     ath: 260,
 *     athChangePercentage: -50,
 *   }}
 *   symbol="SOL"
 * />
 * ```
 */
export const TokenMarketData: React.FC<TokenMarketDataProps> = ({
  data,
  symbol,
  title,
  loading = false,
  style,
}) => {
  const { t } = useTranslation();
  const [, { formatLarge }] = useCurrencyContext();
  const resolvedTitle = title ?? t('token.marketData.title', 'Info');
  if (loading) {
    return (
      <BlurContainer style={[styles.glassWrapper, style]}>
        <View style={styles.container}>
          <ContentLoader
            speed={1.5}
            width="100%"
            height={136}
            backgroundColor={colors.skeleton.base}
            foregroundColor={colors.skeleton.highlight}
          >
            {/* Title — ms(14) height, marginBottom vs(8) */}
            <Rect x="0" y="0" rx="4" ry="4" width="40" height="14" />
            {/* Row 1 — y = 14 + 8 = 22, row height 13, gap vs(11) */}
            <Rect x="0" y="22" rx="4" ry="4" width="80" height="13" />
            <Rect x="80%" y="22" rx="4" ry="4" width="20%" height="13" />
            {/* Row 2 — y = 22 + 13 + 11 = 46 */}
            <Rect x="0" y="46" rx="4" ry="4" width="60" height="13" />
            <Rect x="80%" y="46" rx="4" ry="4" width="20%" height="13" />
            {/* Row 3 — y = 46 + 13 + 11 = 70 */}
            <Rect x="0" y="70" rx="4" ry="4" width="90" height="13" />
            <Rect x="80%" y="70" rx="4" ry="4" width="20%" height="13" />
            {/* Row 4 — y = 70 + 13 + 11 = 94 */}
            <Rect x="0" y="94" rx="4" ry="4" width="100" height="13" />
            <Rect x="80%" y="94" rx="4" ry="4" width="20%" height="13" />
            {/* Row 5 — y = 94 + 13 + 11 = 118 */}
            <Rect x="0" y="118" rx="4" ry="4" width="120" height="13" />
            <Rect x="80%" y="118" rx="4" ry="4" width="20%" height="13" />
          </ContentLoader>
        </View>
      </BlurContainer>
    );
  }

  if (!data) {
    return null;
  }

  const hasData =
    data.marketCap !== undefined ||
    data.volume24h !== undefined ||
    data.circulatingSupply !== undefined ||
    data.totalSupply !== undefined ||
    data.maxSupply !== undefined ||
    data.ath !== undefined ||
    data.atl !== undefined;

  if (!hasData) {
    return null;
  }

  // Determine color for ATH change
  const athChangeColor =
    data.athChangePercentage !== undefined
      ? data.athChangePercentage >= 0
        ? colors.change.positive
        : colors.change.negative
      : undefined;

  // Determine color for ATL change
  const atlChangeColor =
    data.atlChangePercentage !== undefined
      ? data.atlChangePercentage >= 0
        ? colors.change.positive
        : colors.change.negative
      : undefined;

  return (
    <BlurContainer style={[styles.glassWrapper, style]}>
      <View style={styles.container}>
        <Text style={styles.title}>{resolvedTitle}</Text>

        <View style={styles.rowsContainer}>
          {/* Market Cap */}
          {data.marketCap !== undefined && (
            <MarketDataRow
              label={t('token.marketData.marketCap', 'Market Cap')}
              value={formatLarge(data.marketCap)}
            />
          )}

          {/* Market Cap Rank */}
          {data.marketCapRank !== undefined && data.marketCapRank !== null && (
            <MarketDataRow
              label={t('token.marketData.rank', 'Rank')}
              value={`#${data.marketCapRank}`}
            />
          )}

          {/* 24h Volume */}
          {data.volume24h !== undefined && (
            <MarketDataRow
              label={t('token.marketData.volume24h', '24h Volume')}
              value={formatLarge(data.volume24h)}
            />
          )}

          {/* 24h High */}
          {data.high24h !== undefined && (
            <MarketDataRow
              label={t('token.marketData.high24h', '24h High')}
              value={formatLarge(data.high24h)}
            />
          )}

          {/* 24h Low */}
          {data.low24h !== undefined && (
            <MarketDataRow
              label={t('token.marketData.low24h', '24h Low')}
              value={formatLarge(data.low24h)}
            />
          )}

          {/* Circulating Supply */}
          {data.circulatingSupply !== undefined && (
            <MarketDataRow
              label={t('token.marketData.circulatingSupply', 'Circulating Supply')}
              value={`${formatLargeNumber(data.circulatingSupply)}${symbol ? ` ${symbol}` : ''}`}
            />
          )}

          {/* Total Supply */}
          {data.totalSupply !== undefined && data.totalSupply !== null && (
            <MarketDataRow
              label={t('token.marketData.totalSupply', 'Total Supply')}
              value={`${formatLargeNumber(data.totalSupply)}${symbol ? ` ${symbol}` : ''}`}
            />
          )}

          {/* Max Supply */}
          {data.maxSupply !== undefined && data.maxSupply !== null && (
            <MarketDataRow
              label={t('token.marketData.maxSupply', 'Max Supply')}
              value={`${formatLargeNumber(data.maxSupply)}${symbol ? ` ${symbol}` : ''}`}
            />
          )}

          {/* All-Time High */}
          {data.ath !== undefined && (
            <MarketDataRow
              label={t('token.marketData.allTimeHigh', 'All-Time High')}
              value={formatLarge(data.ath)}
            />
          )}

          {/* ATH Change */}
          {data.athChangePercentage !== undefined && (
            <MarketDataRow
              label={t('token.marketData.fromATH', 'From ATH')}
              value={formatPercentageCompact(data.athChangePercentage)}
              valueColor={athChangeColor}
            />
          )}

          {/* ATH Date */}
          {data.athDate !== undefined && (
            <MarketDataRow
              label={t('token.marketData.athDate', 'ATH Date')}
              value={formatDateString(data.athDate)}
            />
          )}

          {/* All-Time Low */}
          {data.atl !== undefined && (
            <MarketDataRow
              label={t('token.marketData.allTimeLow', 'All-Time Low')}
              value={formatLarge(data.atl)}
            />
          )}

          {/* ATL Change */}
          {data.atlChangePercentage !== undefined && (
            <MarketDataRow
              label={t('token.marketData.fromATL', 'From ATL')}
              value={formatPercentageCompact(data.atlChangePercentage)}
              valueColor={atlChangeColor}
            />
          )}

          {/* ATL Date */}
          {data.atlDate !== undefined && (
            <MarketDataRow
              label={t('token.marketData.atlDate', 'ATL Date')}
              value={formatDateString(data.atlDate)}
            />
          )}
        </View>
      </View>
    </BlurContainer>
  );
};

const styles = StyleSheet.create({
  glassWrapper: {
    borderRadius: borderRadius.iconContainer,
    marginHorizontal: s(spacing['2xl']),
    overflow: 'hidden',
  },
  container: {
    padding: s(spacing.md),
  },
  title: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.semiBold,
    color: colors.text.primary,
    marginBottom: vs(spacing.sm),
    letterSpacing: ms(-0.07, 0.3),
  },
  rowsContainer: {
    gap: vs(spacing.md),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.secondary,
    letterSpacing: ms(-0.065, 0.3),
  },
  rowValue: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.semiBold,
    color: colors.text.primary,
    letterSpacing: ms(-0.065, 0.3),
  },
});

export default TokenMarketData;
