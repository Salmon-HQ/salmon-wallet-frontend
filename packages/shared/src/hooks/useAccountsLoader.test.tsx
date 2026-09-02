/**
 * @vitest-environment jsdom
 *
 * The network a wallet lands on when nothing has been chosen yet. It must be a
 * network the wallet actually holds: hardcoding Solana mainnet opened a
 * Bitcoin-only import on a page with no account to read (spec 026).
 */

import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();

vi.mock('../storage', () => ({
  getStorageItem: async (key: string) => (store.has(key) ? store.get(key) : null),
  setStorageItem: async (key: string, value: unknown) => {
    store.set(key, value);
  },
  STORAGE_KEYS: {
    ACCOUNTS: 'accounts',
    COUNTER: 'counter',
    ACCOUNT_ID: 'account_id',
    NETWORK_ID: 'network_id',
    PATH_INDEX: 'path_index',
    TRUSTED_APPS: 'trusted_apps',
    CUSTOM_TOKENS: 'custom_tokens',
  },
}));

vi.mock('../crypto/mnemonic', () => ({ clearSeedCache: vi.fn() }));

import { useAccountsLoader } from './useAccountsLoader';
import type { Account } from '../types/account';

const noop = () => undefined;

/** A blockchain account is only ever read for truthiness here. */
const slot = (networkId: string) => ({ network: { id: networkId } }) as never;

async function loadWith(networksAccounts: Record<string, unknown[]>): Promise<string | null> {
  let networkId: string | null = null;

  const account = {
    id: 'wallet-1',
    name: 'Wallet 1',
    avatar: 'a',
    secret: { kind: 'mnemonic', mnemonic: 'phrase' },
    pathIndexes: {},
    networksAccounts,
  } as unknown as Account;

  const { result } = renderHook(() =>
    useAccountsLoader({
      setLoaded: noop as never,
      setCounter: noop as never,
      setAccounts: noop as never,
      setAccountId: noop as never,
      setNetworkId: ((value: string | null) => {
        networkId = value;
      }) as never,
      setPathIndex: noop as never,
      setTrustedApps: noop as never,
      setTokens: noop as never,
      restoreManyAccounts: async () => [account],
    })
  );

  await act(async () => {
    await result.current.loadAccounts({});
  });

  return networkId;
}

beforeEach(() => {
  store.clear();
  store.set('accounts', [{ id: 'wallet-1' }]);
});

describe('useAccountsLoader — the first-launch network', () => {
  it('prefers a mainnet the wallet holds', async () => {
    expect(
      await loadWith({
        'bitcoin-mainnet': [slot('bitcoin-mainnet')],
        'solana-mainnet': [slot('solana-mainnet')],
        'solana-devnet': [slot('solana-devnet')],
      })
    ).toBe('bitcoin-mainnet');
  });

  it('never lands on a network the wallet does not hold', async () => {
    expect(await loadWith({ 'bitcoin-mainnet': [slot('bitcoin-mainnet')] })).toBe(
      'bitcoin-mainnet'
    );
  });

  it('reads a network with only empty slots as not held', async () => {
    expect(
      await loadWith({
        'solana-mainnet': [null, null],
        'bitcoin-mainnet': [slot('bitcoin-mainnet')],
      })
    ).toBe('bitcoin-mainnet');
  });

  it('falls back to a non-mainnet when that is all the wallet holds', async () => {
    expect(await loadWith({ 'solana-devnet': [slot('solana-devnet')] })).toBe('solana-devnet');
  });

  it('persists the network it picked', async () => {
    await loadWith({ 'solana-mainnet': [slot('solana-mainnet')] });
    expect(store.get('network_id')).toBe('solana-mainnet');
  });

  it('leaves a stored network alone', async () => {
    store.set('network_id', 'solana-devnet');
    expect(await loadWith({ 'solana-mainnet': [slot('solana-mainnet')] })).toBe('solana-devnet');
  });
});
