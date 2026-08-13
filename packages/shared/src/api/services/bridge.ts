/**
 * Bridge Service
 * Migrated from salmon-wallet-v2/src/adapter/services/bridge-service.js
 *
 * Provides cross-chain bridge functionality for token swaps between networks.
 *
 * API Endpoints:
 * - GET /v1/bridge/available - Get available tokens to bridge to from a given symbol
 * - GET /v1/bridge/estimate - Get estimated output amount for a bridge swap
 * - GET /v1/bridge/minimal - Get minimum amount required for a bridge swap
 * - POST /v1/bridge/exchange - Create a new bridge exchange transaction
 * - GET /v1/bridge/transaction - Get the status of a bridge transaction
 */

import { apiClient } from '../client';
import type {
  BridgeAvailableToken,
  BridgeAmountRange,
  BridgeEstimateResponse,
  BridgeMinimalResponse,
  BridgeExchange,
  BridgeTransaction,
} from '../../types/bridge';

/** Coerce a wire decimal string to a finite number, or null when absent/unparsable. */
function toFiniteNumber(value: string | number | undefined | null): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// ============================================================================
// Bridge Service Functions
// ============================================================================

/**
 * Get available tokens that can be received when bridging from a specific token
 *
 * Endpoint: GET /v1/bridge/available
 *
 * @param symbol - Source token symbol (e.g., 'SOL', 'BTC')
 * @returns Array of available tokens to bridge to or null if unavailable
 */
export async function getBridgeAvailableTokens(
  symbol: string
): Promise<BridgeAvailableToken[] | null> {
  try {
    const { data } = await apiClient.get<BridgeAvailableToken[]>('/v1/bridge/available', {
      params: { symbol: symbol.toLowerCase() },
    });
    return data ?? null;
  } catch (error) {
    console.error('[BridgeService] Failed to fetch available tokens:', error);
    throw new Error(
      `Bridge fetch available tokens failed: ${error instanceof Error ? error.message : error}`
    );
  }
}

/**
 * Get estimated output amount for a bridge swap
 *
 * Endpoint: GET /v1/bridge/estimate
 *
 * @param symbolIn - Input token symbol
 * @param symbolOut - Output token symbol
 * @param amount - Input amount to swap
 * @returns Estimated output amount or null if unavailable
 */
export async function getBridgeEstimatedAmount(
  symbolIn: string,
  symbolOut: string,
  amount: number,
  networkIn?: string,
  networkOut?: string
): Promise<number | null> {
  try {
    const params: Record<string, string | number> = {
      symbolIn: symbolIn.toLowerCase(),
      symbolOut: symbolOut.toLowerCase(),
      amount,
    };
    if (networkIn) params.networkIn = networkIn;
    if (networkOut) params.networkOut = networkOut;
    const { data } = await apiClient.get<BridgeEstimateResponse>('/v1/bridge/estimate', {
      params,
    });
    return data?.estimated_amount ?? null;
  } catch (error) {
    console.warn('[BridgeService] Failed to fetch estimated amount:', error);
    throw new Error(
      `Bridge fetch estimated amount failed: ${error instanceof Error ? error.message : error}`
    );
  }
}

/**
 * Get the allowed input amount range for a bridge swap
 *
 * Endpoint: GET /v1/bridge/minimal
 *
 * The backend returns both amounts as decimal strings and omits `max_amount`
 * when the pair has no upstream cap; this boundary coerces them to numbers
 * (see {@link BridgeMinimalResponse}).
 *
 * @param symbolIn - Input token symbol
 * @param symbolOut - Output token symbol
 * @returns `{min, max}` — each null when absent or unparsable
 */
export async function getBridgeMinimalAmount(
  symbolIn: string,
  symbolOut: string,
  networkIn?: string,
  networkOut?: string
): Promise<BridgeAmountRange> {
  try {
    const params: Record<string, string> = {
      symbolIn: symbolIn.toLowerCase(),
      symbolOut: symbolOut.toLowerCase(),
    };
    if (networkIn) params.networkIn = networkIn;
    if (networkOut) params.networkOut = networkOut;
    const { data } = await apiClient.get<BridgeMinimalResponse>('/v1/bridge/minimal', {
      params,
    });
    return {
      min: toFiniteNumber(data?.min_amount),
      max: toFiniteNumber(data?.max_amount),
    };
  } catch (error) {
    console.warn('[BridgeService] Failed to fetch minimal amount:', error);
    throw new Error(
      `Bridge fetch minimal amount failed: ${error instanceof Error ? error.message : error}`
    );
  }
}

/**
 * Create a new bridge exchange transaction
 *
 * Endpoint: POST /v1/bridge/exchange
 *
 * POST, not GET: creation is a side effect and the shared client retries
 * failed GETs, so a lost response could create a second upstream order.
 * The backend still serves the legacy GET route for already-shipped builds.
 *
 * @param symbolIn - Input token symbol
 * @param symbolOut - Output token symbol
 * @param amount - Amount to exchange
 * @param addressTo - Destination address to receive the output tokens
 * @param refundAddress - The wallet's own address on the `symbolIn` chain.
 *   Optional; forwarded to StealthEX as `refund_address` so a failed
 *   exchange refunds to the user instead of falling back to StealthEX policy.
 * @returns Bridge exchange details or null if creation failed
 */
export async function createBridgeExchange(
  symbolIn: string,
  symbolOut: string,
  amount: number,
  addressTo: string,
  networkIn?: string,
  networkOut?: string,
  refundAddress?: string
): Promise<BridgeExchange | null> {
  try {
    const body: Record<string, string | number> = {
      symbolIn: symbolIn.toLowerCase(),
      symbolOut: symbolOut.toLowerCase(),
      amount,
      addressTo,
    };
    if (networkIn) body.networkIn = networkIn;
    if (networkOut) body.networkOut = networkOut;
    if (refundAddress) body.refundAddress = refundAddress;
    const { data } = await apiClient.post<BridgeExchange>('/v1/bridge/exchange', body);
    return data ?? null;
  } catch (error) {
    console.error('[BridgeService] Failed to create bridge exchange:', error);
    throw new Error(
      `Bridge create exchange failed: ${error instanceof Error ? error.message : error}`
    );
  }
}

/**
 * Get the status of a bridge transaction
 *
 * Endpoint: GET /v1/bridge/transaction
 *
 * @param id - Bridge transaction ID
 * @returns Bridge transaction details or null if not found
 */
export async function getBridgeTransaction(id: string): Promise<BridgeTransaction | null> {
  try {
    const { data } = await apiClient.get<BridgeTransaction>('/v1/bridge/transaction', {
      params: { id },
    });
    return data ?? null;
  } catch (error) {
    console.error('[BridgeService] Failed to fetch bridge transaction:', error);
    throw new Error(
      `Bridge fetch transaction failed: ${error instanceof Error ? error.message : error}`
    );
  }
}
