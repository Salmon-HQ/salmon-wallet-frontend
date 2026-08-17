/**
 * Exchange Rates Service
 *
 * Fetches fiat exchange rates from the backend for multi-currency display.
 * Implements a 15-minute in-memory cache. On failure, falls back to USD-only
 * so the app degrades gracefully.
 *
 * @module api/services/exchangeRates
 */

import { apiClient } from '../client';
import { SmartCache } from '../../utils/cache';
import type { ExchangeRates } from '../../types/currency';

// ============================================================================
// In-memory cache
// ============================================================================

const rateCache = new SmartCache<ExchangeRates>({ maxSize: 1, ttl: 15 * 60 * 1000 });
const RATE_CACHE_KEY = 'exchange-rates';

// ============================================================================
// Fallback
// ============================================================================

/**
 * Rates returned when the backend is unreachable or answers without rates.
 * Exported so consumers can tell "converted with real rates" from "showing
 * USD numbers under another currency's symbol" and warn the user.
 */
export const FALLBACK_RATES: ExchangeRates = {
  base: 'usd',
  timestamp: 0,
  rates: { usd: 1 } as ExchangeRates['rates'],
};

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Fetch exchange rates from the backend.
 * Returns cached data if still fresh (15 min TTL).
 * On failure, returns fallback with usd=1 only.
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const cached = rateCache.get(RATE_CACHE_KEY);
  if (cached) {
    return cached;
  }

  try {
    const { data } = await apiClient.get<ExchangeRates>('/v1/exchange-rates');

    if (data?.rates) {
      rateCache.set(RATE_CACHE_KEY, data);
      return data;
    }

    return FALLBACK_RATES;
  } catch (error) {
    // Expected, handled degradation — an unreachable backend is a normal
    // condition for a wallet, and the caller gets FALLBACK_RATES. Logged at
    // warn so it stays diagnosable without React Native's LogBox throwing a
    // full-screen error overlay over the app in development.
    console.warn('[ExchangeRatesService] Failed to fetch rates, using fallback:', error);
    return FALLBACK_RATES;
  }
}

/**
 * Clear the exchange rate cache, forcing a fresh fetch on next call.
 */
export function clearExchangeRateCache(): void {
  rateCache.clear();
}
