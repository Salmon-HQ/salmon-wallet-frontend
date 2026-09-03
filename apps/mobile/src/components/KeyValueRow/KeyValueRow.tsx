/**
 * KeyValueRow — a label on the left, a value on the right.
 *
 * The receipt, the fee block, the price block and the transaction detail are
 * all stacks of this row, so the pair's typography and its space-between
 * geometry live here once. Values are tabular per the Tabular Rule: a row
 * that repolls must not reflow. `layout="stacked"` sets the label over a
 * value that wraps — a full address or hash is shown whole, never clipped.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  lineHeight,
  s,
  spacing,
  tabularNums,
  type Semantic,
} from '@salmon/shared';

import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import type { KeyValueRowProps, KeyValueTone } from './types';

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable one, so the spread is the copy that satisfies it.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

const valueInkFor = (t: Semantic): Record<KeyValueTone, string> => ({
  primary: t.text.primary,
  success: t.status.success,
  danger: t.status.danger,
  secondary: t.text.secondary,
});

export function KeyValueRow({
  label,
  value,
  valueTone = 'primary',
  labelWeight = 500,
  action,
  layout = 'inline',
  valueFont = 'sans',
  style,
  testID,
}: KeyValueRowProps) {
  const styles = useThemedStyles(stylesFor);
  const valueInk = valueInkFor(useSemantic());
  const stacked = layout === 'stacked';

  return (
    <View style={[stacked ? styles.stack : styles.row, style]} testID={testID}>
      <Text
        style={[styles.label, labelWeight === 600 && styles.labelEmphasised]}
        maxFontSizeMultiplier={fontScaleCap.dense}
      >
        {label}
      </Text>
      <View style={styles.valueGroup}>
        {typeof value === 'string' ? (
          <Text
            style={[
              styles.value,
              valueFont === 'mono' && styles.valueMono,
              stacked && styles.valueStacked,
              { color: valueInk[valueTone] },
            ]}
            maxFontSizeMultiplier={fontScaleCap.dense}
            numberOfLines={stacked ? undefined : 1}
          >
            {value}
          </Text>
        ) : (
          value
        )}
        {action}
      </View>
    </View>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: s(spacing.md),
    },
    stack: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: s(spacing.xs),
    },
    label: {
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.snug,
      color: t.text.secondary,
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
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.snug,
      textAlign: 'right',
      ...TABULAR,
    },
    valueMono: {
      fontFamily: fontFamilyNative.mono,
      fontSize: s(fontSize.mono),
      lineHeight: s(fontSize.mono) * lineHeight.snug,
    },
    valueStacked: {
      textAlign: 'left',
    },
  });
