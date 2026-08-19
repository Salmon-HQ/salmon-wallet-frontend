import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Interpolated keys pass params as the second argument, not a fallback.
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

// The real barrel pulls in @solana/kit, which jest-expo cannot transform.
// Only the layout tokens this screen reads are needed here.
jest.mock('@salmon/shared', () => ({
  colors: { text: { tertiary: '#888' } },
  spacing: { xs: 4, sm: 8, base: 16, md: 12, lg: 20, '2xl': 32, '3xl': 40, headerPadding: 20 },
  borderRadius: { md: 12 },
  borderWidth: { thin: 1 },
  componentSizes: { buttonHeightCompact: 42, copyButtonWidth: 120 },
  fontFamilyNative: { regular: 'System', medium: 'System', semiBold: 'System', bold: 'System' },
  fontSize: { micro: 10, sm: 12 },
  lineHeight: { normal: 1.5 },
  semantic: {
    status: { danger: '#F00', warning: '#FB0' },
    surface: { raised: '#111' },
    border: { raised: '#222' },
    text: { primary: '#FFF', secondary: '#CCC', tertiary: '#999' },
  },
  s: (value: number) => value,
  vs: (value: number) => value,
}));

jest.mock('../../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ floatingBottomOffset: 24, stickyCtaScrollPadding: 96 }),
}));

jest.mock('../../../hooks/useKeyboardHeight', () => ({
  useKeyboardHeight: () => 0,
}));

jest.mock('./SwapAmountInput', () => {
  const { View } = require('react-native');
  return { SwapAmountInput: ({ testID }: { testID?: string }) => <View testID={testID} /> };
});

jest.mock('../Button', () => {
  const { Text: RNText } = require('react-native');
  return {
    // A stand-in that keeps the call site's own style and disabled flag, so
    // the assertions read exactly what SwapInputScreen hands the button.
    PrimaryButton: ({
      style,
      testID,
      disabled,
    }: {
      style?: object;
      testID?: string;
      disabled?: boolean;
    }) => <RNText testID={testID} style={style} accessibilityState={{ disabled }} />,
  };
});

import { SwapInputScreen } from './SwapInputScreen';
import type { SwapInputScreenProps } from './types';

const baseProps: SwapInputScreenProps = {
  inToken: null,
  outToken: null,
  inAmount: '1',
  outAmount: '2',
  onInAmountChange: jest.fn(),
  onInTokenPress: jest.fn(),
  onOutTokenPress: jest.fn(),
  canReview: true,
  onReview: jest.fn(),
};

function renderScreen(overrides: Partial<SwapInputScreenProps> = {}) {
  return render(<SwapInputScreen {...baseProps} {...overrides} />);
}

function flatStyle(node: { props: { style?: unknown } }) {
  return StyleSheet.flatten(node.props.style) as Record<string, unknown>;
}

describe('SwapInputScreen — nothing moves under the finger', () => {
  it('reserves the notice slot whether or not there is a notice', () => {
    const quiet = flatStyle(renderScreen().getByTestId('swap-notice-slot'));
    const erroring = flatStyle(
      renderScreen({
        reviewWarning: { key: 'swap.errors.minimumAmount', params: { amount: '5.00' } },
      }).getByTestId('swap-notice-slot')
    );

    expect(quiet.minHeight).toBeGreaterThan(0);
    expect(erroring.minHeight).toBe(quiet.minHeight);
  });

  it('keeps the notice out of the accessibility tree when there is none', () => {
    const { queryByTestId } = renderScreen();

    expect(queryByTestId('swap-error-text')).toBeNull();
    expect(queryByTestId('swap-warning-text')).toBeNull();
  });

  it('renders the minimum-amount notice inside the reserved slot', () => {
    const { getByTestId } = renderScreen({
      reviewWarning: { key: 'swap.errors.minimumAmount', params: { amount: '5.00' } },
    });

    expect(getByTestId('swap-warning-text')).toBeTruthy();
  });

  it('renders a submit failure inside the same reserved slot', () => {
    const { getByTestId } = renderScreen({ swapError: 'swap.errors.failed' });

    expect(getByTestId('swap-error-text')).toBeTruthy();
  });
});

describe('SwapInputScreen — the Review CTA geometry is not a state', () => {
  it('hands the button an identical style enabled and disabled', () => {
    const enabled = flatStyle(renderScreen({ canReview: true }).getByTestId('swap-review-button'));
    const disabled = flatStyle(
      renderScreen({ canReview: false }).getByTestId('swap-review-button')
    );

    expect(disabled).toEqual(enabled);
  });

  it('gives the committing action one fixed width, narrower than the screen', () => {
    for (const canReview of [true, false]) {
      const style = flatStyle(renderScreen({ canReview }).getByTestId('swap-review-button'));

      // The mocked token, unscaled: a number, never '100%' and never 'auto'.
      expect(style.width).toBe(120);
    }
  });
});
