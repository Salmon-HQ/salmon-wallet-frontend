import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../client', async () => {
  const actual = await vi.importActual<typeof import('../client')>('../client');
  return { ...actual, apiClient: { get: vi.fn() } };
});

import { apiClient } from '../client';
import { getSkrStake, getStakeAccounts } from './staking';

const get = vi.mocked(apiClient.get);
const WALLET = 'CzNRNm6vbDiJ2MG96Lw4gSZW1gSjeV6DgSEAjCULxXcJ';

beforeEach(() => vi.clearAllMocks());

describe('getStakeAccounts', () => {
  it("reads the wallet's stake accounts on the network", async () => {
    const body = { epoch: 1052, usdPrice: 108.2, data: [] };
    get.mockResolvedValueOnce({ data: body });

    await expect(getStakeAccounts('solana-mainnet', WALLET)).resolves.toEqual(body);
    expect(get).toHaveBeenCalledWith(`/v1/solana-mainnet/account/${WALLET}/stakes`, {
      timeout: 15000,
    });
  });
});

describe('getSkrStake', () => {
  it('reads the SKR position on mainnet', async () => {
    const body = { mint: 'SKR', decimals: 6, positions: [] };
    get.mockResolvedValueOnce({ data: body });

    await expect(getSkrStake(WALLET)).resolves.toEqual(body);
    expect(get).toHaveBeenCalledWith('/v1/solana-mainnet/skr/stake', {
      params: { owner: WALLET },
      timeout: 15000,
    });
  });
});
