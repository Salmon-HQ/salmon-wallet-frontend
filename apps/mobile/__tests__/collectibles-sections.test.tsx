/**
 * A chain section announces itself.
 *
 * Mainnet and devnet are two sections of the same chain holding different,
 * non-interchangeable assets, so once both paint each one carries its own
 * heading. With only mainnet on screen the heading is suppressed — a lone
 * "Solana" over the only grid there is labels nothing.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NftsTab } from '../src/components/NftsTab';

const mockUseSolanaNfts = jest.fn();
const mockRefresh = jest.fn();
const mockUseAccountsContext = jest.fn();
let mockDeveloperMode = false;

jest.mock('@salmon/shared', () => ({
  // The kit primitives the tab composes evaluate their stylesheets at module
  // scope, so the theme has to be real: hand-listing the tokens a component
  // happens to read is what used to break this suite every time the tab
  // reached for one more.
  ...jest.requireActual('../test-utils/themeTokens'),
  SECTION_TO_NETWORK: {
    solana: 'solana-mainnet',
    'solana-devnet': 'solana-devnet',
  },
  canonicalNftToSolanaNftData: (nft: unknown) => nft,
  getNftSectionTitle: (key: string) => (key === 'solana' ? 'Solana' : 'Solana Devnet'),
  getShortAddress: () => 'Owne...r111',
  useAccountsContext: () => mockUseAccountsContext(),
  useSolanaNfts: (...args: unknown[]) => mockUseSolanaNfts(...args),
}));

jest.mock('../src/components/NftCard', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { NftCard: () => <View />, NftCardSkeleton: () => <View /> };
});

// The kit primitives press with Reanimated; this suite is about the tab's
// states, not its motion.
jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component: React.ComponentType<Record<string, unknown>>) =>
        ReactActual.forwardRef((props: Record<string, unknown>, ref: unknown) =>
          ReactActual.createElement(Component, { ...props, ref })
        ),
    },
    View,
    Easing: { bezier: () => (value: unknown) => value, linear: (value: unknown) => value },
    useReducedMotion: () => true,
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: () => ({}),
    withTiming: (value: unknown) => value,
    withDelay: (_delay: number, value: unknown) => value,
    withRepeat: (value: unknown) => value,
    withSpring: (value: unknown) => value,
    runOnJS: (fn: unknown) => fn,
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

jest.mock('../src/components/SubAccountSelector', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { SubAccountSelector: () => <View /> };
});

jest.mock('../src/components/WarningNotice', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    WarningNotice: ({ title, action }: { title: string; action?: React.ReactNode }) => (
      <View>
        <Text>{title}</Text>
        {action}
      </View>
    ),
  };
});

jest.mock('../src/contexts/DeveloperModeContext', () => ({
  useDeveloperMode: () => mockDeveloperMode,
}));

jest.mock('../hooks/useTabChrome', () => ({
  useTabChrome: () => ({
    headerContentOffset: 0,
    scrollBottomPadding: 0,
  }),
}));

describe('Collectibles chain section headers', () => {
  const nftsFor = (prefix: string) => [
    { mint: `${prefix}-1`, name: `${prefix} #1`, image: null, blockchain: 'solana' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccountsContext.mockReturnValue([
      {
        ready: true,
        activeAccount: {
          id: 'account-1',
          networksAccounts: {
            'solana-mainnet': [
              { getReceiveAddress: () => 'Owner111', getNetworkId: () => 'solana-mainnet' },
            ],
            'solana-devnet': [
              { getReceiveAddress: () => 'Owner222', getNetworkId: () => 'solana-devnet' },
            ],
          },
        },
      },
    ]);
    mockUseSolanaNfts.mockImplementation(({ networkId }: { networkId: string }) => ({
      nfts: nftsFor(networkId),
      loading: false,
      error: null,
      isError: false,
      refresh: mockRefresh,
    }));
  });

  it('renders one heading per chain section once devnet joins mainnet', () => {
    mockDeveloperMode = true;

    render(<NftsTab />);

    expect(screen.getByText('Solana')).toBeTruthy();
    expect(screen.getByText('Solana Devnet')).toBeTruthy();
  });

  it('suppresses the heading when mainnet is the only section', () => {
    mockDeveloperMode = false;

    render(<NftsTab />);

    expect(screen.queryByText('Solana')).toBeNull();
  });
});
