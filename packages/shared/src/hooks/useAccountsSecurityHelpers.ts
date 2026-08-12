import {
  lock,
  lockAndGetKey,
  unlockAndGetKey,
  unlockWithKey,
  refreshCachedKey,
  DEFAULT_DIGEST,
  DEFAULT_ITERATIONS,
  type DerivedKeyCache,
  type LockedVault,
} from '../crypto/encryption';
import {
  getStashItem,
  getStorageItem,
  removeStashItem,
  setStashItem,
  setStorageItem,
  updateLastActivity,
  STASH_KEYS,
  STORAGE_KEYS,
} from '../storage';

interface EncryptedMnemonics extends LockedVault {
  isEncrypted: true;
}

export type StoredMnemonics = Record<string, string> | EncryptedMnemonics;

export function isEncryptedMnemonics(mnemonics: StoredMnemonics): mnemonics is EncryptedMnemonics {
  return (
    typeof mnemonics === 'object' &&
    mnemonics !== null &&
    'isEncrypted' in mnemonics &&
    (mnemonics as EncryptedMnemonics).isEncrypted === true
  );
}

export function needsMnemonicUpgrade(vault: EncryptedMnemonics): boolean {
  return vault.digest !== DEFAULT_DIGEST || vault.iterations !== DEFAULT_ITERATIONS;
}

export async function getStoredMnemonics(): Promise<StoredMnemonics | null> {
  return getStorageItem<StoredMnemonics>(STORAGE_KEYS.MNEMONICS);
}

export async function getEncryptedStoredMnemonics(): Promise<EncryptedMnemonics | null> {
  const storedMnemonics = await getStoredMnemonics();

  return storedMnemonics && isEncryptedMnemonics(storedMnemonics) ? storedMnemonics : null;
}

export async function resolveMnemonicsWithPassword(
  storedMnemonics: StoredMnemonics,
  password: string,
  options: { upgradeOutdatedVault?: boolean } = {}
): Promise<Record<string, string>> {
  if (!isEncryptedMnemonics(storedMnemonics)) {
    return storedMnemonics;
  }

  const { data, keyCache } = await unlockAndGetKey<Record<string, string>>(
    storedMnemonics,
    password
  );
  await setStashItem(STASH_KEYS.DERIVED_KEY, keyCache);

  if (options.upgradeOutdatedVault && needsMnemonicUpgrade(storedMnemonics)) {
    const { vault: newVault, keyCache: newKeyCache } = await lockAndGetKey(data, password);
    await setStorageItem(STORAGE_KEYS.MNEMONICS, { ...newVault, isEncrypted: true });
    await setStashItem(STASH_KEYS.DERIVED_KEY, newKeyCache);
  }

  return data;
}

export async function resolveMnemonicsWithCachedKey(
  storedMnemonics: StoredMnemonics,
  keyCache: DerivedKeyCache
): Promise<Record<string, string>> {
  if (!isEncryptedMnemonics(storedMnemonics)) {
    return storedMnemonics;
  }

  const mnemonics = unlockWithKey<Record<string, string>>(storedMnemonics, keyCache);
  await setStashItem(STASH_KEYS.DERIVED_KEY, refreshCachedKey(keyCache));

  return mnemonics;
}

export async function changeStoredPassword(
  storedMnemonics: EncryptedMnemonics,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const { data: mnemonics } = await unlockAndGetKey<Record<string, string>>(
    storedMnemonics,
    oldPassword
  );
  const newVault = await lock(mnemonics, newPassword);

  await setStorageItem(STORAGE_KEYS.MNEMONICS, newVault);
  await removeStashItem(STASH_KEYS.DERIVED_KEY);
}

export async function finalizeUnlockedAccounts(
  mnemonics: Record<string, string>,
  loadAccounts: (mnemonics: Record<string, string>) => Promise<void>,
  setLocked: (locked: boolean) => void
): Promise<void> {
  await loadAccounts(mnemonics);
  setLocked(false);
  await updateLastActivity();
}

interface InitializeAccountsSecurityParams {
  loadAccounts: (mnemonics: Record<string, string>) => Promise<void>;
  loadMetadata: () => Promise<void>;
  setLoaded: (loaded: boolean) => void;
  setLocked: (locked: boolean) => void;
  setRequiredLock: (requiredLock: boolean) => void;
  unlockWithCachedKey: (keyCache: DerivedKeyCache) => Promise<boolean>;
  isKeyCacheValidFn: (keyCache: DerivedKeyCache) => boolean;
}

export async function initializeAccountsSecurity({
  loadAccounts,
  loadMetadata,
  setLoaded,
  setLocked,
  setRequiredLock,
  unlockWithCachedKey,
  isKeyCacheValidFn,
}: InitializeAccountsSecurityParams): Promise<boolean> {
  const storedMnemonics = await getStoredMnemonics();

  if (!storedMnemonics) {
    setLoaded(true);
    return false;
  }

  if (!isEncryptedMnemonics(storedMnemonics)) {
    await loadAccounts(storedMnemonics);
    setRequiredLock(false);
    return true;
  }

  setRequiredLock(true);

  let unlockedWithCache = false;
  const cachedKey = await getStashItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);
  if (cachedKey && isKeyCacheValidFn(cachedKey)) {
    unlockedWithCache = await unlockWithCachedKey(cachedKey);
  }

  if (!unlockedWithCache) {
    await loadMetadata();
    setLocked(true);
  }

  return true;
}
