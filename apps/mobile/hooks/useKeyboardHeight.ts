import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Height of the on-screen keyboard in px, or 0 while it is hidden.
 *
 * Android always reports 0 on purpose: `AndroidManifest.xml` declares
 * `windowSoftInputMode="adjustResize"`, so the window itself shrinks and
 * bottom-anchored chrome lifts without any manual inset. Only iOS floats the
 * keyboard over the app, so only iOS needs the measurement.
 *
 * Use this for absolutely-positioned CTAs, which `KeyboardAvoidingView`
 * cannot move because they are out of normal layout flow.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const showSubscription = Keyboard.addListener('keyboardWillShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return keyboardHeight;
}

export default useKeyboardHeight;

/**
 * Whether the on-screen keyboard is up, on both platforms.
 *
 * One signal for the whole onboarding flow, rather than each screen deciding
 * for itself: the slot grid collapses the mark and the description while the
 * keyboard is open, and that collapse has to be identical everywhere or it
 * becomes another way for the furniture to move.
 *
 * `did*` rather than `will*` because Android only ever emits the `did` pair.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
