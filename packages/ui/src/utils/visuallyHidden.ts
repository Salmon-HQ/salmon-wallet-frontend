/**
 * Styles that hide an element visually while keeping it in the accessibility
 * tree. Use for headings that give screen-reader users orientation on screens
 * where the visual design does not need a rendered title.
 */
import type { CSSProperties } from 'react';

export const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
};
