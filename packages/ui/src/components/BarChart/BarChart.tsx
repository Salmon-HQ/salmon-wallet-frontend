/**
 * BarChart — a row of bars, one per value, each a share of the tallest; the
 * newest is lit. The bars share the row's width, so it reads the same at any
 * width. Mobile twin: `apps/mobile/src/components/BarChart`.
 */
import React from 'react';
import { barHeights, borderRadius, componentSizes, spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import type { BarChartProps } from './types';

export function BarChart({ values, accessibilityLabel, style, testID }: BarChartProps) {
  const t = useSemantic();
  const heights = barHeights(values);

  return (
    <div
      data-testid={testID}
      role="img"
      aria-label={accessibilityLabel}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: spacing.xs,
        height: componentSizes.barChartHeight,
        ...style,
      }}
    >
      {heights.map((height, i) => (
        <div
          key={i}
          data-testid={testID && `${testID}-bar-${i}`}
          style={{
            flex: 1,
            minWidth: 0,
            height: `${Math.round(height * 100)}%`,
            borderRadius: `${borderRadius.sm}px ${borderRadius.sm}px 0 0`,
            backgroundColor: i === heights.length - 1 ? t.accent.fill : t.accent.tint,
          }}
        />
      ))}
    </div>
  );
}
