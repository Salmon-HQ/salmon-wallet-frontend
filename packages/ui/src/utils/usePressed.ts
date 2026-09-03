/**
 * The press state a DOM control needs to draw the feedback RN gets for free.
 *
 * `TouchableOpacity`'s `activeOpacity` and the kit's press scale are both
 * *while pressed* states; CSS `:active` cannot be expressed in the inline
 * style objects the kit is built from, and it also never fires for a
 * keyboard-driven press. So the state is held in React and handed back with
 * the handlers that maintain it — pointer down/up, pointer leave (a press
 * dragged off the control is cancelled, exactly as RN cancels it), and blur.
 */
import { useCallback, useState } from 'react';

export interface PressedState {
  pressed: boolean;
  /** Spread onto the pressable element. */
  handlers: {
    onPointerDown: () => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
    onBlur: () => void;
  };
}

export function usePressed(): PressedState {
  const [pressed, setPressed] = useState(false);
  const down = useCallback(() => setPressed(true), []);
  const up = useCallback(() => setPressed(false), []);

  return {
    pressed,
    handlers: { onPointerDown: down, onPointerUp: up, onPointerLeave: up, onBlur: up },
  };
}
