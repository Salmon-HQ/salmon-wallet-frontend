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

import {
  changeStoredPassword,
  getStoredMnemonics,
  isEncryptedMnemonics,
  initializeAccountsSecurity,
  resolveMnemonicsWithPassword,
  type StoredMnemonics,
} from './useAccountsSecurityHelpers';
import { lock } from '../crypto/encryption';
import * as storage from '../storage';

const mockGetStorageItem = vi.mocked(storage.getStorageItem);
const mockSetStorageItem = vi.mocked(storage.setStorageItem);

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

// Regression suite for the change-password lockout: changeStoredPassword used
// to persist the bare LockedVault without `isEncrypted: true`, so afterwards
// the stored value read as "plaintext" — unlock fed the vault object to
// loadAccounts and change-password reported "current password incorrect".
// Real crypto, storage mocked as an in-memory slot.
describe('changeStoredPassword — atomic, flagged, reversible', () => {
  const record = { 'account-1': 'test test test test' };

  /** Wires the mocked storage to a single in-memory MNEMONICS slot. */
  function useInMemoryStore(initial: unknown) {
    let slot = initial;
    mockGetStorageItem.mockImplementation(async () => slot as never);
    mockSetStorageItem.mockImplementation(async (_key, value) => {
      slot = value;
    });
    return { get: () => slot };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function makeStoredVault(password: string) {
    const vault = await lock(record, password);
    return { ...vault, isEncrypted: true as const };
  }

  it('change A→B: persists a flagged vault that unlocks with B, not A', async () => {
    const store = useInMemoryStore(await makeStoredVault('password-a'));

    await changeStoredPassword(store.get() as never, 'password-a', 'password-b');

    const persisted = (await getStoredMnemonics()) as StoredMnemonics;
    expect(isEncryptedMnemonics(persisted)).toBe(true);
    await expect(resolveMnemonicsWithPassword(persisted, 'password-b')).resolves.toEqual(record);
    await expect(resolveMnemonicsWithPassword(persisted, 'password-a')).rejects.toThrow();
  });

  it('change A→B then B→A works (the owner repro)', async () => {
    const store = useInMemoryStore(await makeStoredVault('password-a'));

    await changeStoredPassword(store.get() as never, 'password-a', 'password-b');
    const afterFirst = (await getStoredMnemonics()) as StoredMnemonics;
    expect(isEncryptedMnemonics(afterFirst)).toBe(true);

    await changeStoredPassword(afterFirst as never, 'password-b', 'password-a');
    const afterSecond = (await getStoredMnemonics()) as StoredMnemonics;
    await expect(resolveMnemonicsWithPassword(afterSecond, 'password-a')).resolves.toEqual(record);
  });

  it('wrong current password: throws before any write, old password stays valid', async () => {
    const store = useInMemoryStore(await makeStoredVault('password-a'));

    await expect(
      changeStoredPassword(store.get() as never, 'wrong-password', 'password-b')
    ).rejects.toThrow();

    expect(mockSetStorageItem).not.toHaveBeenCalled();
    await expect(
      resolveMnemonicsWithPassword(store.get() as StoredMnemonics, 'password-a')
    ).resolves.toEqual(record);
  });

  it('persist failure mid-change: rejects and the old vault (old password) survives', async () => {
    const store = useInMemoryStore(await makeStoredVault('password-a'));
    mockSetStorageItem.mockRejectedValueOnce(new Error('disk full'));

    await expect(
      changeStoredPassword(store.get() as never, 'password-a', 'password-b')
    ).rejects.toThrow('disk full');

    await expect(
      resolveMnemonicsWithPassword(store.get() as StoredMnemonics, 'password-a')
    ).resolves.toEqual(record);
  });
});

describe('isEncryptedMnemonics — heals vaults persisted without the flag', () => {
  it('recognizes a bare LockedVault (pre-fix change-password output) as encrypted', async () => {
    const bareVault = await lock({ 'account-1': 'x' }, 'password-a');
    expect(isEncryptedMnemonics(bareVault as StoredMnemonics)).toBe(true);
  });

  it('still treats a plaintext record as NOT encrypted', () => {
    expect(isEncryptedMnemonics({ 'account-1': 'word1 word2 word3' })).toBe(false);
  });

  it('a flagless vault still unlocks with the password it was locked with', async () => {
    const record = { 'account-1': 'seed words here' };
    const bareVault = (await lock(record, 'password-b')) as unknown as StoredMnemonics;
    await expect(resolveMnemonicsWithPassword(bareVault, 'password-b')).resolves.toEqual(record);
  });
});
