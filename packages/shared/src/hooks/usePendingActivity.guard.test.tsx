/**
 * @vitest-environment jsdom
 *
 * The coherence guard: the app may never report one signature twice, in two
 * states, at once. Before this, the banner said "Swap confirmed" (chain, 1–3s)
 * while the screen still said "Processing swap" (indexer, up to 20s).
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PendingTransactionsProvider,
  usePendingTransactions,
} from '../contexts/PendingTransactionsContext';
import { usePendingActivity } from './usePendingActivity';

const SIGNATURE = 'sig-under-report';

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <PendingTransactionsProvider getOutcomes={async () => ({})} pollIntervalMs={10_000}>
        {children}
      </PendingTransactionsProvider>
    </QueryClientProvider>
  );
}

function useBoth() {
  return { store: usePendingTransactions(), activity: usePendingActivity() };
}

describe('usePendingActivity — one signature, one surface', () => {
  it('withholds the banner row while a foreground screen is reporting the signature', () => {
    const { result } = renderHook(useBoth, { wrapper });

    act(() => {
      result.current.store.trackPendingTransaction({
        signature: SIGNATURE,
        kind: 'swap',
        networkId: 'solana-mainnet',
        submittedAt: Date.now(),
      });
    });
    expect(result.current.activity.items.map((i) => i.id)).toEqual([SIGNATURE]);

    let release: (() => void) | undefined;
    act(() => {
      release = result.current.store.claimForegroundReport(SIGNATURE);
    });
    expect(result.current.activity.items).toEqual([]);

    act(() => release?.());
    expect(result.current.activity.items.map((i) => i.id)).toEqual([SIGNATURE]);
  });

  it('hands the report back to the banner even if the screen resolved to confirmed while claimed', () => {
    const { result } = renderHook(useBoth, { wrapper });

    act(() => {
      result.current.store.trackPendingTransaction({
        signature: SIGNATURE,
        kind: 'send',
        networkId: 'solana-mainnet',
        submittedAt: Date.now(),
      });
    });

    let release: (() => void) | undefined;
    act(() => {
      release = result.current.store.claimForegroundReport(SIGNATURE);
    });
    expect(result.current.activity.items).toEqual([]);

    // Releasing twice is safe — a screen may unmount after it has settled.
    act(() => {
      release?.();
      release?.();
    });
    expect(result.current.activity.items).toHaveLength(1);
  });
});
