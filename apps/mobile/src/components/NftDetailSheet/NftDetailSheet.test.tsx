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

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// Reanimated pulls the Worklets native module, which does not exist under
// Jest. The motion vocabulary itself is asserted in
// `src/utils/motion.ts`'s consumers; here the animation layer only has to
// exist.
jest.mock('react-native-reanimated', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: { View, Text, createAnimatedComponent: (c: unknown) => c },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => false,
    withTiming: (value: unknown) => value,
    withDelay: (_delay: number, value: unknown) => value,
    withSpring: (value: unknown) => value,
    withRepeat: (value: unknown) => value,
    withSequence: (value: unknown) => value,
    runOnJS: (fn: unknown) => fn,
    interpolate: () => 0,
    Easing: {
      in: (fn: unknown) => fn,
      out: (fn: unknown) => fn,
      inOut: (fn: unknown) => fn,
      linear: (t: number) => t,
      ease: (t: number) => t,
      cubic: (t: number) => t,
      bezier: (...args: number[]) => args,
    },
  };
});

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
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
    flesh: { band: '#FFF1EE' },
  },
  fleshTile: { width: 380, height: 40 },
  fleshFills: [],
  colors: {
    text: { primary: '#fff', secondary: '#aaa', balance: '#fff' },
    accent: { primary: '#0f0', border: '#0c0' },
    border: { default: '#333' },
    background: { tokenItem: '#111', interactive: '#222' },
    interactive: { surface: '#111' },
    status: { error: '#f00' },
  },
  fontSize: { sm: 14, bodyLg: 18, base: 16, '2xl': 24 },
  borderRadius: { badge: 12, iconContainer: 18, button: 16 },
  fontFamilyNative: { bold: 'System', medium: 'System', regular: 'System' },
  gradients: { primaryButton: { colors: ['#0f0'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } },
  shadows: { imageHero: {} },
  componentSizes: { nftImageMaxWidth: 200, sheetFadeGradientHeight: 40 },
  ms: (value: number) => value,
  vs: (value: number) => value,
  s: (value: number) => value,
  isSolanaNft: () => true,
  isBitcoinNft: () => false,
  getSatRarityColor: () => '#fff',
  getShortAddress: () => 'Mint...111',
  borderWidth: { thin: 1, actionButton: 1 },
  letterSpacing: { wide: 0 },
  lineHeight: { normal: 1.4 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, base: 8, headerPadding: 16 },
  fontWeight: { medium: '500' },
  formatRawAmount: () => '0',
  trackEvent: jest.fn(),
  useNftTransfer: () => ({ sendNft: jest.fn(), reset: jest.fn() }),
  getTransactionUrl: () => null,
  getDefaultExplorer: () => 'solscan',
}));

jest.mock('../../../hooks/useBottomSheetChrome', () => ({
  useBottomSheetChrome: () => ({
    bottomInset: 0,
    spaciousContentBottomPadding: 0,
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

jest.mock('../BottomSheetTitleHeader', () => ({
  BottomSheetTitleHeader: () => null,
}));

jest.mock('../InputAddress', () => ({
  InputAddress: () => null,
}));

jest.mock('../TransactionSuccessScreen', () => ({
  TransactionSuccessScreen: () => null,
}));

import { NftDetailSheet } from './NftDetailSheet';

describe('NftDetailSheet', () => {
  beforeEach(() => {
    mockBlurContainer.mockClear();
  });

  it('uses BlurContainer for the glass sections in the detail step', () => {
    render(
      <NftDetailSheet
        visible
        onClose={jest.fn()}
        nft={
          {
            mint: 'Mint111',
            name: 'Blur NFT',
            image: 'https://example.com/nft.png',
            blockchain: 'solana',
            description: 'A collectible',
            attributes: [{ trait_type: 'Mood', value: 'Blurred' }],
          } as any
        }
      />
    );

    expect(screen.getByText('Description')).toBeTruthy();
    expect(screen.getByText('Attributes')).toBeTruthy();
    expect(screen.getByText('Details')).toBeTruthy();
    expect(screen.getAllByTestId('blur-container').length).toBeGreaterThanOrEqual(4);
  });
});
