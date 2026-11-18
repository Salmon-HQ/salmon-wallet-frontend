/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNftsGrid } from './useNftsGrid';

const { accounts, nftsResult, useSolanaNfts } = vi.hoisted(() => {
  const nftsResult = {
    nfts: [] as unknown[],
    loading: false,
    error: null as Error | null,
    partial: false,
    refresh: async () => {},
  };
  return {
    accounts: { state: {} as Record<string, unknown> },
    nftsResult,
    useSolanaNfts: vi.fn((_params: unknown) => nftsResult),
  };
});

vi.mock('../contexts/AccountsContext', () => ({
  useAccountsContext: () => [accounts.state, {}],
}));
vi.mock('./useSolanaNfts', () => ({ useSolanaNfts }));
vi.mock('../utils/nft', () => ({
  canonicalNftToSolanaNftData: (nft: { id: string }) => ({ mint: nft.id }),
}));

const account = (address: string) => ({ getReceiveAddress: () => address });

beforeEach(() => {
  useSolanaNfts.mockClear();
  Object.assign(nftsResult, {
    nfts: [],
    loading: false,
    error: null,
    partial: false,
    refresh: async () => {},
  });
  accounts.state = {
    ready: true,
    networkId: 'solana-devnet',
    activeAccount: {
      networksAccounts: { 'solana-devnet': [account('first'), account('second')] },
    },
  };
});

describe('useNftsGrid', () => {
  it('asks for the NFTs of the chosen derived account on the active network', () => {
    renderHook(() => useNftsGrid({ includeSpam: true, subAccountIndex: 1 }));
    expect(useSolanaNfts).toHaveBeenLastCalledWith({
      publicKey: 'second',
      networkId: 'solana-devnet',
      includeSpam: true,
    });
  });

  it('defaults to the first account, without spam, on mainnet', () => {
    accounts.state = {
      ready: true,
      networkId: null,
      activeAccount: { networksAccounts: { 'solana-mainnet': [account('main')] } },
    };
    renderHook(() => useNftsGrid());
    expect(useSolanaNfts).toHaveBeenLastCalledWith({
      publicKey: 'main',
      networkId: 'solana-mainnet',
      includeSpam: false,
    });
  });

  it('asks for nothing until the accounts are ready', () => {
    accounts.state = { ...accounts.state, ready: false };
    renderHook(() => useNftsGrid());
    expect(useSolanaNfts).toHaveBeenLastCalledWith(
      expect.objectContaining({ publicKey: undefined })
    );
  });

  it('builds one card per NFT', () => {
    nftsResult.nfts = [{ id: 'a' }, { id: 'b' }];
    const { result } = renderHook(() => useNftsGrid());
    expect(result.current.cards).toEqual([{ mint: 'a' }, { mint: 'b' }]);
    expect(result.current.isEmpty).toBe(false);
  });

  it('is empty only when a load finished with nothing and did not fail', () => {
    expect(renderHook(() => useNftsGrid()).result.current.isEmpty).toBe(true);

    nftsResult.loading = true;
    expect(renderHook(() => useNftsGrid()).result.current.isEmpty).toBe(false);

    nftsResult.loading = false;
    nftsResult.error = new Error('down');
    const failed = renderHook(() => useNftsGrid()).result.current;
    expect(failed.loadError).toBe(true);
    expect(failed.isEmpty).toBe(false);
  });

  it('reports a partial load', () => {
    nftsResult.partial = true;
    expect(renderHook(() => useNftsGrid()).result.current.partial).toBe(true);
  });

  it('holds the refreshing flag for the length of a refresh, even one that fails', async () => {
    let fail: (reason: Error) => void = () => {};
    nftsResult.refresh = () => new Promise<void>((_, reject) => (fail = reject));
    const { result } = renderHook(() => useNftsGrid());

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.handleRefresh().catch(() => {});
    });
    expect(result.current.refreshing).toBe(true);

    await act(async () => {
      fail(new Error('down'));
      await pending;
    });
    expect(result.current.refreshing).toBe(false);
  });
});
