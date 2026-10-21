import { useEffect, useRef, type MutableRefObject } from 'react';
import { browser } from 'wxt/browser';
import { isOwnStoredAccountsWrite, STORAGE_KEYS } from '@salmon/shared';
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
  /** Drops the wallets this window holds in memory, keys included. */
  forget: () => void;
}

/** The wallet ids in a stored list, as the shared storage writes it (JSON). */
function storedAccountIds(value: unknown): string[] {
  try {
    const list: unknown = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(list)) return [];
    return list.flatMap((entry: unknown) => {
      const id = (entry as { id?: unknown } | null)?.id;
      return typeof id === 'string' ? [id] : [];
    });
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
 * matches and is left alone. When the list is emptied (every wallet removed),
 * every window that still holds wallets forgets them, locked or not, so no
 * window keeps decrypted keys the user asked to remove.
 */
export function useLockAcrossWindows({
  ready,
  locked,
  closing,
  lock,
  accountIds,
  reload,
  forget,
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
    // A re-read that answers after the window closed acts on nothing.
    let cancelled = false;

    const lockFromElsewhere = () => {
      if (cancelled || lockedRef.current) return;
      lockedBySignal.current = true;
      lock();
    };

    const onWalletListChanged = (value: unknown) => {
      const stored = storedAccountIds(value);
      const held = accountIdsRef.current;
      if (stored.length === 0) {
        if (held.length > 0) forget();
        return;
      }
      if (lockedRef.current || !readyRef.current || isOwnStoredAccountsWrite(stored)) return;
      const storedSet = new Set(stored);
      if (storedSet.size === held.length && held.every((id) => storedSet.has(id))) return;
      reloading.current = reloading.current
        .then(reload)
        .then((reloaded) => {
          if (!reloaded) lockFromElsewhere();
        })
        .catch(lockFromElsewhere);
    };

    const onChanged = (changes: Record<string, { newValue?: unknown }>, areaName: string) => {
      if (areaName !== 'session' && areaName !== 'local') return;
      if (changes[LOCK_SIGNAL_KEY]) {
        lockFromElsewhere();
        return;
      }
      const listChange = areaName === 'local' ? changes[STORAGE_KEYS.ACCOUNTS] : undefined;
      if (listChange) onWalletListChanged(listChange.newValue);
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => {
      cancelled = true;
      browser.storage.onChanged.removeListener(onChanged);
    };
  }, [forget, lock, reload]);
}
