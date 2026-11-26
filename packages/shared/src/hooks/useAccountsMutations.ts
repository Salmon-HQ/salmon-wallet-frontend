import { useCallback, type Dispatch, type SetStateAction } from 'react';
import isEqual from 'lodash-es/isEqual';

import { encryptMnemonics } from '../crypto/encrypt-mnemonics';
import {
  getStorageItem,
  removeStashItem,
  setStorageItem,
  STASH_KEYS,
  STORAGE_KEYS,
} from '../storage';
import type { Account, EditAccountParams, StoredAccount } from '../types/account';
import type { CustomTokens } from '../types/token';
import type { TrustedApps } from '../types/trusted-app';
import { resolveActiveSlot } from '../utils/active-selection';
import { seedVaultAccessToRelease, toAccountSecret, toStoredSecret } from '../utils/account-secret';
import { releaseSeedVaultAccess } from '../blockchain/solana/seed-vault-signer';
import { findStoredClash } from '../utils/stored-clash';
import {
  clearAccountsStorage,
  persistActiveSelection,
  pruneMarks,
  readStoredList,
  readStoredWallets,
  withVaultWriteLock,
  writeStoredAccounts,
} from './useAccountsMutationHelpers';
import { getEncryptedStoredMnemonics } from './useAccountsSecurityHelpers';

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
  /** A wallet waiting for a password is one this window holds too. */
  setUnprotectedAddresses: Dispatch<SetStateAction<string[] | null>>;
  formatAccountForStorage: (account: Account) => StoredAccount;
  /** Reloads memory from storage, writing nothing and never failing. */
  refreshFromStorage: () => Promise<void>;
}

/** Writes the stored list; a write that threw unsettled is remembered by the caller. */
type WriteList = (stored: StoredAccount[], own?: boolean) => Promise<void>;

const sameIds = (held: readonly { id: string }[], stored: readonly { id: string }[]): boolean =>
  held.length === stored.length && stored.every(({ id }) => held.some((h) => h.id === id));

/** A write the save does not depend on: its failure is logged, never thrown. */
async function bestEffort(what: string, write: () => Promise<void>): Promise<void> {
  try {
    await write();
  } catch (err) {
    console.warn(`[accounts] could not store the ${what}:`, err);
  }
}

export interface AddAccountOptions {
  /** Created without the phrase check: marked backup-pending before the vault is written. */
  unconfirmed?: boolean;
}

interface UseAccountsMutationsResult {
  addAccount: (account: Account, password?: string, options?: AddAccountOptions) => Promise<void>;
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
  setUnprotectedAddresses,
  formatAccountForStorage,
  refreshFromStorage,
}: UseAccountsMutationsParams): UseAccountsMutationsResult {
  /**
   * Runs a change under the write lock. When its list write threw and the
   * read-back could not confirm it, memory may no longer match storage either
   * way, so it is reloaded from storage once the lock is released.
   */
  const withListWrite = useCallback(
    async (change: (writeList: WriteList) => Promise<void>): Promise<void> => {
      let unsettled = false;
      const writeList: WriteList = async (stored, own = true) => {
        try {
          await writeStoredAccounts(stored, { own });
        } catch (err) {
          unsettled = true;
          throw err;
        }
      };
      try {
        await withVaultWriteLock(() => change(writeList));
      } catch (err) {
        if (unsettled) await refreshFromStorage();
        throw err;
      }
    },
    [refreshFromStorage]
  );

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
    setUnprotectedAddresses(null);
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
    setUnprotectedAddresses,
  ]);

  /** Removes every wallet; the caller holds the vault write lock. */
  const clearAll = useCallback(async (): Promise<void> => {
    const seedVaultTokens = new Set(
      accounts.flatMap(({ secret }) => (secret.kind === 'seedVault' ? [secret.authToken] : []))
    );
    // Key material first: the decrypted keys, then the session key, before
    // anything in storage can fail.
    forgetAccounts();
    await removeStashItem(STASH_KEYS.DERIVED_KEY);
    await clearAccountsStorage();
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
    async (
      account: Account,
      password?: string,
      { unconfirmed = false }: AddAccountOptions = {}
    ): Promise<void> => {
      try {
        await withListWrite(async (writeList) => {
          // The new wallet becomes the active one, so the session's network and
          // slot must be ones *it* holds. Keeping the session's network unchecked
          // is what stranded a watch-only import (Solana-mainnet only) on whatever
          // chain page the user happened to be reading — persisted, and therefore
          // still there on the next launch.
          const newSlot = resolveActiveSlot(account, { networkId, pathIndex: null });

          // The change lands on what storage holds, not on this window's copy:
          // another window may have added a wallet this one has not loaded.
          const { list: stored, secrets } = await readStoredWallets(accounts.length > 0, password);
          const secret = toStoredSecret(account.secret);
          // A retry reuses its wallet's id, so an entry under it is normally this
          // very secret; any other secret there belongs to another wallet.
          const ownEntry = secrets[account.id];
          if (ownEntry !== undefined && !isEqual(ownEntry, secret)) {
            throw new Error('Another secret is stored under the id of the wallet being saved');
          }
          // Decided on storage, not on this window: another window may hold a
          // wallet this one has not loaded.
          const { replace } = await findStoredClash(account, stored, secrets);
          const kept = ({ id }: { id: string }) => id !== account.id && !replace.includes(id);
          const storedCounter = await getStorageItem<unknown>(STORAGE_KEYS.COUNTER);
          const alreadyListed = stored.some(({ id }) => id === account.id);
          const newCounter = alreadyListed
            ? null
            : Math.max(typeof storedCounter === 'number' ? storedCounter : 0, stored.length) + 1;

          // Nothing leaves the vault before the list: a list read that lied can
          // make a listed wallet look unlisted, and a listed wallet without its
          // secret fails every unlock. A leftover copy is ciphertext nothing reads.
          const newVault = { ...secrets, [account.id]: secret };
          const newStored = [...stored.filter(kept), formatAccountForStorage(account)];
          const newAccounts = [...accounts.filter(kept), account];

          const encryptResult = await encryptMnemonics(newVault, password, {
            cacheNewKey: !!password,
          });
          // The replaced Seed Vault wallets keep their entries until the list
          // no longer names them.
          const vaultAfterList = Object.fromEntries(
            Object.entries(newVault).filter(([id]) => !replace.includes(id))
          );
          const encryptedAfterList =
            replace.length > 0 ? (await encryptMnemonics(vaultAfterList, password)).vault : null;

          // Marked before anything is stored: a save reported as failed may
          // still have landed, and a saved wallet without its mark never asks
          // for the backup. A mark left by a save that did not land is pruned
          // by the next one.
          if (unconfirmed) {
            const marks = await getStorageItem<string[]>(STORAGE_KEYS.UNCONFIRMED_PHRASES);
            const ids = Array.isArray(marks) ? marks : [];
            if (!ids.includes(account.id)) {
              await setStorageItem(STORAGE_KEYS.UNCONFIRMED_PHRASES, [...ids, account.id]);
            }
          }
          await setStorageItem(STORAGE_KEYS.MNEMONICS, encryptResult.vault);

          // The counter is the witness that this device holds a vault, so it
          // goes in before the list when there is none yet.
          if (storedCounter == null && newCounter !== null) {
            await bestEffort('counter', () => setStorageItem(STORAGE_KEYS.COUNTER, newCounter));
          }

          // The deciding write. Marked as this window's own only when the window
          // then holds exactly the stored wallets; otherwise the window missed
          // another one's wallet, and the list listener must reload it.
          await writeList(newStored, sameIds(newAccounts, newStored));

          if (newCounter !== null) setCounter(newCounter);
          setAccounts(newAccounts);
          setAccountId(account.id);
          if (newSlot) {
            setNetworkId(newSlot.networkId);
            setPathIndex(newSlot.pathIndex);
          }
          if (password) setRequiredLock(true);

          // The wallet is stored. A launch heals a counter or selection left behind.
          if (newCounter !== null) {
            await bestEffort('counter', () => setStorageItem(STORAGE_KEYS.COUNTER, newCounter));
          }
          // The same pair the runtime was just put on: a wallet whose only address
          // sits at a derived path, or on a single network, would otherwise come
          // back on an empty slot after the next launch.
          await bestEffort('active selection', () => persistActiveSelection(account.id, newSlot));

          if (encryptedAfterList) {
            await bestEffort('vault without the replaced wallets', async () => {
              await setStorageItem(STORAGE_KEYS.MNEMONICS, encryptedAfterList);
              // A seed's access is given up only when no stored wallet uses it.
              const remaining = Object.values(vaultAfterList).map((entry) => ({
                secret: toAccountSecret(entry),
              }));
              const tokens = replace.map((id) =>
                seedVaultAccessToRelease({ secret: toAccountSecret(secrets[id]) }, remaining)
              );
              new Set(tokens).forEach((token) => token && releaseSeedVaultAccess(token));
            });
          }
          await bestEffort('backup-pending marks', () => pruneMarks(newStored));
        });
      } catch (err) {
        // The setup form asks for the existing password once a vault it can
        // check is stored, as it does after a relaunch.
        try {
          if (await getEncryptedStoredMnemonics()) setRequiredLock(true);
        } catch {
          // The save's own error is the one to report.
        }
        throw err;
      }
    },
    [
      accounts,
      formatAccountForStorage,
      networkId,
      withListWrite,
      setAccountId,
      setAccounts,
      setCounter,
      setNetworkId,
      setPathIndex,
      setRequiredLock,
    ]
  );

  const editAccount = useCallback(
    (targetId: string, { name, avatar, newDerivedAccounts }: EditAccountParams): Promise<void> =>
      withListWrite(async (writeList) => {
        const current = accounts.find(({ id }) => id === targetId);
        if (!current) return;

        // Copy the nested map too: a top-level spread shares `networksAccounts`
        // and every per-network array with the account still held in state, so
        // the pads below would mutate it in place under whoever captured it.
        const newAccount = {
          ...current,
          networksAccounts: { ...current.networksAccounts },
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

        // Only this wallet's entry changes, in the list storage holds: this
        // window's copy may still hold a wallet another window removed, and
        // writing that copy back would list a wallet whose seed is gone.
        const stored = await readStoredList(accounts.length > 0);
        const index = stored.findIndex(({ id }) => id === targetId);
        if (index < 0) return;
        const newStored = [...stored];
        newStored[index] = formatAccountForStorage(newAccount);

        await writeList(newStored);
        setAccounts((held) =>
          held.map((account) => (account.id === targetId ? newAccount : account))
        );
      }),
    [accounts, formatAccountForStorage, setAccounts, withListWrite]
  );

  const removeAccount = useCallback(
    (targetId: string, password?: string): Promise<void> =>
      withListWrite(async (writeList) => {
        // Removed from what storage holds, not from this window's copy: the
        // last wallet here need not be the last one stored, and the vault can
        // hold a seed the list no longer names.
        const { list, secrets } = await readStoredWallets(accounts.length > 0, password);
        const newStored = list.filter(({ id }) => id !== targetId);
        const removedSecret = secrets[targetId];
        const newVault = { ...secrets };
        delete newVault[targetId];
        if (newStored.length === 0 && Object.keys(newVault).length === 0) {
          await clearAll();
          return;
        }

        // Re-encrypt first. If we cannot produce an encrypted vault, abort
        // before writing anything.
        const encryptResult = await encryptMnemonics(newVault, password, { cacheNewKey: false });

        // The list decides, and the window follows it. The vault comes after:
        // stopped in between, it keeps one secret too many, which nothing
        // reads. The other order would leave a listed wallet without its
        // secret, and unlock fails for every wallet.
        await writeList(newStored);
        const newAccounts = accounts.filter(({ id }) => id !== targetId);
        setAccounts(newAccounts);

        if (accountId === targetId) {
          const account = newStored
            .map(({ id }) => newAccounts.find((held) => held.id === id))
            .find((held) => held !== undefined);
          if (account) {
            // Removing the active wallet hands the session to another one, which
            // holds its own networks: the pair moves with it, exactly as it does
            // on an explicit switch. A launch heals a selection left behind.
            const nextSlot = resolveActiveSlot(account, { networkId, pathIndex: null });
            setAccountId(account.id);
            if (nextSlot) {
              setNetworkId(nextSlot.networkId);
              setPathIndex(nextSlot.pathIndex);
            }

            await bestEffort('active selection', () =>
              persistActiveSelection(account.id, nextSlot)
            );
          }
        }

        await setStorageItem(STORAGE_KEYS.MNEMONICS, encryptResult.vault);
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
      withListWrite,
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
