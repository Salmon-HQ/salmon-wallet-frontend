/**
 * ChipGroup — a horizontally scrollable row of single-select chips.
 *
 * Scrollable rather than wrapping because a filter row must stay one line:
 * a set that wraps changes the height of the content below it as options
 * come and go.
 */
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { s, spacing } from '@salmon/shared';

import { Chip } from './Chip';
import type { ChipGroupProps } from './types';

export function ChipGroup({
  options,
  value,
  onChange,
  size = 'md',
  variant = 'filter',
  style,
  testID,
}: ChipGroupProps) {
  const handlePress = useCallback((key: string) => () => onChange(key), [onChange]);

  return (
    <ScrollView
      testID={testID}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={styles.content}
    >
      {options.map((option) => (
        <Chip
          key={option.key}
          testID={`${testID ?? 'chip-group'}-${option.key}`}
          label={option.label}
          selected={option.key === value}
          onPress={handlePress(option.key)}
          size={size}
          variant={variant}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.sm),
  },
});
