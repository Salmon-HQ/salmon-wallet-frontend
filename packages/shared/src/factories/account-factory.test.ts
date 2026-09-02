/**
 * A wallet created at a derived path.
 *
 * Position in `networksAccounts` is the derivation index everywhere else in
 * this codebase — `getDefaultPathIndex` reads it with `findIndex(Boolean)`,
 * and storage rebuilds the stored path indexes from it. A wallet created at
 * index 2 that parked its account at position 0 therefore came back as index 0
 * on the next unlock, at the seed's first address instead of its own; spec 025
 * makes that path the normal way a wallet arrives, so it is pinned here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createAccount } from './account-factory';

vi.mock('../utils/avatar', () => ({ getRandomAvatar: () => 'avatar' }));
vi.mock('../utils/account', () => ({
  generateAccountId: () => 'id',
  createBlockchainAccountForNetwork: vi.fn(
    async (networkId: string, _m: string, index: number) => ({
      getReceiveAddress: () => `${networkId}-${index}`,
    })
  ),
  createBlockchainAccountFromPrivateKey: vi.fn(),
  createBlockchainAccountForWatchOnly: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createAccount', () => {
  it('puts the account at its own derivation index, with holes before it', async () => {
    const { account } = await createAccount({
      name: 'Account 2',
      mnemonic: 'twelve words go here',
      networkIds: ['solana-mainnet'],
      startIndex: 2,
      derivedFrom: 'wallet-1',
    });

    const solana = account.networksAccounts['solana-mainnet'];
    expect(solana).toHaveLength(3);
    expect(solana[0]).toBeNull();
    expect(solana[1]).toBeNull();
    expect(solana[2]?.getReceiveAddress?.()).toBe('solana-mainnet-2');
    expect(account.pathIndexes['solana-mainnet']).toEqual([null, null, 2]);
    expect(account.derivedFrom).toBe('wallet-1');
  });

  it('leaves a wallet nobody derived without a descent', async () => {
    const { account } = await createAccount({
      name: 'Account 1',
      mnemonic: 'twelve words go here',
      networkIds: ['solana-mainnet'],
    });

    expect(account.networksAccounts['solana-mainnet']).toHaveLength(1);
    expect(account.derivedFrom).toBeUndefined();
  });
});
