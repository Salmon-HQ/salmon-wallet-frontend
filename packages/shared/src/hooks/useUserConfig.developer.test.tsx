/**
 * @vitest-environment jsdom
 *
 * The two settings spec 026 separates: developer networks, which only decides
 * which networks are offered, and unverified tokens, which used to ride along
 * with it and now stands on its own.
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

describe('useUserConfig — unverified tokens', () => {
  it('is off for a config that has never seen the key', async () => {
    const result = await render();
    expect(result.current.showUnverifiedTokens).toBe(false);
  });

  it('round-trips through storage', async () => {
    const result = await render();

    await act(async () => {
      await result.current.setShowUnverifiedTokens(true);
    });

    expect(result.current.showUnverifiedTokens).toBe(true);
    expect(stored().showUnverifiedTokens).toBe(true);

    const reopened = await render();
    expect(reopened.current.showUnverifiedTokens).toBe(true);
  });

  it('does not move when developer networks are toggled', async () => {
    const result = await render();

    await act(async () => {
      await result.current.toggleDeveloperNetworks();
    });

    expect(result.current.developerNetworks).toBe(true);
    expect(result.current.showUnverifiedTokens).toBe(false);
  });
});

describe('useUserConfig — turning developer networks off', () => {
  beforeEach(() => {
    store.set('settings', { explorers: {}, developerNetworks: true });
  });

  it('moves a devnet session to its mainnet sibling before clearing the flag', async () => {
    const changeNetwork = vi.fn().mockResolvedValue(undefined);
    const result = await render();

    await act(async () => {
      await result.current.toggleDeveloperNetworks({
        activeNetworkId: 'solana-devnet',
        changeNetwork,
      });
    });

    expect(changeNetwork).toHaveBeenCalledWith('solana-mainnet');
    expect(result.current.developerNetworks).toBe(false);
    expect(stored().developerNetworks).toBe(false);
  });

  it('leaves a mainnet session where it stands', async () => {
    const changeNetwork = vi.fn().mockResolvedValue(undefined);
    const result = await render();

    await act(async () => {
      await result.current.toggleDeveloperNetworks({
        activeNetworkId: 'solana-mainnet',
        changeNetwork,
      });
    });

    expect(changeNetwork).not.toHaveBeenCalled();
    expect(result.current.developerNetworks).toBe(false);
  });

  it('moves nothing when the flag is being turned on', async () => {
    store.set('settings', { explorers: {}, developerNetworks: false });
    const changeNetwork = vi.fn().mockResolvedValue(undefined);
    const result = await render();

    await act(async () => {
      await result.current.toggleDeveloperNetworks({
        activeNetworkId: 'solana-devnet',
        changeNetwork,
      });
    });

    expect(changeNetwork).not.toHaveBeenCalled();
    expect(result.current.developerNetworks).toBe(true);
  });
});
