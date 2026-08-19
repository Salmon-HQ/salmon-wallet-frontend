import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { componentSizes } from '@salmon/shared';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: unknown) =>
      options && typeof options === 'object'
        ? `${key}:${Object.values(options as Record<string, unknown>).join(',')}`
        : key,
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
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

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const mockEstimateFee = jest.fn(async () => null);

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/hooks/useCopyFeedback'),
  // `usePressMotion` inside the shared buttons reads the motion vocabulary.
  motionEasing: {
    current: { native: [0.32, 0.72, 0, 1] },
    settle: { native: [0.22, 1, 0.36, 1] },
    sink: { native: [0.4, 0, 1, 1] },
    swellIn: { native: [0.34, 1.2, 0.64, 1] },
  },
  resolveMotionMs: (ms: number) => ms,
  chunkAddress: (address?: string | null) =>
    address ? address.replace(/(.{4})/g, '$1 ').trim() : '',
  semantic: {
    accent: { fill: '#FF5C45', onFill: '#070911' },
    border: { raised: '#6F7B95' },
    status: { success: '#33D6A6', danger: '#FF6B85' },
    surface: { crest: '#1B2233' },
    text: { primary: '#EDF1F7', disabled: '#6F7B95' },
    flesh: { band: '#FFF1EE' },
  },
  fleshTile: { width: 380, height: 40 },
  fleshFades: [],
  fleshTiledStrokes: [],
  colors: {
    text: { primary: '#fff', secondary: '#aaa' },
    button: {
      cancelBackground: '#111',
      primaryText: '#070911',
      primaryBackground: '#FF5C45',
      secondaryBackground: '#1B2233',
      disabledOpacity: 0.5,
    },
  },
  borderRadius: { md: 12, lg: 16 },
  borderWidth: { thin: 1 },
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
  fontFamilyNative: { bold: 'System', medium: 'System', regular: 'System', mono: 'System' },
  fontScaleCap: { chrome: 1.2 },
  fontSize: { xs: 10, sm: 14, bodyLg: 16, title: 32 },
  gradients: { primary: { colors: ['#FF5C45', '#E64A34'] } },
  motionMs: { feedbackHold: 2000, flick: 90 },
  ms: (value: number) => value,
  vs: (value: number) => value,
  s: (value: number) => value,
  opacity: { medium: 0.6 },
  shadows: { button: {} },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, base: 8, headerPadding: 16, '2xl': 24 },
  useSendTransaction: () => ({
    status: 'idle',
    error: null,
    feeEstimateFailed: false,
    estimateFee: mockEstimateFee,
    sendTransaction: jest.fn(),
    reset: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useBottomSheetChrome', () => ({
  useBottomSheetChrome: () => ({ actionRowBottomPadding: 0 }),
}));

jest.mock('../BlurContainer', () => {
  const { View } = require('react-native');
  return {
    BlurContainer: ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock('../FleshBackground', () => ({
  FleshBackground: () => null,
}));

jest.mock('../Icon/SvgIcons', () => ({
  ContentCopySvgIcon: () => null,
}));

jest.mock('../TokenLogo', () => ({
  TokenLogo: () => null,
}));

import { StepConfirmation } from './StepConfirmation';

const RESOLVED = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const CHUNKED_RESOLVED = '7xKX tg2C W87d 97TX JSDp bD5j Bkhe TqA8 3TZR uJos gAsU';

const baseProps = {
  token: { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', decimals: 9 },
  amount: '1',
  blockchain: 'solana',
  account: {},
  onBack: () => {},
  onCancel: () => {},
  onSuccess: () => {},
} as never as React.ComponentProps<typeof StepConfirmation>;

describe('StepConfirmation destination address', () => {
  it('shows the resolved address, not the domain, when the recipient was a domain', () => {
    render(
      <StepConfirmation
        {...baseProps}
        recipientAddress="alice.sol"
        resolvedRecipientAddress={RESOLVED}
      />
    );

    expect(screen.getByTestId('send-confirm-address')).toHaveTextContent(CHUNKED_RESOLVED);
    expect(screen.getByTestId('send-confirm-resolved-from')).toHaveTextContent(
      'token.send.resolvedFrom:alice.sol'
    );
  });

  it('shows no domain line when the user pasted a plain address', () => {
    render(<StepConfirmation {...baseProps} recipientAddress={RESOLVED} />);

    expect(screen.getByTestId('send-confirm-address')).toHaveTextContent(CHUNKED_RESOLVED);
    expect(screen.queryByTestId('send-confirm-resolved-from')).toBeNull();
  });

  // Three times now this surface has grown its own confirm button — a gradient
  // wrapper at a local `borderRadius.lg`, with the shared button's pill radius
  // and material missing. Pin the radius to the button's own token: a
  // hand-rolled control cannot produce it, and a decorative wrapper around the
  // shared one shows up as the wrong radius on the outer box.
  it("commits through the shared primary button, at the button's own radius", () => {
    render(<StepConfirmation {...baseProps} recipientAddress={RESOLVED} />);

    const confirm = screen.getByTestId('send-confirm-button');
    const style = StyleSheet.flatten(confirm.props.style);
    expect(style.borderRadius).toBe(componentSizes.buttonRadius);
    // Height is the only legal per-call-site override.
    expect(style.height).toBe(componentSizes.buttonHeightMedium);
    expect(confirm.props.accessibilityRole).toBe('button');
    // A control label is never uppercase (DESIGN.md §Typography).
    expect(confirm).toHaveTextContent('actions.confirm');
  });
});
