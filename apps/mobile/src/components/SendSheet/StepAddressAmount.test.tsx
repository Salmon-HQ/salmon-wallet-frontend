import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';

const mockUseAddressValidation = jest.fn();
const mockUseSendContacts = jest.fn();
const mockKeyboardHeight = jest.fn(() => 0);
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

// The number renderer reads the active language off i18next, so the language
// is what the separator tests move. Held in a mutable object because
// `jest.mock` is hoisted above every `const` that is not named `mock*`.
const mockI18n = { language: 'en' };
jest.mock('i18next', () => ({ __esModule: true, default: mockI18n }));

jest.mock('@salmon/shared', () => ({
  // The shared token renderer's own body. It cannot be pulled in with
  // `requireActual` — the module it lives in imports lodash-es, which this
  // preset leaves untransformed — so its two contract terms are restated:
  // `Intl` bound to the app language, and no thousands grouping.
  formatTokenAmount: (value: number | string) =>
    new Intl.NumberFormat(mockI18n.language, {
      maximumFractionDigits: 9,
      useGrouping: false,
    }).format(Number(value)),
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
    water: { light: '#9FE0EF' },
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
  fontFamilyNative: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    mono: 'GeistMonoRegular',
  },
  fontScaleCap: { chrome: 1.3, dense: 1.4 },
  fontSize: { xs: 12, sm: 14, base: 16, bodyLg: 18, xl: 24, mono: 13 },
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

jest.mock('../../../hooks/useKeyboardHeight', () => ({
  useKeyboardHeight: () => mockKeyboardHeight(),
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
    mockI18n.language = 'en';
    mockKeyboardHeight.mockReturnValue(0);

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

  // The selected-token card is a way back to token selection. A flow that has
  // no token-selection step must not draw it as a control at all — not merely
  // as a control whose handler does nothing.
  it('makes the selected token card actionable only when there is a token-selection step', () => {
    const onBack = jest.fn();

    const { rerender } = render(
      <StepAddressAmount
        token={token}
        blockchain="solana"
        account={account}
        onBack={onBack}
        onReview={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const card = screen.getByTestId('send-selected-token');
    expect(card.props.accessibilityLabel).toBe('accessibility.selected_token');
    fireEvent.press(card);
    expect(onBack).toHaveBeenCalledTimes(1);

    // Single-token chain: same card, same testID, but inert — no press
    // handler, no accessible name announcing it as actionable.
    rerender(
      <StepAddressAmount
        token={token}
        blockchain="bitcoin"
        account={account}
        onReview={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const inertCard = screen.getByTestId('send-selected-token');
    expect(inertCard.props.accessibilityLabel).toBeUndefined();
    expect(inertCard.props.onStartShouldSetResponder).toBeUndefined();
    fireEvent.press(inertCard);
    expect(onBack).toHaveBeenCalledTimes(1);

    // The card still shows the token; it simply stopped being a control.
    expect(inertCard.props.children).toBeTruthy();
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

  // The balance label is localized; the amount field is not, and must not be.
  // MAX derives from the numeric balance, and what it writes into the field is
  // parsed back on review and on send — so a Spanish comma there would be read
  // as a truncation. The two halves are asserted together because the bug this
  // guards against is precisely one of them following the other.
  it('localizes the balance label while MAX still fills a parseable number', () => {
    mockI18n.language = 'es';
    const onReview = jest.fn();

    render(
      <StepAddressAmount
        token={token}
        liveBalance={10.5}
        blockchain="solana"
        account={account}
        onBack={jest.fn()}
        onReview={onReview}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByText('10,5 USDC')).toBeTruthy();

    fireEvent.press(screen.getByText('Vault'));
    fireEvent.press(screen.getByText('general.max'));
    fireEvent.press(screen.getByText('Review & Send'));

    expect(screen.getByDisplayValue('10.5')).toBeTruthy();
    expect(onReview).toHaveBeenCalledWith(
      'Vault11111111111111111111111111111',
      '10.5',
      'ResolvedVault11111111111111111111111'
    );
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

  it('keeps the recipient message line in place whether or not there is a message', () => {
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

    // Nothing typed yet: the line is already there, holding its height with a
    // blank, so the Amount block below it cannot move when the error lands.
    // Mounted but hidden: it holds its line box while staying out of the
    // accessibility tree, which is why the query has to ask for hidden nodes.
    const emptySlot = screen.getByTestId('send-recipient-message', { includeHiddenElements: true });
    expect(emptySlot.props.children).toBe(' ');
    expect(screen.queryByTestId('send-recipient-message')).toBeNull();

    fireEvent.changeText(screen.getByPlaceholderText('Solana Address'), 'bad-address');

    expect(screen.getByTestId('send-recipient-message').props.children).toBe('Invalid recipient');
  });

  it('renders the recipient address in the mono face', () => {
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

    const recipient = StyleSheet.flatten(screen.getByTestId('send-recipient-input').props.style);
    expect(recipient.fontFamily).toBe('GeistMonoRegular');
    expect(recipient.fontSize).toBe(13);
  });

  it('lifts the action row clear of the keyboard', () => {
    mockKeyboardHeight.mockReturnValue(336);

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

    const row = StyleSheet.flatten(screen.getByTestId('send-action-row').props.style);
    expect(row.paddingBottom).toBeGreaterThanOrEqual(336);
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
