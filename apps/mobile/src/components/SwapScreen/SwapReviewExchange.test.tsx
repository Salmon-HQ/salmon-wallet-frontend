import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// The real barrel pulls in @solana/kit, which jest-expo cannot transform.
jest.mock('@salmon/shared', () => ({
  colors: { text: { primary: '#fff', secondary: '#aaa', tertiary: '#888' } },
  fontSize: { xs: 10, sm: 14, lg: 18 },
  fontFamilyNative: { medium: 'System', bold: 'System' },
  letterSpacing: { slight: 0.1, snug: -0.2, wider: 1 },
  lineHeight: { tight: 1.1, tokenListItem: 1.3 },
  spacing: { xxs: 2, xs: 4, sm: 8, md: 12, base: 16 },
  borderRadius: { md: 12 },
  tabularNums: { native: { fontVariant: ['tabular-nums'] }, css: {} },
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

jest.mock('../TokenLogo', () => {
  const { View: RNView } = require('react-native');
  return {
    TokenLogo: ({ symbol }: { symbol?: string }) => <RNView testID={`token-logo-${symbol}`} />,
  };
});

jest.mock('../../icons', () => {
  const { View: RNView } = require('react-native');
  return {
    ArrowRightIcon: () => <RNView testID="arrow-right-icon" />,
    iconSize: { md: 20 },
  };
});

import { SwapReviewExchange } from './SwapReviewExchange';

describe('SwapReviewExchange — one graphic block instead of two cards', () => {
  it('renders both token logos, the arrow between them, and each amount', () => {
    render(
      <SwapReviewExchange
        send={{
          label: 'You Send',
          symbol: 'USDC',
          amount: '250 USDC',
          usdValue: '~$250.00',
        }}
        receive={{
          label: 'You Receive',
          symbol: 'SOL',
          amount: '1.5 SOL',
          usdValue: '~$249.10',
        }}
      />
    );

    // The graphic gesture: sent logo → arrow → received logo.
    expect(screen.getByTestId('token-logo-USDC')).toBeTruthy();
    expect(screen.getByTestId('arrow-right-icon')).toBeTruthy();
    expect(screen.getByTestId('token-logo-SOL')).toBeTruthy();

    // Amounts in each token, with their dollar values.
    expect(screen.getByText('250 USDC')).toBeTruthy();
    expect(screen.getByText('1.5 SOL')).toBeTruthy();
    expect(screen.getByText('~$250.00')).toBeTruthy();
    expect(screen.getByText('~$249.10')).toBeTruthy();

    // Microcopy labels survive as direction disambiguation.
    expect(screen.getByText('You Send')).toBeTruthy();
    expect(screen.getByText('You Receive')).toBeTruthy();
  });

  it('omits the USD line when no dollar value exists', () => {
    render(
      <SwapReviewExchange
        send={{ label: 'You Send', symbol: 'SOL', amount: '1.5 SOL' }}
        receive={{
          label: 'You Receive (estimated)',
          symbol: 'BTC',
          amount: '0.0021 BTC',
        }}
      />
    );

    expect(screen.getByText('0.0021 BTC')).toBeTruthy();
    expect(screen.queryByText(/~\$/)).toBeNull();
  });
});
