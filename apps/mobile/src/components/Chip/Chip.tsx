/**
 * Chip — a small pill that either labels something or filters it.
 *
 * The activity filters, the send percentage shortcuts, the provider badge and
 * the History pill are one object; the only thing that varies is whether the
 * pill can be selected.
 */
import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import {
  borderRadius,
  borderWidth,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  letterSpacing,
  s,
  semantic,
  spacing,
  vs,
} from '@salmon/shared';

import type { ChipProps, ChipSize } from './types';

const SIZES: Record<ChipSize, { paddingVertical: number; paddingHorizontal: number; font: number }> =
  {
    sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, font: fontSize.micro },
    md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, font: fontSize.caption },
  };

export function Chip({
  label,
  selected = false,
  onPress,
  size = 'md',
  variant = 'filter',
  leadingIcon,
  accessibilityLabel,
  style,
  testID,
}: ChipProps) {
  const metrics = SIZES[size];
  const isSelected = variant === 'filter' && selected;

  const body = (
    <>
      {leadingIcon}
      <Text
        style={[
          styles.label,
          { fontSize: s(metrics.font) },
          isSelected ? styles.labelSelected : styles.labelIdle,
        ]}
        numberOfLines={1}
        maxFontSizeMultiplier={fontScaleCap.chrome}
      >
        {label}
      </Text>
    </>
  );

  const box = [
    styles.chip,
    {
      paddingVertical: vs(metrics.paddingVertical),
      paddingHorizontal: s(metrics.paddingHorizontal),
    },
    variant === 'outline' && styles.outline,
    variant === 'filter' && (isSelected ? styles.filterSelected : styles.filterIdle),
    style,
  ];

  if (!onPress) {
    return (
      <View style={box} testID={testID}>
        {body}
      </View>
    );
  }

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      activeOpacity={0.7}
      style={box}
    >
      {body}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(spacing.xs),
    borderRadius: borderRadius.full,
    borderWidth: borderWidth.thin,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: semantic.border.raised,
  },
  filterIdle: {
    backgroundColor: 'transparent',
    borderColor: semantic.border.hairline,
  },
  // The selected filter is the inverse well, not a louder fill: a filter that
  // is on should read as a different object, not as a second call to action
  // competing with the screen's one salmon element.
  filterSelected: {
    backgroundColor: semantic.depth.abyss,
    borderColor: semantic.border.strong,
  },
  label: {
    fontFamily: fontFamilyNative.bold,
    letterSpacing: letterSpacing.label,
  },
  labelIdle: {
    color: semantic.text.secondary,
  },
  labelSelected: {
    color: semantic.text.primary,
  },
});
