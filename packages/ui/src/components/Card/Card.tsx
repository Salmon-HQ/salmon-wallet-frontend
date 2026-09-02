/**
 * Card — the one content container the redesign composes everything from, on
 * the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/Card/Card.tsx`; the anatomy,
 * the four tones, the four paddings and the two radii are the same, read from
 * the same `CardPropsBase` contract. Only the drawing differs: a `div`, or a
 * `button` when the card is pressable, and the press feedback that
 * `TouchableOpacity`'s `activeOpacity` gives mobile for free.
 */
import React from 'react';
import { borderRadius, borderWidth, motionEasing, motionMs, spacing } from '@salmon/shared';
import type { CardPadding, CardRadius, CardTone, Semantic } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { usePressed } from '../../utils/usePressed';
import type { CardProps } from './types';

/**
 * Ground and edge per tone — the mobile record, unchanged. Every border is the
 * decorative hairline except `warning`, which keeps the amber stroke the tint
 * ships with. `surface` grounds on the thin-tier membrane rather than the
 * opaque raised surface, so the water column's scales read faintly behind
 * every card.
 */
const tonesFor = (t: Semantic): Record<CardTone, { background: string; border: string }> => ({
  surface: { background: t.surface.membraneThin, border: t.border.hairline },
  accent: { background: t.accent.tint, border: t.border.hairline },
  warning: { background: t.status.warningTint, border: t.status.warningTintBorder },
  ink: { background: t.depth.abyss, border: t.border.hairline },
});

/**
 * `md` is 14: the spacing scale steps 12 → 16 with nothing between, and the
 * dense list row sits on the half step.
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

/** The pressed opacity is RN's `activeOpacity`, to the digit. */
const PRESSED_OPACITY = 0.7;

export function Card({
  tone = 'surface',
  padding = 'lg',
  gap,
  radius = 'xl',
  onPress,
  accessibilityRole = 'button',
  accessibilityLabel,
  style,
  className,
  children,
  testID,
}: CardProps) {
  const { background, border } = tonesFor(useSemantic())[tone];
  const { pressed, handlers } = usePressed();

  const box: React.CSSProperties = {
    boxSizing: 'border-box',
    backgroundColor: background,
    borderStyle: 'solid',
    borderWidth: borderWidth.thin,
    borderColor: border,
    borderRadius: RADII[radius],
    padding: PADDINGS[padding],
    overflow: 'hidden',
    ...(gap != null ? { display: 'flex', gap } : null),
    ...style,
  };

  if (!onPress) {
    return (
      <div data-testid={testID} aria-label={accessibilityLabel} className={className} style={box}>
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid={testID}
      role={accessibilityRole === 'link' ? 'link' : undefined}
      aria-label={accessibilityLabel}
      onClick={onPress}
      className={className}
      {...handlers}
      style={{
        ...box,
        font: 'inherit',
        color: 'inherit',
        textAlign: 'inherit',
        cursor: 'pointer',
        width: '100%',
        opacity: pressed ? PRESSED_OPACITY : 1,
        transition: `opacity ${motionMs.flick}ms ${motionEasing.current.css}`,
      }}
    >
      {children}
    </button>
  );
}
