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
  note,
  style,
  testID,
}: StatTileProps) {
  const t = useSemantic();
  const metrics = STAT_SIZES[size];
  const end = align === 'end';
  const column: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: end ? 'flex-end' : 'stretch',
    gap: spacing.xs,
    minWidth: 0,
  };

  const figure = (
    <>
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
        {/* Proportional digits: a lone figure reads in the font's own widths. */}
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
        {note ? (
          <span
            style={{
              flexShrink: 0,
              marginLeft: 'auto',
              fontFamily: fontFamily.sans,
              fontWeight: fontWeight.semibold,
              fontSize: fontSize.caption,
              color: note.tone === 'accent' ? t.accent.ink : t.text.secondary,
              whiteSpace: 'nowrap',
            }}
          >
            {note.text}
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
    </>
  );

  if (!pill)
    return (
      <div data-testid={testID} style={{ ...column, ...style }}>
        {figure}
      </div>
    );
  // A pill sits beside the figure, centred on it both ways.
  return (
    <div
      data-testid={testID}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minWidth: 0,
        ...style,
      }}
    >
      <div style={{ ...column, flex: 1 }}>{figure}</div>
      <Pill {...pill} />
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
