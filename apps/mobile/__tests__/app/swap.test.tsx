import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockGetQuote = jest.fn();
const mockExecuteSwapHook = jest.fn();
const mockResetSwap = jest.fn();
const mockRefreshBalances = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: (...args: unknown[]) => mockReplace(...args),
  }),
}));

jest.mock('../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ headerChromeHeight: 24 }),
}));

jest.mock('@salmon/shared', () => ({
  semantic: {
    accent: { fill: '#FF5C45', onFill: '#070911', ink: '#FF5C45' },
    text: {
      primary: '#F6F8FB',
      secondary: '#A7B1C4',
      tertiary: '#8B96AD',
      disabled: '#6F7B95',
      accent: '#FF5C45',
      onAccent: '#070911',
    },
    border: { default: '#58637B', raised: '#6F7B95', strong: '#8B96AD' },
    surface: { shelf: '#10131C', raised: '#161C2D', crest: '#1B2233' },
    status: { success: '#33D6A6', danger: '#FF6B85', warning: '#FFB020' },
    state: { hover: 'rgba(199,211,232,0.06)', selectedEdge: '#FF5C45' },
  },
  colors: { text: { muted: '#999' } },
  fontSize: { bodyLg: 18 },
  getTokenList: jest.fn().mockResolvedValue([{ address: 'mint-sol', symbol: 'SOL', decimals: 9 }]),
  useJupiterTokenList: () => ({
    tokens: [{ address: 'mint-sol', symbol: 'SOL', decimals: 9 }],
    loading: false,
    error: null,
    refresh: jest.fn(),
  }),
  searchTokens: jest
    .fn()
    .mockResolvedValue([{ address: 'mint-search', symbol: 'SEARCH', decimals: 6 }]),
  spacing: { lg: 16 },
  useAccountsContext: jest.fn(),
  useMultiChainTokens: () => ({
    tokens: [
      {
        symbol: 'SOL',
        name: 'Solana',
        address: 'mint-sol',
        decimals: 9,
        chain: 'solana',
        balance: 1,
        usdPrice: 100,
      },
    ],
    // Bridge is gone: a non-Solana featured token must be filtered out of
    // the swap screen's token lists rather than offered as unswappable.
    featuredTokens: [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        address: 'mint-btc',
        decimals: 8,
        chain: 'bitcoin',
        balance: 0.1,
        usdPrice: 50000,
      },
    ],
    loading: false,
    refresh: mockRefreshBalances,
  }),
  useSwap: () => ({
    getQuote: (...args: unknown[]) => mockGetQuote(...args),
    executeSwap: (...args: unknown[]) => mockExecuteSwapHook(...args),
    quote: { custom: { requestId: 'req-1' } },
    error: null,
    reset: mockResetSwap,
  }),
  mapToSwapToken: (token: any) => token,
  unifiedToSwapToken: (token: any) => token,
}));

jest.mock('../../src/components', () => ({
  SwapScreen: (props: any) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(Text, null, `initial:${props.initialInToken?.symbol}`),
      React.createElement(
        Text,
        null,
        `featured:${props.featuredTokens.map((t: any) => t.symbol).join(',')}`
      ),
      React.createElement(
        TouchableOpacity,
        { onPress: () => props.onNavigateHome() },
        React.createElement(Text, null, 'Navigate home')
      ),
      React.createElement(
        TouchableOpacity,
        {
          onPress: async () => {
            await props.onGetQuote(
              { address: 'mint-sol', decimals: 9, symbol: 'SOL' },
              { address: 'mint-usdc', decimals: 6, symbol: 'USDC' },
              '2'
            );
          },
        },
        React.createElement(Text, null, 'Get quote')
      ),
      React.createElement(
        TouchableOpacity,
        {
          onPress: async () => {
            await props.onSwap({});
          },
        },
        React.createElement(Text, null, 'Swap now')
      ),
      React.createElement(
        TouchableOpacity,
        { onPress: () => props.onSuccess('tx-1') },
        React.createElement(Text, null, 'Swap success')
      )
    );
  },
}));

const { useAccountsContext } = jest.requireMock('@salmon/shared') as {
  useAccountsContext: jest.Mock;
};

import SwapScreenPage from '../../app/(app)/(tabs)/swap';

describe('SwapScreenPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetQuote.mockResolvedValue({ custom: { requestId: 'req-1' }, route: 'ok' });
    mockExecuteSwapHook.mockResolvedValue({ status: 'success', txId: 'tx-123' });
  });

  it('renders fallback when there is no active account', async () => {
    useAccountsContext.mockReturnValue([
      {
        ready: false,
        activeAccount: null,
        activeBlockchainAccount: null,
        networkId: 'solana-mainnet',
      },
    ]);

    render(<SwapScreenPage />);
    await act(async () => {});

    expect(screen.getByText('swap.errors.noAccount')).toBeTruthy();
  });

  it('wires swap handlers and navigation into SwapScreen', async () => {
    useAccountsContext.mockReturnValue([
      {
        ready: true,
        activeAccount: {
          networksAccounts: {},
        },
        activeBlockchainAccount: {},
        networkId: 'solana-mainnet',
      },
    ]);

    render(<SwapScreenPage />);

    await waitFor(() => {
      expect(screen.getByText('initial:SOL')).toBeTruthy();
    });

    // The BTC featured token has no swap route without bridge, so it never
    // reaches the token list.
    expect(screen.getByText('featured:')).toBeTruthy();

    fireEvent.press(screen.getByText('Get quote'));
    await waitFor(() => {
      expect(mockGetQuote).toHaveBeenCalledWith(
        expect.objectContaining({
          inputMint: 'mint-sol',
          outputMint: 'mint-usdc',
          amount: 2,
        })
      );
    });

    fireEvent.press(screen.getByText('Swap now'));
    await waitFor(() => {
      expect(mockExecuteSwapHook).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(screen.getByText('Swap success'));
    expect(mockResetSwap).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Navigate home'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
