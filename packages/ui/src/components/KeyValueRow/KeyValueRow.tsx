/**
 * KeyValueRow — a label on the left, a value on the right, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/KeyValueRow/KeyValueRow.tsx`;
 * the pair's typography and space-between geometry are the same, read from
 * the same `KeyValueRowPropsBase` contract. Values are tabular per the
 * Tabular Rule: a row that repolls must not reflow.
 */
import React from 'react';
import {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  spacing,
  tabularNums,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import type { KeyValueRowProps, KeyValueTone } from './types';

const valueInkFor = (t: Semantic): Record<KeyValueTone, string> => ({
  primary: t.text.primary,
  success: t.status.success,
  danger: t.status.danger,
  secondary: t.text.secondary,
});

export function KeyValueRow({
  label,
  value,
  valueTone = 'primary',
  labelWeight = 500,
  action,
  style,
  className,
  testID,
}: KeyValueRowProps) {
  const t = useSemantic();
  const valueInk = valueInkFor(t);

  const row: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    ...style,
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: fontFamily.sans,
    fontWeight: labelWeight === 600 ? fontWeight.semibold : fontWeight.medium,
    fontSize: fontSize.body,
    lineHeight: `${fontSize.body * lineHeight.snug}px`,
    color: t.text.secondary,
  };

  const valueGroup: React.CSSProperties = {
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  };

  const valueStyle: React.CSSProperties = {
    minWidth: 0,
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.body,
    lineHeight: `${fontSize.body * lineHeight.snug}px`,
    textAlign: 'right',
    color: valueInk[valueTone],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    ...tabularNums.css,
  };

  return (
    <div data-testid={testID} className={className} style={row}>
      <span style={labelStyle}>{label}</span>
      <span style={valueGroup}>
        {typeof value === 'string' ? <span style={valueStyle}>{value}</span> : value}
        {action}
      </span>
    </div>
  );
}
