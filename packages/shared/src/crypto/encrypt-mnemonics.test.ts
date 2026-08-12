/**
 * Tests for encryptMnemonics — focuses on the sliding-TTL behavior of the
 * cached derived key. The crypto pipeline itself is exercised by
 * encryption.test.ts; here we verify the stash interaction at the boundary.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native-fast-crypto', () => ({ pbkdf2: null }));

import { encryptMnemonics, EncryptionMaterialMissingError } from './encrypt-mnemonics';
import { lockAndGetKey, KEY_CACHE_TTL, type DerivedKeyCache } from './encryption';
import { initStash, resetStash, getStashItem, setStashItem, STASH_KEYS } from '../storage';

const TEST_PASSWORD = 'pw-1234';
const TEST_MNEMONICS = { 'account-1': 'word '.repeat(12).trim() };

beforeEach(() => {
  initStash('mobile');
});

afterEach(() => {
  resetStash();
  vi.useRealTimers();
});

describe('encryptMnemonics — sliding TTL', () => {
  it('refreshes the cached key expiresAt when re-using it with a password', async () => {
    // Seed an unlocked session: cache a derived key in the stash with a
    // short remaining TTL so we can observe the refresh.
    const { keyCache } = await lockAndGetKey(TEST_MNEMONICS, TEST_PASSWORD, { iterations: 1000 });
    const aboutToExpire: DerivedKeyCache = { ...keyCache, expiresAt: Date.now() + 100 };
    await setStashItem(STASH_KEYS.DERIVED_KEY, aboutToExpire);

    const before = Date.now();
    const result = await encryptMnemonics(TEST_MNEMONICS, TEST_PASSWORD, { cacheNewKey: true });
    const after = Date.now();

    expect(result.requiredLock).toBe(true);
    const persisted = await getStashItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);
    expect(persisted?.expiresAt).toBeGreaterThanOrEqual(before + KEY_CACHE_TTL);
    expect(persisted?.expiresAt).toBeLessThanOrEqual(after + KEY_CACHE_TTL);
  });

  it('refreshes the cached key expiresAt when re-using it without a password', async () => {
    const { keyCache } = await lockAndGetKey(TEST_MNEMONICS, TEST_PASSWORD, { iterations: 1000 });
    const aboutToExpire: DerivedKeyCache = { ...keyCache, expiresAt: Date.now() + 100 };
    await setStashItem(STASH_KEYS.DERIVED_KEY, aboutToExpire);

    const before = Date.now();
    const result = await encryptMnemonics(TEST_MNEMONICS);
    const after = Date.now();

    expect(result.requiredLock).toBe(true);
    const persisted = await getStashItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);
    expect(persisted?.expiresAt).toBeGreaterThanOrEqual(before + KEY_CACHE_TTL);
    expect(persisted?.expiresAt).toBeLessThanOrEqual(after + KEY_CACHE_TTL);
  });

  it('falls back to deriving a new key when the cached key has expired and a password is provided', async () => {
    const { keyCache } = await lockAndGetKey(TEST_MNEMONICS, TEST_PASSWORD, { iterations: 1000 });
    const expired: DerivedKeyCache = { ...keyCache, expiresAt: Date.now() - 1 };
    await setStashItem(STASH_KEYS.DERIVED_KEY, expired);

    const result = await encryptMnemonics(TEST_MNEMONICS, TEST_PASSWORD, { cacheNewKey: true });
    expect(result.requiredLock).toBe(true);

    const persisted = await getStashItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);
    expect(persisted?.expiresAt).toBeGreaterThan(Date.now());
  });
});

describe('encryptMnemonics — missing material', () => {
  it('throws EncryptionMaterialMissingError when no password and no cached key', async () => {
    await expect(encryptMnemonics(TEST_MNEMONICS)).rejects.toBeInstanceOf(
      EncryptionMaterialMissingError
    );
  });

  it('throws EncryptionMaterialMissingError when no password and cached key has expired', async () => {
    const { keyCache } = await lockAndGetKey(TEST_MNEMONICS, TEST_PASSWORD, { iterations: 1000 });
    const expired: DerivedKeyCache = { ...keyCache, expiresAt: Date.now() - 1 };
    await setStashItem(STASH_KEYS.DERIVED_KEY, expired);

    await expect(encryptMnemonics(TEST_MNEMONICS)).rejects.toBeInstanceOf(
      EncryptionMaterialMissingError
    );
  });

  it('does not write anything to the stash when it throws', async () => {
    await expect(encryptMnemonics(TEST_MNEMONICS)).rejects.toBeInstanceOf(
      EncryptionMaterialMissingError
    );
    const persisted = await getStashItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);
    expect(persisted).toBeUndefined();
  });
});
