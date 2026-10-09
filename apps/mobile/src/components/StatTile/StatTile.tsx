/**
 * StatTile — one figure: an uppercase label, the value with its unit, a
 * caption. StatGrid sets figures side by side, each an equal share of the
 * row. DOM twin: `packages/ui/src/components/StatTile`.
 *
 * The value never wraps: on a narrow phone it shrinks (down to
 * `STAT_MIN_FONT_SCALE`) instead, because a figure split over two lines or
 * clipped at the edge reads as a different number.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  letterSpacing,
  lineHeight,
  s,
  spacing,
  STAT_MIN_FONT_SCALE,
  STAT_SIZES,
  statInkFor,
  tabularNums,
  type Semantic,
} from '@salmon/shared';

import { Pill } from '../Pill';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import type { StatGridProps, StatTileProps } from './types';

export function StatTile({
  label,
  value,
  unit,
  caption,
  tone = 'default',
  size = 'md',
  align = 'start',
  pill,
  style,
  testID,
}: StatTileProps) {
  const styles = useThemedStyles(stylesFor);
  const ink = statInkFor(useSemantic())[tone];
  const metrics = STAT_SIZES[size];
  const end = align === 'end';

  return (
    <View testID={testID} style={[styles.tile, end && styles.end, style]}>
      {label || pill ? (
        <View style={styles.labelLine}>
          {label ? (
            <Text style={styles.label} numberOfLines={2} maxFontSizeMultiplier={fontScaleCap.dense}>
              {label.toUpperCase()}
            </Text>
          ) : null}
          {pill ? <Pill {...pill} /> : null}
        </View>
      ) : null}
      <View style={[styles.valueLine, end && styles.valueLineEnd]}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={STAT_MIN_FONT_SCALE}
          maxFontSizeMultiplier={fontScaleCap.dense}
          style={[styles.value, { fontSize: s(metrics.value), color: ink }]}
        >
          {value}
        </Text>
        {unit ? (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={fontScaleCap.dense}
            style={[styles.unit, { fontSize: s(metrics.unit) }]}
          >
            {unit}
          </Text>
        ) : null}
      </View>
      {caption ? (
        <Text style={styles.caption} numberOfLines={2} maxFontSizeMultiplier={fontScaleCap.dense}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

export function StatGrid({ items, style, testID }: StatGridProps) {
  return (
    <View testID={testID} style={[gridStyles.row, style]}>
      {items.map(({ key, ...item }) => (
        <StatTile key={key} {...item} style={gridStyles.cell} />
      ))}
    </View>
  );
}

const gridStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: s(spacing.md) },
  cell: { flex: 1, minWidth: 0 },
});

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable one.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    tile: { gap: s(spacing.xs), minWidth: 0 },
    end: { alignItems: 'flex-end' },
    labelLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: s(spacing.sm),
    },
    label: {
      flexShrink: 1,
      fontFamily: fontFamilyNative.semiBold,
      fontSize: s(fontSize.micro),
      letterSpacing: letterSpacing.label,
      color: t.text.tertiary,
    },
    valueLine: { flexDirection: 'row', alignItems: 'baseline', gap: s(spacing.xs), minWidth: 0 },
    valueLineEnd: { justifyContent: 'flex-end' },
    value: { flexShrink: 1, fontFamily: fontFamilyNative.bold, ...TABULAR },
    unit: { flexShrink: 0, fontFamily: fontFamilyNative.semiBold, color: t.text.secondary },
    caption: {
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.caption),
      lineHeight: s(fontSize.caption) * lineHeight.snug,
      color: t.text.secondary,
    },
  });
