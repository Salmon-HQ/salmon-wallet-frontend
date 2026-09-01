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
import { borderRadius, borderWidth, s, spacing, type Semantic } from '@salmon/shared';

import { useSemantic } from '../../theme/useThemedStyles';
import type { CardPadding, CardProps, CardRadius, CardTone } from './types';

/**
 * Ground and edge per tone. Every border is the decorative hairline except
 * `warning`, which keeps the amber stroke the tint ships with.
 *
 * `surface` grounds on the thin-tier membrane rather than the opaque
 * `surface.raised` (2026-09-01, owner: what lies under a card must show
 * through a little) — the water column's scales read faintly behind every
 * token row and content card built on `Card`/`ListRow`.
 */
const tonesFor = (t: Semantic): Record<CardTone, { background: string; border: string }> => ({
  surface: { background: t.surface.membraneThin, border: t.border.hairline },
  accent: { background: t.accent.tint, border: t.border.hairline },
  warning: { background: t.status.warningTint, border: t.status.warningTintBorder },
  ink: { background: t.depth.abyss, border: t.border.hairline },
});

/**
 * `md` is 14: the spacing scale steps 12 → 16 with nothing between, and the
 * dense list row the frames draw sits on the half step. Named here rather
 * than spelled at a call site so it moves in one place if the scale gains it.
 */
const PADDING_MD = 14;

const PADDINGS: Record<CardPadding, number> = {
  sm: spacing.md,
  md: PADDING_MD,
  lg: spacing.lg,
  xl: spacing['2xl'],
};

const RADII: Record<CardRadius, number> = {
  lg: borderRadius.r3,
  xl: borderRadius.r4,
};

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
  const { background, border } = tonesFor(useSemantic())[tone];
  const box = [
    styles.card,
    {
      backgroundColor: background,
      borderColor: border,
      borderRadius: RADII[radius],
      padding: s(PADDINGS[padding]),
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
