/**
 * Bitcoin API Service
 * Handles all backend communication for Bitcoin operations.
 *
 * API Endpoints:
 * - GET /v1/{networkId}/account/{address}/balance?include=logo - Get balance with logo
 * - GET /v1/{networkId}/account/{address}/utxo - Get UTXOs
 * - GET /v1/{networkId}/account/{address}/transactions - Get paginated transactions
 *
 * Broadcasting is deliberately NOT a backend endpoint: a signed transaction
 * never reaches our servers. See `broadcastTransaction` below.
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
import { getBitcoinBroadcastRelays } from '../../config/bitcoin-relays';
import { removeDecimals } from '../../utils/decimals';
import { ApiError, apiClient, get } from '../client';

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

/**
 * How long we wait on a relay before treating it as unreachable.
 */
const BROADCAST_TIMEOUT_MS = 20_000;

/**
 * A relay answers a successful broadcast with the bare txid.
 */
const TXID_PATTERN = /^[0-9a-f]{64}$/i;

/**
 * Error code for a broadcast whose outcome we could not establish: the
 * transaction may well be relayed and confirming. Never report it as a
 * failure — the user could resend funds that are already on their way.
 */
export const BROADCAST_OUTCOME_UNKNOWN = 'BROADCAST_OUTCOME_UNKNOWN';

/** i18n key the send flow renders for an unknown outcome. */
const OUTCOME_UNKNOWN_MESSAGE = 'transaction.errors.broadcastUnknown';

const outcomeUnknown = () => new ApiError(OUTCOME_UNKNOWN_MESSAGE, 0, BROADCAST_OUTCOME_UNKNOWN);

/**
 * POSTs the raw hex to one relay.
 *
 * Resolves with the txid on success, `null` when the relay could not be
 * reached or answered 5xx (retryable elsewhere, outcome unknown here), and
 * throws when the relay definitively rejected the transaction (4xx).
 */
async function postToRelay(url: string, serializedTx: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BROADCAST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: serializedTx,
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }

  const body = (await response.text().catch(() => '')).trim();

  // A 4xx is the relay having read the transaction and refused it — invalid
  // input, fee too low, already spent. That is a real, final rejection and its
  // own wording is the most useful thing we can show.
  if (response.status >= 400 && response.status < 500) {
    throw new ApiError(body || `Broadcast rejected (${response.status})`, response.status);
  }

  if (!response.ok) return null;

  // A 2xx whose body is not a txid means the relay may or may not have taken
  // the transaction. Unknown, not failed.
  return TXID_PATTERN.test(body) ? body : null;
}

/**
 * Broadcasts an already-signed Bitcoin transaction straight from the client to
 * a public relay.
 *
 * The signed transaction never touches the Salmon backend, and nothing but the
 * raw hex leaves the device — no address, no auth, no analytics.
 *
 * Outcomes:
 * - accepted: the relay returned a txid;
 * - rejected: a relay answered 4xx — thrown as an `ApiError` carrying the
 *   relay's own message;
 * - unknown: neither relay could be reached (or answered 5xx / a body we
 *   cannot read as a txid) — thrown as an `ApiError` with code
 *   `BROADCAST_OUTCOME_UNKNOWN`, because the transaction may already be
 *   relayed.
 */
export const broadcastTransaction: BroadcastTransactionFn = async (
  networkId,
  _address,
  serializedTx
) => {
  const [primary, fallback] = getBitcoinBroadcastRelays(networkId);

  const txId = await postToRelay(primary, serializedTx);
  if (txId) return { txId, success: true };

  // Re-posting the identical hex is harmless: if the primary did relay it, the
  // fallback answers with the same txid or a duplicate rejection.
  const fallbackTxId = await postToRelay(fallback, serializedTx);
  if (fallbackTxId) return { txId: fallbackTxId, success: true };

  throw outcomeUnknown();
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
