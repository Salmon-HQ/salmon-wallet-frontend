import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import CollectiblesScreen from '../app/(app)/(tabs)/collectibles';

const mockCreateBurnTransaction = jest.fn();
const mockSignAndSendPreparedSolanaTransactions = jest.fn();
const mockUseSolanaNftsRefresh = jest.fn();
const mockUseSolanaNfts = jest.fn();
const mockCanonicalNftToSolanaNftData = jest.fn();
const mockUseAccountsContext = jest.fn();
const mockInvalidateAfterTx = jest.fn();

const mockRawNft = {
  mint: { address: 'Mint111' },
  owner: 'Owner111',
  name: 'Burnable NFT',
  symbol: 'BURN',
  uri: '',
  json: {},
  updateAuthorityAddress: null,
  sellerFeeBasisPoints: 0,
  collection: null,
  edition: null,
  tokenStandard: 'NonFungible',
  media: 'https://example.com/nft.png',
  description: '',
  compressed: false,
  extras: {
    attributes: [],
    properties: {},
    creators: [],
  },
  extensions: [],
};

const mockNftData = {
  mint: 'Mint111',
  name: 'Burnable NFT',
  image: 'https://example.com/nft.png',
  media: 'https://example.com/nft.png',
  blockchain: 'solana',
};

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
  canonicalNftToSolanaNftData: (...args: unknown[]) => mockCanonicalNftToSolanaNftData(...args),
  borderRadius: { md: 12 },
  colors: {
    accent: { primary: '#00ff99', tint: '#003322', border: '#00aa66' },
    text: { primary: '#fff', muted: '#999' },
  },
  createBurnTransaction: (...args: unknown[]) => mockCreateBurnTransaction(...args),
  fontFamilyNative: { semiBold: 'System', medium: 'System' },
  fontSize: { bodyLg: 16, sm: 14, xl: 20 },
  signAndSendPreparedSolanaTransactions: (...args: unknown[]) =>
    mockSignAndSendPreparedSolanaTransactions(...args),
  letterSpacing: { wide: 0, wider: 0 },
  spacing: { sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, headerPadding: 16 },
  getNftSectionTitle: () => 'Solana',
  getShortAddress: () => 'Owne...r111',
  ms: (value: number) => value,
  s: (value: number) => value,
  useAccountsContext: () => mockUseAccountsContext(),
  useSettleAfterTx: () => mockInvalidateAfterTx,
  // Minimal stub: forwards to the spy so the test can assert the screen's
  // wiring without reimplementing the real hook's settlement logic.
  useNftBurn: ({ account }: { account: unknown }) => ({
    burnNft: (prepared: unknown) => mockSignAndSendPreparedSolanaTransactions(account, prepared),
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
  const { Pressable, Text, View } = require('react-native');

  return {
    NftCard: ({ nft, onPress }: { nft: { name: string }; onPress: () => void }) => (
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text>{nft.name}</Text>
      </Pressable>
    ),
    NftCardSkeleton: () => <View />,
    NftDetailSheet: ({
      visible,
      onBurnPress,
      onBurnConfirm,
    }: {
      visible: boolean;
      onBurnPress: () => void;
      onBurnConfirm: () => void;
    }) =>
      visible ? (
        <View>
          <Pressable accessibilityRole="button" onPress={onBurnPress}>
            <Text>Prepare Burn</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onBurnConfirm}>
            <Text>Confirm Burn</Text>
          </Pressable>
        </View>
      ) : null,
    SolanaSvgIcon: () => <View />,
    SubAccountSelector: () => <View />,
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

describe('Collectibles burn reconciliation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockCanonicalNftToSolanaNftData.mockReturnValue(mockNftData);
    mockCreateBurnTransaction.mockResolvedValue({
      transaction: 'burn-transaction',
    });
    mockSignAndSendPreparedSolanaTransactions.mockResolvedValue(['signature-111']);
    mockInvalidateAfterTx.mockResolvedValue(undefined);
    mockUseAccountsContext.mockReturnValue([
      {
        ready: true,
        activeBlockchainAccount: { id: 'active-solana-account' },
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

    // useSolanaNfts hook returns the canonical NFT list and a refresh() function.
    // Burn flow now settles the matching react-query caches instead of relying
    // on a one-off local refresh.
    mockUseSolanaNftsRefresh.mockResolvedValue(undefined);
    mockUseSolanaNfts.mockImplementation(({ networkId }: { networkId: string }) => ({
      nfts: networkId === 'solana-mainnet' ? [mockRawNft] : [],
      loading: false,
      error: null,
      isError: false,
      refresh: mockUseSolanaNftsRefresh,
    }));
  });

  it('wires burn preparation and signing through the shared contracts', async () => {
    render(<CollectiblesScreen />);

    await screen.findByText('Burnable NFT');

    fireEvent.press(screen.getByText('Burnable NFT'));
    fireEvent.press(screen.getByText('Prepare Burn'));

    await waitFor(() => {
      expect(mockCreateBurnTransaction).toHaveBeenCalledWith(
        { mintAddress: 'Mint111', ownerAddress: 'Owner111' },
        'solana-mainnet'
      );
    });

    fireEvent.press(screen.getByText('Confirm Burn'));

    await waitFor(() => {
      expect(mockSignAndSendPreparedSolanaTransactions).toHaveBeenCalledTimes(1);
      // The screen hands the prepared transaction from the preview straight to burnNft.
      expect(mockSignAndSendPreparedSolanaTransactions).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ transaction: 'burn-transaction' })
      );
    });
  });
});
