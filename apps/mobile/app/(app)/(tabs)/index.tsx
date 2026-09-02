/**
 * HomeScreen - Main wallet overview screen
 *
 * One layout, both sub-tabs. Top to bottom, all of it in flow:
 * - WalletHeader row: account name, address, settings navigation
 * - BalanceHeader: swipeable per-chain balance + Send / Receive / History
 * - PortfolioSubTabs: the in-page "Portfolio | NFTs" row — ONE instance under
 *   ONE parent, so `UnderlineTabs` never remounts and its underline slides
 * - the content region (`flex: 1`), which holds the active tab's own scroll
 *   view: TokenList, the Bitcoin column, or the NFT grid
 *
 * Nothing above the sub-tabs scrolls, on either tab (owner, 2026-09-01;
 * DESIGN.md §Navigation). The only mask is one fade at the seam between the
 * row and the content region, opacity driven by the active list's offset —
 * no measurement, no overlay, no scrim.
 *
 * Features:
 * - Pull-to-refresh for balance updates
 * - Balance visibility toggle (privacy mode)
 * - Multi-chain carousel (Solana, Bitcoin, Ethereum)
 * - Navigation to token detail, send, receive, and activity screens
 */

import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Reanimated, { useReducedMotion } from 'react-native-reanimated';

import {
  componentSizes,
  fontSize,
  s,
  spacing,
  useAccountsContext,
  useAvailableNetworks,
  useBalance,
  useCoinMarketData,
  usePrefetchBalances,
  useCurrencyContext,
  useHomeTabOrder,
  isWatchOnlyAccount,
  vs,
  getBlockchainFromNetworkId,
  getNetworkLabel,
  BLOCKCHAIN_TO_COINGECKO,
  PERIOD_TO_DAYS,
  coinInfoToMarketData,
  type NetworkId,
  type PriceChartPeriod,
  type PriceDataPoint,
  type Token,
  type Semantic,
} from '@salmon/shared';
import {
  AboutCard,
  BalanceHeader,
  DerivedAccountsSheet,
  HomeTabOrderSheet,
  MarketDataCard,
  NftsTab,
  PortfolioSubTabs,
  PriceChart,
  ReceiveSheet,
  SkeletonRow,
  StateBlock,
  TokenList,
  TokenListItem,
  WalletHeader,
  WarningNotice,
  type BlockchainBalance,
  type BlockchainId,
  type MarketData,
} from '../../../src/components';
import { useDerivedAccounts } from '../../../src/contexts/DerivedAccountsContext';
import { useDeveloperMode, useUnverifiedTokens } from '../../../src/contexts/DeveloperModeContext';
import { useTaskChrome } from '../../../src/contexts/TaskChromeContext';
import { useSemantic, useThemedStyles } from '../../../src/theme/useThemedStyles';
import { FLOAT_DELAY_MS, floatEntering, sinkExiting } from '../../../src/utils/sinkAndFloat';
import { useTabChrome } from '../../../hooks/useTabChrome';

/**
 * Convert TokenBalanceWithPrice to Token for TokenList
 */
function mapBalanceToToken(item: {
  address: string;
  symbol: string;
  name: string;
  logo?: string;
  uiAmount: number;
  usdBalance?: number;
  price?: number;
  priceChange24h?: number;
  tags?: string[];
  coingeckoId?: string;
}): Token {
  // Check if token has 'verified' tag
  const isVerified = item.tags?.includes('verified') ?? false;

  // Calculate absolute USD change based on percentage and current balance
  let absoluteChange: number | undefined;
  if (item.priceChange24h !== undefined && item.usdBalance !== undefined && item.usdBalance > 0) {
    // Calculate previous balance: current / (1 + percentage/100)
    const previousBalance = item.usdBalance / (1 + item.priceChange24h / 100);
    absoluteChange = item.usdBalance - previousBalance;
  }

  return {
    address: item.address,
    symbol: item.symbol,
    name: item.name,
    logo: item.logo || undefined,
    price: item.price,
    uiAmount: item.uiAmount,
    usdBalance: item.usdBalance ?? null,
    last24HoursChange:
      item.priceChange24h !== undefined ? { perc: item.priceChange24h, abs: absoluteChange } : null,
    tags: item.tags,
    isVerified,
    coingeckoId: item.coingeckoId,
  };
}

/** Scroll distance over which the top fade gradient reaches full opacity. */
const TOP_FADE_SCROLL_RANGE = 30;

/** The two in-page sub-tabs. NFTs only exist on Solana — see `handleSubTabChange`. */
type SubTabKey = 'portfolio' | 'nfts';

/**
 * The sub-tabs Home offers, in the order it draws them before the user has
 * arranged anything. A powerup that adds a surface to Home adds its key here;
 * `useHomeTabOrder` reconciles the stored arrangement against this list.
 */
const HOME_TAB_KEYS: SubTabKey[] = ['portfolio', 'nfts'];

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();
  const { floatingBottomOffset } = useTabChrome();
  const derivedAccounts = useDerivedAccounts();
  // A task that takes the screen owns it: the home content leaves with the
  // same verb the chrome does, so the flow finds empty water behind it.
  const { isTaskEngaged, surfaceKey } = useTaskChrome();
  const isReduceMotionEnabled = useReducedMotion();
  const [{ currency }] = useCurrencyContext();

  // Top fade gradient opacity - animated based on scroll position
  // `useMemo`, not a ref read during render: the hooks lint (v7) forbids
  // `.current` in the render body, and a memo with no deps is the same
  // one-instance guarantee.
  const topFadeOpacity = useMemo(() => new Animated.Value(0), []);

  // Active blockchain index for carousel
  const [activeBlockchainIndex, setActiveBlockchainIndex] = useState(0);

  // In-page sub-tab (replaces the removed bottom tab bar)
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('portfolio');

  // Bitcoin chart period — the fetch itself is `useCoinMarketData` below.
  const [bitcoinChartPeriod, setBitcoinChartPeriod] = useState<PriceChartPeriod>('1M');

  // ReceiveSheet visibility
  const [receiveSheetVisible, setReceiveSheetVisible] = useState(false);

  // The sheet where the sub-tabs are arranged
  const [orderSheetVisible, setOrderSheetVisible] = useState(false);

  // Get account state and actions from shared context
  const [accountState, accountActions] = useAccountsContext();
  const { ready, activeAccount, activeBlockchainAccount, networkId, pathIndex, switchingNetwork } =
    accountState;

  useEffect(() => {
    if (!accountState.locked) return;

    setReceiveSheetVisible(false);
    // Powerups is a route now, not a sheet — it closes itself on lock (see
    // `app/(app)/powerups.tsx`), because it sits ABOVE the tab shell that
    // mounts the lock overlay and Home cannot reach it from here. Token
    // detail is a route too (spec 019) — same story, it closes itself.
  }, [accountState.locked]);

  // Unverified tokens — its own setting now (spec 026 D4). Developer Networks
  // decides what the carousel OFFERS; this decides what the lists SHOW.
  const showUnverifiedTokens = useUnverifiedTokens();
  // The header's long-form address is the one thing still keyed on the
  // developer flag — it reads the hoisted context like every other consumer.
  const developerNetworks = useDeveloperMode();

  // User config account for available networks
  const userConfigAccount = activeBlockchainAccount
    ? {
        network: {
          environment: (networkId || 'solana-mainnet') as 'solana-mainnet' | 'solana-devnet',
          blockchain: 'solana',
        },
      }
    : {
        network: {
          environment: 'solana-mainnet' as const,
          blockchain: 'solana',
        },
      };

  // The offer: the enabled networks this wallet actually holds an account on.
  // The filtering used to happen here, after the hook had already dropped the
  // non-mainnet half; the hook owns the whole rule now, so the active network
  // stays offered even with the flag off and the session is never stranded on
  // a page the carousel cannot reach (spec 026).
  const networksAccounts = activeAccount?.networksAccounts;
  const heldNetworkIds = useMemo(
    () => (networksAccounts ? Object.keys(networksAccounts) : undefined),
    [networksAccounts]
  );
  // The flag comes from the hoisted context, not from the hook's own
  // `useUserConfig` instance. That instance reloads from storage only when the
  // blockchain or environment it is keyed on changes, so a toggle written by
  // the settings screen left this copy stale until the session changed
  // network — which is exactly why the devnet pages only appeared after a
  // chain switch. The override is the documented seam for a caller that
  // already holds a `useUserConfig`.
  const { allNetworks } = useAvailableNetworks({
    activeBlockchainAccount: userConfigAccount,
    developerNetworks,
    heldNetworkIds,
    activeNetworkId: networkId,
  });

  // Sync the carousel index with the persisted networkId — but only when that
  // id actually changes.
  //
  // `changeNetwork` is async, so a chain switch sets the index optimistically
  // and the persisted id catches up a beat later. This effect also re-runs
  // whenever `allNetworks` changes identity, and it does on nearly every
  // render (the accounts context hands back a fresh `activeAccount`, so the
  // filter memo above recomputes). Re-running it inside that beat re-derived
  // the index from the OLD networkId and pulled the balance straight back to
  // the chain the user had just left — which is why opening NFTs from Bitcoin
  // called `changeNetwork('solana-mainnet')` and still showed Bitcoin (owner,
  // device run). Guarding on the id makes it a sync, not a continuous
  // assertion.
  // Keyed on account AND network: two accounts can sit on the same network id,
  // so keying on the network alone made a wallet switch look like "already
  // synced" and left the balance on the previous account's chain index.
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

  // Get balance data for current network (active)
  const {
    tokens,
    usdTotal,
    nativeAmount,
    changePercent,
    changeAmount,
    loading,
    hasData,
    state: balanceState,
    refresh,
    error: balanceError,
    hiddenBalance,
    toggleHidden,
  } = useBalance({
    account: activeBlockchainAccount,
    networkId: (networkId ?? undefined) as NetworkId | undefined,
    skip: !ready || !activeBlockchainAccount,
    // BE filters unknown-only-tagged SPL entries by default; the setting opts
    // back in.
    includeSpam: showUnverifiedTokens,
  });

  // Warm the chains the user is not looking at, so the first swipe of the
  // session lands on a number instead of a skeleton. One request per inactive
  // chain per app load — see the hook for why it is not per switch.
  usePrefetchBalances({
    account: activeAccount,
    networkIds: allNetworks.map((network) => network.id as NetworkId),
    activeNetworkId: (networkId ?? undefined) as NetworkId | undefined,
    pathIndex,
    includeSpam: showUnverifiedTokens,
  });

  // RQ handles refetch-on-focus via QueryClient defaults (refetchOnWindowFocus).

  // Clear switching network flag once new data has loaded
  useEffect(() => {
    if (!loading && switchingNetwork) {
      accountActions.clearSwitchingNetwork();
    }
  }, [loading, switchingNetwork, accountActions]);

  const address = activeBlockchainAccount?.getReceiveAddress() ?? '';

  // Create blockchain balances array for carousel
  // Maps available networks from useAvailableNetworks to BlockchainBalance objects
  const blockchainBalances: BlockchainBalance[] = useMemo(() => {
    return allNetworks.map((network) => {
      const blockchain = network.id.replace('-mainnet', '') as BlockchainId;
      const isActiveNetwork = network.id === networkId;

      let balanceData: {
        usdTotal: number | undefined;
        nativeAmount: number | undefined;
        changePercent: number | undefined;
        changeAmount: number | undefined;
        loading: boolean;
      };

      if (isActiveNetwork) {
        // A skeleton means "there is nothing to show", never "a request is in
        // flight". `hasData` is true for cached data too, so returning to a
        // chain visited earlier in the session paints its last-known balance
        // immediately; `refreshing` gets the quiet affordance instead.
        const showSkeleton = !hasData;
        balanceData = {
          usdTotal: showSkeleton ? undefined : usdTotal,
          // Off mainnet there is no USD figure at all, so this is what the
          // block prints as the total.
          nativeAmount: showSkeleton ? undefined : nativeAmount,
          changePercent: showSkeleton ? undefined : changePercent,
          changeAmount: showSkeleton ? undefined : changeAmount,
          loading: showSkeleton,
        };
      } else {
        balanceData = {
          usdTotal: undefined,
          nativeAmount: undefined,
          changePercent: undefined,
          changeAmount: undefined,
          loading: false,
        };
      }

      return {
        network: {
          id: network.id,
          name: network.name,
          blockchain,
        },
        ...balanceData,
      };
    });
  }, [allNetworks, networkId, usdTotal, nativeAmount, changePercent, changeAmount, hasData]);

  // The network the screen stands on, and its chain family. Every surface
  // below follows the NETWORK — `network.blockchain` is the id minus
  // `-mainnet`, so it reads `solana-devnet` off mainnet and an equality test
  // against `'bitcoin'` silently missed `bitcoin-testnet` (spec 026).
  const currentNetworkId = useMemo(
    () => blockchainBalances[activeBlockchainIndex]?.network.id ?? networkId ?? 'solana-mainnet',
    [activeBlockchainIndex, blockchainBalances, networkId]
  );
  const currentChain = getBlockchainFromNetworkId(currentNetworkId);

  // NFTs are a Solana surface. On Bitcoin the tab is not offered at all — it
  // sinks out of the row — and a session sitting on it falls back to Portfolio
  // (owner ruling 3, spec 026). The stored arrangement is untouched, so the
  // tab returns to its own place when the carousel comes back to Solana.
  const nftsOffered = currentChain === 'solana';
  const effectiveSubTab: SubTabKey =
    activeSubTab === 'nfts' && !nftsOffered ? 'portfolio' : activeSubTab;

  // The beat between sink and float (owner, on-device): the incoming content's
  // float waits out the outgoing content's sink plus a short pause — but only
  // once something has actually swapped. On the screen's first mount nothing
  // sinks, so a delay there would read as lag. Tracked with the render-time
  // setState pattern (not a ref: refs cannot be read during render).
  //
  // Three causes can swap content here and they must never speak at once
  // (the verb never nests — DESIGN.md §The balance block's motion, rule 5): a
  // task taking or releasing the screen owns `home-content`, a sub-tab change
  // owns `home-subtab-content`, and a chain change owns `chainContent`. One
  // flag for all used to hand the beat to every wrapper, so a task hand-back
  // sank the screen *and* the list inside it — one gesture at two depths. The
  // cause of the current swap is recorded, and only the wrapper that owns
  // that cause animates. Opening NFTs can also snap the chain to Solana in
  // the same render; that is still one gesture, and the sub-tab is the one
  // the user touched.
  const [contentSwap, setContentSwap] = useState<{
    chain: string;
    subTab: SubTabKey;
    engaged: boolean;
    cause: 'none' | 'chain' | 'subtab' | 'task';
  }>({
    chain: currentNetworkId,
    subTab: effectiveSubTab,
    engaged: isTaskEngaged,
    cause: 'none',
  });
  if (
    contentSwap.chain !== currentNetworkId ||
    contentSwap.subTab !== effectiveSubTab ||
    contentSwap.engaged !== isTaskEngaged
  ) {
    setContentSwap({
      chain: currentNetworkId,
      subTab: effectiveSubTab,
      engaged: isTaskEngaged,
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
  const taskHasPrior = contentSwap.cause === 'task';
  const subTabHasPrior = contentSwap.cause === 'subtab';
  const chainHasPrior = contentSwap.cause === 'chain';

  // BE drops unknown-only-tagged SPL tokens by default; developer mode opts
  // in via `includeSpam` on `useBalance` above. Trust the BE list as-is.
  const tokenListItems = useMemo(() => tokens.map(mapBalanceToToken), [tokens]);

  // Bitcoin coin info + chart data via the shared React Query hook (WP4) —
  // same hook web/extension's HomePage and this app's token detail screen
  // use, replacing this column's own useState+useEffect fetch pair.
  const bitcoinCoinId = currentChain === 'bitcoin' ? BLOCKCHAIN_TO_COINGECKO.bitcoin : undefined;
  const {
    coinInfo: bitcoinCoinInfo,
    chartData: bitcoinChartDataRaw,
    chartLoading: bitcoinDataLoading,
    error: bitcoinDataError,
  } = useCoinMarketData({
    coinId: bitcoinCoinId,
    currency,
    days: PERIOD_TO_DAYS[bitcoinChartPeriod],
    enabled: currentChain === 'bitcoin',
    // A test network's coin has no market: the hook returns nothing off
    // mainnet rather than quoting the mainnet asset's price (spec 026).
    networkId: currentNetworkId,
  });
  const bitcoinChartData: PriceDataPoint[] = bitcoinChartDataRaw ?? [];
  const bitcoinChartError = !!bitcoinDataError && bitcoinChartData.length === 0;

  // Handle chart period change
  const handleChartPeriodChange = useCallback((period: PriceChartPeriod) => {
    setBitcoinChartPeriod(period);
  }, []);

  // Transform CoinInfo to MarketData for MarketDataCard
  const bitcoinMarketData: MarketData | undefined = useMemo(() => {
    if (!bitcoinCoinInfo) return undefined;
    return coinInfoToMarketData(bitcoinCoinInfo);
  }, [bitcoinCoinInfo]);

  // Create a mock Bitcoin token for display
  const bitcoinToken: Token | undefined = useMemo(() => {
    if (!bitcoinCoinInfo?.marketData) return undefined;
    const md = bitcoinCoinInfo.marketData;
    return {
      address: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png',
      price: md.currentPrice,
      uiAmount: 0, // No balance yet
      usdBalance: 0,
      last24HoursChange: md.priceChangePercentage24h
        ? { perc: md.priceChangePercentage24h, abs: md.priceChange24h }
        : null,
      isVerified: true,
    };
  }, [bitcoinCoinInfo]);

  // Handlers
  // Send is a flow of four screens now (spec 018), not a sheet: the first of
  // them is a route like Activity's. The watch-only guard stays on the control
  // *and* on the route — `sendDisabled` below hides the door, the send stack's
  // layout locks it.
  const handleSendPress = useCallback(() => {
    router.push('/send');
  }, [router]);

  const handleReceivePress = useCallback(() => {
    setReceiveSheetVisible(true);
  }, []);

  const handleReceiveSheetClose = useCallback(() => {
    setReceiveSheetVisible(false);
  }, []);

  // The header's copy affordance. Silent by design: the row shows its own
  // checkmark, so a toast on top of it would say the same thing twice.
  const handleHeaderCopyAddress = useCallback(async () => {
    if (!activeBlockchainAccount) return;
    await Clipboard.setStringAsync(activeBlockchainAccount.getReceiveAddress());
  }, [activeBlockchainAccount]);

  const handleReceiveSheetCopy = useCallback(async () => {
    if (!activeBlockchainAccount) return false;
    try {
      await Clipboard.setStringAsync(activeBlockchainAccount.getReceiveAddress());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    } catch (error) {
      console.warn('Failed to copy address:', error);
      return false;
    }
  }, [activeBlockchainAccount]);

  // Activity is a screen of its own (CORE 08) — the pill is a route, not a
  // sheet toggle, and the list owns its own transaction state there.
  const handleActivityPress = useCallback(() => {
    router.push('/activity');
  }, [router]);

  // Token detail is a screen now, not a sheet (spec 019) — the row pushes
  // `/token/[id]` with the mint as `id`; the route resolves the token itself
  // from the same reactive balance list this screen reads.
  const handleTokenPress = useCallback(
    (token: Token) => {
      router.push({ pathname: '/token/[id]', params: { id: token.address } });
    },
    [router]
  );

  const handleBlockchainChange = useCallback(
    (_blockchain: BlockchainId, index: number) => {
      const selectedBalance = blockchainBalances[index];
      if (!selectedBalance) return;
      const newNetworkId = selectedBalance.network.id;
      // `changeNetwork` returns silently when the account has no derivation for
      // the target. Writing the index optimistically regardless left the dots
      // and the amount pointing at a chain the wallet never switched to.
      if (!activeAccount?.networksAccounts?.[newNetworkId]) return;
      setActiveBlockchainIndex(index);
      // The incoming chain's list starts at the top, so the offset the fade
      // reads must start over with it — the same reset the sub-tab switch
      // does. Without it a chain switched while scrolled kept a top fade over
      // content that was no longer scrolled.
      topFadeOpacity.setValue(0);
      void accountActions
        .changeNetwork(newNetworkId)
        .catch((error) => console.warn('[home] changeNetwork failed:', error));
    },
    [blockchainBalances, accountActions, activeAccount, topFadeOpacity]
  );

  // Handle scroll to show/hide top fade gradient dynamically
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      // Fade in when scrolled down, fade out when at top
      const opacity = Math.min(offsetY / TOP_FADE_SCROLL_RANGE, 1);
      topFadeOpacity.setValue(opacity);
    },
    [topFadeOpacity]
  );

  // The keys Home offers; the user's arrangement of them is what gets
  // rendered. A key the app no longer offers is dropped and a key it gained
  // is appended by the hook, so a powerup tab can arrive later without the
  // arrangement being thrown away — and a key with no label here is simply
  // not rendered.
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
  // now also NFTs leaving on Bitcoin and floating back on Solana. Keyed by the
  // rendered keys, so a tab switch (same set) never remounts the row and the
  // underline keeps sliding. First mount owes no verb: render-time setState,
  // the same pattern the content swap uses.
  const subTabsKey = subTabs.map((tab) => tab.key).join('|');
  const [tabsSwap, setTabsSwap] = useState({ key: subTabsKey, hasPrior: false });
  if (tabsSwap.key !== subTabsKey) {
    setTabsSwap({ key: subTabsKey, hasPrior: true });
  }

  // The tab is only offered where it means something, so there is nothing to
  // snap: opening NFTs used to drag the balance carousel back to Solana, which
  // moved the chain the user was standing on without being asked (owner ruling
  // 3, spec 026).
  const handleSubTabChange = useCallback(
    (key: string) => {
      // Each sub-tab has its own scroll view, so the offset the fade reads
      // must start over with it.
      topFadeOpacity.setValue(0);
      setActiveSubTab(key as SubTabKey);
    },
    [topFadeOpacity]
  );

  const handleOrderPress = useCallback(() => setOrderSheetVisible(true), []);
  const handleOrderSheetClose = useCallback(() => setOrderSheetVisible(false), []);

  // Memoize the empty component
  // IMPORTANT: This hook must be called BEFORE any early returns to follow React's Rules of Hooks
  // The list only renders this once the load settled (TokenList shows the
  // skeleton only while `balanceState` is 'loading'), so there is no loading
  // branch here. A failed load with nothing cached is an error state, never
  // "No tokens found" — PRODUCT.md keeps those two answers distinguishable.
  const ListEmptyComponent = useMemo(
    () =>
      balanceState === 'error' ? (
        <StateBlock
          tone="error"
          testID="token-list-error"
          title={t('wallet.tokens_load_error', "Your tokens couldn't be loaded right now.")}
          onRetry={refresh}
          retryLabel={t('actions.retry', 'Retry')}
          retryTestID="token-list-retry-button"
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
      ),
    [balanceState, refresh, t]
  );

  // Loading state - wait for hook to be ready
  // Note: If we're on this screen, the lock overlay has been
  // dismissed, which means unlock succeeded and accounts should be loaded
  // DESIGN.md §Sheets: the loading state is the `ShimmerRect` pulse rather
  // than a spinner. The screen below (once `ready`) shows this same skeleton
  // while `balanceState === 'loading'` (see the sub-tabs content further
  // down), so a bare mount waiting on the accounts hook gets the identical
  // shape rather than a second, spinner-based idiom for the same wait.
  if (!ready) {
    return (
      <View style={[styles.container, styles.tabGutter]} testID="home-loading">
        <SkeletonRow padding="lg" leadingSize={44} trailingWidth={64} count={5} />
      </View>
    );
  }

  // No account state (only show if accounts array is empty)
  if (!activeAccount || !activeBlockchainAccount) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('wallet.no_account_found', 'No account found')}</Text>
      </View>
    );
  }

  // `address` is defined above, next to the account state it comes from.

  // The block above the content. It is fixed on both sub-tabs — nothing above
  // the sub-tab row scrolls (owner, 2026-09-01).
  const balanceBlock = (
    <BalanceHeader
      blockchains={blockchainBalances}
      hiddenBalance={hiddenBalance}
      onToggleVisibility={toggleHidden}
      onBlockchainChange={handleBlockchainChange}
      activeIndex={activeBlockchainIndex}
      onSendPress={handleSendPress}
      onReceivePress={handleReceivePress}
      onActivityPress={handleActivityPress}
      sendDisabled={isWatchOnlyAccount(activeAccount)}
    />
  );

  const subTabsRow = (
    <PortfolioSubTabs
      tabs={subTabs}
      activeKey={effectiveSubTab}
      onChange={handleSubTabChange}
      onOrderPress={handleOrderPress}
      // A reorder swaps the tabs on the verb — old arrangement sinks, new one
      // floats — while the order button beside them holds still. Keyed by the
      // arrangement, so a tab switch never remounts them.
      tabsKey={subTabsKey}
      tabsEntering={
        tabsSwap.hasPrior
          ? floatEntering(isReduceMotionEnabled, { delayMs: FLOAT_DELAY_MS })
          : undefined
      }
      tabsExiting={tabsSwap.hasPrior ? sinkExiting(isReduceMotionEnabled) : undefined}
    />
  );

  // The one mask on this screen: the seam between the fixed row above and the
  // list scrolling under it. It starts on the ramp's own top stop and ends on
  // that same colour at alpha 0, so it clears without smudging on either
  // ground. There is no opaque band any more — nothing scrolls under the
  // header for a band to hide.
  const topFade = (
    <Animated.View
      style={[styles.topFadeGradient, { opacity: topFadeOpacity }]}
      pointerEvents="none"
    >
      <LinearGradient colors={semantic.water.fadeTop} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );

  return (
    <View style={styles.container} testID="home-screen">
      {/* The identity line. It belongs to Home and is mounted here rather than
          in the tab shell: the shell renders under every pushed screen, so a
          header mounted there painted over the title of Settings and Wallets.
          It is the screen's first child in flow — it owns its top padding
          (safe area + `screenTop`) and nothing scrolls behind it. */}
      <WalletHeader
        accountName={activeAccount?.name || t('wallet.unnamed_account', 'Account')}
        address={activeBlockchainAccount?.getReceiveAddress() || ''}
        onCopyAddress={handleHeaderCopyAddress}
        onSettingsPress={() => router.push('/settings')}
        onWalletPress={() => router.push('/wallets')}
        developerMode={developerNetworks}
        networkId={currentNetworkId}
        avatarUrl={activeAccount?.avatar}
        accountId={activeAccount?.id}
      />
      {/* The balance, the sub-tabs, the content and the FAB are CONTENT, not
          chrome: when a task engages the shell they leave with the verb at
          full depth (the chrome's half depth is the header row's business, not
          theirs). Conditional render is the mechanism — the same one the
          swap's step changes use — so unmount plays the sink and remount plays
          the float. The wrapper sits inside the screen, which is itself a
          sibling of the mounted ground in `(tabs)/_layout.tsx`: the water
          never travels with it. */}
      {!isTaskEngaged && (
        <Reanimated.View
          // Keyed on the surface count: the content remounts — and floats —
          // when the lock overlay leaves, instead of having floated unseen
          // under it. Mounted while still locked it owes no verb; the float
          // belongs to the surfacing.
          key={surfaceKey}
          testID="home-content"
          style={styles.content}
          entering={
            accountState.locked
              ? undefined
              : floatEntering(isReduceMotionEnabled, {
                  delayMs: taskHasPrior ? FLOAT_DELAY_MS : 0,
                })
          }
          exiting={sinkExiting(isReduceMotionEnabled)}
        >
          {/* Fixed on both sub-tabs, and mounted under ONE parent so the row
              is the same instance across a switch: `UnderlineTabs` only slides
              its underline if it is not remounted. */}
          <View style={styles.pinnedHeader}>
            {balanceBlock}
            <View style={styles.pinnedSubTabs}>{subTabsRow}</View>
          </View>

          {/* The content region plays the verb on a sub-tab change: the
              outgoing list sinks, the incoming one floats — NFTs used to
              appear from nothing (owner, on device). Keyed by sub-tab so the
              swap is a remount, the same mechanism the chain swap uses; the
              block above it holds still (rule four). */}
          <Reanimated.View
            key={effectiveSubTab}
            testID="home-subtab-content"
            style={styles.chainContent}
            entering={
              subTabHasPrior
                ? floatEntering(isReduceMotionEnabled, { delayMs: FLOAT_DELAY_MS })
                : undefined
            }
            exiting={subTabHasPrior ? sinkExiting(isReduceMotionEnabled) : undefined}
          >
            {effectiveSubTab === 'portfolio' ? (
              <>
                {/* Partial-load failure: keep whatever data loaded visible;
                  retry is pull-to-refresh on the token list. Only 'ready'
                  carries data, so a total failure is left to the list's own
                  error state rather than told "shown data may be incomplete". */}
                {balanceError && balanceState === 'ready' && !switchingNetwork && (
                  <View style={styles.balanceErrorBanner} testID="balance-load-error">
                    <WarningNotice
                      tone="warning"
                      title={t(
                        'wallet.partial_load_error',
                        "Some balances couldn't be loaded. Shown data may be incomplete."
                      )}
                    />
                  </View>
                )}

                {/* Scrollable Token List or Bitcoin View.
                  Keyed by chain so switching chains swaps the whole container
                  with the sink and the float: the outgoing chain's content
                  sinks 12dp as its light goes, the incoming one floats up into
                  place. The frame above holds still; only the content travels.
                  Under reduce motion both props are undefined and the swap
                  stays instant. */}
                <View style={styles.listContainer}>
                  <Reanimated.View
                    key={currentNetworkId}
                    testID="home-chain-content"
                    style={styles.chainContent}
                    // Only a chain change moves this wrapper. It remounts on a
                    // task hand-back too (it lives inside `home-content`), and
                    // animating there stacked a second sink/float on the one
                    // the screen was already playing.
                    entering={
                      chainHasPrior
                        ? floatEntering(isReduceMotionEnabled, { delayMs: FLOAT_DELAY_MS })
                        : undefined
                    }
                    exiting={chainHasPrior ? sinkExiting(isReduceMotionEnabled) : undefined}
                  >
                    {currentChain === 'bitcoin' ? (
                      // Bitcoin lives inside Portfolio with chart, market data
                      // and about — it has no asset-detail screen of its own.
                      <ScrollView
                        style={styles.bitcoinScrollView}
                        contentContainerStyle={[
                          styles.bitcoinContent,
                          styles.tabGutter,
                          { paddingBottom: floatingBottomOffset },
                        ]}
                        showsVerticalScrollIndicator={false}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                      >
                        {/* Price Chart */}
                        {/* The one card that does not sit inside the column's
                          gutters: it runs off the left screen edge and stops
                          a gutter short of the right. */}
                        <PriceChart
                          data={bitcoinChartData}
                          selectedPeriod={bitcoinChartPeriod}
                          onPeriodChange={handleChartPeriodChange}
                          loading={bitcoinDataLoading && bitcoinChartData.length === 0}
                          error={bitcoinChartError}
                          height={180}
                          bleed
                        />

                        {/* Bitcoin Token Item (non-pressable — detail is already shown inline) */}
                        {balanceState === 'loading' ? (
                          <SkeletonRow padding="lg" leadingSize={44} trailingWidth={50} />
                        ) : balanceState === 'error' ? (
                          /* A load that failed with nothing cached owes the user
                           the error state and its retry, never an endless
                           skeleton. */
                          ListEmptyComponent
                        ) : (
                          bitcoinToken && (
                            <TokenListItem
                              token={bitcoinToken}
                              hiddenBalance={hiddenBalance}
                              blockchain="bitcoin"
                              // The column already spaces its children by 20
                              // (`gap`); the row's own list margin would make
                              // it 40 under this one card.
                              style={styles.bitcoinCard}
                            />
                          )
                        )}

                        {/* Market Data */}
                        <MarketDataCard
                          data={bitcoinMarketData}
                          symbol="BTC"
                          loading={bitcoinDataLoading && !bitcoinCoinInfo}
                        />

                        {/* About Section - at the end */}
                        <AboutCard
                          description={bitcoinCoinInfo?.description}
                          loading={bitcoinDataLoading && !bitcoinCoinInfo}
                        />
                      </ScrollView>
                    ) : (
                      // Normal token list for Solana/Ethereum
                      <TokenList
                        tokens={tokenListItems}
                        loading={balanceState === 'loading'}
                        onTokenPress={handleTokenPress}
                        hiddenBalance={hiddenBalance}
                        ListEmptyComponent={ListEmptyComponent}
                        onRefresh={refresh}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        contentContainerStyle={[
                          styles.listContent,
                          styles.tabGutter,
                          { paddingBottom: floatingBottomOffset },
                        ]}
                        blockchain={currentChain}
                      />
                    )}
                  </Reanimated.View>
                  {/* Top fade gradient - shows only when scrolled, fades in dynamically */}
                  {topFade}
                </View>
              </>
            ) : (
              // NFTs: the grid owns the only scroll view in the content region,
              // and everything above it is the same fixed block Portfolio shows.
              <View style={styles.listContainer}>
                <NftsTab
                  contentContainerStyle={styles.tabGutter}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                />
                {topFade}
              </View>
            )}
          </Reanimated.View>
        </Reanimated.View>
      )}

      {/* The sub-tab arrangement. It applies live: the row above re-flows as
          rows are dropped, and there is nothing to save. */}
      <HomeTabOrderSheet
        visible={orderSheetVisible}
        onClose={handleOrderSheetClose}
        tabs={subTabs}
        onOrderChange={setSubTabOrder}
      />

      {/* Receive Sheet */}
      <ReceiveSheet
        visible={receiveSheetVisible}
        onClose={handleReceiveSheetClose}
        address={address}
        // networkId is the single chain source for sheet props — `address`
        // already derives from it.
        blockchain={currentChain}
        // Off mainnet the sheet names the environment under the code: a
        // deposit to a devnet address is not money (spec 026 D6).
        networkLabel={getNetworkLabel(currentNetworkId) ?? undefined}
        onCopy={handleReceiveSheetCopy}
      />

      {/* The question the derived-account scan raises, asked over Home and
          nowhere else: the scan belongs to the unlocked session, so its answer
          is taken on the first screen the session lands on. */}
      <DerivedAccountsSheet
        visible={derivedAccounts.sheetVisible}
        finds={derivedAccounts.finds}
        onImport={(indexes) => void derivedAccounts.importFinds(indexes)}
        onDismiss={() => void derivedAccounts.dismiss()}
      />
    </View>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: t.text.secondary,
      fontSize: s(fontSize.bodyLg),
      marginTop: spacing.lg,
    },
    content: {
      flex: 1,
    },
    // The one gutter every Home sub-tab is held to. It lives on the content
    // containers here, not inside the tab components — a tab that drew its own
    // padding (or forgot to, as the NFTs grid did) is how the columns drifted.
    tabGutter: {
      paddingHorizontal: s(spacing.screenGutter),
    },
    // Block seams are the component gap (20), on both sub-tabs: header row →
    // balance block is this padding, balance block → sub-tabs row is
    // `pinnedSubTabs`' marginTop, sub-tabs row → content region is the bottom
    // padding. The anatomy inside each block keeps the finer 4/8/12 steps.
    pinnedHeader: {
      paddingHorizontal: s(spacing.screenGutter),
      paddingTop: vs(spacing.xl),
      paddingBottom: vs(spacing.xl),
    },
    pinnedSubTabs: {
      marginTop: vs(spacing.xl),
    },
    listContainer: {
      flex: 1,
    },
    chainContent: {
      flex: 1,
    },
    balanceErrorBanner: {
      marginHorizontal: s(spacing.screenGutter),
      marginBottom: vs(spacing.xl),
    },
    listContent: {
      paddingTop: 0,
      paddingBottom: vs(componentSizes.tabBarScrollPadding),
    },
    topFadeGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: componentSizes.sheetFadeGradientHeight,
      zIndex: 1,
    },
    // Bitcoin view styles
    bitcoinCard: {
      marginBottom: 0,
    },
    bitcoinScrollView: {
      flex: 1,
    },
    bitcoinContent: {
      paddingTop: 0,
      paddingBottom: vs(componentSizes.tabBarScrollPadding),
      // The component gap (DESIGN.md §Layout): chart, market data and About are
      // sibling components on this surface.
      gap: vs(spacing.screenGutter),
    },
  });
