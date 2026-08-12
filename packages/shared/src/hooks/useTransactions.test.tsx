/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('../utils/account', () => ({
  isSolanaAccount: vi.fn(),
  getBlockchainFromNetworkId: vi.fn(),
}));

vi.mock('../utils/transactions', () => ({
  transformSolanaTransaction: vi.fn(),
  transformMultichainTransaction: vi.fn(),
}));

import { useTransactions } from './useTransactions';
import { isSolanaAccount, getBlockchainFromNetworkId } from '../utils/account';
import { transformSolanaTransaction, transformMultichainTransaction } from '../utils/transactions';
import { createTestQueryClient, QueryWrapper } from '../test-utils/query-wrapper';

const mockIsSolanaAccount = vi.mocked(isSolanaAccount);
const mockGetBlockchainFromNetworkId = vi.mocked(getBlockchainFromNetworkId);
const mockTransformSolanaTransaction = vi.mocked(transformSolanaTransaction);
const mockTransformMultichainTransaction = vi.mocked(transformMultichainTransaction);

function makeWrapper() {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryWrapper client={client}>{children}</QueryWrapper>
  );
  return { client, wrapper };
}

describe('useTransactions (react-query infinite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSolanaAccount.mockReturnValue(true);
    mockGetBlockchainFromNetworkId.mockReturnValue('solana');
    mockTransformSolanaTransaction.mockImplementation((tx: any) => ({
      id: tx.id,
      timestamp: 1,
      status: 'completed',
      type: 'send',
      inputs: [],
      outputs: [],
    }));
    mockTransformMultichainTransaction.mockImplementation((tx: any) => ({
      id: tx.id,
      timestamp: 1,
      status: 'completed',
      type: 'send',
      inputs: [],
      outputs: [],
    }));
  });

  it('fetches the first page of Solana transactions on mount', async () => {
    const account = {
      getRecentTransactions: vi.fn().mockResolvedValue({
        data: [{ id: 'tx-1' }],
        pageToken: 'next-page',
      }),
    };

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useTransactions({
          address: 'wallet-1',
          networkId: 'solana-mainnet',
          account: account as any,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.transactions).toHaveLength(1);
    });

    expect(account.getRecentTransactions).toHaveBeenCalledWith({
      nextPageToken: undefined,
      pageSize: 20,
    });
    expect(result.current.transactions[0]?.id).toBe('tx-1');
    expect(result.current.hasMore).toBe(true);
    expect(result.current.totalCount).toBe(1);
  });

  it('loadMore fetches the next page and appends, deduplicating by id', async () => {
    const account = {
      getRecentTransactions: vi
        .fn()
        .mockResolvedValueOnce({
          data: [{ id: 'tx-1' }],
          pageToken: 'cursor-1',
        })
        .mockResolvedValueOnce({
          data: [{ id: 'tx-1' }, { id: 'tx-2' }],
          pageToken: undefined,
        }),
    };

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useTransactions({
          address: 'wallet-1',
          networkId: 'solana-mainnet',
          account: account as any,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(1);
      expect(result.current.hasMore).toBe(true);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.transactions.map((tx) => tx.id)).toEqual(['tx-1', 'tx-2']);
    });
    expect(account.getRecentTransactions).toHaveBeenLastCalledWith({
      nextPageToken: 'cursor-1',
      pageSize: 20,
    });
    expect(result.current.hasMore).toBe(false);
  });

  it('refresh invalidates and refetches from page 0', async () => {
    const account = {
      getRecentTransactions: vi
        .fn()
        .mockResolvedValueOnce({
          data: [{ id: 'tx-1' }],
          pageToken: 'cursor-1',
        })
        .mockResolvedValueOnce({
          data: [{ id: 'tx-3' }],
          pageToken: undefined,
        }),
    };

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useTransactions({
          address: 'wallet-1',
          networkId: 'solana-mainnet',
          account: account as any,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.transactions.map((tx) => tx.id)).toEqual(['tx-1']);
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.transactions.map((tx) => tx.id)).toEqual(['tx-3']);
    });
    expect(account.getRecentTransactions).toHaveBeenCalledTimes(2);
  });

  it('surfaces fetch errors via error/isError', async () => {
    const account = {
      getRecentTransactions: vi.fn().mockRejectedValue(new Error('solana tx fetch failed')),
    };

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useTransactions({
          address: 'wallet-1',
          networkId: 'solana-mainnet',
          account: account as any,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.error).toBe('solana tx fetch failed');
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.transactions).toEqual([]);
  });

  it('switching networkId resets pagination via a new query key', async () => {
    mockGetBlockchainFromNetworkId.mockImplementation((id: any) =>
      id?.startsWith('bitcoin') ? 'bitcoin' : 'solana'
    );
    const solanaAccount = {
      getRecentTransactions: vi.fn().mockResolvedValue({
        data: [{ id: 'sol-1' }],
        pageToken: undefined,
      }),
    };
    const bitcoinAccount = {
      getRecentTransactions: vi.fn().mockResolvedValue({
        items: [{ id: 'btc-1' }],
        nextPageToken: undefined,
      }),
    };

    const { wrapper } = makeWrapper();
    const { result, rerender } = renderHook(
      ({ networkId, account }: any) =>
        useTransactions({
          address: 'wallet-1',
          networkId,
          account,
        }),
      {
        wrapper,
        initialProps: { networkId: 'solana-mainnet', account: solanaAccount as any },
      }
    );

    await waitFor(() => {
      expect(result.current.transactions.map((tx) => tx.id)).toEqual(['sol-1']);
    });

    mockIsSolanaAccount.mockReturnValue(false);
    rerender({ networkId: 'bitcoin-mainnet', account: bitcoinAccount as any });

    await waitFor(() => {
      expect(result.current.transactions.map((tx) => tx.id)).toEqual(['btc-1']);
    });
    expect(bitcoinAccount.getRecentTransactions).toHaveBeenCalled();
  });

  it('configures staleTime to 60s on the underlying RQ query', async () => {
    const account = {
      getRecentTransactions: vi
        .fn()
        .mockResolvedValue({ data: [{ id: 'tx-stale' }], pageToken: null }),
    };

    const { client, wrapper } = makeWrapper();
    renderHook(
      () =>
        useTransactions({
          address: 'wallet-stale',
          networkId: 'solana-mainnet',
          account: account as any,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(account.getRecentTransactions).toHaveBeenCalled();
    });

    const queries = client.getQueryCache().findAll({ queryKey: ['transactions'] });
    expect(queries.length).toBeGreaterThan(0);
    expect((queries[0]!.options as { staleTime?: number }).staleTime).toBe(60_000);
  });

  it('skip=true disables fetching', async () => {
    const account = {
      getRecentTransactions: vi.fn(),
    };

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useTransactions({
          address: 'wallet-1',
          networkId: 'solana-mainnet',
          account: account as any,
          skip: true,
        }),
      { wrapper }
    );

    // Give RQ a tick to attempt; should not have been called.
    await act(async () => {
      await Promise.resolve();
    });

    expect(account.getRecentTransactions).not.toHaveBeenCalled();
    expect(result.current.transactions).toEqual([]);
  });
});
