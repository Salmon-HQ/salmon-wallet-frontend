/**
 * @vitest-environment jsdom
 *
 * The Wallets screen's aggregation, held once for both platforms: the
 * included-in-total set, the aggregated total, the families the screen
 * lists, and the "keep one included" refusal. Its per-card twin,
 * `useWalletCardDerived`, is the derived-path chips and rescan eligibility
 * one wallet card draws.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setIncludedInTotal = vi.fn(() => Promise.resolve());
let excludedFromTotal: string[] = [];

vi.mock('./useUserConfig', () => ({
  useUserConfig: () => ({ excludedFromTotal, setIncludedInTotal }),
}));
vi.mock('./useBalance', () => ({
  useBalance: () => ({ hiddenBalance: false, toggleHidden: vi.fn() }),
}));
vi.mock('./useWalletTotals', () => ({
  useWalletTotals: ({ accounts }: { accounts: { id: string }[] }) => ({
    totals: Object.fromEntries(accounts.map((a, i) => [a.id, (i + 1) * 10])),
  }),
  sumIncludedTotals: (walletIds: string[], excluded: string[], totals: Record<string, number>) =>
    walletIds.reduce((sum, id) => (excluded.includes(id) ? sum : sum + (totals[id] ?? 0)), 0),
}));

import { useWalletCardDerived, useWalletsScreen } from './useWalletsScreen';

const account = (id: string, over: Record<string, unknown> = {}) =>
  ({ id, secret: { kind: 'watchOnly' }, ...over }) as never;

describe('useWalletsScreen', () => {
  beforeEach(() => {
    excludedFromTotal = [];
    vi.clearAllMocks();
  });

  it('sums every wallet when nothing is excluded', () => {
    const { result } = renderHook(() =>
      useWalletsScreen({
        accounts: [account('a'), account('b')],
        networkId: 'solana-mainnet',
        activeBlockchainAccount: {},
        includeSpam: false,
      })
    );
    // totals: a=10, b=20
    expect(result.current.aggregated).toBe(30);
    expect(result.current.includedCount).toBe(2);
  });

  it('groups a derived wallet under its parent', () => {
    const parent = account('p');
    const child = account('c', { derivedFrom: 'p' });
    const { result } = renderHook(() =>
      useWalletsScreen({
        accounts: [parent, child],
        networkId: 'solana-mainnet',
        activeBlockchainAccount: {},
        includeSpam: false,
      })
    );
    expect(result.current.families).toEqual([{ parent, derived: [child] }]);
  });

  it('refuses to exclude the last included wallet, and leaves it included', () => {
    excludedFromTotal = ['b'];
    const { result } = renderHook(() =>
      useWalletsScreen({
        accounts: [account('a'), account('b')],
        networkId: 'solana-mainnet',
        activeBlockchainAccount: {},
        includeSpam: false,
      })
    );
    expect(result.current.includedCount).toBe(1);

    let refused = false;
    act(() => {
      refused = result.current.toggleInclude('a');
    });
    expect(refused).toBe(true);
    expect(setIncludedInTotal).not.toHaveBeenCalled();
  });

  it('toggles inclusion when it is not the last one', () => {
    const { result } = renderHook(() =>
      useWalletsScreen({
        accounts: [account('a'), account('b')],
        networkId: 'solana-mainnet',
        activeBlockchainAccount: {},
        includeSpam: false,
      })
    );

    let refused = true;
    act(() => {
      refused = result.current.toggleInclude('a');
    });
    expect(refused).toBe(false);
    expect(setIncludedInTotal).toHaveBeenCalledWith('a', false);
  });
});

describe('useWalletCardDerived', () => {
  it('carries no chips for a wallet with a single held path', () => {
    const { result } = renderHook(() =>
      useWalletCardDerived({
        account: account('a', {
          networksAccounts: { 'solana-mainnet': [{ getReceiveAddress: () => 'addr1' }] },
        }),
        networkId: 'solana-mainnet',
      })
    );
    expect(result.current.derived).toEqual([]);
  });

  it('lists every held path, skipping the holes, once there are two or more', () => {
    const { result } = renderHook(() =>
      useWalletCardDerived({
        account: account('a', {
          networksAccounts: {
            'solana-mainnet': [
              { getReceiveAddress: () => 'addr0' },
              null,
              { getReceiveAddress: () => 'addr2' },
            ],
          },
        }),
        networkId: 'solana-mainnet',
      })
    );
    expect(result.current.derived).toEqual([
      { index: 0, address: 'addr0' },
      { index: 2, address: 'addr2' },
    ]);
  });

  const mnemonicSecret = { kind: 'mnemonic', mnemonic: 'abandon abandon abandon' };

  it('is eligible for a rescan on a seed with no parent', () => {
    const { result } = renderHook(() =>
      useWalletCardDerived({
        account: account('a', { secret: mnemonicSecret }),
        networkId: 'solana-mainnet',
      })
    );
    expect(result.current.canRescanEligible).toBe(true);
  });

  it('is ineligible for a wallet derived from another seed', () => {
    const { result } = renderHook(() =>
      useWalletCardDerived({
        account: account('a', { secret: mnemonicSecret, derivedFrom: 'p' }),
        networkId: 'solana-mainnet',
      })
    );
    expect(result.current.canRescanEligible).toBe(false);
  });
});
