/**
 * @vitest-environment jsdom
 *
 * Several `useUserConfig` instances are live at once (the developer-mode
 * provider, the settings panel, the wallets screen, the derived scan). Each
 * one writes the settings record, so a write from one must never erase a
 * field another one wrote.
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();
/** While set, writes wait on it: the window in which a second tap lands. */
let hold: Promise<void> | null = null;
let release = () => {};
const setItem = vi.fn(async (key: string, value: unknown) => {
  await hold;
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
import { DEFAULT_TOKEN_LIST_PREFERENCE } from '../utils/tokenListFold';

const account = {
  network: { environment: 'solana-mainnet' as const, blockchain: 'solana' },
};

const mount = async () => {
  const { result } = renderHook(() => useUserConfig({ activeBlockchainAccount: account }));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
};

const stored = () => store.get('settings') as UserConfig;

afterEach(() => {
  // A failed assertion must not leave the write queue waiting for the next test.
  release();
});

beforeEach(() => {
  store.clear();
  hold = null;
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

describe('useUserConfig — lists written by two instances', () => {
  it('keeps both wallets when each instance takes a different one out of the total', async () => {
    const wallets = await mount();
    const other = await mount();

    await act(async () => {
      await wallets.current.setIncludedInTotal('w1', false);
    });
    await act(async () => {
      await other.current.setIncludedInTotal('w2', false);
    });

    expect(stored().excludedFromTotal).toEqual(['w1', 'w2']);
  });

  it('keeps both wallets when each instance records a different finished scan', async () => {
    const scan = await mount();
    const other = await mount();

    await act(async () => {
      await Promise.all([
        scan.current.markDerivedScanned('w1'),
        other.current.markDerivedScanned('w2'),
      ]);
    });

    expect(stored().derivedScannedAccountIds).toEqual(['w1', 'w2']);
  });
});

describe('useUserConfig — the token list preference', () => {
  it('reads the default and writes nothing when the record has no token list', async () => {
    store.set('settings', { explorers: { SOLANA: 'SOLSCAN' }, developerNetworks: false });

    const result = await mount();

    expect(result.current.tokenListPreference).toEqual(DEFAULT_TOKEN_LIST_PREFERENCE);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('reads a stored half that is not a preset as off', async () => {
    store.set('settings', {
      explorers: {},
      developerNetworks: false,
      tokenList: { maxCount: 4, minValue: 5 },
    });

    const result = await mount();

    expect(result.current.tokenListPreference).toEqual({ maxCount: null, minValue: 5 });
  });

  it('keeps the preference when another instance writes its own fields afterwards', async () => {
    const provider = await mount();
    const panel = await mount();

    await act(async () => {
      await provider.current.setTokenListPreference({ maxCount: 3, minValue: 5 });
    });
    await act(async () => {
      await panel.current.changeExplorer('SOLANA_FM');
    });
    await act(async () => {
      await panel.current.setShowUnverifiedTokens(true);
    });

    expect(stored().tokenList).toEqual({ maxCount: 3, minValue: 5 });
    expect(stored().explorers.SOLANA).toBe('SOLANA_FM');
    expect(stored().showUnverifiedTokens).toBe(true);
  });

  it('keeps the other fields when the preference is written last', async () => {
    const provider = await mount();
    const panel = await mount();

    await act(async () => {
      await panel.current.changeExplorer('SOLANA_FM');
    });
    await act(async () => {
      await panel.current.setShowUnverifiedTokens(true);
    });
    await act(async () => {
      await provider.current.setTokenListPreference({ maxCount: 3, minValue: 5 });
    });

    expect(provider.current.tokenListPreference).toEqual({ maxCount: 3, minValue: 5 });
    expect(stored().tokenList).toEqual({ maxCount: 3, minValue: 5 });
    expect(stored().explorers.SOLANA).toBe('SOLANA_FM');
    expect(stored().showUnverifiedTokens).toBe(true);
  });
});

describe('useUserConfig — a second tap before the first write lands', () => {
  /** Runs `taps` one render apart while storage is slow, then lets the writes through. */
  const tapWhileSaving = async (taps: Array<() => Promise<void>>) => {
    hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const pending: Promise<void>[] = [];
    for (const tap of taps) {
      act(() => {
        pending.push(tap());
      });
    }
    return async () => {
      release();
      await act(async () => {
        await Promise.all(pending);
      });
    };
  };

  it('shows the new value at once, before storage answers', async () => {
    const result = await mount();

    const finish = await tapWhileSaving([() => result.current.setShowUnverifiedTokens(true)]);

    expect(result.current.showUnverifiedTokens).toBe(true);
    await finish();
    expect(stored().showUnverifiedTokens).toBe(true);
  });

  it('keeps the count when the minimum value is picked right after it', async () => {
    const result = await mount();

    const finish = await tapWhileSaving([
      () => result.current.setTokenListPreference({ maxCount: 3 }),
      () => result.current.setTokenListPreference({ minValue: 5 }),
    ]);
    expect(result.current.tokenListPreference).toEqual({ maxCount: 3, minValue: 5 });
    await finish();

    expect(stored().tokenList).toEqual({ maxCount: 3, minValue: 5 });
    expect(result.current.tokenListPreference).toEqual({ maxCount: 3, minValue: 5 });
  });

  it('ends off when unverified tokens are switched on and straight off again', async () => {
    const result = await mount();

    const finish = await tapWhileSaving([
      () => result.current.setShowUnverifiedTokens(true),
      () => result.current.setShowUnverifiedTokens(false),
    ]);
    await finish();

    expect(stored().showUnverifiedTokens).toBe(false);
    expect(result.current.showUnverifiedTokens).toBe(false);
  });

  it('ends off when developer networks are toggled twice', async () => {
    const result = await mount();

    const finish = await tapWhileSaving([
      () => result.current.toggleDeveloperNetworks(),
      () => result.current.toggleDeveloperNetworks(),
    ]);
    await finish();

    expect(stored().developerNetworks).toBe(false);
    expect(result.current.developerNetworks).toBe(false);
  });

  it('ends excluded when a wallet is put back in the total and straight out again', async () => {
    store.set('settings', {
      explorers: { SOLANA: 'SOLSCAN' },
      developerNetworks: false,
      excludedFromTotal: ['w1'],
    });
    const result = await mount();

    const finish = await tapWhileSaving([
      () => result.current.setIncludedInTotal('w1', true),
      () => result.current.setIncludedInTotal('w1', false),
    ]);
    await finish();

    expect(stored().excludedFromTotal).toEqual(['w1']);
    expect(result.current.excludedFromTotal).toEqual(['w1']);
  });

  it('goes back to what is stored when the write fails', async () => {
    const result = await mount();
    setItem.mockRejectedValueOnce(new Error('disk full'));
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      await result.current.setShowUnverifiedTokens(true);
    });

    expect(result.current.showUnverifiedTokens).toBe(false);
    quiet.mockRestore();
  });
});
