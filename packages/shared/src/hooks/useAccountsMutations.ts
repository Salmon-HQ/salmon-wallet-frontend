import { useCallback, type Dispatch, type SetStateAction } from 'react';

import { encryptMnemonics } from '../crypto/encrypt-mnemonics';
import { removeStashItem, setStorageItem, STASH_KEYS, STORAGE_KEYS } from '../storage';
import type { Account, EditAccountParams, StoredAccount } from '../types/account';
import type { CustomTokens } from '../types/token';
import type { TrustedApps } from '../types/trusted-app';
import { resolveActiveSlot } from '../utils/active-selection';
import { seedVaultAccessToRelease, toAccountSecret, toStoredSecret } from '../utils/account-secret';
import { releaseSeedVaultAccess } from '../blockchain/solana/seed-vault-signer';
import {
  clearAccountsStorage,
  persistAccounts,
  persistActiveSelection,
  readStoredAccounts,
  readStoredSecrets,
  withVaultWriteLock,
  writeStoredAccounts,
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
}

interface UseAccountsMutationsResult {
  /** `replaces`: the id of a wallet the new one takes the place of, in the same write. */
  addAccount: (account: Account, password?: string, replaces?: string) => Promise<void>;
  editAccount: (targetId: string, params: EditAccountParams) => Promise<void>;
  removeAccount: (targetId: string, password?: string) => Promise<void>;
  removeAllAccounts: () => Promise<void>;
  /**
   * Drops the wallets this window holds in memory, keys included, and touches
   * no storage: for a window whose wallets another one removed.
   */
  forgetAccounts: () => void;
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
}: UseAccountsMutationsParams): UseAccountsMutationsResult {
  const forgetAccounts = useCallback((): void => {
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

  /** Removes every wallet; the caller holds the vault write lock. */
  const clearAll = useCallback(async (): Promise<void> => {
    const seedVaultTokens = new Set(
      accounts.flatMap(({ secret }) => (secret.kind === 'seedVault' ? [secret.authToken] : []))
    );
    // Memory first: the decrypted keys go before anything else can fail.
    forgetAccounts();
    await clearAccountsStorage();
    await removeStashItem(STASH_KEYS.DERIVED_KEY);
    // Every Seed Vault seed Salmon was using is given up with the wallets.
    // (A reset from the lock screen has no wallets in memory; Seed Vault's
    // own settings still list Salmon then, and the user can revoke there.)
    seedVaultTokens.forEach(releaseSeedVaultAccess);
  }, [accounts, forgetAccounts]);

  const removeAllAccounts = useCallback(
    (): Promise<void> => withVaultWriteLock(clearAll),
    [clearAll]
  );

  const addAccount = useCallback(
    (account: Account, password?: string, replaces?: string): Promise<void> =>
      withVaultWriteLock(async () => {
        const newCounter = counter + 1;
        const newAccounts = [...accounts.filter(({ id }) => id !== replaces), account];
        const newAccountId = account.id;
        // The new wallet becomes the active one, so the session's network and
        // slot must be ones *it* holds. Keeping the session's network unchecked
        // is what stranded a watch-only import (Solana-mainnet only) on whatever
        // chain page the user happened to be reading — persisted, and therefore
        // still there on the next launch.
        const newSlot = resolveActiveSlot(account, { networkId, pathIndex: null });

        // The change lands on what storage holds, not on this window's copy:
        // another window may have added a wallet this one has not loaded.
        const secrets = await readStoredSecrets(password);
        const stored = await readStoredAccounts();
        const newVault = { ...secrets, [account.id]: toStoredSecret(account.secret) };
        if (replaces) delete newVault[replaces];
        const newStored = [
          ...stored.filter(({ id }) => id !== replaces && id !== account.id),
          formatAccountForStorage(account),
        ];

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
        if (newSlot) {
          setNetworkId(newSlot.networkId);
          setPathIndex(newSlot.pathIndex);
        }

        await setStorageItem(STORAGE_KEYS.MNEMONICS, encryptResult.vault);
        if (password) {
          setRequiredLock(true);
        }

        await setStorageItem(STORAGE_KEYS.COUNTER, newCounter);
        // The same pair the runtime was just put on: a wallet whose only address
        // sits at a derived path, or on a single network, would otherwise come
        // back on an empty slot after the next launch.
        await persistActiveSelection(newAccountId, newSlot);
        // The list goes last: a window that re-reads on it finds the rest written.
        await writeStoredAccounts(newStored);
      }),
    [
      accounts,
      counter,
      formatAccountForStorage,
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
      await withVaultWriteLock(() => persistAccounts(newAccounts, formatAccountForStorage));
    },
    [accounts, formatAccountForStorage, setAccounts]
  );

  const removeAccount = useCallback(
    (targetId: string, password?: string): Promise<void> =>
      withVaultWriteLock(async () => {
        const newAccounts = accounts.filter(({ id }) => id !== targetId);

        // Removed from what storage holds, not from this window's copy: the
        // last wallet here need not be the last one stored, and the vault can
        // hold a seed the list no longer names.
        const newStored = (await readStoredAccounts()).filter(({ id }) => id !== targetId);
        const secrets = await readStoredSecrets(password);
        const removedSecret = secrets[targetId];
        const newVault = { ...secrets };
        delete newVault[targetId];
        if (newStored.length === 0 && Object.keys(newVault).length === 0) {
          await clearAll();
          return;
        }

        // Re-encrypt first. If we cannot produce an encrypted vault, abort
        // before mutating state so runtime, persisted accounts, and the
        // active selection do not drift apart from storage.
        const encryptResult = await encryptMnemonics(newVault, password, { cacheNewKey: false });

        setAccounts(newAccounts);

        if (accountId === targetId) {
          const account = accounts.find(({ id }) => id !== targetId);
          if (account) {
            // Removing the active wallet hands the session to another one, which
            // holds its own networks: the pair moves with it, exactly as it does
            // on an explicit switch.
            const nextSlot = resolveActiveSlot(account, { networkId, pathIndex: null });
            setAccountId(account.id);
            if (nextSlot) {
              setNetworkId(nextSlot.networkId);
              setPathIndex(nextSlot.pathIndex);
            }

            await persistActiveSelection(account.id, nextSlot);
          }
        }

        // The vault, then the list: a window that re-reads on the list finds
        // the vault it describes.
        await setStorageItem(STORAGE_KEYS.MNEMONICS, encryptResult.vault);
        await writeStoredAccounts(newStored);
        if (password) {
          setRequiredLock(true);
        }

        // Removing the last wallet of a Seed Vault seed gives up Salmon's access
        // to it, so Seed Vault no longer lists Salmon among the apps using it —
        // judged on what is stored, which can hold wallets this window has not
        // loaded.
        const release =
          removedSecret !== undefined &&
          seedVaultAccessToRelease(
            { secret: toAccountSecret(removedSecret) },
            Object.values(newVault).map((secret) => ({ secret: toAccountSecret(secret) }))
          );
        if (release) releaseSeedVaultAccess(release);
      }),
    [
      accountId,
      accounts,
      clearAll,
      networkId,
      setAccountId,
      setAccounts,
      setNetworkId,
      setPathIndex,
      setRequiredLock,
    ]
  );

  return {
    addAccount,
    editAccount,
    removeAccount,
    removeAllAccounts,
    forgetAccounts,
  };
}
