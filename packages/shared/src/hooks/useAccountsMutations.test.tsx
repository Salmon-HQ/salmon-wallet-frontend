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
  },
  STASH_KEYS: { DERIVED_KEY: 'derived_key_cache' },
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
    unlockAndGetKey: vi.fn(),
    isKeyCacheValid: vi.fn((key: unknown) => !!key),
    refreshCachedKey: vi.fn((key: unknown) => key),
    DEFAULT_ITERATIONS: 1,
    DEFAULT_DIGEST: 'sha512',
  };
});

import { useAccountsMutations } from './useAccountsMutations';
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

/** One wallet window: its own in-memory list, loaded from storage when it opened. */
function openWindow(loaded: Account[]) {
  return renderHook(() => {
    const [counter, setCounter] = useState(loaded.length);
    const [accounts, setAccounts] = useState(loaded);
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
