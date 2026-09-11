/**
 * The Swap Powerup's Home sub-tab: what it hands the Powerup — Solana tokens
 * only, the taker, the active network. There is nowhere to
 * navigate afterwards: the tab stays where it is. The Powerup's own behaviour
 * is the shared hook's suite.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) };
});

jest.mock('@salmon/shared', () => ({
  useAccountsContext: jest.fn(),
  useCurrencyContext: () => [{}, { formatValue: (value: number) => `$${value.toFixed(2)}` }],
  useTokenCatalog: () => ({
    tokens: [{ address: 'mint-usdc', symbol: 'USDC', decimals: 6 }],
    loading: false,
    error: null,
    refresh: jest.fn(),
  }),
  useMultiChainTokens: () => ({
    tokens: [
      {
        symbol: 'SOL',
        address: 'mint-sol',
        decimals: 9,
        chain: 'solana',
        balance: 1,
        usdPrice: 100,
      },
    ],
    loading: false,
    refresh: jest.fn(),
  }),
  mapToSwapToken: (token: unknown) => token,
  unifiedToSwapToken: (token: unknown) => token,
}));
jest.mock('@salmon/shared/powerups', () => ({ SWAP_NETWORK_ID: 'solana-mainnet' }));

jest.mock('../../src/components', () => {
  const { View } = require('react-native');
  return {
    DepthBackground: () => null,
    ScalesBackground: () => null,
    ScreenHeader: ({ onBack }: { onBack: () => void }) => (
      <View testID="swap-header" onPress={onBack} />
    ),
    StateBlock: ({ title }: { title: string }) => (
      <View testID="state-block" accessibilityLabel={title} />
    ),
  };
});

jest.mock('../../src/components/SwapScreen', () => {
  const { Text, View } = require('react-native');
  return {
    SwapScreen: (props: {
      tokens: { symbol: string }[];
      publicKey: string;
      networkId: string;
      initialInToken?: { symbol: string };
      formatUsd: (value: number) => string;
      onNavigateHome: () => void;
    }) => (
      <View>
        <Text>{`tokens:${props.tokens.map((t) => t.symbol).join(',')}`}</Text>
        <Text>{`taker:${props.publicKey}`}</Text>
        <Text>{`network:${props.networkId}`}</Text>
        <Text>{`initial:${props.initialInToken?.symbol}`}</Text>
        <Text>{`usd:${props.formatUsd(84.65)}`}</Text>
        <View testID="navigate-home" onPress={props.onNavigateHome} />
      </View>
    ),
  };
});

const { useAccountsContext } = jest.requireMock('@salmon/shared') as {
  useAccountsContext: jest.Mock;
};

import SwapTab from '../../src/screens/SwapTab';

describe('SwapTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('states the absence of an account instead of rendering the form', () => {
    useAccountsContext.mockReturnValue([
      {
        ready: false,
        activeAccount: null,
        activeBlockchainAccount: null,
        networkId: 'solana-mainnet',
      },
    ]);
    render(<SwapTab />);
    expect(screen.getByTestId('state-block').props.accessibilityLabel).toBe(
      'swap.errors.noAccount'
    );
  });

  it('hands the Powerup Solana tokens only, the taker and the network', () => {
    useAccountsContext.mockReturnValue([
      {
        ready: true,
        activeAccount: {},
        activeBlockchainAccount: { getReceiveAddress: () => 'wallet-1' },
        networkId: 'solana-devnet',
      },
    ]);
    render(<SwapTab />);

    expect(screen.getByText('tokens:SOL')).toBeTruthy();
    expect(screen.getByText('taker:wallet-1')).toBeTruthy();
    // The active network as it is: the Powerup decides what it can serve.
    expect(screen.getByText('network:solana-devnet')).toBeTruthy();
    expect(screen.getByText('initial:SOL')).toBeTruthy();
    expect(screen.getByText('usd:~$84.65')).toBeTruthy();
  });
});
