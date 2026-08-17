/**
 * TokenDetailContent — the token detail screen itself.
 *
 * One composition, one rhythm, one set of titles, for every asset that has a
 * detail view: the Solana token pushed from the token list and the Bitcoin
 * home tab, which is the same screen without the push. Both used to be written
 * out by hand in their own file, which is how they drifted into two different
 * chart bleeds, two different gaps, two different section titles and a magic
 * 180px chart.
 *
 * Sections omit themselves when the asset has no data for them (Bitcoin has no
 * tags, so no badges block appears) — that is a difference in *data*, and it is
 * the only kind of difference allowed here. Spacing, typography, titles and
 * order are not the caller's business.
 *
 * The container it sits in *is* the caller's business: a pushed page pads its
 * content differently from the home tab, and the chart has to bleed to whatever
 * that padding is. Hence `bleed`, and nothing else.
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

import { colors, spacing, borderRadius, componentSizes } from '@salmon/shared';

import { PriceChart } from '../PriceChart';
import { TokenListItem } from '../TokenList';
import { TokenMarketData } from '../TokenMarketData';
import { TokenAbout } from '../TokenAbout';
import { styled } from '../../utils/styled';
import { TokenBadgesSection } from './TokenBadgesSection';
import type { TokenDetailContentProps } from './types';

const SectionStack = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.lg,
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

function TokenListItemSkeleton(): React.ReactElement {
  return (
    <TokenItemSkeletonContainer>
      <Skeleton
        variant="circular"
        width={componentSizes.tokenIcon}
        height={componentSizes.tokenIcon}
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
}

export function TokenDetailContent({
  token,
  blockchain = 'solana',
  hiddenBalance = false,
  chartData,
  chartPeriod,
  onChartPeriodChange,
  chartLoading = false,
  chartPending = false,
  chartError = false,
  coinInfo,
  marketData,
  infoLoading = false,
  bleed = spacing.xl,
  style,
  className,
}: TokenDetailContentProps): React.ReactElement {
  const { t } = useTranslation();
  const handleTokenPress = useCallback(() => {
    // The token is already the subject of this screen — pressing it is a no-op.
  }, []);

  return (
    <SectionStack style={style} className={className}>
      {(chartLoading || chartData.length > 0 || chartError) && (
        <PriceChart
          data={chartData}
          selectedPeriod={chartPeriod}
          onPeriodChange={onChartPeriodChange}
          loading={chartLoading}
          pending={chartPending}
          error={chartError}
          style={{ margin: `0 -${bleed}px` }}
        />
      )}

      {token ? (
        <TokenListItem
          token={token}
          onPress={handleTokenPress}
          hiddenBalance={hiddenBalance}
          blockchain={blockchain}
        />
      ) : (
        <TokenListItemSkeleton />
      )}

      <TokenMarketData
        data={marketData}
        symbol={token?.symbol ?? ''}
        title={t('token.marketData.title', 'Market data')}
        loading={infoLoading}
      />

      <TokenBadgesSection tags={token?.tags} loading={infoLoading && !token} />

      <TokenAbout description={coinInfo?.description} loading={infoLoading} />
    </SectionStack>
  );
}
