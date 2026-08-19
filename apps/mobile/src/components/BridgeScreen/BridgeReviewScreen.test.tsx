import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

jest.mock('../SwapScreen/SwapDetailsCard', () => {
  const { Text: RNText, View: RNView } = require('react-native');
  return {
    SwapDetailsCard: ({ rows }: { rows: { label: string; value: string }[] }) => (
      <RNView testID="swap-details-card">
        {rows.map((row) => (
          <RNView key={row.label}>
            <RNText>{row.label}</RNText>
            <RNText>{row.value}</RNText>
          </RNView>
        ))}
      </RNView>
    ),
  };
});

jest.mock('../SwapScreen/SwapReviewExchange', () => {
  const { Text: RNText, View: RNView } = require('react-native');
  return {
    SwapReviewExchange: ({
      send,
      receive,
    }: {
      send: { label: string; amount: string };
      receive: { label: string; amount: string };
    }) => (
      <RNView>
        <RNText>{`${send.label} ${send.amount}`}</RNText>
        <RNText>{`${receive.label} ${receive.amount}`}</RNText>
      </RNView>
    ),
  };
});

jest.mock('../SwapScreen/SwapReviewButtons', () => {
  const { Text: RNText } = require('react-native');
  return {
    SwapReviewButtons: ({ confirmLabel }: { confirmLabel?: string }) => (
      <RNText>{confirmLabel}</RNText>
    ),
  };
});

jest.mock('../../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ floatingBottomOffset: 0 }),
}));

jest.mock('@salmon/shared', () => ({
  // Real values for the two things this screen's disclosure depends on.
  BRIDGE_PARTNER_FEE_PERCENT: 0.4,
  formatPercent: (value: number) => `${value.toFixed(2)}%`,
  formatAmountWithSymbol: (amount: string | number, symbol: string) => `${amount} ${symbol}`,
  getShortAddress: (address: string) => address,
  colors: {
    text: { primary: '#fff', secondary: '#aaa' },
    status: { errorBackground: '#300', warningBackground: '#330', warningBorder: '#cc0' },
  },
  semantic: { status: { danger: '#FF6B85', warning: '#FFB020' } },
  fontSize: { sm: 14, '2xl': 24 },
  fontFamilyNative: { bold: 'System', medium: 'System' },
  spacing: { xs: 4, md: 12, base: 16, lg: 20, '2xl': 24, '4xl': 40, headerPadding: 16 },
  borderRadius: { md: 12 },
  borderWidth: { thin: 1 },
  letterSpacing: { normal: 0, wide: 0.5 },
  lineHeight: { normal: 1.4, condensed: 1.2 },
  ms: (value: number) => value,
  vs: (value: number) => value,
  s: (value: number) => value,
}));

import { BridgeReviewScreen } from './BridgeReviewScreen';
import type { BridgeReviewScreenProps } from './types';

const PROPS: BridgeReviewScreenProps = {
  inToken: { symbol: 'SOL', name: 'Solana', network: 'Solana' },
  outToken: { symbol: 'BTC', name: 'Bitcoin', network: 'Bitcoin' },
  inAmount: '1.5',
  outAmount: '0.0021',
  recipientAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  estimate: {
    estimatedAmount: 0.0021,
    minAmount: 0.1,
    symbolIn: 'SOL',
    symbolOut: 'BTC',
  },
  onBack: jest.fn(),
  onConfirm: jest.fn(),
};

describe('BridgeReviewScreen', () => {
  it('discloses the Salmon fee at the commit point', () => {
    render(<BridgeReviewScreen {...PROPS} />);

    expect(screen.getByText('Salmon fee')).toBeTruthy();
    expect(screen.getByText('0.40%')).toBeTruthy();
  });

  it('warns that the bridge cannot be cancelled or recovered', () => {
    render(<BridgeReviewScreen {...PROPS} />);

    expect(screen.getByTestId('bridge-irreversible-notice')).toBeTruthy();
    expect(screen.getByText(/no cancel and no way to reverse or recover/i)).toBeTruthy();
  });
});
