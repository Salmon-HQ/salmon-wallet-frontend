/**
 * useBridge Hook
 *
 * Shared hook for cross-chain bridge operations using StealthEX integration.
 * Handles quote fetching, exchange creation, and transaction tracking.
 *
 * Features:
 * - Get bridge estimates and minimum amounts
 * - Create bridge exchanges
 * - Track bridge transaction status
 * - Multi-chain support (Solana, Ethereum, Bitcoin, etc.)
 *
 * @example
 * ```tsx
 * const {
 *   getEstimate,
 *   createExchange,
 *   getTransactionStatus,
 *   estimate,
 *   minAmount,
 *   exchange,
 *   status,
 *   error,
 * } = useBridge();
 *
 * // Get estimate
 * await getEstimate('sol', 'eth', 1.5);
 *
 * // Create exchange
 * const result = await createExchange('sol', 'eth', 1.5, '0x...');
 *
 * // Track status
 * const txStatus = await getTransactionStatus(result.id);
 * ```
 */

import { useState, useCallback } from 'react';
import {
  getBridgeEstimatedAmount,
  getBridgeMinimalAmount,
  getBridgeAvailableTokens,
  createBridgeExchange,
  getBridgeTransaction,
} from '../api/services/bridge';
import type {
  BridgeAvailableToken,
  BridgeExchange,
  BridgeTransaction,
  BridgeOperationStatus,
  BridgeEstimate,
} from '../types/bridge';

// ============================================================================
// Types
// ============================================================================

/**
 * Parameters for the useBridge hook
 */
export interface UseBridgeParams {
  /** Network to load supported tokens for (optional) */
  network?: string;
}

/**
 * Return type for the useBridge hook
 */
export interface UseBridgeResult {
  // Token operations
  /** Get available destination tokens for a source token */
  getAvailableTokens: (symbol: string) => Promise<BridgeAvailableToken[] | null>;

  // Estimate operations
  /** Get bridge estimate and minimum amount */
  getEstimate: (symbolIn: string, symbolOut: string, amount: number, networkIn?: string, networkOut?: string) => Promise<BridgeEstimate | null>;

  // Exchange operations
  /** Create a bridge exchange. Rejects with the provider error on failure. */
  createExchange: (
    symbolIn: string,
    symbolOut: string,
    amount: number,
    addressTo: string,
    networkIn?: string,
    networkOut?: string
  ) => Promise<BridgeExchange | null>;

  // Status tracking
  /** Get the status of a bridge transaction */
  getTransactionStatus: (id: string) => Promise<BridgeTransaction | null>;

  // State
  /** Current available tokens */
  availableTokens: BridgeAvailableToken[] | null;
  /** Current estimate result */
  estimate: BridgeEstimate | null;
  /** Created exchange details */
  exchange: BridgeExchange | null;
  /** Current transaction status */
  transaction: BridgeTransaction | null;
  /** Current operation status */
  status: BridgeOperationStatus;
  /** Error message if failed */
  error: string | null;
  /** Whether the hook is in an error state */
  isError: boolean;
  /** Reset the hook state */
  reset: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse raw bridge API error into a user-friendly message.
 * Strips the "Bridge fetch ... failed: " prefix added by bridge.ts service,
 * and converts common API error patterns into readable text.
 */
/**
 * Maps raw provider text to a translation key. Render sites (and downstream
 * classifiers) resolve the key through t().
 */
function parseBridgeErrorMessage(raw: string): string {
  const stripped = raw.replace(/^Bridge fetch \w[\w\s]* failed:\s*/i, '').trim();

  if (/pair is disabled|pair is unavailable/i.test(stripped)) {
    return 'bridge.errors.pairUnavailable';
  }
  if (/amount.*too small|less than minimal/i.test(stripped)) {
    return 'bridge.errors.belowMinimum';
  }
  if (/amount.*too large/i.test(stripped)) {
    return 'bridge.errors.aboveMaximum';
  }
  if (/network error/i.test(stripped)) {
    return 'bridge.errors.networkError';
  }

  // Anything else is raw provider (StealthEX) text — never show it verbatim.
  return 'bridge.errors.estimateFailed';
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useBridge(_params?: UseBridgeParams): UseBridgeResult {
  const [status, setStatus] = useState<BridgeOperationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Token state
  const [availableTokens, setAvailableTokens] = useState<BridgeAvailableToken[] | null>(null);

  // Estimate state
  const [estimate, setEstimate] = useState<BridgeEstimate | null>(null);

  // Exchange state
  const [exchange, setExchange] = useState<BridgeExchange | null>(null);

  // Transaction state
  const [transaction, setTransaction] = useState<BridgeTransaction | null>(null);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setAvailableTokens(null);
    setEstimate(null);
    setExchange(null);
    setTransaction(null);
  }, []);

  /**
   * Get available destination tokens for a source token
   */
  const getAvailableTokens = useCallback(
    async (symbol: string): Promise<BridgeAvailableToken[] | null> => {
      setStatus('loading-tokens');
      setError(null);

      try {
        const tokens = await getBridgeAvailableTokens(symbol);
        setAvailableTokens(tokens);
        setStatus('idle');
        return tokens;
      } catch (err) {
        console.error('[useBridge] Failed to get available tokens:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load available tokens';
        setError(errorMessage);
        setStatus('failed');
        // Rethrow so callers (useSwapScreenLogic) can classify and surface the
        // failure instead of treating it as an empty token list.
        throw err;
      }
    },
    []
  );

  /**
   * Get bridge estimate and minimum amount.
   * Throws on failure (after setting internal error state) so callers
   * can catch and display the user-friendly message.
   */
  const getEstimate = useCallback(
    async (symbolIn: string, symbolOut: string, amount: number, networkIn?: string, networkOut?: string): Promise<BridgeEstimate | null> => {
      setStatus('getting-estimate');
      setError(null);
      setEstimate(null);

      // Use Promise.allSettled so we recover minAmount even when estimate fails
      const [estimateResult, minResult] = await Promise.allSettled([
        getBridgeEstimatedAmount(symbolIn, symbolOut, amount, networkIn, networkOut),
        getBridgeMinimalAmount(symbolIn, symbolOut, networkIn, networkOut),
      ]);

      const estimatedAmount = estimateResult.status === 'fulfilled' ? estimateResult.value : null;
      const minAmount = minResult.status === 'fulfilled' ? minResult.value : null;

      // If estimate failed, produce a user-readable error and throw
      if (estimatedAmount === null) {
        let errorMessage: string;

        if (minAmount !== null && amount < Number(minAmount)) {
          const formatted = parseFloat(Number(minAmount).toPrecision(4));
          errorMessage = `Minimum bridge amount is ${formatted} ${symbolIn.toUpperCase()}`;
        } else {
          const rawReason = estimateResult.status === 'rejected'
            ? (estimateResult.reason instanceof Error ? estimateResult.reason.message : String(estimateResult.reason))
            : 'Bridge estimate unavailable';
          errorMessage = parseBridgeErrorMessage(rawReason);
        }

        console.warn('[useBridge] Failed to get estimate:', errorMessage);
        setError(errorMessage);
        setStatus('failed');
        throw new Error(errorMessage);
      }

      // Estimate succeeded — if minAmount failed, proceed with 0
      const result: BridgeEstimate = {
        estimatedAmount,
        minAmount: minAmount ?? 0,
        symbolIn,
        symbolOut,
      };

      setEstimate(result);
      setStatus('idle');
      return result;
    },
    []
  );

  /**
   * Create a bridge exchange
   */
  const createExchangeCallback = useCallback(
    async (
      symbolIn: string,
      symbolOut: string,
      amount: number,
      addressTo: string,
      networkIn?: string,
      networkOut?: string
    ): Promise<BridgeExchange | null> => {
      setStatus('creating-exchange');
      setError(null);
      setExchange(null);

      try {
        const result = await createBridgeExchange(symbolIn, symbolOut, amount, addressTo, networkIn, networkOut);

        if (!result) {
          throw new Error('Bridge exchange returned empty data: no exchange details received from server');
        }

        setExchange(result);
        setStatus('exchange-created');
        return result;
      } catch (err) {
        console.error('[useBridge] Failed to create exchange:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to create bridge exchange';
        setError(errorMessage);
        setStatus('failed');
        // Rethrown so the caller can classify the provider message; swallowing
        // it here left the swap screen with a generic failure.
        throw err;
      }
    },
    []
  );

  /**
   * Get the status of a bridge transaction
   */
  const getTransactionStatus = useCallback(
    async (id: string): Promise<BridgeTransaction | null> => {
      setStatus('checking-status');
      setError(null);

      try {
        const tx = await getBridgeTransaction(id);

        if (!tx) {
          throw new Error('Bridge transaction returned empty data: transaction not found or unavailable');
        }

        setTransaction(tx);

        // Backend normalizes upstream StealthEX statuses into a closed set
        // before responding (bridge-aggregator spec, "Status normalization"):
        // 'inProgress' | 'success' | 'fail' | 'refunded' | 'unknown'.
        if (tx.status === 'success') {
          setStatus('success');
        } else if (tx.status === 'fail' || tx.status === 'refunded') {
          setStatus('failed');
          setError(`Bridge transaction ${tx.status}`);
        } else {
          // 'inProgress' or 'unknown' — keep polling.
          setStatus('idle');
        }

        return tx;
      } catch (err) {
        console.error('[useBridge] Failed to get transaction status:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to get transaction status';
        setError(errorMessage);
        setStatus('failed');
        return null;
      }
    },
    []
  );

  return {
    // Token operations
    getAvailableTokens,

    // Estimate operations
    getEstimate,

    // Exchange operations
    createExchange: createExchangeCallback,

    // Status tracking
    getTransactionStatus,

    // State
    availableTokens,
    estimate,
    exchange,
    transaction,
    status,
    error,
    isError: error !== null,
    reset,
  };
}
