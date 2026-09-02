import type { CSSProperties } from 'react';
import type { Testable } from '@salmon/shared';

/**
 * The one plain text field the settings screens draw: a `Card` that happens
 * to hold an `<input>`, the shell mobile's `AccountNamePanel` and the address
 * book fields wear (a `Card` around a `TextInput`, not a hand-drawn box).
 */
export interface TextInputProps extends Testable {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Spoken name. Defaults to the placeholder. */
  accessibilityLabel?: string;
  /** Present ⇒ the card takes the danger edge and the line is drawn under it. */
  error?: string;
  autoFocus?: boolean;
  maxLength?: number;
  /** Enter. */
  onSubmitEditing?: () => void;
  /** Geist Mono: an address is read character by character. */
  mono?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
}
