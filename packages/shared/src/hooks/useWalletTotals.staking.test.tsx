/**
 * @vitest-environment jsdom
 *
 * A wallet's card on the wallets screen counts what it has staked, as the
 * Home total does (spec 038): the same reads, added to the liquid total.
 */
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./useBalance', () => ({
  fetchBalanceForAccount: vi.fn(async () => ({ usdTotal: 100 })),
}));
vi.mock('../api/services/staking', () => ({ getStakeAccounts: vi.fn(), getSkrStake: vi.fn() }));

import { getSkrStake, getStakeAccounts } from '../api/services/staking';
import { createTestQueryClient, QueryWrapper } from '../test-utils/query-wrapper';
import type { Account } from '../types/account';
import { useWalletTotals } from './useWalletTotals';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryWrapper client={createTestQueryClient()}>{children}</QueryWrapper>
);
const wallet = (id: string, address: string) =>
  ({
    id,
    networksAccounts: { 'solana-mainnet': [{ getReceiveAddress: () => address }] },
  }) as unknown as Account;

beforeEach(() => {
  vi.mocked(getStakeAccounts).mockResolvedValue({
    data: [{ lamports: '2000000000' }],
    usdPrice: 150,
  } as never);
  vi.mocked(getSkrStake).mockResolvedValue({
    decimals: 6,
    usdPrice: 0.02,
    liquid: '0',
    positions: [{ staked: '1000000000' }],
  } as never);
});

describe('useWalletTotals', () => {
  it("adds each wallet's staked SOL and SKR to its total", async () => {
    const { result } = renderHook(
      () => useWalletTotals({ accounts: [wallet('a', 'Addr')], networkId: 'solana-mainnet' }),
      { wrapper }
    );

    // 100 liquid + 2 SOL × 150 + 1,000 SKR × 0.02
    await waitFor(() => expect(result.current.totals.a).toBe(420));
    expect(getStakeAccounts).toHaveBeenCalledWith('solana-mainnet', 'Addr');
    expect(getSkrStake).toHaveBeenCalledWith('Addr');
  });

  it('keeps the liquid total when a stake read fails', async () => {
    vi.mocked(getStakeAccounts).mockRejectedValue(new Error('500'));
    vi.mocked(getSkrStake).mockRejectedValue(new Error('500'));

    const { result } = renderHook(
      () => useWalletTotals({ accounts: [wallet('a', 'Addr')], networkId: 'solana-mainnet' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.totals.a).toBe(100));
  });
});
