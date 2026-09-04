/**
 * The in-page sub-tabs replaced the bottom tab bar, and they carry two rules
 * that are not visible from the component itself:
 *
 * 1. NFTs only exist on Solana, so the tab is only OFFERED there: leaving
 *    Solana sinks it out of the row and drops a session sitting on it back to
 *    Portfolio; returning floats it back in its stored place. Opening NFTs
 *    never moves the chain the user is standing on (owner ruling 3, spec 026).
 * 2. Nothing above the sub-tab row scrolls, on either tab: the balance is a
 *    fixed sibling of the content region on Portfolio AND on NFTs, and the
 *    row is one instance under one parent so its underline can slide.
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import HomeScreen from '../app/(app)/(tabs)/index';
import { TaskChromeProvider } from '../src/contexts/TaskChromeContext';

const mockChangeNetwork = jest.fn(() => Promise.resolve());
const mockSetTabOrder = jest.fn();
let mockStoredTabOrder: string[] | null = null;
const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };

// Mock the data source (`useCoinMarketData`'s own dependency), not the hook
// itself — several cases below swipe to Bitcoin, so this hook actually
// fires; resolving to `null` keeps the chart/market/about mocks (which
// ignore their data props here) from seeing an unhandled rejection.
jest.mock('@salmon/shared/src/api/services', () => ({
  getTokenCoinInfo: jest.fn().mockResolvedValue(null),
  getTokenMarketChart: jest.fn().mockResolvedValue(null),
}));

const networksState = {
  networkId: 'solana-mainnet',
  allNetworks: [{ id: 'solana-mainnet', name: 'Solana' }] as Array<{ id: string; name: string }>,
};

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
    useReducedMotion: () => false,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

const mockDeveloperNetworks = { on: false };
jest.mock('../src/contexts/DeveloperModeContext', () => ({
  useDeveloperMode: () => mockDeveloperNetworks.on,
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
  getBlockchainFromNetworkId: (id: string) => id.split('-')[0],
  getNetworkLabel: (id: string) => (id === 'solana-devnet' ? 'Devnet' : null),
  getHeldNetworkIds: (account?: { networksAccounts?: Record<string, unknown[]> } | null) =>
    Object.entries(account?.networksAccounts ?? {})
      .filter(([, slots]) => slots?.some(Boolean))
      .map(([id]) => id),
  BLOCKCHAIN_TO_COINGECKO: { solana: 'solana', bitcoin: 'bitcoin' },
  PERIOD_TO_DAYS: { '1D': 1, '1M': 30 },
  useAccountsContext: () => [
    {
      ready: true,
      activeAccount: {
        getReceiveAddress: () => 'Wallet111',
        networksAccounts: { 'solana-mainnet': [], 'bitcoin-mainnet': [] },
      },
      activeBlockchainAccount: { getReceiveAddress: () => 'Wallet111' },
      networkId: networksState.networkId,
      pathIndex: 0,
      switchingNetwork: false,
    },
    { clearSwitchingNetwork: jest.fn(), changeNetwork: mockChangeNetwork },
  ],
  // A faithful fake of the hook's one subtle contract: its internal
  // `useUserConfig` reads the flag from storage at mount and reloads only when
  // the network it is keyed on changes, so a caller that does not pass the
  // `developerNetworks` override keeps whatever the flag was when it mounted.
  // Home must pass the override, or a toggle reaches the carousel only after
  // the next chain change.
  useAvailableNetworks: ({
    developerNetworks,
    activeNetworkId,
  }: {
    developerNetworks?: boolean;
    activeNetworkId?: string | null;
  }) => {
    const ReactActual = require('react');
    const flagAtMount = ReactActual.useRef(mockDeveloperNetworks.on).current;
    const offered = developerNetworks ?? flagAtMount;
    return {
      allNetworks: offered
        ? networksState.allNetworks
        : // With the flag off the offer is the mainnets plus whatever network
          // the session is standing on, so nobody is stranded on a page the
          // carousel cannot reach (`visibleNetworkIds`).
          networksState.allNetworks.filter(
            (network) => network.id.endsWith('-mainnet') || network.id === activeNetworkId
          ),
    };
  },
  useBalance: () => ({
    tokens: [],
    usdTotal: 0,
    changePercent: 0,
    changeAmount: 0,
    loading: false,
    refreshing: false,
    hasData: true,
    state: 'ready' as const,
    refresh: jest.fn(),
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
  // The arrangement is the shared hook's business (its own suite covers the
  // reconciliation); Home only has to render whatever order it hands back.
  useHomeTabOrder: (defaults: string[]) => ({
    order: mockStoredTabOrder ?? defaults,
    setOrder: mockSetTabOrder,
  }),
  // The task chrome and the Home shell are the real modules: their own suites
  // cover the logic, and Home is rendered here with what they hand back.
  ...jest.requireActual('@salmon/shared/src/contexts/TaskChromeContext'),
  useHomeShell: jest.requireActual('@salmon/shared/src/hooks/useHomeShell').useHomeShell,
  mapBalanceToToken: jest.requireActual('@salmon/shared/src/hooks/useHomeShell').mapBalanceToToken,
  buildBitcoinToken: jest.requireActual('@salmon/shared/src/hooks/useHomeShell').buildBitcoinToken,
}));

// The real shell reads the tab order through its own module path, not the
// barrel, so the arrangement is pinned there too.
jest.mock('@salmon/shared/src/hooks/useHomeTabOrder', () => ({
  useHomeTabOrder: (defaults: string[]) => ({
    order: mockStoredTabOrder ?? defaults,
    setOrder: mockSetTabOrder,
  }),
}));

jest.mock('../src/components', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  return {
    // The identity line. Its own suite covers it; here it only has to render
    // so the Home tree mounts.
    WalletHeader: ({ accountName }: { accountName?: string }) => (
      <View testID="wallet-header">
        <Text>{accountName}</Text>
      </View>
    ),
    BalanceHeader: ({
      activeIndex,
      blockchains,
      onBlockchainChange,
      onActivityPress,
    }: {
      activeIndex?: number;
      blockchains?: Array<{ network: { id: string; blockchain: string } }>;
      onBlockchainChange?: (blockchain: string, index: number) => void;
      onActivityPress?: () => void;
    }) => (
      <View
        testID="balance-header"
        // The chain the block is actually showing, so a test can read it.
        accessibilityLabel={blockchains?.[activeIndex ?? 0]?.network.blockchain}
      >
        <Text testID="home-activity-button" onPress={onActivityPress}>
          activity
        </Text>
        {(blockchains ?? []).map((chain, index) => (
          <Text
            key={chain.network.id}
            testID={`swipe-to-${chain.network.blockchain}`}
            onPress={() => onBlockchainChange?.(chain.network.blockchain, index)}
          >
            {chain.network.id}
          </Text>
        ))}
      </View>
    ),
    NftsTab: () => <View testID="nfts-tab" />,
    DerivedAccountsSheet: () => null,
    HomeTabOrderSheet: () => null,
    PortfolioSubTabs: ({
      tabs,
      onChange,
      tabsKey,
      tabsEntering,
      tabsExiting,
    }: {
      tabs: Array<{ key: string; label: string }>;
      onChange: (key: string) => void;
      tabsKey?: string;
      tabsEntering?: unknown;
      tabsExiting?: unknown;
    }) => (
      <View
        key={tabsKey}
        testID="portfolio-tabs-region"
        {...({ entering: tabsEntering, exiting: tabsExiting } as object)}
      >
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
    TokenList: () => <View testID="token-list" />,
    TokenListItem: () => <View />,
    MarketDataCard: () => <View />,
    WarningNotice: ({ title }: { title: string }) => <Text>{title}</Text>,
  };
});

function renderScreen(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('home sub-tabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoredTabOrder = null;
    mockDeveloperNetworks.on = false;
    networksState.networkId = 'solana-mainnet';
    networksState.allNetworks = [{ id: 'solana-mainnet', name: 'Solana' }];
  });

  it('does not offer the NFTs tab on Bitcoin', () => {
    networksState.networkId = 'bitcoin-mainnet';
    networksState.allNetworks = [
      { id: 'solana-mainnet', name: 'Solana' },
      { id: 'bitcoin-mainnet', name: 'Bitcoin' },
    ];

    renderScreen(<HomeScreen />);

    expect(screen.queryByTestId('portfolio-tab-nfts')).toBeNull();
    expect(screen.getByTestId('portfolio-tab-portfolio')).toBeTruthy();
    // And the chain the user is standing on is left exactly where it was.
    expect(mockChangeNetwork).not.toHaveBeenCalled();
  });

  it('keeps the balance out of the scrolling view on both sub-tabs', () => {
    renderScreen(<HomeScreen />);

    // Portfolio: the balance is a sibling of the list, not part of it.
    expect(screen.getByTestId('balance-header')).toBeTruthy();
    expect(screen.getByTestId('token-list')).toBeTruthy();
    expect(screen.queryByTestId('nfts-tab')).toBeNull();

    fireEvent.press(screen.getByTestId('portfolio-tab-nfts'));

    // NFTs: same block, same place — it is not handed to the grid, so nothing
    // above the sub-tab row scrolls away (owner, 2026-09-01).
    const grid = screen.getByTestId('nfts-tab');
    expect(within(grid).queryByTestId('balance-header')).toBeNull();
    expect(screen.getByTestId('balance-header')).toBeTruthy();
    expect(screen.queryByTestId('token-list')).toBeNull();
  });

  it('mounts one sub-tab row for both tabs, so the underline can slide', () => {
    // The row used to live under a different parent per tab, which remounted
    // `UnderlineTabs` on every switch and threw away its underline travel.
    renderScreen(<HomeScreen />);
    const row = screen.getByTestId('portfolio-tab-nfts');

    fireEvent.press(row);

    expect(screen.getByTestId('portfolio-tab-nfts')).toBe(row);
  });

  it('sends the balance pill to the Activity screen, not to a sheet', () => {
    renderScreen(<HomeScreen />);

    fireEvent.press(screen.getByTestId('home-activity-button'));

    // Activity is a route now (CORE 08): Home holds no transaction state and
    // opens nothing of its own.
    expect(mockRouter.push).toHaveBeenCalledWith('/activity');
  });

  it('sinks the NFTs tab out of the row on Bitcoin and falls back to Portfolio', () => {
    // Leaving Solana while standing on NFTs: the tabs region plays the verb
    // (it is keyed on the SET of tabs) and the content region switches to
    // Portfolio on its own verb. The chain-keyed wrapper inside it stays
    // silent — one wrapper speaks per gesture (DESIGN.md rule five).
    networksState.networkId = 'solana-mainnet';
    networksState.allNetworks = [
      { id: 'solana-mainnet', name: 'Solana' },
      { id: 'bitcoin-mainnet', name: 'Bitcoin' },
    ];

    renderScreen(<HomeScreen />);
    fireEvent.press(screen.getByTestId('portfolio-tab-nfts'));
    expect(screen.getByTestId('nfts-tab')).toBeTruthy();
    const tabsRegion = screen.getByTestId('portfolio-tabs-region');

    fireEvent.press(screen.getByTestId('swipe-to-bitcoin'));

    expect(screen.queryByTestId('portfolio-tab-nfts')).toBeNull();
    expect(screen.queryByTestId('nfts-tab')).toBeNull();
    // Portfolio's own content region is what took the screen back.
    expect(screen.getByTestId('home-chain-content')).toBeTruthy();
    // The row swapped, so it is a different instance carrying the verb.
    expect(screen.getByTestId('portfolio-tabs-region')).not.toBe(tabsRegion);
    // The content region owns the swap; the chain wrapper inside it does not.
    expect(screen.getByTestId('home-subtab-content').props.entering).toBeTruthy();
    expect(screen.getByTestId('home-chain-content').props.entering).toBeUndefined();
  });

  it('floats the NFTs tab back in its stored place on the way home to Solana', () => {
    mockStoredTabOrder = ['nfts', 'portfolio'];
    networksState.networkId = 'bitcoin-mainnet';
    networksState.allNetworks = [
      { id: 'solana-mainnet', name: 'Solana' },
      { id: 'bitcoin-mainnet', name: 'Bitcoin' },
    ];

    renderScreen(<HomeScreen />);
    expect(screen.queryByTestId('portfolio-tab-nfts')).toBeNull();

    fireEvent.press(screen.getByTestId('swipe-to-solana'));

    // Back, and in the arrangement the user saved — first, not appended.
    const tabs = screen.getAllByTestId(/^portfolio-tab-/);
    expect(tabs.map((tab) => tab.props.testID)).toEqual([
      'portfolio-tab-nfts',
      'portfolio-tab-portfolio',
    ]);
  });

  it('leaves the chain alone when NFTs is opened from Solana', () => {
    // The snap is one-way. Re-reporting the chain the block is already on
    // remounts the value wrappers for nothing, and on device that read as a
    // chain switch (owner).
    renderScreen(<HomeScreen />);

    fireEvent.press(screen.getByTestId('portfolio-tab-nfts'));

    expect(mockChangeNetwork).not.toHaveBeenCalled();
    expect(screen.getByTestId('balance-header').props.accessibilityLabel).toBe('solana');
  });

  it('counts devnet as Solana, so the tab is offered there', () => {
    // `network.blockchain` is the network id minus `-mainnet`, so devnet reads
    // as `solana-devnet` — the chain FAMILY is what decides, and it comes from
    // `getBlockchainFromNetworkId` rather than a string comparison.
    networksState.networkId = 'solana-devnet';
    networksState.allNetworks = [
      { id: 'solana-devnet', name: 'Solana Devnet' },
      { id: 'bitcoin-mainnet', name: 'Bitcoin' },
    ];

    renderScreen(<HomeScreen />);
    fireEvent.press(screen.getByTestId('portfolio-tab-nfts'));

    expect(mockChangeNetwork).not.toHaveBeenCalled();
    expect(screen.getByTestId('nfts-tab')).toBeTruthy();
  });

  it('lets the user swipe back to Bitcoin from NFTs; the chain leads', () => {
    // The chain drives the tab now, never the other way round (owner ruling 3).
    networksState.networkId = 'solana-mainnet';
    networksState.allNetworks = [
      { id: 'solana-mainnet', name: 'Solana' },
      { id: 'bitcoin-mainnet', name: 'Bitcoin' },
    ];

    renderScreen(<HomeScreen />);
    fireEvent.press(screen.getByTestId('portfolio-tab-nfts'));
    expect(screen.getByTestId('nfts-tab')).toBeTruthy();

    fireEvent.press(screen.getByTestId('swipe-to-bitcoin'));

    expect(screen.queryByTestId('nfts-tab')).toBeNull();
    expect(screen.getByTestId('balance-header').props.accessibilityLabel).toBe('bitcoin');
  });

  it('hands a chain change to the chain wrapper alone, never to the screen', () => {
    // One depth per gesture (DESIGN.md rule 5). `home-content` is not keyed on
    // the chain, so a chain change cannot remount it — the screen stays put
    // and only the list inside it swaps.
    networksState.networkId = 'solana-mainnet';
    networksState.allNetworks = [
      { id: 'solana-mainnet', name: 'Solana' },
      { id: 'bitcoin-mainnet', name: 'Bitcoin' },
    ];

    renderScreen(<HomeScreen />);
    const screenWrapper = screen.getByTestId('home-content');
    // Nothing has swapped yet, so the chain wrapper owes no verb.
    expect(screen.getByTestId('home-chain-content').props.entering).toBeUndefined();

    fireEvent.press(screen.getByTestId('swipe-to-bitcoin'));

    const chainWrapper = screen.getByTestId('home-chain-content');
    expect(chainWrapper.props.entering).toBeDefined();
    expect(chainWrapper.props.exiting).toBeDefined();
    expect(screen.getByTestId('home-content')).toBe(screenWrapper);
  });

  it('hands a sub-tab change to the content region alone, never to the chain wrapper', () => {
    // The grid used to appear from nothing. The region under the row plays
    // the verb (rule four, amended); the chain wrapper inside it stays silent
    // even though opening NFTs may snap the chain to Solana in the same render.
    renderScreen(<HomeScreen />);
    expect(screen.getByTestId('home-subtab-content').props.entering).toBeUndefined();

    fireEvent.press(screen.getByTestId('portfolio-tab-nfts'));

    const region = screen.getByTestId('home-subtab-content');
    expect(region.props.entering).toBeDefined();
    expect(region.props.exiting).toBeDefined();
    expect(screen.queryByTestId('home-chain-content')).toBeNull();

    fireEvent.press(screen.getByTestId('portfolio-tab-portfolio'));
    expect(screen.getByTestId('home-chain-content').props.entering).toBeUndefined();
  });

  it('renders the row in the stored order', () => {
    mockStoredTabOrder = ['nfts', 'portfolio'];

    renderScreen(<HomeScreen />);

    const labels = screen
      .getAllByTestId(/^portfolio-tab-/)
      .map((tab) => tab.props.testID as string);
    expect(labels).toEqual(['portfolio-tab-nfts', 'portfolio-tab-portfolio']);
  });

  it('plays the verb on a reorder, and only then', () => {
    // First mount owes no verb; once the arrangement changes the row sinks
    // and floats, keyed by the arrangement so a tab switch never remounts it.
    mockStoredTabOrder = ['portfolio', 'nfts'];
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const wrapped = () => (
      <QueryClientProvider client={client}>
        <HomeScreen />
      </QueryClientProvider>
    );
    const view = render(wrapped());
    expect(screen.getByTestId('portfolio-tabs-region').props.entering).toBeUndefined();

    mockStoredTabOrder = ['nfts', 'portfolio'];
    view.rerender(wrapped());

    const row = screen.getByTestId('portfolio-tabs-region');
    expect(row.props.entering).toBeDefined();
    expect(row.props.exiting).toBeDefined();
  });
});

describe('home developer networks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeveloperNetworks.on = false;
    networksState.networkId = 'solana-mainnet';
    networksState.allNetworks = [
      { id: 'solana-mainnet', name: 'Solana' },
      { id: 'solana-devnet', name: 'Solana Devnet' },
    ];
  });

  it('offers the test-network pages as soon as the setting is on, with no chain change', () => {
    // Regression (owner, on device): the devnet page appeared only after
    // switching chains. Home read the flag from the hoisted context but let
    // `useAvailableNetworks` read its own copy, and that copy reloads from
    // storage only when the network it is keyed on changes — so the offer
    // stayed on the value it had when Home mounted.
    const view = renderScreen(<HomeScreen />);
    expect(screen.queryByText('solana-devnet')).toBeNull();

    mockDeveloperNetworks.on = true;
    view.rerender(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
      >
        <HomeScreen />
      </QueryClientProvider>
    );

    expect(screen.getByText('solana-devnet')).toBeTruthy();
    // The pages arrive on their own: nothing had to move the session to
    // another chain to shake them loose.
    expect(mockChangeNetwork).not.toHaveBeenCalled();
  });

  it('drops the pages again when the setting goes off', () => {
    mockDeveloperNetworks.on = true;
    const view = renderScreen(<HomeScreen />);
    expect(screen.getByText('solana-devnet')).toBeTruthy();

    // Turning it off moves the session back to mainnet first (the toggle's own
    // job, covered where it lives); what Home owes is dropping the page.
    mockDeveloperNetworks.on = false;
    view.rerender(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
      >
        <HomeScreen />
      </QueryClientProvider>
    );

    expect(screen.queryByText('solana-devnet')).toBeNull();
  });
});

/**
 * The screen surfacing — a wait ending, the lock overlay leaving — is not a
 * swap. Home is never unmounted while the wait is up, so the user's last
 * gesture is still recorded when the water clears; replaying it inside the
 * screen's own float is one gesture at two depths, which the verb never does
 * (DESIGN.md §The balance block's motion, rule five).
 *
 * Reduce motion is not re-tested here: `floatEntering`/`sinkExiting` return
 * `undefined` for it, which is covered where they live.
 */
describe('home surfacing', () => {
  function renderAtSurface(surfaceKey: number) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const tree = (key: number) => (
      <QueryClientProvider client={client}>
        <TaskChromeProvider surfaceKey={key}>
          <HomeScreen />
        </TaskChromeProvider>
      </QueryClientProvider>
    );
    const view = render(tree(surfaceKey));
    return { ...view, surfaceTo: (key: number) => view.rerender(tree(key)) };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoredTabOrder = null;
    mockDeveloperNetworks.on = false;
    networksState.networkId = 'solana-mainnet';
    networksState.allNetworks = [{ id: 'solana-mainnet', name: 'Solana' }];
  });

  it('lets only the screen speak when it comes back, however it was left', () => {
    const { surfaceTo } = renderAtSurface(1);

    // The last gesture before the wait: a sub-tab switch, which the content
    // region owns.
    fireEvent.press(screen.getByTestId('portfolio-tab-nfts'));
    expect(screen.getByTestId('home-subtab-content').props.entering).toEqual({
      verb: 'float',
      delayMs: 120,
    });
    const headerBefore = screen.getByTestId('wallet-header');

    surfaceTo(2);

    // One clean verb: the screen floats with no beat — nothing sank before it
    // — and every wrapper inside it holds still.
    expect(screen.getByTestId('home-content').props.entering).toEqual({
      verb: 'float',
      delayMs: 0,
    });
    expect(screen.getByTestId('home-subtab-content').props.entering).toBeUndefined();
    expect(screen.getByTestId('portfolio-tabs-region').props.entering).toBeUndefined();
    // The identity line surfaces WITH the content, as its sibling.
    expect(screen.getByTestId('wallet-header')).not.toBe(headerBefore);
  });
});
