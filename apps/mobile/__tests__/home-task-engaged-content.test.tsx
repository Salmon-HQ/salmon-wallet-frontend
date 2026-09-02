/**
 * The home content leaves and returns with the verb when a task engages the
 * shell (DESIGN.md §The sink and the float). The balance block, the sub-tab row,
 * the content are content, not chrome: while a flow owns the screen they are
 * unmounted, so the flow finds an empty home behind it. The powerups FAB obeys
 * the same rule from a level up now — it mounts in `(app)/_layout.tsx` and
 * reads the same signal (`powerups-fab.test.tsx`).
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import HomeScreen from '../app/(app)/(tabs)/index';

const mockUseBalance = jest.fn();
const mockRefresh = jest.fn();

// Mock the data source (`useCoinMarketData`'s own dependency), not the hook
// itself — this suite never leaves Solana, so the hook stays disabled and
// these never resolve, but the real hook still needs its real import to
// exist.
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

const mockTaskChrome = { isTaskEngaged: false, surfaceKey: 0 };
jest.mock('../src/contexts/TaskChromeContext', () => ({
  useTaskChrome: () => ({
    isTaskEngaged: mockTaskChrome.isTaskEngaged,
    setTaskEngaged: jest.fn(),
    surfaceKey: mockTaskChrome.surfaceKey,
  }),
}));

jest.mock('../src/contexts/DeveloperModeContext', () => ({
  useDeveloperMode: () => false,
  useUnverifiedTokens: () => false,
}));
jest.mock('../hooks/useTabChrome', () => ({
  useTabChrome: () => ({
    headerContentOffset: 0,
    floatingBottomOffset: 0,
    scrollBottomPadding: 0,
    onScroll: jest.fn(),
  }),
}));
// The verb itself is covered by its own suite; here the helpers only have to
// say WHICH wrapper was handed the gesture, and with what beat.
jest.mock('../src/utils/sinkAndFloat', () => ({
  FLOAT_DELAY_MS: 120,
  floatEntering: (_reduceMotion: boolean, options?: { delayMs?: number }) => ({
    verb: 'float',
    delayMs: options?.delayMs ?? 0,
  }),
  sinkExiting: () => ({ verb: 'sink' }),
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
  getNetworkLabel: (id: string) => (id === 'solana-devnet' ? 'Devnet' : null),
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
  const result = render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return {
    ...result,
    rerender: (nextUi: React.ReactElement) =>
      result.rerender(<QueryClientProvider client={client}>{nextUi}</QueryClientProvider>),
  };
}

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
    renderScreen(<HomeScreen />);

    expect(screen.getByTestId('home-content')).toBeTruthy();
    expect(screen.getByText('SOL')).toBeTruthy();
  });

  it('takes the home content away while a task owns the screen', () => {
    mockTaskChrome.isTaskEngaged = true;

    renderScreen(<HomeScreen />);

    // The screen itself stays mounted — only its content leaves, so the
    // mounted ground behind it never travels.
    expect(screen.getByTestId('home-screen')).toBeTruthy();
    expect(screen.queryByTestId('home-content')).toBeNull();
    expect(screen.queryByText('SOL')).toBeNull();
  });

  it('brings the home content back when the task releases the screen', () => {
    mockTaskChrome.isTaskEngaged = true;
    const { rerender } = renderScreen(<HomeScreen />);

    mockTaskChrome.isTaskEngaged = false;
    rerender(<HomeScreen />);

    expect(screen.getByTestId('home-content')).toBeTruthy();
    expect(screen.getByText('SOL')).toBeTruthy();
  });

  it('lets the screen own the verb on a hand-back, and silences the chain wrapper', () => {
    // The chain wrapper lives inside `home-content`, so a task hand-back
    // remounts it too. Animating there stacked a second sink/float on the one
    // the screen was already playing — one gesture at two depths, which the
    // verb never does (DESIGN.md rule 5).
    mockTaskChrome.isTaskEngaged = true;
    const { rerender } = renderScreen(<HomeScreen />);

    mockTaskChrome.isTaskEngaged = false;
    rerender(<HomeScreen />);

    // The screen floats back, and it is the one that waits out the beat.
    expect(screen.getByTestId('home-content').props.entering).toEqual({
      verb: 'float',
      delayMs: 120,
    });
    const chainWrapper = screen.getByTestId('home-chain-content');
    expect(chainWrapper.props.entering).toBeUndefined();
    expect(chainWrapper.props.exiting).toBeUndefined();
  });

  it('drops the beat when a task hand-back is followed by a surfacing', () => {
    // Leaving a task records 'task', which buys the screen a beat of empty
    // water. A surfacing that follows is not that swap: the wait already held
    // the screen, so the float owes no pause (owner, 2026-09-02).
    mockTaskChrome.isTaskEngaged = true;
    const { rerender } = renderScreen(<HomeScreen />);

    mockTaskChrome.isTaskEngaged = false;
    rerender(<HomeScreen />);
    expect(screen.getByTestId('home-content').props.entering).toEqual({
      verb: 'float',
      delayMs: 120,
    });

    mockTaskChrome.surfaceKey = 1;
    rerender(<HomeScreen />);
    expect(screen.getByTestId('home-content').props.entering).toEqual({
      verb: 'float',
      delayMs: 0,
    });
    mockTaskChrome.surfaceKey = 0;
  });

  it('floats again when the screen surfaces from under the lock overlay', () => {
    // The overlay leaving bumps the surface count; the content remounts on it
    // and floats with no beat — the water is clear, nothing sank before it.
    mockTaskChrome.surfaceKey = 1;
    const { rerender } = renderScreen(<HomeScreen />);
    const first = screen.getByTestId('home-content');
    expect(first.props.entering).toEqual({ verb: 'float', delayMs: 0 });

    mockTaskChrome.surfaceKey = 2;
    rerender(<HomeScreen />);
    const second = screen.getByTestId('home-content');
    expect(second).not.toBe(first);
    expect(second.props.entering).toEqual({ verb: 'float', delayMs: 0 });
    mockTaskChrome.surfaceKey = 0;
  });
});
