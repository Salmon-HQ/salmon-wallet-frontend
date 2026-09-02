/**
 * What the four approval views share that the kit does not already carry:
 * two typography styles and the card's head row. Everything else the gate
 * draws is a kit piece — `OnboardingLayout` on bedrock, `Card`, `ListRow`,
 * `KeyValueRow`, `SectionLabel`, `WarningNotice`, the buttons.
 */
import React from 'react';
import {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  spacing,
  type Semantic,
} from '@salmon/shared';

import { iconSize } from '../../icons';
import type { IconComponent } from '../../icons';
import { useSemantic } from '../../theme/ThemeProvider';
import { SectionLabel } from '../SectionLabel';

/** Body copy: a hint under a card's fields, a note over the hold. */
export const bodyText = (t: Semantic): React.CSSProperties => ({
  margin: 0,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.body,
  lineHeight: `${fontSize.body * lineHeight.normal}px`,
  color: t.text.secondary,
  overflowWrap: 'anywhere',
});

/** Verbatim signing content — the scanning face, wrapped, never clipped. */
export const monoText = (t: Semantic): React.CSSProperties => ({
  margin: 0,
  fontFamily: fontFamily.mono,
  fontSize: fontSize.mono,
  fontWeight: fontWeight.regular,
  lineHeight: `${fontSize.mono * lineHeight.relaxed}px`,
  color: t.text.primary,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
});

/** The head row of every approval card: a glyph and the group label. */
export function CardHead({ icon: Icon, label }: { icon: IconComponent; label: string }) {
  const t = useSemantic();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
      <Icon size={iconSize.sm} color={t.text.secondary} />
      <SectionLabel variant="group">{label}</SectionLabel>
    </div>
  );
}

/** A card's column: the kit `Card` takes a gap, this is the direction. */
export const cardColumn: React.CSSProperties = { flexDirection: 'column' };
