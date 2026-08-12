/**
 * Tests for scanDerivedAccounts — especially the failure signal that keeps a
 * total RPC outage from presenting as "no accounts found".
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../factories/account-factory', () => ({
  deriveBlockchainAccount: vi.fn(),
}));

import { deriveBlockchainAccount } from '../factories/account-factory';
import { scanDerivedAccounts } from './derived-accounts';

const MNEMONIC = 'test test test test test test test test test test test junk';

const mockDerive = vi.mocked(deriveBlockchainAccount);

function makeAccount(networkId: string, index: number) {
  return {
    getReceiveAddress: () => `addr-${networkId}-${index}`,
    path: `m/44'/0'/${index}'`,
  } as never;
}

describe('scanDerivedAccounts', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns index-1 accounts and no failed networks on a clean scan', async () => {
    mockDerive.mockImplementation(async (_m, networkId, index) =>
      makeAccount(networkId, index ?? 0)
    );

    const result = await scanDerivedAccounts(
      MNEMONIC,
      ['solana-mainnet', 'bitcoin-mainnet'],
      async () => 0
    );

    expect(result.failedNetworks).toEqual([]);
    // Only index 1 is included when nothing is funded.
    expect(result.accounts.map((a) => `${a.networkId}-${a.index}`)).toEqual([
      'solana-mainnet-1',
      'bitcoin-mainnet-1',
    ]);
  });

  it('reports every network once in failedNetworks when all networks throw', async () => {
    mockDerive.mockRejectedValue(new Error('rpc down'));

    const result = await scanDerivedAccounts(
      MNEMONIC,
      ['solana-mainnet', 'bitcoin-mainnet'],
      async () => 0
    );

    expect(result.accounts).toEqual([]);
    // Each network threw at every index, but is listed exactly once.
    expect(result.failedNetworks.sort()).toEqual(['bitcoin-mainnet', 'solana-mainnet']);
  });

  it('keeps healthy networks while flagging only the failing one', async () => {
    mockDerive.mockImplementation(async (_m, networkId, index) => {
      if (networkId === 'bitcoin-mainnet') throw new Error('rpc down');
      return makeAccount(networkId, index ?? 0);
    });

    const result = await scanDerivedAccounts(
      MNEMONIC,
      ['solana-mainnet', 'bitcoin-mainnet'],
      async () => 0
    );

    expect(result.failedNetworks).toEqual(['bitcoin-mainnet']);
    expect(result.accounts.map((a) => `${a.networkId}-${a.index}`)).toEqual(['solana-mainnet-1']);
  });
});
