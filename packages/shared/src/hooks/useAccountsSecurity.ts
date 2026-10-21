import { useCallback, type Dispatch, type SetStateAction } from 'react';

import { isKeyCacheValid, lockAndGetKey, type DerivedKeyCache } from '../crypto/encryption';
import { validatePassword } from '../crypto/password';
import {
  getStorageItem,
  removeStashItem,
  setStashItem,
  setStorageItem,
  STORAGE_KEYS,
  updateLastActivity,
} from '../storage';
import { mainnetReceiveAddresses } from '../utils/account';
import { toAccountSecret } from '../utils/account-secret';
import { migrateLegacyWallets } from '../utils/legacy-migration';
import {
  clearUnlockPenalty,
  getUnlockPenalty,
  recordFailedUnlock,
  UnlockThrottledError,
} from '../utils/unlock-throttle';
import type { Account, AccountSecret, StoredAccount } from '../types/account';
import type { SecretVault } from '../utils/account-secret';
import {
  getStoredMnemonics,
  changeStoredPassword,
  finalizeUnlockedAccounts,
  getEncryptedStoredMnemonics,
  initializeAccountsSecurity,
  isEncryptedMnemonics,
  resolveMnemonicsWithCachedKey,
  resolveMnemonicsWithPassword,
} from './useAccountsSecurityHelpers';
import { STASH_KEYS } from '../storage';
import { withVaultWriteLock } from './useAccountsMutationHelpers';

interface UseAccountsSecurityParams {
  setLocked: Dispatch<SetStateAction<boolean>>;
  setRequiredLock: Dispatch<SetStateAction<boolean>>;
  setReady: Dispatch<SetStateAction<boolean>>;
  setLoaded: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  /**
   * The addresses of a wallet whose seeds are stored without a password (a
   * cleartext vault, or an unprotected v2 record), derived from those seeds;
   * null once it has one.
   */
  setUnprotectedAddresses: Dispatch<SetStateAction<string[] | null>>;
  loadMetadata: () => Promise<void>;
  loadAccounts: (mnemonics: SecretVault) => Promise<void>;
  restoreAccount: (options: {
    name?: string;
    avatar?: string;
    secret: AccountSecret;
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
  protectWallet: (password: string) => Promise<boolean>;
}

export function useAccountsSecurity({
  setLocked,
  setRequiredLock,
  setReady,
  setLoaded,
  setError,
  setUnprotectedAddresses,
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

      if (result.status === 'needs-new-password') {
        setUnprotectedAddresses(result.addresses);
        return false;
      }

      return true;
    },
    [formatAccountForStorage, restoreAccount, setLocked, setUnprotectedAddresses]
  );

  /**
   * Shows the addresses a cleartext vault's keys derive, at the slots the stored
   * list names. A watched address or a Seed Vault key is only what the record
   * claims, so it is not shown; a vault with nothing derivable is refused.
   */
  const showUnprotectedVault = useCallback(
    async (secrets: SecretVault): Promise<void> => {
      const stored = (await getStorageItem<StoredAccount[]>(STORAGE_KEYS.ACCOUNTS)) ?? [];
      const accounts = await Promise.all(
        Object.entries(secrets).flatMap(([id, value]) => {
          const secret = toAccountSecret(value);
          if (secret.kind !== 'mnemonic' && secret.kind !== 'privateKey') return [];
          const pathIndexes = stored.find((account) => account.id === id)?.pathIndexes;
          return [restoreAccount({ secret, pathIndexes })];
        })
      );
      const addresses = mainnetReceiveAddresses(accounts);
      if (addresses.length === 0) {
        throw new Error('The unprotected wallet has no key to derive an address from');
      }
      setUnprotectedAddresses(addresses);
    },
    [restoreAccount, setUnprotectedAddresses]
  );

  const checkPassword = useCallback(async (password: string): Promise<boolean> => {
    // This gate stands in front of the seed-phrase reveal, the private-key
    // reveal and account removal, so it is as free to guess at as the unlock
    // prompt and carries the same penalty. A refusal for waiting is thrown, not
    // answered `false`: the password may be right, and "wrong password" would
    // send the owner guessing again, which only lengthens the wait.
    const penalty = await getUnlockPenalty();
    if (penalty.remainingMs > 0) {
      throw new UnlockThrottledError(penalty.remainingMs);
    }

    try {
      // Nothing encrypted to check the password against means nothing has
      // proven it, so the gate stays shut.
      const storedMnemonics = await getEncryptedStoredMnemonics();
      if (!storedMnemonics) {
        return false;
      }

      try {
        await resolveMnemonicsWithPassword(storedMnemonics, password);
      } catch (err) {
        // Only a rejected password counts against the user — a storage failure
        // must not lock a legitimate owner out.
        await recordFailedUnlock();
        throw err;
      }

      await clearUnlockPenalty();

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

        // Verify through the throttled path first: changing the password is
        // another way to ask "is this the right one?", and an unthrottled one
        // would hand back the free guesses checkPassword denies.
        if (!(await checkPassword(oldPassword))) {
          return false;
        }

        await changeStoredPassword(storedMnemonics, oldPassword, newPassword);

        return true;
      } catch (err) {
        // A wait is not a wrong password; the screen says which it was.
        if (err instanceof UnlockThrottledError) throw err;
        return false;
      }
    },
    [checkPassword]
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

        try {
          // A legacy record still on disk decrypts here, not below, so a wrong
          // password rejected by the migration has to cost an attempt too —
          // otherwise the throttle never starts on exactly the installs that
          // are still carrying a v2 vault.
          await runUpgrades(password);
        } catch (err) {
          await recordFailedUnlock();
          throw err;
        }

        const storedMnemonics = await getStoredMnemonics();
        if (!storedMnemonics) {
          setLocked(false);
          return true;
        }

        let mnemonics: SecretVault;
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
        // Typing the password is the user acting. Unlocking through the cached
        // key is not: every window the wallet opens does it, including an
        // approval window a web page asked for, and counting it let a page
        // postpone the auto-lock indefinitely.
        await updateLastActivity();

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
        onUnprotected: showUnprotectedVault,
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
    loadMetadata,
    runUpgrades,
    setError,
    setLoaded,
    setLocked,
    setReady,
    setRequiredLock,
    showUnprotectedVault,
    unlockWithCachedKey,
  ]);

  /**
   * Gives a wallet that has no password the one the owner just chose and
   * confirmed: a cleartext vault is encrypted in place, an unprotected v2
   * record is migrated encrypted. The password must pass the same strength
   * check as any new password. Answers whether the wallet is protected now; a
   * failure leaves it as it was, for the screen to say so.
   *
   * It holds the lock every wallet write takes, and reads what storage holds
   * once it has it: another window may have protected the wallet meanwhile.
   */
  const protectWallet = useCallback(
    async (password: string): Promise<boolean> => {
      try {
        if (!validatePassword(password).isValid) {
          throw new Error('The password does not meet the strength rules');
        }

        await withVaultWriteLock(async () => {
          const stored = await getStoredMnemonics();
          if (stored && isEncryptedMnemonics(stored)) {
            throw new Error('This wallet already has a password');
          }

          if (stored) {
            const { vault, keyCache } = await lockAndGetKey(stored, password);
            await setStorageItem(STORAGE_KEYS.MNEMONICS, { ...vault, isEncrypted: true });
            await setStashItem(STASH_KEYS.DERIVED_KEY, keyCache);
            await finalizeUnlockedAccounts(stored, loadAccounts, setLocked);
            return;
          }

          const result = await migrateLegacyWallets(
            { restoreAccount, formatAccountForStorage },
            password,
            { newPassword: true }
          );
          const migrated = await getStoredMnemonics();
          if (result.status !== 'migrated' || !migrated) {
            throw new Error('There is no unprotected wallet to protect');
          }
          const mnemonics = await resolveMnemonicsWithPassword(migrated, password);
          await finalizeUnlockedAccounts(mnemonics, loadAccounts, setLocked);
        });
      } catch (err) {
        console.warn('Failed to protect the wallet:', err);
        return false;
      }

      setRequiredLock(true);
      setUnprotectedAddresses(null);
      await updateLastActivity();
      return true;
    },
    [
      formatAccountForStorage,
      loadAccounts,
      restoreAccount,
      setLocked,
      setRequiredLock,
      setUnprotectedAddresses,
    ]
  );

  return {
    checkPassword,
    changePassword,
    lockAccounts,
    unlockAccounts,
    unlockWithCachedKey,
    initAccounts,
    protectWallet,
  };
}
