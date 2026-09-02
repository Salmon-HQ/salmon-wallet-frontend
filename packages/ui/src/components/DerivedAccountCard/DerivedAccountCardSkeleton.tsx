/**
 * DerivedAccountCardSkeleton — the placeholder a scan shows while it looks,
 * on the DOM. Built from the kit's `ShimmerRect`, in the card's own geometry.
 */
import React from 'react';
import { borderRadius, borderWidth, componentSizes, spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { ShimmerRect } from '../ShimmerRect';
import type { DerivedAccountCardSkeletonProps } from './types';

/** The two text lines the card draws, at the heights the real ones measure. */
const ADDRESS_LINE_HEIGHT = componentSizes.iconSizeXs;
const ADDRESS_WIDTH = 140;
const PATH_WIDTH = 90;

function DerivedAccountCardSkeletonComponent({
  style,
  className,
}: DerivedAccountCardSkeletonProps) {
  const t = useSemantic();

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        boxSizing: 'border-box',
        backgroundColor: t.surface.raised,
        borderRadius: borderRadius.xl,
        borderStyle: 'solid',
        borderWidth: borderWidth.thin,
        borderColor: t.border.raised,
        padding: spacing.lg,
        gap: spacing.lg,
        ...style,
      }}
    >
      <ShimmerRect
        width={componentSizes.checkboxSize}
        height={componentSizes.checkboxSize}
        borderRadius={borderRadius.sm}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: spacing.xxs }}>
        <ShimmerRect width={ADDRESS_WIDTH} height={ADDRESS_LINE_HEIGHT} />
        <div
          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
        >
          <ShimmerRect
            width={componentSizes.iconSizeXs}
            height={componentSizes.iconSizeXs}
            borderRadius={borderRadius.md}
          />
          <ShimmerRect width={PATH_WIDTH} height={spacing.md} />
        </div>
      </div>
      <ShimmerRect width={componentSizes.skeletonBalanceWidth} height={ADDRESS_LINE_HEIGHT} />
    </div>
  );
}

export const DerivedAccountCardSkeleton = React.memo(DerivedAccountCardSkeletonComponent);
