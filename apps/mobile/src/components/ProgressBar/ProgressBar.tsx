/**
 * ProgressBar — a share of a whole as a filled track, with an optional legend
 * under it. The fill is a percentage of the track, so it reads the same on
 * every phone width. DOM twin: `packages/ui/src/components/ProgressBar`.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  borderRadius,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  progressPercent,
  s,
  spacing,
  vs,
  type Semantic,
} from '@salmon/shared';

import { useThemedStyles } from '../../theme/useThemedStyles';
import type { ProgressBarProps } from './types';

const TRACK = spacing.sm;

export function ProgressBar({
  value,
  startLabel,
  endLabel,
  accessibilityLabel,
  style,
  testID,
}: ProgressBarProps) {
  const styles = useThemedStyles(stylesFor);
  const percent = progressPercent(value);

  return (
    <View testID={testID} style={[styles.column, style]}>
      <View
        testID={testID && `${testID}-track`}
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={styles.track}
      >
        <View testID={testID && `${testID}-fill`} style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      {startLabel || endLabel ? (
        <View style={styles.legend}>
          <Text
            style={styles.legendText}
            numberOfLines={1}
            maxFontSizeMultiplier={fontScaleCap.dense}
          >
            {startLabel}
          </Text>
          <Text
            style={[styles.legendText, styles.legendEnd]}
            numberOfLines={1}
            maxFontSizeMultiplier={fontScaleCap.dense}
          >
            {endLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    column: { gap: vs(spacing.sm) },
    track: {
      height: vs(TRACK),
      borderRadius: borderRadius.full,
      backgroundColor: t.border.hairline,
      overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: borderRadius.full, backgroundColor: t.accent.fill },
    legend: { flexDirection: 'row', justifyContent: 'space-between', gap: s(spacing.md) },
    legendText: {
      flexShrink: 1,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.caption),
      color: t.text.secondary,
    },
    legendEnd: { textAlign: 'right' },
  });
