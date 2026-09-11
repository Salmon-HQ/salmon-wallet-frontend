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
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

function stub(testID: string) {
  const Stub = ({ children }: PropsWithChildren) => <div data-testid={testID}>{children}</div>;
  Stub.displayName = `Stub(${testID})`;
  return Stub;
}

vi.mock('../../components', () => ({
  useReducedMotion: () => false,
  floatEntering: () => undefined,
  sinkExiting: () => undefined,
  VIEW_TRANSITION_LEAVING_BLOCK: 'sw-leaving-block',
  VIEW_TRANSITION_RISING_ROW: 'sw-rising-row',
  VIEW_TRANSITION_MS_VAR: '--sw-view-transition-ms',
  WalletHeader: ({ onWalletPress }: { onWalletPress?: () => void }) => (
    <div data-testid="wallet-header-bar">
      <button type="button" data-testid="open-wallets" onClick={onWalletPress} />
    </div>
  ),
  BalanceHeader: () => <div data-testid="balance-header" />,
  PortfolioSubTabs: ({ tabs }: { tabs: Array<{ key: string; label: string }> }) => (
    <div data-testid="home-sub-tabs">{tabs.map((tab) => tab.key).join('|')}</div>
  ),
  HomeTabOrderSheet: () => null,
  PowerupsFab: () => null,
  DataAttribution: () => null,
  DerivedAccountsSheet: ({ visible, scanning }: { visible: boolean; scanning: boolean }) =>
    visible ? (
      <div data-testid={scanning ? 'derived-sheet-scanning' : 'derived-sheet-answer'} />
    ) : null,
  NftsTab: () => <div data-testid="nfts-tab" />,
  StateBlock: () => <div data-testid="state-block" />,
  WarningNotice: () => null,
  TokenList: () => <div data-testid="token-list" />,
  TokenDetailContent: () => <div data-testid="bitcoin-column" />,
  SinkFloat: ({ children, testID }: PropsWithChildren<{ testID?: string }>) => (
    <div data-testid={testID}>{children}</div>
  ),
  SlideStack: ({ children, testID }: PropsWithChildren<{ testID?: string }>) => (
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
  WalletsScreen: () => <div data-testid="wallets-screen" />,
  SettingsPanelContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
  useSemantic: () => ({ text: { primary: '#fff', secondary: '#aaa' } }),
  ConfirmDialog: () => null,
  DepthBackground: stub('depth-background'),
  ScalesBackground: stub('scales-background'),
  SendPage: () => null,
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

vi.mock('../../utils/sessionKeyCache', () => ({ clearSessionKey: vi.fn() }));

// The Powerups entry is a build-time alias; Home only reads the flag, the
// registry and the catalogue, so what is behind it is stubbed rather than
// loaded. Nothing installed: the Powerup tabs are their own suite.
vi.mock('@salmon/ui/powerups', () => ({
  POWERUPS_ENABLED: true,
  POWERUPS: [],
  isPowerupOnNetwork: () => false,
  getPowerupCatalog: () => [],
  PowerupsPage: () => null,
  SwapPage: () => null,
}));

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
const derivedScanState = vi.hoisted(() => ({}) as Record<string, unknown>);

vi.mock('@salmon/shared', async () => {
  const homeShell = await vi.importActual<typeof import('@salmon/shared/hooks/useHomeShell')>(
    '@salmon/shared/hooks/useHomeShell'
  );
  const homePowerups = await vi.importActual<typeof import('@salmon/shared/hooks/useHomePowerups')>(
    '@salmon/shared/hooks/useHomePowerups'
  );
  const settings =
    await vi.importActual<typeof import('@salmon/shared/settings')>('@salmon/shared/settings');
  // The focus-mode clock is real: the suite reads Home in its resting phases.
  const focusMode = await vi.importActual<typeof import('@salmon/shared/motion/useFocusModePhase')>(
    '@salmon/shared/motion/useFocusModePhase'
  );
  return {
    ...focusMode,
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
    useSendContacts: () => ({ contacts: [], ownWallets: [], loading: false }),
    isWatchOnlyAccount: () => false,
    AddressbookError: class AddressbookError extends Error {},
    getBlockchainFromNetworkId: (id: string) => id.split('-')[0],
    getNetworkLabel: () => null,
    getHeldNetworkIds: (account?: { networksAccounts?: Record<string, unknown[]> } | null) =>
      Object.entries(account?.networksAccounts ?? {})
        .filter(([, slots]) => slots?.some(Boolean))
        .map(([id]) => id),
    BLOCKCHAIN_TO_COINGECKO: { bitcoin: 'bitcoin' },
    PERIOD_TO_DAYS: { '1M': 30 },
    coinInfoToMarketData: () => undefined,
    isSolanaNft: () => false,
    classifyTransactionError: () => 'error',
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
      showUnverifiedTokens: false,
      setShowUnverifiedTokens: vi.fn(),
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
    useDeveloperModeSettings: () => ({
      developerNetworks: false,
      toggleDeveloperNetworks: vi.fn(),
      showUnverifiedTokens: false,
      setShowUnverifiedTokens: vi.fn(),
    }),
    useNftFlowState: () => ({
      burnPreview: null,
      burnPreparing: false,
      burnError: null,
      prepareBurn: vi.fn(),
      confirmBurn: vi.fn(),
      resetBurn: vi.fn(),
      successKind: null,
      successTxId: null,
      successSettling: false,
      explorerUrl: null,
      settleAfterSend: vi.fn(),
      acknowledgeSuccess: vi.fn(),
      reset: vi.fn(),
    }),
    useDerivedAccountsScan: () => ({
      scanningAccountId: null,
      rescanningAccountId: null,
      sheetVisible: false,
      sheetRequested: false,
      finds: [],
      rescan: vi.fn(),
      importFinds: vi.fn(),
      dismiss: vi.fn(),
      ...derivedScanState,
    }),
    useHomeTabOrder: () => ({ order: ['portfolio', 'nfts'], setOrder: vi.fn() }),
    // The shell's state is the real hook — its own suite covers the logic;
    // this file asserts what the page draws with it.
    useLanguage: () => ({
      currentLanguage: 'en',
      availableLanguages: ['en'],
      languageNames: { en: 'English' },
      changeLanguage: vi.fn(),
    }),
    ...settings,
    useHomeShell: homeShell.useHomeShell,
    useHomePowerupTabs: homePowerups.useHomePowerupTabs,
    useHomePowerupsCatalog: homePowerups.useHomePowerupsCatalog,
    useNetworkPowerups: () => ({ enabled: ['swap'], disabled: {} }),
    useInstalledPowerups: () => ({
      installed: [],
      isInstalled: () => false,
      install: vi.fn(),
      uninstall: vi.fn(),
    }),
    mapBalanceToToken: homeShell.mapBalanceToToken,
    buildBitcoinToken: homeShell.buildBitcoinToken,
  };
});

// The real shell reads the tab order through its own module path, not the
// barrel, so the arrangement is pinned there too.
vi.mock('@salmon/shared/hooks/useHomeTabOrder', () => ({
  useHomeTabOrder: () => ({ order: ['portfolio', 'nfts'], setOrder: vi.fn() }),
}));

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

describe('HomePage — the derived-accounts sheet is mounted where the user is', () => {
  afterEach(() => {
    cleanup();
    for (const key of Object.keys(derivedScanState)) delete derivedScanState[key];
  });

  it('waits for a rescan on Wallets, not on Home', () => {
    Object.assign(derivedScanState, { rescanningAccountId: 'w1' });
    render(<HomePage onAddAccount={vi.fn()} />);
    expect(screen.queryByTestId('derived-sheet-scanning')).toBeNull();

    fireEvent.click(screen.getByTestId('open-wallets'));
    expect(screen.getByTestId('derived-sheet-scanning')).toBeTruthy();
  });

  it('answers the rescan the user asked for on Wallets, and the automatic pass on Home', () => {
    Object.assign(derivedScanState, { sheetVisible: true, sheetRequested: true });
    const { unmount } = render(<HomePage onAddAccount={vi.fn()} />);
    expect(screen.queryByTestId('derived-sheet-answer')).toBeNull();
    fireEvent.click(screen.getByTestId('open-wallets'));
    expect(screen.getByTestId('derived-sheet-answer')).toBeTruthy();
    unmount();

    Object.assign(derivedScanState, { sheetVisible: true, sheetRequested: false });
    render(<HomePage onAddAccount={vi.fn()} />);
    expect(screen.getByTestId('derived-sheet-answer')).toBeTruthy();
  });
});
