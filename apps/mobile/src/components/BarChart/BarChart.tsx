/**
 * BarChart — a row of bars, one per value, each a share of the tallest; the
 * newest is lit. The bars share the row's width, so it reads the same on
 * every phone. DOM twin: `packages/ui/src/components/BarChart`.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  barHeights,
  borderRadius,
  componentSizes,
  s,
  spacing,
  vs,
  type Semantic,
} from '@salmon/shared';

import { useThemedStyles } from '../../theme/useThemedStyles';
import type { BarChartProps } from './types';

export function BarChart({ values, accessibilityLabel, style, testID }: BarChartProps) {
  const styles = useThemedStyles(stylesFor);
  const heights = barHeights(values);

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[styles.row, style]}
    >
      {heights.map((height, i) => (
        <View
          key={i}
          testID={testID && `${testID}-bar-${i}`}
          style={[
            styles.bar,
            i === heights.length - 1 && styles.lit,
            { height: `${Math.round(height * 100)}%` },
          ]}
        />
      ))}
    </View>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: s(spacing.xs),
      height: vs(componentSizes.barChartHeight),
    },
    bar: {
      flex: 1,
      minWidth: 0,
      borderTopLeftRadius: borderRadius.sm,
      borderTopRightRadius: borderRadius.sm,
      backgroundColor: t.accent.tint,
    },
    lit: { backgroundColor: t.accent.fill },
  });
