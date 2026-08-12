/**
 * TokenDetailPage - Full-page token detail view
 *
 * Replaces the former TokenInformationSheet dialog.
 * Renders as a full page with back navigation, matching the
 * page-navigation pattern used by other extension pages.
 *
 * Content: price chart, token item, market data, badges, about.
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

import { colors, spacing, borderRadius } from '@salmon/shared';

import { PriceChart } from '../PriceChart';
import { TokenListItem } from '../TokenList';
import { TokenMarketData } from '../TokenMarketData';
import { TokenAbout } from '../TokenAbout';
import { PageShell } from '../PageShell';
import { TokenBadgesSection } from './TokenBadgesSection';
import type { TokenDetailPageProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const ContentContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.lg,
  padding: `${spacing.lg}px ${spacing.xl}px`,
  paddingBottom: spacing['2xl'],
});

const TokenItemSkeletonContainer = styled(Box)({
  backgroundColor: colors.background.tokenItem,
  borderRadius: borderRadius.lg,
  overflow: 'hidden',
  padding: `${spacing.md}px`,
  display: 'flex',
  alignItems: 'center',
  gap: spacing.md,
});

const SkeletonTextColumn = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.xs,
});

const SkeletonValueColumn = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: spacing.xs,
});

// ============================================================================
// TokenListItemSkeleton Component
// ============================================================================

const TokenListItemSkeleton: React.FC = () => {
  return (
    <TokenItemSkeletonContainer>
      <Skeleton
        variant="circular"
        width={36}
        height={36}
        sx={{ bgcolor: colors.skeleton.base, flexShrink: 0 }}
      />
      <SkeletonTextColumn>
        <Skeleton variant="text" width={100} height={14} sx={{ bgcolor: colors.skeleton.base }} />
        <Skeleton variant="text" width={80} height={12} sx={{ bgcolor: colors.skeleton.base }} />
      </SkeletonTextColumn>
      <SkeletonValueColumn>
        <Skeleton variant="text" width={60} height={16} sx={{ bgcolor: colors.skeleton.base }} />
        <Skeleton variant="text" width={40} height={12} sx={{ bgcolor: colors.skeleton.base }} />
      </SkeletonValueColumn>
    </TokenItemSkeletonContainer>
  );
};

// ============================================================================
// TokenDetailPage Component
// ============================================================================

export function TokenDetailPage({
  token,
  blockchain = 'solana',
  chartData,
  chartPeriod,
  onChartPeriodChange,
  coinInfo,
  marketData,
  loading = false,
  chartError = false,
  onBack,
  style,
  className,
}: TokenDetailPageProps): React.ReactElement {
  const { t } = useTranslation();
  const handleTokenPress = useCallback(() => {
    // No action needed - token is already selected
  }, []);

  return (
    <PageShell
      title={t('token.detail.title', 'Token Information')}
      onBack={onBack}
      showScalesBackground
      style={style}
      className={className}
    >
      <ContentContainer>
        {/* PriceChart - full width */}
        {(loading || chartData.length > 0 || chartError) && (
          <PriceChart
            data={chartData}
            selectedPeriod={chartPeriod}
            onPeriodChange={onChartPeriodChange}
            loading={loading}
            error={chartError}
            style={{ margin: `0 -${spacing.xl}px` }}
          />
        )}

        {/* TokenListItem */}
        {loading ? (
          <TokenListItemSkeleton />
        ) : (
          <TokenListItem
            token={token}
            onPress={handleTokenPress}
            hiddenBalance={false}
            blockchain={blockchain}
          />
        )}

        {/* TokenMarketData (Info) */}
        <TokenMarketData
          data={marketData}
          symbol={token.symbol}
          title={t('token.marketData.title', 'Info')}
          loading={loading}
        />

        {/* TokenBadgesSection */}
        <TokenBadgesSection tags={token.tags} loading={loading} />

        {/* TokenAbout */}
        <TokenAbout description={coinInfo?.description} loading={loading} />
      </ContentContainer>
    </PageShell>
  );
}
