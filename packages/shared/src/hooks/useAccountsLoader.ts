import { useCallback, type Dispatch, type SetStateAction } from 'react';

import { clearSeedCache } from '../crypto/mnemonic';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../storage';
import type { Account, StoredAccount } from '../types/account';
import type { TrustedApps } from '../types/trusted-app';
import type { CustomTokens } from '../types/token';

interface UseAccountsLoaderParams {
  setLoaded: Dispatch<SetStateAction<boolean>>;
  setCounter: Dispatch<SetStateAction<number>>;
  setAccounts: Dispatch<SetStateAction<Account[]>>;
  setAccountId: Dispatch<SetStateAction<string | null>>;
  setNetworkId: Dispatch<SetStateAction<string | null>>;
  setPathIndex: Dispatch<SetStateAction<number>>;
  setTrustedApps: Dispatch<SetStateAction<TrustedApps>>;
  setTokens: Dispatch<SetStateAction<CustomTokens>>;
  restoreManyAccounts: (data: Array<StoredAccount & { mnemonic: string }>) => Promise<Account[]>;
}

interface UseAccountsLoaderResult {
  loadMetadata: () => Promise<void>;
  loadAccounts: (mnemonics: Record<string, string>) => Promise<void>;
}

export function useAccountsLoader({
  setLoaded,
  setCounter,
  setAccounts,
  setAccountId,
  setNetworkId,
  setPathIndex,
  setTrustedApps,
  setTokens,
  restoreManyAccounts,
}: UseAccountsLoaderParams): UseAccountsLoaderResult {
  const loadMetadata = useCallback(async (): Promise<void> => {
    const storedAccounts = await getStorageItem<StoredAccount[]>(STORAGE_KEYS.ACCOUNTS);
    if (!storedAccounts) {
      setLoaded(true);
      return;
    }

    const accountsWithMetadata: Account[] = storedAccounts.map((stored) => ({
      ...stored,
      mnemonic: '',
      networksAccounts: {},
    }));

    const storedCounter = await getStorageItem<number>(STORAGE_KEYS.COUNTER);
    setCounter(storedCounter ?? 0);

    setAccounts(accountsWithMetadata);

    const storedAccountId = await getStorageItem<string>(STORAGE_KEYS.ACCOUNT_ID);
    const storedNetworkId = await getStorageItem<string>(STORAGE_KEYS.NETWORK_ID);

    setAccountId(storedAccountId ?? null);
    setNetworkId(storedNetworkId ?? null);
    setPathIndex((await getStorageItem<number>(STORAGE_KEYS.PATH_INDEX)) ?? 0);
    setTrustedApps((await getStorageItem<TrustedApps>(STORAGE_KEYS.TRUSTED_APPS)) ?? {});
    setTokens((await getStorageItem<CustomTokens>(STORAGE_KEYS.CUSTOM_TOKENS)) ?? {});

    setLoaded(true);
  }, [
    setAccountId,
    setAccounts,
    setCounter,
    setLoaded,
    setNetworkId,
    setPathIndex,
    setTokens,
    setTrustedApps,
  ]);

  const loadAccounts = useCallback(
    async (mnemonics: Record<string, string>): Promise<void> => {
      const storedAccounts = await getStorageItem<StoredAccount[]>(STORAGE_KEYS.ACCOUNTS);
      if (!storedAccounts) {
        setLoaded(true);
        return;
      }

      const data = storedAccounts.map((account) => ({
        ...account,
        mnemonic: mnemonics[account.id],
      }));

      const storedCounter = await getStorageItem<number>(STORAGE_KEYS.COUNTER);
      setCounter(storedCounter ?? 0);

      const loadedAccounts = await restoreManyAccounts(data);
      clearSeedCache();
      setAccounts(loadedAccounts);

      const storedAccountId = await getStorageItem<string>(STORAGE_KEYS.ACCOUNT_ID);
      const storedNetworkId = await getStorageItem<string>(STORAGE_KEYS.NETWORK_ID);

      let defaultNetworkId = storedNetworkId;
      if (!defaultNetworkId && loadedAccounts.length > 0) {
        const firstAccount = loadedAccounts[0];
        const availableNetworks = Object.keys(firstAccount.networksAccounts);
        defaultNetworkId = availableNetworks.includes('solana-mainnet')
          ? 'solana-mainnet'
          : availableNetworks[0];
      }

      setAccountId(storedAccountId ?? null);
      setNetworkId(defaultNetworkId ?? null);
      setPathIndex((await getStorageItem<number>(STORAGE_KEYS.PATH_INDEX)) ?? 0);
      setTrustedApps((await getStorageItem<TrustedApps>(STORAGE_KEYS.TRUSTED_APPS)) ?? {});
      setTokens((await getStorageItem<CustomTokens>(STORAGE_KEYS.CUSTOM_TOKENS)) ?? {});

      if (!storedNetworkId && defaultNetworkId) {
        await setStorageItem(STORAGE_KEYS.NETWORK_ID, defaultNetworkId);
      }

      setLoaded(true);
    },
    [
      restoreManyAccounts,
      setAccountId,
      setAccounts,
      setCounter,
      setLoaded,
      setNetworkId,
      setPathIndex,
      setTokens,
      setTrustedApps,
    ]
  );

  return {
    loadMetadata,
    loadAccounts,
  };
}
