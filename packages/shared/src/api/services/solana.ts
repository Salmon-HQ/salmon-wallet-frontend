/**
 * Solana API Service
 * Handles all backend communication for Solana-specific operations.
 *
 * API Endpoints:
 * - GET /v1/{networkId}/account/{address}/transactions - Get paginated transactions
 * - GET /v1/{networkId}/account/{address}/transactions/{txId} - Get single transaction
 * - GET /v1/{networkId}/ft/swap/order - Get swap quote
 * - POST /v1/{networkId}/ft/swap/execute - Execute swap
 *
 * Note: Token list endpoints (verified, batch, search) are in tokens.ts
 */

import { get, apiClient, ApiError } from '../client';
import { removeDecimals } from '../../utils/decimals';
import type { SolanaNetworkId } from '../../types/blockchain';
import type {
  SolanaTransaction,
  SolanaTransactionType,
  SolanaPagingParams,
  SolanaTransactionsResponse,
} from '../../types/transaction';

// Re-export types for backwards compatibility
export type {
  SolanaTokenTransfer,
  SolanaNativeTransfer,
  SolanaAccountData,
  SolanaInstruction,
  SolanaTransactionStatus,
  SolanaTransactionType,
  SolanaTransaction,
  SolanaPagingParams,
  SolanaTransactionsResponse,
} from '../../types/transaction';

import type {
  SwapOrderResponse,
  SwapOrderParams,
  SwapExecuteRequest,
  ApiSwapExecuteResponse,
} from '../../types/swap';

// ============================================================================
// API Functions - Transactions
// ============================================================================

/**
 * Get paginated transactions for an address
 *
 * Endpoint: GET /v1/{networkId}/account/{address}/transactions
 *
 * @param networkId - Solana network identifier
 * @param address - Solana wallet address
 * @param paging - Optional pagination parameters
 * @returns Paginated transaction response
 */
export async function getSolanaTransactions(
  networkId: SolanaNetworkId,
  address: string,
  paging?: SolanaPagingParams
): Promise<SolanaTransactionsResponse> {
  try {
    const params: Record<string, string | number> = {};

    // Use pageToken/pageSize (new) or before/limit (legacy)
    const pageToken = paging?.pageToken || paging?.before;
    const pageSize = paging?.pageSize || paging?.limit;

    if (pageToken) {
      params.pageToken = pageToken;
    }
    if (pageSize) {
      params.pageSize = pageSize;
    }
    if (paging?.type) {
      params.type = paging.type;
    }

    // Backend returns { data: Transaction[], meta: { nextPageToken?: string } }
    interface BackendResponse {
      data: SolanaTransaction[];
      meta?: { nextPageToken?: string };
    }

    const { data: response } = await apiClient.get<BackendResponse>(
      `/v1/${networkId}/account/${address}/transactions`,
      { params }
    );

    const transactions = response.data || [];
    const nextPageToken = response.meta?.nextPageToken;

    return {
      transactions,
      oldestSignature: nextPageToken || null,
      hasMore: !!nextPageToken,
    };
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound()) {
      return { transactions: [], oldestSignature: null, hasMore: false };
    }
    console.error('[SolanaService] Failed to get transactions:', error);
    throw error;
  }
}

// ============================================================================
// API Functions - Swap
// ============================================================================

/**
 * Get a swap quote/order
 *
 * Endpoint: GET /v1/{networkId}/ft/swap/order
 *
 * This endpoint returns a quote and a serialized transaction ready to be signed.
 * The transaction is valid for a limited time (check expiresAt).
 *
 * @param networkId - Solana network identifier
 * @param params - Swap parameters
 * @returns Swap order with route info and unsigned transaction
 */
export async function getSwapOrder(
  networkId: SolanaNetworkId,
  params: SwapOrderParams
): Promise<SwapOrderResponse | null> {
  try {
    const queryParams: Record<string, string | number | boolean> = {
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      publicKey: params.publicKey,
    };

    if (params.amount !== undefined) {
      queryParams.amount = params.amount;
    }
    if (params.uiAmount !== undefined) {
      queryParams.uiAmount = params.uiAmount;
    }

    if (params.slippageBps !== undefined) {
      queryParams.slippageBps = params.slippageBps;
    }
    if (params.swapMode) {
      queryParams.swapMode = params.swapMode;
    }
    if (params.dynamicSlippage !== undefined) {
      queryParams.dynamicSlippage = params.dynamicSlippage;
    }
    if (params.priorityLevel) {
      queryParams.priorityLevel = params.priorityLevel;
    }

    const { data } = await apiClient.get<SwapOrderResponse>(
      `/v1/${networkId}/ft/swap/order`,
      { params: queryParams }
    );

    return data;
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound()) {
      return null;
    }
    console.error('[SolanaService] Failed to get swap order:', error);
    throw error;
  }
}

/**
 * Execute a signed swap transaction via API
 *
 * Endpoint: POST /v1/{networkId}/ft/swap/execute
 *
 * After signing the transaction from getSwapOrder(), submit it here for execution.
 * The backend handles transaction submission and confirmation.
 *
 * @param networkId - Solana network identifier
 * @param signedTransaction - Base64 encoded signed transaction
 * @param requestId - Request ID from the swap order response
 * @returns Execution result with signature
 */
export async function executeSwapApi(
  networkId: SolanaNetworkId,
  signedTransaction: string,
  requestId: string
): Promise<ApiSwapExecuteResponse> {
  try {
    const { data } = await apiClient.post<ApiSwapExecuteResponse>(
      `/v1/${networkId}/ft/swap/execute`,
      {
        signedTransaction,
        requestId,
      } as SwapExecuteRequest
    );

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('[SolanaService] Failed to execute swap:', error.message);
      return {
        signature: '',
        status: 'Failed',
        error: error.message,
      };
    }
    console.error('[SolanaService] Failed to execute swap:', error);
    throw error;
  }
}

// ============================================================================
// DI adapter (matches BitcoinAccount pattern in bitcoin.ts)
// ============================================================================

import { getSolanaNfts } from './solana-nft';
import { SOL_CONSTANTS } from '../../utils/balance';
import type { SolanaAccountApiFunctions, SolanaBalanceItem } from '../../types/transfer';

export const fetchSolanaAccountBalance: SolanaAccountApiFunctions['fetchBalance'] = async (
  networkId,
  address,
  opts = {},
) => {
  const params: Record<string, string> = { include: 'logo' };
  if (opts.includeSpam) {
    params.includeSpam = 'true';
  }

  // The salmon-api Solana balance provider already merges Jupiter v2 metadata
  // (logo/name/symbol/coingeckoId/tags), drops zero-amount SPL entries, and
  // drops `unknown`-only tagged tokens unless `?includeSpam=true`.
  const data = await get<SolanaBalanceItem[]>(
    `/v1/${networkId}/account/${address}/balance`,
    { params },
  );

  return data.map((token) => ({
    ...token,
    // Native SOL inherits the canonical Jupiter tag set so the FE can keep
    // tag-based UI logic uniform across natives + SPL tokens.
    tags: token.mint ? token.tags : (token.tags ?? [...SOL_CONSTANTS.TAGS]),
    uiAmount: removeDecimals(token.amount, token.decimals),
  }));
};

/**
 * Pre-wired API functions for SolanaAccount dependency injection.
 * Pass this to factory functions so SolanaAccount can call the API
 * without importing this module directly.
 */
export const solanaApiFunctions: SolanaAccountApiFunctions = {
  fetchBalance: fetchSolanaAccountBalance,
  fetchTransactions: getSolanaTransactions,
  fetchNfts: getSolanaNfts,
};
