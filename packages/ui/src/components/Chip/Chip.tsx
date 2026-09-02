/**
 * Chip — a small pill that either labels something or filters it, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/Chip/Chip.tsx`; the two
 * variants, two sizes, and the selected ink-well treatment are the same,
 * read from the same `ChipPropsBase` contract. Only the drawing differs: a
 * `div`, or a `button` when the chip is pressable, and the press feedback
 * `usePressed` gives the DOM in place of `activeOpacity`.
 */
import React from 'react';
import {
  borderRadius,
  borderWidth,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  motionEasing,
  motionMs,
  spacing,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { usePressed } from '../../utils/usePressed';
import type { ChipProps, ChipSize } from './types';

const SIZES: Record<
  ChipSize,
  { paddingVertical: number; paddingHorizontal: number; font: number }
> = {
  sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, font: fontSize.micro },
  md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, font: fontSize.body },
};

/** Ground and edge, filter idle/selected and outline — the mobile record, unchanged. */
const tonesFor = (t: Semantic) => ({
  outline: { background: 'transparent', border: t.border.raised },
  filterIdle: { background: 'transparent', border: t.border.hairline },
  // The selected filter is the inverse well, not a louder fill — see Chip.tsx (mobile).
  filterSelected: { background: t.depth.abyss, border: t.border.strong },
});

export function Chip({
  label,
  selected = false,
  onPress,
  size = 'md',
  variant = 'filter',
  leadingIcon,
  accessibilityLabel,
  style,
  className,
  testID,
}: ChipProps) {
  const t = useSemantic();
  const { pressed, handlers } = usePressed();
  const metrics = SIZES[size];
  const isSelected = variant === 'filter' && selected;
  const tones = tonesFor(t);
  const tone =
    variant === 'outline' ? tones.outline : isSelected ? tones.filterSelected : tones.filterIdle;

  const box: React.CSSProperties = {
    boxSizing: 'border-box',
    display: 'inline-flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.full,
    borderStyle: 'solid',
    borderWidth: borderWidth.thin,
    borderColor: tone.border,
    backgroundColor: tone.background,
    paddingTop: metrics.paddingVertical,
    paddingBottom: metrics.paddingVertical,
    paddingLeft: metrics.paddingHorizontal,
    paddingRight: metrics.paddingHorizontal,
    ...style,
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.bold,
    fontSize: metrics.font,
    letterSpacing: letterSpacing.label,
    color: isSelected ? t.text.primary : t.text.secondary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const body = (
    <>
      {leadingIcon}
      <span style={labelStyle}>{label}</span>
    </>
  );

  if (!onPress) {
    return (
      <div data-testid={testID} className={className} style={box}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid={testID}
      aria-label={accessibilityLabel ?? label}
      aria-pressed={isSelected}
      onClick={onPress}
      className={className}
      {...handlers}
      style={{
        ...box,
        font: 'inherit',
        color: 'inherit',
        cursor: 'pointer',
        opacity: pressed ? 0.7 : 1,
        transition: `opacity ${motionMs.flick}ms ${motionEasing.current.css}`,
      }}
    >
      {body}
    </button>
  );
}
