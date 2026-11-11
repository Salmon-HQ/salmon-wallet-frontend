/**
 * Whether the active wallet's recovery phrase still has to be confirmed, and
 * the one sheet that confirms it.
 *
 * A wallet created on this device can skip the phrase check at sign-up. Its id
 * is then kept in `UNCONFIRMED_PHRASES` (ids only, never a secret) until the
 * owner passes the check, and the first transaction that moves funds asks for
 * it first: every such flow awaits `requireBackup()` before it signs. A wallet
 * that is not in that list (imported, Seed Vault, created before this check
 * could be skipped) never asks.
 *
 * The sheet itself is platform code, mounted once per app as a host that
 * renders `sheet`; this context only says when it is open and settles the
 * flow that opened it.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../storage';
import { getAccountMnemonic } from '../utils/account-secret';
import type { Account } from '../types/account';
import { AccountsContext } from './AccountsContext';

/** Why the sheet is open: a transaction is waiting on it, or the owner asked. */
export type PhraseBackupSheetReason = 'send' | 'manual';

export interface PhraseBackupValue {
  /** The active wallet's phrase has not been confirmed yet. */
  needsBackup: boolean;
  /** Home's reminder shows: a backup is due and the owner has not closed it. */
  reminderVisible: boolean;
  sheet: { reason: PhraseBackupSheetReason } | null;
  /** Resolves true at once when no backup is due, else after the sheet: true once confirmed. */
  requireBackup: () => Promise<boolean>;
  openBackup: () => void;
  /** The check was passed: the wallet stops asking, and a waiting flow goes on. */
  confirmBackup: () => Promise<void>;
  /** The sheet was left without passing: a waiting flow does not sign. */
  cancelBackup: () => void;
  /** Called by sign-up for a wallet created without the check. */
  markUnconfirmed: (walletId: string) => Promise<void>;
  dismissReminder: () => Promise<void>;
}

/** Outside a provider (tests, a surface that cannot sign) nothing is ever due. */
const NONE: PhraseBackupValue = {
  needsBackup: false,
  reminderVisible: false,
  sheet: null,
  requireBackup: async () => true,
  openBackup: () => {},
  confirmBackup: async () => {},
  cancelBackup: () => {},
  markUnconfirmed: async () => {},
  dismissReminder: async () => {},
};

const PhraseBackupContext = createContext<PhraseBackupValue>(NONE);

/** A wallet derived from another shares its phrase, so it shares the answer. */
function walletOf(account: Account | undefined): string | undefined {
  return account ? (account.derivedFrom ?? account.id) : undefined;
}

export function PhraseBackupProvider({ children }: { children: ReactNode }) {
  const accounts = useContext(AccountsContext)?.[0];
  const activeAccount = accounts?.activeAccount;
  const [unconfirmed, setUnconfirmed] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [sheet, setSheet] = useState<PhraseBackupValue['sheet']>(null);
  const waiting = useRef<((confirmed: boolean) => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ids, closed] = await Promise.all([
          getStorageItem<string[]>(STORAGE_KEYS.UNCONFIRMED_PHRASES),
          getStorageItem<boolean>(STORAGE_KEYS.PHRASE_REMINDER_DISMISSED),
        ]);
        if (cancelled) return;
        if (Array.isArray(ids)) setUnconfirmed(ids);
        setDismissed(closed === true);
      } catch (error) {
        console.error('[PhraseBackup] Failed to read backup state:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const wallet = walletOf(activeAccount);
  const needsBackup =
    !!wallet && unconfirmed.includes(wallet) && !!getAccountMnemonic(activeAccount);

  // Read-modify-write against storage, not against state: sign-up can mark a
  // wallet before the first read has landed.
  const update = useCallback(async (change: (ids: string[]) => string[]) => {
    const stored = await getStorageItem<string[]>(STORAGE_KEYS.UNCONFIRMED_PHRASES);
    const ids = change(Array.isArray(stored) ? stored : []);
    setUnconfirmed(ids);
    await setStorageItem(STORAGE_KEYS.UNCONFIRMED_PHRASES, ids);
  }, []);

  const settle = useCallback((confirmed: boolean) => {
    const resolve = waiting.current;
    waiting.current = null;
    setSheet(null);
    resolve?.(confirmed);
  }, []);

  const requireBackup = useCallback(async () => {
    if (!wallet || !getAccountMnemonic(activeAccount)) return true;
    // Read again rather than trust state: Android's dApp sheet is a second
    // React root with its own provider, and the check may have passed there.
    const stored = await getStorageItem<string[]>(STORAGE_KEYS.UNCONFIRMED_PHRASES);
    const ids = Array.isArray(stored) ? stored : [];
    setUnconfirmed(ids);
    if (!ids.includes(wallet)) return true;
    // One sheet at a time: a second request answers the first as not confirmed.
    waiting.current?.(false);
    return new Promise<boolean>((resolve) => {
      waiting.current = resolve;
      setSheet({ reason: 'send' });
    });
  }, [wallet, activeAccount]);

  const openBackup = useCallback(() => setSheet({ reason: 'manual' }), []);

  const confirmBackup = useCallback(async () => {
    if (wallet) await update((ids) => ids.filter((id) => id !== wallet));
    settle(true);
  }, [wallet, update, settle]);

  const cancelBackup = useCallback(() => settle(false), [settle]);

  const markUnconfirmed = useCallback(
    (walletId: string) => update((ids) => (ids.includes(walletId) ? ids : [...ids, walletId])),
    [update]
  );

  const dismissReminder = useCallback(async () => {
    setDismissed(true);
    await setStorageItem(STORAGE_KEYS.PHRASE_REMINDER_DISMISSED, true);
  }, []);

  const value = useMemo<PhraseBackupValue>(
    () => ({
      needsBackup,
      reminderVisible: needsBackup && !dismissed,
      sheet,
      requireBackup,
      openBackup,
      confirmBackup,
      cancelBackup,
      markUnconfirmed,
      dismissReminder,
    }),
    [
      needsBackup,
      dismissed,
      sheet,
      requireBackup,
      openBackup,
      confirmBackup,
      cancelBackup,
      markUnconfirmed,
      dismissReminder,
    ]
  );

  return <PhraseBackupContext.Provider value={value}>{children}</PhraseBackupContext.Provider>;
}

export function usePhraseBackup(): PhraseBackupValue {
  return useContext(PhraseBackupContext);
}

export { PhraseBackupContext };
