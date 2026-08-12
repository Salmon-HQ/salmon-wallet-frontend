/**
 * Bitcoin API Service
 * Handles all backend communication for Bitcoin operations.
 *
 * API Endpoints:
 * - GET /v1/{networkId}/account/{address}/balance?include=logo - Get balance with logo
 * - GET /v1/{networkId}/account/{address}/utxo - Get UTXOs
 * - GET /v1/{networkId}/account/{address}/transactions - Get paginated transactions
 * - POST /v1/{networkId}/account/{address}/transactions - Broadcast transaction
 */

import type {
  AccountTransaction,
  AccountTransactionListResponse,
  BitcoinAccountApiFunctions,
  BitcoinBalanceItem,
  BroadcastTransactionFn,
  FetchBitcoinBalanceFn,
  FetchBitcoinRecentTransactionsFn,
  FetchUtxosFn,
  TransactionPaging,
  UTXO,
} from '../../types/transfer';
import { removeDecimals } from '../../utils/decimals';
import { apiClient, get } from '../client';

// ============================================================================
// DI Adapter Functions (for blockchain/bitcoin/transfer module)
// ============================================================================

export const fetchUtxos: FetchUtxosFn = async (networkId, address) => {
  const { data } = await apiClient.get<{ data: UTXO[]; nextPageToken?: string }>(
    `/v1/${networkId}/account/${address}/utxo`,
    { params: { pageSize: 100 } }
  );
  return data.data;
};

export const broadcastTransaction: BroadcastTransactionFn = async (
  networkId,
  address,
  serializedTx
) => {
  const { data } = await apiClient.post<{ txId?: string; success?: boolean }>(
    `/v1/${networkId}/account/${address}/transactions`,
    { tx: serializedTx }
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
  address: string
): Promise<BitcoinBalanceItem[]> => {
  // The salmon-api balance resource already sets `coingeckoId: 'bitcoin'`
  // for the native BTC item via `NATIVE_COINGECKO_ID`, so the FE only needs
  // to fill in `uiAmount` (derived from `amount`/`decimals`).
  const data = await get<BitcoinBalanceItem[]>(`/v1/${networkId}/account/${address}/balance`, {
    params: { include: 'logo' },
  });

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
    { params }
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
