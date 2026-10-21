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
import type { Account, StoredAccount } from '../types/account';
import type { SecretVault } from '../utils/account-secret';
import type { ActiveSlot } from '../utils/active-selection';
import {
  getStoredMnemonics,
  resolveMnemonicsWithCachedKey,
  resolveMnemonicsWithPassword,
} from './useAccountsSecurityHelpers';

export { buildSecretVault } from '../utils/account-secret';

/**
 * The wallet secrets as storage holds them now. Another wallet window may have
 * added or removed a wallet since this one loaded its copy, so a change is
 * applied to these and not to the copy in memory. The vault opens with the
 * cached key, else the password; with neither it could not be re-encrypted
 * either, so nothing is changed.
 */
export async function readStoredSecrets(password?: string): Promise<SecretVault> {
  const vault = await getStoredMnemonics();
  if (!vault) return {};

  const cachedKey = await getStashItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);
  if (isKeyCacheValid(cachedKey)) return resolveMnemonicsWithCachedKey(vault, cachedKey);
  if (password) return resolveMnemonicsWithPassword(vault, password);
  throw new EncryptionMaterialMissingError();
}

/** The wallet list as storage holds it now (see `readStoredSecrets`). */
export async function readStoredAccounts(): Promise<StoredAccount[]> {
  return (await getStorageItem<StoredAccount[]>(STORAGE_KEYS.ACCOUNTS)) ?? [];
}

export async function persistAccounts(
  accounts: Account[],
  formatAccountForStorage: (account: Account) => StoredAccount
): Promise<void> {
  await setStorageItem(STORAGE_KEYS.ACCOUNTS, accounts.map(formatAccountForStorage));
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

export async function clearAccountsStorage(): Promise<void> {
  await removeStorageItem(STORAGE_KEYS.COUNTER);
  await removeStorageItem(STORAGE_KEYS.ACCOUNTS);
  await removeStorageItem(STORAGE_KEYS.MNEMONICS);
  await removeStorageItem(STORAGE_KEYS.ACCOUNT_ID);
  await removeStorageItem(STORAGE_KEYS.NETWORK_ID);
  await removeStorageItem(STORAGE_KEYS.PATH_INDEX);
  await removeStorageItem(STORAGE_KEYS.TRUSTED_APPS);
  await removeStorageItem(STORAGE_KEYS.CUSTOM_TOKENS);
  await removeStorageItem(STORAGE_KEYS.CONNECTION);
}
