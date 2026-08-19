import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// Reanimated pulls the Worklets native module, which does not exist under
// Jest; the banded floats only need a View and the reduce-motion flag.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useReducedMotion: () => false,
    withTiming: (toValue: unknown) => toValue,
    withDelay: (_delayMs: number, animation: unknown) => animation,
    Easing: { bezier: () => () => 0 },
  };
});

// The real barrel pulls in @solana/kit, which jest-expo cannot transform.
// The motion vocabulary is real so the banded entrances can read it.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  formatAmountWithSymbol: (amount: string | number, symbol: string) => `${amount} ${symbol}`,
  formatSolFee: (value: number) => `${value} SOL`,
  formatPercent: (value: number) => `${value}%`,
  useCurrencyContext: () => [{}, { formatValue: (value: number) => `$${value}` }],
  colors: {
    text: { primary: '#fff', secondary: '#aaa' },
    palette: { amber: '#cc0' },
    status: { warningBackground: '#330' },
    border: { subtle: 'rgba(255, 255, 255, 0.15)' },
  },
  semantic: { status: { warning: '#FFB020' } },
  componentSizes: { chartHeight: 200, swapDetailRowHeight: 38 },
  fontSize: { sm: 14, bodyLg: 16, '2xl': 24 },
  fontFamilyNative: { semiBold: 'System', medium: 'System', extraBold: 'System' },
  borderRadius: { md: 12 },
  letterSpacing: { normal: 0, slight: 0, wide: 0.5 },
  lineHeight: { condensed: 1.2, normal: 1.5 },
  opacity: { faint: 0.05 },
  spacing: { xs: 4, md: 12, base: 16, lg: 16, '2xl': 24, '3xl': 32, '4xl': 40, headerPadding: 20 },
  ms: (value: number) => value,
  s: (value: number) => value,
  vs: (value: number) => value,
}));

jest.mock('../BlurContainer', () => {
  const { View: RNView } = require('react-native');
  return { BlurContainer: RNView };
});

jest.mock('../PendingValue', () => {
  const { View: RNView } = require('react-native');
  return {
    PendingValue: ({ children }: { children: React.ReactNode }) => <RNView>{children}</RNView>,
  };
});

jest.mock('../../icons', () => {
  const { View: RNView } = require('react-native');
  return { CaretDownIcon: () => <RNView />, iconSize: { sm: 16, md: 20, lg: 24 } };
});

jest.mock('./SwapReviewExchange', () => {
  const { Text: RNText, View: RNView } = require('react-native');
  return {
    SwapReviewExchange: ({
      send,
      receive,
    }: {
      send: { label: string };
      receive: { label: string };
    }) => (
      <RNView>
        <RNText>{send.label}</RNText>
        <RNText>{receive.label}</RNText>
      </RNView>
    ),
  };
});

jest.mock('./SwapReviewButtons', () => {
  const { View: RNView } = require('react-native');
  return {
    SwapReviewButtons: () => <RNView testID="swap-review-action-row" />,
  };
});

jest.mock('../../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ floatingBottomOffset: 0 }),
}));

import { SwapReviewScreen } from './SwapReviewScreen';

const token = { address: 'So1', symbol: 'SOL', name: 'Solana', decimals: 9 };

const quote = {
  input: { amount: '1000000', decimals: 6, symbol: 'USDC' },
  output: { amount: '19711120', decimals: 9, symbol: 'SOL' },
  fee: { percent: 0.5 },
  routeNames: ['HumidiFi'],
  custom: { priceImpact: -0.5, slippageBps: 2000, router: 'Jupiter', swapMode: 'ExactIn' },
};

function renderScreen() {
  return render(
    <SwapReviewScreen
      quote={quote as any}
      inToken={token as any}
      outToken={token as any}
      inAmount="1.5"
      outAmount="0.0197"
      onBack={jest.fn()}
      onConfirm={jest.fn()}
    />
  );
}

describe('SwapReviewScreen — the warning card can always be read', () => {
  it('keeps the action row outside the scroll area, so it cannot cover the content', () => {
    // The irreversibility warning is the last card on the screen where the
    // swap is committed. If the action row ever moves inside — or on top of —
    // the scroll area, that card gets sliced and no amount of scrolling
    // recovers it.
    const { UNSAFE_getByType, getByTestId } = renderScreen();

    // Present on the screen…
    expect(getByTestId('swap-review-action-row')).toBeTruthy();
    // …but never inside the thing that scrolls.
    expect(within(UNSAFE_getByType(ScrollView)).queryByTestId('swap-review-action-row')).toBeNull();
  });

  it('ends the scroll content above the action row rather than flush against it', () => {
    const { UNSAFE_getByType } = renderScreen();

    const { paddingBottom } = StyleSheet.flatten(
      UNSAFE_getByType(ScrollView).props.contentContainerStyle
    );

    expect(paddingBottom).toBeGreaterThan(0);
  });
});

describe('SwapReviewScreen — the details are one card, and it fits', () => {
  it('groups every detail row into a single card instead of a pill stack', () => {
    const { getAllByTestId } = renderScreen();
    // One grouped card; the per-row pills (one BlurContainer each) are what
    // made the review taller than the viewport.
    expect(getAllByTestId('swap-details-card')).toHaveLength(1);
  });

  it('keeps the critical rows visible and folds the advanced ones by default', () => {
    const { getByText, queryByText } = renderScreen();

    // Critical — always on screen.
    expect(getByText('Salmon fee')).toBeTruthy();
    expect(getByText('Slippage Tolerance')).toBeTruthy();
    expect(getByText('Total Price Impact')).toBeTruthy();
    // Advanced — folded behind the disclosure.
    expect(queryByText('Router')).toBeNull();
    expect(queryByText('Route')).toBeNull();
    expect(queryByText('Swap Mode')).toBeNull();
  });

  it('reveals the advanced rows when the Details disclosure is pressed', () => {
    const { getByTestId, getByText } = renderScreen();

    const disclosure = getByTestId('swap-details-disclosure');
    expect(disclosure.props.accessibilityState).toMatchObject({ expanded: false });

    fireEvent.press(disclosure);

    expect(getByText('Router')).toBeTruthy();
    expect(getByText('Route')).toBeTruthy();
    expect(getByText('Swap Mode')).toBeTruthy();
    expect(getByTestId('swap-details-disclosure').props.accessibilityState).toMatchObject({
      expanded: true,
    });
  });
});
