/**
 * SectionLabel — the three sizes of heading that sit above a block.
 *
 * They are one component because the screens choose between them constantly
 * and the difference is entirely typographic; three loose `Text` styles per
 * screen is how a type scale drifts.
 */
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import {
  fontFamilyNative,
  fontSize,
  letterSpacing,
  lineHeight,
  s,
  type Semantic,
} from '@salmon/shared';

import { useThemedStyles } from '../../theme/useThemedStyles';
import type { SectionLabelProps } from './types';

export function SectionLabel({ children, variant, style, testID }: SectionLabelProps) {
  const styles = useThemedStyles(stylesFor);

  return (
    <Text testID={testID} accessibilityRole="header" style={[styles[variant], style]}>
      {variant === 'caps' ? children.toUpperCase() : children}
    </Text>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    caps: {
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.micro),
      lineHeight: s(fontSize.micro) * lineHeight.snug,
      letterSpacing: letterSpacing.label,
      color: t.text.secondary,
    },
    group: {
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.caption),
      lineHeight: s(fontSize.caption) * lineHeight.snug,
      color: t.text.secondary,
    },
    title: {
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.bodyLg),
      lineHeight: s(fontSize.bodyLg) * lineHeight.snug,
      color: t.text.primary,
    },
  });
