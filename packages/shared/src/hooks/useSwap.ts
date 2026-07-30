/**
 * useSwap Hook
 *
 * Shared hook for Solana token swaps using the Salmon API (Jupiter integration).
 * Handles quote fetching, transaction signing, and swap execution.
 *
 * Features:
 * - Get swap quotes with real-time pricing
 * - Execute swaps with automatic transaction signing
 * - Status tracking throughout the swap flow
 * - Quote expiration handling
 * - Error handling with detailed messages
 *
 * @example
 * ```tsx
 * const { getQuote, executeSwap, quote, status, error, reset } = useSwap({
 *   account: activeBlockchainAccount,
 *   networkId: 'solana-mainnet',
 * });
 *
 * // Get a quote
 * const quoteResult = await getQuote({
 *   inputMint: 'So11111111111111111111111111111111111111112',
 *   outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
 *   amount: 1.5,
 *   slippageBps: 50,
 * });
 *
 * // Execute the swap
 * const result = await executeSwap();
 * console.log('Swap txId:', result.txId);
 * ```
 */

import { useState, useCallback, useRef } from 'react';
import type { SolanaAccount } from '../blockchain/solana';
import {
  getSwapQuote as getSwapQuoteService,
  executeSwap as executeSwapService,
  parseQuoteInfo,
} from '../blockchain/solana/swap';
import { getSwapOrder, executeSwapApi } from '../api/services/solana';
import { getTokenList } from '../api/services/tokens';
import { trackEvent, trackFirstTime } from '../analytics';
import { STORAGE_KEYS } from '../storage';
import type {
  SwapQuote,
  SwapQuoteParams,
  SwapResult,
  SwapNetworkId,
  GetSwapQuoteOptions,
  SwapStatus,
  GetQuoteParams,
  ParsedQuoteInfo,
} from '../types/swap';

// ============================================================================
// Types
// ============================================================================

/**
 * Parameters for the useSwap hook
 */
export interface UseSwapParams {
  /** The Solana account instance */
  account: SolanaAccount | undefined;
  /** Network ID for swap operations */
  networkId: SwapNetworkId;
}

/**
 * Return type for the useSwap hook
 */
export interface UseSwapResult {
  /** Get a swap quote */
  getQuote: (params: GetQuoteParams) => Promise<SwapQuote | null>;
  /** Execute the current quote */
  executeSwap: () => Promise<SwapResult>;
  /** Current swap quote (null if no quote) */
  quote: SwapQuote | null;
  /** Parsed quote information for display */
  quoteInfo: ParsedQuoteInfo | null;
  /** Current swap status */
  status: SwapStatus;
  /** Error message if failed */
  error: string | null;
  /** Whether the hook is in an error state */
  isError: boolean;
  /** Transaction ID after successful swap */
  txId: string | null;
  /** Reset the hook state */
  reset: () => void;
  /** Clear just the quote (for refresh) */
  clearQuote: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSwap({
  account,
  networkId,
}: UseSwapParams): UseSwapResult {
  const [status, setStatus] = useState<SwapStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteInfo, setQuoteInfo] = useState<ParsedQuoteInfo | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  // Store last quote params for potential refresh
  const lastQuoteParamsRef = useRef<GetQuoteParams | null>(null);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setQuote(null);
    setQuoteInfo(null);
    setTxId(null);
    lastQuoteParamsRef.current = null;
  }, []);

  /**
   * Clear just the quote (for refresh scenarios)
   */
  const clearQuote = useCallback(() => {
    setQuote(null);
    setQuoteInfo(null);
    setStatus('idle');
    setError(null);
  }, []);

  /**
   * Get a swap quote
   */
  const getQuote = useCallback(
    async (params: GetQuoteParams): Promise<SwapQuote | null> => {
      if (!account) {
        setError('No account available');
        return null;
      }

      setStatus('getting-quote');
      setError(null);
      setQuote(null);
      setQuoteInfo(null);
      lastQuoteParamsRef.current = params;

      try {
        const publicKey = account.getPublicKey().toBase58();

        const quoteParams: SwapQuoteParams = {
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          amount: params.amount,
          publicKey,
          slippageBps: params.slippageBps ?? 50,
          swapMode: params.swapMode,
          dynamicSlippage: params.dynamicSlippage,
          priorityLevel: params.priorityLevel,
        };

        const options: GetSwapQuoteOptions = {};
        if (params.inputDecimals !== undefined) {
          options.inputDecimals = params.inputDecimals;
        }

        const fetchedQuote = await getSwapQuoteService(
          networkId,
          quoteParams,
          options,
          getSwapOrder,
          getTokenList
        );

        setQuote(fetchedQuote);
        setQuoteInfo(parseQuoteInfo(fetchedQuote));
        setStatus('quote-ready');

        return fetchedQuote;
      } catch (err) {
        console.error('[useSwap] Failed to get quote:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to get swap quote';
        setError(errorMessage);
        setStatus('failed');
        return null;
      }
    },
    [account, networkId]
  );

  /**
   * Execute the current swap quote
   */
  const executeSwap = useCallback(async (): Promise<SwapResult> => {
    if (!account) {
      const result: SwapResult = {
        txId: null,
        status: 'fail',
        error: 'No account available',
      };
      setError(result.error!);
      setStatus('failed');
      return result;
    }

    if (!quote) {
      const result: SwapResult = {
        txId: null,
        status: 'fail',
        error: 'No quote available. Get a quote first.',
      };
      setError(result.error!);
      setStatus('failed');
      return result;
    }

    setStatus('executing');
    setError(null);

    try {
      // Execute the swap (signs and submits), confirming on-chain afterwards
      const result = await executeSwapService(
        quote,
        account.signer,
        { rpc: account.getRpc(), rpcSubscriptions: account.getRpcSubscriptions() },
        executeSwapApi
      );

      if (result.status === 'success') {
        setTxId(result.txId);
        setStatus('success');
        // Anonymous funnel event: a swap succeeded. Jupiter swaps are
        // Solana↔Solana. No amounts, addresses or mints — only coarse, allowed props.
        trackEvent('swap_completed', { from_chain: 'solana', to_chain: 'solana', success: true });
        // First successful swap is an activation milestone — reported once per install.
        void trackFirstTime('first_swap_completed', STORAGE_KEYS.ANALYTICS_FIRST_SWAP);
      } else {
        setError(result.error || 'Swap execution failed');
        setStatus('failed');
        // Anonymous funnel event: the swap failed. This makes `success` a real
        // completion-vs-failure rate. Jupiter swaps are Solana↔Solana.
        trackEvent('swap_completed', { from_chain: 'solana', to_chain: 'solana', success: false });
      }

      return result;
    } catch (err) {
      console.error('[useSwap] Swap execution failed:', err);
      // Same failed-swap event for a thrown error (vs a returned fail above).
      trackEvent('swap_completed', { from_chain: 'solana', to_chain: 'solana', success: false });
      const errorMessage = err instanceof Error ? err.message : 'Swap execution failed';
      const result: SwapResult = {
        txId: null,
        status: 'fail',
        error: errorMessage,
      };
      setError(errorMessage);
      setStatus('failed');
      return result;
    }
  }, [account, quote]);

  return {
    getQuote,
    executeSwap,
    quote,
    quoteInfo,
    status,
    error,
    isError: error !== null,
    txId,
    reset,
    clearQuote,
  };
}

