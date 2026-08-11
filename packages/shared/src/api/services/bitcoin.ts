/**
 * Bitcoin API Service
 * Handles all backend communication for Bitcoin operations.
 *
 * API Endpoints:
 * - GET /v1/{networkId}/account/{address}/balance?include=logo - Get balance with logo
 * - GET /v1/{networkId}/account/{address}/utxo - Get UTXOs
 * - GET /v1/{networkId}/account/{address}/transactions - Get paginated transactions
 * - GET /v1/{networkId}/account/{address}/transactions/{txId} - Get single transaction
 * - POST /v1/{networkId}/account/{address}/transactions - Broadcast transaction
 */

import type { BitcoinNetworkId } from '../../types/blockchain';
import type {
  AccountTransaction,
  AccountTransactionListResponse,
  BitcoinAccountApiFunctions,
  BitcoinBalance,
  BitcoinBalanceItem,
  BitcoinPagingParams,
  BitcoinTransactionsResponse,
  BitcoinUtxo,
  BroadcastTransactionFn,
  BroadcastTransactionRequest,
  BroadcastTransactionResponse,
  FetchBitcoinBalanceFn,
  FetchBitcoinRecentTransactionsFn,
  FetchUtxosFn,
  TransactionPaging,
  UTXO,
} from '../../types/transfer';
import { removeDecimals } from '../../utils/decimals';
import { apiClient, ApiError, get } from '../client';

// Re-export types for backwards compatibility
export type {
  BitcoinBalance, BitcoinPagingParams, BitcoinTransaction, BitcoinTransactionInput,
  BitcoinTransactionOutput, BitcoinTransactionsResponse, BitcoinUtxo, BroadcastTransactionRequest,
  BroadcastTransactionResponse
} from '../../types/transfer';

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get Bitcoin balance for an address
 *
 * Endpoint: GET /v1/{networkId}/account/{address}/balance?include=logo
 *
 * Backend note:
 * - The documented type here is BitcoinBalance
 * - The live backend may also return BitcoinBalanceItem[] for the native BTC asset
 * - This service normalizes both shapes into a BitcoinBalance result
 *
 * @param networkId - Bitcoin network identifier
 * @param address - Bitcoin address
 * @returns Balance data with logo, or null if not found
 */
export async function getBitcoinBalance(
  networkId: BitcoinNetworkId,
  address: string
): Promise<BitcoinBalance | null> {
  try {
    const { data } = await apiClient.get<BitcoinBalance | BitcoinBalanceItem[]>(
      `/v1/${networkId}/account/${address}/balance`,
      {
        params: { include: 'logo' },
      }
    );

    if (Array.isArray(data)) {
      const nativeBalance = data[0];
      if (!nativeBalance) {
        return {
          confirmed: 0,
          unconfirmed: 0,
          total: 0,
          logo: null,
        };
      }

      const total = Number(nativeBalance.amount || 0);

      return {
        confirmed: total,
        unconfirmed: 0,
        total,
        logo: nativeBalance.logo || null,
      };
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound()) {
      return null;
    }
    console.error('[BitcoinService] Failed to get balance:', error);
    throw error;
  }
}

/**
 * Get UTXOs (Unspent Transaction Outputs) for an address
 *
 * Endpoint: GET /v1/{networkId}/account/{address}/utxo
 *
 * @param networkId - Bitcoin network identifier
 * @param address - Bitcoin address
 * @returns Array of UTXOs, or empty array if not found
 */
export async function getBitcoinUtxos(
  networkId: BitcoinNetworkId,
  address: string
): Promise<BitcoinUtxo[]> {
  try {
    const { data } = await apiClient.get<BitcoinUtxo[]>(
      `/v1/${networkId}/account/${address}/utxo`
    );
    return data || [];
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound()) {
      return [];
    }
    console.error('[BitcoinService] Failed to get UTXOs:', error);
    throw error;
  }
}

/**
 * Get paginated transactions for an address
 *
 * Endpoint: GET /v1/{networkId}/account/{address}/transactions
 *
 * @param networkId - Bitcoin network identifier
 * @param address - Bitcoin address
 * @param paging - Optional pagination parameters
 * @returns Paginated transaction response
 */
export async function getBitcoinTransactions(
  networkId: BitcoinNetworkId,
  address: string,
  paging?: BitcoinPagingParams
): Promise<BitcoinTransactionsResponse> {
  try {
    const params: Record<string, string | number> = {};

    if (paging?.pageToken) {
      params.pageToken = paging.pageToken;
    }
    if (paging?.pageSize) {
      params.pageSize = paging.pageSize;
    }

    const { data } = await apiClient.get<BitcoinTransactionsResponse>(
      `/v1/${networkId}/account/${address}/transactions`,
      { params }
    );

    return {
      transactions: data.transactions || [],
      nextPageToken: data.nextPageToken,
      total: data.total,
    };
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound()) {
      return { transactions: [], nextPageToken: null };
    }
    console.error('[BitcoinService] Failed to get transactions:', error);
    throw error;
  }
}

/**
 * Broadcast a signed Bitcoin transaction
 *
 * Endpoint: POST /v1/{networkId}/account/{address}/transactions
 *
 * @param networkId - Bitcoin network identifier
 * @param address - Bitcoin address (sender)
 * @param signedTx - Signed transaction hex
 * @returns Broadcast result with transaction ID
 */
export async function broadcastBitcoinTransaction(
  networkId: BitcoinNetworkId,
  address: string,
  signedTx: string
): Promise<BroadcastTransactionResponse> {
  try {
    const { data } = await apiClient.post<BroadcastTransactionResponse>(
      `/v1/${networkId}/account/${address}/transactions`,
      { tx: signedTx } as BroadcastTransactionRequest
    );
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('[BitcoinService] Failed to broadcast transaction:', error.message);
      return {
        txid: '',
        success: false,
        error: error.message,
      };
    }
    console.error('[BitcoinService] Failed to broadcast transaction:', error);
    throw error;
  }
}

// ============================================================================
// DI Adapter Functions (for blockchain/bitcoin/transfer module)
// ============================================================================

export const fetchUtxos: FetchUtxosFn = async (networkId, address) => {
  const { data } = await apiClient.get<{ data: UTXO[]; nextPageToken?: string }>(
    `/v1/${networkId}/account/${address}/utxo`,
    { params: { pageSize: 100 } },
  );
  return data.data;
};

export const broadcastTransaction: BroadcastTransactionFn = async (networkId, address, serializedTx) => {
  const { data } = await apiClient.post<{ txId?: string; success?: boolean }>(
    `/v1/${networkId}/account/${address}/transactions`,
    { tx: serializedTx },
  );
  return {
    txId: data.txId,
    success: true,
  };
};

// ============================================================================
// DI Adapter Functions (for BitcoinAccount creation)
// ============================================================================

export const fetchBitcoinAccountBalance: FetchBitcoinBalanceFn = async (
  networkId: string,
  address: string,
): Promise<BitcoinBalanceItem[]> => {
  // The salmon-api balance resource already sets `coingeckoId: 'bitcoin'`
  // for the native BTC item via `NATIVE_COINGECKO_ID`, so the FE only needs
  // to fill in `uiAmount` (derived from `amount`/`decimals`).
  const data = await get<BitcoinBalanceItem[]>(
    `/v1/${networkId}/account/${address}/balance`,
    { params: { include: 'logo' } },
  );

  return data.map((token) => ({
    ...token,
    uiAmount: removeDecimals(token.amount, token.decimals),
  }));
};

export const fetchBitcoinAccountRecentTransactions: FetchBitcoinRecentTransactionsFn = async (
  networkId: string,
  address: string,
  paging?: TransactionPaging
): Promise<AccountTransactionListResponse> => {
  const { nextPageToken, pageSize } = paging || {};

  const params: Record<string, string | number> = {};
  if (nextPageToken) {
    params.pageToken = nextPageToken;
  }
  if (pageSize) {
    params.pageSize = pageSize;
  }

  const raw = await get<{ data: AccountTransaction[]; meta: { nextPageToken?: string } }>(
    `/v1/${networkId}/account/${address}/transactions`,
    { params },
  );

  return {
    items: raw.data ?? [],
    nextPageToken: raw.meta?.nextPageToken ?? undefined,
  };
};

/**
 * Pre-wired Bitcoin API functions for account creation.
 * Centralizes the dependency injection wiring so callers don't repeat it.
 */
export const bitcoinApiFunctions: BitcoinAccountApiFunctions = {
  fetchBalance: fetchBitcoinAccountBalance,
  fetchRecentTransactions: fetchBitcoinAccountRecentTransactions,
  fetchUtxos,
  broadcastTransaction,
};
