/**
 * DerivedAccountCardSkeleton - Loading placeholder for derived account cards
 *
 * Web version using MUI keyframe animations for shimmer effect.
 */
import React from 'react';
import { styled, keyframes } from '@mui/material/styles';
import Box from '@mui/material/Box';
import {
  colors,
  spacing,
  borderRadius,
  borderWidth,
  componentSizes,
  durationMs,
  easing,
} from '@salmon/shared';
import type { DerivedAccountCardSkeletonProps } from './types';

const shimmer = keyframes`
  0% { background-position: -${componentSizes.shimmerOffset}px 0; }
  100% { background-position: ${componentSizes.shimmerOffset}px 0; }
`;

const Card = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.card.background,
  border: `${borderWidth.thin}px solid ${colors.card.border}`,
  borderRadius: borderRadius.xl,
  padding: spacing.lg,
  marginBottom: spacing.md,
});

const SkeletonRect = styled(Box)({
  borderRadius: borderRadius.sm,
  background: `linear-gradient(90deg, ${colors.skeleton?.base ?? 'rgba(255,255,255,0.05)'} 25%, ${colors.skeleton?.highlight ?? 'rgba(255,255,255,0.1)'} 50%, ${colors.skeleton?.base ?? 'rgba(255,255,255,0.05)'} 75%)`,
  backgroundSize: `${componentSizes.shimmerWidth}px 100%`,
  animation: `${shimmer} ${durationMs.shimmer}ms ${easing.easeInOut} infinite`,
});

const DerivedAccountCardSkeletonComponent: React.FC<DerivedAccountCardSkeletonProps> = ({
  style,
  className,
}) => {
  return (
    <Card style={style} className={className}>
      {/* Checkbox skeleton */}
      <SkeletonRect
        sx={{
          width: componentSizes.checkboxSize,
          height: componentSizes.checkboxSize,
          borderRadius: `${borderRadius.sm}px`,
          mr: `${spacing.lg}px`,
          flexShrink: 0,
        }}
      />

      {/* Info skeleton */}
      <Box sx={{ flex: 1 }}>
        <SkeletonRect
          sx={{ width: '55%', height: componentSizes.iconSizeXs, mb: `${spacing.xxs}px` }}
        />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: `${spacing.xs}px`,
          }}
        >
          <SkeletonRect
            sx={{
              width: componentSizes.iconSizeXs,
              height: componentSizes.iconSizeXs,
              borderRadius: `${borderRadius.md}px`,
              flexShrink: 0,
            }}
          />
          <SkeletonRect sx={{ width: '35%', height: spacing.md }} />
        </Box>
      </Box>

      {/* Balance skeleton */}
      <SkeletonRect
        sx={{
          width: componentSizes.skeletonBalanceWidth,
          height: componentSizes.iconSizeXs,
          flexShrink: 0,
        }}
      />
    </Card>
  );
};

export const DerivedAccountCardSkeleton = React.memo(DerivedAccountCardSkeletonComponent);
