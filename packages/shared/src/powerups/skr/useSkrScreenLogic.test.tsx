/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('../../api/services/staking', () => ({ getSkrStake: vi.fn(), getStakeAccounts: vi.fn() }));
const market = vi.hoisted(() => ({
  current: { chartData: [] as { timestamp: number; price: number }[], coinInfo: null as unknown },
}));
vi.mock('../../hooks/useCoinMarketData', () => ({
  useCoinMarketData: () => ({ ...market.current, chartLoading: false, error: null }),
}));
vi.mock('../../contexts/CurrencyContext', () => ({
  useCurrencyContext: () => [
    { currency: 'usd' },
    { formatValue: (v: number) => `$${v.toFixed(2)}` },
  ],
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

import { getSkrStake } from '../../api/services/staking';
import { createTestQueryClient, QueryWrapper } from '../../test-utils/query-wrapper';
import { useSkrScreenLogic } from './useSkrScreenLogic';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryWrapper client={createTestQueryClient()}>{children}</QueryWrapper>
);
const base = {
  mint: 'SKR',
  decimals: 6,
  sharePrice: '1000000000',
  cooldownSeconds: 172800,
  apy: null,
  usdPrice: null,
  liquid: '0',
  positions: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  market.current = { chartData: [], coinInfo: null };
});

describe('useSkrScreenLogic', () => {
  it('is ready with the facts once the position arrives', async () => {
    vi.mocked(getSkrStake).mockResolvedValue({ ...base, liquid: '1000000' });

    const { result } = renderHook(() => useSkrScreenLogic({ publicKey: 'Owner' }), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.view?.available.value).toBe('1.00');
  });

  it('is empty without any SKR', async () => {
    vi.mocked(getSkrStake).mockResolvedValue(base);

    const { result } = renderHook(() => useSkrScreenLogic({ publicKey: 'Owner' }), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('empty'));
  });

  it('is an error when the read fails', async () => {
    vi.mocked(getSkrStake).mockRejectedValue(new Error('503'));

    const { result } = renderHook(() => useSkrScreenLogic({ publicKey: 'Owner' }), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('error'));
  });

  it("reads SKR's price, its change over the chart's period, and its supply", async () => {
    vi.mocked(getSkrStake).mockResolvedValue({ ...base, liquid: '1000000' });
    market.current = {
      chartData: [
        { timestamp: 1, price: 0.02 },
        { timestamp: 2, price: 0.019 },
      ],
      coinInfo: {
        id: 'seeker',
        image: 'https://img/skr.png',
        marketData: { currentPrice: 0.019, circulatingSupply: 7.1e9, totalSupply: 10.6e9 },
      },
    };

    const { result } = renderHook(() => useSkrScreenLogic({ publicKey: 'Owner' }), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.market).toEqual({
      logo: 'https://img/skr.png',
      price: '$0.019',
      change: { label: '−5.00% · 1M', tone: 'negative' },
      totalSupply: 10.6e9,
      circulatingSupply: 7.1e9,
    });
  });
});
