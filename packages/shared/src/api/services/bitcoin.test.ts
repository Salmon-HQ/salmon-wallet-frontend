import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AccountTransaction,
  AccountTransactionListResponse,
  BitcoinBalanceItem,
  UTXO,
} from '../../types/transfer';

vi.mock('../client', async () => {
  const actual = await vi.importActual<typeof import('../client')>('../client');

  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
    },
    get: vi.fn(),
  };
});

import { ApiError, apiClient, get } from '../client';
import { getReachableBackendBaseUrl } from '../test-backend';
import {
  broadcastTransaction,
  fetchBitcoinAccountBalance,
  fetchBitcoinAccountRecentTransactions,
  fetchUtxos,
} from './bitcoin';

const mockApiClientGet = vi.mocked(apiClient.get);
const mockApiClientPost = vi.mocked(apiClient.post);
const mockGet = vi.mocked(get);
const backendBaseUrl = await getReachableBackendBaseUrl();

const MOCK_ACCOUNT_BALANCE_ITEMS: BitcoinBalanceItem[] = [
  {
    amount: 364735619,
    decimals: 8,
    symbol: 'BTC',
    name: 'Bitcoin',
    coingeckoId: 'bitcoin',
    logo: 'https://assets-cdn.trustwallet.com/blockchains/bitcoin/info/logo.png',
  },
];

const MOCK_ACCOUNT_TRANSACTION: AccountTransaction = {
  id: 'tx-2',
  timestamp: 1710000100,
  type: 'send',
  inputs: [],
  outputs: [],
};

const MOCK_ACCOUNT_TRANSACTIONS: AccountTransactionListResponse = {
  items: [MOCK_ACCOUNT_TRANSACTION],
  nextPageToken: 'cursor-2',
};

const MOCK_UTXO_ITEMS: UTXO[] = [
  {
    txid: 'utxo-1',
    vout: 1,
    satoshis: 2000,
  },
];

describe('bitcoin service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches utxos for DI adapters with pageSize=100', async () => {
    mockApiClientGet.mockResolvedValueOnce({
      data: {
        data: MOCK_UTXO_ITEMS,
      },
    });

    const result = await fetchUtxos('bitcoin-mainnet', 'bc1-address');

    expect(mockApiClientGet).toHaveBeenCalledWith('/v1/bitcoin-mainnet/account/bc1-address/utxo', {
      params: { pageSize: 100 },
    });
    expect(result).toEqual(MOCK_UTXO_ITEMS);
  });

  it('broadcasts transactions for DI adapters', async () => {
    mockApiClientPost.mockResolvedValueOnce({
      data: { txId: 'tx-3', success: true },
    });

    const result = await broadcastTransaction('bitcoin-mainnet', 'bc1-address', 'serialized-tx');

    expect(result).toEqual({ txId: 'tx-3', success: true });
  });

  it('maps bitcoin account balance items to ui amounts and coingecko ids', async () => {
    mockGet.mockResolvedValueOnce(MOCK_ACCOUNT_BALANCE_ITEMS);

    const result = await fetchBitcoinAccountBalance('bitcoin-mainnet', 'bc1-address');

    expect(mockGet).toHaveBeenCalledWith('/v1/bitcoin-mainnet/account/bc1-address/balance', {
      params: { include: 'logo' },
    });
    expect(result).toEqual([
      expect.objectContaining({
        amount: 364735619,
        coingeckoId: 'bitcoin',
        uiAmount: 3.64735619,
      }),
    ]);
  });

  it('fetches recent bitcoin account transactions through the generic get helper', async () => {
    mockGet.mockResolvedValueOnce({
      data: [MOCK_ACCOUNT_TRANSACTION],
      meta: { nextPageToken: 'cursor-2' },
    });

    const result = await fetchBitcoinAccountRecentTransactions('bitcoin-mainnet', 'bc1-address', {
      nextPageToken: 'cursor-1',
      pageSize: 5,
    });

    expect(mockGet).toHaveBeenCalledWith('/v1/bitcoin-mainnet/account/bc1-address/transactions', {
      params: {
        pageToken: 'cursor-1',
        pageSize: 5,
      },
    });
    expect(result).toEqual(MOCK_ACCOUNT_TRANSACTIONS);
  });
});

describe.skipIf(!backendBaseUrl)('bitcoin service integration', () => {
  const liveGet = async <T>(
    path: string,
    config?: { params?: Record<string, string | number> }
  ): Promise<T> => {
    const url = new URL(`${backendBaseUrl!}${path}`);
    if (config?.params) {
      for (const [key, value] of Object.entries(config.params)) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new ApiError(`HTTP ${response.status}`, response.status);
    }

    return (await response.json()) as T;
  };

  it('reads live bitcoin balance data from salmon-api', async () => {
    mockGet.mockImplementation(liveGet as typeof get);

    const result = await fetchBitcoinAccountBalance(
      'bitcoin-mainnet',
      'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
    );

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toEqual(
      expect.objectContaining({
        // The live balance resource serializes `amount` as a string.
        amount: expect.any(String),
        decimals: 8,
        coingeckoId: 'bitcoin',
        uiAmount: expect.any(Number),
      })
    );
  }, 20000);

  it('reads live bitcoin transaction history from salmon-api', async () => {
    mockGet.mockImplementation(liveGet as typeof get);

    const result = await fetchBitcoinAccountRecentTransactions(
      'bitcoin-mainnet',
      '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      { pageSize: 1 }
    );

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        timestamp: expect.any(Number),
        status: expect.any(String),
        type: expect.any(String),
        inputs: expect.any(Array),
        outputs: expect.any(Array),
      })
    );
  }, 20000);
});
