/**
 * Solana API Service
 * Handles all backend communication for Solana-specific operations.
 *
 * API Endpoints:
 * - GET /v1/{networkId}/account/{address}/transactions - Get paginated transactions
 * - GET /v1/{networkId}/account/{address}/transactions/{txId} - Get single transaction
 *
 * Note: Token list endpoints (verified, batch, search) are in tokens.ts
 */

import { get, apiClient, ApiError } from '../client';
import { removeDecimals } from '../../utils/decimals';
import type { SolanaNetworkId } from '../../types/blockchain';
import type {
  SolanaTransaction,
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

// ============================================================================
// API Functions - Transactions
// ============================================================================

/**
 * Logs an error the caller is about to receive by throw, unless it is a plain
 * transport failure.
 *
 * A dropped connection is not a fault to report — it is expected, transient,
 * and already the caller's to handle: react-query turns the throw into an error
 * state and the screen renders it. Logging it as well means reporting the same
 * event twice, and on a dev client `console.error` opens a full-screen LogBox
 * over whatever the user was doing, for a request they never asked for. A
 * background refresh of the activity list would take over the screen.
 *
 * Anything that is not a transport failure still gets its breadcrumb: those are
 * the ones nobody expects and somebody will want to trace.
 */
function reportUnexpected(scope: string, error: unknown): void {
  if (error instanceof ApiError && error.isNetworkError()) return;
  console.error(scope, error);
}

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
    if (paging?.includeSpam) {
      params.includeSpam = 'true';
    }

    // Backend returns { data: Transaction[], meta: { nextPageToken?: string, hidden?: number } }
    // meta.hidden is the count of incoming transfers dropped for being made only of
    // unverified fungible tokens, unless `?includeSpam=true` is set.
    interface BackendResponse {
      data: SolanaTransaction[];
      meta?: { nextPageToken?: string; hidden?: number };
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
      hidden: response.meta?.hidden,
    };
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound()) {
      return { transactions: [], oldestSignature: null, hasMore: false };
    }
    reportUnexpected('[SolanaService] Failed to get transactions:', error);
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
  opts = {}
) => {
  const params: Record<string, string> = { include: 'logo' };
  if (opts.includeSpam) {
    params.includeSpam = 'true';
  }

  // The salmon-api Solana balance provider already merges token metadata
  // (logo/name/symbol/coingeckoId/tags), drops zero-amount SPL entries, and
  // drops `unknown`-only tagged tokens unless `?includeSpam=true`.
  const data = await get<SolanaBalanceItem[]>(`/v1/${networkId}/account/${address}/balance`, {
    params,
  });

  return data.map((token) => ({
    ...token,
    // Native SOL inherits the canonical tag set so the FE can keep
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
  // The avatar picker and SolanaReadAccount.getAllNfts want a plain list; the
  // partial flag is only meaningful where it can be shown.
  fetchNfts: async (networkId, publicKey, noCache, opts) =>
    (await getSolanaNfts(networkId, publicKey, noCache ?? false, opts ?? {})).nfts,
};
