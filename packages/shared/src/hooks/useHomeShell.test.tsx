/**
 * @vitest-environment jsdom
 *
 * The Home shell's state, pinned once for both platforms: which page the
 * block stands on, what each page carries, which sub-tabs are offered there,
 * and which wrapper owns a swap.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

vi.mock('./useHomeTabOrder', () => ({
  useHomeTabOrder: (keys: string[]) => ({ order: keys, setOrder: vi.fn() }),
}));

import {
  buildBitcoinToken,
  mapBalanceToToken,
  useHomeShell,
  type UseHomeShellParams,
} from './useHomeShell';

const NETWORKS = [
  { id: 'solana-mainnet', name: 'Solana' },
  { id: 'bitcoin-mainnet', name: 'Bitcoin' },
];
const HELD = { 'solana-mainnet': [{}], 'bitcoin-mainnet': [{}] };
const BALANCE = {
  usdTotal: 18.03,
  nativeAmount: 0.12,
  changePercent: -0.01,
  changeAmount: -0.001,
  hasData: true,
};

function params(over: Partial<UseHomeShellParams> = {}): UseHomeShellParams {
  return {
    allNetworks: NETWORKS,
    networkId: 'solana-mainnet',
    activeAccountId: 'acct-1',
    networksAccounts: HELD,
    balance: BALANCE,
    isTaskEngaged: false,
    surfaceKey: 0,
    changeNetwork: vi.fn(),
    ...over,
  };
}

describe('useHomeShell', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stands on the persisted network and carries figures only on that page', () => {
    const { result } = renderHook((p: UseHomeShellParams) => useHomeShell(p), {
      initialProps: params({ networkId: 'bitcoin-mainnet' }),
    });
    expect(result.current.activeBlockchainIndex).toBe(1);
    expect(result.current.currentNetworkId).toBe('bitcoin-mainnet');
    expect(result.current.currentChain).toBe('bitcoin');
    const [sol, btc] = result.current.blockchainBalances;
    expect(sol).toMatchObject({ usdTotal: undefined, loading: false });
    expect(btc).toMatchObject({ usdTotal: 18.03, nativeAmount: 0.12, loading: false });
    expect(btc.network.blockchain).toBe('bitcoin');
  });

  it('shows the skeleton only while there is nothing to show', () => {
    const { result } = renderHook(() =>
      useHomeShell(params({ balance: { ...BALANCE, hasData: false } }))
    );
    expect(result.current.blockchainBalances[0]).toMatchObject({
      usdTotal: undefined,
      loading: true,
    });
  });

  it('re-syncs the index for a new account on the same network', () => {
    const { result, rerender } = renderHook((p: UseHomeShellParams) => useHomeShell(p), {
      initialProps: params({ networkId: 'bitcoin-mainnet' }),
    });
    expect(result.current.activeBlockchainIndex).toBe(1);
    // The user turned the page optimistically; a wallet switch on the same
    // persisted network must still land on that network's page.
    act(() => {
      result.current.selectBlockchain(0);
    });
    expect(result.current.activeBlockchainIndex).toBe(0);
    rerender(params({ networkId: 'bitcoin-mainnet', activeAccountId: 'acct-2' }));
    expect(result.current.activeBlockchainIndex).toBe(1);
  });

  it('refuses a page the wallet has no derivation for', () => {
    const changeNetwork = vi.fn();
    const { result } = renderHook(() =>
      useHomeShell(params({ networksAccounts: { 'solana-mainnet': [{}] }, changeNetwork }))
    );
    let accepted = true;
    act(() => {
      accepted = result.current.selectBlockchain(1);
    });
    expect(accepted).toBe(false);
    expect(result.current.activeBlockchainIndex).toBe(0);
    expect(changeNetwork).not.toHaveBeenCalled();
  });

  it('turns the page optimistically and persists the network', () => {
    const changeNetwork = vi.fn();
    const { result } = renderHook(() => useHomeShell(params({ changeNetwork })));
    act(() => {
      result.current.selectBlockchain(1);
    });
    expect(result.current.activeBlockchainIndex).toBe(1);
    expect(changeNetwork).toHaveBeenCalledWith('bitcoin-mainnet');
  });

  it('drops the NFTs tab on Bitcoin and falls back to Portfolio', () => {
    const { result } = renderHook((p: UseHomeShellParams) => useHomeShell(p), {
      initialProps: params(),
    });
    act(() => result.current.setActiveSubTab('nfts'));
    expect(result.current.subTabs.map((tab) => tab.key)).toEqual(['portfolio', 'nfts']);
    expect(result.current.effectiveSubTab).toBe('nfts');

    act(() => {
      result.current.selectBlockchain(1);
    });
    expect(result.current.nftsOffered).toBe(false);
    expect(result.current.subTabs.map((tab) => tab.key)).toEqual(['portfolio']);
    expect(result.current.effectiveSubTab).toBe('portfolio');
    // The arrangement is untouched: back on Solana the tab returns.
    act(() => {
      result.current.selectBlockchain(0);
    });
    expect(result.current.effectiveSubTab).toBe('nfts');
  });

  it('plays the row verb when the tab SET changes, never on first mount', () => {
    const { result } = renderHook(() => useHomeShell(params()));
    expect(result.current.tabsHasPrior).toBe(false);
    act(() => {
      result.current.selectBlockchain(1);
    });
    expect(result.current.tabsHasPrior).toBe(true);
  });

  it('hands a swap to exactly one owner: task over sub-tab over chain', () => {
    const { result, rerender } = renderHook((p: UseHomeShellParams) => useHomeShell(p), {
      initialProps: params(),
    });
    expect(result.current.swapCause).toBe('none');

    act(() => {
      result.current.selectBlockchain(1);
    });
    expect(result.current.swapCause).toBe('chain');

    act(() => result.current.setActiveSubTab('portfolio'));
    act(() => {
      result.current.selectBlockchain(0);
    });
    act(() => result.current.setActiveSubTab('nfts'));
    expect(result.current.swapCause).toBe('subtab');

    // Leaving Solana drops NFTs and changes the chain in one render: the
    // sub-tab wins, so the chain wrapper inside stays silent.
    act(() => {
      result.current.selectBlockchain(1);
    });
    expect(result.current.swapCause).toBe('subtab');
    expect(result.current.chainHasPrior).toBe(false);

    rerender(params({ isTaskEngaged: true }));
    expect(result.current.swapCause).toBe('task');
  });

  it('a surfacing silences every wrapper — it is not a swap', () => {
    const { result, rerender } = renderHook((p: UseHomeShellParams) => useHomeShell(p), {
      initialProps: params(),
    });
    act(() => {
      result.current.selectBlockchain(1);
    });
    expect(result.current.swapCause).toBe('chain');
    expect(result.current.tabsHasPrior).toBe(true);
    rerender(params({ surfaceKey: 1 }));
    expect(result.current.swapCause).toBe('none');
    expect(result.current.tabsHasPrior).toBe(false);
  });
});

describe('mapBalanceToToken', () => {
  it('derives the absolute change from the percentage and marks verified tags', () => {
    const token = mapBalanceToToken({
      address: 'So111',
      symbol: 'SOL',
      name: 'Solana',
      uiAmount: 1,
      usdBalance: 110,
      priceChange24h: 10,
      tags: ['verified'],
    });
    expect(token.isVerified).toBe(true);
    expect(token.last24HoursChange?.perc).toBe(10);
    expect(token.last24HoursChange?.abs).toBeCloseTo(10);
  });

  it('reports no change and a null balance when the list has none', () => {
    const token = mapBalanceToToken({ address: 'x', symbol: 'X', name: 'X', uiAmount: 0 });
    expect(token.last24HoursChange).toBeNull();
    expect(token.usdBalance).toBeNull();
    expect(token.isVerified).toBe(false);
  });
});

describe('buildBitcoinToken', () => {
  it('is nothing until the market has answered, then carries the holding', () => {
    expect(buildBitcoinToken(undefined, 0.5, 100)).toBeUndefined();
    const token = buildBitcoinToken(
      {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        marketData: { currentPrice: 77329, priceChange24h: -12, priceChangePercentage24h: -0.4 },
      },
      0.5,
      100
    );
    expect(token).toMatchObject({ symbol: 'BTC', uiAmount: 0.5, usdBalance: 100, price: 77329 });
    expect(token?.last24HoursChange).toEqual({ perc: -0.4, abs: -12 });
  });
});
