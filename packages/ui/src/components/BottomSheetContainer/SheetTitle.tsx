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

  const title: React.CSSProperties = {
    margin: 0,
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
      <span style={title}>{children}</span>
    </div>
  );
}
