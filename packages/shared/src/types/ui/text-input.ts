/**
 * The one plain text field both platforms draw: a `Card` that happens to hold
 * an input, not a hand-drawn box. Mobile's `AccountNamePanel`, the address
 * book fields and the add-account steps used to redraw that shell each time,
 * which is how they ended up answering focus differently from each other.
 */
import type { Testable } from './testable';

export interface TextInputPropsBase extends Testable {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Spoken name. Defaults to the placeholder. */
  accessibilityLabel?: string;
  /** Present ⇒ the card takes the danger edge and the line is drawn under it. */
  error?: string;
  autoFocus?: boolean;
  maxLength?: number;
  /** Enter / the keyboard's return key. */
  onSubmitEditing?: () => void;
  /** Geist Mono: an address is read character by character. */
  mono?: boolean;
  disabled?: boolean;
}
