import React from 'react';
import { View } from 'react-native';
import { render, screen } from '@testing-library/react-native';

const mockBlurContainer = jest.fn(({ children }: { children?: React.ReactNode }) => (
  <View testID="blur-container">{children}</View>
));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

jest.mock('expo-image', () => ({
  Image: () => null,
}));

jest.mock('@salmon/shared', () => ({
  tabularNums: { native: { fontVariant: ['tabular-nums'] }, css: {} },
  // "Deep Water" semantic tokens. Components read these directly now; the
  // legacy `colors` map below still covers everything not yet migrated.
  semantic: {
    accent: { fill: '#FF5C45', onFill: '#070911', ink: '#FF5C45', tint: 'rgba(255,92,69,0.1)' },
    text: {
      primary: '#F6F8FB',
      secondary: '#A7B1C4',
      tertiary: '#8B96AD',
      disabled: '#6F7B95',
      accent: '#FF5C45',
      onAccent: '#070911',
      onGlass: '#F6F8FB',
    },
    border: { default: '#58637B', raised: '#6F7B95', strong: '#8B96AD' },
    surface: { shelf: '#10131C', raised: '#161C2D', crest: '#1B2233', bedrock: '#0B0F19' },
    status: { success: '#33D6A6', danger: '#FF6B85', warning: '#FFB020' },
    state: { hover: 'rgba(199,211,232,0.06)', press: 'rgba(199,211,232,0.10)' },
  },
  colors: {
    button: { disabledOpacity: 0.5 },
    text: { primary: '#fff', secondary: '#aaa', balance: '#fff' },
    accent: { primary: '#0f0' },
    border: { default: '#333' },
    background: { tokenItem: '#111', tertiary: '#222', card: '#000' },
    status: { error: '#f00' },
  },
  fontSize: { sm: 14, base: 16, bodyLg: 18, '2xl': 24 },
  borderRadius: { lg: 16, badge: 12, iconContainer: 18, button: 16 },
  borderWidth: { thin: 1, actionButton: 1 },
  componentSizes: { nftImageMaxWidth: 200, buttonHeightMedium: 48 },
  ms: (value: number) => value,
  vs: (value: number) => value,
  s: (value: number) => value,
  useNftTransfer: () => ({
    sendNft: jest.fn(),
    reset: jest.fn(),
  }),
  fontFamilyNative: {
    bold: 'System',
    medium: 'System',
    regular: 'System',
  },
  fontScaleCap: { chrome: 1.3, dense: 1.4 },
  type: {},
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, base: 8, headerPadding: 16, '2xl': 24 },
  fontWeight: { semibold: '600', medium: '500' },
  getNftBlockchainLabel: () => 'Solana',
  isSolanaNft: () => true,
  isBitcoinNft: () => false,
  lineHeight: { normal: 1.4 },
  gradients: { primaryButton: { colors: ['#0f0'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } },
  shadows: { imageHero: {} },
}));

jest.mock('../../../hooks/useBottomSheetChrome', () => ({
  useBottomSheetChrome: () => ({
    actionRowBottomPadding: 0,
    compactContentBottomPadding: 0,
  }),
}));

jest.mock('../BlurContainer', () => ({
  BlurContainer: (props: { children?: React.ReactNode }) => mockBlurContainer(props),
}));

jest.mock('../BottomSheetContainer', () => ({
  BottomSheetContainer: ({
    children,
    headerContent,
  }: {
    children?: React.ReactNode;
    headerContent?: React.ReactNode;
  }) => (
    <>
      {headerContent}
      {children}
    </>
  ),
}));

jest.mock('../InputAddress', () => ({
  InputAddress: () => null,
}));

jest.mock('../Icon/SvgIcons', () => ({
  BitcoinSvgIcon: () => null,
  CallMadeSvgIcon: () => null,
  EthereumSvgIcon: () => null,
  SolanaSvgIcon: () => null,
}));

import { NftSendSheet } from './NftSendSheet';

describe('NftSendSheet', () => {
  beforeEach(() => {
    mockBlurContainer.mockClear();
  });

  it('uses BlurContainer for the blockchain badge and content section', () => {
    render(
      <NftSendSheet
        visible
        onClose={jest.fn()}
        nft={
          {
            mint: 'Mint111',
            name: 'Blur NFT',
            image: 'https://example.com/nft.png',
            blockchain: 'solana',
            collectionName: 'Collection',
          } as any
        }
        account={undefined}
      />
    );

    expect(screen.getByText('Blur NFT')).toBeTruthy();
    expect(screen.getByText('Send NFT')).toBeTruthy();
    expect(screen.getAllByTestId('blur-container')).toHaveLength(2);
  });
});
