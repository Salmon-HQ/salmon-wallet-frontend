/**
 * The grid follows the network the wallet is standing on.
 *
 * Mainnet and devnet hold different, non-interchangeable assets, and the
 * screen shows exactly one of them: the one the carousel is on (spec 026 D1).
 * There is no second section and no developer-mode gate — a devnet session
 * queries devnet, a mainnet session queries mainnet, and neither ever sees
 * the other's collectibles.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NftsTab } from '../src/components/NftsTab';

const mockUseSolanaNfts = jest.fn();
const mockRefresh = jest.fn();
const mockUseAccountsContext = jest.fn();
let mockNetworkId = 'solana-mainnet';

jest.mock('@salmon/shared', () => ({
  // The kit primitives the tab composes evaluate their stylesheets at module
  // scope, so the theme has to be real: hand-listing the tokens a component
  // happens to read is what used to break this suite every time the tab
  // reached for one more.
  ...jest.requireActual('../test-utils/themeTokens'),
  canonicalNftToSolanaNftData: (nft: unknown) => nft,
  getShortAddress: (value: string) => value,
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
  useUnverifiedTokens: () => false,
}));

jest.mock('../hooks/useTabChrome', () => ({
  useTabChrome: () => ({
    headerContentOffset: 0,
    scrollBottomPadding: 0,
  }),
}));

describe('the collectibles grid and the active network', () => {
  const nftsFor = (prefix: string) => [
    { mint: `${prefix}-1`, name: `${prefix} #1`, image: null, blockchain: 'solana' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkId = 'solana-mainnet';
    mockUseAccountsContext.mockImplementation(() => [
      {
        ready: true,
        networkId: mockNetworkId,
        activeAccount: {
          id: 'account-1',
          networksAccounts: {
            'solana-mainnet': [{ getReceiveAddress: () => 'Owner111' }],
            'solana-devnet': [{ getReceiveAddress: () => 'Owner222' }],
          },
        },
      },
    ]);
    mockUseSolanaNfts.mockImplementation(({ networkId }: { networkId: string }) => ({
      nfts: nftsFor(networkId),
      loading: false,
      error: null,
      partial: false,
      refresh: mockRefresh,
    }));
  });

  it('queries the active network, and only it', () => {
    mockNetworkId = 'solana-devnet';

    render(<NftsTab />);

    expect(mockUseSolanaNfts).toHaveBeenCalledTimes(1);
    expect(mockUseSolanaNfts).toHaveBeenCalledWith(
      expect.objectContaining({ networkId: 'solana-devnet', publicKey: 'Owner222' })
    );
  });

  it('reads mainnet when the session stands on mainnet', () => {
    render(<NftsTab />);

    expect(mockUseSolanaNfts).toHaveBeenCalledTimes(1);
    expect(mockUseSolanaNfts).toHaveBeenCalledWith(
      expect.objectContaining({ networkId: 'solana-mainnet', publicKey: 'Owner111' })
    );
  });

  it('leaves spam to its own setting, never to developer mode', () => {
    render(<NftsTab />);

    expect(mockUseSolanaNfts).toHaveBeenCalledWith(expect.objectContaining({ includeSpam: false }));
  });
});
