/**
 * The two text styles every card in the detail draws: a card's title, and
 * the hairline that separates two runs inside one card.
 */
import type { CSSProperties } from 'react';
import {
  borderWidth,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  type Semantic,
} from '@salmon/shared';

export const cardTitleStyle = (t: Semantic): CSSProperties => ({
  margin: 0,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.mono,
  lineHeight: `${fontSize.mono * lineHeight.snug}px`,
  fontWeight: fontWeight.bold,
  color: t.text.primary,
});

export const dividerStyle = (t: Semantic): CSSProperties => ({
  height: borderWidth.thin,
  backgroundColor: t.border.hairline,
});
