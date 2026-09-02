import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  describe('broadcastTransaction', () => {
    const TXID = 'a'.repeat(64);
    const HEX = '0200000001deadbeef';
    const MAINNET_PRIMARY = 'https://mempool.space/api/tx';
    const MAINNET_FALLBACK = 'https://blockstream.info/api/tx';

    const relayResponse = (status: number, body: string) =>
      ({ ok: status >= 200 && status < 300, status, text: async () => body }) as Response;

    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('posts nothing but the raw hex to the primary relay and returns its txid', async () => {
      mockFetch.mockResolvedValueOnce(relayResponse(200, `${TXID}\n`));

      const result = await broadcastTransaction('bitcoin-mainnet', 'bc1-address', HEX);

      expect(result).toEqual({ txId: TXID, success: true });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(MAINNET_PRIMARY);
      expect(init.method).toBe('POST');
      expect(init.body).toBe(HEX);
      expect(init.headers).toEqual({ 'Content-Type': 'text/plain' });
      // The signed transaction never carries the address, auth or anything else.
      expect(JSON.stringify(init)).not.toContain('bc1-address');
      // ...and it never reaches our own backend.
      expect(mockApiClientPost).not.toHaveBeenCalled();
    });

    it('uses the testnet relay for the testnet network id', async () => {
      mockFetch.mockResolvedValueOnce(relayResponse(200, TXID));

      await broadcastTransaction('bitcoin-testnet', 'tb1-address', HEX);

      expect(mockFetch.mock.calls[0][0]).toBe('https://mempool.space/testnet/api/tx');
    });

    it('treats a 4xx as a definitive rejection and does not try the fallback', async () => {
      mockFetch.mockResolvedValueOnce(relayResponse(400, 'bad-txns-inputs-missingorspent'));

      await expect(broadcastTransaction('bitcoin-mainnet', 'bc1-address', HEX)).rejects.toThrow(
        'bad-txns-inputs-missingorspent'
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('falls back to the second relay when the primary cannot be reached', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockResolvedValueOnce(relayResponse(200, TXID));

      const result = await broadcastTransaction('bitcoin-mainnet', 'bc1-address', HEX);

      expect(result).toEqual({ txId: TXID, success: true });
      expect(mockFetch.mock.calls[1][0]).toBe(MAINNET_FALLBACK);
    });

    it('reports an unknown outcome when both relays fail without rejecting', async () => {
      mockFetch
        .mockResolvedValueOnce(relayResponse(503, 'upstream unavailable'))
        .mockRejectedValueOnce(new Error('Network request failed'));

      await expect(
        broadcastTransaction('bitcoin-mainnet', 'bc1-address', HEX)
      ).rejects.toMatchObject({
        code: 'BROADCAST_OUTCOME_UNKNOWN',
        message: 'transaction.errors.broadcastUnknown',
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does not treat a 2xx body that is not a txid as success', async () => {
      mockFetch
        .mockResolvedValueOnce(relayResponse(200, '<html>proxy error</html>'))
        .mockResolvedValueOnce(relayResponse(200, 'still not a txid'));

      await expect(
        broadcastTransaction('bitcoin-mainnet', 'bc1-address', HEX)
      ).rejects.toMatchObject({ code: 'BROADCAST_OUTCOME_UNKNOWN' });
    });
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
