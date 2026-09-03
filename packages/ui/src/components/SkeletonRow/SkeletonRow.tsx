/**
 * SkeletonRow — the composed skeleton atom, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/Skeleton/SkeletonRow.tsx`:
 * a `Card` at the row's own padding, built from `ShimmerRect`, so a
 * skeleton's geometry matches the real `ListRow` it stands in for.
 */
import React from 'react';
import { spacing } from '@salmon/shared';

import { Card } from '../Card';
import { ShimmerRect } from '../ShimmerRect';
import type { SkeletonRowProps } from './types';

const TITLE_LINE_HEIGHT = 16;
const SUBTITLE_LINE_HEIGHT = 13;
const TITLE_WIDTH = 100;
const SUBTITLE_WIDTH = 140;

export function SkeletonRow({
  leadingSize = 40,
  lines = 2,
  trailingWidth,
  count = 1,
  padding = 'md',
  testID,
  accessibilityLabel,
  style,
  className,
}: SkeletonRowProps) {
  const rows = Array.from({ length: count }, (_, index) => (
    <Card
      key={index}
      padding={padding}
      radius="xl"
      style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
    >
      <ShimmerRect width={leadingSize} height={leadingSize} borderRadius={leadingSize / 2} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: spacing.xxs }}>
        <ShimmerRect width={TITLE_WIDTH} height={TITLE_LINE_HEIGHT} />
        {lines === 2 && <ShimmerRect width={SUBTITLE_WIDTH} height={SUBTITLE_LINE_HEIGHT} />}
      </div>
      {trailingWidth != null && <ShimmerRect width={trailingWidth} height={TITLE_LINE_HEIGHT} />}
    </Card>
  ));

  if (count === 1) {
    return (
      <div data-testid={testID} aria-label={accessibilityLabel} className={className} style={style}>
        {rows[0]}
      </div>
    );
  }

  return (
    <div
      data-testid={testID}
      aria-label={accessibilityLabel}
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.screenGutter, ...style }}
    >
      {rows}
    </div>
  );
}
