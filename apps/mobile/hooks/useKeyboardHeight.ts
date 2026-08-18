import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Height of the on-screen keyboard in px, or 0 while it is hidden.
 *
 * Use this for anything the keyboard can cover: absolutely-positioned CTAs,
 * which `KeyboardAvoidingView` cannot move because they are out of normal
 * layout flow, and layouts that have to give up height rather than be sat on.
 *
 * **Android reports a real height too, and used to report 0.** The assumption
 * behind the zero was that `AndroidManifest.xml` declares
 * `windowSoftInputMode="adjustResize"`, so the window shrinks by itself and no
 * manual inset is needed. That declaration is still there, but under the
 * edge-to-edge display the platform now forces, the window no longer resizes —
 * measured on a Pixel 9 Pro, the layout stayed 876dp with the keyboard up. So
 * every consumer that lifted something by this value was lifting it by nothing
 * on Android, and the thing stayed behind the keyboard. It is one measurement
 * for both platforms now.
 *
 * `will*` on iOS so the lift starts with the keyboard's own animation; `did*`
 * on Android, which is the only pair it emits.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
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

