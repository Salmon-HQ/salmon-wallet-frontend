import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

const mockSendNft = jest.fn();
// Stable across renders: a fresh `reset` identity would re-fire the sheet's
// reset effect on every render and snap the flow back to the detail step.
const mockNftTransfer = { sendNft: mockSendNft, reset: jest.fn(), settling: false };

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
    status: {
      success: '#33D6A6',
      danger: '#FF6B85',
      warning: '#FFB020',
      dangerTint: 'rgba(239,68,68,0.1)',
    },
    state: { hover: 'rgba(199,211,232,0.06)', press: 'rgba(199,211,232,0.10)' },
    flesh: { band: '#FFF1EE' },
  },
  fleshTile: { width: 380, height: 40 },
  fleshFills: [],
  colors: {
    text: { primary: '#fff', secondary: '#aaa', tertiary: '#888', balance: '#fff' },
    accent: { primary: '#0f0', border: '#0c0' },
    border: { default: '#333' },
    background: { tokenItem: '#111', interactive: '#222' },
    interactive: { surface: '#111' },
    status: { error: '#f00' },
  },
  fontSize: { sm: 14, bodyLg: 18, base: 16, headline: 24 },
  borderRadius: { badge: 12, iconContainer: 18, button: 16 },
  fontFamilyNative: {
    bold: 'System',
    semiBold: 'DMSansSemiBold',
    medium: 'System',
    regular: 'System',
  },
  gradients: { primaryButton: { colors: ['#0f0'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } },
  shadows: { imageHero: {} },
  componentSizes: { nftImageMaxWidth: 200, sheetFadeGradientHeight: 40 },
  ms: (value: number) => value,
  vs: (value: number) => value,
  s: (value: number) => value,
  isSolanaNft: () => true,
  isBitcoinNft: () => false,
  isSignableAccount: () => true,
  getSatRarityColor: () => '#fff',
  getShortAddress: () => 'Mint...111',
  borderWidth: { thin: 1, actionButton: 1 },
  letterSpacing: { label: 0, wider: 1 },
  lineHeight: { normal: 1.4 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, base: 8, headerPadding: 16 },
  fontWeight: { medium: '500' },
  formatRawAmount: () => '0',
  trackEvent: jest.fn(),
  useNftTransfer: () => mockNftTransfer,
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

// A stand-in that immediately reports a valid recipient, so the flow can
// advance without exercising the real validation pipeline.
jest.mock('../InputAddress', () => {
  const React = require('react');
  return {
    InputAddress: ({
      onChange,
      onValidation,
    }: {
      onChange: (address: string) => void;
      onValidation: (result: { isValid: boolean }) => void;
    }) => {
      React.useEffect(() => {
        onChange('DestAddr111');
        onValidation({ isValid: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- test stub: fire once
      }, []);
      return null;
    },
  };
});

jest.mock('../TransactionSuccessScreen', () => {
  const { View } = require('react-native');
  return {
    TransactionSuccessScreen: () => <View testID="transaction-success-screen" />,
  };
});

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

  // The trait is the information; its name is only the label for it.
  it('gives the attribute value the emphasis and the label the quiet ink', () => {
    const { colors } = require('@salmon/shared');

    render(
      <NftDetailSheet
        visible
        onClose={jest.fn()}
        nft={
          {
            mint: 'Mint111',
            name: 'Trait NFT',
            image: 'https://example.com/nft.png',
            blockchain: 'solana',
            attributes: [{ trait_type: 'Mood', value: 'Blurred' }],
          } as any
        }
      />
    );

    const label = StyleSheet.flatten(screen.getByText('Mood').props.style);
    const value = StyleSheet.flatten(screen.getByText('Blurred').props.style);

    expect(label.color).toBe(colors.text.tertiary);
    expect(value.color).toBe(colors.text.primary);
  });

  it('renders Burn as a destructive trigger, not a peer of Send', () => {
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
          } as any
        }
      />
    );

    const burn = screen.getByTestId('nft-detail-burn-button');
    // The announced consequence — a channel that survives with colour off.
    expect(burn.props.accessibilityHint).toContain('irreversible');
    // Danger ink on the label, not the neutral ink Send's peers wear.
    const burnLabel = StyleSheet.flatten(screen.getByText('Burn').props.style) as {
      color?: string;
    };
    expect(burnLabel.color).toBe('#FF6B85');
    // And the wrapper wears the danger tint with a danger edge.
    const burnWrapper = mockBlurContainer.mock.calls
      .map(([props]) => props as { backgroundColor?: string; borderColor?: string })
      .find((props) => props.backgroundColor === 'rgba(239,68,68,0.1)');
    expect(burnWrapper?.borderColor).toBe('#FF6B85');

    // Send is untouched: it stays the primary, on the salmon fill.
    const sendLabel = StyleSheet.flatten(screen.getByText('Send').props.style) as {
      color?: string;
    };
    expect(sendLabel.color).toBe('#070911');
  });

  describe('send review flow', () => {
    const nft = {
      mint: 'Mint111',
      name: 'Blur NFT',
      image: 'https://example.com/nft.png',
      blockchain: 'solana',
      collectionName: 'Blur Collection',
    } as any;

    // A signable Solana account: send and burn both gate on isSignableAccount.
    const account = { getNetworkId: () => 'solana-mainnet', canSign: true } as any;

    beforeEach(() => {
      mockSendNft.mockReset();
      // The native-driven step slide never completes under Jest; finish it
      // synchronously so the step machine advances.
      jest.spyOn(Animated, 'timing').mockReturnValue({
        start: (cb?: Animated.EndCallback) => cb?.({ finished: true }),
      } as unknown as Animated.CompositeAnimation);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    const goToReview = () => {
      fireEvent.press(screen.getByTestId('nft-detail-send-button'));
      fireEvent.press(screen.getByTestId('nft-send-continue-button'));
    };

    it('shows a review step with the NFT, collection and recipient before signing', () => {
      render(<NftDetailSheet visible onClose={jest.fn()} nft={nft} account={account} />);

      goToReview();

      expect(screen.getByText('Blur NFT')).toBeTruthy();
      expect(screen.getByText('Blur Collection')).toBeTruthy();
      expect(screen.getByTestId('nft-send-review-recipient').props.children).toBe('Mint...111');
      // Nothing was signed on the way to review.
      expect(mockSendNft).not.toHaveBeenCalled();
    });

    it('sends only from the review confirm and then shows the success screen', async () => {
      mockSendNft.mockResolvedValue({ txId: 'tx123' });
      render(<NftDetailSheet visible onClose={jest.fn()} nft={nft} account={account} />);

      goToReview();

      fireEvent.press(screen.getByTestId('nft-send-confirm-button'));
      await act(async () => {});

      expect(mockSendNft).toHaveBeenCalledWith(nft, 'DestAddr111');
      expect(screen.getByTestId('transaction-success-screen')).toBeTruthy();
    });
  });
});
