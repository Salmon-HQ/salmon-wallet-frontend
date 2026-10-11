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
import {
  borderWidth,
  CARD_GLOW,
  CARD_PADDINGS,
  CARD_RADII,
  cardTonesFor,
  motionEasing,
  motionMs,
  withAlpha,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { usePressed } from '../../utils/usePressed';
import type { CardProps } from './types';

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
  const t = useSemantic();
  const { background, border } = cardTonesFor(t)[tone];
  const { pressed, handlers } = usePressed();
  const pct = (fraction: number) => `${fraction * 100}%`;
  // The `featured` tone's salmon glow, from its top-right corner.
  const glow =
    tone === 'featured'
      ? `radial-gradient(${pct(CARD_GLOW.rx)} ${pct(CARD_GLOW.ry)} at ${pct(CARD_GLOW.cx)} ${pct(CARD_GLOW.cy)}, ${withAlpha(t.accent.ink, CARD_GLOW.alpha)}, transparent)`
      : undefined;

  const box: React.CSSProperties = {
    boxSizing: 'border-box',
    backgroundColor: background,
    ...(glow ? { backgroundImage: glow } : null),
    borderStyle: 'solid',
    borderWidth: borderWidth.thin,
    borderColor: border,
    borderRadius: CARD_RADII[radius],
    padding: CARD_PADDINGS[padding],
    overflow: 'hidden',
    // `overflow: hidden` turns a flex item's automatic minimum size to zero,
    // so a card in a column that is shorter than its rows (Activity's scroll
    // list) would be squeezed below its own content. A card never shrinks:
    // the list scrolls instead.
    flexShrink: 0,
    // A gap stacks the children, as mobile's View does by default — a bare
    // `display: flex` laid the Market data card's rows out in a row.
    ...(gap != null ? { display: 'flex', flexDirection: 'column', gap } : null),
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
