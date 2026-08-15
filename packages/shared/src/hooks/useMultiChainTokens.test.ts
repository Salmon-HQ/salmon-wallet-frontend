/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./useBalance', () => ({
  useBalance: vi.fn(),
}));

import { useBalance } from './useBalance';
import { useMultiChainTokens } from './useMultiChainTokens';

const mockUseBalance = vi.mocked(useBalance);

const solanaAccount = { id: 'solana-account' };
const bitcoinAccount = { id: 'bitcoin-account' };
const ethereumAccount = { id: 'ethereum-account' };

const solanaRefresh = vi.fn().mockResolvedValue(undefined);
const bitcoinRefresh = vi.fn().mockResolvedValue(undefined);
const ethereumRefresh = vi.fn().mockResolvedValue(undefined);

function makeBalanceState(overrides: Record<string, any> = {}) {
  return {
    balance: null,
    tokens: [],
    usdTotal: undefined,
    changePercent: undefined,
    changeAmount: undefined,
    loading: false,
    refreshing: false,
    hasData: false,
    error: null,
    isError: false,
    refresh: vi.fn().mockResolvedValue(undefined),
    hiddenBalance: false,
    toggleHidden: vi.fn(),
    lastUpdated: null,
    ...overrides,
  };
}

describe('useMultiChainTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseBalance.mockImplementation(({ networkId }) => {
      if (networkId === 'solana-mainnet') {
        return makeBalanceState({
          tokens: [
            {
              mint: 'So11111111111111111111111111111111111111112',
              address: 'So11111111111111111111111111111111111111112',
              symbol: 'SOL',
              name: 'Solana',
              decimals: 9,
              uiAmount: 2,
              price: 150,
              usdBalance: 300,
              logo: 'https://example.com/sol.png',
            },
            {
              mint: 'bad-token',
              address: 'bad-token',
              symbol: 'UNKNOWN',
              name: 'Unknown Token',
              decimals: 9,
              uiAmount: 1,
              price: 0,
              usdBalance: 0,
            },
          ],
          refresh: solanaRefresh,
        });
      }

      if (networkId === 'bitcoin-mainnet') {
        return makeBalanceState({
          tokens: [
            {
              mint: 'btc',
              address: 'btc',
              symbol: 'BTC',
              name: 'Bitcoin',
              decimals: 8,
              uiAmount: 0.1,
              price: 70_000,
              usdBalance: 7_000,
              logo: 'https://example.com/btc.png',
            },
          ],
          refresh: bitcoinRefresh,
        });
      }

      return makeBalanceState({
        tokens: [
          {
            mint: 'eth',
            address: 'eth',
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
            uiAmount: 1,
            price: 3_000,
            usdBalance: 3_000,
            logo: 'https://example.com/eth.png',
          },
        ],
        refresh: ethereumRefresh,
      });
    });
  });

  it('normalizes tokens, filters unknown placeholders, and sorts by usd balance', () => {
    const activeAccount = {
      networksAccounts: {
        'solana-mainnet': [solanaAccount],
        'bitcoin-mainnet': [bitcoinAccount],
        'ethereum-mainnet': [ethereumAccount],
      },
    };

    const { result } = renderHook(() =>
      useMultiChainTokens({
        activeAccount: activeAccount as any,
      })
    );

    expect(result.current.tokens.map((token) => token.symbol)).toEqual(['BTC', 'ETH', 'SOL']);
    expect(result.current.tokens.map((token) => token.chain)).toEqual([
      'bitcoin',
      'ethereum',
      'solana',
    ]);
    expect(result.current.tokens.find((token) => token.symbol === 'UNKNOWN')).toBeUndefined();
    expect(result.current.featuredTokens.map((token) => token.symbol)).toEqual([
      'BTC',
      'ETH',
      'SOL',
    ]);
  });

  it('groups tokens by chain and exposes per-chain helpers', () => {
    const activeAccount = {
      networksAccounts: {
        'solana-mainnet': [solanaAccount],
        'bitcoin-mainnet': [bitcoinAccount],
        'ethereum-mainnet': [ethereumAccount],
      },
    };

    const { result } = renderHook(() =>
      useMultiChainTokens({
        activeAccount: activeAccount as any,
      })
    );

    expect(result.current.tokensByChain.solana).toHaveLength(2);
    expect(result.current.getTokensForChain('solana').map((token) => token.symbol)).toEqual([
      'SOL',
      'UNKNOWN',
    ]);
    expect(result.current.getTokensForChain('bitcoin').map((token) => token.symbol)).toEqual([
      'BTC',
    ]);
    expect(result.current.getTokensForChain('ethereum').map((token) => token.symbol)).toEqual([
      'ETH',
    ]);
  });

  it('derives loading, ready, and error state from per-chain balances', () => {
    mockUseBalance.mockImplementation(({ networkId }) => {
      if (networkId === 'solana-mainnet') {
        return makeBalanceState({
          tokens: [],
          loading: true,
          refresh: solanaRefresh,
        });
      }

      if (networkId === 'bitcoin-mainnet') {
        return makeBalanceState({
          tokens: [],
          error: 'btc down',
          refresh: bitcoinRefresh,
        });
      }

      return makeBalanceState({
        tokens: [],
        refresh: ethereumRefresh,
      });
    });

    const activeAccount = {
      networksAccounts: {
        'solana-mainnet': [solanaAccount],
        'bitcoin-mainnet': [bitcoinAccount],
        'ethereum-mainnet': [ethereumAccount],
      },
    };

    const { result } = renderHook(() =>
      useMultiChainTokens({
        activeAccount: activeAccount as any,
      })
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.ready).toBe(false);
    expect(result.current.errors.bitcoin).toBe('btc down');
    expect(result.current.hasErrors).toBe(true);
  });

  it('passes skip through to useBalance and stays not-ready without fetched tokens', () => {
    const activeAccount = {
      networksAccounts: {
        'solana-mainnet': [solanaAccount],
      },
    };

    renderHook(() =>
      useMultiChainTokens({
        activeAccount: activeAccount as any,
        skip: true,
      })
    );

    expect(mockUseBalance).toHaveBeenCalledWith(
      expect.objectContaining({
        networkId: 'solana-mainnet',
        skip: true,
      })
    );
    expect(mockUseBalance).toHaveBeenCalledWith(
      expect.objectContaining({
        networkId: 'bitcoin-mainnet',
        skip: true,
      })
    );
  });

  it('refresh() fans out to every underlying useBalance refresh in parallel', async () => {
    const activeAccount = {
      networksAccounts: {
        'solana-mainnet': [solanaAccount],
        'bitcoin-mainnet': [bitcoinAccount],
        'ethereum-mainnet': [ethereumAccount],
      },
    };

    const { result } = renderHook(() =>
      useMultiChainTokens({
        activeAccount: activeAccount as any,
      })
    );

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(solanaRefresh).toHaveBeenCalledTimes(1);
      expect(bitcoinRefresh).toHaveBeenCalledTimes(1);
      expect(ethereumRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it('refresh() only refetches chains that have an account', async () => {
    const skippedBitcoinRefresh = vi.fn().mockResolvedValue(undefined);
    const skippedEthereumRefresh = vi.fn().mockResolvedValue(undefined);

    mockUseBalance.mockImplementation(({ networkId }) => {
      if (networkId === 'solana-mainnet') {
        return makeBalanceState({
          tokens: [
            {
              mint: 'So11111111111111111111111111111111111111112',
              address: 'So11111111111111111111111111111111111111112',
              symbol: 'SOL',
              name: 'Solana',
              decimals: 9,
              uiAmount: 2,
              price: 150,
              usdBalance: 300,
            },
          ],
          refresh: solanaRefresh,
        });
      }

      if (networkId === 'bitcoin-mainnet') {
        return makeBalanceState({ refresh: skippedBitcoinRefresh });
      }

      return makeBalanceState({ refresh: skippedEthereumRefresh });
    });

    const activeAccount = {
      networksAccounts: {
        'solana-mainnet': [solanaAccount],
      },
    };

    const { result } = renderHook(() =>
      useMultiChainTokens({
        activeAccount: activeAccount as any,
      })
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(solanaRefresh).toHaveBeenCalledTimes(1);
    expect(skippedBitcoinRefresh).not.toHaveBeenCalled();
    expect(skippedEthereumRefresh).not.toHaveBeenCalled();
  });
});
