/**
 * @vitest-environment jsdom
 *
 * Several `useUserConfig` instances are live at once (the developer-mode
 * provider, the settings panel, the wallets screen, the derived scan). Each
 * one writes the settings record, so a write from one must never erase a
 * field another one wrote.
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();
const setItem = vi.fn(async (key: string, value: unknown) => {
  store.set(key, value);
});

vi.mock('../storage', () => ({
  getStorage: () => ({
    getItem: async (key: string) => (store.has(key) ? store.get(key) : null),
    setItem,
  }),
  STORAGE_KEYS: { SETTINGS: 'settings' },
}));

import { useUserConfig } from './useUserConfig';
import type { UserConfig } from '../types/account';

const account = {
  network: { environment: 'solana-mainnet' as const, blockchain: 'solana' },
};

const mount = async () => {
  const { result } = renderHook(() => useUserConfig({ activeBlockchainAccount: account }));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
};

const stored = () => store.get('settings') as UserConfig;

beforeEach(() => {
  store.clear();
  setItem.mockClear();
});

describe('useUserConfig — two live instances', () => {
  it('keeps a field one instance wrote when another instance writes its own', async () => {
    const provider = await mount();
    const panel = await mount();

    await act(async () => {
      await provider.current.setShowUnverifiedTokens(true);
    });
    await act(async () => {
      await panel.current.changeExplorer('SOLANA_FM');
    });

    expect(stored().explorers.SOLANA).toBe('SOLANA_FM');
    expect(stored().showUnverifiedTokens).toBe(true);
  });

  it('keeps the explorer when the other instance toggles developer networks afterwards', async () => {
    const provider = await mount();
    const panel = await mount();

    await act(async () => {
      await panel.current.changeExplorer('SOLANA_FM');
    });
    await act(async () => {
      await provider.current.toggleDeveloperNetworks();
    });

    expect(stored().developerNetworks).toBe(true);
    expect(stored().explorers.SOLANA).toBe('SOLANA_FM');
  });

  it('keeps both fields when two instances write without waiting for each other', async () => {
    const provider = await mount();
    const panel = await mount();

    await act(async () => {
      await Promise.all([
        provider.current.setShowUnverifiedTokens(true),
        panel.current.changeExplorer('SOLANA_FM'),
      ]);
    });

    expect(stored().showUnverifiedTokens).toBe(true);
    expect(stored().explorers.SOLANA).toBe('SOLANA_FM');
  });

  it('writes nothing on mount when the record already has every default', async () => {
    store.set('settings', { explorers: { SOLANA: 'SOLSCAN' }, developerNetworks: false });

    await mount();

    expect(setItem).not.toHaveBeenCalled();
  });
});
