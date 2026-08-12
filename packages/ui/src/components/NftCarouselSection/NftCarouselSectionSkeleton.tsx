/**
 * NftCarouselSectionSkeleton - Loading placeholder for NftCarouselSection
 */
import { memo } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { colors, spacing, borderRadius, componentSizes } from '@salmon/shared';
import { NftCardSkeleton } from '../NftCard';
import type { NftCarouselSectionSkeletonProps } from './types';

const CARD_GAP = componentSizes.nftCardGap;

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.md,
});

const HeaderRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
});

const StyledSkeleton = styled(Skeleton)({
  backgroundColor: colors.skeleton.base,
  '&::after': {
    background: `linear-gradient(90deg, transparent, ${colors.skeleton.highlight}, transparent)`,
  },
});

const CardRow = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: CARD_GAP,
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
});

export const NftCarouselSectionSkeleton = memo<NftCarouselSectionSkeletonProps>(
  function NftCarouselSectionSkeleton({ count = 8, style, className }) {
    return (
      <Container style={style} className={className}>
        <HeaderRow>
          <StyledSkeleton variant="circular" width={24} height={24} animation="wave" />
          <StyledSkeleton
            variant="rounded"
            width={80}
            height={18}
            animation="wave"
            sx={{ borderRadius: `${borderRadius.sm}px` }}
          />
          <StyledSkeleton
            variant="rounded"
            width={28}
            height={14}
            animation="wave"
            sx={{ borderRadius: `${borderRadius.sm}px` }}
          />
        </HeaderRow>
        <CardRow>
          {Array.from({ length: count }).map((_, i) => (
            <NftCardSkeleton key={i} />
          ))}
        </CardRow>
      </Container>
    );
  }
);
