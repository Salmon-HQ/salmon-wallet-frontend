import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';

import { trackEvent } from '../analytics';
import { setStorageItem, STORAGE_KEYS } from '../storage';
import type { Account } from '../types/account';
import type { BlockchainAccount } from '../types/blockchain';

interface UseAccountsSelectionParams {
  accounts: Account[];
  accountId: string | null;
  setAccountId: Dispatch<SetStateAction<string | null>>;
  networkId: string | null;
  setNetworkId: Dispatch<SetStateAction<string | null>>;
  pathIndex: number;
  setPathIndex: Dispatch<SetStateAction<number>>;
  setSwitchingNetwork: Dispatch<SetStateAction<boolean>>;
  getDefaultPathIndex: (account: Account, networkId: string) => number;
}

interface UseAccountsSelectionResult {
  activeAccount: Account | undefined;
  activeBlockchainAccount: BlockchainAccount | undefined;
  changeAccount: (targetId: string) => Promise<void>;
  clearSwitchingNetwork: () => void;
  changeNetwork: (targetId: string) => Promise<void>;
  switchNetwork: (networkId: string) => Promise<void>;
  getNetworkId: () => string | null;
  changePathIndex: (targetIndex: number) => Promise<void>;
}

export function useAccountsSelection({
  accounts,
  accountId,
  setAccountId,
  networkId,
  setNetworkId,
  pathIndex,
  setPathIndex,
  setSwitchingNetwork,
  getDefaultPathIndex,
}: UseAccountsSelectionParams): UseAccountsSelectionResult {
  const findAccount = useCallback(
    (targetId: string): Account | undefined => accounts.find(({ id }) => id === targetId),
    [accounts]
  );

  const activeAccount = useMemo(
    () => (accountId ? findAccount(accountId) : undefined),
    [findAccount, accountId]
  );

  const activeBlockchainAccount = useMemo((): BlockchainAccount | undefined => {
    if (!activeAccount || !networkId) return undefined;
    return activeAccount.networksAccounts[networkId]?.[pathIndex] ?? undefined;
  }, [activeAccount, networkId, pathIndex]);

  const changeAccount = useCallback(
    async (targetId: string): Promise<void> => {
      if (accountId === targetId) return;

      const account = findAccount(targetId);
      if (!account) return;

      // Anonymous feature-adoption event: the active wallet was switched.
      // No account id, name or address — just that a switch happened.
      trackEvent('wallet_switched');

      setSwitchingNetwork(true);
      setAccountId(targetId);
      setPathIndex(networkId ? getDefaultPathIndex(account, networkId) : 0);

      await setStorageItem(STORAGE_KEYS.ACCOUNT_ID, targetId);
      await setStorageItem(STORAGE_KEYS.PATH_INDEX, 0);
    },
    [accountId, findAccount, getDefaultPathIndex, networkId, setAccountId, setPathIndex, setSwitchingNetwork]
  );

  const clearSwitchingNetwork = useCallback(() => setSwitchingNetwork(false), [setSwitchingNetwork]);

  const changeNetwork = useCallback(
    async (targetId: string): Promise<void> => {
      if (networkId === targetId || !activeAccount) return;

      const { networksAccounts } = activeAccount;
      if (!Object.keys(networksAccounts).includes(targetId)) return;

      // Anonymous feature-adoption event: the active network was switched.
      // Only the coarse target chain family — never the full network id.
      trackEvent('network_switched', {
        chain: targetId.split('-')[0] as 'solana' | 'bitcoin' | 'ethereum',
      });

      setSwitchingNetwork(true);

      const targetIndex = networksAccounts[targetId]?.[pathIndex]
        ? pathIndex
        : getDefaultPathIndex(activeAccount, targetId);

      setNetworkId(targetId);
      setPathIndex(targetIndex);

      await setStorageItem(STORAGE_KEYS.NETWORK_ID, targetId);
      await setStorageItem(STORAGE_KEYS.PATH_INDEX, targetIndex);
    },
    [activeAccount, getDefaultPathIndex, networkId, pathIndex, setNetworkId, setPathIndex, setSwitchingNetwork]
  );

  const switchNetwork = useCallback(
    async (targetNetworkId: string): Promise<void> => {
      await changeNetwork(targetNetworkId);
    },
    [changeNetwork]
  );

  const getNetworkId = useCallback((): string | null => {
    return networkId;
  }, [networkId]);

  const changePathIndex = useCallback(
    async (targetIndex: number): Promise<void> => {
      if (pathIndex === targetIndex || !activeAccount || !networkId) return;

      const blockchainAccounts = activeAccount.networksAccounts[networkId];
      if (!blockchainAccounts || targetIndex < 0 || targetIndex >= blockchainAccounts.length) {
        return;
      }

      setPathIndex(targetIndex);
      await setStorageItem(STORAGE_KEYS.PATH_INDEX, targetIndex);
    },
    [activeAccount, networkId, pathIndex, setPathIndex]
  );

  return {
    activeAccount,
    activeBlockchainAccount,
    changeAccount,
    clearSwitchingNetwork,
    changeNetwork,
    switchNetwork,
    getNetworkId,
    changePathIndex,
  };
}
