import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  useAccountsContext,
  isWatchOnlyAccount,
  useAvailableNetworks,
  useBalance,
  useTransactions,
  useDerivedAccountsScan,
  useHomeShell,
  useHomePowerupTabs,
  useHomePowerupsCatalog,
  useInstalledPowerups,
  mapBalanceToToken,
  type HomeSubTabKey,
  getNetworkLabel,
  getHeldNetworkIds,
  spacing,
  type SettingsPanelEntry,
  type BlockchainId,
  type NetworkId,
  type PriceChartPeriod,
  type Token,
  type SendToken,
  useCurrencyContext,
  usePrefetchBalances,
  useDeveloperModeSettings,
  useSendContacts,
  FLOAT_IN_MS,
  SINK_OUT_MS,
  motionMs,
} from '@salmon/shared';
import {
  WalletHeader,
  BalanceHeader,
  PortfolioSubTabs,
  HomeTabOrderSheet,
  DerivedAccountsSheet,
  NftsTab,
  SinkFloat,
  SlideStack,
  TokenDetailPage,
  NftDetailPage,
  TransactionHistoryPage,
  ReceiveSheet,
  useTaskChrome,
  WalletsScreen,
  DepthBackground,
  ScalesBackground,
  SendPage,
  PowerupsFab,
  useReducedMotion,
  VIEW_TRANSITION_MS_VAR,
} from '../../components';

import { SettingsPage } from '../settings';
import { POWERUPS_ENABLED, PowerupsCatalog, SwapPage } from '@salmon/ui/powerups';

import { PlaceholderPage } from './PlaceholderPage';
import { PortfolioColumn } from './PortfolioColumn';
import {
  TOP_FADE_SCROLL_RANGE,
  bottomFadeStyle,
  containerStyle,
  contentRegionStyle,
  fillColumnStyle,
  pinnedHeaderStyle,
  risenSubTabsStyle,
  subTabsStyle,
  balanceBlockStyle,
  screenStyle,
  topSeamFadeStyle,
} from './homeStyles';
import { PAGE_DEPTH, type PageView } from './pages';
import { useHomeMarketData } from './useHomeMarketData';
import { useHomeNftFlow } from './useHomeNftFlow';

/** The two in-page sub-tabs — the shell's key, kept under its old local name. */
type SubTabKey = HomeSubTabKey;

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
  const [{ currency }, { formatValue }] = useCurrencyContext();
  const formatSwapUsd = useCallback((value: number) => `~${formatValue(value)}`, [formatValue]);
  const { ready, activeAccount, activeBlockchainAccount, networkId } = state;

  // The two "show me more" flags come from the provider the side panel root
  // mounts (the same one mobile's `(app)` stack mounts), so every screen
  // reads one value and an older wallet gets its mirror addresses derived.
  const { developerNetworks, showUnverifiedTokens } = useDeveloperModeSettings();

  // The offer: the enabled networks this wallet actually holds an account on.
  // The filtering used to happen here, after the hook had already dropped the
  // non-mainnet half; the hook owns the whole rule now, so the active network
  // stays offered even with the flag off and the session is never stranded on
  // a page the balance block cannot reach (spec 026).
  // Held means a filled slot, not a present key: `getHeldNetworkIds` is the
  // same rule the active selection resolves against, so the balance block
  // cannot offer a page the session is unable to read.
  const heldNetworkIds = useMemo(
    () => (activeAccount ? getHeldNetworkIds(activeAccount) : undefined),
    [activeAccount]
  );
  const { allNetworks, networksReady } = useAvailableNetworks({
    activeBlockchainAccount: {
      network: {
        environment: (networkId || 'solana-mainnet') as 'solana-mainnet' | 'solana-devnet',
        blockchain: 'solana',
      },
    },
    // The flag comes from the provider, not from this hook's own instance,
    // which reloads only when the network it is keyed on changes and would
    // otherwise stay stale after a settings toggle.
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
  const [receiveSheetVisible, setReceiveSheetVisible] = useState(false);

  // The ceiling the Powerups catalogue rises to: the bottom of the Send /
  // Receive / Activity row, so the balance and those buttons stay visible
  // above the sheet. `catalogVisible` itself is `useHomePowerupsCatalog`'s
  // state, set up further down with the rest of the Powerups slice.
  const [catalogHeight, setCatalogHeight] = useState<number | undefined>(undefined);
  const subTabsRef = useRef<HTMLDivElement>(null);

  // What this device has installed. Nothing is installed out of the box, so
  // Home starts with Portfolio and NFTs and gains a tab only when the user
  // adds one from the catalogue.
  const { installed, install, uninstall } = useInstalledPowerups();

  // Which panels Settings opens onto (Wallets opens it already deep), and the
  // screen leaving Settings returns to — the page that pushed it.
  const [settingsInitialPanels, setSettingsInitialPanels] = useState<
    SettingsPanelEntry[] | undefined
  >(undefined);
  const [settingsReturnTo, setSettingsReturnTo] = useState<PageView>('home');

  /** Push Settings from the page the user is on, optionally onto a panel. */
  const openSettings = useCallback(
    (panels?: SettingsPanelEntry[]) => {
      setSettingsInitialPanels(panels);
      setSettingsReturnTo(currentPage);
      setCurrentPage('settings');
    },
    [currentPage]
  );

  const handleSettingsClose = useCallback(() => {
    setCurrentPage(settingsReturnTo);
    setSettingsInitialPanels(undefined);
  }, [settingsReturnTo]);

  // Token detail page state
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedTokenChartPeriod, setSelectedTokenChartPeriod] = useState<PriceChartPeriod>('1M');

  // A watch-only wallet holds no key, so every flow that spends is closed to
  // it. The refusal is enforced in shared; this only keeps the UI honest.
  const isWatchOnly = isWatchOnlyAccount(activeAccount);

  // The NFT flow: the open collectible, its burn review, the one a Send was
  // opened for, and the account that signs for it.
  const {
    selectedNft,
    sendNft,
    burnReviewOpen,
    collectibleSolanaAccount,
    nftFlow,
    handleNftDetailPress,
    handleNftDetailBack,
    handleNftSendPress,
    handleNftBurnPress,
    handleNftBurnBack,
    handleNftBurnSuccessContinue,
    clearSendNft,
    settleAfterSend: settleAfterNftSend,
  } = useHomeNftFlow({ activeAccount, navigate: setCurrentPage });

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
    openSettings();
  }, [openSettings]);

  // Wallets is a screen, not a sheet (spec 028 ruling 3): the second tap
  // inside it changes what it is.
  const handleWalletPress = useCallback(() => {
    setCurrentPage('wallets');
  }, []);

  // One add-wallet screen, two entry points. Settings returns to the page
  // that pushed it, so completing lands on the surface the user came from
  // with the new wallet already active.
  const handleAddAccount = useCallback(() => {
    openSettings([{ screen: 'account-add' }]);
  }, [openSettings]);

  // The same rename screen Settings → Accounts → Edit reaches.
  const handleRenameAccount = useCallback(
    (targetAccountId: string) => {
      openSettings([{ screen: 'account-name', props: { accountId: targetAccountId } }]);
    },
    [openSettings]
  );

  const handleSendPress = useCallback(() => {
    setCurrentPage('send');
  }, []);

  const handleSendBack = useCallback(() => {
    clearSendNft();
    setCurrentPage('home');
  }, [clearSendNft]);

  const handleSendSuccess = useCallback(() => {
    settleAfterNftSend();
    setCurrentPage('home');
    refresh();
  }, [refresh, settleAfterNftSend]);

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

  // The installed Powerups, as Home surfaces — the registry and the copy
  // come through the shared registry (aliased out with the build flag off),
  // so a build with Powerups off passes an empty list
  // (`useHomePowerupTabs`, shared with mobile's HomeScreen).
  const powerupTabs = useHomePowerupTabs({ installed });

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
    powerupTabs,
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

  // Focus mode, in two beats (owner, on device): the underline reaches the
  // tab first and stops; one underline-slide later the header moves. The DOM
  // plays that second beat as a same-document view transition — the row's
  // position interpolates, the balance cross-fades out — with `flushSync` so
  // the DOM is already in its new layout when the snapshot is taken. No API,
  // or reduce motion: a cut, which is the fallback the API itself prescribes.
  const isReduceMotionEnabled = useReducedMotion();
  const wantsPowerupMode = powerupTabs.some((tab) => tab.key === effectiveSubTab);
  const [isPowerupMode, setIsPowerupMode] = useState(wantsPowerupMode);
  useLayoutEffect(() => {
    if (wantsPowerupMode === isPowerupMode) return undefined;
    const { startViewTransition } = document as Document & {
      startViewTransition?: (update: () => void) => unknown;
    };
    const flip = () => setIsPowerupMode(wantsPowerupMode);
    if (isReduceMotionEnabled || typeof startViewTransition !== 'function') {
      flip();
      return undefined;
    }
    const timer = setTimeout(() => {
      // The row travels exactly as long as the balance's verb: the sink's
      // length while it leaves, the float's while it comes back.
      document.documentElement.style.setProperty(
        VIEW_TRANSITION_MS_VAR,
        `${wantsPowerupMode ? SINK_OUT_MS : FLOAT_IN_MS}ms`
      );
      startViewTransition.call(document, () => flushSync(flip));
    }, motionMs.drift);
    return () => clearTimeout(timer);
  }, [wantsPowerupMode, isPowerupMode, isReduceMotionEnabled]);

  // BE handles spam/unknown filtering via `includeSpam` above; the rows are
  // mobile's mapping, from shared.
  const formattedTokens = useMemo(() => tokens.map(mapBalanceToToken), [tokens]);

  // Bitcoin's row inside Portfolio and the selected token's detail page.
  const { bitcoin, selectedToken: selectedTokenMarket } = useHomeMarketData({
    currentChain,
    currency,
    nativeAmount,
    usdTotal,
    bitcoinChartPeriod,
    selectedToken,
    selectedTokenChartPeriod,
    tokenDetailOpen: currentPage === 'tokenDetail',
  });

  const accountName = activeAccount?.name || t('home.unnamed_account', 'Account');

  // Every screen over Home enters from the right and leaves to the right
  // (owner, 2026-09-02) — mobile's stack does it natively; here `SlideStack`
  // reads the page swap as a push (depth 1 over Home's 0) or a pop. A Powerup
  // is not one of them: the catalogue is a sheet over Home and an installed
  // Powerup is a sub-tab of it (spec 027).
  // The catalogue drawer's own state and entries — shared with mobile's
  // HomeScreen (`useHomePowerupsCatalog`). Entries are the registry's for
  // the active network plus the developer-only mocks; an installed one
  // keeps its place in its tier and says it is installed there. Only a real
  // Powerup can be installed: the mocks advertise nothing the wallet can
  // open, so the catalogue refuses to give them a tab.
  const {
    catalogVisible,
    handleCatalogToggle,
    handleCatalogClose,
    catalogEntries,
    handleInstall,
    removableTabKeys,
  } = useHomePowerupsCatalog({
    powerupTabs,
    installed,
    install,
    developerNetworks,
    networkId: currentNetworkId,
  });

  // The catalogue's height, measured off the live layout: the room under the
  // top of the Portfolio / NFTs row (owner, 2026-09-11). The side panel can be
  // resized, and the block above the row changes height with the figures in it.
  useLayoutEffect(() => {
    const node = subTabsRef.current;
    if (!node) return undefined;
    const measure = () =>
      setCatalogHeight(Math.max(window.innerHeight - node.getBoundingClientRect().top, 0));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [currentPage]);
  const swapTokens = useMemo(
    () =>
      currentChain === 'solana'
        ? tokens.map((token) => ({
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals ?? 9,
            logo: token.logo ?? undefined,
            balance:
              typeof token.uiAmount === 'string' ? parseFloat(token.uiAmount) : token.uiAmount,
            usdPrice: token.price ?? undefined,
            chain: 'solana' as const,
            networkId: networkId ?? undefined,
          }))
        : [],
    [currentChain, tokens, networkId]
  );

  const renderPage = (): React.ReactElement => {
    switch (currentPage) {
      case 'tokenDetail':
        if (selectedToken) {
          return (
            <TokenDetailPage
              token={selectedToken}
              blockchain={currentChain}
              networkId={currentNetworkId}
              chartData={selectedTokenMarket.chartData}
              chartPeriod={selectedTokenChartPeriod}
              onChartPeriodChange={handleSelectedTokenChartPeriodChange}
              coinInfo={selectedTokenMarket.coinInfo}
              marketData={selectedTokenMarket.marketData}
              chartLoading={
                selectedTokenMarket.chartLoading && selectedTokenMarket.chartData.length === 0
              }
              chartPending={selectedTokenMarket.chartPending}
              infoLoading={selectedTokenMarket.infoLoading && !selectedTokenMarket.coinInfo}
              chartError={!!selectedTokenMarket.error && selectedTokenMarket.chartData.length === 0}
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
        // Wallets is a page of its own in the stack, not a layer over Home,
        // so the rescans it asks for are waited on and answered here — the
        // same sheet, mounted where the user is (mobile does the same).
        return (
          <>
            <WalletsScreen
              onBack={handleBack}
              onRename={handleRenameAccount}
              onAddWallet={handleAddAccount}
              onRescan={(id) => void derivedAccounts.rescan(id)}
              scanningAccountId={derivedAccounts.scanningAccountId}
              showUnverifiedTokens={showUnverifiedTokens}
            />
            <DerivedAccountsSheet
              visible={
                derivedAccounts.rescanningAccountId !== null ||
                (derivedAccounts.sheetVisible && derivedAccounts.sheetRequested)
              }
              scanning={derivedAccounts.rescanningAccountId !== null}
              finds={derivedAccounts.finds}
              onImport={(indexes: number[]) => void derivedAccounts.importFinds(indexes)}
              onDismiss={() => void derivedAccounts.dismiss()}
            />
          </>
        );
      case 'settings':
        return <SettingsPage onClose={handleSettingsClose} initialPanels={settingsInitialPanels} />;
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
            style={fillColumnStyle}
          >
            {/* Fixed on both sub-tabs, and mounted under ONE parent so the row
                is the same instance across a switch: `UnderlineTabs` only
                slides its underline if it is not remounted. */}
            <div style={pinnedHeaderStyle}>
              {/* Focus mode (owner, 2026-09-11): on a Powerup's sub-tab the
                  balance block leaves and the sub-tab row rises to where the
                  chain selector stood; Portfolio or NFTs bring it back. */}
              {isPowerupMode ? null : (
                <div data-testid="home-balance-block" style={balanceBlockStyle}>
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
                </div>
              )}
              <div ref={subTabsRef} style={isPowerupMode ? risenSubTabsStyle : subTabsStyle}>
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
                style={fillColumnStyle}
              >
                {effectiveSubTab === 'portfolio' ? (
                  // Keyed by chain so switching chains swaps the whole column
                  // with the sink and the float: the outgoing chain's content
                  // sinks as its light goes, the incoming one floats up into
                  // place. The frame above holds still; only the content travels.
                  <SinkFloat
                    transitionKey={chainHasPrior ? currentNetworkId : 'home-chain-content'}
                    testID="home-chain-content"
                    style={fillColumnStyle}
                  >
                    <PortfolioColumn
                      currentChain={currentChain}
                      currentNetworkId={currentNetworkId}
                      balanceState={balanceState}
                      balanceError={balanceError}
                      hasData={hasData}
                      hiddenBalance={hiddenBalance}
                      tokens={formattedTokens}
                      onTokenPress={handleTokenPress}
                      onRetry={refresh}
                      bitcoin={bitcoin}
                      bitcoinChartPeriod={bitcoinChartPeriod}
                      onBitcoinChartPeriodChange={setBitcoinChartPeriod}
                      onScroll={handleContentScroll}
                    />
                  </SinkFloat>
                ) : effectiveSubTab === 'nfts' ? (
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
                ) : SwapPage && effectiveSubTab === 'swap' && activeBlockchainAccount ? (
                  // The Swap Powerup's own surface. The confirmation is core's
                  // and covers the whole panel when the user signs (§2).
                  <SwapPage
                    tokens={swapTokens}
                    publicKey={activeBlockchainAccount.getReceiveAddress()}
                    networkId={networkId ?? null}
                    loading={balanceState === 'loading'}
                    initialInToken={swapTokens[0]}
                    formatUsd={formatSwapUsd}
                    watchOnly={isWatchOnly}
                  />
                ) : null}
              </SinkFloat>

              {/* The seam between the fixed row above and whatever scrolls
                  under it, faded in off that region's own offset. */}
              <div ref={seamFadeRef} style={topSeamFadeStyle} />
            </div>
          </SinkFloat>
        )}

        {/* The `+`. It floats over the content and opens the catalogue; while
            the catalogue is up the plus turns into the close mark. It leaves
            with the content when a task takes the screen. */}
        {POWERUPS_ENABLED && !isTaskEngaged && !flowLocked && (
          <PowerupsFab open={catalogVisible} onPress={handleCatalogToggle} />
        )}
      </div>

      {/* The catalogue: a drawer of Home, stopping just below the Send /
          Receive / Activity row so the balance stays in view above it. */}
      {PowerupsCatalog && (
        <PowerupsCatalog
          visible={catalogVisible}
          onClose={handleCatalogClose}
          entries={catalogEntries}
          onInstall={handleInstall}
          onUninstall={uninstall}
          height={catalogHeight}
        />
      )}

      {/* The sub-tab arrangement. It applies live: the row above re-flows as
          rows are dropped, and there is nothing to save. Portfolio and NFTs
          are the wallet itself; a Powerup's tab carries a `−` that uninstalls
          it. */}
      <HomeTabOrderSheet
        visible={orderSheetVisible}
        onClose={handleOrderSheetClose}
        tabs={subTabs}
        onOrderChange={setSubTabOrder}
        removableKeys={removableTabKeys}
        onRemove={uninstall}
      />

      {/* The question the automatic derived-account scan raises: the scan
          belongs to the unlocked session, so its answer is taken on the first
          screen the session lands on. A rescan the user asked for on Wallets
          is answered there, so Home only ever draws the automatic pass's
          finds — never the wait. */}
      <DerivedAccountsSheet
        visible={derivedAccounts.sheetVisible && !derivedAccounts.sheetRequested}
        scanning={false}
        finds={derivedAccounts.finds}
        onImport={(indexes: number[]) => void derivedAccounts.importFinds(indexes)}
        onDismiss={() => void derivedAccounts.dismiss()}
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
      depth={PAGE_DEPTH[currentPage]}
      style={{ height: '100dvh' }}
      testID="home-stack"
    >
      {currentPage === 'home' ? home : renderPage()}
    </SlideStack>
  );
}

export default HomePage;
