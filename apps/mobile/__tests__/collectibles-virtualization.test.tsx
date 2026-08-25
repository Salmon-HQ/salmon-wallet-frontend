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
import CollectiblesScreen from '../app/(app)/(tabs)/collectibles';

const mockUseSolanaNfts = jest.fn();
const mockRefresh = jest.fn();
const mockUseAccountsContext = jest.fn();

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
  SECTION_TO_NETWORK: {
    solana: 'solana-mainnet',
    'solana-devnet': 'solana-devnet',
  },
  SolanaAccount: class {},
  canonicalNftToSolanaNftData: (nft: unknown) => nft,
  borderRadius: { md: 12 },
  colors: {
    accent: { primary: '#00ff99', tint: '#003322', border: '#00aa66' },
    text: { primary: '#fff', secondary: '#aaa', disabled: '#666' },
  },
  createBurnTransaction: jest.fn(),
  classifyTransactionError: (err: unknown) => String(err),
  fontFamilyNative: { semiBold: 'System', medium: 'System', regular: 'System' },
  fontSize: { bodyLg: 16, sm: 14, base: 15, lg: 18, xl: 20 },
  letterSpacing: { wide: 0, wider: 0 },
  spacing: { sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, headerPadding: 16 },
  getNftSectionTitle: () => 'Solana',
  getShortAddress: () => 'Owne...r111',
  ms: (value: number) => value,
  s: (value: number) => value,
  useAccountsContext: () => mockUseAccountsContext(),
  useSettleAfterTx: () => jest.fn(),
  useNftBurn: () => ({
    burnNft: jest.fn(),
    status: 'idle',
    settling: false,
    error: null,
    isError: false,
    reset: () => {},
  }),
  useSolanaNfts: (...args: unknown[]) => mockUseSolanaNfts(...args),
  vs: (value: number) => value,
}));

jest.mock('../src/components', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  return {
    NftCard: () => <View testID="nft-card" />,
    NftCardSkeleton: () => <View />,
    NftDetailSheet: () => null,
    SolanaSvgIcon: () => <View />,
    SubAccountSelector: () => <View />,
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
    render(<CollectiblesScreen />);

    const mounted = screen.queryAllByTestId('nft-card').length;

    // The exact window is a tuning detail; that it is bounded is not.
    expect(mounted).toBeGreaterThan(0);
    expect(mounted).toBeLessThan(NFT_COUNT / 4);
  });

  it('still renders neither the empty nor the error state with a full collection', () => {
    render(<CollectiblesScreen />);

    expect(screen.queryByTestId('collectibles-empty')).toBeNull();
    expect(screen.queryByTestId('collectibles-load-error')).toBeNull();
  });
});
