/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, QueryWrapper } from '../test-utils/query-wrapper';

vi.mock('../api/services', () => ({
  getTokenCoinInfo: vi.fn(),
  getTokenMarketChart: vi.fn(),
}));

import { getTokenCoinInfo, getTokenMarketChart } from '../api/services';
import { useCoinMarketData } from './useCoinMarketData';

const mockGetTokenCoinInfo = vi.mocked(getTokenCoinInfo);
const mockGetTokenMarketChart = vi.mocked(getTokenMarketChart);

function renderWithClient<TProps, TResult>(hook: (props: TProps) => TResult, initialProps: TProps) {
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
    mockGetTokenCoinInfo.mockResolvedValue({
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
    } as any);
    mockGetTokenMarketChart.mockResolvedValue({
      prices: [[1, 100] as [number, number], [2, 110] as [number, number]],
      marketCaps: [],
      totalVolumes: [],
    });

    const { result } = renderWithClient(
      () => useCoinMarketData({ coinId: 'bitcoin', currency: 'usd', days: 7 }),
      undefined as void
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetTokenCoinInfo).toHaveBeenCalledWith(
      { coingeckoId: 'bitcoin', address: undefined },
      'usd'
    );
    expect(mockGetTokenMarketChart).toHaveBeenCalledWith(
      { coingeckoId: 'bitcoin', address: undefined },
      7,
      'usd'
    );
    expect(result.current.coinInfo?.id).toBe('bitcoin');
    expect(result.current.chartData).toEqual([
      { timestamp: 1, price: 100 },
      { timestamp: 2, price: 110 },
    ]);
  });

  it('skips fetching when coinId and contractAddress are undefined', () => {
    const { result } = renderWithClient(
      () => useCoinMarketData({ coinId: undefined, currency: 'usd', days: 7 }),
      undefined as void
    );
    expect(mockGetTokenCoinInfo).not.toHaveBeenCalled();
    expect(mockGetTokenMarketChart).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('falls back to contract chart and coin info when coinId is missing but contractAddress exists', async () => {
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    mockGetTokenCoinInfo.mockResolvedValue({
      id: 'usd-coin',
      symbol: 'usdc',
      name: 'USDC',
    } as any);
    mockGetTokenMarketChart.mockResolvedValue({
      prices: [[1, 1] as [number, number]],
      marketCaps: [],
      totalVolumes: [],
    });

    const { result } = renderWithClient(
      () =>
        useCoinMarketData({
          coinId: undefined,
          contractAddress: USDC_MINT,
          currency: 'usd',
          days: 7,
        }),
      undefined as void
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetTokenCoinInfo).toHaveBeenCalledWith(
      { coingeckoId: undefined, address: USDC_MINT },
      'usd'
    );
    expect(mockGetTokenMarketChart).toHaveBeenCalledWith(
      { coingeckoId: undefined, address: USDC_MINT },
      7,
      'usd'
    );
    expect(result.current.coinInfo?.id).toBe('usd-coin');
    expect(result.current.chartData).toEqual([{ timestamp: 1, price: 1 }]);
    expect(result.current.error).toBeNull();
  });

  it('hides chart and info without error when the contract endpoints return null (404)', async () => {
    mockGetTokenCoinInfo.mockResolvedValue(null);
    mockGetTokenMarketChart.mockResolvedValue(null);

    const { result } = renderWithClient(
      () =>
        useCoinMarketData({
          coinId: undefined,
          contractAddress: 'mockJUPmintNotListedOnCoinGecko111111111111',
          currency: 'usd',
          days: 7,
        }),
      undefined as void
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.chartData).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.coinInfo).toBeNull();
  });

  it('exposes error message when a fetch fails', async () => {
    mockGetTokenCoinInfo.mockRejectedValue(new Error('boom'));
    mockGetTokenMarketChart.mockResolvedValue({ prices: [], marketCaps: [], totalVolumes: [] });

    const { result } = renderWithClient(
      () => useCoinMarketData({ coinId: 'bitcoin', currency: 'usd', days: 7 }),
      undefined as void
    );

    await waitFor(() => {
      expect(result.current.error).toBe('boom');
    });
  });

  it('exposes error message when the contract chart fails with a real error', async () => {
    mockGetTokenCoinInfo.mockResolvedValue(null);
    mockGetTokenMarketChart.mockRejectedValue(new Error('Internal error'));

    const { result } = renderWithClient(
      () =>
        useCoinMarketData({
          coinId: undefined,
          contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          currency: 'usd',
          days: 7,
        }),
      undefined as void
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Internal error');
    });
  });
});
