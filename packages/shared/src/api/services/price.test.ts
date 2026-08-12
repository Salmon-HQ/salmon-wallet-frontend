/**
 * Price Service Tests
 * Tests for price service functions including cache behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getReachableBackendBaseUrl } from '../test-backend';

// Mock modules BEFORE importing the functions
vi.mock('axios', () => {
  return {
    default: {
      get: vi.fn(),
      create: vi.fn(() => ({
        get: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      })),
    },
  };
});

vi.mock('../client', () => {
  return {
    apiClient: {
      get: vi.fn(),
    },
    staticApiClient: {
      get: vi.fn(),
    },
    ApiError: class ApiError extends Error {
      status: number;
      code?: string;
      details?: Record<string, unknown>;
      originalError?: unknown;

      constructor(
        message: string,
        status: number,
        code?: string,
        details?: Record<string, unknown>,
        originalError?: unknown
      ) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
        this.originalError = originalError;
      }

      isNotFound(): boolean {
        return this.status === 404;
      }
    },
  };
});

// Now import the functions AFTER mocking
import {
  getMarketChart,
  getContractMarketChart,
  getTokenMarketChart,
  getCoinInfo,
  getContractCoinInfo,
  getTokenCoinInfo,
} from './price';
import type {
  MarketChartData,
  CoinInfo,
} from '../../types/price';
import { apiClient, staticApiClient, ApiError } from '../client';

// Get access to the mocked functions
const mockApiClientGet = vi.mocked(apiClient.get);
const mockStaticApiClientGet = vi.mocked(staticApiClient.get);

// ============================================================================
// Test Data
// ============================================================================

/**
 * Mock MarketChartData
 */
const MOCK_MARKET_CHART: MarketChartData = {
  prices: [
    [1704067200000, 100.5],
    [1704153600000, 102.3],
    [1704240000000, 101.8],
    [1704326400000, 103.5],
    [1704412800000, 105.2],
  ],
  marketCaps: [
    [1704067200000, 45000000000],
    [1704153600000, 45800000000],
    [1704240000000, 45600000000],
    [1704326400000, 46300000000],
    [1704412800000, 47100000000],
  ],
  totalVolumes: [
    [1704067200000, 2500000000],
    [1704153600000, 2600000000],
    [1704240000000, 2550000000],
    [1704326400000, 2700000000],
    [1704412800000, 2800000000],
  ],
};

/**
 * Mock CoinInfo data
 */
const MOCK_COIN_INFO: CoinInfo = {
  id: 'solana',
  symbol: 'sol',
  name: 'Solana',
  description: 'Solana is a highly functional open source project that banks on blockchain technology.',
  image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
  marketData: {
    currentPrice: 100.5,
    marketCap: 45000000000,
    totalVolume: 2500000000,
    high24h: 105.2,
    low24h: 95.8,
    priceChange24h: 4.95,
    priceChangePercentage24h: 5.2,
    circulatingSupply: 447615274,
    totalSupply: 550000000,
    maxSupply: null,
    ath: 260.06,
    athChangePercentage: -61.35,
    athDate: '2021-11-06T21:54:35.825Z',
    atl: 0.500801,
    atlChangePercentage: 19961.42,
    atlDate: '2020-05-11T19:35:23.449Z',
  },
  links: {
    homepage: 'https://solana.com',
    twitter: 'solana',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if backend is available
 */
const backendBaseUrl = await getReachableBackendBaseUrl();
const hasExplicitStaticApi =
  !!process.env.EXPO_PUBLIC_STATIC_API_URL || !!process.env.VITE_STATIC_API_URL;

async function fetchBackendJson<T>(path: string): Promise<T> {
  if (!backendBaseUrl) {
    throw new Error('Backend not available');
  }

  const response = await fetch(`${backendBaseUrl}${path}`, {
    method: 'GET',
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ============================================================================
// Tests
// ============================================================================

describe('Price Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // getMarketChart Tests
  // ==========================================================================

  describe('getMarketChart', () => {
    it('should fetch market chart for a coin', async () => {
      mockApiClientGet.mockResolvedValueOnce({ data: MOCK_MARKET_CHART });

      const result = await getMarketChart('solana');

      expect(result).toEqual(MOCK_MARKET_CHART);
      expect(mockApiClientGet).toHaveBeenCalledWith('/v1/chart/solana', {
        params: { days: 7, currency: 'usd' },
      });
    });

    it('should use default days (7) and currency (usd)', async () => {
      mockApiClientGet.mockResolvedValueOnce({ data: MOCK_MARKET_CHART });

      await getMarketChart('bitcoin');

      expect(mockApiClientGet).toHaveBeenCalledWith('/v1/chart/bitcoin', {
        params: { days: 7, currency: 'usd' },
      });
    });

    it('should accept custom days parameter', async () => {
      mockApiClientGet.mockResolvedValueOnce({ data: MOCK_MARKET_CHART });

      await getMarketChart('ethereum', 30);

      expect(mockApiClientGet).toHaveBeenCalledWith('/v1/chart/ethereum', {
        params: { days: 30, currency: 'usd' },
      });
    });

    it('should accept custom currency parameter', async () => {
      mockApiClientGet.mockResolvedValueOnce({ data: MOCK_MARKET_CHART });

      await getMarketChart('solana', 7, 'eur');

      expect(mockApiClientGet).toHaveBeenCalledWith('/v1/chart/solana', {
        params: { days: 7, currency: 'eur' },
      });
    });

    it('should support all valid days values', async () => {
      const validDays: Array<1 | 7 | 30 | 90 | 365> = [1, 7, 30, 90, 365];

      for (const days of validDays) {
        mockApiClientGet.mockResolvedValueOnce({ data: MOCK_MARKET_CHART });
        await getMarketChart('solana', days);
        expect(mockApiClientGet).toHaveBeenLastCalledWith('/v1/chart/solana', {
          params: { days, currency: 'usd' },
        });
      }
    });

    it('should return null on API error', async () => {
      mockApiClientGet.mockRejectedValueOnce(new Error('API error'));

      const result = await getMarketChart('solana');

      expect(result).toBeNull();
    });

    it('should verify chart data structure', async () => {
      mockApiClientGet.mockResolvedValueOnce({ data: MOCK_MARKET_CHART });

      const result = await getMarketChart('solana');

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('prices');
      expect(result).toHaveProperty('marketCaps');
      expect(result).toHaveProperty('totalVolumes');
      expect(Array.isArray(result!.prices)).toBe(true);
      expect(Array.isArray(result!.marketCaps)).toBe(true);
      expect(Array.isArray(result!.totalVolumes)).toBe(true);
    });

    it('should verify data point structure', async () => {
      mockApiClientGet.mockResolvedValueOnce({ data: MOCK_MARKET_CHART });

      const result = await getMarketChart('solana');

      expect(result!.prices.length).toBeGreaterThan(0);
      expect(result!.prices[0]).toHaveLength(2);
      expect(typeof result!.prices[0][0]).toBe('number'); // timestamp
      expect(typeof result!.prices[0][1]).toBe('number'); // price
    });
  });

  // ==========================================================================
  // getContractMarketChart Tests
  // ==========================================================================

  describe('getContractMarketChart', () => {
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

    it('should fetch contract chart and return camelCase shape', async () => {
      mockApiClientGet.mockResolvedValueOnce({ data: MOCK_MARKET_CHART });

      const result = await getContractMarketChart('solana', USDC_MINT, 7);

      expect(mockApiClientGet).toHaveBeenCalledWith(
        `/v1/chart/solana/contract/${USDC_MINT}`,
        { params: { days: 7, currency: 'usd' } }
      );
      expect(result).toEqual(MOCK_MARKET_CHART);
      expect(result).toHaveProperty('marketCaps');
      expect(result).toHaveProperty('totalVolumes');
      expect(Array.isArray(result!.prices)).toBe(true);
    });

    it('should return null on 404 (chart_not_found is an expected outcome)', async () => {
      mockApiClientGet.mockRejectedValueOnce(
        new ApiError('No CoinGecko chart for contract', 404, 'chart_not_found')
      );

      const result = await getContractMarketChart('solana', USDC_MINT);

      expect(result).toBeNull();
    });

    it('should throw on server errors (5xx)', async () => {
      mockApiClientGet.mockRejectedValueOnce(new ApiError('Internal error', 500));

      await expect(getContractMarketChart('solana', USDC_MINT)).rejects.toThrow('Internal error');
    });

    it('should throw on network errors', async () => {
      mockApiClientGet.mockRejectedValueOnce(new Error('Network Error'));

      await expect(getContractMarketChart('solana', USDC_MINT)).rejects.toThrow('Network Error');
    });
  });

  // ==========================================================================
  // getTokenMarketChart Tests (dispatch)
  // ==========================================================================

  describe('getTokenMarketChart', () => {
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

    it('should use the classic endpoint when coingeckoId is present', async () => {
      mockApiClientGet.mockResolvedValueOnce({ data: MOCK_MARKET_CHART });

      const result = await getTokenMarketChart(
        { coingeckoId: 'solana', address: USDC_MINT },
        7
      );

      expect(mockApiClientGet).toHaveBeenCalledWith('/v1/chart/solana', {
        params: { days: 7, currency: 'usd' },
      });
      expect(result).toEqual(MOCK_MARKET_CHART);
    });

    it('should fall back to the contract endpoint when coingeckoId is missing', async () => {
      mockApiClientGet.mockResolvedValueOnce({ data: MOCK_MARKET_CHART });

      const result = await getTokenMarketChart({ address: USDC_MINT }, 30);

      expect(mockApiClientGet).toHaveBeenCalledWith(
        `/v1/chart/solana/contract/${USDC_MINT}`,
        { params: { days: 30, currency: 'usd' } }
      );
      expect(result).toEqual(MOCK_MARKET_CHART);
    });

    it('should return null without calling the API when neither identifier exists', async () => {
      const result = await getTokenMarketChart({});

      expect(result).toBeNull();
      expect(mockApiClientGet).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getCoinInfo Tests
  // ==========================================================================

  describe('getCoinInfo', () => {
    it('should fetch coin info for a coin', async () => {
      mockApiClientGet.mockResolvedValueOnce({ data: MOCK_COIN_INFO });

      const result = await getCoinInfo('solana');

      expect(result).toEqual(MOCK_COIN_INFO);
      expect(mockApiClientGet).toHaveBeenCalledWith('/v1/coin/solana', {
        params: { currency: 'usd' },
      });
    });

    it('should use default currency (usd)', async () => {
      mockApiClientGet.mockResolvedValueOnce({ data: MOCK_COIN_INFO });

      await getCoinInfo('bitcoin');

      expect(mockApiClientGet).toHaveBeenCalledWith('/v1/coin/bitcoin', {
        params: { currency: 'usd' },
      });
    });

    it('should accept custom currency parameter', async () => {
      mockApiClientGet.mockResolvedValueOnce({ data: MOCK_COIN_INFO });

      await getCoinInfo('ethereum', 'eur');

      expect(mockApiClientGet).toHaveBeenCalledWith('/v1/coin/ethereum', {
        params: { currency: 'eur' },
      });
    });

    it('should return null on API error', async () => {
      mockApiClientGet.mockRejectedValueOnce(new Error('API error'));

      const result = await getCoinInfo('solana');

      expect(result).toBeNull();
    });

    it('should verify coin info structure', async () => {
      mockApiClientGet.mockResolvedValueOnce({ data: MOCK_COIN_INFO });

      const result = await getCoinInfo('solana');

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('symbol');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('marketData');
      expect(result).toHaveProperty('image');
    });

    it('should verify market data structure', async () => {
      mockApiClientGet.mockResolvedValueOnce({ data: MOCK_COIN_INFO });

      const result = await getCoinInfo('solana');

      expect(result!.marketData).toBeDefined();
      expect(result!.marketData?.currentPrice).toBeDefined();
      expect(result!.marketData?.marketCap).toBeDefined();
      expect(result!.marketData?.totalVolume).toBeDefined();
    });

    it('should handle coin without optional fields', async () => {
      const minimalCoinInfo: CoinInfo = {
        id: 'minimal-coin',
        symbol: 'min',
        name: 'Minimal Coin',
      };

      mockApiClientGet.mockResolvedValueOnce({ data: minimalCoinInfo });

      const result = await getCoinInfo('minimal-coin');

      expect(result).toEqual(minimalCoinInfo);
      expect(result!.description).toBeUndefined();
      expect(result!.image).toBeUndefined();
      expect(result!.marketData).toBeUndefined();
    });
  });

  // ==========================================================================
  // getContractCoinInfo Tests
  // ==========================================================================

  describe('getContractCoinInfo', () => {
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

    it('should fetch contract coin info', async () => {
      mockApiClientGet.mockResolvedValueOnce({ data: MOCK_COIN_INFO });

      const result = await getContractCoinInfo('solana', USDC_MINT);

      expect(mockApiClientGet).toHaveBeenCalledWith(
        `/v1/coin/solana/contract/${USDC_MINT}`,
        { params: { currency: 'usd' } }
      );
      expect(result).toEqual(MOCK_COIN_INFO);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('marketData');
    });

    it('should return null on 404 (unlisted contract is an expected outcome)', async () => {
      mockApiClientGet.mockRejectedValueOnce(
        new ApiError('No CoinGecko info for contract', 404, 'info_not_found')
      );

      const result = await getContractCoinInfo('solana', USDC_MINT);

      expect(result).toBeNull();
    });

    it('should return null on a route-level 404 with non-JSON body (backend predates the endpoint)', async () => {
      // The apiClient interceptor maps error responses to ApiError even when
      // the body is not JSON ("Cannot GET ..." HTML/text): data fields are
      // undefined, so message falls back to the generic axios message and
      // code is undefined — but the 404 status survives.
      mockApiClientGet.mockRejectedValueOnce(
        new ApiError('Request failed with status code 404', 404)
      );

      const result = await getContractCoinInfo('solana', USDC_MINT);

      expect(result).toBeNull();
    });

    it('should throw on server errors (5xx)', async () => {
      mockApiClientGet.mockRejectedValueOnce(new ApiError('Internal error', 500));

      await expect(getContractCoinInfo('solana', USDC_MINT)).rejects.toThrow('Internal error');
    });

    it('should throw on network errors', async () => {
      mockApiClientGet.mockRejectedValueOnce(new Error('Network Error'));

      await expect(getContractCoinInfo('solana', USDC_MINT)).rejects.toThrow('Network Error');
    });
  });

  // ==========================================================================
  // getTokenCoinInfo Tests (dispatch)
  // ==========================================================================

  describe('getTokenCoinInfo', () => {
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

    it('should use the classic endpoint when coingeckoId is present', async () => {
      mockApiClientGet.mockResolvedValueOnce({ data: MOCK_COIN_INFO });

      const result = await getTokenCoinInfo({ coingeckoId: 'solana', address: USDC_MINT });

      expect(mockApiClientGet).toHaveBeenCalledWith('/v1/coin/solana', {
        params: { currency: 'usd' },
      });
      expect(result).toEqual(MOCK_COIN_INFO);
    });

    it('should fall back to the contract endpoint when coingeckoId is missing', async () => {
      mockApiClientGet.mockResolvedValueOnce({ data: MOCK_COIN_INFO });

      const result = await getTokenCoinInfo({ address: USDC_MINT }, 'eur');

      expect(mockApiClientGet).toHaveBeenCalledWith(
        `/v1/coin/solana/contract/${USDC_MINT}`,
        { params: { currency: 'eur' } }
      );
      expect(result).toEqual(MOCK_COIN_INFO);
    });

    it('should return null without calling the API when neither identifier exists', async () => {
      const result = await getTokenCoinInfo({});

      expect(result).toBeNull();
      expect(mockApiClientGet).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Cache Management Tests
  // ==========================================================================

  // ==========================================================================
  // Integration Tests (with real backend if available)
  // ==========================================================================

  describe('Integration with backend (if available)', () => {
    it(
      'should fetch real market chart from backend',
      async () => {
        if (!backendBaseUrl) {
          console.log('Skipping backend integration test - backend not available');
          return;
        }
        if (!hasExplicitStaticApi) {
          console.log('Skipping price integration test - static API URL is not configured');
          return;
        }

        mockStaticApiClientGet.mockImplementation(async (path) => ({
          data: await fetchBackendJson(path as string),
        }));

        const result = await getMarketChart('solana', 7);

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('prices');
        expect(Array.isArray(result!.prices)).toBe(true);
        expect(result!.prices.length).toBeGreaterThan(0);
      },
      10000
    );

    it(
      'should fetch real contract chart for USDC from backend',
      async () => {
        if (!backendBaseUrl) {
          console.log('Skipping backend integration test - backend not available');
          return;
        }

        const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

        // Proxy the mocked apiClient to the live backend, preserving params.
        mockApiClientGet.mockImplementation(async (path, config) => {
          const params = (config as { params?: Record<string, string | number> } | undefined)?.params ?? {};
          const qs = new URLSearchParams(
            Object.entries(params).map(([k, v]) => [k, String(v)])
          ).toString();
          return { data: await fetchBackendJson(`${path}${qs ? `?${qs}` : ''}`) };
        });

        const result = await getContractMarketChart('solana', USDC_MINT, 7);

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('prices');
        expect(result).toHaveProperty('marketCaps');
        expect(result).toHaveProperty('totalVolumes');
        expect(Array.isArray(result!.prices)).toBe(true);
        expect(result!.prices.length).toBeGreaterThan(0);
        expect(typeof result!.prices[0][0]).toBe('number');
        expect(typeof result!.prices[0][1]).toBe('number');
      },
      10000
    );

    // TODO: add a live integration test for getContractCoinInfo (USDC mint)
    // once the backend ships GET /v1/coin/{platform}/contract/{address} —
    // against the current backend the route 404s by design (deploy-order
    // safety), so a live test would only ever assert null.
  });

  // ==========================================================================
  // Edge Cases and Error Handling
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      mockApiClientGet.mockRejectedValueOnce(timeoutError);

      const result = await getMarketChart('solana');

      expect(result).toBeNull();
    });
  });
});
