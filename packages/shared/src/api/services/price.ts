/**
 * Price Service
 *
 * Cross-platform market chart and coin info endpoints.
 *
 * API endpoints used here:
 * - GET /v1/chart/{coinId} - Market chart data (price history)
 * - GET /v1/chart/{platform}/contract/{address} - Market chart by contract address (mint)
 * - GET /v1/coin/{coinId}  - Detailed coin info
 * - GET /v1/coin/{platform}/contract/{address} - Coin info by contract address (mint)
 */

import { apiClient, ApiError } from '../client';
import type { MarketChartData, CoinInfo } from '../../types/price';

// ============================================================================
// Resolved coin-id cache
// ============================================================================

/**
 * mint -> resolved CoinGecko coin id, learned from contract coin-info
 * responses (they always include the resolved `id`). Once a mint is
 * resolved, both dispatchers route subsequent calls through the classic
 * coin-id endpoints.
 *
 * ponytail: module-local Map, session-lifetime only — the mapping is
 * immutable, so no TTL/storage layer; persist it if cold-start lookups
 * ever matter.
 */
const resolvedCoinIds = new Map<string, string>();

/** Test hook: reset the mint -> coin id cache. */
export function clearResolvedCoinIdCache(): void {
  resolvedCoinIds.clear();
}

// ============================================================================
// Price Service Functions
// ============================================================================

/**
 * Get market chart data for a coin (price history)
 *
 * Endpoint: GET /v1/chart/{coinId}
 *
 * @param coinId - CoinGecko coin ID (e.g., 'bitcoin', 'solana')
 * @param days - Number of days (1, 7, 30, 90, 365)
 * @param currency - Currency for prices (default: 'usd')
 * @returns Chart data with prices, marketCaps, totalVolumes or null
 */
export async function getMarketChart(
  coinId: string,
  days: 1 | 7 | 30 | 90 | 365 = 7,
  currency: string = 'usd'
): Promise<MarketChartData | null> {
  try {
    const { data } = await apiClient.get<MarketChartData>(`/v1/chart/${coinId}`, {
      params: { days, currency },
    });
    return data;
  } catch (error) {
    console.error(`[PriceService] Failed to fetch chart for ${coinId}:`, error);
    return null;
  }
}

/**
 * Get market chart data for a token by contract address (mint)
 *
 * Endpoint: GET /v1/chart/{platform}/contract/{address}
 *
 * Fallback for SPL tokens whose metadata has no CoinGecko coin ID.
 * A 404 (`chart_not_found`) is an expected outcome for long-tail tokens
 * not listed on CoinGecko — it means "no chart", not a failure — so it
 * resolves to null. Real failures (5xx, network) are logged and rethrown
 * so callers can surface an error state.
 *
 * @param platform - CoinGecko asset platform (e.g., 'solana')
 * @param address - Token contract address (mint)
 * @param days - Number of days (1, 7, 30, 90, 365)
 * @param currency - Currency for prices (default: 'usd')
 * @returns Chart data, or null when the contract has no chart (404)
 */
export async function getContractMarketChart(
  platform: string,
  address: string,
  days: 1 | 7 | 30 | 90 | 365 = 7,
  currency: string = 'usd'
): Promise<MarketChartData | null> {
  try {
    const { data } = await apiClient.get<MarketChartData>(
      `/v1/chart/${platform}/contract/${address}`,
      { params: { days, currency } }
    );
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound()) {
      return null;
    }
    console.error(
      `[PriceService] Failed to fetch contract chart for ${platform}:${address}:`,
      error
    );
    throw error;
  }
}

/**
 * Get market chart data for a token, resolving the best endpoint.
 *
 * Single dispatch point shared by all apps: tokens with a CoinGecko coin ID
 * use the classic chart endpoint; tokens without one fall back to the
 * contract-address endpoint using their mint. Tokens with neither resolve
 * to null (no chart).
 *
 * Error semantics follow the underlying call: the classic path resolves to
 * null on any failure (unchanged behavior); the contract path resolves to
 * null only on 404 and throws on real failures.
 */
export async function getTokenMarketChart(
  token: { coingeckoId?: string; address?: string },
  days: 1 | 7 | 30 | 90 | 365 = 7,
  currency: string = 'usd'
): Promise<MarketChartData | null> {
  const coinId = token.coingeckoId ?? (token.address && resolvedCoinIds.get(token.address));
  if (coinId) {
    return getMarketChart(coinId, days, currency);
  }
  if (token.address) {
    // ponytail: platform hardcoded to 'solana' — only SPL tokens lack a
    // coingeckoId today; parametrize when another chain needs the fallback.
    return getContractMarketChart('solana', token.address, days, currency);
  }
  return null;
}

/**
 * Get coin info for a token by contract address (mint)
 *
 * Endpoint: GET /v1/coin/{platform}/contract/{address}
 *
 * Fallback for SPL tokens whose metadata has no CoinGecko coin ID. Same
 * semantics as getContractMarketChart: 404 resolves to null (unlisted
 * long-tail token — hide the info sections, not an error), real failures
 * (5xx, network) are logged and rethrown.
 *
 * Deploy-order safety: against a backend that predates this endpoint the
 * route itself 404s ("Cannot GET ..."). The apiClient interceptor maps any
 * error response — JSON or not — to an ApiError carrying the HTTP status
 * (non-JSON bodies just fall back to the generic axios message), so that
 * case also lands in the isNotFound() branch and resolves to null cleanly.
 *
 * @param platform - CoinGecko asset platform (e.g., 'solana')
 * @param address - Token contract address (mint)
 * @param currency - Currency for prices (default: 'usd')
 * @returns Coin info (with the resolved CoinGecko id), or null on 404
 */
export async function getContractCoinInfo(
  platform: string,
  address: string,
  currency: string = 'usd'
): Promise<CoinInfo | null> {
  try {
    const { data } = await apiClient.get<CoinInfo>(`/v1/coin/${platform}/contract/${address}`, {
      params: { currency },
    });
    if (data?.id) {
      resolvedCoinIds.set(address, data.id);
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound()) {
      return null;
    }
    console.error(
      `[PriceService] Failed to fetch contract coin info for ${platform}:${address}:`,
      error
    );
    throw error;
  }
}

/**
 * Get coin info for a token, resolving the best endpoint.
 *
 * Mirror of getTokenMarketChart: tokens with a CoinGecko coin ID use the
 * classic endpoint (natives unchanged); tokens without one fall back to the
 * contract-address endpoint using their mint; neither resolves to null.
 *
 * Error semantics follow the underlying call: the classic path resolves to
 * null on any failure (unchanged behavior); the contract path resolves to
 * null only on 404 and throws on real failures.
 */
export async function getTokenCoinInfo(
  token: { coingeckoId?: string; address?: string },
  currency: string = 'usd'
): Promise<CoinInfo | null> {
  const coinId = token.coingeckoId ?? (token.address && resolvedCoinIds.get(token.address));
  if (coinId) {
    return getCoinInfo(coinId, currency);
  }
  if (token.address) {
    // ponytail: platform hardcoded to 'solana', same ceiling as getTokenMarketChart.
    return getContractCoinInfo('solana', token.address, currency);
  }
  return null;
}

/**
 * Get coin info (price, market cap, supply, description)
 *
 * Endpoint: GET /v1/coin/{coinId}
 *
 * @param coinId - CoinGecko coin ID (e.g., 'bitcoin', 'solana')
 * @param currency - Currency for prices (default: 'usd')
 * @returns Coin info with marketData or null
 */
export async function getCoinInfo(
  coinId: string,
  currency: string = 'usd'
): Promise<CoinInfo | null> {
  try {
    const { data } = await apiClient.get<CoinInfo>(`/v1/coin/${coinId}`, {
      params: { currency },
    });
    return data;
  } catch (error) {
    console.error(`[PriceService] Failed to fetch coin info for ${coinId}:`, error);
    return null;
  }
}
