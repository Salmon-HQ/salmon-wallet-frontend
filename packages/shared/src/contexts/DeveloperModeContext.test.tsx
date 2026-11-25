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
/** While set, reads never answer: the record is still loading. */
let readsHang = false;

vi.mock('../storage', () => ({
  getStorage: () => ({
    getItem: (key: string) =>
      readsHang ? new Promise(() => {}) : Promise.resolve(store.has(key) ? store.get(key) : null),
    setItem: async (key: string, value: unknown) => {
      store.set(key, value);
    },
  }),
  STORAGE_KEYS: { SETTINGS: 'settings' },
}));

const session = vi.hoisted(() => ({
  networkId: 'solana-mainnet',
  changeNetwork: vi.fn(async (_networkId: string) => {}),
}));

vi.mock('./AccountsContext', () => ({
  useAccountsContext: () => [
    {
      activeBlockchainAccount: { network: { id: session.networkId } },
      networkId: session.networkId,
      ready: true,
      locked: false,
      activeAccount: null,
    },
    { changeNetwork: session.changeNetwork },
  ],
}));

import {
  DeveloperModeProvider,
  useDeveloperMode,
  useDeveloperModeSettings,
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
  readsHang = false;
  session.networkId = 'solana-mainnet';
  session.changeNetwork.mockClear();
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

describe('the Bitcoin choice', () => {
  it('reads on, with a setter that does nothing, outside the provider', async () => {
    const { result } = renderHook(() => useDeveloperModeSettings());

    expect(result.current.bitcoinEnabled).toBe(true);
    await result.current.setBitcoinEnabled(false);
    expect(store.size).toBe(0);
  });

  it('reads the stored choice inside the provider', async () => {
    store.set('settings', { explorers: {}, developerNetworks: false, bitcoinEnabled: false });

    const { result } = renderHook(() => useDeveloperModeSettings(), {
      wrapper: DeveloperModeProvider,
    });

    await waitFor(() => expect(result.current.bitcoinEnabled).toBe(false));
  });

  it('moves a session standing on Bitcoin to Solana once when the choice is off', async () => {
    store.set('settings', { explorers: {}, developerNetworks: false, bitcoinEnabled: false });
    session.networkId = 'bitcoin-mainnet';

    const { rerender } = render(
      <DeveloperModeProvider>
        <span />
      </DeveloperModeProvider>
    );
    await waitFor(() => expect(session.changeNetwork).toHaveBeenCalledWith('solana-mainnet'));
    rerender(
      <DeveloperModeProvider>
        <span />
      </DeveloperModeProvider>
    );

    expect(session.changeNetwork).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['the choice is on', { bitcoinEnabled: true }, 'bitcoin-mainnet'],
    ['the session is on Solana', { bitcoinEnabled: false }, 'solana-mainnet'],
  ])('leaves the session alone when %s', async (_case, choice, networkId) => {
    store.set('settings', { explorers: {}, developerNetworks: false, ...choice });
    session.networkId = networkId;

    const { result } = renderHook(() => useDeveloperModeSettings(), {
      wrapper: DeveloperModeProvider,
    });
    await waitFor(() => expect(result.current.bitcoinEnabled).toBe(choice.bitcoinEnabled));

    expect(session.changeNetwork).not.toHaveBeenCalled();
  });

  it('leaves the session alone while the record is still loading', async () => {
    readsHang = true;
    session.networkId = 'bitcoin-mainnet';

    render(
      <DeveloperModeProvider>
        <span />
      </DeveloperModeProvider>
    );
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(session.changeNetwork).not.toHaveBeenCalled();
  });
});
