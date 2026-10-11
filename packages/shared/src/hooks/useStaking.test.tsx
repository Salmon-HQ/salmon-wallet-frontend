/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('../api/services/staking', () => ({
  getStakeAccounts: vi.fn(),
  getSkrStake: vi.fn(),
}));

import { useStakeAccountsScreen, useStaking } from './useStaking';
import { getSkrStake, getStakeAccounts } from '../api/services/staking';
import { createTestQueryClient, QueryWrapper } from '../test-utils/query-wrapper';

const WALLET = 'CzNRNm6vbDiJ2MG96Lw4gSZW1gSjeV6DgSEAjCULxXcJ';
const stakes = {
  epoch: 1052,
  usdPrice: 100,
  data: [{ address: 'a', lamports: '2000000000', rewards: [] }],
};
const skr = {
  mint: 'SKR',
  decimals: 6,
  usdPrice: 0.02,
  positions: [{ address: 'p', staked: '1000000000', earned: '0', history: [] }],
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryWrapper client={createTestQueryClient()}>{children}</QueryWrapper>
);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getStakeAccounts).mockResolvedValue(stakes as never);
  vi.mocked(getSkrStake).mockResolvedValue(skr as never);
});

describe('useStaking', () => {
  it('reads SOL stakes and the SKR position on mainnet, with logos from the liquid tokens', async () => {
    const { result } = renderHook(
      () =>
        useStaking({
          publicKey: WALLET,
          networkId: 'solana-mainnet',
          logos: { SOL: 'https://x/sol.png' },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.tokens).toHaveLength(2));
    expect(result.current.tokens[0]).toMatchObject({
      symbol: 'SOL',
      uiAmount: 2,
      logo: 'https://x/sol.png',
    });
    expect(result.current.tokens[1]).toMatchObject({ symbol: 'SKR', uiAmount: 1000 });
    expect(result.current.stakedUsd).toBeCloseTo(220, 6);
    expect(getStakeAccounts).toHaveBeenCalledWith('solana-mainnet', WALLET);
    expect(getSkrStake).toHaveBeenCalledWith(WALLET);
  });

  it('does not ask for SKR off mainnet', async () => {
    const { result } = renderHook(
      () => useStaking({ publicKey: WALLET, networkId: 'solana-devnet' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.tokens).toHaveLength(1));
    expect(getSkrStake).not.toHaveBeenCalled();
  });

  it('reads nothing on Bitcoin', () => {
    const { result } = renderHook(
      () => useStaking({ publicKey: 'bc1q', networkId: 'bitcoin-mainnet' }),
      { wrapper }
    );

    expect(result.current.tokens).toEqual([]);
    expect(getStakeAccounts).not.toHaveBeenCalled();
  });

  it('shows nothing, and adds nothing, when the reads fail', async () => {
    vi.mocked(getStakeAccounts).mockRejectedValue(new Error('404'));
    vi.mocked(getSkrStake).mockRejectedValue(new Error('404'));
    const { result } = renderHook(
      () => useStaking({ publicKey: WALLET, networkId: 'solana-mainnet' }),
      { wrapper }
    );

    await waitFor(() => expect(getSkrStake).toHaveBeenCalled());
    expect(result.current.tokens).toEqual([]);
    expect(result.current.stakedUsd).toBe(0);
  });
});

describe('useStakeAccountsScreen', () => {
  it('is ready with one card per stake account', async () => {
    const { result } = renderHook(
      () => useStakeAccountsScreen({ publicKey: WALLET, networkId: 'solana-mainnet' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.cards).toHaveLength(1);
  });

  it('is empty when the wallet has no stake accounts', async () => {
    vi.mocked(getStakeAccounts).mockResolvedValue({ ...stakes, data: [] } as never);
    const { result } = renderHook(
      () => useStakeAccountsScreen({ publicKey: WALLET, networkId: 'solana-mainnet' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.state).toBe('empty'));
  });

  it('is an error the user can retry', async () => {
    vi.mocked(getStakeAccounts).mockRejectedValueOnce(new Error('503'));
    const { result } = renderHook(
      () => useStakeAccountsScreen({ publicKey: WALLET, networkId: 'solana-mainnet' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.state).toBe('error'));
    await result.current.refresh();
    await waitFor(() => expect(result.current.state).toBe('ready'));
  });
});
