import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
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
  colors,
  semantic,
  spacing,
  fontSize,
  borderRadius,
  fontFamily,
  type SettingsPanelEntry,
  type BlockchainBalance,
  type BlockchainId,
  type NetworkId,
  type PriceChartPeriod,
  type PriceDataPoint,
  type MarketData,
  type Token,
  type NftData,
  type NftBlockchain,
  type SendToken,
  type AddressBookItem,
  type NetworkAdapter,
  type AddressBookNetwork,
  type AddressInput,
  type BlockchainType,
  isSolanaNft,
  createBurnTransaction,
  classifyTransactionError,
  useCurrencyContext,
  LANGUAGE_NAMES,
  type LanguageCode,
  type ExplorerSelectorItem,
  type LanguageSelectorItem,
  type TrustedAppItem,
  SUPPORT_OPTIONS,
  SUPPORTED_CURRENCIES,
  CURRENCY_MAP,
  type CurrencyCode,
  type CurrencySelectorItem,
  getBlockchainFromNetworkId,
  BLOCKCHAIN_TO_COINGECKO,
  PERIOD_TO_DAYS,
  coinInfoToMarketData,
  useSettleAfterTx,
  usePrefetchBalances,
  useNftBurn,
} from '@salmon/shared';
import { isSignableSolanaAccount } from '@salmon/shared/utils/account';
import { sessionArea } from '../../utils/storageCompat';
import {
  WalletHeader,
  TextButton,
  WarningNotice,
  BalanceCardCarousel,
  ActionButtonRow,
  TokenList,
  TokenDetailContent,
  FadeThrough,
  TokenDetailPage,
  NftDetailPage,
  NftSeeAllPage,
  TransactionHistoryPage,
  ReceiveSheet,
  SettingsPanelStack,
  WalletSwitcherSheet,
  ConfirmDialog,
  DepthBackground,
  ScalesBackground,
  SendPage,
  NftSendDialog,
  ExplorerSelector,
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
  type PanelRegistry,
} from '../../components';
import IconButton from '@mui/material/IconButton';

// i18n
import { useLanguage } from '../../i18n';
import { clearSessionKey } from '../../utils/sessionKeyCache';

// Tab content pages
import { CollectiblesPage } from '../collectibles/CollectiblesPage';
import { SwapPage } from '../swap/SwapPage';

/**
 * Active tab within the main app view
 */
type ActiveTab = 'home' | 'collectibles' | 'swap';

// Persist activeTab across popup close/reopen. The MV3 popup unmounts on
// blur, so without persistence pressing the back arrow on an NFT detail
// can land the user on Home even though they came from Collectibles —
// because the popup remounts with the default tab between actions.
const ACTIVE_TAB_STORAGE_KEY = 'salmon.popup.activeTab';

const isActiveTab = (value: unknown): value is ActiveTab =>
  value === 'home' || value === 'collectibles' || value === 'swap';

/**
 * Available page views within HomePage
 */
type PageView = 'home' | 'tokenDetail' | 'nftDetail' | 'nftSeeAll' | 'activity' | 'send';

// Network ID → BlockchainId mapping for carousel theming
const NETWORK_TO_BLOCKCHAIN: Record<string, BlockchainId> = {
  'solana-mainnet': 'solana',
  'solana-devnet': 'solana-devnet',
  'bitcoin-mainnet': 'bitcoin',
  'bitcoin-testnet': 'bitcoin-testnet',
  'ethereum-mainnet': 'ethereum',
  'ethereum-sepolia': 'ethereum-sepolia',
};

/**
 * Styled components for HomePage layout
 */
const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  backgroundColor: colors.background.primary,
});

/**
 * The single line that explains every refusal on this screen. Quiet on
 * purpose: it states why the controls are closed, it is not an alarm.
 */
const WatchOnlyNotice = styled(Box)({
  color: semantic.text.secondary,
  fontSize: fontSize.caption,
  textAlign: 'center',
  marginTop: `-${spacing.lg}px`,
  marginBottom: `${spacing['2xl']}px`,
  paddingLeft: `${spacing.lg}px`,
  paddingRight: `${spacing.lg}px`,
  position: 'relative',
  zIndex: 1,
});

const Main = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  position: 'relative',
});

const BottomFadeGradient = styled(Box)({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  height: 180,
  // Ends on the depth ramp's own floor. Fading to the old flat ground would
  // have lightened the abyss the ramp just arrived at.
  background: `linear-gradient(to bottom, transparent 0%, ${semantic.water.gradient[1]} 60%)`,
  pointerEvents: 'none',
  zIndex: 1,
});

const TabContent = styled(Box)({
  position: 'relative',
  zIndex: 2,
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
});

const TokenSectionWrapper = styled(Box)({
  flex: 1,
  minHeight: 0,
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
});

const TokenSection = styled(Box)({
  flex: 1,
  minHeight: 0,
  padding: `0 ${spacing.lg}px ${spacing.lg}px`,
  overflowY: 'auto',
});

const BottomListFade = styled(Box)({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  height: 30,
  background: `linear-gradient(to top, ${colors.background.primary}, transparent)`,
  pointerEvents: 'none',
  zIndex: 3,
  opacity: 0,
  transition: 'opacity 0.15s ease',
});

const TopListFade = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 30,
  background: `linear-gradient(to bottom, ${colors.background.primary}, transparent)`,
  pointerEvents: 'none',
  zIndex: 3,
  opacity: 0,
  transition: 'opacity 0.15s ease',
});

const EmptyState = styled(Box)({
  padding: `${spacing.xl}px ${spacing.lg}px`,
  textAlign: 'center',
  backgroundColor: colors.background.card,
  borderRadius: borderRadius.lg,
});

const EmptyStateText = styled(Typography)({
  fontSize: fontSize.base,
  fontWeight: 500,
  color: colors.text.secondary,
  marginBottom: spacing.sm,
});

const EmptyStateSubtext = styled(Typography)({
  fontSize: fontSize.sm,
  color: colors.text.disabled,
});

const TabBar = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  borderBottom: `1px solid ${colors.border.default}`,
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
});

const TabButton = styled('button', {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>(({ active }) => ({
  flex: 1,
  padding: `${spacing.md}px 0`,
  background: 'none',
  border: 'none',
  // The scarcity rule governs *fills*, not ink: four salmon fills on a screen
  // means no fill is primary, which is the failure it exists to prevent. A 2px
  // rule is ink, so the active underline is salmon again (`accent.ink`,
  // 6.07:1 on the app ground) while the label stays `text.primary` at
  // 16.37:1 — the affordance keeps the contrast it gained and gets the warmth
  // back. Send keeps the screen's one and only salmon fill.
  borderBottom: active ? `2px solid ${semantic.accent.ink}` : '2px solid transparent',
  color: active ? colors.text.primary : colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontWeight: active ? 600 : 400,
  fontSize: fontSize.base,
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    color: colors.text.primary,
  },
  '&:disabled': {
    cursor: 'default',
    color: colors.text.disabled,
  },
}));

/**
 * Placeholder page for settings screens not yet fully implemented
 */
function PlaceholderPage({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Container>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: `${spacing.md}px ${spacing.lg}px`,
          borderBottom: `1px solid ${colors.border.default}`,
        }}
      >
        <IconButton onClick={onBack} sx={{ color: colors.text.secondary, mr: 1 }}>
          <Box component="span" sx={{ fontSize: fontSize.xl }}>
            &#8592;
          </Box>
        </IconButton>
        <Typography sx={{ fontSize: fontSize.lg, fontWeight: 600, color: colors.text.primary }}>
          {title}
        </Typography>
      </Box>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <Typography sx={{ color: colors.text.secondary }}>
          {t('common.coming_soon', 'Coming soon...')}
        </Typography>
      </Box>
    </Container>
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
  const {
    developerNetworks,
    toggleDeveloperNetworks,
    explorer,
    explorers,
    changeExplorer,
    isLoading: explorerLoading,
  } = userConfig;

  // Anonymous usage-analytics consent (opt-in). The first-run prompt now lives
  // in onboarding (analytics-consent step); here we only bind the Settings toggle.
  const { consent: analyticsConsent, setConsent: setAnalyticsConsent } = useAnalyticsConsent();

  // Language selection
  const { currentLanguage, supportedLanguages, setLanguage } = useLanguage();

  // Fetch backend RPC URLs and merge into network configs before balance fetch
  const { allNetworks: availableNetworks, networksReady } = useAvailableNetworks({
    activeBlockchainAccount: {
      network: {
        environment: (networkId || 'solana-mainnet') as 'solana-mainnet' | 'solana-devnet',
        blockchain: 'solana',
      },
    },
    developerNetworks,
  });

  // Active tab state. Hydrated from storage.session on mount so the popup
  // closing/reopening between an NFT detail tap and the back arrow does
  // not silently snap the user back to Home.
  const [activeTab, setActiveTabState] = useState<ActiveTab>('home');

  // True from the moment a send/swap is signed until its outcome has
  // been acknowledged. Before signing this stays false — backing out of a
  // review costs nothing and must stay easy.
  const [flowLocked, setFlowLocked] = useState(false);
  // True while swap is a *task* (review onward). The chrome around it offers
  // exits that do not know what step the user is on, so it stands down and the
  // flow's own back arrow is the only way out. This is presentation, not a
  // guard: `flowLocked` above still governs what is allowed once signed.
  const [flowIsTask, setFlowIsTask] = useState(false);

  useEffect(() => {
    let cancelled = false;
    sessionArea
      .get(ACTIVE_TAB_STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        const value = stored?.[ACTIVE_TAB_STORAGE_KEY];
        if (isActiveTab(value)) {
          setActiveTabState(value);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveTab = useCallback((tab: ActiveTab) => {
    setActiveTabState(tab);
    sessionArea.set({ [ACTIVE_TAB_STORAGE_KEY]: tab }).catch(() => {});
  }, []);

  const [activeBlockchainIndex, setActiveBlockchainIndex] = useState(0);

  // Current page view state for navigation
  const [currentPage, setCurrentPage] = useState<PageView>('home');

  // Sheet visibility state
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [walletSwitcherVisible, setWalletSwitcherVisible] = useState(false);
  const [receiveSheetVisible, setReceiveSheetVisible] = useState(false);

  // Settings panel stack state (for deep-linking from WalletSwitcher)
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
        const found = availableNetworks.find((n) => n.id === id);
        if (!found) return undefined;
        return {
          id: found.id,
          name: found.name,
          blockchain: found.id.split('-')[0] as BlockchainType,
        };
      },
      getNetworks: async (): Promise<AddressBookNetwork[]> =>
        availableNetworks.map((n) => ({
          id: n.id,
          name: n.name,
          blockchain: n.id.split('-')[0] as BlockchainType,
        })),
    }),
    [availableNetworks]
  );

  const [
    { contacts: addressBookContacts, error: addressBookError },
    { addContact, editContact: editAddressBookContact, removeContact, reload: reloadAddressBook },
  ] = useAddressbook({ networkAdapter: addressBookNetworkAdapter });
  // Inline error for address-book writes (translation key, rendered by the open panel)
  const [addressBookWriteErrorKey, setAddressBookWriteErrorKey] = useState<string | null>(null);

  const addressBookItems: AddressBookItem[] = useMemo(
    () =>
      addressBookContacts.map((c) => ({
        name: c.name,
        address: c.address,
        networkId: c.network.id,
        networkName: c.network.name,
        domain: c.domain,
      })),
    [addressBookContacts]
  );

  // NFT action dialog state
  const [nftSendDialogVisible, setNftSendDialogVisible] = useState(false);
  const [burnStep, setBurnStep] = useState<'idle' | 'review' | 'success'>('idle');
  const [burnPreview, setBurnPreview] = useState<Awaited<
    ReturnType<typeof createBurnTransaction>
  > | null>(null);
  const [burnLoading, setBurnLoading] = useState(false);
  const [burnError, setBurnError] = useState<string | null>(null);

  // Token detail page state
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedTokenChartPeriod, setSelectedTokenChartPeriod] = useState<PriceChartPeriod>('1M');

  // NFT detail page state
  // A watch-only wallet holds no key, so every flow that spends is closed to
  // it. The refusal is enforced in shared; this only keeps the UI honest.
  const isWatchOnly = isWatchOnlyAccount(activeAccount);

  // Switching to a watch-only wallet while standing on Swap would leave the
  // tab gone and its screen still mounted. Send the user home instead.
  useEffect(() => {
    if (isWatchOnly && activeTab === 'swap') setActiveTab('home');
  }, [isWatchOnly, activeTab, setActiveTab]);

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

  // NFT see-all page state
  const [seeAllData, setSeeAllData] = useState<{
    title: string;
    blockchain: NftBlockchain;
    nfts: NftData[];
  } | null>(null);
  const settleAfterTx = useSettleAfterTx();
  const nftBurn = useNftBurn({
    account: collectibleSolanaAccount ?? null,
    activeAccountId: activeAccount?.id,
  });

  // Bitcoin-specific state
  const [bitcoinChartPeriod, setBitcoinChartPeriod] = useState<PriceChartPeriod>('1M');

  // Filter networks to only include those the user has accounts for
  const allNetworks = useMemo(() => {
    if (!activeAccount?.networksAccounts) return availableNetworks;
    const userNetworkIds = Object.keys(activeAccount.networksAccounts);
    return availableNetworks.filter((network) => userNetworkIds.includes(network.id));
  }, [availableNetworks, activeAccount?.networksAccounts]);

  // Reset carousel index when network list changes (e.g. toggling dev mode off)
  useEffect(() => {
    if (activeBlockchainIndex >= allNetworks.length && allNetworks.length > 0) {
      setActiveBlockchainIndex(0);
      actions.changeNetwork(allNetworks[0].id);
    }
  }, [allNetworks, activeBlockchainIndex, actions]);

  // Sync carousel index with persisted networkId on mount / network change
  useEffect(() => {
    if (!networkId || allNetworks.length === 0) return;
    const idx = allNetworks.findIndex((n) => n.id === networkId);
    if (idx >= 0) {
      setActiveBlockchainIndex(idx);
    }
  }, [networkId, allNetworks]);

  // Fetch balance data for current network
  const {
    tokens,
    usdTotal,
    changePercent,
    changeAmount,
    refreshing,
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
    includeSpam: !!developerNetworks,
  });

  // Warm the chains the user is not looking at, so the first arrow press of the
  // session lands on a number instead of a skeleton. One request per inactive
  // chain per app load — see the hook for why it is not per switch.
  usePrefetchBalances({
    account: activeAccount,
    networkIds: allNetworks.map((network) => network.id as NetworkId),
    activeNetworkId: networkId as NetworkId | undefined,
    pathIndex: state.pathIndex,
    includeSpam: !!developerNetworks,
  });

  // RQ handles refetch-on-focus via QueryClient defaults (refetchOnWindowFocus).
  // dApp approval settlement is fired in App.tsx.

  // Fetch transaction history (only when on activity page)
  const accountAddress = activeBlockchainAccount?.getReceiveAddress() || '';
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

  const handleWalletPress = useCallback(() => {
    setWalletSwitcherVisible(true);
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

  const handleSelectAccount = useCallback(
    (targetAccountId: string) => {
      actions.changeAccount(targetAccountId);
      setWalletSwitcherVisible(false);
    },
    [actions]
  );

  const handleAddAccount = useCallback(() => {
    setWalletSwitcherVisible(false);
    setSettingsInitialPanels([{ screen: 'account-add' }]);
    setSettingsVisible(true);
  }, []);

  const handleEditAccount = useCallback((targetAccountId: string) => {
    setEditingAccountId(targetAccountId);
    setWalletSwitcherVisible(false);
    setSettingsInitialPanels([
      { screen: 'accounts' },
      { screen: 'account-edit', props: { accountId: targetAccountId } },
    ]);
    setSettingsVisible(true);
  }, []);

  const handleDeleteAccount = useCallback(
    async (targetAccountId: string) => {
      // The WalletSwitcherSheet already shows a confirmation dialog
      // and only calls this after user confirms, so we can directly remove
      await actions.removeAccount(targetAccountId);

      // If we deleted the active account, the hook will auto-switch
      // Close the wallet switcher sheet
      setWalletSwitcherVisible(false);
    },
    [actions]
  );

  const handleSendPress = useCallback(() => {
    setCurrentPage('send');
  }, []);

  const handleSendBack = useCallback(() => {
    setCurrentPage('home');
  }, []);

  const handleSendSuccess = useCallback(() => {
    setCurrentPage('home');
    refresh();
  }, [refresh]);

  const handleReceivePress = useCallback(() => {
    setReceiveSheetVisible(true);
  }, []);

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
    setBurnStep('idle');
    setBurnPreview(null);
    setBurnError(null);
    setBurnLoading(false);
    setCurrentPage('home');
    setSelectedNft(null);
  }, []);

  const handleSeeAllPress = useCallback(
    (data: { title: string; blockchain: NftBlockchain; nfts: NftData[] }) => {
      setSeeAllData(data);
      setCurrentPage('nftSeeAll');
    },
    []
  );

  const handleSeeAllBack = useCallback(() => {
    setCurrentPage('home');
    setSeeAllData(null);
  }, []);

  const handleSeeAllNftPress = useCallback((nft: NftData) => {
    setSelectedNft(nft);
    setCurrentPage('nftDetail');
  }, []);

  // NFT action handlers
  const handleNftSendPress = useCallback(() => {
    setNftSendDialogVisible(true);
  }, []);

  const handleNftBurnPress = useCallback(() => {
    if (!selectedNft || !isSolanaNft(selectedNft) || !collectibleSolanaAccount) return;

    setBurnStep('review');
    setBurnLoading(true);
    setBurnPreview(null);
    setBurnError(null);

    const ownerAddress = collectibleSolanaAccount.getReceiveAddress();
    const solAccount = collectibleSolanaAccount;
    createBurnTransaction({
      mintAddress: selectedNft.mint,
      ownerAddress,
    })
      .then(async (txResponse) => {
        setBurnPreview(txResponse);
        if (txResponse.lookupTable) {
          const balance = await solAccount.getCredit();
          if (balance < txResponse.lookupTable.estimatedRentLamports) {
            setBurnError('nft.burn.insufficientFeeSol');
          }
        }
      })
      .catch((error) => {
        setBurnError(classifyTransactionError(error));
      })
      .finally(() => {
        setBurnLoading(false);
      });
    // Other chains: burn is not supported (button won't be wired)
  }, [selectedNft, collectibleSolanaAccount]);

  const handleNftBurnBack = useCallback(() => {
    setBurnStep('idle');
    setBurnPreview(null);
    setBurnError(null);
    setBurnLoading(false);
  }, []);

  const confirmBurnNft = useCallback(async () => {
    if (!selectedNft || !isSolanaNft(selectedNft) || !collectibleSolanaAccount || !burnPreview)
      return;

    setBurnLoading(true);
    try {
      await nftBurn.burnNft(burnPreview, selectedNft.mint ?? undefined);
      setBurnStep('success');
    } catch (error) {
      console.error('[HomePage] NFT burn failed:', error);
      setBurnError(classifyTransactionError(error));
    } finally {
      setBurnLoading(false);
    }
  }, [selectedNft, collectibleSolanaAccount, burnPreview, nftBurn]);

  const handleNftBurnSuccessContinue = useCallback(() => {
    handleNftBurnBack();
    setCurrentPage('home');
    setSelectedNft(null);
  }, [handleNftBurnBack]);

  const handleSelectedTokenChartPeriodChange = useCallback((period: PriceChartPeriod) => {
    setSelectedTokenChartPeriod(period);
  }, []);

  // Scroll-driven fade refs for token list
  const topFadeRef = useRef<HTMLDivElement>(null);
  const bottomFadeRef = useRef<HTMLDivElement>(null);

  const handleTokenListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const atBottom = scrollHeight - scrollTop - clientHeight < 2;

    if (topFadeRef.current) {
      topFadeRef.current.style.opacity = String(Math.min(scrollTop / 30, 1));
    }
    if (bottomFadeRef.current) {
      bottomFadeRef.current.style.opacity = atBottom ? '0' : '1';
    }
  }, []);

  // Build blockchain balances array for carousel
  const blockchainBalances: BlockchainBalance[] = useMemo(() => {
    return allNetworks.map((network, _index) => {
      const blockchain = NETWORK_TO_BLOCKCHAIN[network.id] || 'solana';
      const isActiveNetwork = network.id === networkId;

      let balanceData: {
        usdTotal: number | undefined;
        changePercent: number | undefined;
        changeAmount: number | undefined;
        loading: boolean;
      };

      if (isActiveNetwork) {
        // Skeletons belong to the absence of data, never to a fetch in flight.
        // `refreshing` used to blank the hero on every focus and every return
        // to Home; the cache held the numbers the whole time.
        balanceData = {
          usdTotal,
          changePercent,
          changeAmount,
          loading: !hasData,
        };
      } else {
        balanceData = {
          usdTotal: undefined,
          changePercent: undefined,
          changeAmount: undefined,
          loading: false,
        };
      }

      return {
        network: { id: network.id, name: network.name, blockchain },
        ...balanceData,
      };
    });
  }, [allNetworks, networkId, hasData, usdTotal, changePercent, changeAmount]);

  // Handle blockchain change from carousel arrows
  const handleBlockchainChange = useCallback(
    (_blockchain: BlockchainId, index: number) => {
      setActiveBlockchainIndex(index);
      const selectedBalance = blockchainBalances[index];
      if (selectedBalance) {
        actions.changeNetwork(selectedBalance.network.id);
      }
    },
    [blockchainBalances, actions]
  );

  // Current blockchain for filtering logic
  const currentBlockchain = useMemo(() => {
    const active = blockchainBalances[activeBlockchainIndex];
    return active?.network.blockchain || 'solana';
  }, [activeBlockchainIndex, blockchainBalances]);

  // Transform tokens to match TokenList expected format, filtering spam in non-dev mode
  // BE handles spam/unknown filtering via the `includeSpam` query passed
  // to useBalance above. The FE just maps to the TokenList shape.
  const formattedTokens = useMemo(() => {
    return tokens.map((token) => ({
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      logo: token.logo ?? undefined,
      price: token.price,
      uiAmount: token.uiAmount,
      usdBalance: token.usdBalance,
      last24HoursChange:
        token.priceChange24h !== undefined ? { perc: token.priceChange24h } : undefined,
      tags: token.tags,
      coingeckoId: token.coingeckoId,
      decimals: token.decimals,
    }));
  }, [tokens]);

  // Bitcoin coin info + chart via shared React Query hook
  const bitcoinCoinId =
    currentBlockchain === 'bitcoin' ? BLOCKCHAIN_TO_COINGECKO[currentBlockchain] : undefined;
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
    enabled: currentBlockchain === 'bitcoin',
  });
  const bitcoinChartData: PriceDataPoint[] = bitcoinChartDataRaw ?? [];

  // Transform CoinInfo to MarketData for TokenMarketData component
  const bitcoinMarketData: MarketData | undefined = useMemo(() => {
    if (!bitcoinCoinInfo) return undefined;
    return coinInfoToMarketData(bitcoinCoinInfo);
  }, [bitcoinCoinInfo]);

  // Create Bitcoin token for display
  const bitcoinToken: Token | undefined = useMemo(() => {
    if (!bitcoinCoinInfo?.marketData) return undefined;
    const md = bitcoinCoinInfo.marketData;
    return {
      address: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png',
      price: md.currentPrice,
      uiAmount: 0,
      usdBalance: 0,
      last24HoursChange: md.priceChangePercentage24h
        ? { perc: md.priceChangePercentage24h, abs: md.priceChange24h }
        : null,
      isVerified: true,
    };
  }, [bitcoinCoinInfo]);

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
      avatar: ({ onBack }) => <AccountAvatarPanel onBack={onBack} />,
      backup: ({ onBack }) => <BackupPanel onBack={onBack} />,
      privateKey: ({ onBack }) => <PrivateKeyPanel onBack={onBack} />,
      currency: ({ onBack }) => {
        const currencyItems: CurrencySelectorItem[] = SUPPORTED_CURRENCIES.map((code) => ({
          code,
          name: CURRENCY_MAP[code].name,
          symbol: CURRENCY_MAP[code].symbol,
        }));
        return (
          <CurrencySelector
            currencies={currencyItems}
            activeCurrencyCode={currency}
            onSelectCurrency={(code) => {
              changeCurrency(code as CurrencyCode);
            }}
            onBack={onBack}
          />
        );
      },
      about: ({ onBack }) => <AboutPanel onBack={onBack} />,
      support: ({ onBack }) => (
        <SupportSelector
          options={SUPPORT_OPTIONS}
          onOpenLink={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
          onBack={onBack}
        />
      ),
      language: ({ onBack }) => {
        const languageItems: LanguageSelectorItem[] = supportedLanguages.map((lang) => ({
          code: lang,
          nativeName: LANGUAGE_NAMES[lang as LanguageCode] || lang,
        }));
        return (
          <LanguageSelector
            languages={languageItems}
            activeLanguageCode={currentLanguage}
            onSelectLanguage={(code) => {
              setLanguage(code as LanguageCode);
            }}
            onBack={onBack}
          />
        );
      },
      explorer: ({ onBack }) => {
        const explorerItems: ExplorerSelectorItem[] = explorers.map((e) => ({
          key: e.key,
          name: e.name,
        }));
        return (
          <ExplorerSelector
            explorers={explorerItems}
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
        const trustedAppItems: TrustedAppItem[] = Object.entries(activeTrustedApps || {}).map(
          ([domain, app]) => ({
            domain,
            name: app.name,
            icon: app.icon,
          })
        );
        return (
          <TrustedAppsSelector
            apps={trustedAppItems}
            onRevokeApp={(domain) => {
              actions.removeTrustedApp(domain);
            }}
            onBack={onBack}
          />
        );
      },
      security: ({ onBack }) => (
        <SecurityPanel onBack={onBack} onPasswordChanged={clearSessionKey} />
      ),
      accounts: ({ onBack, onNavigate }) => (
        <AccountsPanel
          onBack={onBack}
          onEditAccount={(id) => {
            setEditingAccountId(id);
            onNavigate('account-edit', { accountId: id });
          }}
          onAddAccount={() => onNavigate('account-add')}
        />
      ),
      'account-edit': ({ onBack, onNavigate, ...props }) => (
        <AccountEditPanel
          accountId={(props.accountId as string) || editingAccountId || accountId || ''}
          onEditName={(id) => {
            setEditingAccountId(id);
            onNavigate('account-name', { accountId: id });
          }}
          onEditAvatar={() => onNavigate('avatar')}
          onBackupSeed={() => onNavigate('backup')}
          onExportPrivateKey={() => onNavigate('privateKey')}
          onBack={onBack}
        />
      ),
      'account-name': ({ onBack, ...props }) => (
        <AccountNamePanel
          accountId={(props.accountId as string) || editingAccountId || accountId || ''}
          onBack={onBack}
        />
      ),
      'account-add': ({ onBack, onWait, onClose }) => (
        <AccountAddPanel
          onComplete={onBack}
          onBack={onBack}
          onWait={onWait}
          onCloseSettings={onClose}
        />
      ),
    }),
    [
      currency,
      changeCurrency,
      supportedLanguages,
      currentLanguage,
      setLanguage,
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
    ]
  );

  // Reset initialPanels after settings closes
  const handleSettingsClose = useCallback(() => {
    setSettingsVisible(false);
    setSettingsInitialPanels(undefined);
  }, []);

  // Render settings pages based on current page view
  if (currentPage !== 'home') {
    switch (currentPage) {
      case 'tokenDetail':
        if (selectedToken) {
          return (
            <TokenDetailPage
              token={selectedToken}
              blockchain={getBlockchainFromNetworkId(currentBlockchain)}
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
            <>
              <NftDetailPage
                nft={selectedNft}
                onBack={handleNftDetailBack}
                onSendPress={handleNftSendPress}
                onBurnPress={handleNftBurnPress}
                actionsUnavailable={isWatchOnly}
                burnStep={burnStep}
                burnPreview={burnPreview}
                burnPreparing={burnLoading}
                burnSettling={nftBurn.settling}
                burnError={burnError}
                onBurnBack={handleNftBurnBack}
                onBurnConfirm={confirmBurnNft}
                onBurnSuccessContinue={handleNftBurnSuccessContinue}
              />

              {/* NFT Send Dialog */}
              <NftSendDialog
                visible={nftSendDialogVisible}
                onClose={() => setNftSendDialogVisible(false)}
                nft={selectedNft}
                account={collectibleSolanaAccount}
                onSuccess={() => {
                  setNftSendDialogVisible(false);
                  setCurrentPage('home');
                  setSelectedNft(null);
                  settleAfterTx({
                    accountId: collectibleSolanaAccount?.getReceiveAddress(),
                    avatarAccountId: activeAccount?.id,
                    networkId: collectibleSolanaAccount?.getNetworkId(),
                    kinds: ['balance', 'transactions', 'nfts', 'avatar-nfts'],
                  }).catch((err) => {
                    console.warn('[HomePage] settleAfterTx failed:', err);
                  });
                }}
              />
            </>
          );
        }
        return <PlaceholderPage title={t('nft.detail.title', 'NFT Detail')} onBack={handleBack} />;
      case 'nftSeeAll':
        if (seeAllData) {
          return (
            <NftSeeAllPage
              title={seeAllData.title}
              blockchain={seeAllData.blockchain}
              nfts={seeAllData.nfts}
              onNftPress={handleSeeAllNftPress}
              onBack={handleSeeAllBack}
            />
          );
        }
        return (
          <PlaceholderPage title={t('wallet.my_nfts', 'My Collectibles')} onBack={handleBack} />
        );
      case 'send':
        if (!activeBlockchainAccount) {
          return <PlaceholderPage title={t('token.action.send', 'Send')} onBack={handleSendBack} />;
        }
        return (
          <SendPage
            tokens={formattedTokens as SendToken[]}
            blockchain={getBlockchainFromNetworkId(currentBlockchain)}
            account={activeBlockchainAccount}
            onBack={handleSendBack}
            onSuccess={handleSendSuccess}
            onFlowLockChange={setFlowLocked}
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
            developerMode={developerNetworks}
          />
        );
      default:
        return <PlaceholderPage title={t('general.page', 'Page')} onBack={handleBack} />;
    }
  }

  return (
    <Container data-testid="home-screen">
      {/* Header. Settings and the wallet switcher can change the account or
          the network, which remounts the flow — both are withheld while a
          signed transaction is still being reported. */}
      {!flowIsTask && (
        <WalletHeader
          accountName={accountName}
          address={accountAddress}
          onCopyAddress={handleCopyAddress}
          onSettingsPress={flowLocked ? undefined : handleSettingsPress}
          onRefreshPress={refresh}
          refreshing={refreshing}
          onWalletPress={flowLocked ? undefined : handleWalletPress}
          avatarUrl={activeAccount?.avatar}
          accountId={activeAccount?.id}
        />
      )}

      {/* Tab Bar — inert while a signed transaction is being reported, since a
          stray tab tap is the cheapest way to lose the only outcome report. */}
      {!flowIsTask && (
        <TabBar>
          <TabButton
            active={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
            disabled={flowLocked}
            data-testid="tab-home"
          >
            {t('tabs.home', 'Home')}
          </TabButton>
          <TabButton
            active={activeTab === 'collectibles'}
            onClick={() => setActiveTab('collectibles')}
            disabled={flowLocked}
            data-testid="tab-collectibles"
          >
            {t('tabs.collectibles', 'Collectibles')}
          </TabButton>
          {/* Gone, not greyed: a watch-only wallet can never swap,
              so the tab is not a door that happens to be locked. */}
          {!isWatchOnly && (
            <TabButton
              active={activeTab === 'swap'}
              onClick={() => setActiveTab('swap')}
              disabled={flowLocked}
              data-testid="tab-swap"
            >
              {t('tabs.swap', 'Swap')}
            </TabButton>
          )}
        </TabBar>
      )}

      <Main>
        {/* Background layers — shared across all three tabs */}
        {/* The water column: a depth ramp darkening toward the abyss, plus the
            marine snow the deep field's 3.2x scales are read through. Both are
            spent before the token list. */}
        <DepthBackground style={{ zIndex: 0 }} />
        <ScalesBackground variant="deepField" style={{ zIndex: 0 }} />
        <BottomFadeGradient />

        <TabContent>
          {activeTab === 'home' && (
            <>
              {/* Balance Card Carousel */}
              <BalanceCardCarousel
                blockchains={blockchainBalances}
                hiddenBalance={hiddenBalance}
                onToggleVisibility={toggleHidden}
                onBlockchainChange={handleBlockchainChange}
                activeIndex={activeBlockchainIndex}
                showNetworkLabel={developerNetworks}
              />

              {/* Action Buttons */}
              <ActionButtonRow
                onSendPress={handleSendPress}
                onReceivePress={handleReceivePress}
                onActivityPress={handleActivityPress}
                sendDisabled={isWatchOnly}
                style={{ marginTop: spacing['2xl'], marginBottom: spacing['2xl'] }}
              />

              {/* One explanation for every refusal on this screen, rather than
                  a tooltip per control the user has to go hunting for. */}
              {isWatchOnly && (
                <WatchOnlyNotice data-testid="home-watch-only-notice">
                  {t('wallet.watchOnly.disabled_action')}
                </WatchOnlyNotice>
              )}

              {/* Partial-load failure: keep whatever data loaded visible;
                  retry is the header refresh button. */}
              {balanceError && hasData && (
                <Box
                  sx={{ padding: `0 ${spacing.lg}px`, marginBottom: `${spacing.md}px` }}
                  data-testid="balance-load-error"
                >
                  <WarningNotice
                    tone="warning"
                    title={t(
                      'wallet.partial_load_error',
                      "Some balances couldn't be loaded. Shown data may be incomplete."
                    )}
                  />
                </Box>
              )}

              {/* Token List Section — only this area scrolls */}
              <TokenSectionWrapper>
                <TopListFade ref={topFadeRef} />
                {/* Keyed by chain: switching chains swaps this whole area with
                    a fade-through (enter with fade + settle from scale 0.97)
                    instead of a hard cut; reduce motion keeps the cut. */}
                <FadeThrough transitionKey={currentBlockchain}>
                  {currentBlockchain === 'bitcoin' ? (
                    <TokenSection onScroll={handleTokenListScroll}>
                      {/* Bitcoin's home tab *is* the token detail screen — the
                        same composition the pushed page renders, minus the
                        push. It shares that component so the two cannot drift
                        into different spacing, titles or chart heights again. */}
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
                        bleed={spacing.lg}
                      />
                    </TokenSection>
                  ) : (
                    <TokenSection onScroll={handleTokenListScroll}>
                      {balanceState === 'loading' || formattedTokens.length > 0 ? (
                        <TokenList
                          tokens={formattedTokens}
                          loading={balanceState === 'loading'}
                          onTokenPress={handleTokenPress}
                          hiddenBalance={hiddenBalance}
                          blockchain={getBlockchainFromNetworkId(currentBlockchain)}
                        />
                      ) : balanceState === 'error' ? (
                        /* Failed load with nothing to show is an error state,
                           never "No tokens found" and never an endless
                           skeleton — PRODUCT.md keeps those answers distinct. */
                        <EmptyState data-testid="token-list-error">
                          <EmptyStateText>
                            {t(
                              'wallet.tokens_load_error',
                              "Your tokens couldn't be loaded right now."
                            )}
                          </EmptyStateText>
                          <TextButton onPress={() => refresh()} testID="token-list-retry-button">
                            {t('actions.retry', 'Retry')}
                          </TextButton>
                        </EmptyState>
                      ) : (
                        <EmptyState>
                          <EmptyStateText>{t('home.no_tokens', 'No tokens found')}</EmptyStateText>
                          <EmptyStateSubtext>
                            {t(
                              'home.no_tokens_hint',
                              'Your tokens will appear here once you receive some'
                            )}
                          </EmptyStateSubtext>
                        </EmptyState>
                      )}
                    </TokenSection>
                  )}
                </FadeThrough>

                <BottomListFade ref={bottomFadeRef} />
              </TokenSectionWrapper>
            </>
          )}

          {activeTab === 'collectibles' && (
            <CollectiblesPage
              activeAccount={activeAccount}
              developerNetworks={developerNetworks}
              onNftDetailPress={handleNftDetailPress}
              onSeeAllPress={handleSeeAllPress}
            />
          )}

          {activeTab === 'swap' && (
            <SwapPage
              onNavigateHome={() => setActiveTab('home')}
              onFlowLockChange={setFlowLocked}
              onTaskChange={setFlowIsTask}
            />
          )}
        </TabContent>
      </Main>

      {/* Settings Panel Stack */}
      <SettingsPanelStack
        visible={settingsVisible}
        onClose={handleSettingsClose}
        panelRegistry={panelRegistry}
        initialPanels={settingsInitialPanels}
        developerNetworksEnabled={developerNetworks}
        onDeveloperNetworksToggle={() => void toggleDeveloperNetworks()}
        analyticsEnabled={analyticsConsent}
        onAnalyticsToggle={setAnalyticsConsent}
        onRemoveWallet={handleRemoveWallet}
        onRemoveAllWallets={handleRemoveAllWallets}
      />

      {/* Wallet Switcher Sheet */}
      <WalletSwitcherSheet
        visible={walletSwitcherVisible}
        onClose={() => setWalletSwitcherVisible(false)}
        accounts={accounts}
        activeAccountId={accountId || ''}
        onSelectAccount={handleSelectAccount}
        onAddAccount={handleAddAccount}
        onEditAccount={handleEditAccount}
        onDeleteAccount={handleDeleteAccount}
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
        blockchain={getBlockchainFromNetworkId(currentBlockchain)}
      />
    </Container>
  );
}

export default HomePage;
