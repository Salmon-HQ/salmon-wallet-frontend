import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import {
  semantic,
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
import { ShimmerRect } from '../../ShimmerRect';
import type { TokenMarketDataProps } from './types';

/** How many label/value rows the skeleton stands in for. */
const SKELETON_ROW_COUNT = 5;

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
          <View style={styles.skeletonTitle}>
            <ShimmerRect width={s(40)} height={ms(14)} />
          </View>
          <View style={styles.rowsContainer}>
            {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
              <View key={index} style={styles.row}>
                <ShimmerRect width={s(80 - index * 5)} height={ms(13)} />
                <ShimmerRect width={s(48)} height={ms(13)} />
              </View>
            ))}
          </View>
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
        ? semantic.change.positive
        : semantic.change.negative
      : undefined;

  // Determine color for ATL change
  const atlChangeColor =
    data.atlChangePercentage !== undefined
      ? data.atlChangePercentage >= 0
        ? semantic.change.positive
        : semantic.change.negative
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
  // No horizontal margin of its own: the card spans whatever column it is
  // placed in, and the surface owns its gutters (DESIGN.md §Layout). The 24
  // that used to live here inset the card inside the home Bitcoin column,
  // and every other consumer already had to cancel it with
  // `marginHorizontal: 0`.
  glassWrapper: {
    borderRadius: borderRadius.iconContainer,
    overflow: 'hidden',
  },
  container: {
    padding: s(spacing.md),
  },
  title: {
    fontSize: ms(fontSize.body),
    fontFamily: fontFamilyNative.semiBold,
    color: semantic.text.primary,
    marginBottom: vs(spacing.sm),
    letterSpacing: ms(-0.07, 0.3),
  },
  skeletonTitle: {
    marginBottom: vs(spacing.sm),
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
    fontSize: ms(fontSize.caption),
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.secondary,
    letterSpacing: ms(-0.065, 0.3),
  },
  rowValue: {
    fontSize: ms(fontSize.caption),
    fontFamily: fontFamilyNative.semiBold,
    color: semantic.text.primary,
    letterSpacing: ms(-0.065, 0.3),
  },
});

export default TokenMarketData;
