/**
 * @vitest-environment jsdom
 *
 * Unlock throttling — the lock prompt must cost an attacker time.
 *
 * PBKDF2 makes one *offline* guess expensive, but an attacker holding an
 * unlocked device can retype passwords into the prompt as fast as the UI
 * accepts them. These tests pin the online cost: a growing, persisted delay
 * that a process restart does not reset.
 *
 * No real key material appears here — the vault is a stub and every password
 * is obviously fake.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useAccountsSecurity } from './useAccountsSecurity';
import {
  getUnlockPenalty,
  unlockDelayMs,
  UNLOCK_FREE_ATTEMPTS,
  UnlockThrottledError,
} from '../utils/unlock-throttle';
import * as encryption from '../crypto/encryption';
import { migrateLegacyWallets } from '../utils/legacy-migration';

// ---------------------------------------------------------------------------
// Mocks — a stateful storage so persistence across hook instances is testable
// ---------------------------------------------------------------------------

const storageMap = new Map<string, unknown>();
const stashMap = new Map<string, unknown>();

vi.mock('../storage', () => ({
  getStorageItem: vi.fn(async (key: string) => storageMap.get(key) ?? null),
  setStorageItem: vi.fn(async (key: string, value: unknown) => {
    storageMap.set(key, value);
  }),
  removeStorageItem: vi.fn(async (key: string) => {
    storageMap.delete(key);
  }),
  getStashItem: vi.fn(async (key: string) => stashMap.get(key) ?? null),
  setStashItem: vi.fn(async (key: string, value: unknown) => {
    stashMap.set(key, value);
  }),
  removeStashItem: vi.fn(async (key: string) => {
    stashMap.delete(key);
  }),
  updateLastActivity: vi.fn(),
  STORAGE_KEYS: {
    MNEMONICS: 'salmon_mnemonics',
    ACCOUNTS: 'salmon_accounts',
    UNLOCK_ATTEMPTS: 'salmon_unlock_attempts',
  },
  STASH_KEYS: {
    PASSWORD: 'password',
    DERIVED_KEY: 'derived_key_cache',
    LAST_ACTIVITY: 'salmon_last_activity',
  },
}));

vi.mock('../crypto/encryption', () => ({
  lock: vi.fn(),
  unlock: vi.fn(),
  unlockAndGetKey: vi.fn(),
  unlockWithKey: vi.fn(),
  lockWithKey: vi.fn(),
  lockAndGetKey: vi.fn(),
  isKeyCacheValid: vi.fn(),
  refreshCachedKey: vi.fn((keyCache) => keyCache),
  DEFAULT_ITERATIONS: 210000,
  DEFAULT_DIGEST: 'sha512',
}));

vi.mock('../utils/legacy-migration', () => ({
  migrateLegacyWallets: vi.fn(async () => ({ status: 'no-migration' })),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ENCRYPTED_VAULT = {
  isEncrypted: true as const,
  nonce: 'stub-nonce',
  salt: 'stub-salt',
  ciphertext: 'stub-ciphertext',
  digest: 'sha512' as const,
  iterations: 210000,
};

/** Obviously fake — never a real password. */
const WRONG_PASSWORD = 'not-the-password-000';

function securityParams() {
  return {
    setLocked: vi.fn(),
    setRequiredLock: vi.fn(),
    setReady: vi.fn(),
    setLoaded: vi.fn(),
    setError: vi.fn(),
    setUnprotectedAddresses: vi.fn(),
    loadMetadata: vi.fn(async () => {}),
    loadAccounts: vi.fn(async () => {}),
    restoreAccount: vi.fn(),
    formatAccountForStorage: vi.fn(),
  };
}

function renderSecurity(params = securityParams()) {
  return renderHook(() => useAccountsSecurity(params));
}

async function failUnlock(unlock: (password: string) => Promise<boolean>, times: number) {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await unlock(WRONG_PASSWORD);
    });
  }
}

describe('useAccountsSecurity — unlock throttling', () => {
  beforeEach(() => {
    storageMap.clear();
    stashMap.clear();
    storageMap.set('salmon_mnemonics', ENCRYPTED_VAULT);
    vi.mocked(encryption.unlockAndGetKey).mockRejectedValue(new Error('Decryption failed'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('stops touching the vault once wrong passwords pile up', async () => {
    const { result } = renderSecurity();

    await failUnlock(result.current.unlockAccounts, 6);
    const attemptsSoFar = vi.mocked(encryption.unlockAndGetKey).mock.calls.length;

    let accepted = true;
    await act(async () => {
      accepted = await result.current.unlockAccounts(WRONG_PASSWORD);
    });

    expect(accepted).toBe(false);
    // Rejected by the throttle, not by decryption: the vault was never opened.
    expect(vi.mocked(encryption.unlockAndGetKey).mock.calls.length).toBe(attemptsSoFar);
  });

  it('lets an ordinary typo through without a wait', async () => {
    const { result } = renderSecurity();

    await failUnlock(result.current.unlockAccounts, UNLOCK_FREE_ATTEMPTS);

    // Every one of them reached the vault — no penalty before the free ones
    // are spent.
    expect(vi.mocked(encryption.unlockAndGetKey)).toHaveBeenCalledTimes(UNLOCK_FREE_ATTEMPTS);
    expect((await getUnlockPenalty()).remainingMs).toBe(0);
  });

  it('grows the wait with each further failure instead of blocking outright', async () => {
    const { result } = renderSecurity();
    await failUnlock(result.current.unlockAccounts, UNLOCK_FREE_ATTEMPTS + 1);

    // The first penalty is a real wait...
    expect((await getUnlockPenalty()).remainingMs).toBeGreaterThan(0);

    // ...and each further failure costs more, up to a ceiling. Never infinite:
    // the owner always gets back in by waiting.
    for (let n = UNLOCK_FREE_ATTEMPTS + 1; n < UNLOCK_FREE_ATTEMPTS + 5; n += 1) {
      expect(unlockDelayMs(n + 1)).toBeGreaterThan(unlockDelayMs(n));
    }
    expect(unlockDelayMs(50)).toBe(unlockDelayMs(500));
  });

  it('forgets the failures once the right password arrives', async () => {
    const { result } = renderSecurity();

    await failUnlock(result.current.unlockAccounts, UNLOCK_FREE_ATTEMPTS);
    vi.mocked(encryption.unlockAndGetKey).mockResolvedValue({
      data: { 'account-1': 'stub mnemonic value' },
      keyCache: { key: [1], salt: 'stub-salt', iterations: 210000, digest: 'sha512' },
    } as never);

    await act(async () => {
      await result.current.unlockAccounts('right-password-000');
    });

    expect(await getUnlockPenalty()).toEqual({ failedAttempts: 0, remainingMs: 0 });
  });

  it('does not release the penalty when the device clock is wound back', async () => {
    const { result } = renderSecurity();
    await failUnlock(result.current.unlockAccounts, UNLOCK_FREE_ATTEMPTS + 1);

    const record = storageMap.get('salmon_unlock_attempts') as { lastFailedAt: number };
    // Pretend the failure happened "in the future" — what a rewound clock looks
    // like from here.
    storageMap.set('salmon_unlock_attempts', {
      failedAttempts: UNLOCK_FREE_ATTEMPTS + 1,
      lastFailedAt: record.lastFailedAt + 60 * 60 * 1000,
    });

    expect((await getUnlockPenalty()).remainingMs).toBeGreaterThan(0);
  });

  it('keeps the penalty across a restart of the app', async () => {
    const first = renderSecurity();
    await failUnlock(first.result.current.unlockAccounts, 6);
    first.unmount();

    // Fresh hook instance = fresh process. Persisted state must survive it.
    const second = renderSecurity();
    const attemptsSoFar = vi.mocked(encryption.unlockAndGetKey).mock.calls.length;

    let accepted = true;
    await act(async () => {
      accepted = await second.result.current.unlockAccounts(WRONG_PASSWORD);
    });

    expect(accepted).toBe(false);
    expect(vi.mocked(encryption.unlockAndGetKey).mock.calls.length).toBe(attemptsSoFar);
  });
});

describe('useAccountsSecurity — re-auth throttling', () => {
  beforeEach(() => {
    storageMap.clear();
    stashMap.clear();
    storageMap.set('salmon_mnemonics', ENCRYPTED_VAULT);
    vi.mocked(encryption.unlockAndGetKey).mockRejectedValue(new Error('Decryption failed'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('makes wrong guesses at the re-auth prompt cost the same as at the lock screen', async () => {
    const { result } = renderSecurity();

    for (let i = 0; i < UNLOCK_FREE_ATTEMPTS + 1; i += 1) {
      await act(async () => {
        await result.current.checkPassword(WRONG_PASSWORD);
      });
    }

    expect((await getUnlockPenalty()).remainingMs).toBeGreaterThan(0);

    const attemptsSoFar = vi.mocked(encryption.unlockAndGetKey).mock.calls.length;
    // Refused as a wait, not as a wrong password: the password may be right,
    // and "wrong password" sends the owner guessing again.
    await act(async () => {
      await expect(result.current.checkPassword(WRONG_PASSWORD)).rejects.toBeInstanceOf(
        UnlockThrottledError
      );
    });

    // Refused by the throttle, not by decryption: the vault was never opened.
    expect(vi.mocked(encryption.unlockAndGetKey).mock.calls.length).toBe(attemptsSoFar);
  });

  it('refuses a password change while a penalty stands', async () => {
    const { result } = renderSecurity();

    for (let i = 0; i < UNLOCK_FREE_ATTEMPTS + 1; i += 1) {
      await act(async () => {
        await result.current.checkPassword(WRONG_PASSWORD);
      });
    }

    const attemptsSoFar = vi.mocked(encryption.unlockAndGetKey).mock.calls.length;
    await act(async () => {
      await expect(
        result.current.changePassword(WRONG_PASSWORD, 'new-password-000')
      ).rejects.toBeInstanceOf(UnlockThrottledError);
    });

    expect(vi.mocked(encryption.unlockAndGetKey).mock.calls.length).toBe(attemptsSoFar);
  });

  it('forgets the failures once the right password arrives at the re-auth prompt', async () => {
    const { result } = renderSecurity();

    await act(async () => {
      await result.current.checkPassword(WRONG_PASSWORD);
    });
    vi.mocked(encryption.unlockAndGetKey).mockResolvedValue({
      data: { 'account-1': 'stub mnemonic value' },
      keyCache: { key: [1], salt: 'stub-salt', iterations: 210000, digest: 'sha512' },
    } as never);

    let accepted = false;
    await act(async () => {
      accepted = await result.current.checkPassword('right-password-000');
    });

    expect(accepted).toBe(true);
    expect(await getUnlockPenalty()).toEqual({ failedAttempts: 0, remainingMs: 0 });
  });
});

describe('useAccountsSecurity — the password gate with no vault behind it', () => {
  beforeEach(() => {
    storageMap.clear();
    stashMap.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // The gate stands in front of revealing a seed or key and removing a
  // wallet; with nothing encrypted to check the password against, nothing has
  // proven the password, so the gate stays shut.
  it.each([
    ['no stored vault', undefined],
    ['a cleartext record', { 'account-1': 'stub mnemonic value' }],
  ])('refuses every password when there is %s', async (_label, stored) => {
    if (stored) storageMap.set('salmon_mnemonics', stored);
    const { result } = renderSecurity();

    let accepted = true;
    await act(async () => {
      accepted = await result.current.checkPassword('any-password-000');
    });

    expect(accepted).toBe(false);
  });
});

describe('useAccountsSecurity — protecting a wallet that has no password', () => {
  const STRONG = 'Correct-Horse-Battery-9!';
  const LOCKED = { encrypted: 'stub-ciphertext', nonce: 'n', salt: 's', iterations: 210000 };
  const KEY_CACHE = { key: [1], salt: 's', expiresAt: Number.MAX_SAFE_INTEGER };

  beforeEach(() => {
    storageMap.clear();
    stashMap.clear();
    vi.mocked(encryption.lockAndGetKey).mockResolvedValue({
      vault: LOCKED,
      keyCache: KEY_CACHE,
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('encrypts a cleartext vault in place under the chosen password', async () => {
    const record = { 'account-1': 'stub mnemonic value' };
    storageMap.set('salmon_mnemonics', record);
    const params = securityParams();
    const { result } = renderSecurity(params);

    let protectedNow = false;
    await act(async () => {
      protectedNow = await result.current.protectWallet(STRONG);
    });

    expect(protectedNow).toBe(true);
    expect(encryption.lockAndGetKey).toHaveBeenCalledWith(record, STRONG);
    expect(storageMap.get('salmon_mnemonics')).toEqual({ ...LOCKED, isEncrypted: true });
    expect(stashMap.get('derived_key_cache')).toEqual(KEY_CACHE);
    expect(params.loadAccounts).toHaveBeenCalledWith(record);
    expect(params.setLocked).toHaveBeenLastCalledWith(false);
    expect(params.setRequiredLock).toHaveBeenCalledWith(true);
    expect(params.setUnprotectedAddresses).toHaveBeenLastCalledWith(null);
  });

  it('migrates an unprotected legacy record under the chosen password, and opens it', async () => {
    const secrets = { 'account-1': 'stub mnemonic value' };
    vi.mocked(migrateLegacyWallets).mockImplementationOnce(async () => {
      storageMap.set('salmon_mnemonics', ENCRYPTED_VAULT);
      return { status: 'migrated' } as never;
    });
    vi.mocked(encryption.unlockAndGetKey).mockResolvedValue({
      data: secrets,
      keyCache: KEY_CACHE,
    } as never);
    const params = securityParams();
    const { result } = renderSecurity(params);

    await act(() => result.current.protectWallet(STRONG));

    expect(migrateLegacyWallets).toHaveBeenCalledWith(expect.anything(), STRONG, {
      newPassword: true,
    });
    expect(params.loadAccounts).toHaveBeenCalledWith(secrets);
    expect(params.setLocked).toHaveBeenLastCalledWith(false);
    expect(params.setRequiredLock).toHaveBeenCalledWith(true);
    expect(params.setUnprotectedAddresses).toHaveBeenLastCalledWith(null);
  });

  it('refuses a password the strength check refuses, and writes nothing', async () => {
    storageMap.set('salmon_mnemonics', { 'account-1': 'stub mnemonic value' });
    const { result } = renderSecurity();

    await act(async () => {
      expect(await result.current.protectWallet('short')).toBe(false);
    });

    expect(storageMap.get('salmon_mnemonics')).toEqual({ 'account-1': 'stub mnemonic value' });
  });

  it('refuses when the wallet already has a password', async () => {
    storageMap.set('salmon_mnemonics', ENCRYPTED_VAULT);
    const { result } = renderSecurity();

    await act(async () => {
      expect(await result.current.protectWallet(STRONG)).toBe(false);
    });

    expect(encryption.lockAndGetKey).not.toHaveBeenCalled();
  });

  it('names the addresses of an unprotected legacy record when the wallet starts', async () => {
    vi.mocked(migrateLegacyWallets).mockResolvedValueOnce({
      status: 'needs-new-password',
      addresses: ['Addr1'],
    } as never);
    const params = securityParams();
    const { result } = renderSecurity(params);

    await act(() => result.current.initAccounts());

    expect(params.setUnprotectedAddresses).toHaveBeenCalledWith(['Addr1']);
    expect(params.setLocked).not.toHaveBeenCalledWith(true);
  });

  /** An account whose mainnet slot "derives" `address` (the real derivation is mnemonic.test.ts's). */
  const restoredWith = (address: string) => ({
    networksAccounts: { 'solana-mainnet': [{ getReceiveAddress: () => address }] },
  });

  it('names the addresses a cleartext vault derives when the wallet starts, loading no wallet', async () => {
    storageMap.set('salmon_mnemonics', { 'account-1': 'stub mnemonic value' });
    storageMap.set('salmon_accounts', [
      { id: 'account-1', pathIndexes: { 'solana-mainnet': [0] } },
    ]);
    const params = securityParams();
    params.restoreAccount.mockResolvedValue(restoredWith('Derived1'));
    const { result } = renderSecurity(params);

    await act(() => result.current.initAccounts());

    expect(params.restoreAccount).toHaveBeenCalledTimes(1);
    const [{ secret, pathIndexes }] = vi.mocked(params.restoreAccount).mock.calls[0];
    // The phrase is sealed (readable, not enumerable), so compare its fields.
    expect(secret.kind === 'mnemonic' && secret.mnemonic).toBe('stub mnemonic value');
    expect(pathIndexes).toEqual({ 'solana-mainnet': [0] });
    expect(params.setUnprotectedAddresses).toHaveBeenCalledWith(['Derived1']);
    expect(params.loadAccounts).not.toHaveBeenCalled();
    expect(params.setError).toHaveBeenLastCalledWith(null);
  });

  it('fails the start when a cleartext vault derives no address to recognise', async () => {
    storageMap.set('salmon_mnemonics', {
      'account-1': { kind: 'watchOnly', networkId: 'solana-mainnet', address: 'Claimed1' },
    });
    const params = securityParams();
    const { result } = renderSecurity(params);

    await act(() => result.current.initAccounts());

    expect(params.restoreAccount).not.toHaveBeenCalled();
    expect(params.setUnprotectedAddresses).not.toHaveBeenCalled();
    expect(params.setError).toHaveBeenLastCalledWith(expect.any(String));
  });

  describe('under the wallet write lock', () => {
    const request = vi.fn();
    beforeEach(() => {
      request.mockImplementation((_name: string, write: () => Promise<unknown>) => write());
      Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });
    });
    afterEach(() => {
      Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
    });

    it('protects while holding the lock every wallet write takes', async () => {
      storageMap.set('salmon_mnemonics', { 'account-1': 'stub mnemonic value' });
      const { result } = renderSecurity();

      await act(() => result.current.protectWallet(STRONG));

      expect(request).toHaveBeenCalledWith('salmon-vault-write', expect.any(Function));
    });

    it('re-reads the vault once it holds the lock: one another window protected first is left alone', async () => {
      storageMap.set('salmon_mnemonics', { 'account-1': 'stub mnemonic value' });
      request.mockImplementation(async (_name: string, write: () => Promise<unknown>) => {
        storageMap.set('salmon_mnemonics', ENCRYPTED_VAULT);
        return write();
      });
      const { result } = renderSecurity();

      await act(async () => {
        expect(await result.current.protectWallet(STRONG)).toBe(false);
      });

      expect(encryption.lockAndGetKey).not.toHaveBeenCalled();
      expect(storageMap.get('salmon_mnemonics')).toEqual(ENCRYPTED_VAULT);
    });
  });
});

describe('useAccountsSecurity — what counts as activity', () => {
  const KEY_CACHE = { key: 'stub-key', salt: 'stub-salt', expiresAt: Number.MAX_SAFE_INTEGER };

  beforeEach(async () => {
    storageMap.clear();
    stashMap.clear();
    storageMap.set('salmon_mnemonics', ENCRYPTED_VAULT);
    vi.mocked(encryption.unlockWithKey).mockReturnValue({ mnemonics: [] } as never);
    vi.mocked(encryption.unlockAndGetKey).mockResolvedValue({
      data: { mnemonics: [] },
      keyCache: KEY_CACHE,
    } as never);
    const { updateLastActivity } = await import('../storage');
    vi.mocked(updateLastActivity).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Every window the wallet opens unlocks itself through the cached key,
  // including an approval window a web page asked for. Writing activity there
  // let a page postpone the auto-lock by sending a request every few minutes.
  it('does not count a window unlocking through the cached key as activity', async () => {
    const { updateLastActivity } = await import('../storage');
    const { result } = renderSecurity();

    let unlocked = false;
    await act(async () => {
      unlocked = await result.current.unlockWithCachedKey(KEY_CACHE as never);
    });

    expect(unlocked).toBe(true);
    expect(updateLastActivity).not.toHaveBeenCalled();
    // Rewriting the cached key re-arms the background auto-lock just the same.
    expect(stashMap.has('derived_key_cache')).toBe(false);
  });

  it('counts typing the password as activity', async () => {
    const { updateLastActivity } = await import('../storage');
    const { result } = renderSecurity();

    await act(async () => {
      await result.current.unlockAccounts('obviously-fake-password');
    });

    expect(updateLastActivity).toHaveBeenCalledTimes(1);
  });
});
