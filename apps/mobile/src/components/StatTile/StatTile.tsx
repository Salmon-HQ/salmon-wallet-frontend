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
  note,
  style,
  testID,
}: StatTileProps) {
  const styles = useThemedStyles(stylesFor);
  const t = useSemantic();
  const metrics = STAT_SIZES[size];
  const end = align === 'end';

  const figure = (
    <>
      {label ? (
        <Text style={styles.label} numberOfLines={2} maxFontSizeMultiplier={fontScaleCap.dense}>
          {label.toUpperCase()}
        </Text>
      ) : null}
      <View style={[styles.valueLine, end && styles.valueLineEnd]}>
        {/* One line of text holds the figure and its unit: shrinking to fit,
            Android sizes a lone Text to the room it was given, which left the
            unit a gap away from the figure. */}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={STAT_MIN_FONT_SCALE}
          maxFontSizeMultiplier={fontScaleCap.dense}
          style={styles.line}
        >
          <Text style={[styles.value, { fontSize: s(metrics.value), color: statInkFor(t)[tone] }]}>
            {value}
          </Text>
          {unit ? <Text style={[styles.unit, { fontSize: s(metrics.unit) }]}> {unit}</Text> : null}
        </Text>
        {note ? (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={fontScaleCap.dense}
            style={[
              styles.note,
              { color: note.tone === 'accent' ? t.accent.ink : t.text.secondary },
            ]}
          >
            {note.text}
          </Text>
        ) : null}
      </View>
      {caption ? (
        <Text style={styles.caption} numberOfLines={2} maxFontSizeMultiplier={fontScaleCap.dense}>
          {caption}
        </Text>
      ) : null}
    </>
  );

  if (!pill)
    return (
      <View testID={testID} style={[styles.tile, end && styles.end, style]}>
        {figure}
      </View>
    );
  return (
    <View testID={testID} style={[styles.withPill, style]}>
      <View style={[styles.tile, end && styles.end, styles.body]}>{figure}</View>
      <Pill {...pill} />
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

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    tile: { gap: s(spacing.xs), minWidth: 0 },
    end: { alignItems: 'flex-end' },
    // A pill sits beside the figure, centred on it both ways.
    withPill: { flexDirection: 'row', alignItems: 'center', gap: s(spacing.md), minWidth: 0 },
    body: { flex: 1 },
    label: {
      flexShrink: 1,
      fontFamily: fontFamilyNative.semiBold,
      fontSize: s(fontSize.micro),
      letterSpacing: letterSpacing.label,
      color: t.text.tertiary,
    },
    valueLine: { flexDirection: 'row', alignItems: 'baseline', gap: s(spacing.xs), minWidth: 0 },
    valueLineEnd: { justifyContent: 'flex-end' },
    // Proportional digits: a lone figure reads in the font's own widths; table
    // columns (tabular) would space "46,045.71" out like a ledger.
    line: { flexShrink: 1 },
    value: { fontFamily: fontFamilyNative.bold },
    unit: { fontFamily: fontFamilyNative.semiBold, color: t.text.secondary },
    note: {
      flexShrink: 0,
      marginLeft: 'auto',
      fontFamily: fontFamilyNative.semiBold,
      fontSize: s(fontSize.caption),
    },
    caption: {
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.caption),
      lineHeight: s(fontSize.caption) * lineHeight.snug,
      color: t.text.secondary,
    },
  });
