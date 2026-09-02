import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EyeIcon, iconSize } from '../../icons';
import {
  spacing,
  borderRadius,
  fontSize,
  fontFamilyNative,
  s,
  type Semantic,
  type WatchOnlyBadgePropsBase,
} from '@salmon/shared';
import { useThemedStyles, useSemantic } from '../../theme/useThemedStyles';

export interface WatchOnlyBadgeProps extends WatchOnlyBadgePropsBase {}

/**
 * Marks a wallet the user can read but not operate.
 *
 * Deliberately quiet — it is a statement of fact about the wallet, not a
 * warning. The loud signal belongs on the actions that refuse, not on every
 * row in a list.
 */
export function WatchOnlyBadge({ testID = 'watch-only-badge' }: WatchOnlyBadgeProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { text } = useSemantic();

  return (
    <View testID={testID} style={styles.badge}>
      <EyeIcon color={text.secondary} size={iconSize.sm} />
      <Text style={styles.label}>{t('wallet.watchOnly.badge')}</Text>
    </View>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.xs,
      borderRadius: borderRadius.sm,
      backgroundColor: t.surface.raised,
      alignSelf: 'flex-start',
    },
    label: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.caption),
      lineHeight: s(fontSize.caption),
    },
  });
