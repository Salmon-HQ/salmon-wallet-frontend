import { removeStorageItem, setStorageItem, STORAGE_KEYS } from '../storage';
import type { Account, StoredAccount } from '../types/account';

export { buildSecretVault } from '../utils/account-secret';

export function getPreferredNetworkId(account: Account, currentNetworkId: string | null): string {
  if (currentNetworkId) {
    return currentNetworkId;
  }

  const availableNetworks = Object.keys(account.networksAccounts);
  return availableNetworks.includes('solana-mainnet') ? 'solana-mainnet' : availableNetworks[0];
}

export async function persistAccounts(
  accounts: Account[],
  formatAccountForStorage: (account: Account) => StoredAccount
): Promise<void> {
  await setStorageItem(STORAGE_KEYS.ACCOUNTS, accounts.map(formatAccountForStorage));
}

export async function persistActiveSelection(
  accountId: string,
  pathIndex: number,
  networkId?: string
): Promise<void> {
  await setStorageItem(STORAGE_KEYS.ACCOUNT_ID, accountId);
  await setStorageItem(STORAGE_KEYS.PATH_INDEX, pathIndex);

  if (networkId) {
    await setStorageItem(STORAGE_KEYS.NETWORK_ID, networkId);
  }
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
