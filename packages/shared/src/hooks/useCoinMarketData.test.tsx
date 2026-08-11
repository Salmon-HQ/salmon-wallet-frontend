/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, QueryWrapper } from '../test-utils/query-wrapper';

vi.mock('../api/services', () => ({
  getCoinInfo: vi.fn(),
  getMarketChart: vi.fn(),
}));

import { getCoinInfo, getMarketChart } from '../api/services';
import { useCoinMarketData } from './useCoinMarketData';

const mockGetCoinInfo = vi.mocked(getCoinInfo);
const mockGetMarketChart = vi.mocked(getMarketChart);

function renderWithClient<TProps, TResult>(
  hook: (props: TProps) => TResult,
  initialProps: TProps,
) {
  const client = createTestQueryClient();
  return renderHook(hook, {
    initialProps,
    wrapper: ({ children }) => <QueryWrapper client={client}>{children}</QueryWrapper>,
  });
}

describe('useCoinMarketData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches coin info and chart data in parallel', async () => {
    mockGetCoinInfo.mockResolvedValue({
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
    } as any);
    mockGetMarketChart.mockResolvedValue({
      prices: [[1, 100] as [number, number], [2, 110] as [number, number]],
      marketCaps: [],
      totalVolumes: [],
    });

    const { result } = renderWithClient(
      () => useCoinMarketData({ coinId: 'bitcoin', currency: 'usd', days: 7 }),
      undefined as void,
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetCoinInfo).toHaveBeenCalledWith('bitcoin', 'usd');
    expect(mockGetMarketChart).toHaveBeenCalledWith('bitcoin', 7, 'usd');
    expect(result.current.coinInfo?.id).toBe('bitcoin');
    expect(result.current.chartData).toEqual([
      { timestamp: 1, price: 100 },
      { timestamp: 2, price: 110 },
    ]);
  });

  it('skips fetching when coinId is undefined', () => {
    const { result } = renderWithClient(
      () => useCoinMarketData({ coinId: undefined, currency: 'usd', days: 7 }),
      undefined as void,
    );
    expect(mockGetCoinInfo).not.toHaveBeenCalled();
    expect(mockGetMarketChart).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('exposes error message when a fetch fails', async () => {
    mockGetCoinInfo.mockRejectedValue(new Error('boom'));
    mockGetMarketChart.mockResolvedValue({ prices: [], marketCaps: [], totalVolumes: [] });

    const { result } = renderWithClient(
      () => useCoinMarketData({ coinId: 'bitcoin', currency: 'usd', days: 7 }),
      undefined as void,
    );

    await waitFor(() => {
      expect(result.current.error).toBe('boom');
    });
  });
});
