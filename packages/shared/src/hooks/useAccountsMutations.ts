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
      const newPathIndex = getDefaultPathIndex(account, newNetworkId);
      setPathIndex(newPathIndex);

      await setStorageItem(STORAGE_KEYS.MNEMONICS, encryptResult.vault);
      if (password) {
        setRequiredLock(true);
      }

      await setStorageItem(STORAGE_KEYS.COUNTER, newCounter);
      await persistAccounts(newAccounts, formatAccountForStorage);
      // The same index the runtime was just put on: a wallet whose only
      // address sits at a derived path would otherwise come back on an empty
      // index 0 after the next launch.
      await persistActiveSelection(newAccountId, newPathIndex, newNetworkId);
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
      // Copy the nested map too: a top-level spread shares `networksAccounts`
      // and every per-network array with the account still held in state, so
      // the pads below would mutate it in place under whoever captured it.
      const newAccount = {
        ...accounts[index],
        networksAccounts: { ...accounts[index].networksAccounts },
      };

      if (name) newAccount.name = name;
      if (avatar) newAccount.avatar = avatar;

      if (newDerivedAccounts) {
        for (const derivedAccount of newDerivedAccounts) {
          const { network, index: accountIndex } = derivedAccount;
          const slots = [...(newAccount.networksAccounts[network.id] ?? [])];
          while (slots.length <= accountIndex) {
            slots.push(null);
          }
          slots[accountIndex] = derivedAccount;
          newAccount.networksAccounts[network.id] = slots;
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
