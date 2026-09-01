/**
 * WarningNotice – icon-led alert banner for security/failure states.
 *
 * Mobile implementation of the cross-platform `WarningNoticePropsBase`
 * contract (`packages/shared/src/types/ui/warning-notice.ts`); the DOM twin
 * lives in `packages/ui/src/components/WarningNotice`.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WarningIcon, iconSize } from '../../icons';
import {
  borderRadius,
  fontFamilyNative,
  fontSize,
  s,
  spacing,
  type Semantic,
} from '@salmon/shared';

import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import type { WarningNoticeProps } from './types';

export function WarningNotice({
  tone = 'error',
  title,
  children,
  action,
  style,
  testID,
}: WarningNoticeProps): React.ReactElement {
  const styles = useThemedStyles(stylesFor);
  const { status } = useSemantic();
  const accent = tone === 'warning' ? status.warning : status.danger;
  const background = tone === 'warning' ? status.warningTint : status.dangerTint;

  return (
    <View
      testID={testID}
      style={[styles.container, { backgroundColor: background, borderColor: accent }, style]}
      accessibilityRole="alert"
    >
      <WarningIcon size={iconSize.md} color={accent} style={styles.icon} />
      <View style={styles.textColumn}>
        <Text style={[styles.title, { color: accent }]}>{title}</Text>
        {children != null && <Text style={styles.body}>{children}</Text>}
        {action != null && <View style={styles.action}>{action}</View>}
      </View>
    </View>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
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
      fontSize: s(fontSize.caption),
      marginBottom: spacing.xxs,
    },
    action: {
      marginTop: 6,
      alignSelf: 'flex-start',
    },
    body: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.caption),
      lineHeight: s(fontSize.caption) * 1.45,
    },
  });
