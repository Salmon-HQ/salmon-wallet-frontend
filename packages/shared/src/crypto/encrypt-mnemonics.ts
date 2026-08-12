import {
  lock,
  lockAndGetKey,
  lockWithKey,
  isKeyCacheValid,
  refreshCachedKey,
  type LockedVault,
  type DerivedKeyCache,
} from './encryption';
import { getStashItem, setStashItem, STASH_KEYS } from '../storage';

/**
 * Thrown when `encryptMnemonics` is called without a password and without
 * a valid cached derived key. Callers must surface the failure (and prompt
 * the user for the password) instead of silently degrading the vault to
 * plaintext.
 *
 * The class `name` is the stable identifier — UI handlers should branch on
 * `err instanceof EncryptionMaterialMissingError` and translate the user-
 * facing message via i18n. The english `message` here is for logs only.
 */
export class EncryptionMaterialMissingError extends Error {
  constructor(message = 'Cannot re-encrypt vault: no password and no valid cached key available') {
    super(message);
    this.name = 'EncryptionMaterialMissingError';
    Object.setPrototypeOf(this, EncryptionMaterialMissingError.prototype);
  }
}

export interface EncryptMnemonicsResult {
  vault: (LockedVault & { isEncrypted: true }) | Record<string, string>;
  requiredLock: boolean;
}

export interface EncryptMnemonicsOptions {
  /**
   * When true and no cached derived key exists, uses `lockAndGetKey` to derive
   * a fresh key and caches it in stash for subsequent operations.
   * When false, uses plain `lock` without caching the derived key.
   *
   * Typical usage:
   * - `true` when adding an account (caches key for future operations)
   * - `false` when removing an account (just re-encrypts what remains)
   *
   * @default true
   */
  cacheNewKey?: boolean;
}

/**
 * Encrypts a mnemonics record following the wallet's encryption decision tree.
 *
 * When a password is provided:
 * 1. Checks for a cached derived key in stash and reuses it if valid.
 * 2. Otherwise derives a new key (caching it if `cacheNewKey` is true) or
 *    uses plain `lock`.
 *
 * When no password is provided:
 * 1. Checks for a cached derived key and uses it if valid.
 * 2. Throws `EncryptionMaterialMissingError` when no encryption material
 *    is available — callers must surface the failure (and prompt the user
 *    for the password) rather than degrade the vault to plaintext.
 */
export async function encryptMnemonics(
  mnemonics: Record<string, string>,
  password?: string,
  options?: EncryptMnemonicsOptions
): Promise<EncryptMnemonicsResult> {
  const cacheNewKey = options?.cacheNewKey ?? true;

  if (password) {
    const cachedKey = await getStashItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);

    let lockedMnemonics: LockedVault & { isEncrypted: true };
    if (isKeyCacheValid(cachedKey)) {
      const vault = lockWithKey(mnemonics, cachedKey);
      lockedMnemonics = { ...vault, isEncrypted: true as const };
      await setStashItem(STASH_KEYS.DERIVED_KEY, refreshCachedKey(cachedKey));
    } else if (cacheNewKey) {
      const { vault, keyCache } = await lockAndGetKey(mnemonics, password);
      lockedMnemonics = { ...vault, isEncrypted: true as const };
      await setStashItem(STASH_KEYS.DERIVED_KEY, keyCache);
    } else {
      const vault = await lock(mnemonics, password);
      lockedMnemonics = { ...vault, isEncrypted: true as const };
    }

    return { vault: lockedMnemonics, requiredLock: true };
  }

  // No explicit password — re-encrypt using cached derived key
  const cachedKey = await getStashItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);
  if (isKeyCacheValid(cachedKey)) {
    const vault = lockWithKey(mnemonics, cachedKey);
    await setStashItem(STASH_KEYS.DERIVED_KEY, refreshCachedKey(cachedKey));
    return { vault: { ...vault, isEncrypted: true as const }, requiredLock: true };
  }

  throw new EncryptionMaterialMissingError();
}
