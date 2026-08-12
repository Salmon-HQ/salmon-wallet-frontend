/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { BridgeSettlementProvider, useBridgeSettlement } from './BridgeSettlementContext';
import { queryKeys } from '../query/keys';
import type { BridgeTransaction } from '../types/bridge';
import {
  initStorage,
  resetStorage,
  isStorageInitialized,
  createLocalStorageAdapter,
  setStorageItem,
  STORAGE_KEYS,
} from '../storage';

vi.mock('../analytics', () => ({
  trackEvent: vi.fn(),
  trackFirstTime: vi.fn(),
}));
import { trackEvent, trackFirstTime } from '../analytics';

const SRC_NET = 'solana-mainnet' as never;
const SRC_ACCT = 'sol-address';
const DEST_NET = 'bitcoin-mainnet' as never;
const DEST_ACCT = 'btc-address';

const destKey = queryKeys.balance({ accountId: DEST_ACCT, networkId: DEST_NET });
const srcKey = queryKeys.balance({ accountId: SRC_ACCT, networkId: SRC_NET });

function makeClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  client.setQueryData(destKey, { items: [] });
  client.setQueryData(srcKey, { items: [] });
  return client;
}

function setup(
  getStatus: (id: string) => Promise<BridgeTransaction | null>,
  pollIntervalMs = 1_000
) {
  const client = makeClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <BridgeSettlementProvider getStatus={getStatus} pollIntervalMs={pollIntervalMs}>
        {children}
      </BridgeSettlementProvider>
    </QueryClientProvider>
  );
  Wrapper.displayName = 'BridgeSettlementTestWrapper';
  const view = renderHook(() => useBridgeSettlement(), { wrapper: Wrapper });
  return { client, ...view };
}

const isInvalidated = (client: QueryClient, key: readonly unknown[]) =>
  client.getQueryState(key as never)?.isInvalidated ?? false;

describe('BridgeSettlementProvider', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    if (isStorageInitialized()) {
      resetStorage();
    }
    if (typeof window !== 'undefined') {
      window.localStorage?.clear();
    }
  });

  it('polls until success, then settles the destination balance and stops tracking', async () => {
    const getStatus = vi
      .fn<(id: string) => Promise<BridgeTransaction | null>>()
      .mockResolvedValueOnce({ status: 'inProgress' } as BridgeTransaction)
      .mockResolvedValueOnce({ status: 'success' } as BridgeTransaction);

    const { client, result } = setup(getStatus);

    vi.useFakeTimers();

    act(() => {
      result.current.trackBridgeExchange({
        id: 'ex-1',
        sourceNetworkId: SRC_NET,
        sourceAccountId: SRC_ACCT,
        destNetworkId: DEST_NET,
        destAccountId: DEST_ACCT,
      });
    });
    expect(result.current.pendingExchanges).toHaveLength(1);

    // Immediate poll (fires on track/resume): still in progress -> keep tracking.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(getStatus).toHaveBeenCalledTimes(1);
    expect(result.current.pendingExchanges).toHaveLength(1);
    expect(isInvalidated(client, destKey)).toBe(false);

    // Next interval poll: success -> settle destination + source, drop pending.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(getStatus).toHaveBeenCalledTimes(2);
    expect(isInvalidated(client, destKey)).toBe(true);
    expect(isInvalidated(client, srcKey)).toBe(true);
    expect(result.current.pendingExchanges).toHaveLength(0);
    // A settled bridge is the ONLY place a cross-chain swap is tracked, with the
    // real chains (solana -> bitcoin) and success from the actual outcome.
    expect(trackEvent).toHaveBeenCalledWith('swap_completed', {
      from_chain: 'solana',
      to_chain: 'bitcoin',
      success: true,
    });
    expect(trackFirstTime).toHaveBeenCalledWith(
      'first_swap_completed',
      STORAGE_KEYS.ANALYTICS_FIRST_SWAP
    );
  });

  it('settles the source balance on refund and stops tracking', async () => {
    const getStatus = vi
      .fn<(id: string) => Promise<BridgeTransaction | null>>()
      .mockResolvedValue({ status: 'refunded' } as BridgeTransaction);

    const { client, result } = setup(getStatus);

    vi.useFakeTimers();

    act(() => {
      result.current.trackBridgeExchange({
        id: 'ex-2',
        sourceNetworkId: SRC_NET,
        sourceAccountId: SRC_ACCT,
        destNetworkId: DEST_NET,
        destAccountId: DEST_ACCT,
      });
    });

    // Immediate poll settles on the terminal status without waiting an interval.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Refund returns funds on the source side; destination is untouched.
    expect(isInvalidated(client, srcKey)).toBe(true);
    expect(isInvalidated(client, destKey)).toBe(false);
    expect(result.current.pendingExchanges).toHaveLength(0);
    // A refunded/failed bridge emits the swap event with success:false, which is
    // what makes the cross-chain success rate real.
    expect(trackEvent).toHaveBeenCalledWith('swap_completed', {
      from_chain: 'solana',
      to_chain: 'bitcoin',
      success: false,
    });
    expect(trackFirstTime).not.toHaveBeenCalled();
  });

  it('keeps tracking while the exchange stays in progress', async () => {
    const getStatus = vi
      .fn<(id: string) => Promise<BridgeTransaction | null>>()
      .mockResolvedValue({ status: 'inProgress' } as BridgeTransaction);

    const { client, result } = setup(getStatus);

    vi.useFakeTimers();

    act(() => {
      result.current.trackBridgeExchange({
        id: 'ex-3',
        destNetworkId: DEST_NET,
        destAccountId: DEST_ACCT,
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(getStatus.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(result.current.pendingExchanges).toHaveLength(1);
    expect(isInvalidated(client, destKey)).toBe(false);
  });

  it('flags isStalled after three consecutive poll failures and resets on success', async () => {
    const getStatus = vi
      .fn<(id: string) => Promise<BridgeTransaction | null>>()
      .mockRejectedValueOnce(new Error('network down'))
      .mockRejectedValueOnce(new Error('network down'))
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue({ status: 'inProgress' } as BridgeTransaction);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { result } = setup(getStatus);

    vi.useFakeTimers();

    act(() => {
      result.current.trackBridgeExchange({ id: 'ex-stall', destNetworkId: DEST_NET });
    });

    // Failures 1 and 2 (immediate poll + first interval): not stalled yet.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(getStatus).toHaveBeenCalledTimes(2);
    expect(result.current.isStalled).toBe(false);

    // Failure 3: stalled.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(getStatus).toHaveBeenCalledTimes(3);
    expect(result.current.isStalled).toBe(true);

    // Any success resets the flag.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current.isStalled).toBe(false);
    expect(result.current.pendingExchanges).toHaveLength(1);
  });

  it('retryNow forces an immediate poll without waiting for the interval', async () => {
    const getStatus = vi
      .fn<(id: string) => Promise<BridgeTransaction | null>>()
      .mockResolvedValue({ status: 'inProgress' } as BridgeTransaction);

    const { result } = setup(getStatus);

    vi.useFakeTimers();

    act(() => {
      result.current.trackBridgeExchange({ id: 'ex-retry', destNetworkId: DEST_NET });
    });

    // Immediate poll on track.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(getStatus).toHaveBeenCalledTimes(1);

    // No timer advance — retryNow alone triggers the next poll.
    await act(async () => {
      result.current.retryNow();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(getStatus).toHaveBeenCalledTimes(2);
  });

  it('hydrates persisted exchanges on mount and settles one that finished while away', async () => {
    // A bridge persisted in a previous session (e.g. before the extension popup
    // closed) must resume and settle on next open.
    initStorage({ platform: 'web', adapter: createLocalStorageAdapter() });
    await setStorageItem(STORAGE_KEYS.PENDING_BRIDGES, [
      {
        id: 'ex-resumed',
        sourceNetworkId: SRC_NET,
        sourceAccountId: SRC_ACCT,
        destNetworkId: DEST_NET,
        destAccountId: DEST_ACCT,
      },
    ]);

    const getStatus = vi
      .fn<(id: string) => Promise<BridgeTransaction | null>>()
      .mockResolvedValue({ status: 'success' } as BridgeTransaction);

    // Real timers: the hydrate read + immediate poll resolve via microtasks.
    const { client, result } = setup(getStatus);

    // Wait for the resumed exchange to actually be polled (proves hydration ran),
    // then for it to settle and clear.
    await waitFor(() => {
      expect(getStatus).toHaveBeenCalledWith('ex-resumed');
    });
    await waitFor(() => {
      expect(result.current.pendingExchanges).toHaveLength(0);
    });
    expect(isInvalidated(client, destKey)).toBe(true);
  });
});
