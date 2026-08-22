/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('../utils/account', () => ({
  isSolanaAccount: vi.fn(() => true),
  isBitcoinAccount: vi.fn(() => false),
  isEthereumAccount: vi.fn(() => false),
}));

vi.mock('../storage', () => ({
  getStorageItem: vi.fn(async () => null),
  setStorageItem: vi.fn(async () => undefined),
  STORAGE_KEYS: { HIDDEN_BALANCE: 'hidden_balance' },
}));

import { createQueryClient } from './query-client';
import { QueryWrapper } from '../test-utils/query-wrapper';
import { useBalance } from '../hooks/useBalance';
import type { NetworkId } from '../types/blockchain';

describe('createQueryClient caching', () => {
  it('keeps unused cache entries far longer than a chain-switch round trip', () => {
    const defaults = createQueryClient().getDefaultOptions().queries;
    // 5 minutes used to evict the other chain's data before the user came back.
    expect(defaults?.gcTime).toBeGreaterThanOrEqual(60 * 60 * 1000);
    // Non-zero so a remount/focus reuses what is already on screen.
    expect(defaults?.staleTime).toBeGreaterThan(0);
  });

  it('does NOT set a cross-key placeholder (never render one chain under another)', () => {
    const defaults = createQueryClient().getDefaultOptions().queries;
    expect(defaults?.placeholderData).toBeUndefined();
  });
});

describe('revisiting a previously-loaded chain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has data immediately and never drops back to loading', async () => {
    const balances: Record<string, number> = {
      'solana-mainnet': 100,
      'bitcoin-mainnet': 7,
    };
    // The fetcher answers per network, so reading the wrong chain's entry
    // would be visible in usdTotal.
    let network: NetworkId = 'solana-mainnet';
    const account = {
      getReceiveAddress: () => 'wallet-1',
      getBalance: vi.fn(async () => ({
        usdTotal: balances[network],
        last24HoursChange: 0,
        items: [],
      })),
    };

    const client = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryWrapper client={client}>{children}</QueryWrapper>
    );

    const { result, rerender } = renderHook(
      ({ networkId }: { networkId: NetworkId }) =>
        useBalance({ account: account as never, networkId }),
      { wrapper, initialProps: { networkId: 'solana-mainnet' as NetworkId } }
    );

    await waitFor(() => expect(result.current.hasData).toBe(true));
    expect(result.current.usdTotal).toBe(100);

    // Switch away — a cold chain legitimately has nothing to show.
    network = 'bitcoin-mainnet';
    rerender({ networkId: 'bitcoin-mainnet' as NetworkId });
    expect(result.current.hasData).toBe(false);
    await waitFor(() => expect(result.current.usdTotal).toBe(7));

    // Switch back — the entry for THIS chain's key is still cached, so the
    // first render after the switch already has data. No skeleton frame.
    network = 'solana-mainnet';
    rerender({ networkId: 'solana-mainnet' as NetworkId });
    expect(result.current.hasData).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.usdTotal).toBe(100);
    // Revalidation is reported separately so the UI can stay on screen.
    expect(typeof result.current.refreshing).toBe('boolean');
  });
});
