/**
 * @vitest-environment jsdom
 *
 * The Bitcoin choice (spec 045): absent reads on, so an install set up before
 * the choice existed keeps Bitcoin; turning it off moves a session standing on
 * Bitcoin to Solana before the choice is stored.
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();
const calls: string[] = [];
const setItem = vi.fn(async (key: string, value: unknown) => {
  calls.push('setItem');
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

const changeNetwork = vi.fn(async (networkId: string) => {
  calls.push(`changeNetwork:${networkId}`);
});

const fullRecord: UserConfig = {
  explorers: { SOLANA: 'SOLANA_FM', BITCOIN: 'BLOCKCYPHER', ETHEREUM: 'ETHERSCAN' },
  developerNetworks: true,
  showUnverifiedTokens: true,
  tokenList: { maxCount: 3, minValue: 5 },
};

beforeEach(() => {
  store.clear();
  calls.length = 0;
  setItem.mockClear();
  changeNetwork.mockClear();
});

describe('useUserConfig — the Bitcoin choice', () => {
  it('reads on for a record that has never seen the key, and writes nothing', async () => {
    store.set('settings', { explorers: { SOLANA: 'SOLSCAN' }, developerNetworks: false });

    const result = await mount();

    expect(result.current.bitcoinEnabled).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('reads off when the record says false', async () => {
    store.set('settings', { ...fullRecord, bitcoinEnabled: false });

    const result = await mount();

    expect(result.current.bitcoinEnabled).toBe(false);
  });

  it('shows off at once and keeps every other field of the record', async () => {
    store.set('settings', fullRecord);
    const result = await mount();

    await act(async () => {
      await result.current.setBitcoinEnabled(false);
    });

    expect(result.current.bitcoinEnabled).toBe(false);
    expect(stored()).toEqual({ ...fullRecord, bitcoinEnabled: false });
  });

  it.each(['bitcoin-mainnet', 'bitcoin-testnet'])(
    'moves a session standing on %s to Solana before the choice is stored',
    async (activeNetworkId) => {
      store.set('settings', fullRecord);
      const result = await mount();

      await act(async () => {
        await result.current.setBitcoinEnabled(false, { activeNetworkId, changeNetwork });
      });

      expect(calls).toEqual(['changeNetwork:solana-mainnet', 'setItem']);
    }
  );

  it('leaves a session standing on Solana where it is', async () => {
    store.set('settings', fullRecord);
    const result = await mount();

    await act(async () => {
      await result.current.setBitcoinEnabled(false, {
        activeNetworkId: 'solana-mainnet',
        changeNetwork,
      });
    });

    expect(changeNetwork).not.toHaveBeenCalled();
    expect(stored().bitcoinEnabled).toBe(false);
  });

  it('never moves the session when Bitcoin is turned on', async () => {
    store.set('settings', { ...fullRecord, bitcoinEnabled: false });
    const result = await mount();

    await act(async () => {
      await result.current.setBitcoinEnabled(true, {
        activeNetworkId: 'bitcoin-mainnet',
        changeNetwork,
      });
    });

    expect(changeNetwork).not.toHaveBeenCalled();
    expect(result.current.bitcoinEnabled).toBe(true);
    expect(stored().bitcoinEnabled).toBe(true);
  });

  it('resolves to whether the choice was stored, and shows what is stored when it was not', async () => {
    store.set('settings', fullRecord);
    const result = await mount();

    setItem.mockRejectedValueOnce(new Error('disk full'));
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    let stored1: boolean | undefined;
    await act(async () => {
      stored1 = await result.current.setBitcoinEnabled(false);
    });
    quiet.mockRestore();

    expect(stored1).toBe(false);
    expect(result.current.bitcoinEnabled).toBe(true);

    let stored2: boolean | undefined;
    await act(async () => {
      stored2 = await result.current.setBitcoinEnabled(false);
    });
    expect(stored2).toBe(true);
    expect(stored().bitcoinEnabled).toBe(false);
  });
});
