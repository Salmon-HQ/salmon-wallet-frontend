/**
 * @vitest-environment jsdom
 *
 * The two derived-account preferences (spec 024): which wallets have been
 * scanned, and which derived accounts the user has hidden. Both store only the
 * exceptions, the same idiom `excludedFromTotal` uses, so an existing config
 * that has never seen either key keeps working untouched.
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();

vi.mock('../storage', () => ({
  getStorage: () => ({
    getItem: async (key: string) => (store.has(key) ? store.get(key) : null),
    setItem: async (key: string, value: unknown) => {
      store.set(key, value);
    },
  }),
  STORAGE_KEYS: { SETTINGS: 'settings' },
}));

import { useUserConfig } from './useUserConfig';
import type { UserConfig } from '../types/account';

const account = {
  network: { environment: 'solana-mainnet' as const, blockchain: 'solana' },
};

const render = async () => {
  const { result } = renderHook(() => useUserConfig({ activeBlockchainAccount: account }));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
};

const stored = () => store.get('settings') as UserConfig;

beforeEach(() => {
  store.clear();
  store.set('settings', { explorers: {}, developerNetworks: false });
});

describe('useUserConfig — the derived-account scan', () => {
  it('starts with nothing scanned when the config has never seen the key', async () => {
    const result = await render();
    expect(result.current.derivedScannedAccountIds).toEqual([]);
  });

  it('records a finished scan, once, and persists it', async () => {
    const result = await render();

    await act(async () => {
      await result.current.markDerivedScanned('wallet-1');
      await result.current.markDerivedScanned('wallet-1');
    });

    expect(result.current.derivedScannedAccountIds).toEqual(['wallet-1']);
    expect(stored().derivedScannedAccountIds).toEqual(['wallet-1']);
  });
});

describe('useUserConfig — hidden derived accounts', () => {
  it('shows every derived account when nothing has been hidden', async () => {
    const result = await render();
    expect(result.current.hiddenDerivedAccounts).toEqual({});
  });

  it('hides and shows one derived account, per wallet', async () => {
    const result = await render();

    await act(async () => {
      await result.current.setDerivedHidden('wallet-1', 2, true);
    });
    expect(result.current.hiddenDerivedAccounts).toEqual({ 'wallet-1': [2] });
    expect(stored().hiddenDerivedAccounts).toEqual({ 'wallet-1': [2] });

    await act(async () => {
      await result.current.setDerivedHidden('wallet-1', 2, false);
    });
    // The wallet's entry goes with its last hidden index — exceptions only.
    expect(result.current.hiddenDerivedAccounts).toEqual({});
    expect(stored().hiddenDerivedAccounts).toEqual({});
  });

  it('never hides index 0 — that is the wallet itself', async () => {
    const result = await render();

    await act(async () => {
      await result.current.setDerivedHidden('wallet-1', 0, true);
    });

    expect(result.current.hiddenDerivedAccounts).toEqual({});
  });
});
