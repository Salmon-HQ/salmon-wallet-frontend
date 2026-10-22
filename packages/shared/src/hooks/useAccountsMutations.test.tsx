/**
 * @vitest-environment jsdom
 *
 * Two wallet windows, one storage. Each window holds the wallet list it
 * loaded in its own memory; a change made in one must not erase a wallet the
 * other added since. Each test mounts the mutations twice over one in-memory
 * storage and one stash holding a cached key.
 */
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  STORAGE_KEYS: {
    COUNTER: 'salmon_account_counter',
    ACCOUNTS: 'salmon_accounts',
    MNEMONICS: 'salmon_mnemonics',
    ACCOUNT_ID: 'salmon_active_account_id',
    NETWORK_ID: 'salmon_active_network_id',
    PATH_INDEX: 'salmon_active_path_index',
    TRUSTED_APPS: 'salmon_trusted_apps',
    CUSTOM_TOKENS: 'salmon_custom_tokens',
    CONNECTION: 'salmon_connection',
    UNLOCK_ATTEMPTS: 'salmon_unlock_attempts',
  },
  STASH_KEYS: { DERIVED_KEY: 'derived_key_cache' },
}));

vi.mock('../blockchain/solana/seed-vault-signer', () => ({
  releaseSeedVaultAccess: vi.fn(),
}));

// A see-through cipher: tweetnacl refuses jsdom's typed arrays, and what is
// under test is which secrets each window writes, not the encryption.
vi.mock('../crypto/encryption', () => {
  const seal = (data: unknown) => ({
    encrypted: JSON.stringify(data),
    nonce: 'n',
    salt: 's',
    iterations: 1,
  });
  return {
    lock: vi.fn(async (data: unknown) => seal(data)),
    lockAndGetKey: vi.fn(async (data: unknown) => ({
      vault: seal(data),
      keyCache: { key: [1], salt: 's' },
    })),
    lockWithKey: vi.fn(seal),
    unlockWithKey: vi.fn((vault: { encrypted: string }) => JSON.parse(vault.encrypted)),
    // The password that opens the see-through vault is `right-password`.
    unlockAndGetKey: vi.fn(async (vault: { encrypted: string }, password: string) => {
      if (password !== 'right-password') throw new Error('Decryption failed');
      return { data: JSON.parse(vault.encrypted), keyCache: { key: [1], salt: 's' } };
    }),
    isKeyCacheValid: vi.fn((key: unknown) => !!key),
    refreshCachedKey: vi.fn((key: unknown) => key),
    DEFAULT_ITERATIONS: 1,
    DEFAULT_DIGEST: 'sha512',
  };
});

import { useAccountsMutations } from './useAccountsMutations';
import { isOwnStoredAccountsWrite } from './useAccountsMutationHelpers';
import { releaseSeedVaultAccess } from '../blockchain/solana/seed-vault-signer';
import {
  getUnlockPenalty,
  recordFailedUnlock,
  UnlockThrottledError,
} from '../utils/unlock-throttle';
import * as storage from '../storage';
import type { Account, StoredAccount } from '../types/account';
import type { CustomTokens } from '../types/token';
import type { TrustedApps } from '../types/trusted-app';

/** A wallet with an obviously fake secret: the vault only ever sees strings. */
const wallet = (id: string): Account => ({
  id,
  name: id,
  avatar: 'default',
  secret: { kind: 'mnemonic', mnemonic: `secret-of-${id}` },
  pathIndexes: {},
  networksAccounts: {},
});

const formatAccountForStorage = ({ id, name, avatar }: Account): StoredAccount => ({
  id,
  name,
  avatar,
  pathIndexes: {},
});

/** What happened, in order, across the windows' state and storage. */
const events: string[] = [];

/** One wallet window: its own in-memory list, loaded from storage when it opened. */
function openWindow(loaded: Account[]) {
  return renderHook(() => {
    const [counter, setCounter] = useState(loaded.length);
    const [accounts, setAccountsState] = useState(loaded);
    const setAccounts: typeof setAccountsState = (next) => {
      events.push('memory:accounts');
      setAccountsState(next);
    };
    const [accountId, setAccountId] = useState<string | null>(loaded[0]?.id ?? null);
    const [networkId, setNetworkId] = useState<string | null>(null);
    const [, setPathIndex] = useState(0);
    const [, setLocked] = useState(false);
    const [, setRequiredLock] = useState(true);
    const [, setTrustedApps] = useState<TrustedApps>({});
    const [, setTokens] = useState<CustomTokens>({});
    return useAccountsMutations({
      counter,
      setCounter,
      accounts,
      setAccounts,
      accountId,
      setAccountId,
      networkId,
      setNetworkId,
      setPathIndex,
      setLocked,
      setRequiredLock,
      setTrustedApps,
      setTokens,
      formatAccountForStorage,
    });
  });
}

const storedIds = () =>
  ((storageMap.get('salmon_accounts') as StoredAccount[] | undefined) ?? []).map(({ id }) => id);

const storedSecrets = () =>
  Object.keys(JSON.parse((storageMap.get('salmon_mnemonics') as { encrypted: string }).encrypted));

beforeEach(() => {
  events.length = 0;
  vi.mocked(storage.setStorageItem).mockClear();
  vi.mocked(storage.removeStorageItem).mockClear();
  storageMap.clear();
  stashMap.clear();
  storageMap.set('salmon_mnemonics', {
    isEncrypted: true,
    encrypted: JSON.stringify({ W: 'secret-of-W' }),
    nonce: 'n',
    salt: 's',
    iterations: 1,
  });
  storageMap.set('salmon_accounts', [formatAccountForStorage(wallet('W'))]);
  stashMap.set('derived_key_cache', { key: [1], salt: 's' });
});

describe('useAccountsMutations across two windows', () => {
  it('keeps a wallet added in one window when the other adds one too', async () => {
    const sidePanelA = openWindow([wallet('W')]);
    const sidePanelB = openWindow([wallet('W')]);

    await act(() => sidePanelA.result.current.addAccount(wallet('X')));
    await act(() => sidePanelB.result.current.addAccount(wallet('Y')));

    expect(storedIds()).toEqual(['W', 'X', 'Y']);
    expect(storedSecrets().sort()).toEqual(['W', 'X', 'Y']);
  });

  it('keeps a wallet added in one window when the other removes a wallet', async () => {
    const sidePanelA = openWindow([wallet('W')]);
    const sidePanelB = openWindow([wallet('W')]);

    await act(() => sidePanelA.result.current.addAccount(wallet('X')));
    await act(() => sidePanelB.result.current.removeAccount('W'));

    expect(storedIds()).toEqual(['X']);
    expect(storedSecrets()).toEqual(['X']);
  });
});

const seedVaultWallet = (id: string, authToken: string): Account => ({
  ...wallet(id),
  secret: {
    kind: 'seedVault',
    authToken,
    derivationPath: "m/44'/501'/0'/0'",
    address: `addr-${id}`,
    networkId: 'solana-mainnet',
  } as Account['secret'],
});

const storeVault = (secrets: Record<string, unknown>) =>
  storageMap.set('salmon_mnemonics', {
    isEncrypted: true,
    encrypted: JSON.stringify(secrets),
    nonce: 'n',
    salt: 's',
    iterations: 1,
  });

describe('useAccountsMutations writing one change at a time', () => {
  it('lands two writes started together in one window', async () => {
    const sidePanel = openWindow([wallet('W')]);

    await act(() =>
      Promise.all([
        sidePanel.result.current.addAccount(wallet('X')),
        sidePanel.result.current.addAccount(wallet('Y')),
      ])
    );

    expect(storedIds().sort()).toEqual(['W', 'X', 'Y']);
    expect(storedSecrets().sort()).toEqual(['W', 'X', 'Y']);
  });

  it('takes the Web Locks lock where the runtime has one', async () => {
    const request = vi.fn((_name: string, write: () => Promise<unknown>) => write());
    vi.stubGlobal('navigator', { ...navigator, locks: { request } });
    try {
      const sidePanel = openWindow([wallet('W')]);
      await act(() => sidePanel.result.current.addAccount(wallet('X')));
      expect(request).toHaveBeenCalledWith('salmon-vault-write', expect.any(Function));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('marks the list it wrote, so its own window is not taken for stale', async () => {
    const sidePanel = openWindow([wallet('W')]);

    await act(() => sidePanel.result.current.addAccount(wallet('X')));

    expect(isOwnStoredAccountsWrite(['X', 'W'])).toBe(true);
  });

  // The mark answers for the one change its write caused. Left standing, a later
  // list from another window with the same ids would pass for this window's own.
  it('spends the mark on the first change it is checked against', async () => {
    const sidePanel = openWindow([wallet('W')]);

    await act(() => sidePanel.result.current.addAccount(wallet('X')));
    expect(isOwnStoredAccountsWrite(['W', 'X'])).toBe(true);
    expect(isOwnStoredAccountsWrite(['W', 'X'])).toBe(false);

    await act(() => sidePanel.result.current.addAccount(wallet('Y')));
    expect(isOwnStoredAccountsWrite(['W'])).toBe(false);
    expect(isOwnStoredAccountsWrite(['W', 'X', 'Y'])).toBe(false);
  });
});

describe('useAccountsMutations editing from a stale window', () => {
  beforeEach(() => {
    storageMap.set('salmon_accounts', [wallet('W'), wallet('X')].map(formatAccountForStorage));
    storeVault({ W: 'secret-of-W', X: 'secret-of-X' });
  });

  // 1. both windows hold W and X; 2. B removes X; 3. A, still holding X, renames
  // W; 4. A derives a new slot for W. X must not come back: a listed wallet with
  // no seed in the vault fails every unlock after.
  it('never writes back a wallet another window removed', async () => {
    const sidePanelA = openWindow([wallet('W'), wallet('X')]);
    const sidePanelB = openWindow([wallet('W'), wallet('X')]);

    await act(() => sidePanelB.result.current.removeAccount('X'));
    await act(() => sidePanelA.result.current.editAccount('W', { name: 'Renamed' }));
    await act(() =>
      sidePanelA.result.current.editAccount('W', {
        newDerivedAccounts: [{ network: { id: 'solana-devnet' }, index: 0 }] as never,
      })
    );

    expect(storedIds()).toEqual(['W']);
    expect(storedSecrets()).toEqual(['W']);
    const stored = storageMap.get('salmon_accounts') as StoredAccount[];
    expect(stored[0].name).toBe('Renamed');
  });

  it('writes nothing when the wallet it edits is no longer stored', async () => {
    const sidePanelA = openWindow([wallet('W'), wallet('X')]);
    const sidePanelB = openWindow([wallet('W'), wallet('X')]);

    await act(() => sidePanelB.result.current.removeAccount('X'));
    vi.mocked(storage.setStorageItem).mockClear();
    await act(() => sidePanelA.result.current.editAccount('X', { name: 'Gone' }));

    expect(storage.setStorageItem).not.toHaveBeenCalled();
    expect(storedIds()).toEqual(['W']);
  });

  it('takes the wallet write lock', async () => {
    const request = vi.fn((_name: string, write: () => Promise<unknown>) => write());
    vi.stubGlobal('navigator', { ...navigator, locks: { request } });
    try {
      const sidePanel = openWindow([wallet('W'), wallet('X')]);
      await act(() => sidePanel.result.current.editAccount('W', { name: 'Renamed' }));
      expect(request).toHaveBeenCalledWith('salmon-vault-write', expect.any(Function));
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('useAccountsMutations removing', () => {
  it('writes the vault before the list', async () => {
    storageMap.set('salmon_accounts', [wallet('W'), wallet('X')].map(formatAccountForStorage));
    storeVault({ W: 'secret-of-W', X: 'secret-of-X' });
    const sidePanel = openWindow([wallet('W'), wallet('X')]);

    await act(() => sidePanel.result.current.removeAccount('X'));

    const keys = vi.mocked(storage.setStorageItem).mock.calls.map(([key]) => key);
    expect(keys.indexOf('salmon_mnemonics')).toBeLessThan(keys.indexOf('salmon_accounts'));
  });

  it('keeps seeds the list no longer names when its last entry goes', async () => {
    storeVault({ W: 'secret-of-W', Z: 'secret-of-Z' });
    const sidePanel = openWindow([wallet('W')]);

    await act(() => sidePanel.result.current.removeAccount('W'));

    expect(storedIds()).toEqual([]);
    expect(storedSecrets()).toEqual(['Z']);
  });

  it('gives up Seed Vault access only when no stored wallet still uses it', async () => {
    const one = seedVaultWallet('S1', 'token-7');
    const two = seedVaultWallet('S2', 'token-7');
    storageMap.set('salmon_accounts', [one, two].map(formatAccountForStorage));
    storeVault({ S1: one.secret, S2: two.secret });
    // This window loaded before the other one added S2.
    const sidePanel = openWindow([one, wallet('W')]);

    await act(() => sidePanel.result.current.removeAccount('S1'));

    expect(releaseSeedVaultAccess).not.toHaveBeenCalled();
  });

  it('counts a wrong password against the unlock throttle', async () => {
    stashMap.clear();
    storageMap.set('salmon_accounts', [wallet('W'), wallet('X')].map(formatAccountForStorage));
    const sidePanel = openWindow([wallet('W'), wallet('X')]);

    await act(async () => {
      await expect(sidePanel.result.current.removeAccount('X', 'wrong-password')).rejects.toThrow();
    });

    expect((await getUnlockPenalty()).failedAttempts).toBe(1);
  });

  it('refuses a password while a penalty stands, without trying it', async () => {
    stashMap.clear();
    storageMap.set('salmon_accounts', [wallet('W'), wallet('X')].map(formatAccountForStorage));
    for (let i = 0; i < 4; i += 1) await recordFailedUnlock();
    const sidePanel = openWindow([wallet('W'), wallet('X')]);

    await act(async () => {
      await expect(
        sidePanel.result.current.removeAccount('X', 'right-password')
      ).rejects.toBeInstanceOf(UnlockThrottledError);
    });

    expect(storedSecrets().sort()).toEqual(['W']);
  });
});

describe('useAccountsMutations removing every wallet', () => {
  it('forgets the wallets in memory before it touches storage', async () => {
    const sidePanel = openWindow([wallet('W')]);
    vi.mocked(storage.removeStorageItem).mockImplementation(async (key: string) => {
      events.push(`storage:remove:${key}`);
      storageMap.delete(key);
    });

    await act(() => sidePanel.result.current.removeAllAccounts());

    expect(events.indexOf('memory:accounts')).toBeLessThan(
      events.indexOf('storage:remove:salmon_mnemonics')
    );
  });

  it('lets another window forget its wallets without touching storage', async () => {
    const sidePanel = openWindow([wallet('W')]);

    await act(async () => sidePanel.result.current.forgetAccounts());

    expect(storageMap.get('salmon_mnemonics')).toBeDefined();
    expect(events).toContain('memory:accounts');
  });
});
