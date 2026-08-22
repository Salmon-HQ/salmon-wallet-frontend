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
import { getUnlockPenalty, unlockDelayMs, UNLOCK_FREE_ATTEMPTS } from '../utils/unlock-throttle';
import * as encryption from '../crypto/encryption';

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

function renderSecurity() {
  return renderHook(() =>
    useAccountsSecurity({
      setLocked: vi.fn(),
      setRequiredLock: vi.fn(),
      setReady: vi.fn(),
      setLoaded: vi.fn(),
      setError: vi.fn(),
      loadMetadata: vi.fn(async () => {}),
      loadAccounts: vi.fn(async () => {}),
      restoreAccount: vi.fn(),
      formatAccountForStorage: vi.fn(),
    })
  );
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
