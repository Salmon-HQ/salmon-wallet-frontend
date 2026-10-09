/**
 * ProgressBar — a share of a whole as a filled track, with an optional legend
 * under it. The fill is a percentage of the track, so it reads the same at
 * any width. Mobile twin: `apps/mobile/src/components/ProgressBar`.
 */
import React from 'react';
import { borderRadius, fontFamily, fontSize, progressPercent, spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import type { ProgressBarProps } from './types';

const TRACK = spacing.sm;

export function ProgressBar({
  value,
  startLabel,
  endLabel,
  accessibilityLabel,
  style,
  testID,
}: ProgressBarProps) {
  const t = useSemantic();
  const percent = progressPercent(value);
  const legend: React.CSSProperties = {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.caption,
    color: t.text.secondary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <div
      data-testid={testID}
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, ...style }}
    >
      <div
        role="progressbar"
        aria-label={accessibilityLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        style={{
          height: TRACK,
          borderRadius: borderRadius.full,
          backgroundColor: t.border.hairline,
          overflow: 'hidden',
        }}
      >
        <div
          data-testid={testID && `${testID}-fill`}
          style={{
            width: `${percent}%`,
            height: '100%',
            borderRadius: borderRadius.full,
            backgroundColor: t.accent.fill,
          }}
        />
      </div>
      {startLabel || endLabel ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing.md }}>
          <span style={legend}>{startLabel}</span>
          <span style={{ ...legend, textAlign: 'right' }}>{endLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
