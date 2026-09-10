import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return { ...actual, apiClient: { get: vi.fn(), post: vi.fn() } };
});

import { ApiError, apiClient } from '../../api/client';
import { buildSwap } from './api';
import { describeSwapBuildError } from './errors';

const mockGet = vi.mocked(apiClient.get);

describe('buildSwap', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks mainnet for a build with the taker and one amount form', async () => {
    mockGet.mockResolvedValueOnce({ data: { provider: '0x' } });

    const result = await buildSwap({
      inputMint: 'mint-in',
      outputMint: 'mint-out',
      uiAmount: '1.5',
      publicKey: 'wallet-1',
    });

    expect(mockGet).toHaveBeenCalledWith('/v1/solana-mainnet/ft/swap/build', {
      params: {
        inputMint: 'mint-in',
        outputMint: 'mint-out',
        publicKey: 'wallet-1',
        uiAmount: '1.5',
      },
    });
    expect(result).toEqual({ provider: '0x' });
  });

  it('forwards slippage and base-unit amounts when given', async () => {
    mockGet.mockResolvedValueOnce({ data: {} });
    await buildSwap({
      inputMint: 'a',
      outputMint: 'b',
      amount: '1000000',
      slippageBps: 100,
      publicKey: 'w',
    });
    expect(mockGet.mock.calls[0][1]).toEqual({
      params: {
        inputMint: 'a',
        outputMint: 'b',
        publicKey: 'w',
        amount: '1000000',
        slippageBps: 100,
      },
    });
  });

  // The error code is what the screen renders from: a build that swallowed
  // it into `null` would turn "not available in your region" into a generic
  // quote failure.
  it('throws the ApiError unchanged', async () => {
    const error = new ApiError('forbidden', 403, 'region_restricted');
    mockGet.mockRejectedValueOnce(error);
    await expect(buildSwap({ inputMint: 'a', outputMint: 'b', publicKey: 'w' })).rejects.toBe(
      error
    );
  });
});

describe('describeSwapBuildError', () => {
  it.each([
    ['region_restricted', 403, { kind: 'unavailable', reason: 'region' }],
    ['wallet_restricted', 403, { kind: 'unavailable', reason: 'wallet' }],
    ['no_route', 404, { kind: 'message', message: 'transaction.errors.noRoute' }],
    ['upstream_rate_limited', 503, { kind: 'message', message: 'transaction.errors.networkBusy' }],
    ['unknown_mint', 400, { kind: 'message', message: 'swap.errors.unknownToken' }],
    ['invalid_parameter', 400, { kind: 'message', message: 'swap.errors.quoteFailed' }],
    ['provider_fee_mismatch', 502, { kind: 'message', message: 'swap.errors.quoteFailed' }],
  ])('maps %s to its state', (code, status, expected) => {
    expect(describeSwapBuildError(new ApiError('x', status, code))).toEqual(expected);
  });

  it('reads a dropped connection and an unnamed 5xx as the network being busy', () => {
    expect(describeSwapBuildError(new ApiError('x', 0))).toEqual({
      kind: 'message',
      message: 'transaction.errors.networkBusy',
    });
    expect(describeSwapBuildError(new ApiError('x', 500))).toEqual({
      kind: 'message',
      message: 'transaction.errors.networkBusy',
    });
  });

  it('falls back to the generic quote failure for anything else', () => {
    expect(describeSwapBuildError(new Error('boom'))).toEqual({
      kind: 'message',
      message: 'swap.errors.quoteFailed',
    });
  });
});
