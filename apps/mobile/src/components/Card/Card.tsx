/**
 * Card — the one content container the redesign composes everything from.
 *
 * A list item, a receipt, a chart box, a QR well and a permissions block are
 * the same object with a different tone and padding, so they are one
 * component: nothing else in `apps/mobile` should be re-deriving a background,
 * a radius and a hairline by hand.
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { borderWidth, CARD_PADDINGS, CARD_RADII, cardTonesFor, s } from '@salmon/shared';

import { useSemantic } from '../../theme/useThemedStyles';
import type { CardProps } from './types';

export function Card({
  tone = 'surface',
  padding = 'lg',
  gap,
  radius = 'xl',
  onPress,
  accessibilityRole = 'button',
  accessibilityLabel,
  style,
  children,
  testID,
}: CardProps) {
  // A record of strings, not a stylesheet: built at render through
  // `useSemantic` rather than cached by `useThemedStyles`, which is for
  // `StyleSheet.create` blocks only.
  const { background, border } = cardTonesFor(useSemantic())[tone];
  const box = [
    styles.card,
    {
      backgroundColor: background,
      borderColor: border,
      borderRadius: CARD_RADII[radius],
      padding: s(CARD_PADDINGS[padding]),
    },
    gap != null && { gap: s(gap) },
    style,
  ];

  if (!onPress) {
    return (
      <View testID={testID} style={box} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    );
  }

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      activeOpacity={0.7}
      style={box}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: borderWidth.thin,
    overflow: 'hidden',
  },
});
