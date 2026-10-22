/**
 * The clipboard for recovery phrases and private keys on mobile: a copy
 * through `secretClipboard` is cleared 60 s later while the app is open, or
 * when the user comes back to the app after that (`createSecretClipboard`).
 * Mount `useSecretClipboardResume` once, at the root.
 *
 * The clear never reads the clipboard first: on iOS that shows a paste prompt
 * when another app wrote it, and on Android a "pasted from your clipboard"
 * notice. Android 13+ can also keep a copied secret out of the clipboard
 * preview (`ClipDescription.EXTRA_IS_SENSITIVE`), but the installed
 * expo-clipboard (SDK 57) has no option for it — `android.isSensitive`
 * arrives in SDK 58, a native upgrade — so it is not set.
 */
import * as Clipboard from 'expo-clipboard';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { createSecretClipboard } from '@salmon/shared';

export const secretClipboard = createSecretClipboard({
  write: (text) => Clipboard.setStringAsync(text),
  clear: () => Clipboard.setStringAsync(''),
});

/** Clears a secret copied 60 s ago or more, on launch and on every return. */
export function useSecretClipboardResume(): void {
  useEffect(() => {
    void secretClipboard.resume();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void secretClipboard.resume();
    });
    return () => subscription.remove();
  }, []);
}
