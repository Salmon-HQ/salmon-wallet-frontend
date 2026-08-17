import { useCallback, type Dispatch, type SetStateAction } from 'react';

import { isKeyCacheValid, type DerivedKeyCache } from '../crypto/encryption';
import { removeStashItem } from '../storage';
import { migrateLegacyWallets } from '../utils/legacy-migration';
import { clearUnlockPenalty, getUnlockPenalty, recordFailedUnlock } from '../utils/unlock-throttle';
import type { Account, StoredAccount } from '../types/account';
import {
  getStoredMnemonics,
  changeStoredPassword,
  finalizeUnlockedAccounts,
  getEncryptedStoredMnemonics,
  initializeAccountsSecurity,
  resolveMnemonicsWithCachedKey,
  resolveMnemonicsWithPassword,
} from './useAccountsSecurityHelpers';
import { STASH_KEYS } from '../storage';

interface UseAccountsSecurityParams {
  setLocked: Dispatch<SetStateAction<boolean>>;
  setRequiredLock: Dispatch<SetStateAction<boolean>>;
  setReady: Dispatch<SetStateAction<boolean>>;
  setLoaded: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  loadMetadata: () => Promise<void>;
  loadAccounts: (mnemonics: Record<string, string>) => Promise<void>;
  restoreAccount: (options: {
    name?: string;
    avatar?: string;
    mnemonic: string;
    pathIndexes?: Record<string, (number | null)[]>;
  }) => Promise<Account>;
  formatAccountForStorage: (account: Account) => StoredAccount;
}

interface UseAccountsSecurityResult {
  checkPassword: (password: string) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  lockAccounts: () => Promise<void>;
  unlockAccounts: (password: string) => Promise<boolean>;
  unlockWithCachedKey: (keyCache: DerivedKeyCache) => Promise<boolean>;
  initAccounts: () => Promise<void>;
}

export function useAccountsSecurity({
  setLocked,
  setRequiredLock,
  setReady,
  setLoaded,
  setError,
  loadMetadata,
  loadAccounts,
  restoreAccount,
  formatAccountForStorage,
}: UseAccountsSecurityParams): UseAccountsSecurityResult {
  const runUpgrades = useCallback(
    async (password?: string): Promise<boolean> => {
      const result = await migrateLegacyWallets(
        { restoreAccount, formatAccountForStorage },
        password
      );

      if (result.status === 'no-migration') return true;

      if (result.status === 'needs-password') {
        setLocked(true);
        return false;
      }

      return true;
    },
    [formatAccountForStorage, restoreAccount, setLocked]
  );

  const checkPassword = useCallback(async (password: string): Promise<boolean> => {
    try {
      const storedMnemonics = await getEncryptedStoredMnemonics();
      if (!storedMnemonics) {
        return true;
      }

      await resolveMnemonicsWithPassword(storedMnemonics, password);

      return true;
    } catch {
      return false;
    }
  }, []);

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string): Promise<boolean> => {
      try {
        const storedMnemonics = await getEncryptedStoredMnemonics();
        if (!storedMnemonics) {
          return false;
        }

        await changeStoredPassword(storedMnemonics, oldPassword, newPassword);

        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const lockAccounts = useCallback(async (): Promise<void> => {
    setLocked(true);
    await removeStashItem(STASH_KEYS.DERIVED_KEY);
  }, [setLocked]);

  const unlockAccounts = useCallback(
    async (password: string): Promise<boolean> => {
      try {
        // The prompt is the only place an attacker can guess for free. Refuse
        // to even touch the vault while a penalty from earlier failures stands.
        const penalty = await getUnlockPenalty();
        if (penalty.remainingMs > 0) {
          setError('unlock-throttled');
          return false;
        }

        await runUpgrades(password);

        const storedMnemonics = await getStoredMnemonics();
        if (!storedMnemonics) {
          setLocked(false);
          return true;
        }

        let mnemonics: Record<string, string>;
        try {
          mnemonics = await resolveMnemonicsWithPassword(storedMnemonics, password, {
            upgradeOutdatedVault: true,
          });
        } catch (err) {
          // Only a rejected password counts against the user — a storage or
          // migration failure must not lock a legitimate owner out.
          await recordFailedUnlock();
          throw err;
        }

        await clearUnlockPenalty();
        await finalizeUnlockedAccounts(mnemonics, loadAccounts, setLocked);

        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to unlock accounts';
        console.warn('Failed to unlock accounts:', err);
        setError(msg);
        return false;
      }
    },
    [loadAccounts, runUpgrades, setError, setLocked]
  );

  const unlockWithCachedKey = useCallback(
    async (keyCache: DerivedKeyCache): Promise<boolean> => {
      try {
        if (!keyCache || !keyCache.key || !keyCache.salt) {
          console.warn('Key cache is invalid');
          return false;
        }

        const storedMnemonics = await getStoredMnemonics();
        if (!storedMnemonics) {
          setLocked(false);
          return true;
        }

        const mnemonics = await resolveMnemonicsWithCachedKey(storedMnemonics, keyCache);
        await finalizeUnlockedAccounts(mnemonics, loadAccounts, setLocked);

        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to unlock accounts';
        console.warn('Failed to unlock accounts with cached key:', err);
        setError(msg);
        return false;
      }
    },
    [loadAccounts, setError, setLocked]
  );

  const initAccounts = useCallback(async (): Promise<void> => {
    try {
      const upgraded = await runUpgrades();
      const hasStoredAccounts = await initializeAccountsSecurity({
        loadAccounts,
        loadMetadata,
        setLoaded,
        setLocked,
        setRequiredLock,
        unlockWithCachedKey,
        isKeyCacheValidFn: isKeyCacheValid,
      });
      if (!hasStoredAccounts && upgraded) {
        setLoaded(true);
      }

      // Init succeeded — clear any error left by a previous failed attempt so
      // a retry from the init-failed gate dismisses it only on success.
      setError(null);
      setReady(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Account initialization failed';
      console.error('[useAccounts] init failed:', err);
      setError(msg);
      setReady(true);
    }
  }, [
    loadAccounts,
    loadMetadata,
    runUpgrades,
    setError,
    setLoaded,
    setLocked,
    setReady,
    setRequiredLock,
    unlockWithCachedKey,
  ]);

  return {
    checkPassword,
    changePassword,
    lockAccounts,
    unlockAccounts,
    unlockWithCachedKey,
    initAccounts,
  };
}
