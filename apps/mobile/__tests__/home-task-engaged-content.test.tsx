/**
 * The home content leaves and returns with the verb when a task engages the
 * shell (DESIGN.md §The sink and the float). The balance block, the sub-tab row,
 * the content and the powerups FAB are content, not chrome: while a flow owns
 * the screen they are unmounted, so the flow finds an empty home behind it.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import HomeScreen from '../app/(app)/(tabs)/index';

const mockUseBalance = jest.fn();
const mockRefresh = jest.fn();

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

const mockTaskChrome = { isTaskEngaged: false };
jest.mock('../src/contexts/TaskChromeContext', () => ({
  useTaskChrome: () => ({ isTaskEngaged: mockTaskChrome.isTaskEngaged, setTaskEngaged: jest.fn() }),
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
  },
  componentSizes: { icon: { sm: 16, md: 20, lg: 24 }, button: { height: 44 } },
  fontFamilyNative: { regular: 'System', medium: 'System', semiBold: 'System', bold: 'System' },
  fontSize: { xs: 11, sm: 13, base: 15, md: 16, bodyLg: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32, headerPadding: 16 },
  s: (value: number) => value,
  vs: (value: number) => value,
  getShortAddress: () => 'Wall...et11',
  getCoinInfo: jest.fn().mockResolvedValue(null),
  getMarketChart: jest.fn().mockResolvedValue([]),
  getTokenMarketChart: jest.fn().mockResolvedValue([]),
  getTokenCoinInfo: jest.fn().mockResolvedValue(null),
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
}));

jest.mock('../src/components', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  return {
    BalanceHeader: () => <View testID="balance-header" />,
    NftsTab: ({ listHeader }: { listHeader?: React.ReactNode }) => (
      <View testID="nfts-tab">{listHeader}</View>
    ),
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
    PowerupsFab: () => <View testID="powerups-fab" />,
    PowerupsLauncherSheet: () => null,
    PriceChart: () => <View />,
    ReceiveSheet: () => null,
    SendSheet: () => null,
    TokenAbout: () => <View />,
    TokenInformationSheet: () => null,
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
    TokenListSkeleton: () => <Text testID="token-list-skeleton">skeleton</Text>,
    TokenMarketData: () => <View />,
    TransactionDetailModal: () => null,
    TransactionHistorySheet: () => null,
    WarningNotice: ({ title }: { title: string }) => <Text>{title}</Text>,
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

describe('home content vs an engaged task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTaskChrome.isTaskEngaged = false;
    mockUseBalance.mockReturnValue({
      ...baseBalance,
      tokens: [solToken],
      hasData: true,
      state: 'ready' as const,
    });
  });

  it('shows the balance block, sub-tabs and token list while no task is engaged', () => {
    render(<HomeScreen />);

    expect(screen.getByTestId('home-content')).toBeTruthy();
    expect(screen.getByText('SOL')).toBeTruthy();
  });

  it('takes the home content away while a task owns the screen', () => {
    mockTaskChrome.isTaskEngaged = true;

    render(<HomeScreen />);

    // The screen itself stays mounted — only its content leaves, so the
    // mounted ground behind it never travels.
    expect(screen.getByTestId('home-screen')).toBeTruthy();
    expect(screen.queryByTestId('home-content')).toBeNull();
    expect(screen.queryByText('SOL')).toBeNull();
  });

  it('brings the home content back when the task releases the screen', () => {
    mockTaskChrome.isTaskEngaged = true;
    const { rerender } = render(<HomeScreen />);

    mockTaskChrome.isTaskEngaged = false;
    rerender(<HomeScreen />);

    expect(screen.getByTestId('home-content')).toBeTruthy();
    expect(screen.getByText('SOL')).toBeTruthy();
  });
});
