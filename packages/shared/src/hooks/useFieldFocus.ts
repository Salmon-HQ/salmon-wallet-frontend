/**
 * Whether a text field is being typed into.
 *
 * The DOM answers this in CSS — one `:focus-within` rule in the global
 * baseline recolours whichever box wears the field-shell class. React Native
 * has no such selector: every box has to be told, so the state it is told
 * from lives here rather than being re-declared in each field.
 *
 * What the state is *for* is the same on both platforms, and worth stating
 * once: while a field is focused its box draws its edge in `accent.ink`, and
 * a verdict already on the field — an error, a validated address, a wrong
 * seed word — outranks that, because a red box that turns coral on focus
 * stops reporting the fault the moment the user goes to fix it.
 */
import { useCallback, useMemo, useState } from 'react';

export interface FieldFocus {
  /** True while the field has the keyboard. */
  focused: boolean;
  /** Bind to the field's `onFocus`. */
  onFocus: () => void;
  /** Bind to the field's `onBlur`. */
  onBlur: () => void;
}

export function useFieldFocus(): FieldFocus {
  const [focused, setFocused] = useState(false);
  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback(() => setFocused(false), []);
  return useMemo(() => ({ focused, onFocus, onBlur }), [focused, onFocus, onBlur]);
}
