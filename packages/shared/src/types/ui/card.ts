import type { ReactNode } from 'react';

import type { Testable } from './testable';

/**
 * The four grounds a card can take.
 *
 * `surface` is the default membrane every list item, receipt and content box
 * sits on; `accent` is the salmon tint; `warning` the amber notice wash;
 * `ink` the inverse well used for a featured block that must read as a
 * different object rather than a louder one.
 */
export type CardTone = 'surface' | 'accent' | 'warning' | 'ink';

/** 12 / 14 / 16 / 24 — the four internal paddings the redesign draws. */
export type CardPadding = 'sm' | 'md' | 'lg' | 'xl';

/** `lg` is the 12px control radius, `xl` the 16px card radius. */
export type CardRadius = 'lg' | 'xl';

/**
 * Card — the one content container the redesign composes everything from,
 * platform-agnostic. Each platform adds its own style prop.
 */
export interface CardPropsBase extends Testable {
  tone?: CardTone;
  padding?: CardPadding;
  /** Gap between children, in px. Use a `spacing` token at the call site. */
  gap?: number;
  radius?: CardRadius;
  /** When present the card becomes a button and takes the pressed feedback. */
  onPress?: () => void;
  /**
   * Announced role when pressable. Defaults to `button`; pass `link` for a
   * row whose press opens an external URL, so it announces as a link rather
   * than an action.
   */
  accessibilityRole?: 'button' | 'link';
  accessibilityLabel?: string;
  children?: ReactNode;
}
