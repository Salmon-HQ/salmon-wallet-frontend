import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SolanaBalanceItem } from '../../types/transfer';
import type { SolanaTransaction } from '../../types/transaction';
import type { ApiSwapExecuteResponse, SwapOrderResponse } from '../../types/swap';

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

vi.mock('./solana-nft', () => ({
  getSolanaNfts: vi.fn(),
}));

import { ApiError, apiClient, get } from '../client';
import { getReachableBackendBaseUrl } from '../test-backend';
import { getSolanaNfts } from './solana-nft';
import {
  executeSwapApi,
  fetchSolanaAccountBalance,
  getSolanaTransactions,
  getSwapOrder,
  solanaApiFunctions,
} from './solana';

const mockApiClientGet = vi.mocked(apiClient.get);
const mockApiClientPost = vi.mocked(apiClient.post);
const mockGet = vi.mocked(get);
const mockGetSolanaNfts = vi.mocked(getSolanaNfts);
const backendBaseUrl = await getReachableBackendBaseUrl();

const MOCK_SOLANA_TRANSACTION = {
  id: 'sig-1',
  signature: 'sig-1',
  timestamp: 1710000000,
  status: 'completed',
  type: 'interaction',
  inputs: [],
  outputs: [],
} as SolanaTransaction;

const MOCK_SWAP_ORDER: SwapOrderResponse = {
  routeNames: ['Raydium'],
  routeSymbols: ['SOL', 'USDC'],
  fee: {
    amount: 5000,
    decimals: 9,
    symbol: 'SOL',
    percent: 0.5,
  },
  input: {
    amount: '1000000',
    decimals: 9,
    symbol: 'SOL',
  },
  output: {
    amount: '85539',
    decimals: 6,
    symbol: 'USDC',
  },
  custom: {
    transaction: 'base64-transaction',
    requestId: 'request-1',
    router: 'okx',
    priceImpact: -0.45,
    feeBps: 50,
    prioritizationFeeLamports: 42608,
    rentFeeLamports: 2039280,
    gasless: false,
    slippageBps: 22,
    swapMode: 'ExactIn',
    otherAmountThreshold: '85350',
  },
};

const MOCK_SWAP_EXECUTE_RESPONSE: ApiSwapExecuteResponse = {
  signature: 'swap-signature',
  status: 'Success',
};

async function fetchWithRetry(url: string, attempts = 2): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok || response.status < 500 || attempt === attempts) {
        return response;
      }
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error(`Unable to fetch ${url}`);
}

describe('solana service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards solana transaction pagination and type params', async () => {
    mockApiClientGet.mockResolvedValueOnce({
      data: {
        data: [MOCK_SOLANA_TRANSACTION],
        meta: { nextPageToken: 'cursor-1' },
      },
    });

    const result = await getSolanaTransactions('solana-mainnet', 'wallet-1', {
      pageToken: 'cursor-0',
      pageSize: 5,
      type: 'UNKNOWN',
    });

    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/v1/solana-mainnet/account/wallet-1/transactions',
      {
        params: {
          pageToken: 'cursor-0',
          pageSize: 5,
          type: 'UNKNOWN',
        },
      }
    );
    expect(result).toEqual({
      transactions: [MOCK_SOLANA_TRANSACTION],
      oldestSignature: 'cursor-1',
      hasMore: true,
    });
  });

  it('supports legacy before/limit paging aliases', async () => {
    mockApiClientGet.mockResolvedValueOnce({
      data: {
        data: [MOCK_SOLANA_TRANSACTION],
      },
    });

    await getSolanaTransactions('solana-mainnet', 'wallet-1', {
      before: 'legacy-cursor',
      limit: 3,
    });

    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/v1/solana-mainnet/account/wallet-1/transactions',
      {
        params: {
          pageToken: 'legacy-cursor',
          pageSize: 3,
        },
      }
    );
  });

  it('returns empty transaction history on 404', async () => {
    mockApiClientGet.mockRejectedValueOnce(new ApiError('Not found', 404, 'not_found'));

    const result = await getSolanaTransactions('solana-mainnet', 'missing-wallet');

    expect(result).toEqual({
      transactions: [],
      oldestSignature: null,
      hasMore: false,
    });
  });

  it('forwards all supported swap quote params', async () => {
    mockApiClientGet.mockResolvedValueOnce({ data: MOCK_SWAP_ORDER });

    const result = await getSwapOrder('solana-mainnet', {
      inputMint: 'mint-in',
      outputMint: 'mint-out',
      amount: '1000000',
      publicKey: 'wallet-1',
    });

    expect(mockApiClientGet).toHaveBeenCalledWith('/v1/solana-mainnet/ft/swap/order', {
      params: {
        inputMint: 'mint-in',
        outputMint: 'mint-out',
        amount: '1000000',
        publicKey: 'wallet-1',
      },
    });
    expect(result).toEqual(MOCK_SWAP_ORDER);
  });

  it('returns null for missing swap routes', async () => {
    mockApiClientGet.mockRejectedValueOnce(new ApiError('Not found', 404, 'not_found'));

    const result = await getSwapOrder('solana-mainnet', {
      inputMint: 'mint-in',
      outputMint: 'mint-out',
      amount: '1000000',
      publicKey: 'wallet-1',
    });

    expect(result).toBeNull();
  });

  it('posts signed swap execution payloads', async () => {
    mockApiClientPost.mockResolvedValueOnce({ data: MOCK_SWAP_EXECUTE_RESPONSE });

    const result = await executeSwapApi('solana-mainnet', 'signed-transaction', 'request-1');

    expect(mockApiClientPost).toHaveBeenCalledWith('/v1/solana-mainnet/ft/swap/execute', {
      signedTransaction: 'signed-transaction',
      requestId: 'request-1',
    });
    expect(result).toEqual(MOCK_SWAP_EXECUTE_RESPONSE);
  });

  it('returns failed execute responses for api errors', async () => {
    mockApiClientPost.mockRejectedValueOnce(
      new ApiError('swap execution failed', 400, 'swap_failed')
    );

    const result = await executeSwapApi('solana-mainnet', 'signed-transaction', 'request-1');

    expect(result).toEqual({
      signature: '',
      status: 'Failed',
      error: 'swap execution failed',
    });
  });

  it('passes BE balance items through, computing only uiAmount', async () => {
    mockGet.mockResolvedValueOnce([
      {
        amount: 1000000000,
        decimals: 9,
        symbol: 'SOL',
        name: 'Solana',
        logo: 'sol-logo',
      },
      {
        amount: 2500000,
        decimals: 6,
        mint: 'mint-1',
        symbol: 'NEW',
        name: 'New Token',
        logo: 'new-logo',
        coingeckoId: 'new-token',
        tags: ['verified'],
      },
    ] as SolanaBalanceItem[]);

    const result = await fetchSolanaAccountBalance('solana-mainnet', 'wallet-1');

    expect(mockGet).toHaveBeenCalledWith('/v1/solana-mainnet/account/wallet-1/balance', {
      params: { include: 'logo' },
    });
    expect(result).toEqual([
      expect.objectContaining({
        symbol: 'SOL',
        uiAmount: 1,
      }),
      expect.objectContaining({
        mint: 'mint-1',
        symbol: 'NEW',
        name: 'New Token',
        logo: 'new-logo',
        coingeckoId: 'new-token',
        tags: ['verified'],
        uiAmount: 2.5,
      }),
    ]);
  });

  it('opts the BE into surfacing unknown-only-tagged tokens via includeSpam', async () => {
    mockGet.mockResolvedValueOnce([] as SolanaBalanceItem[]);

    await fetchSolanaAccountBalance('solana-mainnet', 'wallet-1', { includeSpam: true });

    expect(mockGet).toHaveBeenCalledWith('/v1/solana-mainnet/account/wallet-1/balance', {
      params: { include: 'logo', includeSpam: 'true' },
    });
  });

  it('wires solana api functions to the expected dependencies', async () => {
    // getSolanaNfts reports whether the page walk finished; this wiring drops
    // that flag, because the account-level callers have nowhere to show it.
    mockGetSolanaNfts.mockResolvedValueOnce({
      nfts: [{ mint: { address: 'nft-1' } }],
      partial: false,
    } as never);

    await expect(
      solanaApiFunctions.fetchNfts('solana-mainnet', 'wallet-1', false)
    ).resolves.toEqual([{ mint: { address: 'nft-1' } }]);

    expect(mockGetSolanaNfts).toHaveBeenCalledWith('solana-mainnet', 'wallet-1', false, {});
  });
});

describe('solana service integration', () => {
  // Live integration wallet — set SALMON_TEST_LIVE_WALLET to a Solana address
  // with on-chain balance/history. Tests skip when unset.
  const walletAddress = process.env.SALMON_TEST_LIVE_WALLET ?? '';

  it('reads live solana balance data from salmon-api and preserves adapter invariants', async () => {
    if (!walletAddress) {
      console.log('Skipping live solana balance integration: SALMON_TEST_LIVE_WALLET not set');
      return;
    }
    const liveBackendBaseUrl = backendBaseUrl ?? (await getReachableBackendBaseUrl());
    if (!liveBackendBaseUrl) {
      console.log('Skipping live solana balance integration assertions: backend not reachable');
      return;
    }

    mockGet.mockImplementation(async (path, config) => {
      const url = new URL(`${liveBackendBaseUrl}${path as string}`);
      const params = config?.params as Record<string, string | number> | undefined;
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          url.searchParams.set(key, String(value));
        }
      }

      const response = await fetchWithRetry(url.toString());

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}`, response.status);
      }

      return (await response.json()) as SolanaBalanceItem[];
    });

    const result = await fetchSolanaAccountBalance('solana-mainnet', walletAddress);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toEqual(
      expect.objectContaining({
        amount: expect.anything(),
        decimals: expect.any(Number),
        symbol: expect.any(String),
        uiAmount: expect.any(Number),
      })
    );

    const nativeSol = result.find((item) => !item.mint);
    expect(nativeSol).toEqual(
      expect.objectContaining({
        symbol: 'SOL',
        coingeckoId: 'solana',
      })
    );
  }, 20000);

  it('reads live solana transaction history from salmon-api', async () => {
    if (!walletAddress) {
      console.log('Skipping live solana transaction integration: SALMON_TEST_LIVE_WALLET not set');
      return;
    }
    const liveBackendBaseUrl = backendBaseUrl ?? (await getReachableBackendBaseUrl());
    if (!liveBackendBaseUrl) {
      console.log('Skipping live solana transaction integration assertions: backend not reachable');
      return;
    }

    mockApiClientGet.mockImplementation(async (path, config) => {
      const url = new URL(`${liveBackendBaseUrl}${path as string}`);
      const params = config?.params as Record<string, string | number> | undefined;
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          url.searchParams.set(key, String(value));
        }
      }

      const response = await fetchWithRetry(url.toString());

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}`, response.status);
      }

      return {
        data: await response.json(),
      } as { data: { data: SolanaTransaction[]; meta?: { nextPageToken?: string } } };
    });

    const result = await getSolanaTransactions('solana-mainnet', walletAddress, { pageSize: 1 });

    expect(Array.isArray(result.transactions)).toBe(true);
    expect(result.transactions.length).toBeGreaterThan(0);
    expect(result.transactions[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        signature: expect.any(String),
        timestamp: expect.any(Number),
        status: expect.any(String),
        inputs: expect.any(Array),
        outputs: expect.any(Array),
      })
    );
  }, 20000);

  it('reads a live solana swap quote from salmon-api', async () => {
    if (!walletAddress) {
      console.log('Skipping live solana swap quote integration: SALMON_TEST_LIVE_WALLET not set');
      return;
    }
    const liveBackendBaseUrl = backendBaseUrl ?? (await getReachableBackendBaseUrl());
    if (!liveBackendBaseUrl) {
      console.log('Skipping live solana swap quote assertions: backend not reachable');
      return;
    }

    mockApiClientGet.mockImplementation(async (path, config) => {
      const url = new URL(`${liveBackendBaseUrl}${path as string}`);
      const params = config?.params as Record<string, string | number | boolean> | undefined;
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          url.searchParams.set(key, String(value));
        }
      }

      const response = await fetchWithRetry(url.toString());

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}`, response.status);
      }

      return {
        data: await response.json(),
      } as { data: SwapOrderResponse };
    });

    const result = await getSwapOrder('solana-mainnet', {
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount: '1000000',
      publicKey: walletAddress,
    });

    expect(result).toEqual(
      expect.objectContaining({
        output: expect.objectContaining({
          amount: expect.any(String),
        }),
        custom: expect.objectContaining({
          transaction: expect.any(String),
          requestId: expect.any(String),
        }),
      })
    );
  }, 20000);
});
