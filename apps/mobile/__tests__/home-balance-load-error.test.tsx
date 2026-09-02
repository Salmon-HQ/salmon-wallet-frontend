/**
 * P1 — a balance load that failed must stop looking like one still going.
 *
 * PRODUCT.md ("Failure modes are visible, not silent") requires "you have
 * none" and "we couldn't load this" to stay distinguishable. A first load that
 * fails with nothing cached must reach the error state and its retry; a
 * refetch that fails on top of cached data must keep the data readable.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import HomeScreen from '../app/(app)/(tabs)/index';

const mockUseBalance = jest.fn();
const mockRefresh = jest.fn();

// Mock the data source (`useCoinMarketData`'s own dependency), not the hook
// itself — this screen never leaves Solana in this suite, so the hook stays
// disabled and these never resolve, but the real hook still needs its real
// import to exist.
jest.mock('@salmon/shared/src/api/services', () => ({
  getTokenCoinInfo: jest.fn(),
  getTokenMarketChart: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useReducedMotion: () => false,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

jest.mock('../src/contexts/DeveloperModeContext', () => ({
  useDeveloperMode: () => false,
}));
jest.mock('../hooks/useTabChrome', () => ({
  useTabChrome: () => ({
    headerContentOffset: 0,
    floatingBottomOffset: 0,
    scrollBottomPadding: 0,
    onScroll: jest.fn(),
  }),
}));
jest.mock('../src/utils/sinkAndFloat', () => ({
  FLOAT_DELAY_MS: 0,
  floatEntering: () => undefined,
  sinkExiting: () => undefined,
}));

jest.mock('@salmon/shared', () => ({
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 20, full: 999 },
  colors: {
    accent: { primary: '#00ff99', tint: '#003322', border: '#00aa66' },
    text: { primary: '#fff', secondary: '#aaa', tertiary: '#888', disabled: '#666' },
    background: { primary: '#000', secondary: '#111', tertiary: '#222' },
    border: { primary: '#333', secondary: '#444' },
    status: { success: '#0f0', danger: '#f00', warning: '#fa0' },
  },
  semantic: {
    accent: { fill: '#FF5C45', onFill: '#070911', ink: '#FF5C45' },
    text: { primary: '#F6F8FB', secondary: '#A7B1C4', tertiary: '#8B96AD', disabled: '#6F7B95' },
    border: { default: '#58637B', raised: '#6F7B95', strong: '#8B96AD' },
    surface: { shelf: '#10131C', raised: '#161C2D', crest: '#1B2233' },
    status: { success: '#33D6A6', danger: '#FF6B85', warning: '#FFB020' },
    state: { hover: 'rgba(199,211,232,0.06)', selectedEdge: '#FF5C45' },
    depth: { abyss: '#10131C' },
    water: {
      gradient: ['#10131C', '#070911'],
      fadeTop: ['#10131C', 'rgba(16, 19, 28, 0)'],
      fadeBottom: ['rgba(7, 9, 17, 0)', '#070911'],
    },
  },
  componentSizes: { icon: { sm: 16, md: 20, lg: 24 }, button: { height: 44 } },
  fontFamilyNative: { regular: 'System', medium: 'System', semiBold: 'System', bold: 'System' },
  fontSize: { xs: 11, sm: 13, base: 15, md: 16, bodyLg: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32, headerPadding: 16 },
  s: (value: number) => value,
  vs: (value: number) => value,
  getShortAddress: () => 'Wall...et11',
  useCoinMarketData: jest.requireActual('@salmon/shared/src/hooks/useCoinMarketData')
    .useCoinMarketData,
  coinInfoToMarketData: () => undefined,
  getBlockchainFromNetworkId: () => 'solana',
  BLOCKCHAIN_TO_COINGECKO: { solana: 'solana' },
  PERIOD_TO_DAYS: { '1D': 1 },
  useAccountsContext: () => [
    {
      ready: true,
      activeAccount: {
        getReceiveAddress: () => 'Wallet111',
        networksAccounts: { 'solana-mainnet': [] },
      },
      activeBlockchainAccount: { getReceiveAddress: () => 'Wallet111' },
      networkId: 'solana-mainnet',
      pathIndex: 0,
      switchingNetwork: false,
    },
    { clearSwitchingNetwork: jest.fn() },
  ],
  useAvailableNetworks: () => ({
    allNetworks: [{ id: 'solana-mainnet', name: 'Solana' }],
  }),
  useBalance: () => mockUseBalance(),
  usePrefetchBalances: () => undefined,
  useCurrencyContext: () => [{ currency: 'USD' }],
  useTransactions: () => ({
    transactions: [],
    loading: false,
    loadingMore: false,
    error: null,
    hasMore: false,
    loadMore: jest.fn(),
    refresh: jest.fn(),
  }),
  isWatchOnlyAccount: () => false,
  useHomeTabOrder: (defaults: string[]) => ({ order: defaults, setOrder: jest.fn() }),
}));

jest.mock('../src/components', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  return {
    DerivedAccountsSheet: () => null,
    HomeTabOrderSheet: () => null,
    // The identity line. Its own suite covers it; here it only has to render
    // so the Home tree mounts.
    WalletHeader: () => <View testID="wallet-header" />,
    BalanceHeader: () => <View testID="balance-header" />,
    NftsTab: () => <View testID="nfts-tab" />,
    PortfolioSubTabs: ({
      tabs,
      onChange,
    }: {
      tabs: Array<{ key: string; label: string }>;
      onChange: (key: string) => void;
    }) => (
      <View>
        {tabs.map((tab) => (
          <Text key={tab.key} testID={`portfolio-tab-${tab.key}`} onPress={() => onChange(tab.key)}>
            {tab.label}
          </Text>
        ))}
      </View>
    ),
    PriceChart: () => <View />,
    ReceiveSheet: () => null,
    SkeletonRow: () => <View />,
    AboutCard: () => <View />,
    // Mirrors the real TokenList contract: a skeleton while `loading`, the
    // provided empty component once the load settled with no rows.
    TokenList: ({
      tokens,
      loading,
      ListEmptyComponent,
    }: {
      tokens: Array<{ symbol?: string }>;
      loading?: boolean;
      ListEmptyComponent?: React.ReactNode;
    }) => (
      <View>
        {loading ? (
          <Text testID="token-list-skeleton">skeleton</Text>
        ) : tokens.length === 0 ? (
          ListEmptyComponent
        ) : (
          tokens.map((token, index) => <Text key={index}>{token.symbol}</Text>)
        )}
      </View>
    ),
    TokenListItem: () => <View />,
    MarketDataCard: () => <View />,
    TransactionDetailModal: () => null,
    WarningNotice: ({ title }: { title: string }) => <Text>{title}</Text>,
    // Mirrors the real StateBlock contract closely enough for this suite:
    // a labelled wrapper, and a pressable retry when one is offered.
    StateBlock: ({
      title,
      body,
      onRetry,
      retryLabel,
      retryTestID,
      testID,
    }: {
      title: string;
      body?: string;
      onRetry?: () => void;
      retryLabel?: string;
      retryTestID?: string;
      testID?: string;
    }) => (
      <View testID={testID}>
        <Text>{title}</Text>
        {body && <Text>{body}</Text>}
        {onRetry && (
          <Text testID={retryTestID ?? testID} onPress={onRetry}>
            {retryLabel}
          </Text>
        )}
      </View>
    ),
  };
});

const baseBalance = {
  tokens: [],
  usdTotal: undefined,
  changePercent: undefined,
  changeAmount: undefined,
  loading: false,
  refreshing: false,
  hasData: false,
  state: 'loading' as const,
  refresh: mockRefresh,
  error: null as string | null,
  isError: false,
  hiddenBalance: false,
  toggleHidden: jest.fn(),
  lastUpdated: null,
};

const solToken = {
  mint: 'sol',
  address: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  name: 'Solana',
  amount: '1',
  decimals: 9,
  uiAmount: 1,
  usdBalance: 10,
};

function renderScreen(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('home token list — load failure vs empty wallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the error state with its retry when the first load fails with nothing cached', () => {
    mockUseBalance.mockReturnValue({
      ...baseBalance,
      state: 'error',
      isError: true,
      error: 'rpc down',
    });

    renderScreen(<HomeScreen />);

    expect(screen.getByTestId('token-list-error')).toBeTruthy();
    expect(screen.getByTestId('token-list-retry-button')).toBeTruthy();
    expect(screen.queryByTestId('token-list-skeleton')).toBeNull();

    fireEvent.press(screen.getByTestId('token-list-retry-button'));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('keeps the cached tokens on screen when a refetch fails', () => {
    mockUseBalance.mockReturnValue({
      ...baseBalance,
      tokens: [solToken],
      hasData: true,
      state: 'ready',
      isError: true,
      error: 'rpc down',
    });

    renderScreen(<HomeScreen />);

    expect(screen.getByText('SOL')).toBeTruthy();
    expect(screen.queryByTestId('token-list-error')).toBeNull();
    expect(screen.queryByTestId('token-list-skeleton')).toBeNull();
  });

  it('reads an empty wallet as empty, never as an error', () => {
    mockUseBalance.mockReturnValue({ ...baseBalance, hasData: true, state: 'ready' });

    renderScreen(<HomeScreen />);

    expect(screen.getByText('No tokens found')).toBeTruthy();
    expect(screen.queryByTestId('token-list-error')).toBeNull();
  });
});
