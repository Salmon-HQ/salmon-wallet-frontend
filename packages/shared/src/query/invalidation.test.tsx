/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

import { useInvalidateAfterTx, useSettleAfterTx, useSettleUntilChanged } from './invalidation';
import { queryKeys } from './keys';

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function makeWrapper(client: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
}

const ACCOUNT_A = 'acct-a';
const ACCOUNT_B = 'acct-b';
const NETWORK_SOL = 'solana-mainnet' as never;
const NETWORK_SOL_DEV = 'solana-devnet' as never;
const NETWORK_BTC = 'bitcoin-mainnet' as never;

function seed(client: QueryClient) {
  const keys = [
    queryKeys.balance({ accountId: ACCOUNT_A, networkId: NETWORK_SOL }),
    queryKeys.balance({ accountId: ACCOUNT_A, networkId: NETWORK_BTC }),
    queryKeys.balance({ accountId: ACCOUNT_B, networkId: NETWORK_SOL }),
    queryKeys.solanaNfts({ accountId: ACCOUNT_A, networkId: NETWORK_SOL }),
    queryKeys.solanaNfts({ accountId: ACCOUNT_B, networkId: NETWORK_SOL }),
    queryKeys.avatarNfts({ accountId: ACCOUNT_A }),
    queryKeys.avatarNfts({ accountId: ACCOUNT_B }),
    queryKeys.transactions({ accountId: ACCOUNT_A, networkId: NETWORK_SOL }),
    queryKeys.transactions({ accountId: ACCOUNT_B, networkId: NETWORK_SOL }),
  ];
  for (const key of keys) {
    client.setQueryData(key, { value: 'seed' });
  }
  return keys;
}

function isInvalidated(client: QueryClient, key: readonly unknown[]): boolean {
  return client.getQueryState(key as never)?.isInvalidated ?? false;
}

describe('useInvalidateAfterTx', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('invalidates only matching kinds', async () => {
    const client = makeClient();
    seed(client);
    const { result } = renderHook(() => useInvalidateAfterTx(), {
      wrapper: makeWrapper(client),
    });
    await result.current({ accountId: ACCOUNT_A, kinds: ['balance'] });

    expect(
      isInvalidated(client, queryKeys.balance({ accountId: ACCOUNT_A, networkId: NETWORK_SOL }))
    ).toBe(true);
    expect(
      isInvalidated(client, queryKeys.balance({ accountId: ACCOUNT_A, networkId: NETWORK_BTC }))
    ).toBe(true);
    // nfts not requested -> not invalidated
    expect(
      isInvalidated(client, queryKeys.solanaNfts({ accountId: ACCOUNT_A, networkId: NETWORK_SOL }))
    ).toBe(false);
    expect(isInvalidated(client, queryKeys.avatarNfts({ accountId: ACCOUNT_A }))).toBe(false);
    expect(
      isInvalidated(
        client,
        queryKeys.transactions({ accountId: ACCOUNT_A, networkId: NETWORK_SOL })
      )
    ).toBe(false);
  });

  it('settles transactions with a delayed scoped refetch after the immediate invalidation', async () => {
    const client = makeClient();
    const balanceKey = queryKeys.balance({ accountId: ACCOUNT_A, networkId: NETWORK_SOL });
    const fetchBalance = vi
      .fn()
      .mockResolvedValueOnce({ marker: 'initial-old-balance' })
      .mockResolvedValueOnce({ marker: 'stale-provider-balance-after-tx' })
      .mockResolvedValueOnce({ marker: 'fresh-balance-after-provider-catches-up' });

    const { result } = renderHook(
      () => {
        useQuery({
          queryKey: balanceKey,
          queryFn: fetchBalance,
          staleTime: 15_000,
        });
        return useSettleAfterTx();
      },
      { wrapper: makeWrapper(client) }
    );

    await waitFor(() => {
      expect(client.getQueryData(balanceKey)).toEqual({ marker: 'initial-old-balance' });
    });

    vi.useFakeTimers();

    await act(async () => {
      await result.current({
        accountId: ACCOUNT_A,
        networkId: NETWORK_SOL,
        kinds: ['balance'],
        settlementDelaysMs: [10_000],
      });
    });

    expect(fetchBalance).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(balanceKey)).toEqual({
      marker: 'stale-provider-balance-after-tx',
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchBalance).toHaveBeenCalledTimes(3);
    expect(client.getQueryData(balanceKey)).toEqual({
      marker: 'fresh-balance-after-provider-catches-up',
    });
  });

  it('applies the default backoff schedule (13s + 25s) when no delays are passed', async () => {
    // Guards the empirically-tuned DEFAULT_SETTLEMENT_DELAYS_MS: the
    // salmon-api balance endpoint trails an on-chain change by ~12.5s, so the
    // default schedule must fire a refetch AFTER that settle, not at 10s.
    const client = makeClient();
    const balanceKey = queryKeys.balance({ accountId: ACCOUNT_A, networkId: NETWORK_SOL });
    const fetchBalance = vi.fn().mockResolvedValue({ marker: 'balance' });

    const { result } = renderHook(
      () => {
        useQuery({ queryKey: balanceKey, queryFn: fetchBalance, staleTime: 15_000 });
        return useSettleAfterTx();
      },
      { wrapper: makeWrapper(client) }
    );

    await waitFor(() => {
      expect(fetchBalance).toHaveBeenCalledTimes(1); // initial mount
    });

    vi.useFakeTimers();

    await act(async () => {
      // No settlementDelaysMs -> uses the default schedule.
      await result.current({ accountId: ACCOUNT_A, networkId: NETWORK_SOL, kinds: ['balance'] });
    });

    // Immediate invalidation refetch.
    expect(fetchBalance).toHaveBeenCalledTimes(2);

    // A refetch at 10s must NOT have fired yet (regression guard against the
    // old too-early default).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchBalance).toHaveBeenCalledTimes(2);

    // First scheduled refetch lands at 13s.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(fetchBalance).toHaveBeenCalledTimes(3);

    // Safety-net refetch lands at 25s.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });
    expect(fetchBalance).toHaveBeenCalledTimes(4);
  });

  it('filters by accountId', async () => {
    const client = makeClient();
    seed(client);
    const { result } = renderHook(() => useInvalidateAfterTx(), {
      wrapper: makeWrapper(client),
    });
    await result.current({ accountId: ACCOUNT_A, kinds: ['balance', 'avatar-nfts'] });

    expect(
      isInvalidated(client, queryKeys.balance({ accountId: ACCOUNT_A, networkId: NETWORK_SOL }))
    ).toBe(true);
    expect(isInvalidated(client, queryKeys.avatarNfts({ accountId: ACCOUNT_A }))).toBe(true);
    // account B untouched
    expect(
      isInvalidated(client, queryKeys.balance({ accountId: ACCOUNT_B, networkId: NETWORK_SOL }))
    ).toBe(false);
    expect(isInvalidated(client, queryKeys.avatarNfts({ accountId: ACCOUNT_B }))).toBe(false);
  });

  it('filters by networkId when provided', async () => {
    const client = makeClient();
    seed(client);
    const { result } = renderHook(() => useInvalidateAfterTx(), {
      wrapper: makeWrapper(client),
    });
    await result.current({
      accountId: ACCOUNT_A,
      networkId: NETWORK_SOL,
      kinds: ['balance'],
    });

    expect(
      isInvalidated(client, queryKeys.balance({ accountId: ACCOUNT_A, networkId: NETWORK_SOL }))
    ).toBe(true);
    expect(
      isInvalidated(client, queryKeys.balance({ accountId: ACCOUNT_A, networkId: NETWORK_BTC }))
    ).toBe(false);
  });

  it("forces refetch of inactive queries via refetchType: 'all'", async () => {
    // Regression: tab navigators preserve home screen instances, so refetch
    // on mount alone never fires after a swap success modal closes. Without
    // refetchType: 'all', invalidated-but-inactive balance queries stay
    // stale until full page reload.
    const client = makeClient();
    seed(client);
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useInvalidateAfterTx(), {
      wrapper: makeWrapper(client),
    });

    await result.current({ accountId: ACCOUNT_A, kinds: ['balance'] });

    expect(spy).toHaveBeenCalledTimes(1);
    const callArgs = spy.mock.calls[0]?.[0] as { refetchType?: unknown } | undefined;
    expect(callArgs?.refetchType).toBe('all');
  });

  it('invalidates multiple kinds in parallel', async () => {
    const client = makeClient();
    seed(client);
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useInvalidateAfterTx(), {
      wrapper: makeWrapper(client),
    });

    await result.current({
      accountId: ACCOUNT_A,
      kinds: ['balance', 'transactions', 'nfts', 'avatar-nfts'],
    });

    expect(spy).toHaveBeenCalledTimes(4);
    expect(
      isInvalidated(client, queryKeys.balance({ accountId: ACCOUNT_A, networkId: NETWORK_SOL }))
    ).toBe(true);
    expect(
      isInvalidated(
        client,
        queryKeys.transactions({ accountId: ACCOUNT_A, networkId: NETWORK_SOL })
      )
    ).toBe(true);
    expect(
      isInvalidated(client, queryKeys.solanaNfts({ accountId: ACCOUNT_A, networkId: NETWORK_SOL }))
    ).toBe(true);
    expect(isInvalidated(client, queryKeys.avatarNfts({ accountId: ACCOUNT_A }))).toBe(true);
  });

  describe('removedNftMintAddresses', () => {
    const MINT_KEEP = 'mint-keep';
    const MINT_BURN = 'mint-burn';

    function seedNfts(client: QueryClient) {
      const nft = (mintAddress: string) => ({ mint: { address: mintAddress } });
      client.setQueryData(queryKeys.solanaNfts({ accountId: ACCOUNT_A, networkId: NETWORK_SOL }), [
        nft(MINT_KEEP),
        nft(MINT_BURN),
      ]);
      client.setQueryData(queryKeys.avatarNfts({ accountId: ACCOUNT_A }), [
        nft(MINT_BURN),
        nft(MINT_KEEP),
      ]);
      client.setQueryData(queryKeys.solanaNfts({ accountId: ACCOUNT_B, networkId: NETWORK_SOL }), [
        nft(MINT_BURN),
      ]);
      client.setQueryData(
        queryKeys.solanaNfts({ accountId: ACCOUNT_A, networkId: NETWORK_SOL_DEV }),
        [nft(MINT_BURN)]
      );
      client.setQueryData(
        queryKeys.solanaNftDetail({ mintAddress: MINT_BURN, networkId: NETWORK_SOL }),
        nft(MINT_BURN)
      );
      client.setQueryData(
        queryKeys.solanaNftDetail({ mintAddress: MINT_BURN, networkId: NETWORK_SOL_DEV }),
        nft(MINT_BURN)
      );
      client.setQueryData(
        queryKeys.solanaNftDetail({ mintAddress: MINT_KEEP, networkId: NETWORK_SOL }),
        nft(MINT_KEEP)
      );
    }

    it('strips the burned NFT from solana-nfts and avatar-nfts caches scoped to the account', async () => {
      const client = makeClient();
      seedNfts(client);
      const { result } = renderHook(() => useInvalidateAfterTx(), {
        wrapper: makeWrapper(client),
      });

      await result.current({
        accountId: ACCOUNT_A,
        kinds: ['nfts', 'avatar-nfts'],
        removedNftMintAddresses: [MINT_BURN],
      });

      const aSolList = client.getQueryData(
        queryKeys.solanaNfts({ accountId: ACCOUNT_A, networkId: NETWORK_SOL })
      ) as Array<{ mint: { address: string } }>;
      expect(aSolList.map((n) => n.mint.address)).toEqual([MINT_KEEP]);

      const aAvatarList = client.getQueryData(
        queryKeys.avatarNfts({ accountId: ACCOUNT_A })
      ) as Array<{
        mint: { address: string };
      }>;
      expect(aAvatarList.map((n) => n.mint.address)).toEqual([MINT_KEEP]);

      // Other account's cache is untouched
      const bSolList = client.getQueryData(
        queryKeys.solanaNfts({ accountId: ACCOUNT_B, networkId: NETWORK_SOL })
      ) as Array<{ mint: { address: string } }>;
      expect(bSolList.map((n) => n.mint.address)).toEqual([MINT_BURN]);
    });

    it('removes the matching solana-nft-detail entry and leaves others alone', async () => {
      const client = makeClient();
      seedNfts(client);
      const { result } = renderHook(() => useInvalidateAfterTx(), {
        wrapper: makeWrapper(client),
      });

      await result.current({
        accountId: ACCOUNT_A,
        kinds: ['nfts'],
        removedNftMintAddresses: [MINT_BURN],
      });

      expect(
        client.getQueryData(
          queryKeys.solanaNftDetail({ mintAddress: MINT_BURN, networkId: NETWORK_SOL })
        )
      ).toBeUndefined();
      expect(
        client.getQueryData(
          queryKeys.solanaNftDetail({ mintAddress: MINT_BURN, networkId: NETWORK_SOL_DEV })
        )
      ).toBeUndefined();
      expect(
        client.getQueryData(
          queryKeys.solanaNftDetail({ mintAddress: MINT_KEEP, networkId: NETWORK_SOL })
        )
      ).toBeDefined();
    });

    it('keeps optimistic NFT removal scoped to the requested network', async () => {
      const client = makeClient();
      seedNfts(client);
      const { result } = renderHook(() => useInvalidateAfterTx(), {
        wrapper: makeWrapper(client),
      });

      await result.current({
        accountId: ACCOUNT_A,
        networkId: NETWORK_SOL,
        kinds: ['nfts'],
        removedNftMintAddresses: [MINT_BURN],
      });

      const devnetList = client.getQueryData(
        queryKeys.solanaNfts({ accountId: ACCOUNT_A, networkId: NETWORK_SOL_DEV })
      ) as Array<{ mint: { address: string } }>;
      expect(devnetList.map((n) => n.mint.address)).toEqual([MINT_BURN]);
      expect(
        client.getQueryData(
          queryKeys.solanaNftDetail({ mintAddress: MINT_BURN, networkId: NETWORK_SOL_DEV })
        )
      ).toBeDefined();
    });

    it('is a no-op when removedNftMintAddresses is empty or omitted', async () => {
      const client = makeClient();
      seedNfts(client);
      const { result } = renderHook(() => useInvalidateAfterTx(), {
        wrapper: makeWrapper(client),
      });

      await result.current({ accountId: ACCOUNT_A, kinds: ['nfts'] });

      const aSolList = client.getQueryData(
        queryKeys.solanaNfts({ accountId: ACCOUNT_A, networkId: NETWORK_SOL })
      ) as Array<{ mint: { address: string } }>;
      expect(aSolList.map((n) => n.mint.address)).toEqual([MINT_KEEP, MINT_BURN]);
    });

    it('keeps removed NFTs tombstoned after immediate and delayed settlement refetches', async () => {
      const client = makeClient();
      const solanaKey = queryKeys.solanaNfts({ accountId: ACCOUNT_A, networkId: NETWORK_SOL });
      const avatarKey = queryKeys.avatarNfts({ accountId: ACCOUNT_A });
      const fetchSolanaNfts = vi
        .fn()
        .mockResolvedValue([{ mint: { address: MINT_KEEP } }, { mint: { address: MINT_BURN } }]);
      const fetchAvatarNfts = vi.fn().mockResolvedValue([{ mint: MINT_BURN }, { mint: MINT_KEEP }]);

      const { result } = renderHook(
        () => {
          useQuery({
            queryKey: solanaKey,
            queryFn: fetchSolanaNfts,
          });
          useQuery({
            queryKey: avatarKey,
            queryFn: fetchAvatarNfts,
          });
          return useSettleAfterTx();
        },
        { wrapper: makeWrapper(client) }
      );

      await waitFor(() => {
        expect(fetchSolanaNfts).toHaveBeenCalledTimes(1);
        expect(fetchAvatarNfts).toHaveBeenCalledTimes(1);
      });

      vi.useFakeTimers();

      await act(async () => {
        await result.current({
          accountId: ACCOUNT_A,
          avatarAccountId: ACCOUNT_A,
          networkId: NETWORK_SOL,
          kinds: ['nfts', 'avatar-nfts'],
          removedNftMintAddresses: [MINT_BURN],
          settlementDelaysMs: [10_000],
        });
      });

      expect(
        (client.getQueryData(solanaKey) as Array<{ mint: { address: string } }>).map(
          (n) => n.mint.address
        )
      ).toEqual([MINT_KEEP]);
      expect(
        (client.getQueryData(avatarKey) as Array<{ mint: string }>).map((n) => n.mint)
      ).toEqual([MINT_KEEP]);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
        await Promise.resolve();
      });

      expect(fetchSolanaNfts).toHaveBeenCalledTimes(3);
      expect(fetchAvatarNfts).toHaveBeenCalledTimes(3);
      expect(
        (client.getQueryData(solanaKey) as Array<{ mint: { address: string } }>).map(
          (n) => n.mint.address
        )
      ).toEqual([MINT_KEEP]);
      expect(
        (client.getQueryData(avatarKey) as Array<{ mint: string }>).map((n) => n.mint)
      ).toEqual([MINT_KEEP]);
    });
  });
});

describe('useSettleUntilChanged', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const balanceKey = queryKeys.balance({ accountId: ACCOUNT_A, networkId: NETWORK_SOL });

  // A balance query whose on-chain `amount` is controlled by the test, mirroring
  // an indexer that returns the stale value until it catches up.
  function renderWithBalance(amounts: { current: string }) {
    const fetchBalance = vi.fn(async () => ({
      items: [{ address: 'So11111111111111111111111111111111111111112', amount: amounts.current }],
    }));
    const view = renderHook(
      () => {
        useQuery({ queryKey: balanceKey, queryFn: fetchBalance, staleTime: 15_000 });
        return useSettleUntilChanged();
      },
      { wrapper: makeWrapper(makeClient()) }
    );
    return { ...view, fetchBalance };
  }

  it('resolves changed once the indexer reflects the new balance', async () => {
    const amounts = { current: '1000000000' };
    const { result, fetchBalance } = renderWithBalance(amounts);

    await waitFor(() => expect(fetchBalance).toHaveBeenCalledTimes(1));

    vi.useFakeTimers();

    let settle: Promise<{ changed: boolean; waitedMs: number }>;
    await act(async () => {
      settle = result.current({
        accountId: ACCOUNT_A,
        networkId: NETWORK_SOL,
        kinds: ['balance', 'transactions'],
        pollIntervalMs: 2_500,
        maxWaitMs: 20_000,
      });
    });

    // Immediate refetch is still stale -> not resolved yet; poll once, still stale.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
    });

    // Indexer catches up.
    amounts.current = '989995000';
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
    });

    const res = await settle!;
    expect(res.changed).toBe(true);
    expect(res.waitedMs).toBeGreaterThan(0);
  });

  it('resolves changed:false at the ceiling when the balance never moves', async () => {
    const amounts = { current: '1000000000' };
    const { result, fetchBalance } = renderWithBalance(amounts);

    await waitFor(() => expect(fetchBalance).toHaveBeenCalledTimes(1));

    vi.useFakeTimers();

    let settle: Promise<{ changed: boolean; waitedMs: number }>;
    await act(async () => {
      settle = result.current({
        accountId: ACCOUNT_A,
        networkId: NETWORK_SOL,
        kinds: ['balance'],
        pollIntervalMs: 2_500,
        maxWaitMs: 10_000,
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    const res = await settle!;
    expect(res.changed).toBe(false);
    expect(res.waitedMs).toBeGreaterThanOrEqual(10_000);
  });
});
