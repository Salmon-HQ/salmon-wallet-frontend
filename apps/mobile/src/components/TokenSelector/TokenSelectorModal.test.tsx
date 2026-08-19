import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

jest.mock('@salmon/shared', () => ({
  useTokenSearch: (tokens: unknown[]) => ({
    searchQuery: '',
    setSearchQuery: jest.fn(),
    isSearching: false,
    paginatedTokens: tokens,
    hasMore: false,
    loadMore: jest.fn(),
    reset: jest.fn(),
    retry: jest.fn(),
    error: null,
    isError: false,
  }),
  colors: {
    text: { primary: '#fff', secondary: '#999', tertiary: '#666', balance: '#eee' },
    accent: { primary: '#f54' },
    background: { secondary: '#111' },
    border: { default: '#333' },
    skeleton: { base: '#222', highlight: '#333' },
  },
  componentSizes: { tokenIcon: 40, sheetFadeGradientHeight: 24 },
  spacing: { xxs: 2, xs: 4, sm: 8, base: 10, md: 12, lg: 16, headerPadding: 20, '3xl': 48 },
  borderRadius: { sm: 8, md: 12, badge: 16 },
  ContentLoader: () => null,
  Rect: () => null,
  Circle: () => null,
  getShortAddress: (value: string) => value.slice(0, 8),
  getTokenKey: (token: { mint?: string; address?: string; symbol?: string }) =>
    token.mint || token.address || token.symbol || '',
  fontFamilyNative: { bold: 'System', medium: 'System', semiBold: 'System' },
  fontSize: { xs: 12, sm: 14, base: 16, bodyLg: 18 },
  fontWeight: { semibold: '600' },
  tabularNums: { native: { fontVariant: ['tabular-nums'] } },
  ms: (value: number) => value,
  vs: (value: number) => value,
  s: (value: number) => value,
}));

jest.mock('../../icons', () => {
  const { View } = require('react-native');
  return { MagnifyingGlassIcon: () => <View /> };
});

jest.mock('../Icon/SvgIcons', () => {
  const { View } = require('react-native');
  return {
    BitcoinSvgIcon: () => <View testID="bitcoin-svg" />,
    EthereumSvgIcon: () => <View testID="ethereum-svg" />,
  };
});

jest.mock('../../../hooks/useBottomSheetChrome', () => ({
  useBottomSheetChrome: () => ({ standardContentBottomPadding: 0 }),
}));

jest.mock('../BottomSheetContainer', () => {
  const { View } = require('react-native');
  return {
    BottomSheetContainer: ({
      visible,
      children,
    }: {
      visible: boolean;
      children: React.ReactNode;
    }) => (visible ? <View testID="sheet">{children}</View> : null),
  };
});

jest.mock('../BottomSheetTitleHeader', () => {
  const { View } = require('react-native');
  return { BottomSheetTitleHeader: () => <View /> };
});

jest.mock('../BlurContainer', () => {
  const { View } = require('react-native');
  return {
    BlurContainer: ({ children, style }: { children?: React.ReactNode; style?: unknown }) => (
      <View style={style as never}>{children}</View>
    ),
  };
});

jest.mock('../TokenLogo', () => {
  const { View } = require('react-native');
  return { TokenLogo: () => <View /> };
});

import { TokenSelectorModal } from './TokenSelectorModal';

const solMainnet = {
  mint: 'sol-mint',
  name: 'Solana',
  symbol: 'SOL',
  uiAmount: 12.5,
  network: 'solana-mainnet',
};
const btcMainnet = {
  mint: 'btc',
  name: 'Bitcoin',
  symbol: 'BTC',
  uiAmount: 0,
  network: 'bitcoin-mainnet',
};
const solDevnet = {
  mint: 'dev-mint',
  name: 'Dev Token',
  symbol: 'DEV',
  uiAmount: 3,
  network: 'solana-devnet',
};

const renderModal = (props: Partial<React.ComponentProps<typeof TokenSelectorModal>> = {}) =>
  render(
    <TokenSelectorModal
      visible={true}
      onClose={jest.fn()}
      tokens={[solMainnet, btcMainnet, solDevnet]}
      onSelect={jest.fn()}
      showNetworkChip={true}
      {...props}
    />
  );

describe('TokenSelectorModal network identity', () => {
  it('keeps Solana mainnet rows silent — no chip, no chain mark', () => {
    renderModal();
    expect(screen.queryByText('SOLANA-MAINNET')).toBeNull();
    expect(screen.queryByTestId('chain-mark-solana')).toBeNull();
  });

  it('marks Bitcoin mainnet with the quiet chain mark instead of a text chip', () => {
    renderModal();
    expect(screen.getByTestId('chain-mark-bitcoin')).toBeTruthy();
    expect(screen.getByTestId('bitcoin-svg')).toBeTruthy();
    expect(screen.queryByText('BITCOIN-MAINNET')).toBeNull();
  });

  it('keeps the loud text chip for non-mainnet networks so devnet is never mistaken for mainnet', () => {
    renderModal();
    expect(screen.getByText('SOLANA-DEVNET')).toBeTruthy();
  });

  it('treats a bare chain name as mainnet — Bitcoin fallback gets the mark, not a chip', () => {
    renderModal({ tokens: [{ ...btcMainnet, network: 'Bitcoin' }] });
    expect(screen.getByTestId('chain-mark-bitcoin')).toBeTruthy();
    expect(screen.queryByText('BITCOIN')).toBeNull();
  });
});

describe('TokenSelectorModal balance visibility', () => {
  it('shows holdings by default (You Send)', () => {
    renderModal();
    expect(screen.getByText('12.5 SOL')).toBeTruthy();
  });

  it('hides holdings when showBalances is false (You Receive) — symbol stays as identity', () => {
    renderModal({ showBalances: false });
    expect(screen.queryByText('12.5 SOL')).toBeNull();
    expect(screen.getByText('SOL')).toBeTruthy();
  });
});
