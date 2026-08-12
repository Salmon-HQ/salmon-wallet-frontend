/**
 * Tests for the account-security helpers, focused on the fail-closed guard
 * for a corrupt vault (spec 012, US1 — the one production change in this batch).
 *
 * These are plain async functions (not React hooks), so they run in node with
 * only the storage layer mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../storage', () => ({
  getStorageItem: vi.fn(),
  setStorageItem: vi.fn(),
  getStashItem: vi.fn(),
  setStashItem: vi.fn(),
  removeStashItem: vi.fn(),
  updateLastActivity: vi.fn(),
  STORAGE_KEYS: { MNEMONICS: 'salmon_mnemonics' },
  STASH_KEYS: { DERIVED_KEY: 'derived_key_cache' },
}));

import { getStoredMnemonics, initializeAccountsSecurity } from './useAccountsSecurityHelpers';
import * as storage from '../storage';

const mockGetStorageItem = vi.mocked(storage.getStorageItem);

/** Builds the injected deps for initializeAccountsSecurity as vitest mocks. */
function makeParams() {
  return {
    loadAccounts: vi.fn(async () => {}),
    loadMetadata: vi.fn(async () => {}),
    setLoaded: vi.fn(),
    setLocked: vi.fn(),
    setRequiredLock: vi.fn(),
    unlockWithCachedKey: vi.fn(async () => false),
    isKeyCacheValidFn: vi.fn(() => false),
  };
}

describe('getStoredMnemonics — fail closed on a corrupt vault', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when storage surfaces a raw corrupt string', async () => {
    // createTypedStorage.getItem returns the raw string when JSON.parse fails;
    // that unparseable value must never be surfaced as StoredMnemonics.
    mockGetStorageItem.mockResolvedValue('}{ not json at all' as never);

    expect(await getStoredMnemonics()).toBeNull();
  });

  it('still returns a legitimate plaintext-legacy record (an object)', async () => {
    const record = { 'account-1': 'word1 word2 word3' };
    mockGetStorageItem.mockResolvedValue(record as never);

    expect(await getStoredMnemonics()).toEqual(record);
  });

  it('still returns a legitimate encrypted vault (an object)', async () => {
    const vault = { isEncrypted: true, encrypted: 'x', nonce: 'y', salt: 'z' };
    mockGetStorageItem.mockResolvedValue(vault as never);

    expect(await getStoredMnemonics()).toEqual(vault);
  });
});

describe('initializeAccountsSecurity — a corrupt vault does not skip the lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT set requiredLock=false or load accounts from a corrupt vault', async () => {
    mockGetStorageItem.mockResolvedValue('corrupt-garbage' as never);
    const params = makeParams();

    const result = await initializeAccountsSecurity(params);

    // Corrupt → getStoredMnemonics returns null → the "no wallet" branch runs.
    expect(result).toBe(false);
    expect(params.setRequiredLock).not.toHaveBeenCalled();
    expect(params.loadAccounts).not.toHaveBeenCalled();
    expect(params.setLoaded).toHaveBeenCalledWith(true);
  });

  it('keeps the legacy plaintext path working (loads accounts, requiredLock=false)', async () => {
    const record = { 'account-1': 'word1 word2 word3' };
    mockGetStorageItem.mockResolvedValue(record as never);
    const params = makeParams();

    const result = await initializeAccountsSecurity(params);

    expect(result).toBe(true);
    expect(params.loadAccounts).toHaveBeenCalledWith(record);
    expect(params.setRequiredLock).toHaveBeenCalledWith(false);
  });
});
