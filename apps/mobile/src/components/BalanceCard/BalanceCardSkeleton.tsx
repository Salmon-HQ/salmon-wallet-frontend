import { ContentLoader, Rect } from '@salmon/shared';
import { colors, ms, s, spacing, vs } from '@salmon/shared';
import React from 'react';
import { View } from 'react-native';
import type { BalanceCardSkeletonProps } from './types';

/**
 * BalanceCardSkeleton component for loading state
 *
 * Displays placeholder rectangles for balance and 24h change
 * with a shimmer animation to indicate loading.
 *
 * Features:
 * - Shimmer animation using ContentLoader (speed: 1.5)
 * - Placeholder for balance ($0,000.00) - large rectangle
 * - Placeholder for 24h change - smaller rectangle
 * - Uses theme skeleton colors (colors.skeleton.base/highlight)
 * - Maintains same layout dimensions to prevent layout shift
 *
 * @example
 * ```tsx
 * <BalanceCardSkeleton animated testID="balance-skeleton" />
 * ```
 */
const BalanceCardSkeletonComponent: React.FC<BalanceCardSkeletonProps> = ({
  style,
  testID,
  animated = true,
}) => {
  const balanceWidth = s(180);
  const balanceHeight = vs(37);
  const changeWidth = s(120);
  const changeHeight = vs(16);
  const gap = vs(spacing.sm);

  const totalHeight = balanceHeight + gap + changeHeight;

  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]} testID={testID}>
      <ContentLoader
        speed={1.5}
        width={balanceWidth}
        height={totalHeight}
        viewBox={`0 0 ${balanceWidth} ${totalHeight}`}
        backgroundColor={colors.skeleton.base}
        foregroundColor={colors.skeleton.highlight}
        {...(!animated && { speed: 0 })}
      >
        {/* Balance placeholder - matches balance text dimensions */}
        <Rect x="0" y="0" rx={ms(8)} ry={ms(8)} width={balanceWidth} height={balanceHeight} />
        {/* 24h change placeholder - centered and smaller */}
        <Rect
          x={(balanceWidth - changeWidth) / 2}
          y={balanceHeight + gap}
          rx={ms(4)}
          ry={ms(4)}
          width={changeWidth}
          height={changeHeight}
        />
      </ContentLoader>
    </View>
  );
};

export const BalanceCardSkeleton = React.memo(BalanceCardSkeletonComponent);

export default BalanceCardSkeleton;
