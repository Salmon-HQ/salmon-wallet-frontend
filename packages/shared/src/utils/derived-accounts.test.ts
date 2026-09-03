/**
 * Tests for scanDerivedAccounts — especially the failure signal that keeps a
 * total RPC outage from presenting as "no accounts found".
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../factories/account-factory', () => ({
  deriveBlockchainAccount: vi.fn(),
}));

import { deriveBlockchainAccount } from '../factories/account-factory';
import { ensureMirrorNetworks, scanDerivedAccounts } from './derived-accounts';

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

// ============================================================================
// ensureMirrorNetworks — the lazy half of "every wallet holds every network"
// ============================================================================

function mirrorAccount(networkId: string, index: number) {
  return {
    network: { id: networkId },
    index,
    getReceiveAddress: () => `addr-${networkId}-${index}`,
  } as never;
}

function walletHolding(
  networksAccounts: Record<string, unknown[]>,
  secret: { kind: string; mnemonic?: string } = { kind: 'mnemonic', mnemonic: MNEMONIC }
) {
  return {
    id: 'wallet-1',
    name: 'Wallet 1',
    avatar: 'a',
    secret,
    pathIndexes: {},
    networksAccounts,
  } as never;
}

describe('ensureMirrorNetworks', () => {
  beforeEach(() => {
    mockDerive.mockClear();
    mockDerive.mockImplementation(async (_m, networkId, index) =>
      mirrorAccount(networkId, index ?? 0)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('derives the missing mirror at the same position as its mainnet sibling', async () => {
    // A wallet derived at index 3: holes at 0-2, the account at 3.
    const account = walletHolding({
      'solana-mainnet': [null, null, null, mirrorAccount('solana-mainnet', 3)],
    });

    const derived = await ensureMirrorNetworks(account, ['solana-devnet']);

    expect(mockDerive).toHaveBeenCalledTimes(1);
    expect(mockDerive).toHaveBeenCalledWith(MNEMONIC, 'solana-devnet', 3);
    expect(derived).toHaveLength(1);
    expect(derived[0].index).toBe(3);
  });

  it('derives one mirror per occupied position', async () => {
    const account = walletHolding({
      'bitcoin-mainnet': [
        mirrorAccount('bitcoin-mainnet', 0),
        null,
        mirrorAccount('bitcoin-mainnet', 2),
      ],
    });

    const derived = await ensureMirrorNetworks(account, ['bitcoin-testnet']);

    expect(derived.map((a) => a.index)).toEqual([0, 2]);
  });

  it('does nothing when the wallet already holds the mirror', async () => {
    const account = walletHolding({
      'solana-mainnet': [mirrorAccount('solana-mainnet', 0)],
      'solana-devnet': [mirrorAccount('solana-devnet', 0)],
    });

    expect(await ensureMirrorNetworks(account, ['solana-devnet'])).toEqual([]);
    expect(mockDerive).not.toHaveBeenCalled();
  });

  it('does nothing for a mainnet, or for a mirror whose sibling is not held', async () => {
    const account = walletHolding({
      'solana-mainnet': [mirrorAccount('solana-mainnet', 0)],
    });

    expect(await ensureMirrorNetworks(account, ['solana-mainnet', 'bitcoin-testnet'])).toEqual([]);
    expect(mockDerive).not.toHaveBeenCalled();
  });

  it('has no derivation tree to complete on a watch-only wallet', async () => {
    const account = walletHolding(
      { 'solana-mainnet': [mirrorAccount('solana-mainnet', 0)] },
      { kind: 'watchOnly' }
    );

    expect(await ensureMirrorNetworks(account, ['solana-devnet'])).toEqual([]);
    expect(mockDerive).not.toHaveBeenCalled();
  });
});
