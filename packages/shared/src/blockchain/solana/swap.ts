/**
 * Solana Swap Service
 * Migrated from salmon-wallet-v2/src/adapter/services/solana/solana-swap-service.js
 *
 * Provides functionality for token swaps on Solana using the Salmon API.
 * This is the blockchain-level service that handles transaction signing and confirmation.
 * API functions are injected via parameters to decouple from api/services/.
 *
 * Features:
 * - Get swap quotes with transaction data
 * - Execute signed swap transactions
 * - Transaction confirmation
 * - Automatic decimal handling
 * - Proper handling of SOL native token address
 */

import {
  getBase64EncodedWireTransaction,
  getTransactionDecoder,
  partiallySignTransaction,
} from '@solana/kit';
import type { KeyPairSigner, Signature } from '@solana/kit';
import { createRecentSignatureConfirmationPromiseFactory } from '@solana/transaction-confirmation';
import type { SolanaRpc, SolanaRpcSubscriptions } from './networks';
import type { SolanaNetworkId, SolanaNetwork } from '../../types/blockchain';
import type { SwapOrderResponse, SwapOrderParams, ApiSwapExecuteResponse } from '../../types/swap';
import type { TokenMetadata } from '../../types/token';
import { applyDecimals } from '../../utils/decimals';
import { SOL_CONSTANTS } from '../../utils/balance';

const SOL_ADDRESS = SOL_CONSTANTS.ADDRESS;

// ============================================================================
// Types (imported from canonical source)
// ============================================================================

import type {
  SwapNetworkId,
  SwapQuote,
  SwapQuoteParams,
  SwapResult,
  GetSwapQuoteOptions,
} from '../../types/swap';

// ============================================================================
// API Function Types
// ============================================================================

export type GetSwapOrderFn = (
  networkId: SolanaNetworkId,
  params: SwapOrderParams
) => Promise<SwapOrderResponse | null>;

export type ExecuteSwapApiFn = (
  networkId: SolanaNetworkId,
  signedTransaction: string,
  requestId: string
) => Promise<ApiSwapExecuteResponse>;

export type GetTokenListFn = (
  networkId: SolanaNetworkId
) => Promise<TokenMetadata[]>;

/**
 * Kit clients used for the optional on-chain confirmation once the API has
 * accepted the swap. Both are needed: kit confirms by WebSocket subscription
 * with an RPC status lookup as the tie-breaker.
 */
export interface SwapRpcClients {
  rpc: SolanaRpc;
  rpcSubscriptions: SolanaRpcSubscriptions;
}

/** How long to wait for the swap signature to reach `confirmed`. */
const SWAP_CONFIRMATION_TIMEOUT_MS = 30_000;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalizes a token address, handling the special case where the user's
 * public key might be passed instead of SOL_ADDRESS for native SOL
 *
 * @param address - Token address or user public key
 * @param userPublicKey - User's public key
 * @returns Normalized token address
 */
function normalizeTokenAddress(address: string, userPublicKey: string): string {
  // If the address matches the user's public key, it's native SOL
  return address === userPublicKey ? SOL_ADDRESS : address;
}

// ============================================================================
// Swap Functions
// ============================================================================

/**
 * Gets a swap quote from the API.
 *
 * Sends the human-readable amount as `uiAmount` and lets salmon-api resolve
 * decimals from its Jupiter v2 catalog (`solana-ft-controller#order`). When
 * the caller already knows the decimals it can pass `options.inputDecimals`
 * to skip the BE lookup and send the raw `amount` directly.
 *
 * @example
 * ```typescript
 * const quote = await getSwapQuote(
 *   { id: 'solana-mainnet', ... },
 *   {
 *     inputMint: 'So11111111111111111111111111111111111111112', // SOL
 *     outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
 *     amount: 1.5, // human-readable
 *     publicKey: 'YourPublicKey...',
 *     slippageBps: 50, // 0.5%
 *   },
 *   {},
 *   fetchSwapOrder,
 * );
 * ```
 */
export async function getSwapQuote(
  network: SolanaNetwork | { id: string } | SwapNetworkId,
  params: SwapQuoteParams,
  options: GetSwapQuoteOptions = {},
  fetchSwapOrder: GetSwapOrderFn,
  // Kept for backwards-compat with apps that still wire a token-list fetcher.
  // The decimal lookup is now BE-side; callers can drop this arg in callers'
  // next refactor.
  _fetchTokenList: GetTokenListFn = () => Promise.resolve([])
): Promise<SwapQuote> {
  const networkId = typeof network === 'string' ? network : network.id as SwapNetworkId;
  const { inputMint, outputMint, amount, publicKey, slippageBps, swapMode, dynamicSlippage, priorityLevel } = params;

  // Normalize addresses (handle case where publicKey is passed instead of SOL_ADDRESS)
  const normalizedInputMint = normalizeTokenAddress(inputMint, publicKey);
  const normalizedOutputMint = normalizeTokenAddress(outputMint, publicKey);

  const apiParams: SwapOrderParams = {
    inputMint: normalizedInputMint,
    outputMint: normalizedOutputMint,
    publicKey,
    slippageBps,
    swapMode,
    dynamicSlippage,
    priorityLevel,
  };

  if (options.inputDecimals !== undefined) {
    // Caller already knows the decimals — send raw to skip the BE lookup.
    apiParams.amount = applyDecimals(amount, options.inputDecimals).toString();
  } else {
    // Let salmon-api resolve decimals from the Jupiter v2 catalog.
    apiParams.uiAmount = String(amount);
  }

  const response = await fetchSwapOrder(networkId, apiParams);

  if (!response) {
    throw new Error('Failed to get swap quote: No route found');
  }

  return {
    ...response,
    networkId,
  };
}

/**
 * Executes a swap using a signed transaction
 *
 * Takes a swap quote, signs the transaction with the provided signer,
 * and submits it to the API for execution. Optionally waits for transaction
 * confirmation on-chain.
 *
 * @param quote - Swap quote from getSwapQuote
 * @param signer - Signer for the transaction
 * @param rpcClients - Optional kit clients for additional on-chain confirmation
 * @returns Swap result with transaction ID and status
 *
 * @example
 * ```typescript
 * const quote = await getSwapQuote(network, params);
 * const result = await executeSwap(quote, signer, undefined, submitSwap);
 *
 * if (result.status === 'success') {
 *   console.log('Swap successful:', result.txId);
 * } else {
 *   console.error('Swap failed:', result.error);
 * }
 * ```
 */
export async function executeSwap(
  quote: SwapQuote,
  signer: KeyPairSigner,
  rpcClients: SwapRpcClients | undefined,
  submitSwap: ExecuteSwapApiFn
): Promise<SwapResult> {
  try {
    // Deserialize the transaction from the quote (Jupiter Ultra v1: custom.transaction)
    const transaction64 = quote.custom?.transaction;
    if (!transaction64) {
      throw new Error('No transaction found in quote');
    }
    const transaction = getTransactionDecoder().decode(
      new Uint8Array(Buffer.from(transaction64, 'base64'))
    );

    // partiallySignTransaction, not signTransaction: Jupiter Ultra transactions
    // can arrive with a partial signature set, and those signatures are preserved.
    const signed = await partiallySignTransaction([signer.keyPair], transaction);
    const signedTransactionBase64 = getBase64EncodedWireTransaction(signed);

    // Submit to the API
    const requestId = quote.custom?.requestId || '';
    const response = await submitSwap(
      quote.networkId,
      signedTransactionBase64,
      requestId
    );

    // Handle API response
    if (response.status === 'Success' && response.signature) {
      // If RPC clients are provided, do additional on-chain confirmation
      if (rpcClients) {
        try {
          await createRecentSignatureConfirmationPromiseFactory(rpcClients)({
            abortSignal: AbortSignal.timeout(SWAP_CONFIRMATION_TIMEOUT_MS),
            commitment: 'confirmed',
            signature: response.signature as Signature,
          });
        } catch (error) {
          // The API already accepted the swap, so a confirmation timeout is not
          // itself a failure. A transaction-level error is.
          const name = error instanceof Error ? error.name : '';
          if (name !== 'AbortError' && name !== 'TimeoutError') {
            return {
              txId: response.signature,
              status: 'fail',
              error: error instanceof Error ? error.message : String(error),
              confirmationStatus: response.confirmationStatus,
            };
          }
        }
      }

      return {
        txId: response.signature,
        status: 'success',
        confirmationStatus: response.confirmationStatus,
      };
    }

    // Handle failure
    return {
      txId: response.signature || null,
      status: 'fail',
      error: response.error || 'Swap execution failed',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during swap execution';
    return {
      txId: null,
      status: 'fail',
      error: errorMessage,
    };
  }
}

/**
 * Gets a swap quote and executes it in one call
 *
 * Convenience function that combines getSwapQuote and executeSwap.
 * Useful for simple swap operations where you don't need to inspect
 * the quote before executing.
 *
 * @param network - Solana network configuration or network ID
 * @param params - Swap quote parameters
 * @param signer - Signer for the transaction
 * @param rpcClients - Optional kit clients for confirmation
 * @returns Swap result with transaction ID and status
 *
 * @example
 * ```typescript
 * const result = await swap(
 *   'solana-mainnet',
 *   {
 *     inputMint: SOL_ADDRESS,
 *     outputMint: 'USDC_MINT_ADDRESS',
 *     amount: 1.0,
 *     publicKey: signer.address,
 *   },
 *   signer,
 *   { rpc, rpcSubscriptions },
 *   fetchSwapOrder,
 *   submitSwap,
 * );
 * ```
 */
export async function swap(
  network: SolanaNetwork | { id: string } | SwapNetworkId,
  params: SwapQuoteParams,
  signer: KeyPairSigner,
  rpcClients: SwapRpcClients | undefined,
  fetchSwapOrder: GetSwapOrderFn,
  submitSwap: ExecuteSwapApiFn,
  fetchTokenList: GetTokenListFn = () => Promise.resolve([])
): Promise<SwapResult> {
  const quote = await getSwapQuote(network, params, {}, fetchSwapOrder, fetchTokenList);
  return executeSwap(quote, signer, rpcClients, submitSwap);
}

/**
 * Calculates the expected output amount from a swap quote
 *
 * @param quote - Swap quote
 * @param outputDecimals - Decimals for the output token (optional, uses quote info if available)
 * @returns Human-readable output amount
 */
export function getExpectedOutput(quote: SwapQuote, outputDecimals?: number): number {
  const decimals = outputDecimals ?? quote.output?.decimals ?? 9;
  const amount = quote.output?.amount || '0';
  return Number(amount) / (10 ** decimals);
}

/**
 * Calculates the minimum output amount (accounting for slippage) from a swap quote
 *
 * @param quote - Swap quote
 * @param outputDecimals - Decimals for the output token (optional, uses quote info if available)
 * @returns Human-readable minimum output amount
 */
export function getMinimumOutput(quote: SwapQuote, outputDecimals?: number): number {
  const decimals = outputDecimals ?? quote.output?.decimals ?? 9;
  const threshold = quote.custom?.otherAmountThreshold || '0';
  return Number(threshold) / (10 ** decimals);
}

/**
 * Gets the price impact percentage from a swap quote
 *
 * @param quote - Swap quote
 * @returns Price impact as a percentage (e.g., 0.12 for 0.12%)
 */
export function getPriceImpact(quote: SwapQuote): number {
  return quote.custom?.priceImpact || 0;
}

/**
 * Parse quote into UI-friendly format.
 * Updated for Jupiter Ultra v1 API structure.
 */
export function parseQuoteInfo(quote: SwapQuote): import('../../types/swap').ParsedQuoteInfo {
  const outputDecimals = quote.output?.decimals ?? 9;

  return {
    expectedOutput: getExpectedOutput(quote, outputDecimals),
    minimumOutput: getMinimumOutput(quote, outputDecimals),
    priceImpact: getPriceImpact(quote),
    inputToken: quote.input ? {
      symbol: quote.input.symbol,
      name: quote.input.name || '',
      decimals: quote.input.decimals,
      logo: quote.input.logo || undefined,
    } : undefined,
    outputToken: quote.output ? {
      symbol: quote.output.symbol,
      name: quote.output.name || '',
      decimals: quote.output.decimals,
      logo: quote.output.logo || undefined,
    } : undefined,
    route: {
      slippageBps: quote.custom?.slippageBps || 50,
      swapMode: (quote.custom?.swapMode || 'ExactIn') as 'ExactIn' | 'ExactOut',
      routeLabels: quote.routeNames || [],
    },
  };
}

// Re-export SOL_ADDRESS for convenience
export { SOL_ADDRESS };
