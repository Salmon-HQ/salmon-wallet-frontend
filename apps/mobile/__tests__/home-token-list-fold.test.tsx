/**
 * Home folds its Solana token list behind a "Show more" row (spec 044): the
 * count and the minimum value come from the stored choice, staking stays
 * below, the total never moves. The rule and the unfolded state are the real
 * shared hook; only the stored choice and the display currency are set here.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import HomeScreen from '../app/(app)/(tabs)/index';

const mockRefresh = jest.fn();
const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
const mockWallet = {
  tokens: [] as Array<Record<string, unknown>>,
  state: 'ready' as 'ready' | 'loading',
  staked: [] as Array<Record<string, unknown>>,
  preference: { maxCount: null as number | null, minValue: null as number | null },
};

jest.mock('@salmon/shared/src/contexts/DeveloperModeContext', () => ({
  ...jest.requireActual('@salmon/shared/src/contexts/DeveloperModeContext'),
  useTokenListPreference: () => ({
    tokenListPreference: mockWallet.preference,
    setTokenListPreference: jest.fn(),
  }),
}));
jest.mock('@salmon/shared/src/contexts/CurrencyContext', () => ({
  ...jest.requireActual('@salmon/shared/src/contexts/CurrencyContext'),
  useCurrencyContext: () => [
    { currency: 'usd', exchangeRate: 1 },
    { convert: (usd: number) => usd },
  ],
}));

// Mock the data source (`useCoinMarketData`'s own dependency), not the hook
// itself — this screen never leaves Solana in this suite, so the hook stays
// disabled and these never resolve, but the real hook still needs its real
// import to exist.
jest.mock('@salmon/shared/src/api/services', () => ({
  getTokenCoinInfo: jest.fn(),
  getTokenMarketChart: jest.fn(),
}));

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
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
    LinearTransition: { duration: () => ({ easing: () => undefined }) },
    Easing: { bezier: () => undefined },
    useReducedMotion: () => false,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
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
jest.mock('../src/utils/sinkAndFloat', () => ({
  useCoverFloat: () => ({}),
  FLOAT_DELAY_MS: 0,
  floatEntering: () => undefined,
  sinkExiting: () => undefined,
}));

jest.mock('@salmon/shared', () =>
  require('../test-utils/sharedWith').sharedWith({
    // The phrase check (DEV-208) is never due here.
    usePhraseBackup: () => ({
      needsBackup: false,
      requireBackup: async () => true,
      openBackup: () => {},
    }),
    // The focus-mode clock is real: the screen reads Home in its resting phases.
    ...jest.requireActual('../../../packages/shared/src/motion/useFocusModePhase'),
    useAccountActivity: jest.fn(),
    // The settle clock is identity here: the content follows the tap at once.
    // The clock itself is covered in `useSettledSubTab.test.tsx`.
    useSettledSubTab: ({ target }: { target: string }) => target,
    useHomeSubTabContent: ({
      effectiveSubTab,
      focusPhase,
    }: {
      effectiveSubTab: string;
      focusPhase: string;
    }) => ({
      isPowerupMode: focusPhase === 'gone',
      settledSubTab: effectiveSubTab,
      subTabPending: false,
    }),
    borderRadius: { sm: 8, md: 12, lg: 16, xl: 20, full: 999 },
    motionMs: { drift: 280 },
    SINK_OUT_MS: 225,
    FLOAT_IN_MS: 560,
    motionEasing: { settle: { native: [0.22, 1, 0.36, 1] } },
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
    fontSize: {
      xs: 11,
      sm: 13,
      base: 15,
      md: 16,
      bodyLg: 16,
      subtitle: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
    },
    lineHeight: { snug: 1.3 },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      '2xl': 24,
      '3xl': 32,
      headerPadding: 16,
      screenGutter: 20,
    },
    s: (value: number) => value,
    vs: (value: number) => value,
    getShortAddress: () => 'Wall...et11',
    useCoinMarketData: jest.requireActual('@salmon/shared/src/hooks/useCoinMarketData')
      .useCoinMarketData,
    coinInfoToMarketData: () => undefined,
    getBlockchainFromNetworkId: () => 'solana',
    getNetworkLabel: (id: string) => (id === 'solana-devnet' ? 'Devnet' : null),
    getHeldNetworkIds: (account?: { networksAccounts?: Record<string, unknown[]> } | null) =>
      Object.entries(account?.networksAccounts ?? {})
        .filter(([, slots]) => slots?.some(Boolean))
        .map(([id]) => id),
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
    useBalance: () => ({
      tokens: mockWallet.tokens,
      usdTotal: 200,
      changePercent: 0,
      changeAmount: 0,
      loading: false,
      refreshing: false,
      hasData: true,
      state: mockWallet.state,
      refresh: mockRefresh,
      error: null,
      isError: false,
      hiddenBalance: false,
      toggleHidden: jest.fn(),
      lastUpdated: null,
    }),
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
    // The task chrome and the Home shell are the real modules: their own suites
    // cover the logic, and Home is rendered here with what they hand back.
    ...jest.requireActual('@salmon/shared/src/contexts/TaskChromeContext'),
    useHomeShell: jest.requireActual('@salmon/shared/src/hooks/useHomeShell').useHomeShell,
    useHomeStaking: ({ usdTotal }: { usdTotal: number | undefined }) => ({
      tokens: mockWallet.staked,
      totalWithStakes: usdTotal,
    }),
    stakingSectionBlocks: ({ tokens }: { tokens: unknown[] }) =>
      tokens.length > 0 ? [{ kind: 'label', key: 'staking' }] : [],
    STAKED_SOL_KEY: 'staked-sol',
    STAKED_SKR_KEY: 'staked-skr',
    useHomePowerupTabs: jest.requireActual('@salmon/shared/src/hooks/useHomePowerups')
      .useHomePowerupTabs,
    useHomePowerupsCatalog: jest.requireActual('@salmon/shared/src/hooks/useHomePowerups')
      .useHomePowerupsCatalog,
    // Nothing installed: the Powerup tabs are their own suite.
    useNetworkPowerups: () => ({ enabled: ['memo'], disabled: {}, providers: {} }),
    allowlistForDevice: (allowlist: unknown) => allowlist,
    useInstalledPowerups: () => ({
      installed: [],
      isInstalled: () => false,
      install: jest.fn(),
      uninstall: jest.fn(),
    }),
    mapBalanceToToken: jest.requireActual('@salmon/shared/src/hooks/useHomeShell')
      .mapBalanceToToken,
    buildBitcoinToken: jest.requireActual('@salmon/shared/src/hooks/useHomeShell')
      .buildBitcoinToken,
  })
);

// The real shell reads the tab order through its own module path, not the
// barrel, so the arrangement is pinned there too.
jest.mock('@salmon/shared/src/hooks/useHomeTabOrder', () => ({
  useHomeTabOrder: (defaults: string[]) => ({ order: defaults, setOrder: jest.fn() }),
}));

// The Powerups entry is a build-time alias (metro.config.js). Home reads it
// for the catalogue, the tab bodies and the flag; the real module pulls in the
// sheet and its motion, which is not what any of this is about.
jest.mock('../src/powerups', () => ({
  POWERUPS: [],
  POWERUPS_ENABLED: true,
  PowerupsCatalog: null,
  getPowerupCatalog: () => [],
  getPowerupTab: () => null,
}));

jest.mock('../src/components', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  return {
    DerivedAccountsSheet: () => null,
    HomeTabOrderSheet: () => null,
    PowerupsFab: () => null,
    // The identity line. Its own suite covers it; here it only has to render
    // so the Home tree mounts.
    WalletHeader: () => <View testID="wallet-header" />,
    BalanceHeader: ({ blockchains }: { blockchains?: unknown }) => (
      <View testID="balance-header" accessibilityHint={JSON.stringify(blockchains)} />
    ),
    BlockList: ({ testID }: { testID?: string }) => <View testID={testID} />,
    DataAttribution: () => null,
    TokenListFoldRow: ({
      foldedCount,
      expanded,
      onToggle,
    }: {
      foldedCount: number;
      expanded: boolean;
      onToggle: () => void;
    }) => (
      <Text testID="token-list-fold-row" accessibilityState={{ expanded }} onPress={onToggle}>
        {foldedCount}
      </Text>
    ),
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
    TokenAbout: () => <View />,
    // Mirrors the real TokenList contract: a skeleton while `loading`, the
    // provided empty component once the load settled with no rows.
    TokenList: ({
      tokens,
      loading,
      onTokenPress,
      ListEmptyComponent,
      ListFooterComponent,
    }: {
      tokens: Array<{ symbol?: string }>;
      loading?: boolean;
      onTokenPress: (token: unknown) => void;
      ListEmptyComponent?: React.ReactNode;
      ListFooterComponent?: React.ReactNode;
    }) => (
      <View>
        {loading ? (
          <Text testID="token-list-skeleton">skeleton</Text>
        ) : tokens.length === 0 ? (
          ListEmptyComponent
        ) : (
          tokens.map((token) => (
            <Text
              key={token.symbol}
              testID={`token-row-${token.symbol}`}
              onPress={() => onTokenPress(token)}
            >
              {token.symbol}
            </Text>
          ))
        )}
        {ListFooterComponent}
      </View>
    ),
    TokenListItem: () => <View />,
    TokenMarketData: () => <View />,
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

const SOL = {
  address: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  name: 'Solana',
  uiAmount: 1,
  usdBalance: 100,
};
const token = (symbol: string, usdBalance: number | null) => ({
  address: `${symbol}-mint`,
  symbol,
  name: symbol,
  uiAmount: 1,
  usdBalance,
});
const five = [SOL, token('JUP', 80), token('BONK', 60), token('WIF', 40), token('USDC', 20)];

const rows = () =>
  screen
    .queryAllByTestId(/^token-row-/)
    .map((row) => String(row.props.testID).replace('token-row-', ''));
const foldRow = () => screen.queryByTestId('token-list-fold-row');

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <HomeScreen />
    </QueryClientProvider>
  );
}

describe('home token list — folding (spec 044)', () => {
  beforeEach(() => {
    Object.assign(mockWallet, {
      tokens: [],
      state: 'ready',
      staked: [],
      preference: { maxCount: null, minValue: null },
    });
  });

  it('shows the first three of five tokens, and the other two behind the row', () => {
    Object.assign(mockWallet, { tokens: five, preference: { maxCount: 3, minValue: null } });
    renderScreen();

    expect(rows()).toEqual(['SOL', 'JUP', 'BONK']);
    expect(foldRow()).toHaveTextContent('2');
    expect(foldRow()?.props.accessibilityState).toEqual({ expanded: false });

    fireEvent.press(foldRow()!);
    expect(rows()).toEqual(['SOL', 'JUP', 'BONK', 'WIF', 'USDC']);
    expect(foldRow()?.props.accessibilityState).toEqual({ expanded: true });

    fireEvent.press(foldRow()!);
    expect(rows()).toEqual(['SOL', 'JUP', 'BONK']);
  });

  it('keeps the Staking section under the list, folded and unfolded', () => {
    Object.assign(mockWallet, {
      tokens: five,
      staked: [token('staked-sol', 0.5)],
      preference: { maxCount: 3, minValue: null },
    });
    renderScreen();

    expect(screen.getByTestId('staking-section')).toBeTruthy();
    fireEvent.press(foldRow()!);
    expect(screen.getByTestId('staking-section')).toBeTruthy();
  });

  it('folds tokens worth less than the minimum and unpriced ones, but never SOL', () => {
    Object.assign(mockWallet, {
      tokens: [
        { ...SOL, usdBalance: 2 },
        token('JUP', 120),
        token('DUST', 4.99),
        token('NOPRICE', null),
      ],
      preference: { maxCount: null, minValue: 5 },
    });
    renderScreen();

    expect(rows()).toEqual(['SOL', 'JUP']);
    expect(foldRow()).toHaveTextContent('2');
  });

  it('draws no row while the list loads', () => {
    Object.assign(mockWallet, {
      tokens: five,
      state: 'loading',
      preference: { maxCount: 3, minValue: null },
    });
    renderScreen();

    expect(foldRow()).toBeNull();
  });

  it('with both choices off, draws every token in order and no row', () => {
    Object.assign(mockWallet, { tokens: five });
    renderScreen();

    expect(rows()).toEqual(['SOL', 'JUP', 'BONK', 'WIF', 'USDC']);
    expect(foldRow()).toBeNull();
  });

  it('leaves the total as it is', () => {
    Object.assign(mockWallet, { tokens: five });
    const { unmount } = renderScreen();
    const unfolded = screen.getByTestId('balance-header').props.accessibilityHint;
    unmount();

    Object.assign(mockWallet, { preference: { maxCount: 3, minValue: 50 } });
    renderScreen();
    expect(screen.getByTestId('balance-header').props.accessibilityHint).toBe(unfolded);
  });

  // Owner, 2026-11-25: a token visit leaves the list as it was. The token
  // screen is pushed above the tab, which stays mounted; the shared hook's
  // suite pins that the state survives the rerenders of that visit.
  it('stays unfolded when a token is opened from the unfolded list', () => {
    Object.assign(mockWallet, { tokens: five, preference: { maxCount: 3, minValue: null } });
    renderScreen();

    fireEvent.press(foldRow()!);
    fireEvent.press(screen.getByTestId('token-row-WIF'));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/token/[id]',
      params: { id: 'WIF-mint' },
    });
    expect(rows()).toEqual(['SOL', 'JUP', 'BONK', 'WIF', 'USDC']);
  });
});
