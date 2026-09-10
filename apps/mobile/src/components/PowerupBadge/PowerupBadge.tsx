/**
 * PowerupBadge — the tier marker on a powerup card or row.
 *
 * Core takes the accent tint and community stays a plain surface, so a
 * catalogue full of community entries does not read as a wall of brand.
 */
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  letterSpacing,
  s,
  spacing,
  vs,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/useThemedStyles';
import type { PowerupBadgeProps, PowerupTier } from './types';

const tiersFor = (
  t: Semantic
): Record<PowerupTier, { background: string; ink: string; key: string; fallback: string }> => ({
  core: {
    background: t.accent.tint,
    ink: t.accent.ink,
    key: 'powerups.badge.core',
    fallback: 'Core',
  },
  community: {
    background: t.surface.raised,
    ink: t.text.secondary,
    key: 'powerups.badge.community',
    fallback: 'Community',
  },
});

export function PowerupBadge({ tier, style, testID }: PowerupBadgeProps) {
  const { t } = useTranslation();
  const { background, ink, key, fallback } = tiersFor(useSemantic())[tier];

  return (
    <View testID={testID} style={[styles.badge, { backgroundColor: background }, style]}>
      <Text
        style={[styles.label, { color: ink }]}
        numberOfLines={1}
        maxFontSizeMultiplier={fontScaleCap.chrome}
      >
        {t(key, fallback).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: vs(spacing.xxs),
    paddingHorizontal: s(spacing.sm),
    borderRadius: borderRadius.full,
  },
  label: {
    fontFamily: fontFamilyNative.bold,
    fontSize: s(fontSize.micro),
    letterSpacing: letterSpacing.label,
  },
});
