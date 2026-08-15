/**
 * TokenMarketData - Token market statistics display
 *
 * Web version using MUI and @emotion/styled for browser extension.
 * Provides a glassmorphism container with market data rows.
 */
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import {
  colors,
  spacing,
  borderRadius,
  fontFamily,
  fontWeight,
  fontSize,
  formatLargeNumber,
  formatPercentageCompact,
  formatDateString,
  useCurrencyContext,
  tabularNums,
} from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
import type { TokenMarketDataProps } from './types';

/* ── Styled components ─────────────────────────────────────────────── */

const ContentContainer = styled(Box)({
  padding: spacing.md,
});

const Title = styled(Typography)({
  fontSize: fontSize.md,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  marginBottom: spacing.sm,
});

const RowsContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
});

const Row = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const RowLabel = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
});

const RowValue = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
});

/* ── Skeleton row helper ───────────────────────────────────────────── */

const SkeletonRow = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

/* ── Sub-components ────────────────────────────────────────────────── */

/**
 * Single market data row component (label left, value right)
 */
function MarketDataRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <Row>
      <RowLabel>{label}</RowLabel>
      <RowValue sx={valueColor ? { color: valueColor } : undefined}>{value}</RowValue>
    </Row>
  );
}

/* ── Main component ────────────────────────────────────────────────── */

/**
 * TokenMarketData component for displaying token market statistics
 *
 * Features:
 * - Glassmorphism container (BlurContainer)
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
export function TokenMarketData({
  data,
  symbol,
  title,
  loading = false,
  style,
  className,
}: TokenMarketDataProps) {
  const { t } = useTranslation();
  const [, { formatLarge }] = useCurrencyContext();
  const displayTitle = title ?? t('token.marketData.marketCap', 'Info');

  if (loading) {
    return (
      <BlurContainer
        style={{ borderRadius: borderRadius.lg, overflow: 'hidden', ...style }}
        className={className}
      >
        <ContentContainer>
          {/* Title skeleton */}
          <Skeleton
            variant="text"
            width={40}
            height={22}
            sx={{ bgcolor: colors.skeleton.base, mb: `${spacing.sm}px` }}
          />
          {/* Row skeletons */}
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonRow key={i} sx={{ mb: `${spacing.sm}px` }}>
              <Skeleton
                variant="text"
                width={80 + i * 8}
                height={18}
                sx={{ bgcolor: colors.skeleton.base }}
              />
              <Skeleton
                variant="text"
                width={60}
                height={18}
                sx={{ bgcolor: colors.skeleton.base }}
              />
            </SkeletonRow>
          ))}
        </ContentContainer>
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
    <BlurContainer
      style={{ borderRadius: borderRadius.lg, overflow: 'hidden', ...style }}
      className={className}
    >
      <ContentContainer>
        <Title>{displayTitle}</Title>

        <RowsContainer>
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
        </RowsContainer>
      </ContentContainer>
    </BlurContainer>
  );
}
