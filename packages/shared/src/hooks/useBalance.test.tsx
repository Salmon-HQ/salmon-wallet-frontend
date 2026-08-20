/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('../utils/account', () => ({
  isSolanaAccount: vi.fn(),
  isBitcoinAccount: vi.fn(),
  isEthereumAccount: vi.fn(),
}));

vi.mock('../storage', () => ({
  getStorageItem: vi.fn(),
  setStorageItem: vi.fn(),
  STORAGE_KEYS: {
    HIDDEN_BALANCE: 'hidden_balance',
  },
}));

import { useBalance } from './useBalance';
import { getStorageItem, setStorageItem } from '../storage';
import { isSolanaAccount, isBitcoinAccount, isEthereumAccount } from '../utils/account';
import { createTestQueryClient, QueryWrapper } from '../test-utils/query-wrapper';

const mockGetStorageItem = vi.mocked(getStorageItem);
const mockSetStorageItem = vi.mocked(setStorageItem);
const mockIsSolanaAccount = vi.mocked(isSolanaAccount);
const mockIsBitcoinAccount = vi.mocked(isBitcoinAccount);
const mockIsEthereumAccount = vi.mocked(isEthereumAccount);

function makeWrapper() {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryWrapper client={client}>{children}</QueryWrapper>
  );
  return { client, wrapper };
}

describe('useBalance (react-query)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStorageItem.mockResolvedValue(null as never);
    mockSetStorageItem.mockResolvedValue(undefined as never);
    mockIsSolanaAccount.mockReturnValue(true);
    mockIsBitcoinAccount.mockReturnValue(false);
    mockIsEthereumAccount.mockReturnValue(false);
  });

  it('fetches and transforms Solana balance on mount', async () => {
    const account = {
      getReceiveAddress: vi.fn().mockReturnValue('wallet-1'),
      getBalance: vi.fn().mockResolvedValue({
        usdTotal: 301,
        last24HoursChange: 1,
        items: [
          {
            mint: 'So11111111111111111111111111111111111111112',
            amount: 2_000_000_000,
            decimals: 9,
            symbol: 'SOL',
            name: 'Solana',
            uiAmount: 2,
            logo: 'https://example.com/sol.png',
            coingeckoId: 'solana',
            tags: ['verified'],
            price: 150.5,
            usdBalance: 301,
            priceChange24h: 10,
          },
        ],
      }),
    };

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useBalance({ account: account as any, networkId: 'solana-mainnet' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.tokens).toHaveLength(1);
    });

    expect(account.getBalance).toHaveBeenCalledTimes(1);
    expect(result.current.usdTotal).toBe(301);
    expect(result.current.changeAmount).toBe(1);
    expect(result.current.changePercent).toBeCloseTo((1 / 300) * 100);
    expect(result.current.tokens[0]).toMatchObject({
      address: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      owner: 'wallet-1',
      uiAmount: 2,
      usdBalance: 301,
    });
    expect(result.current.lastUpdated).not.toBeNull();
  });

  it('refresh() triggers a refetch', async () => {
    const account = {
      getReceiveAddress: vi.fn().mockReturnValue('wallet-1'),
      getBalance: vi
        .fn()
        .mockResolvedValueOnce({ usdTotal: 100, last24HoursChange: 0, items: [] })
        .mockResolvedValueOnce({ usdTotal: 200, last24HoursChange: 0, items: [] }),
    };

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useBalance({ account: account as any, networkId: 'solana-mainnet' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.usdTotal).toBe(100);
    });
    expect(account.getBalance).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.usdTotal).toBe(200);
    });
    expect(account.getBalance).toHaveBeenCalledTimes(2);
  });

  it('keeps the same refresh handler across a background refetch', async () => {
    // A handler with a new identity every render replaces the props of whatever
    // it is wired to. On mobile that is a native pull-to-refresh control, which
    // holds its own state on the platform side.
    const account = {
      getReceiveAddress: vi.fn().mockReturnValue('wallet-1'),
      getBalance: vi.fn().mockResolvedValue({ usdTotal: 100, last24HoursChange: 0, items: [] }),
    };

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useBalance({ account: account as any, networkId: 'solana-mainnet' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.usdTotal).toBe(100);
    });
    const first = result.current.refresh;

    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => {
      expect(account.getBalance).toHaveBeenCalledTimes(2);
    });

    expect(result.current.refresh).toBe(first);
  });

  it('refresh() does not refetch when the balance query is skipped', async () => {
    const account = {
      getReceiveAddress: vi.fn().mockReturnValue('wallet-skipped'),
      getBalance: vi.fn().mockResolvedValue({ usdTotal: 999, last24HoursChange: 0, items: [] }),
    };

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useBalance({ account: account as any, networkId: 'solana-mainnet', skip: true }),
      { wrapper }
    );

    expect(result.current.loading).toBe(false);
    expect(account.getBalance).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refresh();
    });

    expect(account.getBalance).not.toHaveBeenCalled();
    expect(result.current.balance).toBeNull();
  });

  it('two consumers with the same query key share data (single fetch)', async () => {
    const account = {
      getReceiveAddress: vi.fn().mockReturnValue('wallet-shared'),
      getBalance: vi.fn().mockResolvedValue({ usdTotal: 42, last24HoursChange: 0, items: [] }),
    };

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => {
        const a = useBalance({ account: account as any, networkId: 'solana-mainnet' });
        const b = useBalance({ account: account as any, networkId: 'solana-mainnet' });
        return { a, b };
      },
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.a.usdTotal).toBe(42);
      expect(result.current.b.usdTotal).toBe(42);
    });

    expect(account.getBalance).toHaveBeenCalledTimes(1);
  });

  it("refetchOnMount: 'always' refetches when remounted with cached data", async () => {
    const account = {
      getReceiveAddress: vi.fn().mockReturnValue('wallet-remount'),
      getBalance: vi.fn().mockResolvedValue({ usdTotal: 7, last24HoursChange: 0, items: [] }),
    };

    // Share a single client across mounts so cached data is present on remount
    const client = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryWrapper client={client}>{children}</QueryWrapper>
    );

    const first = renderHook(
      () => useBalance({ account: account as any, networkId: 'solana-mainnet' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(first.result.current.usdTotal).toBe(7);
    });
    expect(account.getBalance).toHaveBeenCalledTimes(1);

    first.unmount();

    const second = renderHook(
      () => useBalance({ account: account as any, networkId: 'solana-mainnet' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(account.getBalance).toHaveBeenCalledTimes(2);
    });

    expect(second.result.current.usdTotal).toBe(7);
  });

  it('loads and persists hidden balance preference', async () => {
    mockGetStorageItem.mockResolvedValueOnce(true as never);
    const account = {
      getReceiveAddress: vi.fn().mockReturnValue('wallet-1'),
      getBalance: vi.fn().mockResolvedValue({ usdTotal: 0, last24HoursChange: 0, items: [] }),
    };

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useBalance({ account: account as any, networkId: 'solana-mainnet' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.hiddenBalance).toBe(true);
    });

    await act(async () => {
      await result.current.toggleHidden();
    });

    expect(result.current.hiddenBalance).toBe(false);
    expect(mockSetStorageItem).toHaveBeenCalledWith('hidden_balance', false);
  });

  it('surfaces an error (instead of a fake empty balance) when the Solana balance fetch fails', async () => {
    const account = {
      getReceiveAddress: vi.fn().mockReturnValue('wallet-1'),
      getBalance: vi.fn().mockRejectedValue(new Error('rpc down')),
    };

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useBalance({ account: account as any, networkId: 'solana-mainnet' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.tokens).toEqual([]);
    expect(result.current.error).toBe('rpc down');
  });

  it('loads and transforms Bitcoin balances when the account is detected as bitcoin', async () => {
    mockIsSolanaAccount.mockReturnValue(false);
    mockIsBitcoinAccount.mockReturnValue(true);

    const account = {
      getReceiveAddress: vi.fn().mockReturnValue('bc1qwallet123'),
      getBalance: vi.fn().mockResolvedValue({
        usdTotal: 500,
        last24HoursChange: 25,
        items: [
          {
            mint: '',
            amount: 10_000_000,
            decimals: 8,
            symbol: 'BTC',
            name: 'Bitcoin',
            uiAmount: 0.1,
            price: 50_000,
            usdBalance: 500,
            priceChange24h: 5,
          },
        ],
      }),
    };

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useBalance({ account: account as any, networkId: 'bitcoin-mainnet' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.tokens).toHaveLength(1);
    });

    expect(account.getBalance).toHaveBeenCalledTimes(1);
    expect(result.current.tokens[0]).toMatchObject({
      address: 'bitcoin',
      owner: 'bc1qwallet123',
      symbol: 'BTC',
      usdBalance: 500,
      coingeckoId: 'bitcoin',
    });
    expect(result.current.usdTotal).toBe(500);
    expect(result.current.changeAmount).toBe(25);
    expect(result.current.changePercent).toBeCloseTo((25 / 475) * 100);
  });

  it('configures staleTime to 15s on the underlying RQ query', async () => {
    const account = {
      getReceiveAddress: vi.fn().mockReturnValue('wallet-stale'),
      getBalance: vi.fn().mockResolvedValue({ usdTotal: 1, last24HoursChange: 0, items: [] }),
    };

    const { client, wrapper } = makeWrapper();
    renderHook(() => useBalance({ account: account as any, networkId: 'solana-mainnet' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(account.getBalance).toHaveBeenCalled();
    });

    const queries = client.getQueryCache().findAll({ queryKey: ['balance'] });
    expect(queries.length).toBeGreaterThan(0);
    expect((queries[0]!.options as { staleTime?: number }).staleTime).toBe(15_000);
  });

  it('loads and transforms Ethereum balances when the account is detected as ethereum', async () => {
    mockIsSolanaAccount.mockReturnValue(false);
    mockIsBitcoinAccount.mockReturnValue(false);
    mockIsEthereumAccount.mockReturnValue(true);

    const account = {
      getReceiveAddress: vi.fn().mockReturnValue('0x1234567890123456789012345678901234567890'),
      getBalance: vi.fn().mockResolvedValue({
        usdTotal: 210,
        last24HoursChange: 10,
        items: [
          {
            mint: '',
            amount: 100_000_000_000_000_000n,
            decimals: 18,
            symbol: 'ETH',
            name: 'Ethereum',
            uiAmount: 0.1,
            price: 2_100,
            usdBalance: 210,
            priceChange24h: 3,
          },
        ],
      }),
    };

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useBalance({ account: account as any, networkId: 'ethereum-mainnet' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.tokens).toHaveLength(1);
    });

    expect(account.getBalance).toHaveBeenCalledTimes(1);
    expect(result.current.tokens[0]).toMatchObject({
      address: 'ethereum',
      owner: '0x1234567890123456789012345678901234567890',
      symbol: 'ETH',
      usdBalance: 210,
      coingeckoId: 'ethereum',
    });
    expect(result.current.usdTotal).toBe(210);
    expect(result.current.changeAmount).toBe(10);
    expect(result.current.changePercent).toBeCloseTo((10 / 200) * 100);
  });
});
