/**
 * The active selection — which wallet, on which network, at which slot.
 *
 * The session's network id and path index are persisted and outlive the wallet
 * that chose them, while a wallet holds only the networks it was built with (a
 * watch-only address holds one). So the pair the session carries can name
 * something the active wallet cannot answer for, and that pair is written back
 * to storage — which is how a session ends up permanently reading a wallet on a
 * network it does not hold. `resolveActiveSlot` is the single rule for the pair
 * a wallet can actually be read on; this hook applies it on every render and
 * heals a stored pair that no longer fits, so a session that already went wrong
 * comes back on the next launch instead of needing a reinstall.
 */
import { useCallback, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';

import { trackEvent } from '../analytics';
import { setStorageItem, STORAGE_KEYS } from '../storage';
import type { Account } from '../types/account';
import type { BlockchainAccount } from '../types/blockchain';
import { getHeldPathIndex, isSlotResolved, resolveActiveSlot } from '../utils/active-selection';

interface UseAccountsSelectionParams {
  accounts: Account[];
  accountId: string | null;
  setAccountId: Dispatch<SetStateAction<string | null>>;
  networkId: string | null;
  setNetworkId: Dispatch<SetStateAction<string | null>>;
  pathIndex: number;
  setPathIndex: Dispatch<SetStateAction<number>>;
  setSwitchingNetwork: Dispatch<SetStateAction<boolean>>;
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
}: UseAccountsSelectionParams): UseAccountsSelectionResult {
  const findAccount = useCallback(
    (targetId: string): Account | undefined => accounts.find(({ id }) => id === targetId),
    [accounts]
  );

  const activeAccount = useMemo(
    () => (accountId ? findAccount(accountId) : undefined),
    [findAccount, accountId]
  );

  // The pair the wallet can actually answer for. Null while it holds nothing —
  // the pre-unlock placeholder, whose networks are empty until the vault is
  // decrypted, and which the lock screen is covering anyway.
  const resolvedSlot = useMemo(
    () => resolveActiveSlot(activeAccount, { networkId, pathIndex }),
    [activeAccount, networkId, pathIndex]
  );

  // Read through the resolved pair, not the session's. A stale pair would
  // otherwise leave the screen with no account for the render before the
  // healing effect below lands.
  const activeBlockchainAccount = useMemo((): BlockchainAccount | undefined => {
    if (!activeAccount || !resolvedSlot) return undefined;
    return (
      activeAccount.networksAccounts[resolvedSlot.networkId]?.[resolvedSlot.pathIndex] ?? undefined
    );
  }, [activeAccount, resolvedSlot]);

  // Heal the session and storage when the two disagree. Guarded on the pair
  // itself rather than on a ref of "already healed": the correction changes
  // `networkId`/`pathIndex`, which re-runs this effect, and the second pass is
  // a no-op because the pair now resolves to itself.
  const healFailedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!resolvedSlot || isSlotResolved(resolvedSlot, { networkId, pathIndex })) return;

    const { networkId: healedNetworkId, pathIndex: healedPathIndex } = resolvedSlot;

    setNetworkId(healedNetworkId);
    setPathIndex(healedPathIndex);

    void (async () => {
      try {
        await setStorageItem(STORAGE_KEYS.NETWORK_ID, healedNetworkId);
        await setStorageItem(STORAGE_KEYS.PATH_INDEX, healedPathIndex);
      } catch (error) {
        // The session is already correct in memory; only the persistence of
        // the correction failed, so the next launch heals again. Logged once
        // per pair so a failing storage cannot flood the console.
        const key = `${healedNetworkId}:${healedPathIndex}`;
        if (healFailedRef.current !== key) {
          healFailedRef.current = key;
          console.warn('[accounts] could not persist the healed selection:', error);
        }
      }
    })();
  }, [resolvedSlot, networkId, pathIndex, setNetworkId, setPathIndex]);

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

      // The wallet being switched to may hold neither the session's network
      // nor its slot — a watch-only address holds one network, an imported key
      // one slot. Both halves move together, and both are persisted as chosen:
      // writing a hardcoded 0 here (while the session took the computed index)
      // put storage and runtime on different slots until the next launch, when
      // storage won and the wallet came back on an empty one.
      const slot = resolveActiveSlot(account, { networkId, pathIndex });
      if (slot) {
        setNetworkId(slot.networkId);
        setPathIndex(slot.pathIndex);
      }

      await setStorageItem(STORAGE_KEYS.ACCOUNT_ID, targetId);
      if (slot) {
        await setStorageItem(STORAGE_KEYS.NETWORK_ID, slot.networkId);
        await setStorageItem(STORAGE_KEYS.PATH_INDEX, slot.pathIndex);
      }
    },
    [
      accountId,
      findAccount,
      networkId,
      pathIndex,
      setAccountId,
      setNetworkId,
      setPathIndex,
      setSwitchingNetwork,
    ]
  );

  const clearSwitchingNetwork = useCallback(
    () => setSwitchingNetwork(false),
    [setSwitchingNetwork]
  );

  const changeNetwork = useCallback(
    async (targetId: string): Promise<void> => {
      if (networkId === targetId || !activeAccount) return;

      // A network with a key but no filled slot is not held: switching to it
      // is the same dead end as switching to one the wallet never had.
      const targetIndex = getHeldPathIndex(activeAccount, targetId, pathIndex);
      if (targetIndex === null) return;

      // Anonymous feature-adoption event: the active network was switched.
      // Only the coarse target chain family — never the full network id.
      trackEvent('network_switched', {
        chain: targetId.split('-')[0] as 'solana' | 'bitcoin' | 'ethereum',
      });

      setSwitchingNetwork(true);

      setNetworkId(targetId);
      setPathIndex(targetIndex);

      await setStorageItem(STORAGE_KEYS.NETWORK_ID, targetId);
      await setStorageItem(STORAGE_KEYS.PATH_INDEX, targetIndex);
    },
    [activeAccount, networkId, pathIndex, setNetworkId, setPathIndex, setSwitchingNetwork]
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

      // An in-range but empty slot is not selectable either: a derivation that
      // produced nothing leaves a null in the array, and landing on it reads
      // as "no account" exactly like an out-of-range index would.
      if (getHeldPathIndex(activeAccount, networkId, targetIndex) !== targetIndex) return;

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
