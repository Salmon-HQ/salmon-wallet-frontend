/**
 * @vitest-environment jsdom
 *
 * Inclusion in the aggregated total persists (FR-005).
 *
 * Only exclusions are stored: a wallet the user has never touched — and every
 * wallet created after this shipped — counts by default, so an existing config
 * with no such key must keep working untouched.
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

const account = {
  network: { environment: 'solana-mainnet' as const, blockchain: 'solana' },
};

describe('useUserConfig — inclusion in the aggregated total', () => {
  beforeEach(() => {
    store.clear();
  });

  it('starts with every wallet included when the config has never seen the key', async () => {
    store.set('settings', { explorers: {}, developerNetworks: false });

    const { result } = renderHook(() => useUserConfig({ activeBlockchainAccount: account }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.excludedFromTotal).toEqual([]);
  });

  it('persists an exclusion and takes it back', async () => {
    const { result } = renderHook(() => useUserConfig({ activeBlockchainAccount: account }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setIncludedInTotal('wallet-2', false);
    });

    expect(result.current.excludedFromTotal).toEqual(['wallet-2']);
    expect((store.get('settings') as { excludedFromTotal: string[] }).excludedFromTotal).toEqual([
      'wallet-2',
    ]);

    await act(async () => {
      await result.current.setIncludedInTotal('wallet-2', true);
    });

    expect(result.current.excludedFromTotal).toEqual([]);
    expect((store.get('settings') as { excludedFromTotal: string[] }).excludedFromTotal).toEqual(
      []
    );
  });

  it('does not record the same exclusion twice', async () => {
    const { result } = renderHook(() => useUserConfig({ activeBlockchainAccount: account }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setIncludedInTotal('wallet-2', false);
      await result.current.setIncludedInTotal('wallet-2', false);
    });

    expect(result.current.excludedFromTotal).toEqual(['wallet-2']);
  });
});
