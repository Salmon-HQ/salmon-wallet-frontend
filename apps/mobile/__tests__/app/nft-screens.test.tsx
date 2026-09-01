/**
 * The NFT detail as screens (spec 019, delta D7) — what each screen owns.
 *
 * The risks the sheet's own suite guarded, carried over: a watch-only wallet
 * must not see a send or a burn at all, an account still resolving must see
 * them disabled rather than live, the burn trigger must announce what it does,
 * and the review must not sign anything on the way in.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockRouter = { back: jest.fn(), push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() };

/** Flipped per case; the `@salmon/shared` mock closes over it. */
let mockIsSignable = true;

const mockNft = {
  mint: 'Mint111',
  name: 'Blur NFT',
  collectionName: 'Blur Collection',
  image: 'https://example.com/nft.png',
  blockchain: 'solana',
  description: 'A collectible',
  attributes: [{ trait_type: 'Mood', value: 'Blurred' }],
  tokenStandard: 'NonFungible',
  compressed: false,
};

const mockFlow = {
  nft: mockNft as Record<string, unknown> | null,
  nftLoading: false,
  account: { getNetworkId: () => 'solana-mainnet' } as unknown,
  recipient: 'DestAddr111',
  setRecipient: jest.fn(),
  validatedRecipient: 'DestAddr111' as string | null,
  resolvedRecipient: null as string | null,
  setValidatedRecipient: jest.fn(),
  sending: false,
  sendError: null as string | null,
  submitSend: jest.fn(),
  burnPreview: { transaction: 'burn-transaction' } as Record<string, unknown> | null,
  burnPreparing: false,
  burnError: null as string | null,
  prepareBurn: jest.fn(),
  confirmBurn: jest.fn(),
  resetBurn: jest.fn(),
  successKind: null,
  successTxId: null,
  successSettling: false,
  explorerUrl: null,
  acknowledgeSuccess: jest.fn(),
  reset: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ id: 'Mint111', section: 'solana', sub: '0' }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('react-i18next', () => {
  const dictionary = require('../../../../packages/shared/src/locales/en/translation.json');
  const resolve = (key: string) =>
    key.split('.').reduce<unknown>((node, part) => (node as never)?.[part], dictionary);
  return {
    useTranslation: () => ({
      t: (key: string, fallback?: string) => (resolve(key) as string) ?? fallback ?? key,
    }),
  };
});

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../test-utils/themeTokens'),
  // The components barrel is imported whole, so exports that have nothing to
  // do with these screens still have to exist.
  ...jest.requireActual('../../../../packages/shared/src/motion/crest'),
  getSatRarityColor: () => '#ffffff',
  getShortAddress: (value: string) => (value ? `${value.slice(0, 4)}…${value.slice(-4)}` : null),
  isSignableAccount: () => mockIsSignable,
  isSolanaNft: (nft: { blockchain: string }) => nft.blockchain === 'solana',
  isBitcoinNft: (nft: { blockchain: string }) => nft.blockchain === 'bitcoin',
  formatRawAmount: () => '0.005',
  trackEvent: jest.fn(),
  tabularNums: { native: { fontVariant: ['tabular-nums'] } },
  useAddressValidation: () => ({
    validationState: 'valid',
    isValidating: false,
    isValid: true,
    resolvedAddress: null,
    message: null,
    messageType: null,
  }),
}));

jest.mock('../../src/contexts/NftFlowContext', () => ({
  useNftFlow: () => mockFlow,
}));

jest.mock('../../src/components/DepthBackground', () => ({ DepthBackground: () => null }));
jest.mock('../../src/components/ScalesBackground', () => ({ ScalesBackground: () => null }));
jest.mock('../../src/components/QRScanner', () => ({ QRScanner: () => null }));
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: (props: Record<string, unknown>) => <View {...props} /> };
});
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(true) }));

jest.mock('../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ floatingBottomOffset: 0, scrollBottomPadding: 0 }),
}));
jest.mock('../../hooks/useKeyboardHeight', () => ({ useKeyboardHeight: () => 0 }));
jest.mock('../../hooks/useCopyFeedback', () => ({
  useCopyFeedback: () => ({ copied: false, scale: { value: 1 }, trigger: jest.fn() }),
}));

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
    withSpring: (value: unknown) => value,
    runOnJS: (fn: unknown) => fn,
  };
});

import NftDetailScreen from '../../app/(app)/nft/[id]/index';
import NftSendScreen from '../../app/(app)/nft/[id]/send';
import NftSendReviewScreen from '../../app/(app)/nft/[id]/review';
import NftBurnScreen from '../../app/(app)/nft/[id]/burn';

beforeEach(() => {
  jest.clearAllMocks();
  mockIsSignable = true;
  mockFlow.nft = mockNft;
  mockFlow.account = { getNetworkId: () => 'solana-mainnet' };
  mockFlow.recipient = 'DestAddr111';
  mockFlow.validatedRecipient = 'DestAddr111';
  mockFlow.resolvedRecipient = null;
  mockFlow.sending = false;
  mockFlow.sendError = null;
  mockFlow.burnPreview = { transaction: 'burn-transaction' };
  mockFlow.burnPreparing = false;
  mockFlow.burnError = null;
});

describe('the NFT detail screen', () => {
  it('shows everything the sheet showed: media, description, traits and chain facts', () => {
    render(<NftDetailScreen />);

    expect(screen.getByTestId('nft-detail-image')).toBeTruthy();
    expect(screen.getByTestId('nft-detail-description')).toBeTruthy();
    expect(screen.getByTestId('nft-detail-attributes')).toBeTruthy();
    expect(screen.getByTestId('nft-detail-blockchain')).toBeTruthy();
    expect(screen.getByText('Mood')).toBeTruthy();
    expect(screen.getByText('Blurred')).toBeTruthy();
    expect(screen.getByTestId('nft-detail-copy-mint')).toBeTruthy();
  });

  it('pushes the send step rather than opening anything in place', () => {
    render(<NftDetailScreen />);

    fireEvent.press(screen.getByTestId('nft-detail-send-button'));

    expect(mockRouter.push).toHaveBeenCalledWith('/nft/Mint111/send?section=solana&sub=0');
  });

  // The preview is built on the way in, exactly as the sheet's trigger built it.
  it('prepares the burn on the way to the burn review', () => {
    render(<NftDetailScreen />);

    fireEvent.press(screen.getByTestId('nft-detail-burn-button'));

    expect(mockRouter.push).toHaveBeenCalledWith('/nft/Mint111/burn?section=solana&sub=0');
    expect(mockFlow.prepareBurn).toHaveBeenCalled();
  });

  it('announces the burn as irreversible before the confirm step does', () => {
    render(<NftDetailScreen />);

    const burn = screen.getByTestId('nft-detail-burn-button');
    expect(burn.props.accessibilityHint).toContain('irreversible');
  });

  it('hides send and burn entirely for a wallet that can never sign', () => {
    // Gone, not greyed: a disabled control would be a promise the wallet
    // cannot keep, and a greyed burn used to read as live.
    mockIsSignable = false;

    render(<NftDetailScreen />);

    expect(screen.queryByTestId('nft-detail-send-button')).toBeNull();
    expect(screen.queryByTestId('nft-detail-burn-button')).toBeNull();
  });

  it('keeps them disabled while the account is still resolving', () => {
    mockFlow.account = undefined;

    render(<NftDetailScreen />);

    expect(screen.getByTestId('nft-detail-send-button').props.accessibilityState.disabled).toBe(
      true
    );
    expect(screen.getByTestId('nft-detail-burn-button').props.accessibilityState.disabled).toBe(
      true
    );
  });
});

describe('the NFT send screen', () => {
  it('records the verdict and pushes the review', () => {
    render(<NftSendScreen />);

    fireEvent.press(screen.getByTestId('nft-send-continue-button'));

    expect(mockFlow.setValidatedRecipient).toHaveBeenCalledWith('DestAddr111', null);
    expect(mockRouter.push).toHaveBeenCalledWith('/nft/Mint111/review?section=solana&sub=0');
  });

  // The hook holds the previous string's verdict for the 500ms the debounce is
  // pending, so an edit must block Continue on its own.
  it('blocks Continue for the debounce window after an edit', () => {
    render(<NftSendScreen />);

    fireEvent.changeText(screen.getByTestId('send-recipient-input'), 'OtherAddr222');

    expect(screen.getByTestId('nft-send-continue-button').props.accessibilityState.disabled).toBe(
      true
    );
  });

  it('offers no way forward for an ordinal, which cannot be transferred yet', () => {
    mockFlow.nft = { ...mockNft, blockchain: 'bitcoin' };

    render(<NftSendScreen />);

    expect(screen.queryByTestId('nft-send-continue-button')).toBeNull();
    expect(screen.getByText('Ordinal transfers are not yet supported.')).toBeTruthy();
  });
});

describe('the NFT review screen', () => {
  it('shows what will move and signs nothing on the way in', () => {
    render(<NftSendReviewScreen />);

    // The name is on the header and on the summary card; the card is the one
    // that carries what the signature will move.
    expect(screen.getByTestId('nft-send-review-summary')).toBeTruthy();
    expect(screen.getAllByText('Blur NFT').length).toBeGreaterThan(0);
    expect(screen.getByText('Blur Collection')).toBeTruthy();
    expect(screen.getByTestId('nft-send-review-recipient')).toBeTruthy();
    expect(mockFlow.submitSend).not.toHaveBeenCalled();
  });

  it('commits only from the confirm control', () => {
    render(<NftSendReviewScreen />);

    fireEvent.press(screen.getByTestId('nft-send-confirm-button'));

    expect(mockFlow.submitSend).toHaveBeenCalledTimes(1);
  });

  // The regression this guards: gating on `!!recipient` would sign for a
  // string the validator never approved.
  it('refuses to confirm a recipient the validator did not approve', () => {
    mockFlow.validatedRecipient = 'OtherAddr222';

    render(<NftSendReviewScreen />);

    expect(screen.getByTestId('nft-send-confirm-button').props.accessibilityState.disabled).toBe(
      true
    );
  });

  it('refuses to confirm when no verdict travelled with the flow', () => {
    mockFlow.validatedRecipient = null;

    render(<NftSendReviewScreen />);

    expect(screen.getByTestId('nft-send-confirm-button').props.accessibilityState.disabled).toBe(
      true
    );
  });

  // A domain is paid at the address it resolved to, and the screen shows both.
  it('shows the resolved address under the domain that produced it', () => {
    mockFlow.recipient = 'bob.sol';
    mockFlow.validatedRecipient = 'bob.sol';
    mockFlow.resolvedRecipient = 'DestAddr111';

    render(<NftSendReviewScreen />);

    expect(screen.getByTestId('nft-send-review-resolved-from')).toBeTruthy();
    expect(screen.getByText('bob.sol')).toBeTruthy();
  });

  it('refuses to confirm for a wallet that cannot sign', () => {
    mockIsSignable = false;

    render(<NftSendReviewScreen />);

    expect(screen.getByTestId('nft-send-confirm-button').props.accessibilityState.disabled).toBe(
      true
    );
  });
});

describe('the NFT burn screen', () => {
  it('discloses the lookup table cost before the confirm', () => {
    mockFlow.burnPreview = {
      transaction: 'burn-transaction',
      lookupTable: {
        estimatedRentLamports: 5_000_000,
        addressCount: 12,
        extendTransactionCount: 1,
      },
    };

    render(<NftBurnScreen />);

    expect(screen.getByTestId('nft-burn-lut')).toBeTruthy();
    expect(screen.getByText('Addresses stored')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    // extendTransactionCount + 1 — the extends plus the burn itself.
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('holds the confirm until a preview exists', () => {
    mockFlow.burnPreview = null;

    render(<NftBurnScreen />);

    expect(screen.getByTestId('nft-burn-confirm-button').props.accessibilityState.disabled).toBe(
      true
    );
  });

  it('holds the confirm while the preview reports an error', () => {
    mockFlow.burnError = 'nft.burn.insufficientFeeSol';

    render(<NftBurnScreen />);

    expect(screen.getByTestId('nft-burn-confirm-button').props.accessibilityState.disabled).toBe(
      true
    );
    expect(screen.getByTestId('nft-burn-error')).toBeTruthy();
  });

  it('fires the flow s confirm once the preview is ready', () => {
    render(<NftBurnScreen />);

    fireEvent.press(screen.getByTestId('nft-burn-confirm-button'));

    expect(mockFlow.confirmBurn).toHaveBeenCalledTimes(1);
  });
});
