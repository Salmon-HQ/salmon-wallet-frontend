import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockSetStringAsync = jest.fn().mockResolvedValue(undefined);
const mockNotificationAsync = jest.fn().mockResolvedValue(undefined);
const mockExplorerPress = jest.fn();
const mockExplorerProps = jest.fn();
// The technical block follows the provider's flag, not a prop.
let mockDeveloperMode = false;

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
  notificationAsync: (...args: unknown[]) => mockNotificationAsync(...args),
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@salmon/shared', () => ({
  // The real tokens: the detail is built from the kit now, and every
  // primitive it composes reads a different corner of the theme. Listing
  // tokens by hand is how this mock used to break on an unrelated change.
  ...jest.requireActual('../../../test-utils/themeTokens'),
  ...jest.requireActual('@salmon/shared/src/hooks/useCopyFeedback'),
  // The display tables and derivations are real: the verb, the status ink
  // and the swap rate are what this detail is built from.
  ...jest.requireActual('@salmon/shared/src/utils/transactionDisplay'),
  useDeveloperMode: () => mockDeveloperMode,
  formatBlockNumber: (value: number) => value.toString(),
  formatDateTime: (value: number) => `date:${value}`,
  formatRawAmount: (amount: string | number, decimals: number) =>
    `${Number(amount) / 10 ** decimals}`,
  getShortAddress: (value: string, size = 4) => `${value.slice(0, size)}...${value.slice(-size)}`,
  getBlockchainFromNetworkId: (networkId: string) => {
    if (networkId.startsWith('bitcoin')) return 'bitcoin';
    if (networkId.startsWith('ethereum')) return 'ethereum';
    return 'solana';
  },
  truncateHash: (value: string) => `hash:${value.slice(0, 8)}`,
}));

// No worklets runtime in Jest: the kit's pressable bubble pulls reanimated in,
// so the animated touchable, the press hook and the two textures need
// plain-JS stand-ins (same shape as the IconBubble suite's).
jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RNView,
      createAnimatedComponent: (Component: React.ComponentType<Record<string, unknown>>) =>
        ReactActual.forwardRef((props: Record<string, unknown>, ref: unknown) =>
          ReactActual.createElement(Component, { ...props, ref })
        ),
    },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (target: unknown) => target,
  };
});

jest.mock('../../../hooks/usePressMotion', () => ({
  usePressMotion: () => ({
    pressStyle: {},
    scale: { value: 1 },
    pressHandlers: { onPressIn: () => {}, onPressOut: () => {} },
    specular: { x: { value: 0 }, y: { value: 0 }, opacity: { value: 0 } },
  }),
}));

jest.mock('../FleshBackground', () => ({ FleshBackground: () => null }));

jest.mock('../PressSpecular', () => ({ PressSpecular: () => null, SPECULAR_OPACITY: 0.12 }));

jest.mock('../BlurContainer', () => ({
  BlurContainer: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock('../TokenLogo', () => ({
  TokenLogo: () => null,
}));

jest.mock('../Activity/AddressCopyRow', () => ({
  AddressCopyRow: ({ label, address }: { label: string; address: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, `${label}:${address}`);
  },
}));

jest.mock('../Activity/ExplorerLinkButton', () => ({
  ExplorerLinkButton: ({
    onPress,
    ...props
  }: {
    onPress?: (url: string, explorerName: string) => void;
    blockchain?: string;
    environment?: string;
  }) => {
    mockExplorerProps(props);
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

jest.mock('../Activity/PriceImpactBadge', () => ({
  PriceImpactBadge: ({ value }: { value: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, `Price impact:${value}`);
  },
}));

jest.mock('../Activity/ConversionRateDisplay', () => ({
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

import { borderRadius, semantic } from '@salmon/shared';
import { TransactionDetail } from './TransactionDetail';

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

describe('TransactionDetail', () => {
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
    const { toJSON } = render(<TransactionDetail transaction={null} />);

    expect(toJSON()).toBeNull();
  });

  it('copies hash and forwards share action', async () => {
    const onCopyHash = jest.fn();
    const onShare = jest.fn();

    render(
      <TransactionDetail transaction={BASE_TRANSACTION} onCopyHash={onCopyHash} onShare={onShare} />
    );

    fireEvent.press(screen.getByLabelText('Copy transaction hash'));
    fireEvent.press(screen.getByText('Share'));

    await waitFor(() => {
      expect(mockSetStringAsync).toHaveBeenCalledWith('tx-1234567890abcdef');
    });

    expect(mockNotificationAsync).toHaveBeenCalled();
    expect(onCopyHash).toHaveBeenCalledWith('tx-1234567890abcdef');
    expect(onShare).toHaveBeenCalledWith(BASE_TRANSACTION);

    // Success feedback: the copy button flips to the copied tick state
    await waitFor(() => {
      expect(screen.getByLabelText('Copied!')).toBeTruthy();
    });
  });

  it('does not show copied feedback when the clipboard write fails', async () => {
    mockSetStringAsync.mockRejectedValueOnce(new Error('clipboard unavailable'));
    const onCopyHash = jest.fn();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    render(<TransactionDetail transaction={BASE_TRANSACTION} onCopyHash={onCopyHash} />);

    fireEvent.press(screen.getByLabelText('Copy transaction hash'));

    await waitFor(() => {
      expect(mockSetStringAsync).toHaveBeenCalledWith('tx-1234567890abcdef');
    });

    expect(onCopyHash).not.toHaveBeenCalled();
    expect(mockNotificationAsync).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Copied!')).toBeNull();
    expect(screen.getByLabelText('Copy transaction hash')).toBeTruthy();

    warnSpy.mockRestore();
  });

  it('shows developer details and forwards explorer action', () => {
    const onViewExplorer = jest.fn();
    mockDeveloperMode = true;

    render(<TransactionDetail transaction={BASE_TRANSACTION} onViewExplorer={onViewExplorer} />);

    expect(screen.getByText('DEVELOPER INFO')).toBeTruthy();
    expect(screen.getByText('SWAP')).toBeTruthy();
    expect(screen.getAllByText('Orca').length).toBeGreaterThan(0);

    fireEvent.press(screen.getByText('Explorer'));

    expect(mockExplorerPress).toHaveBeenCalledTimes(1);
    expect(onViewExplorer).toHaveBeenCalledWith(BASE_TRANSACTION);
  });

  it('derives the explorer chain and environment from networkId', () => {
    render(<TransactionDetail transaction={BASE_TRANSACTION} networkId="bitcoin-testnet" />);

    expect(mockExplorerProps).toHaveBeenCalledWith(
      expect.objectContaining({ blockchain: 'BITCOIN', environment: 'bitcoin-testnet' })
    );
  });

  it('sets the transaction hash in mono at the address size', () => {
    render(<TransactionDetail transaction={BASE_TRANSACTION} />);

    const hash = StyleSheet.flatten(screen.getByText(/^hash:/).props.style);

    expect(hash.fontFamily).toBe('GeistMonoRegular');
    expect(hash.fontSize).toBe(13);
  });

  it('renders the network fee row when the fee reaches the component', () => {
    render(<TransactionDetail transaction={BASE_TRANSACTION} />);

    expect(screen.getByText('Network Fee')).toBeTruthy();
    // 5000 lamports at 9 decimals, per the formatRawAmount mock.
    expect(screen.getByText(/0\.000005\s*SOL/)).toBeTruthy();
  });

  it('omits the network fee row when the transaction carries no fee', () => {
    const { fee: _fee, ...withoutFee } = BASE_TRANSACTION;

    render(<TransactionDetail transaction={withoutFee as never} />);

    expect(screen.queryByText('Network Fee')).toBeNull();
  });

  it('carries tabular figures on every rendered value', () => {
    render(<TransactionDetail transaction={BASE_TRANSACTION} />);

    const blockNumber = StyleSheet.flatten(screen.getByText('#123456').props.style);

    expect(blockNumber.fontVariant).toEqual(['tabular-nums']);
  });

  it('draws the status block and the receipt cards with the kit primitives', () => {
    render(<TransactionDetail transaction={BASE_TRANSACTION} />);

    // The status mark is `IconBubble` 48, circle, accent tint — not a
    // hand-drawn box with its own radius and its own tinted fill.
    const mark = StyleSheet.flatten(screen.getByTestId('tx-detail-status-mark').props.style);
    expect(mark.width).toBe(48);
    expect(mark.height).toBe(48);
    expect(mark.borderRadius).toBe(borderRadius.full);
    expect(mark.backgroundColor).toBe(semantic.accent.tint);

    // The provider rides in a `Chip`: a pill, not a rectangle.
    const chip = StyleSheet.flatten(screen.getByTestId('tx-detail-source').props.style);
    expect(chip.borderRadius).toBe(borderRadius.full);

    // Each block below is a `Card` on the kit's ground and radius.
    const meta = StyleSheet.flatten(screen.getByTestId('tx-detail-meta').props.style);
    expect(meta.borderRadius).toBe(borderRadius.r4);
    expect(meta.backgroundColor).toBe(semantic.surface.membraneThin);
  });

  it('falls back to Solana mainnet when networkId is missing', () => {
    render(<TransactionDetail transaction={BASE_TRANSACTION} />);

    expect(mockExplorerProps).toHaveBeenCalledWith(
      expect.objectContaining({ blockchain: 'SOLANA', environment: 'solana-mainnet' })
    );
  });
});
