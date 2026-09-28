import type { CSSProperties } from 'react';
import type { IconBubblePropsBase } from '@salmon/shared';

export type {
  IconBubbleRadius,
  IconBubbleShape,
  IconBubbleSize,
  IconBubbleTone,
  IconGlyphProps,
} from '@salmon/shared';

/**
 * The DOM half of `IconBubblePropsBase`: the contract plus a style. `hitSlop`
 * and `rotation` are RN-only (a shared-value transform driven by Reanimated)
 * and stay off this contract — the DOM control is a real `<button>` with its
 * own hit area, and a caller-driven rotation has no DOM twin in this lot.
 */
export interface IconBubbleProps extends IconBubblePropsBase {
  style?: CSSProperties;
  className?: string;
  /**
   * A pointer-only convenience: out of the accessibility tree and out of the
   * tab order, for a control that duplicates something the keyboard already
   * reaches another way. DOM-only — a phone has no pointer to serve and no
   * tab order to leave.
   */
  decorative?: boolean;
}
