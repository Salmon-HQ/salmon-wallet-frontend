import type { ReactNode } from 'react';
import type { Testable } from './testable';

/** What every button takes: the press, a string label, and the two states. */
export interface ButtonPropsBase extends Testable {
  onPress: () => void;
  children: string;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * The secondary's inks: the quiet default, danger as an outline, or danger as
 * a fill — the third one for the destructive action that is the only action.
 */
export type SecondaryButtonTone = 'default' | 'danger' | 'danger-fill';

export interface SecondaryButtonPropsBase extends ButtonPropsBase {
  tone?: SecondaryButtonTone;
  /** Announced consequence — the third channel a destructive control needs. */
  accessibilityHint?: string;
  /** Optional glyph before the label. The label stays the accessible name. */
  icon?: ReactNode;
  /**
   * Optional glyph after the label — a caret when the control opens a picker
   * rather than acting directly.
   */
  trailingIcon?: ReactNode;
}

export interface TextButtonPropsBase extends ButtonPropsBase {
  color?: string;
  /** Optional glyph rendered before the label. The label stays the accessible name. */
  icon?: ReactNode;
}
