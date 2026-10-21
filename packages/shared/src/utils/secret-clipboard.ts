/**
 * Copying a recovery phrase or a private key, with the clipboard cleared
 * afterwards.
 *
 * Anything on this device can read the clipboard, and some systems keep a
 * history of it, so a copied secret must not stay there. Salmon clears it
 * `SECRET_CLIPBOARD_CLEAR_MS` after the copy while the app is open, or when
 * the user comes back to the app after that — timers do not run in a
 * suspended app or a closed extension panel. The time of the copy is stored
 * so a restart still clears it; the secret itself never is.
 *
 * The clear is skipped when the clipboard no longer holds the secret, but
 * only where the platform can tell without asking the user (`holds`): on iOS
 * reading another app's clipboard shows a paste prompt, and on Android a
 * "pasted from your clipboard" notice. Without that, Salmon clears whatever
 * is there, because it copied a secret it has not cleared yet.
 *
 * Each platform builds one instance with its own clipboard calls and runs
 * `resume` when the app starts and whenever it comes back to the foreground.
 *
 * @module utils/secret-clipboard
 */
import { getStorageItem, removeStorageItem, setStorageItem } from '../storage/storage';
import { STORAGE_KEYS } from '../storage/types';

/** How long a copied secret may stay on the clipboard. */
export const SECRET_CLIPBOARD_CLEAR_MS = 60_000;

export interface SecretClipboardPlatform {
  /** Writes `text` to the clipboard. */
  write: (text: string) => Promise<unknown>;
  /** Empties the clipboard. */
  clear: () => Promise<unknown>;
  /**
   * Whether the clipboard still holds `text`. Only for a platform that can
   * read it without a prompt or a notice to the user.
   */
  holds?: (text: string) => Promise<boolean>;
}

export interface SecretClipboard {
  /** Copies a secret and schedules its clear. */
  copy: (text: string) => Promise<void>;
  /** Clears a secret copied 60 s ago or more: on start and on every return. */
  resume: () => Promise<void>;
}

export function createSecretClipboard(platform: SecretClipboardPlatform): SecretClipboard {
  // The copy in this session; after a restart only its time is known, from
  // storage. Storage is a convenience: without it the clear still runs
  // in-session. The secret is kept only where `holds` needs to compare it.
  let copied: { text: string | null; at: number } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const stopTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const copiedAt = async () =>
    copied?.at ?? (await getStorageItem<number>(STORAGE_KEYS.SECRET_COPIED_AT).catch(() => null));
  const forget = async () => {
    stopTimer();
    copied = null;
    await removeStorageItem(STORAGE_KEYS.SECRET_COPIED_AT).catch(() => undefined);
  };

  const clearIfDue = async () => {
    const at = await copiedAt();
    if (at === null || Date.now() - at < SECRET_CLIPBOARD_CLEAR_MS) return;
    if (copied?.text != null && platform.holds) {
      const stillOurs = await platform.holds(copied.text).catch(() => true);
      if (!stillOurs) return forget();
    }
    try {
      await platform.clear();
    } catch {
      // A page out of focus cannot write the clipboard: the next return tries again.
      return;
    }
    await forget();
  };

  return {
    async copy(text) {
      await platform.write(text);
      stopTimer();
      copied = { text: platform.holds ? text : null, at: Date.now() };
      await setStorageItem(STORAGE_KEYS.SECRET_COPIED_AT, copied.at).catch(() => undefined);
      timer = setTimeout(() => void clearIfDue(), SECRET_CLIPBOARD_CLEAR_MS);
    },
    resume: clearIfDue,
  };
}
