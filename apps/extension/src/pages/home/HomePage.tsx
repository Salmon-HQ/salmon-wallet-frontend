import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useAccountsContext,
  isWatchOnlyAccount,
  useAvailableNetworks,
  useBalance,
  useUserConfig,
  useAnalyticsConsent,
  useTransactions,
  useAddressbook,
  AddressbookError,
  useCoinMarketData,
  useDerivedAccountsScan,
  useHomeShell,
  mapBalanceToToken,
  buildBitcoinToken,
  type HomeSubTabKey,
  getNetworkLabel,
  spacing,
  componentSizes,
  fontSize,
  useTheme,
  type AppearancePreference,
  type SettingsPanelEntry,
  type BlockchainId,
  type NetworkId,
  type SolanaNetworkId,
  type PriceChartPeriod,
  type PriceDataPoint,
  type MarketData,
  type Token,
  type NftData,
  type SendToken,
  type AddressBookItem,
  type NetworkAdapter,
  type AddressBookNetwork,
  type AddressInput,
  type BlockchainType,
  useCurrencyContext,
  type LanguageCode,
  SUPPORT_OPTIONS,
  type CurrencyCode,
  getBlockchainFromNetworkId,
  BLOCKCHAIN_TO_COINGECKO,
  PERIOD_TO_DAYS,
  coinInfoToMarketData,
  usePrefetchBalances,
  useNftFlowState,
  useDeveloperModeSettings,
  useSendContacts,
  useLanguage,
  CURRENCY_ITEMS,
  settingsRowValues,
  toAddressBookItems,
  toExplorerItems,
  toLanguageItems,
  toTrustedAppItems,
} from '@salmon/shared';
import { isSignableSolanaAccount } from '@salmon/shared/utils/account';
import {
  WalletHeader,
  BalanceHeader,
  PortfolioSubTabs,
  HomeTabOrderSheet,
  DerivedAccountsSheet,
  NftsTab,
  StateBlock,
  WarningNotice,
  TokenList,
  TokenDetailContent,
  SinkFloat,
  SlideStack,
  TokenDetailPage,
  NftDetailPage,
  TransactionHistoryPage,
  ReceiveSheet,
  useTaskChrome,
  SettingsPanelStack,
  WalletsScreen,
  ConfirmDialog,
  DepthBackground,
  ScalesBackground,
  SendPage,
  ExplorerSelector,
  AppearanceSelector,
  LanguageSelector,
  TrustedAppsSelector,
  SupportSelector,
  CurrencySelector,
  AccountsPanel,
  AccountEditPanel,
  AccountNamePanel,
  AccountAvatarPanel,
  AccountAddPanel,
  SecurityPanel,
  BackupPanel,
  PrivateKeyPanel,
  AddressBookPanel,
  AddressAddPanel,
  AddressEditPanel,
  AboutPanel,
  SettingsPanelContent,
  useSemantic,
  type PanelRegistry,
} from '../../components';

import { clearSessionKey } from '../../utils/sessionKeyCache';

/** The two in-page sub-tabs — the shell's key, kept under its old local name. */
type SubTabKey = HomeSubTabKey;

/** Scroll distance over which the top seam fade reaches full opacity. */
const TOP_FADE_SCROLL_RANGE = 30;

/**
 * Available page views within HomePage
 */
type PageView = 'home' | 'tokenDetail' | 'nftDetail' | 'activity' | 'send' | 'wallets';

/**
 * The panel shell.
 *
 * The ground is mounted here, once, behind everything: the depth ramp, the
 * deep field's scales and the bottom fade that ends on the ramp's own floor
 * (mobile mounts the same three in `app/(app)/(tabs)/_layout.tsx`). The
 * screens are siblings of it, so the water never travels with them.
 */
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100dvh',
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: 'var(--sw-water-gradient-1)',
};

/**
 * The bottom fade. It starts and ends on the ramp's own floor —
 * `transparent` is black at alpha 0, which smudged the fade grey on its way to
 * nothing, and on the pale ground it painted a dark band.
 */
const bottomFadeStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  // No `componentSizes` token fits this fade's height (mobile's shell uses the
  // same 180 in `(tabs)/_layout.tsx`).
  height: 180,
  background:
    'linear-gradient(to bottom, var(--sw-water-fadeBottom-0), var(--sw-water-fadeBottom-1))',
  pointerEvents: 'none',
  zIndex: 0,
};

/** Everything the user reads sits above the ground, in flow. */
const screenStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

/**
 * The block above the content region. It is fixed on both sub-tabs — nothing
 * above the sub-tab row scrolls, on either of them (DESIGN.md §Navigation).
 * Block seams are the component gap (20) on every side.
 */
const pinnedHeaderStyle: React.CSSProperties = {
  paddingLeft: spacing.screenGutter,
  paddingRight: spacing.screenGutter,
  paddingTop: spacing.xl,
  paddingBottom: spacing.xl,
};

const pinnedSubTabsStyle: React.CSSProperties = {
  marginTop: spacing.xl,
};

/** The content region: the only part of Home that scrolls. */
const contentRegionStyle: React.CSSProperties = {
  position: 'relative',
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

/**
 * The one mask on this screen: the seam between the fixed row above and the
 * list scrolling under it. It starts on the ramp's own top stop and ends on
 * that same colour at alpha 0, so it clears without smudging on either ground.
 */
const topSeamFadeStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: componentSizes.sheetFadeGradientHeight,
  background: 'linear-gradient(to bottom, var(--sw-water-fadeTop-0), var(--sw-water-fadeTop-1))',
  pointerEvents: 'none',
  zIndex: 1,
  opacity: 0,
};

/** The scroller Portfolio's list and the Bitcoin column live in. */
const scrollColumnStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  paddingLeft: spacing.screenGutter,
  paddingRight: spacing.screenGutter,
  paddingBottom: spacing['2xl'],
};

/**
 * Placeholder page for a view that has nothing to show yet.
 */
function PlaceholderPage({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const { text } = useSemantic();

  return (
    <SettingsPanelContent title={title} onBack={onBack}>
      <p style={{ margin: 0, color: text.secondary, fontSize: fontSize.body, textAlign: 'center' }}>
        {t('common.coming_soon', 'Coming soon...')}
      </p>
    </SettingsPanelContent>
  );
}

interface HomePageProps {
  onAddAccount: () => void;
}

/**
 * Home page component displayed when wallet is unlocked.
 * Shows account info and provides access to main wallet features.
 */
export function HomePage({ onAddAccount: _onAddAccount }: HomePageProps) {
  const { t } = useTranslation();
  const [state, actions] = useAccountsContext();
  const [{ currency }, { changeCurrency }] = useCurrencyContext();
  // The stored appearance preference — the same context the provider reads,
  // so a pick here re-themes the panel at once (mobile's `panelRegistry`).
  const { preference: appearancePreference, setPreference: setAppearancePreference } = useTheme();
  const {
    ready,
    activeAccount,
    activeBlockchainAccount,
    networkId,
    accounts,
    accountId,
    activeTrustedApps,
  } = state;

  // User configuration (developer networks toggle, explorer selection)
  // Note: useUserConfig requires activeBlockchainAccount parameter with specific structure
  const userConfig = useUserConfig({
    activeBlockchainAccount: {
      network: {
        environment: (networkId || 'solana-mainnet') as 'solana-mainnet' | 'solana-devnet',
        blockchain: networkId?.split('-')[0] || 'solana',
      },
    },
  });
  const { explorer, explorers, changeExplorer, isLoading: explorerLoading } = userConfig;
  // The two "show me more" flags come from the provider the side panel root
  // mounts (the same one mobile's `(app)` stack mounts), so every screen
  // reads one value and an older wallet gets its mirror addresses derived.
  const { developerNetworks, showUnverifiedTokens } = useDeveloperModeSettings();

  // Anonymous usage-analytics consent (opt-in). The first-run prompt now lives
  // in onboarding (analytics-consent step); here we only bind the Settings toggle.
  const { consent: analyticsConsent, setConsent: setAnalyticsConsent } = useAnalyticsConsent();

  // Language selection
  const { currentLanguage, availableLanguages, changeLanguage } = useLanguage();

  // The offer: the enabled networks this wallet actually holds an account on.
  // The filtering used to happen here, after the hook had already dropped the
  // non-mainnet half; the hook owns the whole rule now, so the active network
  // stays offered even with the flag off and the session is never stranded on
  // a page the balance block cannot reach (spec 026).
  const heldNetworksAccounts = activeAccount?.networksAccounts;
  const heldNetworkIds = useMemo(
    () => (heldNetworksAccounts ? Object.keys(heldNetworksAccounts) : undefined),
    [heldNetworksAccounts]
  );
  const { allNetworks, networksReady } = useAvailableNetworks({
    activeBlockchainAccount: {
      network: {
        environment: (networkId || 'solana-mainnet') as 'solana-mainnet' | 'solana-devnet',
        blockchain: 'solana',
      },
    },
    // The flag comes from the hoisted `useUserConfig` above, not from the
    // hook's own instance, which reloads only when the network it is keyed on
    // changes and would otherwise stay stale after a settings toggle.
    developerNetworks,
    heldNetworkIds,
    activeNetworkId: networkId,
  });

  // The sheet where the sub-tabs are arranged.
  const [orderSheetVisible, setOrderSheetVisible] = useState(false);

  // True from the moment a send is signed until its outcome has been
  // acknowledged. Before signing this stays false — backing out of a review
  // costs nothing and must stay easy.
  const [flowLocked, setFlowLocked] = useState(false);

  // A task that takes the screen owns it: the Home content leaves with the
  // same verb the chrome does, and comes back on the surfacing count so the
  // float plays when the water clears rather than under the overlay.
  const { isTaskEngaged, surfaceKey } = useTaskChrome();

  // The derived-account scan's question, asked over Home and nowhere else: the
  // scan belongs to the unlocked session, so its answer is taken on the first
  // screen the session lands on.
  const derivedAccounts = useDerivedAccountsScan();

  // Current page view state for navigation
  const [currentPage, setCurrentPage] = useState<PageView>('home');

  // Sheet visibility state
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [receiveSheetVisible, setReceiveSheetVisible] = useState(false);

  // Settings panel stack state (for deep-linking from Wallets)
  const [settingsInitialPanels, setSettingsInitialPanels] = useState<
    SettingsPanelEntry[] | undefined
  >(undefined);

  // Edit account navigation state
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  // Remove wallet dialog state
  const [removeWalletDialogVisible, setRemoveWalletDialogVisible] = useState(false);
  const [removeAllWalletsDialogVisible, setRemoveAllWalletsDialogVisible] = useState(false);

  // Address book state
  const [editingContact, setEditingContact] = useState<AddressBookItem | null>(null);

  // Build NetworkAdapter from available networks for address book
  const addressBookNetworkAdapter: NetworkAdapter = useMemo(
    () => ({
      getNetwork: async (id: string): Promise<AddressBookNetwork | undefined> => {
        const found = allNetworks.find((n) => n.id === id);
        if (!found) return undefined;
        return {
          id: found.id,
          name: found.name,
          blockchain: found.id.split('-')[0] as BlockchainType,
        };
      },
      getNetworks: async (): Promise<AddressBookNetwork[]> =>
        allNetworks.map((n) => ({
          id: n.id,
          name: n.name,
          blockchain: n.id.split('-')[0] as BlockchainType,
        })),
    }),
    [allNetworks]
  );

  const [
    { contacts: addressBookContacts, error: addressBookError },
    { addContact, editContact: editAddressBookContact, removeContact, reload: reloadAddressBook },
  ] = useAddressbook({ networkAdapter: addressBookNetworkAdapter });
  // Inline error for address-book writes (translation key, rendered by the open panel)
  const [addressBookWriteErrorKey, setAddressBookWriteErrorKey] = useState<string | null>(null);

  const addressBookItems: AddressBookItem[] = useMemo(
    () => toAddressBookItems(addressBookContacts),
    [addressBookContacts]
  );

  // The collectible being sent, when Send was opened from an NFT's detail:
  // the send flow becomes mobile's `nft/[id]/send` (spec 028 lot 4).
  const [sendNft, setSendNft] = useState<NftData | null>(null);
  // Mobile's `nft/[id]/burn` is a route; the DOM keeps the review inside the
  // detail page, so which step shows is the one local bit of state here.
  const [burnReviewOpen, setBurnReviewOpen] = useState(false);

  // Token detail page state
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedTokenChartPeriod, setSelectedTokenChartPeriod] = useState<PriceChartPeriod>('1M');

  // NFT detail page state
  // A watch-only wallet holds no key, so every flow that spends is closed to
  // it. The refusal is enforced in shared; this only keeps the UI honest.
  const isWatchOnly = isWatchOnlyAccount(activeAccount);

  const [selectedNft, setSelectedNft] = useState<NftData | null>(null);
  const collectibleSolanaAccount = useMemo(() => {
    const networksAccounts = activeAccount?.networksAccounts;
    if (!networksAccounts) return undefined;

    const preferredNetworkIds = ['solana-mainnet', 'solana-devnet'] as const;
    for (const preferredNetworkId of preferredNetworkIds) {
      const account = networksAccounts[preferredNetworkId]?.[0];
      if (account && isSignableSolanaAccount(account)) {
        return account;
      }
    }

    for (const accounts of Object.values(networksAccounts)) {
      for (const account of accounts ?? []) {
        if (account && isSignableSolanaAccount(account)) {
          return account;
        }
      }
    }

    return undefined;
  }, [activeAccount]);

  // The NFT flow's state — the same hook mobile's `NftFlowProvider` wraps:
  // the burn preview and its confirmation, the receipt, the settle after a
  // transfer. The signing account and the network are the collectible's own.
  const nftFlow = useNftFlowState({
    nft: selectedNft,
    account: collectibleSolanaAccount,
    networkId: (collectibleSolanaAccount?.getNetworkId() ?? 'solana-mainnet') as SolanaNetworkId,
    activeAccountId: activeAccount?.id,
    flowKey: selectedNft?.mint,
  });
  const {
    prepareBurn: prepareNftBurn,
    resetBurn: resetNftBurn,
    acknowledgeSuccess: acknowledgeNftSuccess,
    settleAfterSend: settleAfterNftSend,
  } = nftFlow;

  // Bitcoin-specific state
  const [bitcoinChartPeriod, setBitcoinChartPeriod] = useState<PriceChartPeriod>('1M');

  // Fetch balance data for current network
  const {
    tokens,
    usdTotal,
    nativeAmount,
    changePercent,
    changeAmount,
    hasData,
    state: balanceState,
    refresh,
    error: balanceError,
    hiddenBalance,
    toggleHidden,
  } = useBalance({
    account: activeBlockchainAccount,
    networkId: networkId as NetworkId | undefined,
    skip: !ready || !activeBlockchainAccount || !networksReady,
    // BE filters unknown-only-tagged SPL tokens by default; opt in via developer mode.
    includeSpam: showUnverifiedTokens,
  });

  // Warm the chains the user is not looking at, so the first arrow press of the
  // session lands on a number instead of a skeleton. One request per inactive
  // chain per app load — see the hook for why it is not per switch.
  usePrefetchBalances({
    account: activeAccount,
    networkIds: allNetworks.map((network) => network.id as NetworkId),
    activeNetworkId: networkId as NetworkId | undefined,
    pathIndex: state.pathIndex,
    includeSpam: showUnverifiedTokens,
  });

  // RQ handles refetch-on-focus via QueryClient defaults (refetchOnWindowFocus).
  // dApp approval settlement is fired in App.tsx.

  // Fetch transaction history (only when on activity page)
  const accountAddress = activeBlockchainAccount?.getReceiveAddress() || '';
  // Address-book names for the activity rows ("To Alice"), as mobile's Activity.
  const { contacts: activityContacts } = useSendContacts(accountAddress);
  const contactsByAddress = useMemo(
    () => Object.fromEntries(activityContacts.map((contact) => [contact.address, contact.name])),
    [activityContacts]
  );
  const {
    transactions,
    loading: transactionsLoading,
    loadingMore: transactionsLoadingMore,
    error: transactionsError,
    hasMore: transactionsHasMore,
    loadMore: transactionsLoadMore,
    refresh: transactionsRefresh,
  } = useTransactions({
    address: accountAddress,
    networkId: (networkId || 'solana-mainnet') as NetworkId,
    skip: !ready || !activeBlockchainAccount || currentPage !== 'activity',
    account: activeBlockchainAccount,
  });

  // Navigation handlers
  const handleBack = useCallback(() => {
    setCurrentPage('home');
  }, []);

  // Event handlers
  const handleCopyAddress = useCallback(() => {
    const address = activeBlockchainAccount?.getReceiveAddress();
    if (address) {
      navigator.clipboard.writeText(address);
    }
  }, [activeBlockchainAccount]);

  const handleSettingsPress = useCallback(() => {
    setSettingsInitialPanels(undefined);
    setSettingsVisible(true);
  }, []);

  // Wallets is a screen, not a sheet (spec 028 ruling 3): the second tap
  // inside it changes what it is.
  const handleWalletPress = useCallback(() => {
    setCurrentPage('wallets');
  }, []);

  /**
   * Handle remove current wallet action
   */
  const handleRemoveWallet = useCallback(() => {
    setSettingsVisible(false);
    setRemoveWalletDialogVisible(true);
  }, []);

  /**
   * Handle remove all wallets action
   */
  const handleRemoveAllWallets = useCallback(() => {
    setSettingsVisible(false);
    setRemoveAllWalletsDialogVisible(true);
  }, []);

  /**
   * Confirm removal of current wallet
   */
  const confirmRemoveWallet = useCallback(async () => {
    if (activeAccount?.id) {
      await actions.removeAccount(activeAccount.id);
    }
  }, [actions, activeAccount]);

  /**
   * Confirm removal of all wallets
   */
  const confirmRemoveAllWallets = useCallback(async () => {
    await clearSessionKey();
    await actions.removeAllAccounts();
  }, [actions]);

  /**
   * Validate password for secure actions
   */
  const validatePassword = useCallback(
    async (password: string): Promise<boolean> => {
      return actions.checkPassword(password);
    },
    [actions]
  );

  // One add-wallet screen, two entry points. `returnTo` says which one
  // opened it, so completing lands on the surface the user came from with
  // the new wallet already active — Home by default, as it always did.
  const handleAddAccount = useCallback(() => {
    setSettingsInitialPanels([{ screen: 'account-add', props: { returnTo: 'wallets' } }]);
    setSettingsVisible(true);
  }, []);

  // The same rename screen Settings → Accounts → Edit reaches.
  const handleRenameAccount = useCallback((targetAccountId: string) => {
    setEditingAccountId(targetAccountId);
    setSettingsInitialPanels([{ screen: 'account-name', props: { accountId: targetAccountId } }]);
    setSettingsVisible(true);
  }, []);

  const handleSendPress = useCallback(() => {
    setCurrentPage('send');
  }, []);

  const handleSendBack = useCallback(() => {
    setSendNft(null);
    setCurrentPage('home');
  }, []);

  const handleSendSuccess = useCallback(() => {
    // As mobile's `acknowledgeSuccess`: a collectible's transfer settles the
    // grid and the avatar too.
    if (sendNft) {
      settleAfterNftSend();
      setSendNft(null);
      setSelectedNft(null);
    }
    setCurrentPage('home');
    refresh();
  }, [refresh, sendNft, settleAfterNftSend]);

  const handleReceivePress = useCallback(() => {
    setReceiveSheetVisible(true);
  }, []);

  const handleOrderPress = useCallback(() => setOrderSheetVisible(true), []);
  const handleOrderSheetClose = useCallback(() => setOrderSheetVisible(false), []);

  const handleActivityPress = useCallback(() => {
    setCurrentPage('activity');
  }, []);

  const handleActivityBack = useCallback(() => {
    setCurrentPage('home');
  }, []);

  const handleTokenPress = useCallback((token: Token) => {
    setSelectedTokenChartPeriod('1M');
    setSelectedToken(token);
    setCurrentPage('tokenDetail');
  }, []);

  const handleTokenDetailBack = useCallback(() => {
    setCurrentPage('home');
    setSelectedToken(null);
  }, []);

  const handleNftDetailPress = useCallback((nft: NftData) => {
    setSelectedNft(nft);
    setCurrentPage('nftDetail');
  }, []);

  const handleNftDetailBack = useCallback(() => {
    setBurnReviewOpen(false);
    resetNftBurn();
    setCurrentPage('home');
    setSelectedNft(null);
  }, [resetNftBurn]);

  // NFT action handlers
  const handleNftSendPress = useCallback(() => {
    if (!selectedNft) return;
    setSendNft(selectedNft);
    setCurrentPage('send');
  }, [selectedNft]);

  const handleNftBurnPress = useCallback(() => {
    setBurnReviewOpen(true);
    void prepareNftBurn();
  }, [prepareNftBurn]);

  const handleNftBurnBack = useCallback(() => {
    setBurnReviewOpen(false);
    resetNftBurn();
  }, [resetNftBurn]);

  const handleNftBurnSuccessContinue = useCallback(() => {
    acknowledgeNftSuccess();
    setBurnReviewOpen(false);
    setCurrentPage('home');
    setSelectedNft(null);
  }, [acknowledgeNftSuccess]);

  const handleSelectedTokenChartPeriodChange = useCallback((period: PriceChartPeriod) => {
    setSelectedTokenChartPeriod(period);
  }, []);

  // The one mask on this screen, driven straight off the active region's
  // offset — no measurement, no overlay, no scrim (DESIGN.md §Navigation).
  // The opacity is written on the node rather than held in state: a scroll
  // handler that re-rendered Home would re-render the list it is masking.
  const seamFadeRef = useRef<HTMLDivElement>(null);

  const resetSeamFade = useCallback(() => {
    if (seamFadeRef.current) seamFadeRef.current.style.opacity = '0';
  }, []);

  const handleContentScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = event.currentTarget;
    if (seamFadeRef.current) {
      seamFadeRef.current.style.opacity = String(Math.min(scrollTop / TOP_FADE_SCROLL_RANGE, 1));
    }
  }, []);

  // The shell's state — page index, per-page balances, the network the screen
  // stands on, the offered sub-tabs and which wrapper owns a swap — lives once
  // in shared; this page renders it (`useHomeShell`).
  const {
    activeBlockchainIndex,
    blockchainBalances,
    currentNetworkId,
    currentChain,
    effectiveSubTab,
    setActiveSubTab,
    setSubTabOrder,
    subTabs,
    subTabsKey,
    subTabHasPrior,
    chainHasPrior,
    selectBlockchain,
  } = useHomeShell({
    allNetworks,
    networkId,
    activeAccountId: activeAccount?.id,
    networksAccounts: activeAccount?.networksAccounts,
    balance: { usdTotal, nativeAmount, changePercent, changeAmount, hasData },
    isTaskEngaged,
    surfaceKey,
    changeNetwork: actions.changeNetwork,
  });

  // A page change on the balance block. The incoming chain's list starts at
  // the top, so the offset the seam fade reads must start over with it.
  const handleBlockchainChange = useCallback(
    (_blockchain: BlockchainId, index: number) => {
      if (selectBlockchain(index)) resetSeamFade();
    },
    [selectBlockchain, resetSeamFade]
  );

  // Each sub-tab has its own scroller, so the offset the seam fade reads must
  // start over with it.
  const handleSubTabChange = useCallback(
    (key: string) => {
      resetSeamFade();
      setActiveSubTab(key as SubTabKey);
    },
    [resetSeamFade, setActiveSubTab]
  );

  // BE handles spam/unknown filtering via `includeSpam` above; the rows are
  // mobile's mapping, from shared.
  const formattedTokens = useMemo(() => tokens.map(mapBalanceToToken), [tokens]);

  // Bitcoin coin info + chart via shared React Query hook
  const bitcoinCoinId = currentChain === 'bitcoin' ? BLOCKCHAIN_TO_COINGECKO.bitcoin : undefined;
  const {
    coinInfo: bitcoinCoinInfo,
    chartData: bitcoinChartDataRaw,
    infoLoading: bitcoinInfoLoading,
    chartLoading: bitcoinChartLoading,
    chartPending: bitcoinChartPending,
    error: bitcoinDataError,
  } = useCoinMarketData({
    coinId: bitcoinCoinId,
    currency,
    days: PERIOD_TO_DAYS[bitcoinChartPeriod],
    enabled: currentChain === 'bitcoin',
  });
  const bitcoinChartData: PriceDataPoint[] = bitcoinChartDataRaw ?? [];

  // Transform CoinInfo to MarketData for TokenMarketData component
  const bitcoinMarketData: MarketData | undefined = useMemo(() => {
    if (!bitcoinCoinInfo) return undefined;
    return coinInfoToMarketData(bitcoinCoinInfo);
  }, [bitcoinCoinInfo]);

  const bitcoinToken = useMemo(
    () => buildBitcoinToken(bitcoinCoinInfo, nativeAmount, usdTotal),
    [bitcoinCoinInfo, nativeAmount, usdTotal]
  );

  // Selected token chart + coin info via shared React Query hook.
  // Tokens without a coingeckoId fall back to the contract-address chart
  // endpoint via their mint (handled inside the hook/service).
  const selectedTokenCoinId = selectedToken?.coingeckoId ?? undefined;
  const {
    coinInfo: selectedTokenCoinInfo,
    chartData: selectedTokenChartDataRaw,
    infoLoading: selectedTokenInfoLoading,
    chartLoading: selectedTokenChartLoading,
    chartPending: selectedTokenChartPending,
    error: selectedTokenError,
  } = useCoinMarketData({
    coinId: selectedTokenCoinId,
    contractAddress: selectedToken?.address,
    currency,
    days: PERIOD_TO_DAYS[selectedTokenChartPeriod],
    enabled: !!selectedToken && currentPage === 'tokenDetail',
  });
  const selectedTokenChartData: PriceDataPoint[] = selectedTokenChartDataRaw ?? [];
  const selectedTokenMarketData: MarketData | undefined = useMemo(
    () => (selectedTokenCoinInfo ? coinInfoToMarketData(selectedTokenCoinInfo) : undefined),
    [selectedTokenCoinInfo]
  );

  const accountName = activeAccount?.name || t('home.unnamed_account', 'Account');

  // Build panel registry for SettingsPanelStack
  const panelRegistry: PanelRegistry = useMemo(
    () => ({
      avatar: ({ onBack }) => {
        if (!activeAccount) return null;
        return (
          <AccountAvatarPanel
            currentAvatarUrl={activeAccount.avatar}
            account={activeAccount}
            onSave={async (avatarUrl: string) => {
              await actions.editAccount(activeAccount.id, { avatar: avatarUrl });
              onBack();
            }}
            onBack={onBack}
          />
        );
      },
      backup: ({ onBack }) => <BackupPanel onBack={onBack} />,
      privateKey: ({ onBack }) => <PrivateKeyPanel onBack={onBack} />,
      currency: ({ onBack }) => {
        return (
          <CurrencySelector
            currencies={CURRENCY_ITEMS}
            activeCurrencyCode={currency}
            onSelectCurrency={(code) => {
              changeCurrency(code as CurrencyCode);
            }}
            onBack={onBack}
          />
        );
      },
      appearance: ({ onBack }) => (
        <AppearanceSelector
          activePreference={appearancePreference}
          onSelectPreference={(pref: AppearancePreference) => {
            void setAppearancePreference(pref);
          }}
          onBack={onBack}
        />
      ),
      about: ({ onBack }) => <AboutPanel onBack={onBack} />,
      support: ({ onBack }) => (
        <SupportSelector
          options={SUPPORT_OPTIONS}
          onOpenLink={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
          onBack={onBack}
        />
      ),
      language: ({ onBack }) => {
        return (
          <LanguageSelector
            languages={toLanguageItems(availableLanguages)}
            activeLanguageCode={currentLanguage}
            onSelectLanguage={(code) => {
              void changeLanguage(code as LanguageCode);
            }}
            onBack={onBack}
          />
        );
      },
      explorer: ({ onBack }) => {
        return (
          <ExplorerSelector
            explorers={toExplorerItems(explorers)}
            activeExplorerName={explorer?.name || ''}
            onSelectExplorer={(key) => {
              changeExplorer(key);
            }}
            onBack={onBack}
            loading={explorerLoading}
          />
        );
      },
      addressBook: ({ onBack, onNavigate }) => (
        <AddressBookPanel
          contacts={addressBookItems}
          activeNetworkId={networkId || 'solana-mainnet'}
          onAddContact={() => {
            setAddressBookWriteErrorKey(null);
            onNavigate('address-book-add');
          }}
          onEditContact={(contact) => {
            setAddressBookWriteErrorKey(null);
            setEditingContact(contact);
            onNavigate('address-book-edit');
          }}
          onRemoveContact={async (address) => {
            await removeContact(address);
          }}
          onBack={onBack}
          error={addressBookError}
          onRetry={reloadAddressBook}
        />
      ),
      'address-book-add': ({ onBack }) => {
        const activeNet = allNetworks.find((n) => n.id === networkId) || allNetworks[0];
        const blockchain = (networkId || 'solana-mainnet').split('-')[0];
        return (
          <AddressAddPanel
            activeNetworkId={activeNet?.id || 'solana-mainnet'}
            activeNetworkName={activeNet?.name || 'Solana Mainnet'}
            activeBlockchain={blockchain}
            onSave={async (input: AddressInput) => {
              setAddressBookWriteErrorKey(null);
              try {
                await addContact(input);
              } catch (err) {
                setAddressBookWriteErrorKey(
                  err instanceof AddressbookError && err.kind === 'resolve'
                    ? 'settings.addressbook.resolve_failed'
                    : 'settings.addressbook.save_failed'
                );
              }
            }}
            onBack={onBack}
            errorText={addressBookWriteErrorKey ? t(addressBookWriteErrorKey) : undefined}
          />
        );
      },
      'address-book-edit': ({ onBack }) => {
        if (!editingContact) return null;
        const blockchain = (editingContact.networkId || 'solana-mainnet').split('-')[0];
        return (
          <AddressEditPanel
            contact={editingContact}
            activeBlockchain={blockchain}
            onSave={async (originalAddress: string, input: AddressInput) => {
              setAddressBookWriteErrorKey(null);
              try {
                await editAddressBookContact(originalAddress, input);
                setEditingContact(null);
              } catch (err) {
                setAddressBookWriteErrorKey(
                  err instanceof AddressbookError && err.kind === 'resolve'
                    ? 'settings.addressbook.resolve_failed'
                    : 'settings.addressbook.save_failed'
                );
              }
            }}
            onBack={onBack}
            errorText={addressBookWriteErrorKey ? t(addressBookWriteErrorKey) : undefined}
          />
        );
      },
      trustedApps: ({ onBack }) => {
        return (
          <TrustedAppsSelector
            apps={toTrustedAppItems(activeTrustedApps)}
            onRevokeApp={(domain) => {
              actions.removeTrustedApp(domain);
            }}
            onBack={onBack}
          />
        );
      },
      security: ({ onBack, onNavigate }) => (
        <SecurityPanel
          onBack={onBack}
          onNavigate={onNavigate}
          onPasswordChanged={clearSessionKey}
        />
      ),
      accounts: ({ onBack, onNavigate }) => (
        <AccountsPanel
          accounts={accounts}
          activeAccountId={accountId || ''}
          onSelectAccount={(id) => actions.changeAccount(id)}
          onEditAccount={(id) => {
            setEditingAccountId(id);
            onNavigate('account-edit', { accountId: id });
          }}
          onDeleteAccount={(id) => actions.removeAccount(id)}
          onAddAccount={() => onNavigate('account-add')}
          onBack={onBack}
        />
      ),
      'account-edit': ({ onBack, onNavigate, ...props }) => {
        const targetId = (props.accountId as string) || editingAccountId || accountId || '';
        const account = accounts.find((a) => a.id === targetId) || activeAccount;
        if (!account) return null;
        return (
          <AccountEditPanel
            account={account}
            onEditName={() => {
              setEditingAccountId(account.id);
              onNavigate('account-name', { accountId: account.id });
            }}
            onEditAvatar={() => onNavigate('avatar')}
            onBackupSeed={() => onNavigate('backup')}
            onExportPrivateKey={() => onNavigate('privateKey')}
            onBack={onBack}
          />
        );
      },
      'account-name': ({ onBack, ...props }) => {
        const targetId = (props.accountId as string) || editingAccountId || accountId || '';
        const account = accounts.find((a) => a.id === targetId) || activeAccount;
        if (!account) return null;
        return (
          <AccountNamePanel
            currentName={account.name}
            onSave={async (name: string) => {
              await actions.editAccount(account.id, { name });
              onBack();
            }}
            onBack={onBack}
          />
        );
      },
      'account-add': ({ onBack, onWait, onClose, ...props }) => (
        <AccountAddPanel
          // `returnTo` lands the finished flow back on Wallets with the new
          // wallet already active; the panel closes settings itself.
          onComplete={() => {
            if (props.returnTo === 'wallets') setCurrentPage('wallets');
          }}
          onBack={onBack}
          onWait={onWait}
          onCloseSettings={onClose}
        />
      ),
    }),
    [
      currency,
      changeCurrency,
      appearancePreference,
      setAppearancePreference,
      availableLanguages,
      currentLanguage,
      changeLanguage,
      explorers,
      explorer,
      changeExplorer,
      explorerLoading,
      addressBookItems,
      networkId,
      allNetworks,
      addContact,
      editAddressBookContact,
      removeContact,
      addressBookError,
      reloadAddressBook,
      addressBookWriteErrorKey,
      t,
      editingContact,
      activeTrustedApps,
      actions,
      editingAccountId,
      accountId,
      accounts,
      activeAccount,
    ]
  );

  // What the four choosable rows currently read. Proper nouns and a currency
  // code — identical in both languages, so the list states the user's own
  // choice without inventing copy (mobile's `settings/index.tsx`).
  const rowValues = useMemo(
    () =>
      settingsRowValues({
        language: currentLanguage,
        currency,
        explorerName: explorer?.name,
        appearance: appearancePreference,
        appearanceLabels: {
          system: t('settings.appearance_options.system', 'System'),
          light: t('settings.appearance_options.light', 'Light'),
          dark: t('settings.appearance_options.dark', 'Dark'),
        },
      }),
    [currentLanguage, currency, explorer, appearancePreference, t]
  );

  // Reset initialPanels after settings closes
  const handleSettingsClose = useCallback(() => {
    setSettingsVisible(false);
    setSettingsInitialPanels(undefined);
  }, []);

  // Every screen over Home enters from the right and leaves to the right
  // (owner, 2026-09-02) — mobile's stack does it natively; here `SlideStack`
  // reads the page swap as a push (depth 1 over Home's 0) or a pop.
  const renderPage = (): React.ReactElement => {
    switch (currentPage) {
      case 'tokenDetail':
        if (selectedToken) {
          return (
            <TokenDetailPage
              token={selectedToken}
              blockchain={currentChain}
              chartData={selectedTokenChartData}
              chartPeriod={selectedTokenChartPeriod}
              onChartPeriodChange={handleSelectedTokenChartPeriodChange}
              coinInfo={selectedTokenCoinInfo}
              marketData={selectedTokenMarketData}
              chartLoading={selectedTokenChartLoading && selectedTokenChartData.length === 0}
              chartPending={selectedTokenChartPending}
              infoLoading={selectedTokenInfoLoading && !selectedTokenCoinInfo}
              chartError={!!selectedTokenError && selectedTokenChartData.length === 0}
              onBack={handleTokenDetailBack}
            />
          );
        }
        return (
          <PlaceholderPage
            title={t('token.detail.title', 'Token Information')}
            onBack={handleBack}
          />
        );
      case 'nftDetail':
        if (selectedNft) {
          return (
            <NftDetailPage
              nft={selectedNft}
              onBack={handleNftDetailBack}
              onSendPress={handleNftSendPress}
              onBurnPress={handleNftBurnPress}
              actionsUnavailable={isWatchOnly}
              burnStep={
                nftFlow.successKind === 'burn' ? 'success' : burnReviewOpen ? 'review' : 'idle'
              }
              burnPreview={nftFlow.burnPreview}
              burnPreparing={nftFlow.burnPreparing}
              burnSettling={nftFlow.successSettling}
              burnError={nftFlow.burnError}
              onBurnBack={handleNftBurnBack}
              onBurnConfirm={() => void nftFlow.confirmBurn()}
              burnSuccessExplorerUrl={nftFlow.explorerUrl}
              onBurnSuccessContinue={handleNftBurnSuccessContinue}
            />
          );
        }
        return <PlaceholderPage title={t('nft.detail.title', 'NFT Detail')} onBack={handleBack} />;
      case 'send': {
        // A collectible is signed by the account that owns it.
        const sendAccount = sendNft ? collectibleSolanaAccount : activeBlockchainAccount;
        if (!sendAccount) {
          return <PlaceholderPage title={t('token.action.send', 'Send')} onBack={handleSendBack} />;
        }
        return (
          <SendPage
            tokens={formattedTokens as SendToken[]}
            blockchain={currentChain}
            networkId={networkId as NetworkId | null}
            account={sendAccount}
            nft={sendNft}
            onBack={handleSendBack}
            onSuccess={handleSendSuccess}
            loading={balanceState === 'loading'}
            onFlowLockChange={setFlowLocked}
          />
        );
      }
      case 'wallets':
        return (
          <WalletsScreen
            onBack={handleBack}
            onRename={handleRenameAccount}
            onAddWallet={handleAddAccount}
            onRescan={(id) => void derivedAccounts.rescan(id)}
            scanningAccountId={derivedAccounts.scanningAccountId}
            showUnverifiedTokens={showUnverifiedTokens}
          />
        );
      case 'activity':
        return (
          <TransactionHistoryPage
            onBack={handleActivityBack}
            transactions={transactions}
            loading={transactionsLoading}
            loadingMore={transactionsLoadingMore}
            hasMore={transactionsHasMore}
            onLoadMore={transactionsLoadMore}
            hiddenBalance={hiddenBalance}
            error={transactionsError}
            onRetry={transactionsRefresh}
            networkId={networkId}
            contacts={contactsByAddress}
          />
        );
      default:
        return <PlaceholderPage title={t('general.page', 'Page')} onBack={handleBack} />;
    }
  };

  const home = (
    <div data-testid="home-screen" style={containerStyle}>
      {/* The ground, mounted once behind every screen: a depth ramp darkening
          toward the abyss, the scales over it, and the bottom fade that ends
          on the ramp's own floor. */}
      <DepthBackground style={{ zIndex: 0 }} />
      <ScalesBackground variant="deepField" style={{ zIndex: 0 }} />
      <div style={bottomFadeStyle} />

      <div style={screenStyle}>
        {/* The identity line. It is the screen's first child in flow — it owns
            its top padding and nothing scrolls behind it. Settings and the
            wallet switcher can change the account or the network, which remounts
            the flow, so both are withheld while a signed transaction is still
            being reported. */}
        <div style={{ paddingTop: spacing.panelTop + spacing.screenTop }}>
          <WalletHeader
            // Surfaces WITH the content, as its sibling: the header's own
            // chrome-scale float plays at the same moment as the screen's,
            // never nested inside it.
            key={surfaceKey}
            accountName={accountName}
            address={accountAddress}
            networkId={currentNetworkId}
            onCopyAddress={handleCopyAddress}
            onSettingsPress={flowLocked ? undefined : handleSettingsPress}
            onWalletPress={flowLocked ? undefined : handleWalletPress}
            avatarUrl={activeAccount?.avatar}
            accountId={activeAccount?.id}
          />
        </div>

        {/* The balance, the sub-tabs and the content are CONTENT, not chrome:
            when a task engages the shell they leave with the verb at full depth
            (the chrome's half depth is the header row's business). A keyed
            `SinkFloat` is the mechanism, so a task hand-back and a surfacing
            both play sink → beat → float on this one wrapper. */}
        {!isTaskEngaged && (
          <SinkFloat
            key={surfaceKey}
            transitionKey={`${surfaceKey}`}
            testID="home-content"
            style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            {/* Fixed on both sub-tabs, and mounted under ONE parent so the row
                is the same instance across a switch: `UnderlineTabs` only
                slides its underline if it is not remounted. */}
            <div style={pinnedHeaderStyle}>
              <BalanceHeader
                testID="balance-header"
                blockchains={blockchainBalances}
                hiddenBalance={hiddenBalance}
                onToggleVisibility={toggleHidden}
                onBlockchainChange={handleBlockchainChange}
                activeIndex={activeBlockchainIndex}
                onSendPress={handleSendPress}
                onReceivePress={handleReceivePress}
                onActivityPress={handleActivityPress}
                sendDisabled={isWatchOnly}
              />
              <div style={pinnedSubTabsStyle}>
                <PortfolioSubTabs
                  testID="home-sub-tabs"
                  tabs={subTabs}
                  activeKey={effectiveSubTab}
                  onChange={handleSubTabChange}
                  onOrderPress={handleOrderPress}
                  // A reorder swaps the tabs on the verb — old arrangement
                  // sinks, new one floats — while the order button beside them
                  // holds still. Keyed by the arrangement, so a tab switch never
                  // remounts them.
                  tabsKey={subTabsKey}
                />
              </div>
            </div>

            {/* The content region plays the verb on a sub-tab change: the
                outgoing list sinks, the incoming one floats. Keyed by sub-tab,
                the same mechanism the chain swap uses; the block above it holds
                still (rule four). */}
            <div style={contentRegionStyle}>
              <SinkFloat
                transitionKey={subTabHasPrior ? effectiveSubTab : 'home-subtab-content'}
                testID="home-subtab-content"
                style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
              >
                {effectiveSubTab === 'portfolio' ? (
                  // Keyed by chain so switching chains swaps the whole column
                  // with the sink and the float: the outgoing chain's content
                  // sinks as its light goes, the incoming one floats up into
                  // place. The frame above holds still; only the content travels.
                  <SinkFloat
                    transitionKey={chainHasPrior ? currentNetworkId : 'home-chain-content'}
                    testID="home-chain-content"
                    style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
                  >
                    <div style={scrollColumnStyle} onScroll={handleContentScroll}>
                      {/* Partial-load failure: keep whatever data loaded
                          visible. Only 'ready' carries data, so a total failure
                          is left to the list's own error state rather than told
                          "shown data may be incomplete". */}
                      {balanceError && balanceState === 'ready' && (
                        <div style={{ marginBottom: spacing.xl }} data-testid="balance-load-error">
                          <WarningNotice
                            tone="warning"
                            title={t(
                              'wallet.partial_load_error',
                              "Some balances couldn't be loaded. Shown data may be incomplete."
                            )}
                          />
                        </div>
                      )}

                      {currentChain === 'bitcoin' ? (
                        // Bitcoin lives inside Portfolio with chart, market data
                        // and about — it has no asset-detail screen of its own.
                        <TokenDetailContent
                          token={hasData ? bitcoinToken : undefined}
                          blockchain="bitcoin"
                          hiddenBalance={hiddenBalance}
                          chartData={bitcoinChartData}
                          chartPeriod={bitcoinChartPeriod}
                          onChartPeriodChange={setBitcoinChartPeriod}
                          chartLoading={bitcoinChartLoading && bitcoinChartData.length === 0}
                          chartPending={bitcoinChartPending}
                          chartError={!!bitcoinDataError && bitcoinChartData.length === 0}
                          coinInfo={bitcoinCoinInfo}
                          marketData={bitcoinMarketData}
                          infoLoading={bitcoinInfoLoading && !bitcoinCoinInfo}
                          bleed={spacing.screenGutter}
                        />
                      ) : balanceState === 'loading' || formattedTokens.length > 0 ? (
                        <TokenList
                          tokens={formattedTokens}
                          loading={balanceState === 'loading'}
                          onTokenPress={handleTokenPress}
                          hiddenBalance={hiddenBalance}
                          blockchain={getBlockchainFromNetworkId(currentNetworkId)}
                        />
                      ) : balanceState === 'error' ? (
                        /* A failed load with nothing cached is an error state,
                           never "No tokens found" and never an endless skeleton
                           — PRODUCT.md keeps those answers distinct. */
                        <StateBlock
                          tone="error"
                          testID="token-list-error"
                          retryTestID="token-list-retry-button"
                          title={t(
                            'wallet.tokens_load_error',
                            "Your tokens couldn't be loaded right now."
                          )}
                          onRetry={refresh}
                          retryLabel={t('actions.retry', 'Retry')}
                        />
                      ) : (
                        <StateBlock
                          tone="empty"
                          title={t('wallet.no_tokens_found', 'No tokens found')}
                          body={t(
                            'wallet.tokens_empty_subtitle',
                            'Your tokens will appear here once you receive some'
                          )}
                        />
                      )}
                    </div>
                  </SinkFloat>
                ) : (
                  // NFTs: the grid owns the only scroller in the content
                  // region, and everything above it is the same fixed block
                  // Portfolio shows.
                  <NftsTab
                    onNftPress={handleNftDetailPress}
                    includeSpam={showUnverifiedTokens}
                    onScroll={handleContentScroll}
                    contentStyle={{
                      paddingLeft: spacing.screenGutter,
                      paddingRight: spacing.screenGutter,
                      paddingBottom: spacing['2xl'],
                    }}
                  />
                )}
              </SinkFloat>

              {/* The seam between the fixed row above and whatever scrolls
                  under it, faded in off that region's own offset. */}
              <div ref={seamFadeRef} style={topSeamFadeStyle} />
            </div>
          </SinkFloat>
        )}
      </div>

      {/* The sub-tab arrangement. It applies live: the row above re-flows as
          rows are dropped, and there is nothing to save. */}
      <HomeTabOrderSheet
        visible={orderSheetVisible}
        onClose={handleOrderSheetClose}
        tabs={subTabs}
        onOrderChange={setSubTabOrder}
      />

      {/* The question the derived-account scan raises, asked over Home and
          nowhere else: the scan belongs to the unlocked session, so its answer
          is taken on the first screen the session lands on. */}
      <DerivedAccountsSheet
        visible={derivedAccounts.sheetVisible}
        finds={derivedAccounts.finds}
        onImport={(indexes: number[]) => void derivedAccounts.importFinds(indexes)}
        onDismiss={() => void derivedAccounts.dismiss()}
      />

      {/* Settings Panel Stack */}
      <SettingsPanelStack
        visible={settingsVisible}
        onClose={handleSettingsClose}
        panelRegistry={panelRegistry}
        initialPanels={settingsInitialPanels}
        analyticsEnabled={analyticsConsent}
        onAnalyticsToggle={setAnalyticsConsent}
        onRemoveWallet={handleRemoveWallet}
        onRemoveAllWallets={handleRemoveAllWallets}
        rowValues={rowValues}
      />

      {/* Remove Current Wallet Confirmation Dialog */}
      <ConfirmDialog
        visible={removeWalletDialogVisible}
        onClose={() => setRemoveWalletDialogVisible(false)}
        title={t('settings.remove_wallet', 'Remove Wallet')}
        message={t(
          'settings.remove_wallet_description',
          'Are you sure you want to remove this wallet? Make sure you have backed up your recovery phrase before removing.'
        )}
        confirmText={t('actions.remove', 'Remove')}
        isDanger
        requirePassword
        validatePassword={validatePassword}
        onConfirm={confirmRemoveWallet}
      />

      {/* Remove All Wallets Confirmation Dialog */}
      <ConfirmDialog
        visible={removeAllWalletsDialogVisible}
        onClose={() => setRemoveAllWalletsDialogVisible(false)}
        title={t('settings.remove_all_wallets', 'Remove All Wallets')}
        message={t(
          'settings.remove_all_wallets_description',
          'This will remove ALL wallets from this device. This action cannot be undone. Make sure you have backed up all recovery phrases.'
        )}
        confirmText={t('actions.remove_all', 'Remove All')}
        isDanger
        onConfirm={confirmRemoveAllWallets}
      />

      {/* Receive Sheet */}
      <ReceiveSheet
        visible={receiveSheetVisible}
        onClose={() => setReceiveSheetVisible(false)}
        address={accountAddress}
        blockchain={currentChain}
        // Off mainnet the sheet names the environment under the code: a deposit
        // to a devnet address is not money (spec 026 D6).
        networkLabel={getNetworkLabel(currentNetworkId) ?? undefined}
      />
    </div>
  );

  return (
    <SlideStack
      screenKey={currentPage}
      depth={currentPage === 'home' ? 0 : 1}
      style={{ height: '100dvh' }}
      testID="home-stack"
    >
      {currentPage === 'home' ? home : renderPage()}
    </SlideStack>
  );
}

export default HomePage;
