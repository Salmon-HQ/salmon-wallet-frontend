/**
 * @vitest-environment jsdom
 *
 * Guards the three-way balance state described in PRODUCT.md under
 * "Failure modes are visible, not silent": "you have none" and "we couldn't
 * load this" must stay distinguishable, and a failure must never keep looking
 * like a load that is still going.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('../utils/account', () => ({
  isSolanaAccount: () => true,
  isBitcoinAccount: () => false,
  isEthereumAccount: () => false,
}));

vi.mock('../storage', () => ({
  getStorageItem: vi.fn().mockResolvedValue(null),
  setStorageItem: vi.fn().mockResolvedValue(undefined),
  STORAGE_KEYS: { HIDDEN_BALANCE: 'hidden_balance' },
}));

import { useBalance } from './useBalance';
import { createTestQueryClient, QueryWrapper } from '../test-utils/query-wrapper';

function makeWrapper() {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryWrapper client={client}>{children}</QueryWrapper>
  );
  return { client, wrapper };
}

function makeAccount(getBalance: () => Promise<unknown>) {
  return {
    getReceiveAddress: () => 'wallet-1',
    getBalance,
  } as any;
}

const oneToken = {
  items: [
    {
      mint: 'mint-1',
      amount: '1000',
      decimals: 3,
      uiAmount: 1,
      symbol: 'TKN',
      name: 'Token',
    },
  ],
  usdTotal: 10,
  last24HoursChange: 0,
};

function renderBalance(getBalance: () => Promise<unknown>) {
  const { wrapper } = makeWrapper();
  return renderHook(
    () => useBalance({ account: makeAccount(getBalance), networkId: 'solana-mainnet' as any }),
    { wrapper }
  );
}

describe('useBalance state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reaches the error state when the first load fails with nothing cached', async () => {
    const { result } = renderBalance(() => Promise.reject(new Error('rpc down')));

    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.hasData).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('returns to the loading state while a retry after that failure is in flight', async () => {
    let settle: ((value: unknown) => void) | undefined;
    let attempt = 0;
    const getBalance = vi.fn(() => {
      attempt += 1;
      if (attempt === 1) return Promise.reject(new Error('rpc down'));
      return new Promise((resolve) => {
        settle = resolve;
      });
    });

    const { result } = renderBalance(getBalance as any);
    await waitFor(() => expect(result.current.state).toBe('error'));

    act(() => {
      void result.current.refresh();
    });

    await waitFor(() => expect(result.current.state).toBe('loading'));

    await act(async () => {
      settle?.(oneToken);
    });

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.tokens).toHaveLength(1);
  });

  it('keeps the cached balance readable when a refetch fails', async () => {
    let attempt = 0;
    const getBalance = vi.fn(() => {
      attempt += 1;
      if (attempt === 1) return Promise.resolve(oneToken);
      return Promise.reject(new Error('rpc down'));
    });

    const { result } = renderBalance(getBalance as any);
    await waitFor(() => expect(result.current.state).toBe('ready'));

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.state).toBe('ready');
    expect(result.current.tokens).toHaveLength(1);
  });

  it('reads an empty wallet as ready and empty, never as an error', async () => {
    const { result } = renderBalance(() =>
      Promise.resolve({ items: [], usdTotal: 0, last24HoursChange: 0 })
    );

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.tokens).toEqual([]);
    expect(result.current.isError).toBe(false);
  });
});
