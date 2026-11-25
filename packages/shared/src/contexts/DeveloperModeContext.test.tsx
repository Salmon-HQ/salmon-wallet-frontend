/**
 * @vitest-environment jsdom
 *
 * The provider carries the token list preference next to the two "show me
 * more" settings, so a choice made in Settings reaches Home without a reload.
 */
import React, { useEffect } from 'react';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
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

vi.mock('./AccountsContext', () => ({
  useAccountsContext: () => [
    {
      activeBlockchainAccount: { network: { id: 'solana-mainnet' } },
      networkId: 'solana-mainnet',
      ready: true,
      locked: false,
      activeAccount: null,
    },
    {},
  ],
}));

import {
  DeveloperModeProvider,
  useDeveloperMode,
  useTokenListPreference,
  useUnverifiedTokens,
} from './DeveloperModeContext';
import { DEFAULT_TOKEN_LIST_PREFERENCE } from '../utils/tokenListFold';

let mounts = 0;

function Reader({ id }: { id: string }) {
  const { tokenListPreference } = useTokenListPreference();
  useEffect(() => {
    mounts += 1;
  }, []);
  return <span data-testid={id}>{JSON.stringify(tokenListPreference)}</span>;
}

function Writer() {
  const { setTokenListPreference } = useTokenListPreference();
  return (
    <button onClick={() => void setTokenListPreference({ maxCount: 3, minValue: 5 })}>pick</button>
  );
}

const text = (id: string) => screen.getByTestId(id).textContent;

beforeEach(() => {
  store.clear();
  mounts = 0;
});

describe('useTokenListPreference', () => {
  it('returns the default and a setter that does nothing outside the provider', async () => {
    const { result } = renderHook(() => useTokenListPreference());

    expect(result.current.tokenListPreference).toEqual(DEFAULT_TOKEN_LIST_PREFERENCE);
    await result.current.setTokenListPreference({ maxCount: 3, minValue: 5 });
    expect(store.size).toBe(0);
  });

  it('returns the stored preference inside the provider', async () => {
    store.set('settings', {
      explorers: {},
      developerNetworks: false,
      tokenList: { maxCount: 10, minValue: 1 },
    });

    render(
      <DeveloperModeProvider>
        <Reader id="home" />
      </DeveloperModeProvider>
    );

    await waitFor(() => expect(text('home')).toBe('{"maxCount":10,"minValue":1}'));
  });

  it('shows a choice to every reader under the provider without remounting them', async () => {
    store.set('settings', { explorers: {}, developerNetworks: false });

    render(
      <DeveloperModeProvider>
        <Writer />
        <Reader id="home" />
      </DeveloperModeProvider>
    );
    await waitFor(() => expect(text('home')).toBe('{"maxCount":null,"minValue":null}'));
    const mountsBefore = mounts;

    fireEvent.click(screen.getByText('pick'));

    await waitFor(() => expect(text('home')).toBe('{"maxCount":3,"minValue":5}'));
    expect(mounts).toBe(mountsBefore);
  });
});

describe('the existing readers', () => {
  it('still read developer networks and unverified tokens from the stored record', async () => {
    store.set('settings', {
      explorers: {},
      developerNetworks: true,
      showUnverifiedTokens: true,
    });

    const { result } = renderHook(
      () => ({ developer: useDeveloperMode(), unverified: useUnverifiedTokens() }),
      { wrapper: DeveloperModeProvider }
    );

    await waitFor(() => expect(result.current).toEqual({ developer: true, unverified: true }));
  });
});
