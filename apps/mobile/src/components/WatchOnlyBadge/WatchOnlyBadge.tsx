import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EyeIcon, iconSize } from '../../icons';
import {
  colors,
  semantic,
  spacing,
  borderRadius,
  fontSize,
  fontFamilyNative,
} from '@salmon/shared';

export interface WatchOnlyBadgeProps {
  /** Test hook for the surface rendering the badge. */
  testID?: string;
}

/**
 * Marks a wallet the user can read but not operate.
 *
 * Deliberately quiet — it is a statement of fact about the wallet, not a
 * warning. The loud signal belongs on the actions that refuse, not on every
 * row in a list.
 */
export function WatchOnlyBadge({ testID = 'watch-only-badge' }: WatchOnlyBadgeProps) {
  const { t } = useTranslation();

  return (
    <View testID={testID} style={styles.badge}>
      <EyeIcon color={colors.text.secondary} size={iconSize.sm} />
      <Text style={styles.label}>{t('wallet.watchOnly.badge')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: semantic.surface.raised,
    alignSelf: 'flex-start',
  },
  label: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.caption,
    lineHeight: fontSize.caption,
  },
});
