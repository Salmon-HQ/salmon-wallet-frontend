/**
 * ListRow — a `Card` laid out as leading mark / title stack / trailing slot.
 *
 * Recipients, activity, powerups and accounts are the same row with different
 * contents, so the geometry is written once here and the differences arrive as
 * nodes.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  lineHeight,
  s,
  semantic,
  spacing,
} from '@salmon/shared';

import { Card } from '../Card';
import type { ListRowProps } from './types';

export function ListRow({
  leading,
  title,
  titleAccessory,
  subtitle,
  trailing,
  onPress,
  tone,
  padding = 'md',
  emphasis = 'default',
  accessibilityLabel,
  style,
  testID,
}: ListRowProps) {
  const spokenName =
    accessibilityLabel ?? (typeof subtitle === 'string' ? `${title}, ${subtitle}` : title);

  return (
    <Card
      testID={testID}
      onPress={onPress}
      tone={tone}
      accessibilityLabel={spokenName}
      padding={padding}
      radius="xl"
      style={StyleSheet.flatten([styles.row, style])}
    >
      {leading}
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, emphasis === 'strong' && styles.titleStrong]}
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={fontScaleCap.dense}
          >
            {title}
          </Text>
          {titleAccessory}
        </View>
        {typeof subtitle === 'string' ? (
          <Text
            style={styles.subtitle}
            numberOfLines={1}
            maxFontSizeMultiplier={fontScaleCap.dense}
          >
            {subtitle}
          </Text>
        ) : (
          subtitle
        )}
      </View>
      {trailing}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.md),
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    // The accessory sits beside the title while it fits, and drops to its own
    // line when it does not. Without the wrap the two competed for one line
    // and the token rows shipped "SOL · $101.39 · -1.1…" with the badges
    // squeezing the name (owner, first device run).
    flexWrap: 'wrap',
    columnGap: s(spacing.sm),
    rowGap: s(spacing.xxs),
  },
  title: {
    fontFamily: fontFamilyNative.bold,
    fontSize: s(fontSize.body),
    lineHeight: s(fontSize.body) * lineHeight.snug,
    color: semantic.text.primary,
    flexShrink: 1,
    minWidth: 0,
  },
  titleStrong: {
    fontSize: s(fontSize.bodyLg),
    lineHeight: s(fontSize.bodyLg) * lineHeight.snug,
  },
  subtitle: {
    fontFamily: fontFamilyNative.medium,
    fontSize: s(fontSize.caption),
    lineHeight: s(fontSize.caption) * lineHeight.snug,
    color: semantic.text.secondary,
  },
});
