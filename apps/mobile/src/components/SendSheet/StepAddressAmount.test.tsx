import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';

const mockUseAddressValidation = jest.fn();
const mockUseSendContacts = jest.fn();
var mockScannerProps: any;

jest.mock('../QRScanner', () => ({
  QRScanner: (props: any) => {
    mockScannerProps = props;
    return null;
  },
}));

// The action row is the shared PrimaryButton / SecondaryButton now, which
// pulls Reanimated for its press motion. Jest has no native Worklets, so stand
// the module up with the handful of primitives those buttons touch.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component: unknown) => Component,
    },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (toValue: unknown) => toValue,
    Easing: { bezier: () => () => 0 },
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      _key: string,
      fallbackOrOptions?: string | { blockchain?: string; defaultValue?: string }
    ) =>
      typeof fallbackOrOptions === 'string'
        ? fallbackOrOptions
        : (fallbackOrOptions?.defaultValue ?? _key),
  }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@salmon/shared', () => ({
  // `usePressMotion` inside the shared buttons reads the motion vocabulary.
  motionEasing: {
    current: { native: [0.32, 0.72, 0, 1] },
    settle: { native: [0.22, 1, 0.36, 1] },
    sink: { native: [0.4, 0, 1, 1] },
    swellIn: { native: [0.34, 1.2, 0.64, 1] },
  },
  motionMs: { flick: 90, feedbackHold: 1600 },
  resolveMotionMs: (ms: number) => ms,
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
  sanitizeDecimalInput: (text: string) => text.replace(/,/g, '.'),
  borderRadius: { lg: 16, sm: 8, button: 16, badge: 12 },
  borderWidth: { thin: 1 },
  accent: { border: '#0f0' },
  fleshTile: { width: 380, height: 40 },
  fleshFills: [],
  colors: {
    accent: { border: '#0f0' },
    text: { primary: '#fff', secondary: '#999' },
    status: { error: '#f00', warning: '#fc0', success: '#0f0' },
    button: {
      secondaryBackground: '#222',
      cancelBackground: '#111',
      primaryBackground: '#FF5C45',
      primaryText: '#070911',
      disabledOpacity: 0.5,
    },
    background: { card: '#111', tertiary: '#333' },
    border: { default: '#444' },
  },
  // The action row is the shared PrimaryButton / SecondaryButton now, so this
  // mock has to cover the tokens those buttons read too.
  componentSizes: {
    buttonHeightMedium: 48,
    buttonHeight: 56,
    buttonRadius: 12,
    buttonFleshScale: 1,
  },
  letterSpacing: { widest: 1 },
  shadowsCSS: { bezel: 'none' },
  fontFamilyNative: { regular: 'System', medium: 'System', bold: 'System' },
  fontScaleCap: { chrome: 1.3, dense: 1.4 },
  fontSize: { xs: 12, sm: 14, base: 16, bodyLg: 18, xl: 24 },
  getShortAddress: (value: string) => `${value.slice(0, 4)}...${value.slice(-4)}`,
  gradients: {
    primary: { colors: ['#0f0', '#0c0'] },
    disabled: { colors: ['#555', '#444'] },
  },
  ms: (value: number) => value,
  vs: (value: number) => value,
  s: (value: number) => value,
  opacity: { disabled: 0.5 },
  shadows: { button: {} },
  spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, base: 10, headerPadding: 20, '2xl': 24 },
  useAddressValidation: (...args: unknown[]) => mockUseAddressValidation(...args),
  useCurrencyContext: () => [
    { currency: 'usd' },
    { formatPrecise: (value: number) => value.toFixed(2) },
  ],
  useSendContacts: (...args: unknown[]) => mockUseSendContacts(...args),
}));

jest.mock('../../../hooks/useBottomSheetChrome', () => ({
  useBottomSheetChrome: () => ({
    actionRowBottomPadding: 0,
    compactContentBottomPadding: 0,
  }),
}));

jest.mock('../BlurContainer', () => ({
  BlurContainer: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../TokenLogo', () => ({
  TokenLogo: () => null,
}));

import { StepAddressAmount } from './StepAddressAmount';

const account = {
  getReceiveAddress: () => 'Sender111111111111111111111111111111',
} as any;

const token = {
  name: 'USD Coin',
  symbol: 'USDC',
  uiAmount: 4,
  decimals: 2,
  price: 2,
} as any;

describe('StepAddressAmount', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSendContacts.mockReturnValue({
      contacts: [
        { name: 'Alice', address: 'Alice11111111111111111111111111111', blockchain: 'solana' },
      ],
      ownWallets: [{ accountName: 'Vault', address: 'Vault11111111111111111111111111111' }],
      isLoading: false,
    });

    mockUseAddressValidation.mockImplementation((address: string) => {
      if (address.trim() === 'Vault11111111111111111111111111111') {
        return {
          validationState: 'valid',
          isValidating: false,
          isValid: true,
          resolvedAddress: 'ResolvedVault11111111111111111111111',
          message: null,
          messageType: null,
        };
      }

      return {
        validationState: address ? 'invalid' : 'idle',
        isValidating: false,
        isValid: false,
        resolvedAddress: null,
        message: address ? 'Invalid recipient' : null,
        messageType: address ? 'error' : null,
      };
    });
  });

  it('fills recipient from own wallets, quick-fills amount and reviews with resolved address', () => {
    const onReview = jest.fn();

    render(
      <StepAddressAmount
        token={token}
        blockchain="solana"
        account={account}
        onBack={jest.fn()}
        onReview={onReview}
        onCancel={jest.fn()}
      />
    );

    fireEvent.press(screen.getByText('Vault'));
    fireEvent.press(screen.getByText('general.max'));
    fireEvent.press(screen.getByText('Review & Send'));

    expect(screen.getByDisplayValue('4')).toBeTruthy();
    expect(screen.getByText('8.00 USD')).toBeTruthy();
    expect(onReview).toHaveBeenCalledWith(
      'Vault11111111111111111111111111111',
      '4',
      'ResolvedVault11111111111111111111111'
    );
  });

  it('uses liveBalance over snapshot uiAmount for MAX quick fill', () => {
    // token snapshot says 4 USDC but liveBalance reflects an inbound transfer
    // of 6 USDC bringing the live total to 10. MAX must fill 10, not 4.
    render(
      <StepAddressAmount
        token={token}
        liveBalance={10}
        blockchain="solana"
        account={account}
        onBack={jest.fn()}
        onReview={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    fireEvent.press(screen.getByText('general.max'));

    expect(screen.getByDisplayValue('10')).toBeTruthy();
  });

  it('shows validation feedback and keeps review disabled for invalid address', () => {
    const view = render(
      <StepAddressAmount
        token={token}
        blockchain="solana"
        account={account}
        onBack={jest.fn()}
        onReview={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    fireEvent.changeText(screen.getByPlaceholderText('Solana Address'), 'bad-address');
    fireEvent.changeText(screen.getByPlaceholderText('0'), '1');

    expect(screen.getByText('Invalid recipient')).toBeTruthy();
    const touchables = view.UNSAFE_getAllByType(TouchableOpacity);
    expect(touchables.at(-1)?.props.disabled).toBe(true);
  });

  it('preserves a typed address when the scanner is dismissed, fills address and amount on scan', () => {
    render(
      <StepAddressAmount
        token={token}
        blockchain="solana"
        account={account}
        onBack={jest.fn()}
        onReview={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(mockScannerProps.visible).toBe(false);
    expect(mockScannerProps.blockchain).toBe('solana');

    fireEvent.changeText(screen.getByPlaceholderText('Solana Address'), 'typed-address');
    fireEvent.press(screen.getByTestId('send-scan-button'));
    expect(mockScannerProps.visible).toBe(true);

    act(() => mockScannerProps.onClose());
    expect(mockScannerProps.visible).toBe(false);
    expect(screen.getByDisplayValue('typed-address')).toBeTruthy();

    fireEvent.press(screen.getByTestId('send-scan-button'));
    act(() =>
      mockScannerProps.onScan({
        data: 'solana:Scanned11111111111111111111111111111?amount=2',
        address: 'Scanned11111111111111111111111111111',
        amount: '2',
      })
    );

    expect(screen.getByDisplayValue('Scanned11111111111111111111111111111')).toBeTruthy();
    expect(screen.getByDisplayValue('2')).toBeTruthy();
    expect(mockScannerProps.visible).toBe(false);
  });
});
