import { isKeyCacheValid, type DerivedKeyCache } from '../crypto/encryption';
import { EncryptionMaterialMissingError } from '../crypto/encrypt-mnemonics';
import {
  getStashItem,
  getStorageItem,
  removeStashItem,
  removeStorageItem,
  setStorageItem,
  STASH_KEYS,
  STORAGE_KEYS,
} from '../storage';
import type { StoredAccount } from '../types/account';
import type { SecretVault } from '../utils/account-secret';
import type { ActiveSlot } from '../utils/active-selection';
import {
  clearUnlockPenalty,
  getUnlockPenalty,
  recordFailedUnlock,
  UnlockThrottledError,
} from '../utils/unlock-throttle';
import {
  resolveMnemonicsWithCachedKey,
  resolveMnemonicsWithPassword,
  type StoredMnemonics,
} from './useAccountsSecurityHelpers';

/** A save refused because a stored wallet already holds the same secret. */
export class DuplicateAccountError extends Error {
  constructor() {
    super('This wallet is already stored');
    this.name = 'DuplicateAccountError';
  }
}

/** The Web Locks name every read-modify-write of the stored wallets holds. */
const VAULT_WRITE_LOCK = 'salmon-vault-write';

let vaultWriteQueue: Promise<unknown> = Promise.resolve();

interface LockManagerLike {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
}

/**
 * Runs one read-modify-write of the stored wallets with no other running.
 *
 * The extension's wallet windows share one storage, and the Web Locks API
 * (`navigator.locks`) makes each wait for the others: a lock is held by name
 * across every document of the extension's origin. React Native has no such
 * API, and one app runs one JS runtime, so there the writes queue in it.
 */
export function withVaultWriteLock<T>(write: () => Promise<T>): Promise<T> {
  const locks = (globalThis as { navigator?: { locks?: LockManagerLike } }).navigator?.locks;
  if (typeof locks?.request === 'function') return locks.request(VAULT_WRITE_LOCK, write);
  const run = vaultWriteQueue.then(write, write);
  vaultWriteQueue = run.catch(() => undefined);
  return run;
}

/**
 * The wallet list as storage holds it now. Another wallet window may have
 * added or removed a wallet since this one loaded its copy, so a change is
 * applied to this list and not to the copy in memory.
 *
 * A read can lie: a storage that failed to read a key can answer that it is
 * absent. A list read empty while this window holds wallets contradicts what
 * it loaded, so the change is refused rather than written over the others.
 */
export async function readStoredList(memoryHoldsWallets: boolean): Promise<StoredAccount[]> {
  const list = await getStorageItem<unknown>(STORAGE_KEYS.ACCOUNTS);
  if (list != null && !Array.isArray(list)) {
    throw new Error('The stored wallet list is unreadable');
  }
  const stored = (list ?? []) as StoredAccount[];
  if (memoryHoldsWallets && stored.length === 0) {
    throw new Error('The stored wallet list reads empty while wallets are open');
  }
  return stored;
}

export interface StoredWallets {
  list: StoredAccount[];
  hasVault: boolean;
  secrets: SecretVault;
}

/**
 * The wallet list and secrets as storage holds them now (see `readStoredList`).
 *
 * The vault is refused when it reads unreadable while a wallet is listed, or
 * absent while anything shows the device has wallets: the list, a v2 record,
 * or the counter every save writes. Saving over such a read would destroy
 * every stored secret if the read had lied. With nothing stored, or an
 * unreadable vault and nothing listed, the secrets start empty and the save
 * overwrites it; the cached key goes first, because encryption prefers it
 * over the password and an earlier attempt may have cached one for another.
 *
 * A supplied password must open the vault, never the cached key, so nothing
 * is re-encrypted under a key the password does not derive. A password tried
 * here is a password guess like any other: it waits out a standing penalty
 * and a wrong one counts. Without a password the cached key opens it; with
 * neither it could not be re-encrypted either, so nothing is changed.
 */
export async function readStoredWallets(
  memoryHoldsWallets: boolean,
  password?: string
): Promise<StoredWallets> {
  const list = await readStoredList(memoryHoldsWallets);
  const vault = await getStorageItem<unknown>(STORAGE_KEYS.MNEMONICS);
  const hasVault = vault != null;

  if (hasVault && typeof vault !== 'object' && list.length > 0) {
    throw new Error('The stored wallet secrets are unreadable');
  }
  if (
    !hasVault &&
    (list.length > 0 ||
      (await getStorageItem(STORAGE_KEYS.WALLETS)) != null ||
      (await getStorageItem(STORAGE_KEYS.COUNTER)) != null)
  ) {
    throw new Error('The stored wallet secrets read absent while wallets are stored');
  }
  if (!hasVault || typeof vault !== 'object') {
    await removeStashItem(STASH_KEYS.DERIVED_KEY);
    return { list, hasVault, secrets: {} };
  }

  const stored = vault as StoredMnemonics;
  if (!password) {
    const cachedKey = await getStashItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);
    if (!isKeyCacheValid(cachedKey)) throw new EncryptionMaterialMissingError();
    return { list, hasVault, secrets: await resolveMnemonicsWithCachedKey(stored, cachedKey) };
  }

  const penalty = await getUnlockPenalty();
  if (penalty.remainingMs > 0) throw new UnlockThrottledError(penalty.remainingMs);
  let secrets: SecretVault;
  try {
    secrets = await resolveMnemonicsWithPassword(stored, password);
  } catch (err) {
    await recordFailedUnlock();
    throw err;
  }
  await clearUnlockPenalty();
  return { list, hasVault, secrets };
}

/** The wallet ids this runtime last wrote as the stored list, sorted. */
let ownAccountsWrite: string | null = null;

const idsKey = (ids: readonly string[]) => [...ids].sort().join('\n');

/**
 * Writes the stored wallet list; with `own`, remembers it as this window's
 * own write.
 *
 * A write can land and still report failure, so a write that throws is
 * settled by reading the list back: holding what was written, it counts as
 * done. Compared as JSON, because storage drops `undefined` fields.
 */
export async function writeStoredAccounts(
  stored: StoredAccount[],
  { own }: { own: boolean }
): Promise<void> {
  ownAccountsWrite = own ? idsKey(stored.map(({ id }) => id)) : null;
  try {
    await setStorageItem(STORAGE_KEYS.ACCOUNTS, stored);
  } catch (err) {
    if (await holdsList(stored)) return;
    ownAccountsWrite = null;
    throw err;
  }
}

async function holdsList(stored: StoredAccount[]): Promise<boolean> {
  try {
    const readBack = await getStorageItem<StoredAccount[]>(STORAGE_KEYS.ACCOUNTS);
    return readBack != null && JSON.stringify(readBack) === JSON.stringify(stored);
  } catch {
    return false;
  }
}

/**
 * Whether a stored list with these ids is the one this window last wrote. A
 * window re-reads its wallets when the stored list stops matching its own; its
 * own write matches by definition, even before its state has caught up. The
 * mark is spent by the first change checked against it, so a later list from
 * another window with the same ids is never taken for this window's own.
 */
export function isOwnStoredAccountsWrite(ids: readonly string[]): boolean {
  const own = ownAccountsWrite === idsKey(ids);
  ownAccountsWrite = null;
  return own;
}

/**
 * Drops the backup-pending marks no stored wallet carries, as its own id or as
 * the wallet it was derived from. Writes only when a mark goes.
 */
export async function pruneMarks(list: StoredAccount[]): Promise<void> {
  const ids = await getStorageItem<string[]>(STORAGE_KEYS.UNCONFIRMED_PHRASES);
  if (!Array.isArray(ids)) return;
  const kept = ids.filter((mark) =>
    list.some(({ id, derivedFrom }) => id === mark || derivedFrom === mark)
  );
  if (kept.length < ids.length) await setStorageItem(STORAGE_KEYS.UNCONFIRMED_PHRASES, kept);
}

/**
 * Persists the active wallet and, when one could be resolved, the network and
 * slot it is read through.
 *
 * The pair travels together on purpose: a network written without its slot (or
 * the reverse) is how storage and runtime came apart, and the launch after that
 * reads the half that was wrong.
 */
export async function persistActiveSelection(
  accountId: string,
  slot: ActiveSlot | null
): Promise<void> {
  await setStorageItem(STORAGE_KEYS.ACCOUNT_ID, accountId);

  if (!slot) return;

  await setStorageItem(STORAGE_KEYS.NETWORK_ID, slot.networkId);
  await setStorageItem(STORAGE_KEYS.PATH_INDEX, slot.pathIndex);
}

/**
 * Erases every stored wallet: the vault, the account list, the selection, and
 * a v2 record that was never migrated (a wallet stored without a password
 * waits as one), so nothing of it comes back on the next launch.
 *
 * Every record that shows the device has wallets goes before the list and the
 * vault: a reset stopped in between then leaves wallets that still load, or
 * nothing that refuses the next setup for a vault that is gone.
 */
export async function clearAccountsStorage(): Promise<void> {
  ownAccountsWrite = idsKey([]);
  await removeStorageItem(STORAGE_KEYS.COUNTER);
  await removeStorageItem(STORAGE_KEYS.WALLETS);
  await removeStorageItem(STORAGE_KEYS.ACTIVE);
  await removeStorageItem(STORAGE_KEYS.ENDPOINTS);
  await removeStorageItem(STORAGE_KEYS.ACCOUNT_ID);
  await removeStorageItem(STORAGE_KEYS.NETWORK_ID);
  await removeStorageItem(STORAGE_KEYS.PATH_INDEX);
  await removeStorageItem(STORAGE_KEYS.ACCOUNTS);
  await removeStorageItem(STORAGE_KEYS.MNEMONICS);
  await removeStorageItem(STORAGE_KEYS.TRUSTED_APPS);
  await removeStorageItem(STORAGE_KEYS.CUSTOM_TOKENS);
  await removeStorageItem(STORAGE_KEYS.CONNECTION);
}
