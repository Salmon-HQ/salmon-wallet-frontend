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
  useDerivedAccountsScan,
  useHomeTabOrder,
  getNetworkLabel,
  colors,
  spacing,
  fontSize,
  type SettingsPanelEntry,
  type BlockchainBalance,
  type BlockchainId,
  type NetworkId,
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
  TokenDetailPage,
  NftDetailPage,
  TransactionHistoryPage,
  ReceiveSheet,
  useTaskChrome,
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

/**
 * The two in-page sub-tabs. NFTs only exist on Solana — see `nftsOffered`.
 */
type SubTabKey = 'portfolio' | 'nfts';

/**
 * The sub-tabs Home offers, in the order it draws them before the user has
 * arranged anything. A powerup that adds a surface to Home adds its key here;
 * `useHomeTabOrder` reconciles the stored arrangement against this list.
 */
const HOME_TAB_KEYS: SubTabKey[] = ['portfolio', 'nfts'];

/** Scroll distance over which the top seam fade reaches full opacity. */
const TOP_FADE_SCROLL_RANGE = 30;

/**
 * Available page views within HomePage
 */
type PageView = 'home' | 'tokenDetail' | 'nftDetail' | 'activity' | 'send';

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
 * The panel shell.
 *
 * The ground is mounted here, once, behind everything: the depth ramp, the
 * deep field's scales and the bottom fade that ends on the ramp's own floor
 * (mobile mounts the same three in `app/(app)/(tabs)/_layout.tsx`). The
 * screens are siblings of it, so the water never travels with them.
 */
const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100dvh',
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: 'var(--sw-water-gradient-1)',
});

/**
 * The bottom fade. It starts and ends on the ramp's own floor —
 * `transparent` is black at alpha 0, which smudged the fade grey on its way to
 * nothing, and on the pale ground it painted a dark band.
 */
const BottomFadeGradient = styled(Box)({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  // No `componentSizes` token fits this fade's height.
  height: 180,
  background:
    'linear-gradient(to bottom, var(--sw-water-fadeBottom-0), var(--sw-water-fadeBottom-1))',
  pointerEvents: 'none',
  zIndex: 0,
});

/** Everything the user reads sits above the ground, in flow. */
const Screen = styled(Box)({
  position: 'relative',
  zIndex: 1,
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
});

/**
 * The block above the content region. It is fixed on both sub-tabs — nothing
 * above the sub-tab row scrolls, on either of them (DESIGN.md §Navigation).
 * Block seams are the component gap (20) on every side.
 */
const PinnedHeader = styled(Box)({
  paddingLeft: spacing.screenGutter,
  paddingRight: spacing.screenGutter,
  paddingTop: spacing.xl,
  paddingBottom: spacing.xl,
});

const PinnedSubTabs = styled(Box)({
  marginTop: spacing.xl,
});

/** The content region: the only part of Home that scrolls. */
const ContentRegion = styled(Box)({
  position: 'relative',
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
});

/**
 * The one mask on this screen: the seam between the fixed row above and the
 * list scrolling under it. It starts on the ramp's own top stop and ends on
 * that same colour at alpha 0, so it clears without smudging on either ground.
 */
const TopSeamFade = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 30,
  background: 'linear-gradient(to bottom, var(--sw-water-fadeTop-0), var(--sw-water-fadeTop-1))',
  pointerEvents: 'none',
  zIndex: 1,
  opacity: 0,
});

/** The scroller Portfolio's list and the Bitcoin column live in. */
const ScrollColumn = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  paddingLeft: spacing.screenGutter,
  paddingRight: spacing.screenGutter,
  paddingBottom: spacing['2xl'],
});

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

  // The offer: the enabled networks this wallet actually holds an account on.
  // The filtering used to happen here, after the hook had already dropped the
  // non-mainnet half; the hook owns the whole rule now, so the active network
  // stays offered even with the flag off and the session is never stranded on
  // a page the balance block cannot reach (spec 026).
  const heldNetworkIds = useMemo(
    () =>
      activeAccount?.networksAccounts ? Object.keys(activeAccount.networksAccounts) : undefined,
    [activeAccount?.networksAccounts]
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

  // The in-page sub-tab. It replaces the old Home / Collectibles / Swap tab
  // bar: Home is one screen with a Portfolio and an NFTs surface inside it,
  // and Swap is a powerup, not a tab (spec 028, DESIGN.md §Navigation).
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('portfolio');

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

  const settleAfterTx = useSettleAfterTx();
  const nftBurn = useNftBurn({
    account: collectibleSolanaAccount ?? null,
    activeAccountId: activeAccount?.id,
  });

  // Bitcoin-specific state
  const [bitcoinChartPeriod, setBitcoinChartPeriod] = useState<PriceChartPeriod>('1M');

  // Sync the balance block's index with the persisted networkId — but only
  // when that id actually changes. `changeNetwork` is async, so a chain switch
  // sets the index optimistically and the persisted id catches up a beat
  // later; re-running this inside that beat would re-derive the index from the
  // OLD id and pull the balance straight back to the chain just left. Keyed on
  // account AND network: two accounts can sit on the same network id.
  const syncedNetworkIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!networkId || allNetworks.length === 0) return;
    const syncKey = `${activeAccount?.id ?? ''}:${networkId}`;
    if (syncedNetworkIdRef.current === syncKey) return;
    const idx = allNetworks.findIndex((n) => n.id === networkId);
    if (idx < 0) return;
    syncedNetworkIdRef.current = syncKey;
    setActiveBlockchainIndex(idx);
  }, [networkId, allNetworks, activeAccount?.id]);

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
    setBurnStep('idle');
    setBurnPreview(null);
    setBurnError(null);
    setBurnLoading(false);
    setCurrentPage('home');
    setSelectedNft(null);
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

  // Build blockchain balances array for carousel
  const blockchainBalances: BlockchainBalance[] = useMemo(() => {
    return allNetworks.map((network) => {
      const blockchain = NETWORK_TO_BLOCKCHAIN[network.id] || 'solana';
      const isActiveNetwork = network.id === networkId;

      if (!isActiveNetwork) {
        return {
          network: { id: network.id, name: network.name, blockchain },
          usdTotal: undefined,
          nativeAmount: undefined,
          changePercent: undefined,
          changeAmount: undefined,
          loading: false,
        };
      }

      // A skeleton means "there is nothing to show", never "a request is in
      // flight". `hasData` is true for cached data too, so returning to a chain
      // visited earlier in the session paints its last-known balance
      // immediately.
      const showSkeleton = !hasData;
      return {
        network: { id: network.id, name: network.name, blockchain },
        usdTotal: showSkeleton ? undefined : usdTotal,
        // Off mainnet there is no USD figure at all, so this is what the block
        // prints as the total.
        nativeAmount: showSkeleton ? undefined : nativeAmount,
        changePercent: showSkeleton ? undefined : changePercent,
        changeAmount: showSkeleton ? undefined : changeAmount,
        loading: showSkeleton,
      };
    });
  }, [allNetworks, networkId, hasData, usdTotal, nativeAmount, changePercent, changeAmount]);

  // A page change on the balance block. `changeNetwork` returns silently when
  // the account has no derivation for the target, so writing the index
  // optimistically regardless would leave the dots and the amount pointing at a
  // chain the wallet never switched to.
  const handleBlockchainChange = useCallback(
    (_blockchain: BlockchainId, index: number) => {
      const selectedBalance = blockchainBalances[index];
      if (!selectedBalance) return;
      const newNetworkId = selectedBalance.network.id;
      if (!activeAccount?.networksAccounts?.[newNetworkId]) return;
      setActiveBlockchainIndex(index);
      // The incoming chain's list starts at the top, so the offset the seam
      // fade reads must start over with it.
      resetSeamFade();
      void Promise.resolve(actions.changeNetwork(newNetworkId)).catch((error) =>
        console.warn('[home] changeNetwork failed:', error)
      );
    },
    [blockchainBalances, actions, activeAccount, resetSeamFade]
  );

  // The network the screen stands on, and its chain family. Every surface below
  // follows the NETWORK: `network.blockchain` is the id minus `-mainnet`, so it
  // reads `solana-devnet` off mainnet and an equality test against `'bitcoin'`
  // silently missed `bitcoin-testnet` (spec 026).
  const currentNetworkId = useMemo(
    () => blockchainBalances[activeBlockchainIndex]?.network.id ?? networkId ?? 'solana-mainnet',
    [activeBlockchainIndex, blockchainBalances, networkId]
  );
  const currentChain = getBlockchainFromNetworkId(currentNetworkId);
  // Kept for the surfaces still keyed on the carousel's blockchain id.
  const currentBlockchain = useMemo(
    () => blockchainBalances[activeBlockchainIndex]?.network.blockchain || 'solana',
    [activeBlockchainIndex, blockchainBalances]
  );

  // NFTs are a Solana surface. On Bitcoin the tab is not offered at all — it
  // sinks out of the row — and a session sitting on it falls back to Portfolio
  // (spec 026, owner ruling 3). The stored arrangement is untouched, so the tab
  // returns to its own place when the block comes back to Solana.
  const nftsOffered = currentChain === 'solana';
  const effectiveSubTab: SubTabKey =
    activeSubTab === 'nfts' && !nftsOffered ? 'portfolio' : activeSubTab;

  // The keys Home offers; the user's arrangement of them is what gets rendered.
  const { order: subTabOrder, setOrder: setSubTabOrder } = useHomeTabOrder(HOME_TAB_KEYS);

  const subTabs = useMemo(() => {
    const labels: Record<string, string> = {
      portfolio: t('tabs.portfolio', 'Portfolio'),
      nfts: t('tabs.nfts', 'NFTs'),
    };
    return subTabOrder.flatMap((key) => {
      if (key === 'nfts' && !nftsOffered) return [];
      const label = labels[key];
      return label ? [{ key, label }] : [];
    });
  }, [subTabOrder, nftsOffered, t]);

  // The row plays the verb whenever the SET of tabs changes — a reorder, and
  // also NFTs leaving on Bitcoin and floating back on Solana. `PortfolioSubTabs`
  // remembers the key it last drew, so first mount owes no verb and a tab
  // switch (same set) never remounts the row: the underline keeps sliding.
  const subTabsKey = subTabs.map((tab) => tab.key).join('|');

  // The beat between sink and float. Three causes can swap content here and
  // they must never speak at once (the verb never nests — DESIGN.md §The
  // balance block's motion, rule five): a task taking or releasing the screen
  // owns the screen wrapper, a sub-tab change owns the content region, and a
  // chain change owns the chain wrapper inside it. The cause of the current
  // swap is recorded, and only the wrapper that owns that cause animates.
  //
  // A SURFACING is not a swap: Home is never unmounted while the wait is up, so
  // the user's last gesture is still recorded when the water clears. The
  // surfacing wins over anything else that changed in the same render — the
  // cause goes back to 'none', so only the screen wrapper speaks, with no beat.
  const [contentSwap, setContentSwap] = useState<{
    chain: string;
    subTab: SubTabKey;
    engaged: boolean;
    surface: number;
    cause: 'none' | 'chain' | 'subtab' | 'task';
  }>({
    chain: currentNetworkId,
    subTab: effectiveSubTab,
    engaged: isTaskEngaged,
    surface: surfaceKey,
    cause: 'none',
  });
  if (contentSwap.surface !== surfaceKey) {
    setContentSwap({
      chain: currentNetworkId,
      subTab: effectiveSubTab,
      engaged: isTaskEngaged,
      surface: surfaceKey,
      cause: 'none',
    });
  } else if (
    contentSwap.chain !== currentNetworkId ||
    contentSwap.subTab !== effectiveSubTab ||
    contentSwap.engaged !== isTaskEngaged
  ) {
    setContentSwap({
      chain: currentNetworkId,
      subTab: effectiveSubTab,
      engaged: isTaskEngaged,
      surface: surfaceKey,
      // Leaving Solana can change the chain AND drop NFTs in the same render.
      // The sub-tab wins: the content region is the one wrapper that speaks,
      // and the chain-keyed wrapper inside it stays silent (rule five).
      cause:
        contentSwap.engaged !== isTaskEngaged
          ? 'task'
          : contentSwap.subTab !== effectiveSubTab
            ? 'subtab'
            : 'chain',
    });
  }

  const subTabHasPrior = contentSwap.cause === 'subtab';
  const chainHasPrior = contentSwap.cause === 'chain';

  // Each sub-tab has its own scroller, so the offset the seam fade reads must
  // start over with it.
  const handleSubTabChange = useCallback(
    (key: string) => {
      resetSeamFade();
      setActiveSubTab(key as SubTabKey);
    },
    [resetSeamFade]
  );

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
      {/* The ground, mounted once behind every screen: a depth ramp darkening
          toward the abyss, the deep field the marine snow is read through, and
          the bottom fade that ends on the ramp's own floor. */}
      <DepthBackground style={{ zIndex: 0 }} />
      <ScalesBackground variant="deepField" style={{ zIndex: 0 }} />
      <BottomFadeGradient />

      <Screen>
        {/* The identity line. It is the screen's first child in flow — it owns
            its top padding and nothing scrolls behind it. Settings and the
            wallet switcher can change the account or the network, which remounts
            the flow, so both are withheld while a signed transaction is still
            being reported. */}
        <Box style={{ paddingTop: spacing.screenTop }}>
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
            developerMode={developerNetworks}
            avatarUrl={activeAccount?.avatar}
            accountId={activeAccount?.id}
          />
        </Box>

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
            <PinnedHeader>
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
              <PinnedSubTabs>
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
              </PinnedSubTabs>
            </PinnedHeader>

            {/* The content region plays the verb on a sub-tab change: the
                outgoing list sinks, the incoming one floats. Keyed by sub-tab,
                the same mechanism the chain swap uses; the block above it holds
                still (rule four). */}
            <ContentRegion>
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
                    <ScrollColumn onScroll={handleContentScroll}>
                      {/* Partial-load failure: keep whatever data loaded
                          visible. Only 'ready' carries data, so a total failure
                          is left to the list's own error state rather than told
                          "shown data may be incomplete". */}
                      {balanceError && balanceState === 'ready' && (
                        <Box
                          sx={{ marginBottom: `${spacing.xl}px` }}
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
                    </ScrollColumn>
                  </SinkFloat>
                ) : (
                  // NFTs: the grid owns the only scroller in the content
                  // region, and everything above it is the same fixed block
                  // Portfolio shows.
                  <NftsTab
                    onNftPress={handleNftDetailPress}
                    includeSpam={!!developerNetworks}
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
              <TopSeamFade ref={seamFadeRef} />
            </ContentRegion>
          </SinkFloat>
        )}
      </Screen>

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
        blockchain={currentChain}
        // Off mainnet the sheet names the environment under the code: a deposit
        // to a devnet address is not money (spec 026 D6).
        networkLabel={getNetworkLabel(currentNetworkId) ?? undefined}
      />
    </Container>
  );
}

export default HomePage;
