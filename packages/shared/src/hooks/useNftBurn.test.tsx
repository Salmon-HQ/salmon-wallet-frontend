/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

vi.mock('../blockchain/solana/prepared-transactions', () => ({
  signAndSendPreparedSolanaTransactions: vi.fn().mockResolvedValue(['burn-sig']),
}));

import { useNftBurn } from './useNftBurn';
import { signAndSendPreparedSolanaTransactions } from '../blockchain/solana/prepared-transactions';
import { queryKeys } from '../query/keys';

const ACCT = 'sol-burn-address';
const NET = 'solana-mainnet';
const balanceKey = queryKeys.balance({ accountId: ACCT, networkId: NET as never });

const mockAccount = {
  getReceiveAddress: () => ACCT,
  getNetworkId: () => NET,
} as never;

function makeWrapper(client: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'NftBurnTestWrapper';
  return Wrapper;
}

describe('useNftBurn', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('burns, then keeps settling until the indexer reflects the change', async () => {
    const amounts = { current: '1000000000' };
    const fetchBalance = vi.fn(async () => ({
      items: [{ address: 'mint', amount: amounts.current }],
    }));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });

    const { result } = renderHook(
      () => {
        useQuery({ queryKey: balanceKey, queryFn: fetchBalance, staleTime: 15_000 });
        return useNftBurn({ account: mockAccount, activeAccountId: 'wallet-1' });
      },
      { wrapper: makeWrapper(client) }
    );

    await waitFor(() => expect(fetchBalance).toHaveBeenCalledTimes(1));

    vi.useFakeTimers();

    await act(async () => {
      await result.current.burnNft({ transaction: 'prepared' } as never, 'mint-burned');
    });

    expect(signAndSendPreparedSolanaTransactions).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('success');
    expect(result.current.settling).toBe(true);

    // Still stale after one poll.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
    });
    expect(result.current.settling).toBe(true);

    // Indexer catches up (rent reclaimed) -> settle resolves.
    amounts.current = '1002000000';
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
      await Promise.resolve();
      await Promise.resolve();
    });
    vi.useRealTimers();

    await waitFor(() => expect(result.current.settling).toBe(false));
  });

  it('sets failed status and rethrows when the burn transaction fails', async () => {
    vi.mocked(signAndSendPreparedSolanaTransactions).mockRejectedValueOnce(new Error('boom'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useNftBurn({ account: mockAccount }), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await expect(result.current.burnNft({ transaction: 'prepared' } as never)).rejects.toThrow(
        'boom'
      );
    });

    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.isError).toBe(true);
    expect(result.current.settling).toBe(false);
  });
});
