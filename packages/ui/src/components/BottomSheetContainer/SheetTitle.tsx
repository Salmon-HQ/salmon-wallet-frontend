/**
 * SheetTitle — the one hand-drawn title style every sheet draws (24
 * semibold, centred), on the DOM.
 *
 * The mobile twin is
 * `apps/mobile/src/components/BottomSheetContainer/SheetTitle.tsx`; same
 * size, weight and centring, read from the same `SheetTitlePropsBase`
 * contract. Mobile sets no `accessibilityRole` on this title, so it stays a
 * plain `<span>` here too — the sheet's own `aria-labelledby` is what
 * associates it with the dialog, not a heading role.
 */
import React from 'react';
import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  spacing,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import type { SheetTitleProps } from './types';

export function SheetTitle({ leading, children, style, className }: SheetTitleProps) {
  const t = useSemantic();

  // A `<span>` is inline and centres nothing; mobile's `Text` is a block
  // that spans the sheet, so the title centres on it. The gutter keeps a
  // long title off the sheet's edges when it wraps.
  const title: React.CSSProperties = {
    display: 'block',
    margin: 0,
    paddingLeft: spacing.screenGutter,
    paddingRight: spacing.screenGutter,
    boxSizing: 'border-box',
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.headline,
    color: t.text.primary,
    textAlign: 'center',
    letterSpacing: letterSpacing.snug,
    lineHeight: fontSize.headline * lineHeight.condensed + 'px',
  };

  if (!leading) {
    return (
      <span className={className} style={{ ...title, ...style }}>
        {children}
      </span>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        ...style,
      }}
    >
      {leading}
      <span style={{ ...title, paddingLeft: 0, paddingRight: 0, display: 'inline' }}>
        {children}
      </span>
    </div>
  );
}
