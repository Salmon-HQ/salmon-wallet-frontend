/**
 * MarketDataCard — the route's own decisions (loading vs data vs empty),
 * not the kit primitives it composes (each has its own suite, per the
 * repo convention `token-detail-screen.test.tsx` already follows).
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  spacing: { md: 14 },
  fontFamilyNative: { bold: 'Font-Bold' },
  fontSize: { bodyLg: 16 },
  lineHeight: { snug: 1.2 },
  s: (value: number) => value,
  semantic: { text: { primary: '#fff' } },
  formatLargeNumber: (value: number) => String(value),
  useCurrencyContext: () => [{}, { formatValue: (value: number) => `$${value}` }],
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

jest.mock('../Card', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    Card: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
      ReactActual.createElement(View, { testID }, children),
  };
});

jest.mock('../KeyValueRow', () => {
  const ReactActual = require('react');
  const { Text } = require('react-native');
  return {
    KeyValueRow: ({ label, value }: { label: string; value: string }) =>
      ReactActual.createElement(Text, null, `${label}: ${value}`),
  };
});

jest.mock('../Skeleton', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    SkeletonRow: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID }),
  };
});

import { MarketDataCard } from './MarketDataCard';

describe('MarketDataCard', () => {
  it('renders a skeleton row while loading', () => {
    render(<MarketDataCard data={undefined} loading />);
    expect(screen.getByTestId('token-detail-market-data')).toBeTruthy();
    expect(screen.queryByText(/Market Cap/)).toBeNull();
  });

  it('renders the known fields as KeyValueRows once data arrives', () => {
    render(
      <MarketDataCard
        data={{ marketCap: 1000, volume24h: 200, circulatingSupply: 50, totalSupply: 100, ath: 5 }}
        symbol="SOL"
      />
    );

    expect(screen.getByText('Market Cap: $1000')).toBeTruthy();
    expect(screen.getByText('24h Volume: $200')).toBeTruthy();
    expect(screen.getByText('Circulating Supply: 50 SOL')).toBeTruthy();
    expect(screen.getByText('Total Supply: 100 SOL')).toBeTruthy();
    expect(screen.getByText('All-Time High: $5')).toBeTruthy();
  });

  it('renders nothing when there is no data and it is not loading', () => {
    render(<MarketDataCard data={undefined} />);
    expect(screen.queryByTestId('token-detail-market-data')).toBeNull();
  });
});
