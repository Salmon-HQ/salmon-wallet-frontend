import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AccountTransaction,
  AccountTransactionListResponse,
  BitcoinBalance,
  BitcoinBalanceItem,
  BitcoinTransaction,
  BitcoinTransactionsResponse,
  BitcoinUtxo,
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
  broadcastBitcoinTransaction,
  broadcastTransaction,
  fetchBitcoinAccountBalance,
  fetchBitcoinAccountRecentTransactions,
  fetchBitcoinAccountTransaction,
  fetchUtxos,
  getBitcoinBalance,
  getBitcoinTransactions,
  getBitcoinUtxos,
} from './bitcoin';

const mockApiClientGet = vi.mocked(apiClient.get);
const mockApiClientPost = vi.mocked(apiClient.post);
const mockGet = vi.mocked(get);
const backendBaseUrl = await getReachableBackendBaseUrl();

const MOCK_BALANCE: BitcoinBalance = {
  confirmed: 364735619,
  unconfirmed: 0,
  total: 364735619,
  logo: 'https://assets-cdn.trustwallet.com/blockchains/bitcoin/info/logo.png',
};

const MOCK_UTXOS: BitcoinUtxo[] = [
  {
    txid: 'tx-1',
    vout: 0,
    value: 1000,
    scriptPubKey: '0014deadbeef',
    height: 123456,
    confirmations: 12,
  },
];

const MOCK_BITCOIN_TRANSACTIONS: BitcoinTransactionsResponse = {
  transactions: [
    {
      txid: 'tx-1',
      hash: 'hash-1',
      version: 2,
      size: 225,
      vsize: 144,
      weight: 576,
      locktime: 0,
      vin: [],
      vout: [],
      confirmations: 7,
      blocktime: 1710000000,
    },
  ],
  nextPageToken: 'next-page',
  total: 1,
};

const MOCK_SINGLE_TRANSACTION: BitcoinTransaction = {
  txid: 'tx-1',
  hash: 'hash-1',
  version: 2,
  size: 225,
  vsize: 144,
  weight: 576,
  locktime: 0,
  vin: [],
  vout: [],
  confirmations: 7,
  blocktime: 1710000000,
};

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

  it('fetches bitcoin balance with include=logo', async () => {
    mockApiClientGet.mockResolvedValueOnce({ data: MOCK_BALANCE });

    const result = await getBitcoinBalance('bitcoin-mainnet', 'bc1-address');

    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/v1/bitcoin-mainnet/account/bc1-address/balance',
      {
        params: { include: 'logo' },
      },
    );
    expect(result).toEqual(MOCK_BALANCE);
  });

  it('returns null for missing bitcoin balance', async () => {
    mockApiClientGet.mockRejectedValueOnce(new ApiError('Not found', 404, 'not_found'));

    const result = await getBitcoinBalance('bitcoin-mainnet', 'missing-address');

    expect(result).toBeNull();
  });

  it('fetches bitcoin utxos', async () => {
    mockApiClientGet.mockResolvedValueOnce({ data: MOCK_UTXOS });

    const result = await getBitcoinUtxos('bitcoin-mainnet', 'bc1-address');

    expect(mockApiClientGet).toHaveBeenCalledWith('/v1/bitcoin-mainnet/account/bc1-address/utxo');
    expect(result).toEqual(MOCK_UTXOS);
  });

  it('returns an empty array for missing bitcoin utxos', async () => {
    mockApiClientGet.mockRejectedValueOnce(new ApiError('Not found', 404, 'not_found'));

    const result = await getBitcoinUtxos('bitcoin-mainnet', 'missing-address');

    expect(result).toEqual([]);
  });

  it('forwards bitcoin transaction pagination params', async () => {
    mockApiClientGet.mockResolvedValueOnce({ data: MOCK_BITCOIN_TRANSACTIONS });

    const result = await getBitcoinTransactions('bitcoin-mainnet', 'bc1-address', {
      pageToken: 'cursor-1',
      pageSize: 10,
    });

    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/v1/bitcoin-mainnet/account/bc1-address/transactions',
      {
        params: {
          pageToken: 'cursor-1',
          pageSize: 10,
        },
      },
    );
    expect(result).toEqual(MOCK_BITCOIN_TRANSACTIONS);
  });

  it('normalizes missing bitcoin transaction arrays to empty arrays', async () => {
    mockApiClientGet.mockResolvedValueOnce({
      data: { nextPageToken: 'cursor-2', total: 0 },
    });

    const result = await getBitcoinTransactions('bitcoin-mainnet', 'bc1-address');

    expect(result).toEqual({
      transactions: [],
      nextPageToken: 'cursor-2',
      total: 0,
    });
  });

  it('returns empty transactions on 404', async () => {
    mockApiClientGet.mockRejectedValueOnce(new ApiError('Not found', 404, 'not_found'));

    const result = await getBitcoinTransactions('bitcoin-mainnet', 'missing-address');

    expect(result).toEqual({ transactions: [], nextPageToken: null });
  });

  it('returns backend broadcast response on success', async () => {
    mockApiClientPost.mockResolvedValueOnce({
      data: { txid: 'broadcasted-tx', success: true },
    });

    const result = await broadcastBitcoinTransaction('bitcoin-mainnet', 'bc1-address', 'signed-hex');

    expect(mockApiClientPost).toHaveBeenCalledWith(
      '/v1/bitcoin-mainnet/account/bc1-address/transactions',
      { tx: 'signed-hex' },
    );
    expect(result).toEqual({ txid: 'broadcasted-tx', success: true });
  });

  it('returns a failed broadcast response for api errors', async () => {
    mockApiClientPost.mockRejectedValueOnce(
      new ApiError('invalid transaction', 400, 'invalid_tx'),
    );

    const result = await broadcastBitcoinTransaction('bitcoin-mainnet', 'bc1-address', 'signed-hex');

    expect(result).toEqual({
      txid: '',
      success: false,
      error: 'invalid transaction',
    });
  });

  it('fetches utxos for DI adapters with pageSize=100', async () => {
    mockApiClientGet.mockResolvedValueOnce({
      data: {
        data: MOCK_UTXO_ITEMS,
      },
    });

    const result = await fetchUtxos('bitcoin-mainnet', 'bc1-address');

    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/v1/bitcoin-mainnet/account/bc1-address/utxo',
      { params: { pageSize: 100 } },
    );
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

    expect(mockGet).toHaveBeenCalledWith(
      '/v1/bitcoin-mainnet/account/bc1-address/balance',
      { params: { include: 'logo' } },
    );
    expect(result).toEqual([
      expect.objectContaining({
        amount: 364735619,
        coingeckoId: 'bitcoin',
        uiAmount: 3.64735619,
      }),
    ]);
  });

  it('fetches a bitcoin account transaction through the generic get helper', async () => {
    mockGet.mockResolvedValueOnce(MOCK_ACCOUNT_TRANSACTION);

    const result = await fetchBitcoinAccountTransaction('bitcoin-mainnet', 'bc1-address', 'tx-2');

    expect(mockGet).toHaveBeenCalledWith(
      '/v1/bitcoin-mainnet/account/bc1-address/transactions/tx-2',
    );
    expect(result).toEqual(MOCK_ACCOUNT_TRANSACTION);
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

    expect(mockGet).toHaveBeenCalledWith(
      '/v1/bitcoin-mainnet/account/bc1-address/transactions',
      {
        params: {
          pageToken: 'cursor-1',
          pageSize: 5,
        },
      },
    );
    expect(result).toEqual(MOCK_ACCOUNT_TRANSACTIONS);
  });
});

describe.skipIf(!backendBaseUrl)('bitcoin service integration', () => {
  it(
    'reads live bitcoin balance data from salmon-api',
    async () => {
      mockApiClientGet.mockImplementation(async (path, config) => {
        const url = new URL(`${backendBaseUrl!}${path as string}`);
        const params = config?.params as Record<string, string | number> | undefined;
        if (params) {
          for (const [key, value] of Object.entries(params)) {
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

        return {
          data: await response.json(),
        } as { data: BitcoinBalance | BitcoinBalanceItem[] };
      });

      const result = await getBitcoinBalance(
        'bitcoin-mainnet',
        'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      );

      expect(result).toEqual(
        expect.objectContaining({
          confirmed: expect.any(Number),
          unconfirmed: 0,
          total: expect.any(Number),
        }),
      );
    },
    20000,
  );

  it(
    'reads live bitcoin transaction history from salmon-api',
    async () => {
      mockApiClientGet.mockImplementation(async (path, config) => {
        const url = new URL(`${backendBaseUrl!}${path as string}`);
        const params = config?.params as Record<string, string | number> | undefined;
        if (params) {
          for (const [key, value] of Object.entries(params)) {
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

        const raw = await response.json() as {
          data?: BitcoinTransaction[];
          meta?: { nextPageToken?: string };
        };

        return {
          data: {
            transactions: raw.data,
            nextPageToken: raw.meta?.nextPageToken,
          },
        } as { data: BitcoinTransactionsResponse };
      });

      const result = await getBitcoinTransactions(
        'bitcoin-mainnet',
        '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        { pageSize: 1 },
      );

      expect(Array.isArray(result.transactions)).toBe(true);
      expect(result.transactions.length).toBeGreaterThan(0);
      expect(result.transactions[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          timestamp: expect.any(Number),
          status: expect.any(String),
          type: expect.any(String),
          inputs: expect.any(Array),
          outputs: expect.any(Array),
        }),
      );
    },
    20000,
  );

});
