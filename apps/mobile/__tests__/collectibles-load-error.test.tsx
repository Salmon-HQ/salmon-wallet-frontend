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

jest.mock('../src/components/NftCard', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { NftCard: () => <View />, NftCardSkeleton: () => <View /> };
});

jest.mock('../src/components/NftDetailSheet', () => ({
  NftDetailSheet: () => null,
}));

jest.mock('../src/components/Icon', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { SolanaSvgIcon: () => <View /> };
});

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
});
