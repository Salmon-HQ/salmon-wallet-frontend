import { useCallback, type Dispatch, type SetStateAction } from 'react';

import { encryptMnemonics } from '../crypto/encrypt-mnemonics';
import { removeStashItem, setStorageItem, STASH_KEYS, STORAGE_KEYS } from '../storage';
import type { Account, EditAccountParams, StoredAccount } from '../types/account';
import type { CustomTokens } from '../types/token';
import type { TrustedApps } from '../types/trusted-app';
import {
  buildSecretVault,
  clearAccountsStorage,
  getPreferredNetworkId,
  persistAccounts,
  persistActiveSelection,
} from './useAccountsMutationHelpers';

interface UseAccountsMutationsParams {
  counter: number;
  setCounter: Dispatch<SetStateAction<number>>;
  accounts: Account[];
  setAccounts: Dispatch<SetStateAction<Account[]>>;
  accountId: string | null;
  setAccountId: Dispatch<SetStateAction<string | null>>;
  networkId: string | null;
  setNetworkId: Dispatch<SetStateAction<string | null>>;
  setPathIndex: Dispatch<SetStateAction<number>>;
  setLocked: Dispatch<SetStateAction<boolean>>;
  setRequiredLock: Dispatch<SetStateAction<boolean>>;
  setTrustedApps: Dispatch<SetStateAction<TrustedApps>>;
  setTokens: Dispatch<SetStateAction<CustomTokens>>;
  formatAccountForStorage: (account: Account) => StoredAccount;
  getDefaultPathIndex: (account: Account, networkId: string) => number;
}

interface UseAccountsMutationsResult {
  addAccount: (account: Account, password?: string) => Promise<void>;
  editAccount: (targetId: string, params: EditAccountParams) => Promise<void>;
  removeAccount: (targetId: string, password?: string) => Promise<void>;
  removeAllAccounts: () => Promise<void>;
}

export function useAccountsMutations({
  counter,
  setCounter,
  accounts,
  setAccounts,
  accountId,
  setAccountId,
  networkId,
  setNetworkId,
  setPathIndex,
  setLocked,
  setRequiredLock,
  setTrustedApps,
  setTokens,
  formatAccountForStorage,
  getDefaultPathIndex,
}: UseAccountsMutationsParams): UseAccountsMutationsResult {
  const removeAllAccounts = useCallback(async (): Promise<void> => {
    await clearAccountsStorage();
    await removeStashItem(STASH_KEYS.DERIVED_KEY);

    setLocked(false);
    setRequiredLock(false);
    setCounter(0);
    setAccounts([]);
    setAccountId(null);
    setNetworkId(null);
    setPathIndex(0);
    setTrustedApps({});
    setTokens({});
  }, [
    setAccountId,
    setAccounts,
    setCounter,
    setLocked,
    setNetworkId,
    setPathIndex,
    setRequiredLock,
    setTokens,
    setTrustedApps,
  ]);

  const addAccount = useCallback(
    async (account: Account, password?: string): Promise<void> => {
      const newCounter = counter + 1;
      const newAccounts = [...accounts, account];
      const newAccountId = account.id;
      const newNetworkId = getPreferredNetworkId(account, networkId);
      const newVault = buildSecretVault(newAccounts);

      // Re-encrypt first. If we cannot produce an encrypted vault (e.g. the
      // cached derived key has expired and no password was supplied), abort
      // before touching any state — runtime and storage stay consistent and
      // the caller can surface the error to prompt the user for a password.
      const encryptResult = await encryptMnemonics(newVault, password, {
        cacheNewKey: !!password,
      });

      setCounter(newCounter);
      setAccounts(newAccounts);
      setAccountId(newAccountId);
      setNetworkId(newNetworkId);
      setPathIndex(getDefaultPathIndex(account, newNetworkId));

      await setStorageItem(STORAGE_KEYS.MNEMONICS, encryptResult.vault);
      if (password) {
        setRequiredLock(true);
      }

      await setStorageItem(STORAGE_KEYS.COUNTER, newCounter);
      await persistAccounts(newAccounts, formatAccountForStorage);
      await persistActiveSelection(newAccountId, 0, newNetworkId);
    },
    [
      accounts,
      counter,
      formatAccountForStorage,
      getDefaultPathIndex,
      networkId,
      setAccountId,
      setAccounts,
      setCounter,
      setNetworkId,
      setPathIndex,
      setRequiredLock,
    ]
  );

  const editAccount = useCallback(
    async (
      targetId: string,
      { name, avatar, newDerivedAccounts }: EditAccountParams
    ): Promise<void> => {
      const index = accounts.findIndex(({ id }) => id === targetId);
      if (index < 0) return;

      const newAccounts = [...accounts];
      const newAccount = { ...accounts[index] };

      if (name) newAccount.name = name;
      if (avatar) newAccount.avatar = avatar;

      if (newDerivedAccounts) {
        for (const derivedAccount of newDerivedAccounts) {
          const { network, index: accountIndex } = derivedAccount;
          if (!newAccount.networksAccounts[network.id]) {
            newAccount.networksAccounts[network.id] = [];
          }
          while (newAccount.networksAccounts[network.id].length <= accountIndex) {
            newAccount.networksAccounts[network.id].push(null);
          }
          newAccount.networksAccounts[network.id][accountIndex] = derivedAccount;
        }
      }

      newAccounts[index] = newAccount;
      setAccounts(newAccounts);
      await persistAccounts(newAccounts, formatAccountForStorage);
    },
    [accounts, formatAccountForStorage, setAccounts]
  );

  const removeAccount = useCallback(
    async (targetId: string, password?: string): Promise<void> => {
      const newAccounts = accounts.filter(({ id }) => id !== targetId);

      if (newAccounts.length === 0) {
        await removeAllAccounts();
        return;
      }

      const newVault = buildSecretVault(newAccounts);

      // Re-encrypt first. If we cannot produce an encrypted vault, abort
      // before mutating state so runtime, persisted accounts, and the
      // active selection do not drift apart from storage.
      const encryptResult = await encryptMnemonics(newVault, password, { cacheNewKey: false });

      setAccounts(newAccounts);

      if (accountId === targetId) {
        const account = accounts.find(({ id }) => id !== targetId);
        if (account) {
          const nextPathIndex = networkId ? getDefaultPathIndex(account, networkId) : 0;
          setAccountId(account.id);
          setPathIndex(nextPathIndex);

          await persistActiveSelection(account.id, nextPathIndex);
        }
      }

      await persistAccounts(newAccounts, formatAccountForStorage);

      await setStorageItem(STORAGE_KEYS.MNEMONICS, encryptResult.vault);
      if (password) {
        setRequiredLock(true);
      }
    },
    [
      accountId,
      accounts,
      formatAccountForStorage,
      getDefaultPathIndex,
      networkId,
      removeAllAccounts,
      setAccountId,
      setAccounts,
      setPathIndex,
      setRequiredLock,
    ]
  );

  return {
    addAccount,
    editAccount,
    removeAccount,
    removeAllAccounts,
  };
}
