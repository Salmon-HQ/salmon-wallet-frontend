/**
 * Pill — a short read-only label on a tinted capsule: an APY, a change over a
 * period, a status. Never a control; a choice is a `Chip`. DOM twin:
 * `packages/ui/src/components/Pill`.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  borderRadius,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  pillColorsFor,
  s,
  spacing,
  vs,
} from '@salmon/shared';

import { powerupIcons } from '../../icons';
import { useSemantic } from '../../theme/useThemedStyles';
import type { PillProps } from './types';

const DOT = spacing.sm - spacing.xxs;

export function Pill({ label, tone, icon, dot, style, testID }: PillProps) {
  const { ink, ground } = pillColorsFor(useSemantic())[tone];
  const Glyph = icon ? powerupIcons[icon] : null;

  return (
    <View testID={testID} style={[styles.pill, { backgroundColor: ground }, style]}>
      {dot ? (
        <View testID={testID && `${testID}-dot`} style={[styles.dot, { backgroundColor: ink }]} />
      ) : null}
      {Glyph ? <Glyph size={s(fontSize.label)} color={ink} weight="bold" /> : null}
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={fontScaleCap.chrome}
        style={[styles.label, { color: ink }]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: s(spacing.xs),
    paddingVertical: vs(spacing.xs),
    paddingHorizontal: s(spacing.sm),
    borderRadius: borderRadius.full,
  },
  dot: { width: s(DOT), height: s(DOT), borderRadius: borderRadius.full },
  label: { fontFamily: fontFamilyNative.semiBold, fontSize: s(fontSize.label) },
});
