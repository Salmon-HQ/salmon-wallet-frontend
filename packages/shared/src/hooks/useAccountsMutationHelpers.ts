import { isKeyCacheValid, type DerivedKeyCache } from '../crypto/encryption';
import { EncryptionMaterialMissingError } from '../crypto/encrypt-mnemonics';
import {
  getStashItem,
  getStorageItem,
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
  getStoredMnemonics,
  resolveMnemonicsWithCachedKey,
  resolveMnemonicsWithPassword,
} from './useAccountsSecurityHelpers';

export { buildSecretVault } from '../utils/account-secret';

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
 * The wallet secrets as storage holds them now. Another wallet window may have
 * added or removed a wallet since this one loaded its copy, so a change is
 * applied to these and not to the copy in memory. The vault opens with the
 * cached key, else the password; with neither it could not be re-encrypted
 * either, so nothing is changed. A password tried here is a password guess like
 * any other: it waits out a standing penalty and a wrong one counts.
 */
export async function readStoredSecrets(password?: string): Promise<SecretVault> {
  const vault = await getStoredMnemonics();
  if (!vault) return {};

  const cachedKey = await getStashItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);
  if (isKeyCacheValid(cachedKey)) return resolveMnemonicsWithCachedKey(vault, cachedKey);
  if (!password) throw new EncryptionMaterialMissingError();

  const penalty = await getUnlockPenalty();
  if (penalty.remainingMs > 0) throw new UnlockThrottledError(penalty.remainingMs);
  let secrets: SecretVault;
  try {
    secrets = await resolveMnemonicsWithPassword(vault, password);
  } catch (err) {
    await recordFailedUnlock();
    throw err;
  }
  await clearUnlockPenalty();
  return secrets;
}

/** The wallet ids this runtime last wrote as the stored list, sorted. */
let ownAccountsWrite: string | null = null;

const idsKey = (ids: readonly string[]) => [...ids].sort().join('\n');

/** Writes the stored wallet list and remembers it as this window's own write. */
export async function writeStoredAccounts(stored: StoredAccount[]): Promise<void> {
  ownAccountsWrite = idsKey(stored.map(({ id }) => id));
  await setStorageItem(STORAGE_KEYS.ACCOUNTS, stored);
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

/** The wallet list as storage holds it now (see `readStoredSecrets`). */
export async function readStoredAccounts(): Promise<StoredAccount[]> {
  return (await getStorageItem<StoredAccount[]>(STORAGE_KEYS.ACCOUNTS)) ?? [];
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
 */
export async function clearAccountsStorage(): Promise<void> {
  ownAccountsWrite = idsKey([]);
  await removeStorageItem(STORAGE_KEYS.COUNTER);
  await removeStorageItem(STORAGE_KEYS.ACCOUNTS);
  await removeStorageItem(STORAGE_KEYS.MNEMONICS);
  await removeStorageItem(STORAGE_KEYS.ACCOUNT_ID);
  await removeStorageItem(STORAGE_KEYS.NETWORK_ID);
  await removeStorageItem(STORAGE_KEYS.PATH_INDEX);
  await removeStorageItem(STORAGE_KEYS.TRUSTED_APPS);
  await removeStorageItem(STORAGE_KEYS.CUSTOM_TOKENS);
  await removeStorageItem(STORAGE_KEYS.CONNECTION);
  await removeStorageItem(STORAGE_KEYS.WALLETS);
  await removeStorageItem(STORAGE_KEYS.ACTIVE);
  await removeStorageItem(STORAGE_KEYS.ENDPOINTS);
}
