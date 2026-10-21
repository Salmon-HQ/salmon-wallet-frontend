import { useEffect, useRef, type MutableRefObject } from 'react';
import { browser } from 'wxt/browser';
import { STORAGE_KEYS } from '@salmon/shared';
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
  /** The ids of the wallets this window holds in memory. */
  accountIds: readonly string[];
  /** Re-reads this window's wallets from storage; false when it could not. */
  reload: () => Promise<boolean>;
}

/** The wallet ids in a stored list, as the shared storage writes it (JSON). */
function storedAccountIds(value: unknown): string[] {
  try {
    const list: unknown = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(list) ? list.map((entry) => String(entry?.id)) : [];
  } catch {
    return [];
  }
}

/**
 * Keeps every open wallet window in step with the others: a lock in one locks
 * the rest, and a wallet list changed in one is re-read by the rest.
 *
 * Each window (the side panel, every approval popup) keeps its unlocked
 * accounts in its own memory, so locking one left the rest able to sign.
 * A window that goes from unlocked to locked writes a signal; the others lock
 * on it. A window locking because it is closing does not signal (closing an
 * approval popup must not lock the side panel), nor does one that opens
 * locked, nor one whose lock came from another window.
 *
 * The same memory goes stale when another window adds or removes a wallet.
 * An unlocked window whose wallets no longer match the stored list re-reads
 * them through the cached key; one that cannot is locked, so it never acts on
 * a list storage no longer holds. The window that made the change already
 * matches and is left alone.
 */
export function useLockAcrossWindows({
  ready,
  locked,
  closing,
  lock,
  accountIds,
  reload,
}: UseLockAcrossWindowsParams): void {
  const wasUnlocked = useRef(false);
  const lockedRef = useRef(locked);
  const lockedBySignal = useRef(false);
  const readyRef = useRef(ready);
  const accountIdsRef = useRef(accountIds);
  // One re-read at a time, so an earlier one cannot land last with an older list.
  const reloading = useRef(Promise.resolve());

  useEffect(() => {
    readyRef.current = ready;
    accountIdsRef.current = accountIds;
  }, [ready, accountIds]);

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
    const lockFromElsewhere = () => {
      lockedBySignal.current = true;
      lock();
    };

    const onChanged = (changes: Record<string, { newValue?: unknown }>, areaName: string) => {
      if (areaName !== 'session' && areaName !== 'local') return;
      if (lockedRef.current) return;
      if (changes[LOCK_SIGNAL_KEY]) {
        lockFromElsewhere();
        return;
      }

      const listChange = areaName === 'local' ? changes[STORAGE_KEYS.ACCOUNTS] : undefined;
      if (!listChange || !readyRef.current) return;
      const stored = new Set(storedAccountIds(listChange.newValue));
      const held = accountIdsRef.current;
      if (stored.size === held.length && held.every((id) => stored.has(id))) return;
      // An emptied list leaves nothing to act on, and its writer is the window
      // that removed every wallet — locking that one would land it on the lock
      // screen instead of onboarding.
      const lockUnlessEmptied = () => {
        if (stored.size > 0 && !lockedRef.current) lockFromElsewhere();
      };
      reloading.current = reloading.current
        .then(reload)
        .then((reloaded) => {
          if (!reloaded) lockUnlessEmptied();
        })
        .catch(lockUnlessEmptied);
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, [lock, reload]);
}
