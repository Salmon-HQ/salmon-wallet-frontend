/**
 * PowerupBadge — the tier marker on a powerup card or row.
 *
 * Featured is the only one that spends a salmon fill; official takes the tint
 * and community stays a plain surface, so a catalogue full of community
 * entries does not read as a wall of brand.
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
  semantic,
  spacing,
  vs,
} from '@salmon/shared';

import type { PowerupBadgeProps, PowerupTier } from './types';

const TIERS: Record<PowerupTier, { background: string; ink: string; key: string; fallback: string }> =
  {
    official: {
      background: semantic.accent.tint,
      ink: semantic.accent.ink,
      key: 'powerups.badge.official',
      fallback: 'Official',
    },
    community: {
      background: semantic.surface.raised,
      ink: semantic.text.secondary,
      key: 'powerups.badge.community',
      fallback: 'Community',
    },
    featured: {
      background: semantic.accent.fill,
      ink: semantic.accent.onFill,
      key: 'powerups.badge.featured',
      fallback: 'Featured',
    },
  };

export function PowerupBadge({ tier, style, testID }: PowerupBadgeProps) {
  const { t } = useTranslation();
  const { background, ink, key, fallback } = TIERS[tier];

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
