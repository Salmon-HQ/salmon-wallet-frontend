/**
 * WarningNotice – icon-led alert banner for security/failure states.
 *
 * Mobile implementation of the cross-platform `WarningNoticePropsBase`
 * contract (`packages/shared/src/types/ui/warning-notice.ts`); the DOM twin
 * lives in `packages/ui/src/components/WarningNotice`.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, fontFamilyNative, fontSize, spacing } from '@salmon/shared';
import type { WarningNoticeProps } from './types';

export function WarningNotice({
  tone = 'error',
  title,
  children,
  action,
  style,
}: WarningNoticeProps): React.ReactElement {
  const accent = tone === 'warning' ? colors.status.warning : colors.status.error;
  const background =
    tone === 'warning' ? colors.status.warningBackground : colors.status.errorBackground;

  return (
    <View
      style={[styles.container, { backgroundColor: background, borderColor: accent }, style]}
      accessibilityRole="alert"
    >
      <Ionicons name="warning-outline" size={20} color={accent} style={styles.icon} />
      <View style={styles.textColumn}>
        <Text style={[styles.title, { color: accent }]}>{title}</Text>
        {children != null && <Text style={styles.body}>{children}</Text>}
        {action != null && <View style={styles.action}>{action}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  icon: {
    flexShrink: 0,
    marginTop: 1,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fontFamilyNative.semiBold,
    fontSize: fontSize.sm,
    marginBottom: 2,
  },
  action: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  body: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.45,
  },
});
