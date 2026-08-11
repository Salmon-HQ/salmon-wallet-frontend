import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockReplace = jest.fn();
const mockAlert = jest.fn();
const mockGetQuote = jest.fn();
const mockExecuteSwapHook = jest.fn();
const mockResetSwap = jest.fn();
const mockResetBridge = jest.fn();
const mockGetBridgeAvailableTokens = jest.fn();
const mockGetBridgeEstimate = jest.fn();
const mockCreateBridgeExchange = jest.fn();
const mockTransfer = jest.fn();
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
  colors: { text: { muted: '#999' } },
  fontSize: { md: 18 },
  getTokenList: jest.fn().mockResolvedValue([{ address: 'mint-sol', symbol: 'SOL', decimals: 9 }]),
  useJupiterTokenList: () => ({ tokens: [{ address: 'mint-sol', symbol: 'SOL', decimals: 9 }], loading: false, error: null, refresh: jest.fn() }),
  searchTokens: jest.fn().mockResolvedValue([{ address: 'mint-search', symbol: 'SEARCH', decimals: 6 }]),
  spacing: { lg: 16 },
  useAccountsContext: jest.fn(),
  useBridge: () => ({
    getAvailableTokens: (...args: unknown[]) => mockGetBridgeAvailableTokens(...args),
    getEstimate: (...args: unknown[]) => mockGetBridgeEstimate(...args),
    createExchange: (...args: unknown[]) => mockCreateBridgeExchange(...args),
    reset: mockResetBridge,
  }),
  useMultiChainTokens: () => ({
    tokens: [
      { symbol: 'SOL', name: 'Solana', address: 'mint-sol', decimals: 9, chain: 'solana', balance: 1, usdPrice: 100 },
    ],
    featuredTokens: [
      { symbol: 'BTC', name: 'Bitcoin', address: 'mint-btc', decimals: 8, chain: 'bitcoin', balance: 0.1, usdPrice: 50000 },
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
      React.createElement(Text, null, `recipient:${props.defaultRecipientAddress}`),
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
      ),
      React.createElement(
        TouchableOpacity,
        { onPress: () => props.onBridgeError(new Error('bridge broke')) },
        React.createElement(Text, null, 'Bridge error')
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
    jest.spyOn(Alert, 'alert').mockImplementation((...args: any[]) => {
      mockAlert(...args);
    });
    mockGetQuote.mockResolvedValue({ custom: { requestId: 'req-1' }, route: 'ok' });
    mockExecuteSwapHook.mockResolvedValue({ status: 'success', txId: 'tx-123' });
    mockGetBridgeAvailableTokens.mockResolvedValue([]);
    mockGetBridgeEstimate.mockResolvedValue(null);
    mockCreateBridgeExchange.mockResolvedValue(null);
    mockTransfer.mockResolvedValue({ txId: 'deposit-1' });
  });

  it('renders fallback when there is no active account', async () => {
    useAccountsContext.mockReturnValue([
      { ready: false, activeAccount: null, activeBlockchainAccount: null, networkId: 'solana-mainnet' },
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
          networksAccounts: {
            'bitcoin-mainnet': [{ getReceiveAddress: () => 'btc-receive-addr' }],
          },
        },
        activeBlockchainAccount: {
          transfer: (...args: unknown[]) => mockTransfer(...args),
        },
        networkId: 'solana-mainnet',
      },
    ]);

    render(<SwapScreenPage />);

    await waitFor(() => {
      expect(screen.getByText('initial:SOL')).toBeTruthy();
    });

    expect(screen.getByText('recipient:btc-receive-addr')).toBeTruthy();

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

    fireEvent.press(screen.getByText('Bridge error'));
    expect(mockResetBridge).toHaveBeenCalledTimes(1);
    // The swap form renders the classified message; no second surface.
    expect(mockAlert).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Navigate home'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
