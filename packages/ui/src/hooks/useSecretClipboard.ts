/**
 * The clipboard for recovery phrases and private keys on the DOM: a copy
 * through `secretClipboard` is cleared 60 s later while the panel is open, or
 * when the user comes back to it after that (`createSecretClipboard`). Mount
 * `useSecretClipboardResume` once, at the app root.
 *
 * The extension holds `clipboardRead`, so it reads the clipboard without a
 * prompt and leaves alone what the user copied since. A browser refuses the
 * clipboard to a page out of focus, so a clear that fails there runs again on
 * the next return.
 */
import { useEffect } from 'react';
import { createSecretClipboard } from '@salmon/shared';

export const secretClipboard = createSecretClipboard({
  write: (text) => navigator.clipboard.writeText(text),
  clear: () => navigator.clipboard.writeText(''),
  holds: async (text) => (await navigator.clipboard.readText()) === text,
});

/** Clears a secret copied 60 s ago or more, on load and on every return. */
export function useSecretClipboardResume(): void {
  useEffect(() => {
    const resume = () => {
      if (document.visibilityState === 'visible') void secretClipboard.resume();
    };
    resume();
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);
}
