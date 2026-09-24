import { useEffect, useRef, type MutableRefObject } from 'react';
import { browser } from 'wxt/browser';
import { sessionArea } from '../../utils/storageCompat';

/** Written to session storage when a window locks; every other window reads it. */
const LOCK_SIGNAL_KEY = 'salmon_lock_signal';

interface UseLockAcrossWindowsParams {
  /** This window has loaded its accounts. */
  ready: boolean;
  /** This window is locked. */
  locked: boolean;
  /** Set while this window locks because it is closing (pagehide). */
  closing: MutableRefObject<boolean>;
  /** Locks this window. */
  lock: () => void;
}

/**
 * Makes a lock in one wallet window lock every other open one.
 *
 * Each window (the side panel, every approval popup) keeps its unlocked
 * accounts in its own memory, so locking one left the rest able to sign.
 * A window that goes from unlocked to locked writes a signal; the others lock
 * on it. A window locking because it is closing does not signal (closing an
 * approval popup must not lock the side panel), nor does one that opens
 * locked, nor one whose lock came from the signal.
 */
export function useLockAcrossWindows({
  ready,
  locked,
  closing,
  lock,
}: UseLockAcrossWindowsParams): void {
  const wasUnlocked = useRef(false);
  const lockedRef = useRef(locked);
  const lockedBySignal = useRef(false);

  useEffect(() => {
    lockedRef.current = locked;
    if (!ready) return;
    if (!locked) {
      wasUnlocked.current = true;
      lockedBySignal.current = false;
      return;
    }
    if (wasUnlocked.current && !closing.current && !lockedBySignal.current) {
      sessionArea.set({ [LOCK_SIGNAL_KEY]: Date.now() }).catch(() => {
        /* the other windows still lock on their own inactivity timer */
      });
    }
    wasUnlocked.current = false;
  }, [ready, locked, closing]);

  useEffect(() => {
    const onChanged = (changes: Record<string, unknown>, areaName: string) => {
      if (areaName !== 'session' && areaName !== 'local') return;
      if (!changes[LOCK_SIGNAL_KEY] || lockedRef.current) return;
      lockedBySignal.current = true;
      lock();
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, [lock]);
}
