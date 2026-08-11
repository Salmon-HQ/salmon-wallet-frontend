/**
 * Price Service
 *
 * Cross-platform market chart and coin info endpoints.
 *
 * API endpoints used here:
 * - GET /v1/chart/{coinId} - Market chart data (price history)
 * - GET /v1/coin/{coinId}  - Detailed coin info
 */

import { apiClient } from '../client';
import type {
  MarketChartData,
  CoinInfo,
  } from '../../types/price';

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
