import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockSetStringAsync = jest.fn().mockResolvedValue(undefined);
const mockImpactAsync = jest.fn().mockResolvedValue(undefined);
const mockExplorerPress = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string | Record<string, unknown>) => {
      if (typeof fallback === 'string') return fallback;
      if (fallback && typeof fallback === 'object') {
        const template = (fallback.defaultValue as string | undefined) ?? _key;
        return template.replace(/\{\{(\w+)\}\}/g, (_m, name) => String(fallback[name] ?? ''));
      }
      return _key;
    },
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

// The component reads safe-area insets (added with the responsive work). Tests
// don't mount a SafeAreaProvider, so stub the hook with zero insets.
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: (...args: unknown[]) => mockSetStringAsync(...args),
}));

jest.mock('../../utils/haptics', () => ({
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@salmon/shared', () => ({
  borderRadius: { lg: 16, button: 16, sm: 8, tokenIcon: 20 },
  borderWidth: { thin: 1 },
  colors: {
    change: { negative: '#f44', positive: '#4f4' },
    palette: {
      purple: '#90f',
      cyan: '#0ff',
      orange: '#f90',
      green: '#0f0',
      amber: '#fc0',
      blue: '#09f',
    },
    text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
    status: { success: '#0f0', error: '#f00', warning: '#fc0' },
    background: { card: '#111' },
    border: { subtle: '#222' },
  },
  fontFamilyNative: { bold: 'System', medium: 'System', regular: 'System' },
  fontSize: { xs: 12, sm: 14, base: 16, lg: 20, '2xl': 24 },
  formatBlockNumber: (value: number) => value.toString(),
  formatDateTime: (value: number) => `date:${value}`,
  formatRawAmount: (amount: string | number, decimals: number) =>
    `${Number(amount) / 10 ** decimals}`,
  getShortAddress: (value: string, size = 4) => `${value.slice(0, size)}...${value.slice(-size)}`,
  letterSpacing: { wide: 1 },
  spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, headerPadding: 20 },
  truncateHash: (value: string) => `hash:${value.slice(0, 8)}`,
  ms: (value: number) => value,
  vs: (value: number) => value,
  s: (value: number) => value,
}));

jest.mock('../BottomSheetContainer', () => ({
  BottomSheetContainer: ({
    children,
    headerContent,
  }: {
    children?: React.ReactNode;
    headerContent?: React.ReactNode;
  }) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, headerContent, children);
  },
}));

jest.mock('../BlurContainer', () => ({
  BlurContainer: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock('../TokenLogo', () => ({
  TokenLogo: () => null,
}));

jest.mock('../TransactionHistorySheet/AddressCopyRow', () => ({
  AddressCopyRow: ({ label, address }: { label: string; address: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, `${label}:${address}`);
  },
}));

jest.mock('../TransactionHistorySheet/ExplorerLinkButton', () => ({
  ExplorerLinkButton: ({ onPress }: { onPress?: (url: string, explorerName: string) => void }) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return React.createElement(
      TouchableOpacity,
      {
        onPress: () => {
          mockExplorerPress();
          onPress?.('https://explorer/tx', 'Solscan');
        },
      },
      React.createElement(Text, null, 'Explorer')
    );
  },
}));

jest.mock('../TransactionHistorySheet/PriceImpactBadge', () => ({
  PriceImpactBadge: ({ value }: { value: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, `Price impact:${value}`);
  },
}));

jest.mock('../TransactionHistorySheet/ConversionRateDisplay', () => ({
  ConversionRateDisplay: ({
    fromSymbol,
    toSymbol,
    rate,
  }: {
    fromSymbol: string;
    toSymbol: string;
    rate: string;
  }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, `${fromSymbol}/${toSymbol}:${rate}`);
  },
}));

import { TransactionDetailModal } from './TransactionDetailModal';

const BASE_TRANSACTION = {
  id: 'tx-1234567890abcdef',
  type: 'swap',
  status: 'completed',
  source: 'Jupiter',
  timestamp: 1710000000000,
  confirmationStatus: 'finalized',
  slot: 123456,
  inputs: [
    {
      amount: '2500000',
      decimals: 6,
      symbol: 'USDC',
      name: 'USD Coin',
      source: 'source-wallet',
    },
  ],
  outputs: [
    {
      amount: '1000000000',
      decimals: 9,
      symbol: 'SOL',
      name: 'Solana',
      destination: 'destination-wallet',
      isNft: false,
    },
  ],
  fee: { amount: '5000', decimals: 9, symbol: 'SOL' },
  swapRoute: {
    priceImpact: '0.5',
    conversionRate: {
      fromSymbol: 'SOL',
      toSymbol: 'USDC',
      rate: '2.5',
    },
    hops: [
      {
        dex: 'Orca',
        inputToken: { symbol: 'SOL' },
        outputToken: { symbol: 'USDC' },
        percent: 100,
      },
    ],
    totalFee: { amount: '0.05', symbol: 'USDC' },
  },
  heliusType: 'SWAP',
  accountsInvolved: 4,
  instructions: [{ programId: 'Program111111', innerInstructionsCount: 2 }],
  innerSwaps: [
    {
      programInfo: {
        source: 'Orca',
        programName: 'Whirlpool',
        instructionName: 'swap',
      },
    },
  ],
  swapFees: {
    nativeFees: [{ account: 'NativeFee111111', amount: '0.001' }],
    tokenFees: [{ account: 'TokenFee111111', amount: '0.2', mint: 'Mint111111' }],
  },
} as any;

describe('TransactionDetailModal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('does not render when transaction is missing', () => {
    const { toJSON } = render(
      <TransactionDetailModal visible onClose={jest.fn()} transaction={null} />
    );

    expect(toJSON()).toBeNull();
  });

  it('copies hash and forwards share action', async () => {
    const onCopyHash = jest.fn();
    const onShare = jest.fn();

    render(
      <TransactionDetailModal
        visible
        onClose={jest.fn()}
        transaction={BASE_TRANSACTION}
        onCopyHash={onCopyHash}
        onShare={onShare}
      />
    );

    fireEvent.press(screen.getByLabelText('Copy transaction hash'));
    fireEvent.press(screen.getByText('Share'));

    await waitFor(() => {
      expect(mockSetStringAsync).toHaveBeenCalledWith('tx-1234567890abcdef');
    });

    expect(mockImpactAsync).toHaveBeenCalled();
    expect(onCopyHash).toHaveBeenCalledWith('tx-1234567890abcdef');
    expect(onShare).toHaveBeenCalledWith(BASE_TRANSACTION);
  });

  it('shows developer details and forwards explorer action', () => {
    const onViewExplorer = jest.fn();

    render(
      <TransactionDetailModal
        visible
        onClose={jest.fn()}
        transaction={BASE_TRANSACTION}
        onViewExplorer={onViewExplorer}
        developerMode
      />
    );

    expect(screen.getByText('Developer Info')).toBeTruthy();
    expect(screen.getByText('SWAP')).toBeTruthy();
    expect(screen.getAllByText('Orca').length).toBeGreaterThan(0);

    fireEvent.press(screen.getByText('Explorer'));

    expect(mockExplorerPress).toHaveBeenCalledTimes(1);
    expect(onViewExplorer).toHaveBeenCalledWith(BASE_TRANSACTION);
  });
});
