import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { render, within } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// The real barrel pulls in @solana/kit, which jest-expo cannot transform.
jest.mock('@salmon/shared', () => ({
  formatAmountWithSymbol: (amount: string | number, symbol: string) => `${amount} ${symbol}`,
  formatSolFee: (value: number) => `${value} SOL`,
  formatPercent: (value: number) => `${value}%`,
  useCurrencyContext: () => [{}, { formatValue: (value: number) => `$${value}` }],
  colors: {
    text: { primary: '#fff', secondary: '#aaa' },
    palette: { amber: '#cc0' },
    status: { warningBackground: '#330' },
  },
  semantic: { status: { warning: '#FFB020' } },
  componentSizes: { chartHeight: 200 },
  fontSize: { sm: 14, '2xl': 24 },
  fontFamilyNative: { semiBold: 'System', medium: 'System' },
  borderRadius: { md: 12 },
  letterSpacing: { normal: 0, wide: 0.5 },
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

jest.mock('./SwapDetailRow', () => {
  const { Text: RNText } = require('react-native');
  return { SwapDetailRow: ({ label }: { label: string }) => <RNText>{label}</RNText> };
});

jest.mock('./SwapReviewCard', () => {
  const { Text: RNText } = require('react-native');
  return { SwapReviewCard: ({ label }: { label: string }) => <RNText>{label}</RNText> };
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
  custom: { priceImpact: -0.5, slippageBps: 2000 },
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
