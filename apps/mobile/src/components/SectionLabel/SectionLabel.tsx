/**
 * SectionLabel — the three sizes of heading that sit above a block.
 *
 * They are one component because the screens choose between them constantly
 * and the difference is entirely typographic; three loose `Text` styles per
 * screen is how a type scale drifts.
 */
import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import {
  fontFamilyNative,
  fontSize,
  letterSpacing,
  lineHeight,
  s,
  spacing,
  type Semantic,
} from '@salmon/shared';

import { useThemedStyles } from '../../theme/useThemedStyles';
import type { SectionLabelProps } from './types';

export function SectionLabel({
  children,
  variant,
  trailing,
  trailingTone = 'secondary',
  style,
  testID,
}: SectionLabelProps) {
  const styles = useThemedStyles(stylesFor);
  const heading = (
    <Text
      testID={testID}
      accessibilityRole="header"
      style={[styles[variant], trailing ? styles.shrink : null, style]}
    >
      {variant === 'caps' ? children.toUpperCase() : children}
    </Text>
  );
  if (!trailing) return heading;

  return (
    <View style={styles.line}>
      {heading}
      <Text numberOfLines={1} style={[styles.trailing, styles[trailingTone]]}>
        {trailing}
      </Text>
    </View>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    caps: {
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.label),
      lineHeight: s(fontSize.label) * lineHeight.snug,
      letterSpacing: letterSpacing.label,
      color: t.text.secondary,
    },
    group: {
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.caption),
      lineHeight: s(fontSize.caption) * lineHeight.snug,
      color: t.text.secondary,
    },
    title: {
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.bodyLg),
      lineHeight: s(fontSize.bodyLg) * lineHeight.snug,
      color: t.text.primary,
    },
    line: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: s(spacing.md),
    },
    shrink: { flexShrink: 1 },
    trailing: {
      flexShrink: 0,
      fontFamily: fontFamilyNative.semiBold,
      fontSize: s(fontSize.caption),
    },
    secondary: { color: t.text.secondary },
    positive: { color: t.change.positive },
  });
