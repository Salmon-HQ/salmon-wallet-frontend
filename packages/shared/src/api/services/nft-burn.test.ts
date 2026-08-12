import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PreparedNftTransactionResponse } from '../../types/nft';

vi.mock('../client', async () => {
  const actual = await vi.importActual<typeof import('../client')>('../client');

  return {
    ...actual,
    apiClient: {
      post: vi.fn(),
    },
  };
});

import { apiClient } from '../client';
import { createBurnTransaction } from './nft-burn';

const mockApiClientPost = vi.mocked(apiClient.post);

const MOCK_TRANSACTION: PreparedNftTransactionResponse = {
  transaction: 'base64-serialized-transaction',
  message: 'ready',
};

const MOCK_MULTI_STEP_TRANSACTION: PreparedNftTransactionResponse = {
  transactions: [
    {
      transaction: 'base64-step-1',
      step: 'createLookupTable',
    },
  ],
  lookupTable: {
    required: true,
    estimatedRentLamports: 1000,
    estimatedRentSol: 0.000001,
    addressCount: 32,
    extendTransactionCount: 1,
  },
};

describe('NFT burn service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts burn params and accepts single transaction responses', async () => {
    mockApiClientPost.mockResolvedValueOnce({ data: MOCK_TRANSACTION });

    const result = await createBurnTransaction({
      mintAddress: 'mint-1',
      ownerAddress: 'owner-1',
    });

    expect(mockApiClientPost).toHaveBeenCalledWith(
      '/v1/solana-mainnet/nft/mint-1',
      undefined,
      {
        params: {
          owner: 'owner-1',
        },
      },
    );
    expect(result).toEqual(MOCK_TRANSACTION);
  });

  it('accepts multi-step burn transaction responses', async () => {
    mockApiClientPost.mockResolvedValueOnce({ data: MOCK_MULTI_STEP_TRANSACTION });

    const result = await createBurnTransaction({
      mintAddress: 'mint-2',
      ownerAddress: 'owner-2',
    });

    expect(mockApiClientPost).toHaveBeenCalledWith(
      '/v1/solana-mainnet/nft/mint-2',
      undefined,
      {
        params: {
          owner: 'owner-2',
        },
      },
    );
    expect(result).toEqual(MOCK_MULTI_STEP_TRANSACTION);
  });

  it('throws when burn response does not contain any transaction payload', async () => {
    mockApiClientPost.mockResolvedValueOnce({ data: { message: 'missing tx' } });

    await expect(
      createBurnTransaction({
        mintAddress: 'mint-3',
        ownerAddress: 'owner-3',
      }),
    ).rejects.toThrow('Burn transaction was not returned by the API');
  });
});
