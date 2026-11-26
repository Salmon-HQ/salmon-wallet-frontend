/**
 * SheetTitle — the one title style every sheet draws (24 semibold,
 * centred), with the optional subtitle under it in the screen header's
 * subtitle voice, on the DOM.
 *
 * The mobile twin is
 * `apps/mobile/src/components/BottomSheetContainer/SheetTitle.tsx`; same
 * size, weight and centring, read from the same `SheetTitlePropsBase`
 * contract. The title is the sheet's name: it carries the id the sheet's
 * `<dialog>` points at with `aria-labelledby`, so a screen reader opening the
 * sheet reads it (the subtitle stays out of the name).
 */
import React, { createContext, useContext } from 'react';
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

/** The id `BottomSheetContainer` names its dialog by. */
export const SheetTitleIdContext = createContext<string | undefined>(undefined);

export function SheetTitle({ leading, children, subtitle, style, className }: SheetTitleProps) {
  const t = useSemantic();
  const id = useContext(SheetTitleIdContext);

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
    <span id={id} className={outer?.className} style={{ ...title, ...outer?.style }}>
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
      <span id={id} style={{ ...title, paddingLeft: 0, paddingRight: 0, display: 'inline' }}>
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
