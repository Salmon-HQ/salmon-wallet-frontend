/**
 * Token detail (spec 019) — the route's own logic, not the kit primitives
 * it composes (each has its own suite). This pins:
 *
 * 1. A known id resolves the token from the active account's balance list
 *    and draws the header (title = name, subtitle = ticker) and the
 *    Performance card, chart included.
 * 2. An unknown id — or no account — redirects home rather than rendering
 *    an empty screen.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockRouter = { back: jest.fn(), push: jest.fn() };
const mockRouteParams = { id: 'MintKnown11111111111111111111111111111111' };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockRouteParams,
  Redirect: ({ href }: { href: string }) => {
    const ReactActual = require('react');
    const { Text } = require('react-native');
    return ReactActual.createElement(Text, { testID: 'redirect' }, href);
  },
}));

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

// Mock the data source (`useCoinMarketData`'s own dependency), not the hook
// itself — this test now exercises the real shared hook the screen calls,
// same convention as `useCoinMarketData.test.tsx`.
jest.mock('@salmon/shared/src/api/services', () => ({
  getTokenCoinInfo: jest.fn(),
  getTokenMarketChart: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

const mockAccountState = {
  ready: true,
  activeAccount: { id: 'acct-1' },
  activeBlockchainAccount: {},
  networkId: 'solana-mainnet',
};

const mockBalanceState = {
  tokens: [
    {
      address: 'MintKnown11111111111111111111111111111111',
      name: 'Known Token',
      symbol: 'KNOWN',
      logo: undefined,
      price: 1.5,
      uiAmount: 24.08,
      usdBalance: 36.12,
      coingeckoId: 'known-token',
      tags: [],
    },
  ] as Array<Record<string, unknown>>,
  state: 'ready' as 'ready' | 'loading' | 'error',
  hiddenBalance: false,
};

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../../packages/shared/src/theme'),
  s: (value: number) => value,
  vs: (value: number) => value,
  hiddenValue: '••••',
  formatLargeNumber: (value: number) => String(value),
  formatPercentage: (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`,
  getShortAddress: (address: string, chars: number) =>
    `${address.slice(0, chars)}...${address.slice(-chars)}`,
  useAccountsContext: () => [mockAccountState, {}],
  useBalance: () => mockBalanceState,
  useCurrencyContext: () => [{ currency: 'usd' }, { formatValue: (value: number) => `$${value}` }],
  // Real implementations — the mocked `api/services` module above is their
  // only external dependency, so exercising them here catches wiring bugs a
  // hand-stubbed hook return would hide.
  useCoinMarketData: jest.requireActual('@salmon/shared/src/hooks/useCoinMarketData')
    .useCoinMarketData,
  PERIOD_TO_DAYS: jest.requireActual('@salmon/shared/src/utils/price-constants').PERIOD_TO_DAYS,
  coinInfoToMarketData: jest.requireActual('@salmon/shared/src/utils/price-constants')
    .coinInfoToMarketData,
}));

import { getTokenCoinInfo, getTokenMarketChart } from '@salmon/shared/src/api/services';

const mockGetTokenCoinInfo = getTokenCoinInfo as jest.Mock;
const mockGetTokenMarketChart = getTokenMarketChart as jest.Mock;

function renderScreen(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

jest.mock('../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ scrollBottomPadding: 0 }),
}));

jest.mock('../../hooks/useCopyFeedback', () => ({
  useCopyFeedback: () => ({
    copied: false,
    scale: { value: 0 },
    trigger: jest.fn(),
    reset: jest.fn(),
  }),
}));

// The kit primitives are each their own suite; here they only need to render
// their inputs so the route's own decisions (what it shows, and when it
// redirects) are what the assertions check.
jest.mock('../../src/components', () => {
  const ReactActual = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    Card: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
      ReactActual.createElement(View, { testID }, children),
    DepthBackground: () => null,
    MarketDataCard: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID: testID ?? 'token-detail-market-data' }),
    AboutCard: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID: testID ?? 'token-detail-about' }),
    ScalesBackground: () => null,
    IconBubble: () => null,
    KeyValueRow: ({ label, value, testID }: { label: string; value: string; testID?: string }) =>
      ReactActual.createElement(Text, { testID }, `${label}: ${value}`),
    ListRow: ({
      title,
      subtitle,
      onPress,
      testID,
    }: {
      title: string;
      subtitle?: string;
      onPress?: () => void;
      testID?: string;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        { testID, onPress },
        ReactActual.createElement(Text, null, title),
        subtitle ? ReactActual.createElement(Text, null, subtitle) : null
      ),
    PriceChart: () => ReactActual.createElement(View, { testID: 'token-detail-chart' }),
    ScreenHeader: ({ title, subtitle }: { title?: string; subtitle?: string }) =>
      ReactActual.createElement(
        View,
        { testID: 'screen-header' },
        ReactActual.createElement(Text, { testID: 'screen-header-title' }, title),
        ReactActual.createElement(Text, { testID: 'screen-header-subtitle' }, subtitle)
      ),
    TokenLogo: () => null,
  };
});

import TokenDetailScreen from '../../app/(app)/token/[id]';

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams.id = 'MintKnown11111111111111111111111111111111';
  mockAccountState.ready = true;
  mockBalanceState.state = 'ready';
  mockGetTokenCoinInfo.mockResolvedValue(null);
  mockGetTokenMarketChart.mockResolvedValue({
    prices: [
      [1, 100],
      [2, 104.2],
    ],
    marketCaps: [],
    totalVolumes: [],
  });
});

describe('token detail screen', () => {
  it('renders the header and the Performance chart for a known id', async () => {
    renderScreen(<TokenDetailScreen />);

    expect(screen.getByTestId('token-detail-screen')).toBeTruthy();
    expect(screen.getByTestId('screen-header-title').props.children).toBe('Known Token');
    expect(screen.getByTestId('screen-header-subtitle').props.children).toBe('KNOWN');
    expect(screen.getByTestId('token-detail-chart')).toBeTruthy();
    expect(screen.queryByTestId('redirect')).toBeNull();

    // Flush the query so no promise settles after the test tears down.
    await waitFor(() =>
      expect(mockGetTokenMarketChart).toHaveBeenCalledWith(
        { coingeckoId: 'known-token', address: 'MintKnown11111111111111111111111111111111' },
        30,
        'usd'
      )
    );
  });

  it('redirects home for an id that matches no token in the active list', () => {
    mockRouteParams.id = 'UnknownMint1111111111111111111111111111111';
    renderScreen(<TokenDetailScreen />);

    expect(screen.getByTestId('redirect').props.children).toBe('/');
    expect(screen.queryByTestId('token-detail-screen')).toBeNull();
    expect(mockGetTokenMarketChart).not.toHaveBeenCalled();
  });
});
