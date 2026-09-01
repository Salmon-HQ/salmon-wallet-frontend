/**
 * P1 — "you have nothing" vs "it didn't load".
 *
 * When the NFT query fails, the screen must render the error state (banner +
 * explicit retry), never the "No Collectibles" empty state: with DAS down a
 * user with NFTs would otherwise be told they own none.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { NftsTab } from '../src/components/NftsTab';

const mockUseSolanaNfts = jest.fn();
const mockRefresh = jest.fn();
const mockUseAccountsContext = jest.fn();
/** Every `StateBlock` render, so a state's composition is asserted, not its markup. */
const mockStateBlockProps: Array<Record<string, unknown>> = [];

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

// A passthrough spy: the real block still renders (the retry below presses
// it), and the suite can still say WHICH component drew the state.
jest.mock('../src/components/StateBlock', () => {
  const ReactActual = require('react');
  const actual = jest.requireActual('../src/components/StateBlock');
  return {
    ...actual,
    StateBlock: (props: Record<string, unknown>) => {
      mockStateBlockProps.push(props);
      return ReactActual.createElement(actual.StateBlock, props);
    },
  };
});

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
  useDeveloperMode: () => false,
}));

jest.mock('../hooks/useTabChrome', () => ({
  useTabChrome: () => ({
    headerContentOffset: 0,
    scrollBottomPadding: 0,
  }),
}));

describe('Collectibles load-error vs empty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStateBlockProps.length = 0;
    mockUseAccountsContext.mockReturnValue([
      {
        ready: true,
        activeAccount: {
          id: 'account-1',
          networksAccounts: {
            'solana-mainnet': [
              {
                getReceiveAddress: () => 'Owner111',
                getNetworkId: () => 'solana-mainnet',
              },
            ],
          },
        },
      },
    ]);
  });

  it('renders the error state with retry, not the empty state, when the load fails', () => {
    mockUseSolanaNfts.mockReturnValue({
      nfts: [],
      loading: false,
      error: new Error('DAS down'),
      isError: true,
      refresh: mockRefresh,
    });

    render(<NftsTab />);

    expect(screen.getByTestId('collectibles-load-error')).toBeTruthy();
    expect(screen.queryByTestId('collectibles-empty')).toBeNull();

    fireEvent.press(screen.getByTestId('collectibles-retry-button'));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('renders the empty state when the load succeeded with zero NFTs', () => {
    mockUseSolanaNfts.mockReturnValue({
      nfts: [],
      loading: false,
      error: null,
      isError: false,
      refresh: mockRefresh,
    });

    render(<NftsTab />);

    expect(screen.getByTestId('collectibles-empty')).toBeTruthy();
    expect(screen.queryByTestId('collectibles-load-error')).toBeNull();
  });

  it('draws the empty state as a StateBlock, not a hand-rolled block', () => {
    mockUseSolanaNfts.mockReturnValue({
      nfts: [],
      loading: false,
      error: null,
      isError: false,
      refresh: mockRefresh,
    });

    render(<NftsTab />);

    expect(mockStateBlockProps).toContainEqual(
      expect.objectContaining({ tone: 'empty', testID: 'collectibles-empty' })
    );
  });
});
