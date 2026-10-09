/**
 * StatTile — one figure: an uppercase label, the value with its unit, a
 * caption. StatGrid sets figures side by side, each an equal share of the
 * row. Mobile twin: `apps/mobile/src/components/StatTile`.
 *
 * The value never wraps: a figure split over two lines reads as a different
 * number, so a value too long for its share ends in an ellipsis instead.
 */
import React from 'react';
import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  spacing,
  STAT_SIZES,
  statInkFor,
  tabularNums,
} from '@salmon/shared';

import { Pill } from '../Pill';
import { useSemantic } from '../../theme/ThemeProvider';
import type { StatGridProps, StatTileProps } from './types';

export function StatTile({
  label,
  value,
  unit,
  caption,
  tone = 'default',
  size = 'md',
  align = 'start',
  pill,
  style,
  testID,
}: StatTileProps) {
  const t = useSemantic();
  const metrics = STAT_SIZES[size];
  const end = align === 'end';

  return (
    <div
      data-testid={testID}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: end ? 'flex-end' : 'stretch',
        gap: spacing.xs,
        minWidth: 0,
        ...style,
      }}
    >
      {label || pill ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          {label ? (
            <span
              style={{
                fontFamily: fontFamily.sans,
                fontWeight: fontWeight.semibold,
                fontSize: fontSize.micro,
                letterSpacing: letterSpacing.label,
                color: t.text.tertiary,
              }}
            >
              {label.toUpperCase()}
            </span>
          ) : null}
          {pill ? <Pill {...pill} /> : null}
        </div>
      ) : null}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: end ? 'flex-end' : 'flex-start',
          gap: spacing.xs,
          minWidth: 0,
          maxWidth: '100%',
        }}
      >
        <span
          style={{
            fontFamily: fontFamily.sans,
            fontWeight: fontWeight.bold,
            fontSize: metrics.value,
            color: statInkFor(t)[tone],
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
            ...tabularNums.css,
          }}
        >
          {value}
        </span>
        {unit ? (
          <span
            style={{
              flexShrink: 0,
              fontFamily: fontFamily.sans,
              fontWeight: fontWeight.semibold,
              fontSize: metrics.unit,
              color: t.text.secondary,
            }}
          >
            {unit}
          </span>
        ) : null}
      </div>
      {caption ? (
        <span
          style={{
            fontFamily: fontFamily.sans,
            fontSize: fontSize.caption,
            lineHeight: fontSize.caption * lineHeight.snug + 'px',
            color: t.text.secondary,
          }}
        >
          {caption}
        </span>
      ) : null}
    </div>
  );
}

export function StatGrid({ items, style, testID }: StatGridProps) {
  return (
    <div data-testid={testID} style={{ display: 'flex', gap: spacing.md, ...style }}>
      {items.map(({ key, ...item }) => (
        <StatTile key={key} {...item} style={{ flex: 1, minWidth: 0 }} />
      ))}
    </div>
  );
}
