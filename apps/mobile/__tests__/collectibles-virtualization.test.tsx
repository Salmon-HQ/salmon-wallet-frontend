/**
 * The grid must not mount every card it has.
 *
 * This screen used to render every NFT inside a plain ScrollView. Each mounted
 * card decodes an image into the Java heap's large-object space, so a wallet
 * with hundreds of NFTs grew the heap until Android's low-memory killer took
 * the app down mid-scroll — observed on a 900-NFT wallet at ~145 MB of bitmaps
 * across 200 objects, `lmkd` killing a foreground process.
 *
 * Virtualization is what bounds that, so what this file pins is the bound
 * itself: mounted cards stay a small fraction of the collection.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { NftsTab } from '../src/components/NftsTab';

const mockUseSolanaNfts = jest.fn();
const mockRefresh = jest.fn();
const mockUseAccountsContext = jest.fn();

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
  return { NftCard: () => <View testID="nft-card" />, NftCardSkeleton: () => <View /> };
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
  useUnverifiedTokens: () => false,
}));

jest.mock('../hooks/useTabChrome', () => ({
  useTabChrome: () => ({
    headerContentOffset: 0,
    scrollBottomPadding: 0,
  }),
}));

describe('Collectibles grid virtualization', () => {
  const NFT_COUNT = 400;

  const manyNfts = Array.from({ length: NFT_COUNT }, (_, i) => ({
    mint: `mint-${i}`,
    name: `NFT ${i}`,
    image: `https://example.test/${i}.png`,
    blockchain: 'solana',
  }));

  beforeEach(() => {
    jest.clearAllMocks();
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
    mockUseSolanaNfts.mockReturnValue({
      nfts: manyNfts,
      loading: false,
      error: null,
      isError: false,
      refresh: mockRefresh,
    });
  });

  it('mounts a bounded window of cards, not the whole collection', () => {
    render(<NftsTab />);

    const mounted = screen.queryAllByTestId('nft-card').length;

    // The exact window is a tuning detail; that it is bounded is not.
    expect(mounted).toBeGreaterThan(0);
    expect(mounted).toBeLessThan(NFT_COUNT / 4);
  });

  it('still renders neither the empty nor the error state with a full collection', () => {
    render(<NftsTab />);

    expect(screen.queryByTestId('collectibles-empty')).toBeNull();
    expect(screen.queryByTestId('collectibles-load-error')).toBeNull();
  });
});
