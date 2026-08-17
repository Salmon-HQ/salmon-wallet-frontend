import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExchangeRates } from '../../types/currency';

vi.mock('../client', async () => {
  const actual = await vi.importActual<typeof import('../client')>('../client');

  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
    },
  };
});

import { apiClient } from '../client';
import { clearExchangeRateCache, getExchangeRates } from './exchangeRates';

const mockApiClientGet = vi.mocked(apiClient.get);

const MOCK_RATES: ExchangeRates = {
  base: 'usd',
  timestamp: 1710000000,
  rates: {
    usd: 1,
    eur: 0.92,
    gbp: 0.79,
    jpy: 151.2,
    cny: 7.23,
    krw: 1342,
    inr: 83.1,
    cad: 1.36,
    aud: 1.52,
    brl: 5.03,
    mxn: 16.78,
    chf: 0.9,
    sgd: 1.35,
    hkd: 7.81,
    try: 32.1,
  },
};

const FALLBACK_RATES: ExchangeRates = {
  base: 'usd',
  timestamp: 0,
  rates: { usd: 1 } as ExchangeRates['rates'],
};

describe('exchange rates service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearExchangeRateCache();
  });

  it('fetches exchange rates from the backend endpoint', async () => {
    mockApiClientGet.mockResolvedValueOnce({ data: MOCK_RATES });

    const result = await getExchangeRates();

    expect(mockApiClientGet).toHaveBeenCalledWith('/v1/exchange-rates');
    expect(result).toEqual(MOCK_RATES);
  });

  it('caches exchange rates for subsequent calls', async () => {
    mockApiClientGet.mockResolvedValueOnce({ data: MOCK_RATES });

    const first = await getExchangeRates();
    const second = await getExchangeRates();

    expect(first).toBe(second);
    expect(mockApiClientGet).toHaveBeenCalledTimes(1);
  });

  it('returns fallback rates when the payload is missing rates', async () => {
    mockApiClientGet.mockResolvedValueOnce({
      data: {
        base: 'usd',
        timestamp: 1710000000,
      },
    });

    const result = await getExchangeRates();

    expect(result).toEqual(FALLBACK_RATES);
  });

  it('returns fallback rates when the backend request fails', async () => {
    mockApiClientGet.mockRejectedValueOnce(new Error('backend unavailable'));

    const result = await getExchangeRates();

    expect(result).toEqual(FALLBACK_RATES);
  });

  it('reports an unreachable backend as a warning, not a console error', async () => {
    // An unreachable backend is handled (the caller gets FALLBACK_RATES), so it
    // must not reach console.error — React Native's LogBox turns that into a
    // full-screen red overlay on top of whatever the user is looking at.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockApiClientGet.mockRejectedValueOnce(new Error('backend unavailable'));

    await getExchangeRates();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('forces a fresh fetch after clearing the cache', async () => {
    mockApiClientGet.mockResolvedValueOnce({ data: MOCK_RATES }).mockResolvedValueOnce({
      data: {
        ...MOCK_RATES,
        timestamp: 1710000300,
        rates: {
          ...MOCK_RATES.rates,
          eur: 0.95,
        },
      } satisfies ExchangeRates,
    });

    const first = await getExchangeRates();
    clearExchangeRateCache();
    const second = await getExchangeRates();

    expect(mockApiClientGet).toHaveBeenCalledTimes(2);
    expect(first.timestamp).toBe(1710000000);
    expect(second.timestamp).toBe(1710000300);
    expect(second.rates.eur).toBe(0.95);
  });
});
