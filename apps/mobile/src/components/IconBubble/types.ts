import type { ComponentType, ReactNode } from 'react';
import type { Insets, StyleProp, ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { Testable } from '@salmon/shared';

/**
 * The bubble sizes the redesign draws. A closed union rather than `number`:
 * every bubble in the product is one of these nine, and a tenth would be a
 * design decision rather than a call-site one.
 *
 * 24 is the smallest step — the balance eye toggle, which is a glyph in a
 * touch box rather than a drawn well.
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
 *
 * `outline` is a hairline edge with nothing behind it, for the secondary half
 * of a pair whose primary is `accent` (Receive beside Send, portfolio
 * visibility beside the tabs). `ghost` drops the edge too — a bare glyph in a
 * touch box, for a control that must not read as an object at all (the
 * balance eye toggle).
 */
export type IconBubbleTone =
  | 'ink'
  | 'accent'
  | 'accent-tint'
  | 'surface'
  | 'success-tint'
  | 'outline'
  | 'ghost';

/** The shape of a glyph component from `src/icons.ts` (Phosphor) or a local SVG. */
export interface IconGlyphProps {
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}

export interface IconBubbleProps extends Testable {
  size: IconBubbleSize;
  shape?: IconBubbleShape;
  /** Corner for `shape: 'rounded'`. Defaults to `xl` (16). */
  radius?: IconBubbleRadius;
  tone: IconBubbleTone;
  /**
   * The glyph component itself, not a name: the icon set is deep-imported per
   * glyph so Metro never pulls all ~1,500, and a name→component registry here
   * would undo that. The bubble owns the colour, the caller owns the drawing.
   */
  icon?: ComponentType<IconGlyphProps>;
  /** Defaults to just under half the bubble, which is the drawn ratio. */
  iconSize?: number;
  /** Phosphor stroke weight for `icon`. Defaults to the glyph's own default. */
  iconWeight?: IconGlyphProps['weight'];
  /**
   * Overrides the ink the tone would draw. A token value only — the escape
   * hatch exists for a control whose glyph is deliberately quieter than its
   * neighbour on the same tone (the portfolio visibility button beside the
   * Receive circle), not for picking a colour per call site.
   */
  iconColor?: string;
  /** A letter, an initial, a logo — anything the `icon` prop cannot express. */
  children?: ReactNode;
  /**
   * Present ⇒ the bubble is a button: it takes `accessibilityRole="button"`,
   * the press scale + specular of every other control, and (on `accent`) the
   * flesh texture. Absent ⇒ it is the inert well it has always been.
   */
  onPress?: () => void;
  /**
   * Pressable only. A disabled bubble drops to the crest ground with disabled
   * ink — the salmon is either alive or absent, never dimmed.
   */
  disabled?: boolean;
  /**
   * The myoseptal texture inside a salmon fill. Defaults to on for any
   * `accent` bubble, pressable or not (a filled control is mass), and off
   * everywhere else.
   */
  flesh?: boolean;
  /**
   * Pressable only. A bubble under 44pt needs slop to clear the platform touch
   * minimum; the bubble cannot infer how much without knowing its neighbours.
   */
  hitSlop?: Insets;
  /**
   * A rotation in degrees the caller drives itself (the powerups FAB turns its
   * plus into a close mark). It is a shared value rather than a style because
   * the bubble's press scale and this rotation are one `transform` array: two
   * styles each writing `transform` do not merge, the last one wins, and the
   * caller's rotation is the one that silently disappeared.
   */
  rotation?: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}
