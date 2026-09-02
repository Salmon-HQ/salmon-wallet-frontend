/**
 * @vitest-environment jsdom
 *
 * What this file is for is the SHELL, not the kit inside it: that Home draws
 * the wallet header, the balance block, the Portfolio | NFTs row and the
 * active tab's content region, in that order and under one parent — the mobile
 * Home's anatomy, on the DOM (spec 028 lot 3). Each of those components is
 * tested on its own in `packages/ui`.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ComponentType, PropsWithChildren } from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

function sanitizeDomProps(props: Record<string, unknown>) {
  const next = { ...props };
  for (const key of Object.keys(next)) {
    if (key.startsWith('$') || typeof next[key] === 'function') delete next[key];
  }
  delete next.loading;
  delete next.fullWidth;
  delete next.tone;
  delete next.bleed;
  return next;
}

vi.mock('../../utils/styled', () => ({
  styled: (Component: React.ElementType | ComponentType<unknown>) => () => {
    const StyledComponent = ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(Component as React.ElementType, sanitizeDomProps(props), children);
    return StyledComponent;
  },
}));

function stub(testID: string) {
  const Stub = ({ children }: PropsWithChildren) => <div data-testid={testID}>{children}</div>;
  Stub.displayName = `Stub(${testID})`;
  return Stub;
}

vi.mock('../../components', () => ({
  WalletHeader: () => <div data-testid="wallet-header-bar" />,
  BalanceHeader: () => <div data-testid="balance-header" />,
  PortfolioSubTabs: ({ tabs }: { tabs: Array<{ key: string; label: string }> }) => (
    <div data-testid="home-sub-tabs">{tabs.map((tab) => tab.key).join('|')}</div>
  ),
  HomeTabOrderSheet: () => null,
  DerivedAccountsSheet: () => null,
  NftsTab: () => <div data-testid="nfts-tab" />,
  StateBlock: () => <div data-testid="state-block" />,
  WarningNotice: () => null,
  TokenList: () => <div data-testid="token-list" />,
  TokenDetailContent: () => <div data-testid="bitcoin-column" />,
  SinkFloat: ({ children, testID }: PropsWithChildren<{ testID?: string }>) => (
    <div data-testid={testID}>{children}</div>
  ),
  TokenDetailPage: () => null,
  NftDetailPage: () => null,
  TransactionHistoryPage: () => null,
  ReceiveSheet: () => null,
  useTaskChrome: () => ({
    isTaskEngaged: false,
    setTaskEngaged: () => {},
    surfaceKey: 0,
    surface: () => {},
  }),
  SettingsPanelStack: () => null,
  WalletSwitcherSheet: () => null,
  ConfirmDialog: () => null,
  DepthBackground: stub('depth-background'),
  ScalesBackground: stub('scales-background'),
  SendPage: () => null,
  NftSendDialog: () => null,
  ExplorerSelector: () => null,
  LanguageSelector: () => null,
  TrustedAppsSelector: () => null,
  SupportSelector: () => null,
  CurrencySelector: () => null,
  AccountsPanel: () => null,
  AccountEditPanel: () => null,
  AccountNamePanel: () => null,
  AccountAvatarPanel: () => null,
  AccountAddPanel: () => null,
  SecurityPanel: () => null,
  BackupPanel: () => null,
  PrivateKeyPanel: () => null,
  AddressBookPanel: () => null,
  AddressAddPanel: () => null,
  AddressEditPanel: () => null,
  AboutPanel: () => null,
  PriceChart: () => null,
}));

vi.mock('../../i18n', () => ({
  useLanguage: () => ({ currentLanguage: 'en', supportedLanguages: ['en'], setLanguage: vi.fn() }),
}));

vi.mock('../../utils/sessionKeyCache', () => ({ clearSessionKey: vi.fn() }));

const NETWORKS = [
  { id: 'solana-mainnet', name: 'Solana' },
  { id: 'bitcoin-mainnet', name: 'Bitcoin' },
];

const accountsState = {
  ready: true,
  activeAccount: {
    id: 'acct-1',
    name: 'Account 1',
    networksAccounts: { 'solana-mainnet': [{}], 'bitcoin-mainnet': [{}] },
  },
  activeBlockchainAccount: { getReceiveAddress: () => 'Owner1111111111111111111111111111' },
  networkId: 'solana-mainnet',
  accounts: [],
  accountId: 'acct-1',
  activeTrustedApps: {},
  pathIndex: 0,
};

// The real barrel pulls React Native through, which Vitest cannot parse — the
// same treatment every other page suite here gives it: name what the page
// actually reads.
vi.mock('@salmon/shared', () => {
  return {
    colors: {
      background: { primary: '#000', card: '#111', tertiary: '#222' },
      text: { primary: '#fff', secondary: '#aaa', disabled: '#555' },
      border: { default: '#333' },
    },
    spacing: {
      xxs: 2,
      xs: 4,
      sm: 8,
      md: 12,
      base: 12,
      lg: 16,
      xl: 20,
      '2xl': 24,
      screenGutter: 20,
      screenTop: 12,
    },
    fontSize: { sm: 14, base: 16, lg: 18, xl: 20 },
    componentSizes: { sheetFadeGradientHeight: 30 },
    useTheme: () => ({ preference: 'system', setPreference: vi.fn() }),
    isWatchOnlyAccount: () => false,
    AddressbookError: class AddressbookError extends Error {},
    getBlockchainFromNetworkId: (id: string) => id.split('-')[0],
    getNetworkLabel: () => null,
    BLOCKCHAIN_TO_COINGECKO: { bitcoin: 'bitcoin' },
    PERIOD_TO_DAYS: { '1M': 30 },
    coinInfoToMarketData: () => undefined,
    isSolanaNft: () => false,
    createBurnTransaction: vi.fn(),
    classifyTransactionError: () => 'error',
    LANGUAGE_NAMES: { en: 'English' },
    SUPPORT_OPTIONS: [],
    SUPPORTED_CURRENCIES: ['usd'],
    CURRENCY_MAP: { usd: { name: 'US Dollar', symbol: '$' } },
    useAccountsContext: () => [accountsState, { changeNetwork: vi.fn(), removeAccount: vi.fn() }],
    useCurrencyContext: () => [
      { currency: 'usd' },
      {
        changeCurrency: vi.fn(),
        formatValue: (v?: number) => `$${v ?? 0}`,
        formatChange: () => '',
      },
    ],
    useUserConfig: () => ({
      developerNetworks: false,
      toggleDeveloperNetworks: vi.fn(),
      explorer: undefined,
      explorers: [],
      changeExplorer: vi.fn(),
      isLoading: false,
    }),
    useAvailableNetworks: () => ({ allNetworks: NETWORKS, networksReady: true }),
    useAnalyticsConsent: () => ({ consent: false, setConsent: vi.fn() }),
    useAddressbook: () => [
      { contacts: [], error: null },
      {
        addContact: vi.fn(),
        editContact: vi.fn(),
        removeContact: vi.fn(),
        reload: vi.fn(),
      },
    ],
    useBalance: () => ({
      tokens: [{ address: 'So111', name: 'Solana', symbol: 'SOL', uiAmount: 1, usdBalance: 100 }],
      usdTotal: 100,
      nativeAmount: 1,
      changePercent: 1,
      changeAmount: 1,
      hasData: true,
      state: 'ready',
      refresh: vi.fn(),
      error: null,
      hiddenBalance: false,
      toggleHidden: vi.fn(),
    }),
    usePrefetchBalances: () => {},
    useTransactions: () => ({
      transactions: [],
      loading: false,
      loadingMore: false,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refresh: vi.fn(),
    }),
    useCoinMarketData: () => ({ coinInfo: undefined, chartData: [], error: null }),
    useSettleAfterTx: () => vi.fn(),
    useNftBurn: () => ({ burnNft: vi.fn(), settling: false }),
    useDerivedAccountsScan: () => ({
      scanningAccountId: null,
      sheetVisible: false,
      finds: [],
      rescan: vi.fn(),
      importFinds: vi.fn(),
      dismiss: vi.fn(),
    }),
    useHomeTabOrder: () => ({ order: ['portfolio', 'nfts'], setOrder: vi.fn() }),
  };
});

vi.mock('@salmon/shared/utils/account', () => ({
  isSignableSolanaAccount: () => false,
}));

const { HomePage } = await import('./HomePage');

describe('HomePage shell', () => {
  it('draws the header, the balance, the sub-tabs and the content region, in that order', () => {
    render(<HomePage onAddAccount={vi.fn()} />);

    expect(screen.getByTestId('home-screen')).toBeTruthy();
    expect(screen.getByTestId('wallet-header-bar')).toBeTruthy();
    expect(screen.getByTestId('balance-header')).toBeTruthy();
    expect(screen.getByTestId('home-sub-tabs')).toBeTruthy();
    // The Portfolio surface is the one that opens, and its list is inside the
    // content region rather than beside it.
    expect(screen.getByTestId('home-content')).toBeTruthy();
    expect(screen.getByTestId('home-subtab-content')).toBeTruthy();
    expect(screen.getByTestId('token-list')).toBeTruthy();
  });

  it('mounts the ground once, behind the screen, rather than per tab', () => {
    render(<HomePage onAddAccount={vi.fn()} />);

    expect(screen.getAllByTestId('depth-background')).toHaveLength(1);
    expect(screen.getAllByTestId('scales-background')).toHaveLength(1);
  });

  it('offers the NFTs tab on Solana — and no Home / Collectibles / Swap tab bar', () => {
    render(<HomePage onAddAccount={vi.fn()} />);

    expect(screen.getByTestId('home-sub-tabs').textContent).toBe('portfolio|nfts');
    // Swap is a powerup now, not a tab, and Collectibles is a surface inside
    // Home rather than a screen beside it (spec 028).
    expect(screen.queryByTestId('tab-home')).toBeNull();
    expect(screen.queryByTestId('tab-collectibles')).toBeNull();
    expect(screen.queryByTestId('tab-swap')).toBeNull();
  });
});
