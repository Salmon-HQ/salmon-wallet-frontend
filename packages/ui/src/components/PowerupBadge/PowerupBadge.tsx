/**
 * PowerupBadge — the tier marker on a catalogue entry, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/PowerupBadge`. Core takes the
 * accent tint and community stays a plain surface, so a catalogue full of
 * community entries does not read as a wall of brand.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
  powerupBadgeTier,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import type { PowerupBadgeProps } from './types';

export function PowerupBadge({ tier, style, testID }: PowerupBadgeProps) {
  const { t } = useTranslation();
  const { background, ink, key, fallback } = powerupBadgeTier(useSemantic(), tier);

  return (
    <span
      data-testid={testID}
      style={{
        alignSelf: 'flex-start',
        display: 'inline-block',
        padding: `${spacing.xxs}px ${spacing.sm}px`,
        borderRadius: borderRadius.full,
        backgroundColor: background,
        color: ink,
        fontFamily: fontFamily.sans,
        fontWeight: fontWeight.bold,
        fontSize: fontSize.micro,
        letterSpacing: letterSpacing.label,
        ...style,
      }}
    >
      {t(key, fallback).toUpperCase()}
    </span>
  );
}

export default PowerupBadge;
