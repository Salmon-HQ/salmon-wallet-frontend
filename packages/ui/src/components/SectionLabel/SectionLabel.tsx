/**
 * SectionLabel — the three sizes of heading that sit above a block, on the
 * DOM.
 *
 * The mobile twin is `apps/mobile/src/components/SectionLabel/SectionLabel.tsx`;
 * the three variants and their sizes are the same, read from the same
 * `SectionLabelPropsBase` contract. `caps` is announced as a heading exactly
 * as mobile's `accessibilityRole="header"` does, via `role="heading"` — a
 * bare `<span>` carries no heading semantics, and the redesign does not pin a
 * document heading level per variant.
 */
import React from 'react';
import { fontFamily, fontSize, fontWeight, letterSpacing, lineHeight } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import type { SectionLabelProps, SectionLabelVariant } from './types';

const VARIANTS: Record<SectionLabelVariant, React.CSSProperties> = {
  caps: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.micro,
    lineHeight: fontSize.micro * lineHeight.snug + 'px',
    letterSpacing: letterSpacing.label,
  },
  group: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.caption,
    lineHeight: fontSize.caption * lineHeight.snug + 'px',
  },
  title: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.bodyLg,
    lineHeight: fontSize.bodyLg * lineHeight.snug + 'px',
  },
};

export function SectionLabel({ children, variant, style, className, testID }: SectionLabelProps) {
  const t = useSemantic();
  const ink = variant === 'title' ? t.text.primary : t.text.secondary;

  return (
    <span
      data-testid={testID}
      role="heading"
      className={className}
      style={{ ...VARIANTS[variant], color: ink, margin: 0, ...style }}
    >
      {variant === 'caps' ? children.toUpperCase() : children}
    </span>
  );
}
