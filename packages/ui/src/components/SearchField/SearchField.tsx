/**
 * SearchField — the magnifier pill a list filters itself through, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/SearchField/SearchField.tsx`:
 * raised ground, full radius, a 44 height, the mono size the `.pen` draws the
 * query in. `onChangeText` maps to `<input type="search">`'s `onChange`, and
 * `placeholder` doubles as the accessible name unless `accessibilityLabel`
 * overrides it.
 */
import React from 'react';
import {
  borderRadius,
  fontFamily,
  fontSize,
  fontWeight,
  spacing,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { MagnifyingGlassIcon } from '../../icons';
import type { SearchFieldProps } from './types';

/** The pill's magnifier. */
const GLYPH_SIZE = 18;
const PILL_HEIGHT = 44;

export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  style,
  className,
  testID,
}: SearchFieldProps) {
  const t: Semantic = useSemantic();

  const pill: React.CSSProperties = {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    height: PILL_HEIGHT,
    borderRadius: borderRadius.full,
    backgroundColor: t.surface.raised,
    ...style,
  };

  return (
    <div className={className} style={pill}>
      <MagnifyingGlassIcon size={GLYPH_SIZE} color={t.text.secondary} />
      <input
        type="search"
        data-testid={testID}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          padding: 0,
          fontFamily: fontFamily.sans,
          fontWeight: fontWeight.medium,
          fontSize: fontSize.mono,
          color: t.text.primary,
        }}
        value={value}
        onChange={(event) => onChangeText(event.target.value)}
        placeholder={placeholder}
        aria-label={accessibilityLabel ?? placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        enterKeyHint="search"
      />
    </div>
  );
}
