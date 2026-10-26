/**
 * SheetTitle — the one title style every sheet draws (24 semibold,
 * centred), with the optional subtitle under it in the screen header's
 * subtitle voice, on the DOM.
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

export function SheetTitle({ leading, children, subtitle, style, className }: SheetTitleProps) {
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

  // The subtitle owns the header's outer box when there is one, so the
  // caller's style lands on the whole header either way.
  const outer = subtitle ? undefined : { className, style };
  const heading = !leading ? (
    <span className={outer?.className} style={{ ...title, ...outer?.style }}>
      {children}
    </span>
  ) : (
    <div
      className={outer?.className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        ...outer?.style,
      }}
    >
      {leading}
      <span style={{ ...title, paddingLeft: 0, paddingRight: 0, display: 'inline' }}>
        {children}
      </span>
    </div>
  );
  if (!subtitle) return heading;

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, ...style }}
    >
      {heading}
      <span
        style={{
          display: 'block',
          paddingLeft: spacing.screenGutter,
          paddingRight: spacing.screenGutter,
          fontFamily: fontFamily.sans,
          fontWeight: fontWeight.medium,
          fontSize: fontSize.subtitle,
          lineHeight: fontSize.subtitle * lineHeight.snug + 'px',
          color: t.text.secondary,
          textAlign: 'center',
        }}
      >
        {subtitle}
      </span>
    </div>
  );
}
