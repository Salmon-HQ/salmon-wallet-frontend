/**
 * Tests for Solana Swap Service
 *
 * Tests cover swap quote fetching, execution, and helper functions.
 * Uses Vitest 4.0.18 for testing with injected mock dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiClient } from '../../api/client';
import { getReachableBackendBaseUrl } from '../../api/test-backend';
import {
  VersionedTransaction,
  PublicKey,
  TransactionMessage,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import { createKeyPairSignerFromPrivateKeyBytes } from '@solana/kit';
import nacl from 'tweetnacl';
import {
  getSwapQuote,
  executeSwap,
  swap,
  getExpectedOutput,
  getMinimumOutput,
  getPriceImpact,
  SOL_ADDRESS,
  type GetSwapOrderFn,
  type ExecuteSwapApiFn,
  type GetTokenListFn,
} from './swap';
import type { SwapQuote, SwapQuoteParams, SwapOrderResponse } from '../../types/swap';
import type { TokenMetadata } from '../../types/token';

// ============================================================================
// Test Data
// ============================================================================

// TEST-ONLY deterministic signer; holds no funds.
const TEST_SIGNER = await createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(32).fill(7), false);
const TEST_PUBLIC_KEY = TEST_SIGNER.address;
// Live integration wallet — set SALMON_TEST_LIVE_WALLET to a Solana address
// with on-chain balance/history. Tests that need it skip when unset.
const LIVE_TEST_PUBLIC_KEY = process.env.SALMON_TEST_LIVE_WALLET ?? '';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const backendBaseUrl = await getReachableBackendBaseUrl();

function createMockVersionedTransactionBase64(payer: PublicKey): string {
  const instructions: TransactionInstruction[] = [
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: payer,
      lamports: 1000,
    }),
  ];

  const recentBlockhash = 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi';

  const messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash,
    instructions,
  }).compileToV0Message();

  const versionedTx = new VersionedTransaction(messageV0);
  return Buffer.from(versionedTx.serialize()).toString('base64');
}

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
    amount: '1000000000',
    decimals: 9,
    symbol: 'SOL',
    name: 'Solana',
    logo: 'https://example.com/sol.png',
    contract: SOL_ADDRESS,
  },
  output: {
    amount: '5000000',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    logo: 'https://example.com/usdc.png',
    contract: USDC_MINT,
  },
  custom: {
    transaction: 'base64-encoded-transaction-data',
    requestId: 'test-request-id-123',
    router: 'iris',
    priceImpact: 0.12,
    feeBps: 50,
    prioritizationFeeLamports: 1000,
    rentFeeLamports: 5616,
    gasless: false,
    slippageBps: 50,
    swapMode: 'ExactIn',
    otherAmountThreshold: '4950000',
    inUsdValue: 150.0,
    outUsdValue: 5.0,
  },
};

const MOCK_TOKEN_LIST: TokenMetadata[] = [
  {
    address: SOL_ADDRESS,
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    logo: 'https://example.com/sol.png',
  },
  {
    address: USDC_MINT,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logo: 'https://example.com/usdc.png',
  },
];

/** A real base58 ed25519 signature — `signature()` validates what the API returns. */
const MOCK_SIGNATURE =
  '5b4xdmSrB8gh4rHn5NFFTDEKSekL2CyRN8PrwpGYgp2buABGRULKu4vMUR1XLE1fx12C4FH1imq88aRV7ivZtZq';

const MOCK_SWAP_SUCCESS = {
  signature: MOCK_SIGNATURE,
  status: 'Success',
  confirmationStatus: 'confirmed' as const,
};

const MOCK_SWAP_FAILURE = {
  signature: '',
  status: 'Failed',
  error: 'Swap execution failed: Slippage exceeded',
};

// ============================================================================
// Mock factories
// ============================================================================

let mockGetSwapOrder: ReturnType<typeof vi.fn<GetSwapOrderFn>>;
let mockExecuteSwapApi: ReturnType<typeof vi.fn<ExecuteSwapApiFn>>;
let mockGetTokenList: ReturnType<typeof vi.fn<GetTokenListFn>>;

// ============================================================================
// Helper: isBackendAvailable
// ============================================================================

// ============================================================================
// Tests: getSwapQuote
// ============================================================================

describe('getSwapQuote', () => {
  beforeEach(() => {
    mockGetSwapOrder = vi.fn<GetSwapOrderFn>().mockResolvedValue(MOCK_SWAP_ORDER);
    mockGetTokenList = vi.fn<GetTokenListFn>().mockResolvedValue(MOCK_TOKEN_LIST);
  });

  it('sends uiAmount by default and lets the BE resolve decimals from the catalog', async () => {
    const params: SwapQuoteParams = {
      inputMint: SOL_ADDRESS,
      outputMint: USDC_MINT,
      amount: 1.0,
      publicKey: TEST_PUBLIC_KEY,
      slippageBps: 50,
    };

    const quote = await getSwapQuote(
      'solana-mainnet',
      params,
      {},
      mockGetSwapOrder,
      mockGetTokenList
    );

    expect(quote).toBeDefined();
    expect(quote.networkId).toBe('solana-mainnet');
    expect(quote.custom?.requestId).toBe('test-request-id-123');
    expect(mockGetSwapOrder).toHaveBeenCalledWith(
      'solana-mainnet',
      expect.objectContaining({
        inputMint: SOL_ADDRESS,
        outputMint: USDC_MINT,
        uiAmount: '1',
        publicKey: TEST_PUBLIC_KEY,
        slippageBps: 50,
      })
    );
    expect(mockGetSwapOrder.mock.calls[0]![1]).not.toHaveProperty('amount');
    expect(mockGetTokenList).not.toHaveBeenCalled();
  });

  it('forwards a fractional uiAmount unchanged when no inputDecimals is provided', async () => {
    const params: SwapQuoteParams = {
      inputMint: SOL_ADDRESS,
      outputMint: USDC_MINT,
      amount: 1.5,
      publicKey: TEST_PUBLIC_KEY,
    };

    await getSwapQuote('solana-mainnet', params, {}, mockGetSwapOrder, mockGetTokenList);

    expect(mockGetSwapOrder).toHaveBeenCalledWith(
      'solana-mainnet',
      expect.objectContaining({
        uiAmount: '1.5',
      })
    );
    expect(mockGetTokenList).not.toHaveBeenCalled();
  });

  it('sends raw amount (and skips uiAmount) when the caller provides inputDecimals', async () => {
    const params: SwapQuoteParams = {
      inputMint: SOL_ADDRESS,
      outputMint: USDC_MINT,
      amount: 1.0,
      publicKey: TEST_PUBLIC_KEY,
    };

    await getSwapQuote(
      'solana-mainnet',
      params,
      { inputDecimals: 9 },
      mockGetSwapOrder,
      mockGetTokenList
    );

    expect(mockGetTokenList).not.toHaveBeenCalled();
    expect(mockGetSwapOrder).toHaveBeenCalledWith(
      'solana-mainnet',
      expect.objectContaining({ amount: '1000000000' })
    );
    expect(mockGetSwapOrder.mock.calls[0]![1]).not.toHaveProperty('uiAmount');
  });

  it('should normalize user public key to SOL_ADDRESS for native SOL', async () => {
    const params: SwapQuoteParams = {
      inputMint: TEST_PUBLIC_KEY,
      outputMint: USDC_MINT,
      amount: 1.0,
      publicKey: TEST_PUBLIC_KEY,
    };

    await getSwapQuote('solana-mainnet', params, {}, mockGetSwapOrder, mockGetTokenList);

    expect(mockGetSwapOrder).toHaveBeenCalledWith(
      'solana-mainnet',
      expect.objectContaining({
        inputMint: SOL_ADDRESS,
      })
    );
  });

  it('should handle swap mode parameter', async () => {
    const params: SwapQuoteParams = {
      inputMint: SOL_ADDRESS,
      outputMint: USDC_MINT,
      amount: 1.0,
      publicKey: TEST_PUBLIC_KEY,
      swapMode: 'ExactOut',
    };

    await getSwapQuote('solana-mainnet', params, {}, mockGetSwapOrder, mockGetTokenList);

    expect(mockGetSwapOrder).toHaveBeenCalledWith(
      'solana-mainnet',
      expect.objectContaining({
        swapMode: 'ExactOut',
      })
    );
  });

  it('should handle priority level parameter', async () => {
    const params: SwapQuoteParams = {
      inputMint: SOL_ADDRESS,
      outputMint: USDC_MINT,
      amount: 1.0,
      publicKey: TEST_PUBLIC_KEY,
      priorityLevel: 'high',
    };

    await getSwapQuote('solana-mainnet', params, {}, mockGetSwapOrder, mockGetTokenList);

    expect(mockGetSwapOrder).toHaveBeenCalledWith(
      'solana-mainnet',
      expect.objectContaining({
        priorityLevel: 'high',
      })
    );
  });

  it('should handle dynamic slippage parameter', async () => {
    const params: SwapQuoteParams = {
      inputMint: SOL_ADDRESS,
      outputMint: USDC_MINT,
      amount: 1.0,
      publicKey: TEST_PUBLIC_KEY,
      dynamicSlippage: true,
    };

    await getSwapQuote('solana-mainnet', params, {}, mockGetSwapOrder, mockGetTokenList);

    expect(mockGetSwapOrder).toHaveBeenCalledWith(
      'solana-mainnet',
      expect.objectContaining({
        dynamicSlippage: true,
      })
    );
  });

  it('should throw error when no route found', async () => {
    mockGetSwapOrder.mockResolvedValue(null);

    const params: SwapQuoteParams = {
      inputMint: SOL_ADDRESS,
      outputMint: USDC_MINT,
      amount: 1.0,
      publicKey: TEST_PUBLIC_KEY,
    };

    await expect(
      getSwapQuote('solana-mainnet', params, {}, mockGetSwapOrder, mockGetTokenList)
    ).rejects.toThrow('Failed to get swap quote: No route found');
  });

  it('forwards uiAmount for unknown mints — BE owns the catalog lookup', async () => {
    mockGetTokenList.mockResolvedValue([]);

    const params: SwapQuoteParams = {
      inputMint: 'unknown-token-mint',
      outputMint: USDC_MINT,
      amount: 1.0,
      publicKey: TEST_PUBLIC_KEY,
    };

    await getSwapQuote('solana-mainnet', params, {}, mockGetSwapOrder, mockGetTokenList);

    expect(mockGetTokenList).not.toHaveBeenCalled();
    expect(mockGetSwapOrder).toHaveBeenCalledWith(
      'solana-mainnet',
      expect.objectContaining({
        uiAmount: '1',
        inputMint: 'unknown-token-mint',
      })
    );
  });

  it('should accept network object with id property', async () => {
    const params: SwapQuoteParams = {
      inputMint: SOL_ADDRESS,
      outputMint: USDC_MINT,
      amount: 1.0,
      publicKey: TEST_PUBLIC_KEY,
    };

    const networkObj = { id: 'solana-mainnet', name: 'Mainnet', config: {} };
    await getSwapQuote(networkObj, params, {}, mockGetSwapOrder, mockGetTokenList);

    expect(mockGetSwapOrder).toHaveBeenCalledWith('solana-mainnet', expect.any(Object));
  });
});

// ============================================================================
// Tests: executeSwap
// ============================================================================

describe('executeSwap', () => {
  beforeEach(() => {
    mockExecuteSwapApi = vi.fn<ExecuteSwapApiFn>().mockResolvedValue(MOCK_SWAP_SUCCESS);
  });

  it('should execute swap successfully', async () => {
    const quote: SwapQuote = {
      ...MOCK_SWAP_ORDER,
      networkId: 'solana-mainnet',
    };

    if (!quote.custom) quote.custom = {} as any;
    quote.custom.transaction = createMockVersionedTransactionBase64(
      new PublicKey(TEST_SIGNER.address)
    );

    const result = await executeSwap(quote, TEST_SIGNER, undefined, mockExecuteSwapApi);

    expect(result.status).toBe('success');
    expect(result.txId).toBe(MOCK_SIGNATURE);
    expect(result.confirmationStatus).toBe('confirmed');
    expect(result.error).toBeUndefined();
  });

  it('should handle failed swap execution', async () => {
    mockExecuteSwapApi.mockResolvedValue(MOCK_SWAP_FAILURE);

    const quote: SwapQuote = {
      ...MOCK_SWAP_ORDER,
      networkId: 'solana-mainnet',
    };

    if (!quote.custom) quote.custom = {} as any;
    quote.custom.transaction = createMockVersionedTransactionBase64(
      new PublicKey(TEST_SIGNER.address)
    );

    const result = await executeSwap(quote, TEST_SIGNER, undefined, mockExecuteSwapApi);

    expect(result.status).toBe('fail');
    expect(result.txId).toBeNull();
    expect(result.error).toBe('Swap execution failed: Slippage exceeded');
  });

  it('should handle API errors gracefully', async () => {
    mockExecuteSwapApi.mockRejectedValue(new Error('Network error'));

    const quote: SwapQuote = {
      ...MOCK_SWAP_ORDER,
      networkId: 'solana-mainnet',
    };

    if (!quote.custom) quote.custom = {} as any;
    quote.custom.transaction = createMockVersionedTransactionBase64(
      new PublicKey(TEST_SIGNER.address)
    );

    const result = await executeSwap(quote, TEST_SIGNER, undefined, mockExecuteSwapApi);

    expect(result.status).toBe('fail');
    expect(result.txId).toBeNull();
    expect(result.error).toContain('Network error');
  });

  it('should sign transaction before sending', async () => {
    const quote: SwapQuote = {
      ...MOCK_SWAP_ORDER,
      networkId: 'solana-mainnet',
    };

    if (!quote.custom) quote.custom = {} as any;
    quote.custom.transaction = createMockVersionedTransactionBase64(
      new PublicKey(TEST_SIGNER.address)
    );

    await executeSwap(quote, TEST_SIGNER, undefined, mockExecuteSwapApi);

    expect(mockExecuteSwapApi).toHaveBeenCalledWith(
      'solana-mainnet',
      expect.any(String),
      'test-request-id-123'
    );

    // The fixture is built by @solana/web3.js and signed by @solana/kit, so
    // this also proves the two libraries agree on the wire format.
    const submitted = mockExecuteSwapApi.mock.calls[0][1];
    const decoded = VersionedTransaction.deserialize(Buffer.from(submitted, 'base64'));
    expect(decoded.signatures[0]).not.toEqual(new Uint8Array(64));
    expect(
      nacl.sign.detached.verify(
        decoded.message.serialize(),
        decoded.signatures[0],
        new PublicKey(TEST_SIGNER.address).toBytes()
      )
    ).toBe(true);
  });

  it('rejects a malformed signature from the API instead of passing it through', async () => {
    mockExecuteSwapApi.mockResolvedValue({ ...MOCK_SWAP_SUCCESS, signature: 'not-base58-!!' });

    const quote: SwapQuote = { ...MOCK_SWAP_ORDER, networkId: 'solana-mainnet' };
    if (!quote.custom) quote.custom = {} as any;
    quote.custom.transaction = createMockVersionedTransactionBase64(
      new PublicKey(TEST_SIGNER.address)
    );

    const result = await executeSwap(quote, TEST_SIGNER, undefined, mockExecuteSwapApi);

    expect(result.status).toBe('fail');
    expect(result.txId).toBeNull();
  });

  it('reports success and keeps the signature when confirmation is inconclusive', async () => {
    // The API already accepted and broadcast the order. A dead WebSocket says
    // nothing about whether the swap landed, and reporting failure here while
    // dropping the signature is what invites a duplicate swap on retry.
    const rpcClients = {
      rpc: {
        getSignatureStatuses: () => ({
          send: async () => {
            throw new Error('rpc unreachable');
          },
        }),
      },
      rpcSubscriptions: {
        signatureNotifications: () => ({
          subscribe: async () => {
            throw new Error('websocket connect failed');
          },
        }),
      },
    };

    const quote: SwapQuote = { ...MOCK_SWAP_ORDER, networkId: 'solana-mainnet' };
    if (!quote.custom) quote.custom = {} as any;
    quote.custom.transaction = createMockVersionedTransactionBase64(
      new PublicKey(TEST_SIGNER.address)
    );

    const result = await executeSwap(quote, TEST_SIGNER, rpcClients as never, mockExecuteSwapApi);

    expect(result.status).toBe('success');
    expect(result.txId).toBe(MOCK_SIGNATURE);
  });

  it('reports failure when the cluster confirms the transaction failed', async () => {
    const rpcClients = {
      rpc: {
        getSignatureStatuses: () => ({
          send: async () => ({
            value: [{ err: { InstructionError: [0, 'SlippageToleranceExceeded'] } }],
          }),
        }),
      },
      rpcSubscriptions: {
        signatureNotifications: () => ({
          subscribe: async () =>
            (async function* () {
              yield { value: { err: { InstructionError: [0, 'SlippageToleranceExceeded'] } } };
            })(),
        }),
      },
    };

    const quote: SwapQuote = { ...MOCK_SWAP_ORDER, networkId: 'solana-mainnet' };
    if (!quote.custom) quote.custom = {} as any;
    quote.custom.transaction = createMockVersionedTransactionBase64(
      new PublicKey(TEST_SIGNER.address)
    );

    const result = await executeSwap(quote, TEST_SIGNER, rpcClients as never, mockExecuteSwapApi);

    expect(result.status).toBe('fail');
    expect(result.txId).toBe(MOCK_SIGNATURE);
    expect(result.error).toContain('SlippageToleranceExceeded');
  });

  it('should include request ID in execution', async () => {
    const quote: SwapQuote = {
      ...MOCK_SWAP_ORDER,
      networkId: 'solana-mainnet',
      custom: {
        ...MOCK_SWAP_ORDER.custom,
        requestId: 'custom-request-id',
        transaction: createMockVersionedTransactionBase64(new PublicKey(TEST_SIGNER.address)),
      },
    };

    await executeSwap(quote, TEST_SIGNER, undefined, mockExecuteSwapApi);

    expect(mockExecuteSwapApi).toHaveBeenCalledWith(
      'solana-mainnet',
      expect.any(String),
      'custom-request-id'
    );
  });
});

// ============================================================================
// Tests: swap (Combined function)
// ============================================================================

describe('swap', () => {
  beforeEach(() => {
    mockGetSwapOrder = vi.fn<GetSwapOrderFn>().mockResolvedValue(MOCK_SWAP_ORDER);
    mockExecuteSwapApi = vi.fn<ExecuteSwapApiFn>().mockResolvedValue(MOCK_SWAP_SUCCESS);
    mockGetTokenList = vi.fn<GetTokenListFn>().mockResolvedValue(MOCK_TOKEN_LIST);
  });

  it('should get quote and execute swap in one call', async () => {
    const params: SwapQuoteParams = {
      inputMint: SOL_ADDRESS,
      outputMint: USDC_MINT,
      amount: 1.0,
      publicKey: TEST_PUBLIC_KEY,
    };

    const mockSwapOrder = {
      ...MOCK_SWAP_ORDER,
      custom: {
        ...MOCK_SWAP_ORDER.custom,
        transaction: createMockVersionedTransactionBase64(new PublicKey(TEST_SIGNER.address)),
      },
    };
    mockGetSwapOrder.mockResolvedValue(mockSwapOrder);

    const result = await swap(
      'solana-mainnet',
      params,
      TEST_SIGNER,
      undefined,
      mockGetSwapOrder,
      mockExecuteSwapApi,
      mockGetTokenList
    );

    expect(result.status).toBe('success');
    expect(result.txId).toBe(MOCK_SIGNATURE);

    expect(mockGetSwapOrder).toHaveBeenCalled();
    expect(mockExecuteSwapApi).toHaveBeenCalled();
  });

  it('should propagate quote errors', async () => {
    mockGetSwapOrder.mockResolvedValue(null);

    const params: SwapQuoteParams = {
      inputMint: SOL_ADDRESS,
      outputMint: USDC_MINT,
      amount: 1.0,
      publicKey: TEST_PUBLIC_KEY,
    };

    await expect(
      swap(
        'solana-mainnet',
        params,
        TEST_SIGNER,
        undefined,
        mockGetSwapOrder,
        mockExecuteSwapApi,
        mockGetTokenList
      )
    ).rejects.toThrow('Failed to get swap quote');
  });

  it('should propagate execution errors', async () => {
    const mockSwapOrder = {
      ...MOCK_SWAP_ORDER,
      custom: {
        ...MOCK_SWAP_ORDER.custom,
        transaction: createMockVersionedTransactionBase64(new PublicKey(TEST_SIGNER.address)),
      },
    };
    mockGetSwapOrder.mockResolvedValue(mockSwapOrder);
    mockExecuteSwapApi.mockResolvedValue(MOCK_SWAP_FAILURE);

    const params: SwapQuoteParams = {
      inputMint: SOL_ADDRESS,
      outputMint: USDC_MINT,
      amount: 1.0,
      publicKey: TEST_PUBLIC_KEY,
    };

    const result = await swap(
      'solana-mainnet',
      params,
      TEST_SIGNER,
      undefined,
      mockGetSwapOrder,
      mockExecuteSwapApi,
      mockGetTokenList
    );

    expect(result.status).toBe('fail');
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// Tests: Helper Functions
// ============================================================================

describe('getExpectedOutput', () => {
  const mockQuote: SwapQuote = {
    ...MOCK_SWAP_ORDER,
    networkId: 'solana-mainnet',
  };

  it('should calculate expected output using quote decimals', () => {
    const output = getExpectedOutput(mockQuote);
    expect(output).toBe(5);
  });

  it('should calculate expected output using provided decimals', () => {
    const output = getExpectedOutput(mockQuote, 6);
    expect(output).toBe(5);
  });

  it('should default to 9 decimals when no decimals provided', () => {
    const quoteWithoutDecimals: SwapQuote = {
      ...mockQuote,
      output: {
        ...mockQuote.output!,
        decimals: undefined as any, // Remove decimals to test default
      },
    };
    const output = getExpectedOutput(quoteWithoutDecimals);
    expect(output).toBe(0.005);
  });
});

describe('getMinimumOutput', () => {
  const mockQuote: SwapQuote = {
    ...MOCK_SWAP_ORDER,
    networkId: 'solana-mainnet',
  };

  it('should calculate minimum output using quote decimals', () => {
    const output = getMinimumOutput(mockQuote);
    expect(output).toBe(4.95);
  });

  it('should calculate minimum output using provided decimals', () => {
    const output = getMinimumOutput(mockQuote, 6);
    expect(output).toBe(4.95);
  });

  it('should be less than expected output due to slippage', () => {
    const expected = getExpectedOutput(mockQuote);
    const minimum = getMinimumOutput(mockQuote);
    expect(minimum).toBeLessThan(expected);
  });
});

describe('getPriceImpact', () => {
  const createMockQuote = (priceImpact: string): SwapQuote => ({
    ...MOCK_SWAP_ORDER,
    networkId: 'solana-mainnet',
    custom: {
      ...MOCK_SWAP_ORDER.custom,
      priceImpact: parseFloat(priceImpact),
    },
  });

  it('should extract price impact from quote', () => {
    const quote = createMockQuote('0.12');
    const impact = getPriceImpact(quote);
    expect(impact).toBe(0.12);
  });

  it('should handle zero price impact', () => {
    const quote = createMockQuote('0.00');
    const impact = getPriceImpact(quote);
    expect(impact).toBe(0.0);
  });

  it('should handle high price impact', () => {
    const quote = createMockQuote('5.67');
    const impact = getPriceImpact(quote);
    expect(impact).toBe(5.67);
  });

  it('should handle negative price impact', () => {
    const quote = createMockQuote('-0.05');
    const impact = getPriceImpact(quote);
    expect(impact).toBe(-0.05);
  });
});

// ============================================================================
// Integration Tests (Conditional)
// ============================================================================

describe('Integration: Swap with Backend', () => {
  it('should get real swap quote from backend', async () => {
    if (!LIVE_TEST_PUBLIC_KEY) {
      console.log('Skipping live swap backend: SALMON_TEST_LIVE_WALLET not set');
      return;
    }
    const liveBackendBaseUrl = backendBaseUrl ?? (await getReachableBackendBaseUrl());
    if (!liveBackendBaseUrl) {
      console.log('Skipping live swap backend assertions: backend not reachable');
      return;
    }

    const liveClient = createApiClient({
      baseUrl: liveBackendBaseUrl,
      timeout: 10000,
    });

    const liveGetSwapOrder: GetSwapOrderFn = async (networkId, requestParams) => {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const { data } = await liveClient.get<SwapOrderResponse>(
            `/v1/${networkId}/ft/swap/order`,
            { params: requestParams }
          );
          return data;
        } catch (error: unknown) {
          if (
            typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            (error as { status?: number }).status === 404
          ) {
            return null;
          }

          if (attempt === 2) {
            throw error;
          }
        }
      }

      return null;
    };

    const params: SwapQuoteParams = {
      inputMint: SOL_ADDRESS,
      outputMint: USDC_MINT,
      amount: 0.001,
      publicKey: LIVE_TEST_PUBLIC_KEY,
    };

    const quote = await getSwapQuote('solana-mainnet', params, {}, liveGetSwapOrder);

    expect(quote).toBeDefined();
    expect(quote.networkId).toBe('solana-mainnet');
    expect(quote.custom?.requestId).toBeDefined();
    expect(quote.custom?.transaction).toBeDefined();
    expect(quote.output?.amount).toBeDefined();
  });
});
