import type { ComponentType, ReactNode } from 'react';

import type { Testable } from './testable';

/**
 * The bubble sizes the redesign draws. A closed union rather than `number`:
 * every bubble in the product is one of these nine, and a tenth would be a
 * design decision rather than a call-site one.
 */
export type IconBubbleSize = 24 | 36 | 38 | 40 | 42 | 44 | 48 | 76 | 88;

/** `rounded` takes a card corner (see `IconBubbleRadius`); `circle` is the pill. */
export type IconBubbleShape = 'circle' | 'rounded';

/**
 * The two card corners a rounded bubble can take, named as `Card` names them:
 * `lg` = 12, `xl` = 16. Ignored when `shape` is `circle`.
 */
export type IconBubbleRadius = 'lg' | 'xl';

/**
 * The seven grounds a bubble can take. Each one also decides the ink drawn on
 * it, so a call site never picks a colour — it picks a role.
 */
export type IconBubbleTone =
  'ink' | 'accent' | 'accent-tint' | 'surface' | 'success-tint' | 'outline' | 'ghost';

/** The shape of a glyph component (Phosphor, on either platform). */
export interface IconGlyphProps {
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}

export interface IconBubblePropsBase extends Testable {
  size: IconBubbleSize;
  shape?: IconBubbleShape;
  /** Corner for `shape: 'rounded'`. Defaults to `xl` (16). */
  radius?: IconBubbleRadius;
  tone: IconBubbleTone;
  /**
   * The glyph component itself, not a name: the icon set is deep-imported per
   * glyph, and a name→component registry here would undo that. The bubble owns
   * the colour, the caller owns the drawing.
   */
  icon?: ComponentType<IconGlyphProps>;
  /** Defaults to just under half the bubble, which is the drawn ratio. */
  iconSize?: number;
  /** Phosphor stroke weight for `icon`. Defaults to the glyph's own default. */
  iconWeight?: IconGlyphProps['weight'];
  /** Overrides the ink the tone would draw. A token value only. */
  iconColor?: string;
  /** A letter, an initial, a logo — anything the `icon` prop cannot express. */
  children?: ReactNode;
  /** Present ⇒ the bubble is a button, with the press feedback of a control. */
  onPress?: () => void;
  /** Pressable only. A disabled bubble drops to the crest ground with disabled ink. */
  disabled?: boolean;
  /**
   * The myoseptal texture inside a salmon fill. Defaults to on for any
   * `accent` bubble, pressable or not, and off everywhere else.
   */
  flesh?: boolean;
  accessibilityLabel?: string;
  /** Pressable only. Announces the press's consequence, the third state channel. */
  accessibilityHint?: string;
}
