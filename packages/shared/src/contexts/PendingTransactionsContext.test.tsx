/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { PendingTransactionsProvider, usePendingTransactions } from './PendingTransactionsContext';
import type {
  SignatureOutcome,
  SignatureOutcomeLookup,
} from '../blockchain/solana/signature-status';
import { queryKeys } from '../query/keys';
import {
  initStorage,
  resetStorage,
  isStorageInitialized,
  createLocalStorageAdapter,
  getStorageItem,
  setStorageItem,
  STORAGE_KEYS,
} from '../storage';

const NET = 'solana-mainnet' as never;
const ACCT = 'sol-address';
const balanceKey = queryKeys.balance({ accountId: ACCT, networkId: NET });

function makeClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  client.setQueryData(balanceKey, { items: [] });
  return client;
}

/** Returns the same outcome for every signature asked about. */
function always(outcome: SignatureOutcome): SignatureOutcomeLookup {
  return async (_networkId, queries) =>
    Object.fromEntries(queries.map((q) => [q.signature, outcome]));
}

function setup(getOutcomes: SignatureOutcomeLookup, pollIntervalMs = 1_000) {
  const client = makeClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <PendingTransactionsProvider getOutcomes={getOutcomes} pollIntervalMs={pollIntervalMs}>
        {children}
      </PendingTransactionsProvider>
    </QueryClientProvider>
  );
  Wrapper.displayName = 'PendingTransactionsTestWrapper';
  const view = renderHook(() => usePendingTransactions(), { wrapper: Wrapper });
  return { client, ...view };
}

const isInvalidated = (client: QueryClient, key: readonly unknown[]) =>
  client.getQueryState(key as never)?.isInvalidated ?? false;

const track = (result: { current: ReturnType<typeof usePendingTransactions> }, signature: string) =>
  act(() => {
    result.current.trackPendingTransaction({
      signature,
      kind: 'send',
      networkId: NET,
      accountId: ACCT,
      submittedAt: Date.now(),
    });
  });

describe('PendingTransactionsProvider', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    if (isStorageInitialized()) {
      resetStorage();
    }
    window.localStorage?.clear();
  });

  it('records a submitted signature as pending', async () => {
    const { result } = setup(always('pending'));
    await track(result, 'sig-pending');

    expect(result.current.pendingTransactions).toHaveLength(1);
    expect(result.current.pendingTransactions[0].status).toBe('pending');
  });

  it('is idempotent per signature', async () => {
    const { result } = setup(always('pending'));
    await track(result, 'sig-dupe');
    await track(result, 'sig-dupe');

    expect(result.current.pendingTransactions).toHaveLength(1);
  });

  it('ignores non-Solana networks rather than parking a row that can never resolve', async () => {
    const { result } = setup(always('pending'));
    act(() => {
      result.current.trackPendingTransaction({
        signature: 'btc-tx',
        kind: 'send',
        networkId: 'bitcoin-mainnet' as never,
        submittedAt: Date.now(),
      });
    });

    expect(result.current.pendingTransactions).toHaveLength(0);
  });

  it('resolves to confirmed and settles the balance', async () => {
    const { client, result } = setup(always('confirmed'));
    await track(result, 'sig-ok');

    await waitFor(() => {
      expect(result.current.pendingTransactions[0]?.status).toBe('confirmed');
    });
    await waitFor(() => {
      expect(isInvalidated(client, balanceKey)).toBe(true);
    });
  });

  it('resolves to failed and still settles — a failed transaction spent the fee', async () => {
    const { client, result } = setup(always('failed'));
    await track(result, 'sig-bad');

    await waitFor(() => {
      expect(result.current.pendingTransactions[0]?.status).toBe('failed');
    });
    await waitFor(() => {
      expect(isInvalidated(client, balanceKey)).toBe(true);
    });
  });

  it('resolves to expired without settling — nothing reached the chain', async () => {
    const { client, result } = setup(always('expired'));
    await track(result, 'sig-gone');

    await waitFor(() => {
      expect(result.current.pendingTransactions[0]?.status).toBe('expired');
    });
    expect(isInvalidated(client, balanceKey)).toBe(false);
  });

  it('keeps waiting when the status lookup throws — an unreachable node is not a verdict', async () => {
    const getOutcomes = vi.fn<SignatureOutcomeLookup>().mockRejectedValue(new Error('offline'));
    const { result } = setup(getOutcomes);
    await track(result, 'sig-offline');

    await waitFor(() => {
      expect(getOutcomes).toHaveBeenCalled();
    });
    expect(result.current.pendingTransactions[0].status).toBe('pending');
  });

  it('persists in-flight entries and drops them from storage once resolved', async () => {
    initStorage({ platform: 'extension', adapter: createLocalStorageAdapter() });
    let outcome: SignatureOutcome = 'pending';
    const { result } = setup(
      async (_net, queries) => Object.fromEntries(queries.map((q) => [q.signature, outcome])),
      50
    );

    await track(result, 'sig-persist');
    await waitFor(async () => {
      const stored = await getStorageItem<unknown[]>(STORAGE_KEYS.PENDING_TRANSACTIONS);
      expect(stored).toHaveLength(1);
    });

    outcome = 'confirmed';
    await waitFor(() => {
      expect(result.current.pendingTransactions[0]?.status).toBe('confirmed');
    });
    await waitFor(async () => {
      const stored = await getStorageItem<unknown[]>(STORAGE_KEYS.PENDING_TRANSACTIONS);
      expect(stored).toHaveLength(0);
    });
  });

  it('rehydrates on mount and reports a transaction that resolved while the app was closed', async () => {
    initStorage({ platform: 'extension', adapter: createLocalStorageAdapter() });
    await setStorageItem(STORAGE_KEYS.PENDING_TRANSACTIONS, [
      {
        signature: 'sig-resumed',
        kind: 'swap',
        networkId: NET,
        accountId: ACCT,
        submittedAt: Date.now() - 60_000,
        status: 'pending',
      },
    ]);

    const { client, result } = setup(always('confirmed'));

    await waitFor(() => {
      expect(result.current.pendingTransactions[0]?.signature).toBe('sig-resumed');
    });
    await waitFor(() => {
      expect(result.current.pendingTransactions[0]?.status).toBe('confirmed');
    });
    expect(isInvalidated(client, balanceKey)).toBe(true);
  });

  it('lets the user dismiss a resolved entry', async () => {
    const { result } = setup(always('confirmed'));
    await track(result, 'sig-dismiss');

    await waitFor(() => {
      expect(result.current.pendingTransactions[0]?.status).toBe('confirmed');
    });
    act(() => {
      result.current.dismissPendingTransaction('sig-dismiss');
    });
    expect(result.current.pendingTransactions).toHaveLength(0);
  });
});
