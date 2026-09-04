import { removeStorageItem, setStorageItem, STORAGE_KEYS } from '../storage';
import type { Account, StoredAccount } from '../types/account';
import type { ActiveSlot } from '../utils/active-selection';

export { buildSecretVault } from '../utils/account-secret';

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
