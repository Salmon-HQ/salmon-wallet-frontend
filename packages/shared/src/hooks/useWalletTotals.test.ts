/**
 * The aggregated total on the wallets screen (CORE 10, FR-005).
 *
 * Arithmetic only — the query layer is `useQueries` reading a cache the rest
 * of the app fills, and the thing that can actually go wrong here is which
 * wallets get counted.
 */
import { describe, expect, it } from 'vitest';

import { sumIncludedTotals, walletBalanceEntries } from './useWalletTotals';
import type { Account } from '../types/account';
import type { BlockchainAccount, NetworkId } from '../types/blockchain';

const NETWORK = 'solana-mainnet' as NetworkId;

const blockchainAccount = (address: string) =>
  ({ getReceiveAddress: () => address }) as unknown as BlockchainAccount;

const wallet = (id: string, addresses: (string | null)[]): Account =>
  ({
    id,
    name: id,
    avatar: '',
    secret: { kind: 'mnemonic', mnemonic: 'seed' },
    pathIndexes: {},
    networksAccounts: {
      [NETWORK]: addresses.map((address) => (address ? blockchainAccount(address) : null)),
    },
  }) as unknown as Account;

describe('sumIncludedTotals', () => {
  it('adds up every wallet when nothing is excluded', () => {
    expect(sumIncludedTotals(['a', 'b', 'c'], [], { a: 10, b: 2.5, c: 0.25 })).toBe(12.75);
  });

  it('leaves out the wallets the user excluded', () => {
    expect(sumIncludedTotals(['a', 'b', 'c'], ['b'], { a: 10, b: 2.5, c: 0.25 })).toBe(10.25);
  });

  it('counts a wallet with no answer yet as zero rather than dropping the sum', () => {
    expect(sumIncludedTotals(['a', 'b'], [], { a: 10, b: undefined })).toBe(10);
  });

  it('is zero when every wallet is excluded — the screen must never let this happen', () => {
    expect(sumIncludedTotals(['a', 'b'], ['a', 'b'], { a: 10, b: 5 })).toBe(0);
  });

  it('ignores exclusions for wallets that no longer exist', () => {
    expect(sumIncludedTotals(['a'], ['gone'], { a: 7 })).toBe(7);
  });
});

describe('walletBalanceEntries', () => {
  it('prices every derived account a wallet holds, not just the one in use', () => {
    // The wallets screen answers "what is in this wallet"; a seed's money is
    // spread across its paths, so all of them count (owner, 2026-09-02).
    const entries = walletBalanceEntries([wallet('a', ['A0', 'A1', 'A2'])], NETWORK);

    expect(entries.map((entry) => [entry.walletId, entry.index, entry.address])).toEqual([
      ['a', 0, 'A0'],
      ['a', 1, 'A1'],
      ['a', 2, 'A2'],
    ]);
  });

  it('skips the holes in a derivation tree', () => {
    const entries = walletBalanceEntries([wallet('a', ['A0', null, 'A2'])], NETWORK);
    expect(entries.map((entry) => entry.index)).toEqual([0, 2]);
  });

  it('leaves a hidden derived account out of the total', () => {
    const entries = walletBalanceEntries([wallet('a', ['A0', 'A1', 'A2'])], NETWORK, { a: [1] });
    expect(entries.map((entry) => entry.index)).toEqual([0, 2]);
  });

  it('hides per wallet, never across wallets', () => {
    const entries = walletBalanceEntries(
      [wallet('a', ['A0', 'A1']), wallet('b', ['B0', 'B1'])],
      NETWORK,
      { a: [1] }
    );
    expect(entries.map((entry) => `${entry.walletId}${entry.index}`)).toEqual(['a0', 'b0', 'b1']);
  });

  it('prices nothing until the screen knows which chain it is reading', () => {
    expect(walletBalanceEntries([wallet('a', ['A0'])], undefined)).toEqual([]);
  });
});
