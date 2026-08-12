/**
 * NftCardSkeleton - Loading placeholder for NftCard
 *
 * Web version using MUI Skeleton for browser extension
 */
import { memo } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { colors, borderRadius, componentSizes, spacing } from '@salmon/shared';
import type { NftCardSkeletonProps } from './types';

/** Card dimensions matching NftCard */
const CARD_BORDER_RADIUS = borderRadius.iconContainer;

/** Badge dimensions */
const BADGE_HEIGHT = componentSizes.nftBadgeHeight;
const BADGE_BOTTOM = spacing.sm;
const BADGE_HORIZONTAL = spacing.sm;
const BADGE_BORDER_RADIUS = borderRadius.badge;

const Container = styled(Box)({
  width: '100%',
  aspectRatio: '1',
  borderRadius: CARD_BORDER_RADIUS,
  overflow: 'hidden',
  position: 'relative',
});

const CardSkeleton = styled(Skeleton)({
  backgroundColor: colors.skeleton.base,
  '&::after': {
    background: `linear-gradient(90deg, transparent, ${colors.skeleton.highlight}, transparent)`,
  },
});

const BadgeSkeleton = styled(Skeleton)({
  position: 'absolute',
  bottom: BADGE_BOTTOM,
  left: BADGE_HORIZONTAL,
  backgroundColor: colors.skeleton.base,
  '&::after': {
    background: `linear-gradient(90deg, transparent, ${colors.skeleton.highlight}, transparent)`,
  },
});

/**
 * NftCardSkeleton component for loading state
 *
 * Uses MUI Skeleton with proper skeleton colors to match the project's
 * skeleton loading pattern. Replicates the visual structure of NftCard:
 * - Main card background (rounded rectangle)
 * - Name badge at bottom (rounded rectangle)
 *
 * Dimensions match NftCard: ~194x193px with 18px border radius
 */
export const NftCardSkeleton = memo<NftCardSkeletonProps>(function NftCardSkeleton({
  style,
  className,
  testID,
  animated = true,
}) {
  const animation = animated ? 'wave' : false;

  return (
    <Container style={style} className={className} data-testid={testID}>
      {/* Main card background */}
      <CardSkeleton
        variant="rounded"
        width="100%"
        height="100%"
        animation={animation}
        sx={{ borderRadius: `${CARD_BORDER_RADIUS}px` }}
      />

      {/* Name badge at bottom */}
      <BadgeSkeleton
        variant="rounded"
        width={`calc(100% - ${BADGE_HORIZONTAL * 2}px)`}
        height={BADGE_HEIGHT}
        animation={animation}
        sx={{ borderRadius: `${BADGE_BORDER_RADIUS}px` }}
      />
    </Container>
  );
});
