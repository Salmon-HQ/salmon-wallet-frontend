/**
 * KeyValueRow — a label on the left, a value on the right.
 *
 * The receipt, the fee block, the price block and the transaction detail are
 * all stacks of this row, so the pair's typography and its space-between
 * geometry live here once. Values are tabular per the Tabular Rule: a row
 * that repolls must not reflow.
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
  tabularNums,
} from '@salmon/shared';

import type { KeyValueRowProps, KeyValueTone } from './types';

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable one, so the spread is the copy that satisfies it.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

const VALUE_INK: Record<KeyValueTone, string> = {
  primary: semantic.text.primary,
  success: semantic.status.success,
  danger: semantic.status.danger,
  secondary: semantic.text.secondary,
};

export function KeyValueRow({
  label,
  value,
  valueTone = 'primary',
  labelWeight = 500,
  action,
  style,
  testID,
}: KeyValueRowProps) {
  return (
    <View style={[styles.row, style]} testID={testID}>
      <Text
        style={[styles.label, labelWeight === 600 && styles.labelEmphasised]}
        maxFontSizeMultiplier={fontScaleCap.dense}
      >
        {label}
      </Text>
      <View style={styles.valueGroup}>
        <Text
          style={[styles.value, { color: VALUE_INK[valueTone] }]}
          maxFontSizeMultiplier={fontScaleCap.dense}
          numberOfLines={1}
        >
          {value}
        </Text>
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(spacing.md),
  },
  label: {
    fontFamily: fontFamilyNative.medium,
    fontSize: s(fontSize.caption),
    lineHeight: s(fontSize.caption) * lineHeight.snug,
    color: semantic.text.secondary,
  },
  labelEmphasised: {
    fontFamily: fontFamilyNative.semiBold,
  },
  valueGroup: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.sm),
  },
  value: {
    flexShrink: 1,
    fontFamily: fontFamilyNative.bold,
    fontSize: s(fontSize.caption),
    lineHeight: s(fontSize.caption) * lineHeight.snug,
    textAlign: 'right',
    ...TABULAR,
  },
});
