/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../blockchain/solana/swap', () => ({
  getSwapQuote: vi.fn(),
  executeSwap: vi.fn(),
  parseQuoteInfo: vi.fn(),
}));

vi.mock('../api/services/solana', () => ({
  getSwapOrder: vi.fn(),
  executeSwapApi: vi.fn(),
}));

vi.mock('../api/services/tokens', () => ({
  getTokenList: vi.fn(),
}));

import { useSwap } from './useSwap';
import {
  getSwapQuote as getSwapQuoteService,
  executeSwap as executeSwapService,
  parseQuoteInfo,
} from '../blockchain/solana/swap';

const mockGetSwapQuoteService = vi.mocked(getSwapQuoteService);
const mockExecuteSwapService = vi.mocked(executeSwapService);
const mockParseQuoteInfo = vi.mocked(parseQuoteInfo);

const QUOTE = {
  output: {
    amount: '2500000',
    decimals: 6,
    symbol: 'USDC',
  },
  custom: {
    priceImpact: 0.42,
    swapMode: 'ExactIn',
    slippageBps: 50,
  },
} as any;

const QUOTE_INFO = {
  expectedOutput: 2.5,
  minimumOutput: 2.49,
  priceImpact: 0.42,
  route: {
    slippageBps: 50,
    swapMode: 'ExactIn',
    routeLabels: ['Jupiter'],
  },
} as any;

const RPC = { name: 'mock-rpc' };
const RPC_SUBSCRIPTIONS = { name: 'mock-rpc-subscriptions' };

const ACCOUNT = {
  getPublicKey: () => 'wallet-public-key',
  getRpc: vi.fn().mockReturnValue(RPC),
  getRpcSubscriptions: vi.fn().mockReturnValue(RPC_SUBSCRIPTIONS),
  signer: { address: 'wallet-public-key' },
};

describe('useSwap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSwapQuoteService.mockResolvedValue(QUOTE);
    mockExecuteSwapService.mockResolvedValue({
      txId: 'swap-signature',
      status: 'success',
    });
    mockParseQuoteInfo.mockReturnValue(QUOTE_INFO);
  });

  it('returns an error when requesting a quote without an account', async () => {
    const { result } = renderHook(() =>
      useSwap({
        account: undefined,
        networkId: 'solana-mainnet',
      })
    );

    let quote = null;
    await act(async () => {
      quote = await result.current.getQuote({
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1,
      });
    });

    expect(quote).toBeNull();
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBe('swap.errors.noActiveAccount');
    expect(result.current.isError).toBe(true);
  });

  it('fetches a quote, parses it, and exposes quote-ready state', async () => {
    const { result } = renderHook(() =>
      useSwap({
        account: ACCOUNT as any,
        networkId: 'solana-mainnet',
      })
    );

    await act(async () => {
      await result.current.getQuote({
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.5,
        inputDecimals: 9,
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe('quote-ready');
    });

    expect(mockGetSwapQuoteService).toHaveBeenCalledWith(
      'solana-mainnet',
      {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.5,
        publicKey: 'wallet-public-key',
        slippageBps: 50,
        swapMode: undefined,
        dynamicSlippage: undefined,
        priorityLevel: undefined,
      },
      { inputDecimals: 9 },
      expect.any(Function),
      expect.any(Function)
    );
    expect(mockParseQuoteInfo).toHaveBeenCalledWith(QUOTE);
    expect(result.current.quote).toBe(QUOTE);
    expect(result.current.quoteInfo).toBe(QUOTE_INFO);
    expect(result.current.error).toBeNull();
  });

  it('moves to failed state when quote fetching throws', async () => {
    mockGetSwapQuoteService.mockRejectedValueOnce(new Error('quote backend down'));

    const { result } = renderHook(() =>
      useSwap({
        account: ACCOUNT as any,
        networkId: 'solana-mainnet',
      })
    );

    await act(async () => {
      const quote = await result.current.getQuote({
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1,
      });

      expect(quote).toBeNull();
    });

    expect(result.current.status).toBe('failed');
    // Raw provider text is classified into an i18n key for the public state.
    expect(result.current.error).toBe('transaction.errors.generic');
    expect(result.current.quote).toBeNull();
  });

  it('rejects execution when there is no quote yet', async () => {
    const { result } = renderHook(() =>
      useSwap({
        account: ACCOUNT as any,
        networkId: 'solana-mainnet',
      })
    );

    let executionResult;
    await act(async () => {
      executionResult = await result.current.executeSwap();
    });

    expect(executionResult).toEqual({
      txId: null,
      status: 'fail',
      error: 'swap.errors.noQuote',
    });
    expect(result.current.status).toBe('failed');
    expect(result.current.error).toBe('swap.errors.noQuote');
  });

  it('executes a fetched quote and stores the tx id on success', async () => {
    const { result } = renderHook(() =>
      useSwap({
        account: ACCOUNT as any,
        networkId: 'solana-mainnet',
      })
    );

    await act(async () => {
      await result.current.getQuote({
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1,
      });
    });

    let executionResult;
    await act(async () => {
      executionResult = await result.current.executeSwap();
    });

    expect(ACCOUNT.getRpc).toHaveBeenCalledTimes(1);
    expect(mockExecuteSwapService).toHaveBeenCalledWith(
      QUOTE,
      ACCOUNT.signer,
      { rpc: RPC, rpcSubscriptions: RPC_SUBSCRIPTIONS },
      expect.any(Function)
    );
    expect(executionResult).toEqual({
      txId: 'swap-signature',
      status: 'success',
    });
    expect(result.current.status).toBe('success');
    expect(result.current.txId).toBe('swap-signature');
    expect(result.current.error).toBeNull();
  });

  it('keeps failed execution errors observable and resettable', async () => {
    mockExecuteSwapService.mockResolvedValueOnce({
      txId: null,
      status: 'fail',
      error: 'simulation failed',
    });

    const { result } = renderHook(() =>
      useSwap({
        account: ACCOUNT as any,
        networkId: 'solana-mainnet',
      })
    );

    await act(async () => {
      await result.current.getQuote({
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1,
      });
    });

    await waitFor(() => {
      expect(result.current.quote).toBe(QUOTE);
    });

    await act(async () => {
      await result.current.executeSwap();
    });

    expect(result.current.status).toBe('failed');
    // Raw text stays on the SwapResult; the public state carries the key.
    expect(result.current.error).toBe('transaction.errors.generic');

    act(() => {
      result.current.clearQuote();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.quote).toBeNull();
    expect(result.current.quoteInfo).toBeNull();

    act(() => {
      result.current.reset();
    });
    expect(result.current.txId).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe('idle');
  });
});
