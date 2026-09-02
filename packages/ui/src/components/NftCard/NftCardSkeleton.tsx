/**
 * NftCardSkeleton — the tile's own geometry while the grid loads, so the
 * placeholder lines up with the grid that replaces it.
 *
 * The mobile twin composes `Card` + `ShimmerRect`; so does this, which is what
 * keeps the two placeholders one object rather than MUI's `Skeleton` on one
 * platform and the kit's shimmer on the other. `ShimmerRect` takes pixels and
 * the tile is fluid, so the band is drawn at the tile's token size and clipped
 * by the card's own radius.
 */
import React, { memo } from 'react';
import { borderRadius, componentSizes } from '@salmon/shared';

import { Card } from '../Card';
import { ShimmerRect } from '../ShimmerRect';
import type { NftCardSkeletonProps } from './types';

export const NftCardSkeleton = memo(function NftCardSkeleton({
  style,
  className,
  testID,
}: NftCardSkeletonProps) {
  return (
    <Card
      testID={testID}
      radius="lg"
      className={className}
      style={{
        padding: 0,
        position: 'relative',
        aspectRatio: `${componentSizes.nftCardWidth} / ${componentSizes.nftCardHeight}`,
        ...style,
      }}
    >
      <ShimmerRect
        width={componentSizes.nftCardWidth}
        height={componentSizes.nftCardHeight}
        borderRadius={borderRadius.r3}
      />
    </Card>
  );
});
