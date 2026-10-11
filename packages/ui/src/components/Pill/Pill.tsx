/**
 * Pill — a short read-only label on a tinted capsule: an APY, a change over a
 * period, a status. Never a control; a choice is a `Chip`. Mobile twin:
 * `apps/mobile/src/components/Pill`.
 */
import React from 'react';
import {
  borderRadius,
  fontFamily,
  fontSize,
  fontWeight,
  pillColorsFor,
  spacing,
} from '@salmon/shared';

import { powerupIcons } from '../../icons';
import { useSemantic } from '../../theme/ThemeProvider';
import type { PillProps } from './types';

const DOT = spacing.sm - spacing.xxs;

export function Pill({ label, tone, icon, dot, style, testID }: PillProps) {
  const { ink, ground } = pillColorsFor(useSemantic())[tone];
  const Glyph = icon ? powerupIcons[icon] : null;

  return (
    <span
      data-testid={testID}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        gap: spacing.xs,
        padding: `${spacing.xs}px ${spacing.sm}px`,
        borderRadius: borderRadius.full,
        backgroundColor: ground,
        ...style,
      }}
    >
      {dot ? (
        <span
          data-testid={testID && `${testID}-dot`}
          style={{ width: DOT, height: DOT, borderRadius: borderRadius.full, backgroundColor: ink }}
        />
      ) : null}
      {Glyph ? <Glyph size={fontSize.label} color={ink} weight="bold" /> : null}
      <span
        style={{
          fontFamily: fontFamily.sans,
          fontWeight: fontWeight.semibold,
          fontSize: fontSize.label,
          color: ink,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </span>
  );
}
