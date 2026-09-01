/**
 * HomeScreen - Main wallet overview screen
 *
 * Displays:
 * - GateContainer header: Account name, address, settings navigation
 * - BalanceHeader: swipeable per-chain balance + Send / Receive / History
 * - PortfolioSubTabs: in-page "Portfolio | NFTs" row (the bottom tab bar is gone)
 * - Portfolio content: TokenList, or the Bitcoin chart/market/about column
 * - NFTs content: NftsTab
 * - PowerupsFab: the floating `+` that opens the Powerups launcher
 *
 * Features:
 * - Pull-to-refresh for balance updates
 * - Balance visibility toggle (privacy mode)
 * - Multi-chain carousel (Solana, Bitcoin, Ethereum)
 * - Navigation to token detail, send, receive, and activity screens
 */

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Animated,
  LayoutChangeEvent,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Reanimated, { useReducedMotion } from 'react-native-reanimated';

import {
  borderRadius,
  colors,
  componentSizes,
  fontFamilyNative,
  fontSize,
  getCoinInfo,
  getMarketChart,
  getTokenMarketChart,
  getTokenCoinInfo,
  s,
  spacing,
  useAccountsContext,
  useAvailableNetworks,
  useBalance,
  usePrefetchBalances,
  useCurrencyContext,
  useTransactions,
  isWatchOnlyAccount,
  vs,
  getBlockchainFromNetworkId,
  BLOCKCHAIN_TO_COINGECKO,
  PERIOD_TO_DAYS,
  coinInfoToMarketData,
  type CoinInfo,
  type NetworkId,
  type PriceChartPeriod,
  type PriceDataPoint,
  type Token,
  semantic,
} from '@salmon/shared';
import {
  BalanceHeader,
  NftsTab,
  PortfolioSubTabs,
  PowerupsFab,
  PowerupsLauncherSheet,
  PriceChart,
  ReceiveSheet,
  SendSheet,
  TokenAbout,
  TokenInformationSheet,
  TokenList,
  TokenListItem,
  TokenListSkeleton,
  TokenMarketData,
  TransactionHistorySheet,
  WarningNotice,
  type BlockchainBalance,
  type BlockchainId,
  type MarketData,
  type Transaction,
} from '../../../src/components';
import { useDeveloperMode } from '../../../src/contexts/DeveloperModeContext';
import { useTaskChrome } from '../../../src/contexts/TaskChromeContext';
import { FLOAT_DELAY_MS, floatEntering, sinkExiting } from '../../../src/utils/sinkAndFloat';
import { useTabChrome } from '../../../hooks/useTabChrome';

/**
 * Maps context networkId to transaction API networkId format.
 * Since network IDs now match the API format directly, this is mostly a passthrough.
 */
function getTransactionNetworkId(networkId: string | null): string {
  if (!networkId) return 'solana-mainnet';
  return networkId;
}

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

/** Fraction of the balance block's travel after which the sticky row grounds. */
const STICKY_SCRIM_START = 0.6;

/** The two in-page sub-tabs. NFTs only exist on Solana — see `handleSubTabChange`. */
type SubTabKey = 'portfolio' | 'nfts';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { headerContentOffset, floatingBottomOffset } = useTabChrome();
  // A task that takes the screen owns it: the home content leaves with the
  // same verb the chrome does, so the flow finds empty water behind it.
  const { isTaskEngaged } = useTaskChrome();
  const isReduceMotionEnabled = useReducedMotion();
  const [{ currency }] = useCurrencyContext();

  // Everything the screen owns starts below the absolute wallet header, one
  // `.pen` vertical gap under it. The header's own top padding (safe area +
  // `screenTop`) is already inside `headerContentOffset`.
  const contentTopOffset = headerContentOffset + vs(spacing.xl);

  // Top fade gradient opacity - animated based on scroll position
  const topFadeOpacity = useRef(new Animated.Value(0)).current;
  // Raw scroll offset of whichever sub-tab owns the screen. On NFTs it also
  // drives the sticky sub-tab row (see `subTabsTranslateY`).
  const scrollY = useRef(new Animated.Value(0)).current;

  // Active blockchain index for carousel
  const [activeBlockchainIndex, setActiveBlockchainIndex] = useState(0);

  // In-page sub-tab (replaces the removed bottom tab bar)
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('portfolio');

  // Powerups launcher sheet visibility
  const [powerupsVisible, setPowerupsVisible] = useState(false);

  // Measured once per layout so the sticky sub-tab row knows how far the
  // balance block has to travel before it pins, and how much room to reserve
  // for itself inside the NFT list header.
  const [balanceBlockHeight, setBalanceBlockHeight] = useState(0);
  const [subTabsHeight, setSubTabsHeight] = useState(0);

  // Bitcoin-specific data states
  const [bitcoinChartData, setBitcoinChartData] = useState<PriceDataPoint[]>([]);
  const [bitcoinCoinInfo, setBitcoinCoinInfo] = useState<CoinInfo | null>(null);
  const [bitcoinChartPeriod, setBitcoinChartPeriod] = useState<PriceChartPeriod>('1M');
  const [bitcoinDataLoading, setBitcoinDataLoading] = useState(false);
  const [bitcoinChartError, setBitcoinChartError] = useState(false);

  // TokenInformationSheet states
  const [tokenSheetVisible, setTokenSheetVisible] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedTokenChartData, setSelectedTokenChartData] = useState<PriceDataPoint[]>([]);
  const [selectedTokenCoinInfo, setSelectedTokenCoinInfo] = useState<CoinInfo | null>(null);
  const [selectedTokenChartPeriod, setSelectedTokenChartPeriod] = useState<PriceChartPeriod>('1M');
  const [selectedTokenMarketData, setSelectedTokenMarketData] = useState<MarketData | undefined>(
    undefined
  );
  const [selectedTokenLoading, setSelectedTokenLoading] = useState(false);
  const [selectedTokenChartError, setSelectedTokenChartError] = useState(false);

  // ReceiveSheet visibility
  const [receiveSheetVisible, setReceiveSheetVisible] = useState(false);

  // SendSheet visibility
  const [sendSheetVisible, setSendSheetVisible] = useState(false);

  // TransactionHistorySheet visibility
  const [transactionHistoryVisible, setTransactionHistoryVisible] = useState(false);

  // Get account state and actions from shared context
  const [accountState, accountActions] = useAccountsContext();
  const { ready, activeAccount, activeBlockchainAccount, networkId, pathIndex, switchingNetwork } =
    accountState;

  useEffect(() => {
    if (!accountState.locked) return;

    setTokenSheetVisible(false);
    setReceiveSheetVisible(false);
    setSendSheetVisible(false);
    setTransactionHistoryVisible(false);
    setPowerupsVisible(false);
  }, [accountState.locked]);

  // Developer mode — shared via context from _layout.tsx (single source of truth)
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

  // Get available networks filtered by developer mode
  const { allNetworks: availableNetworks } = useAvailableNetworks({
    activeBlockchainAccount: userConfigAccount,
    developerNetworks,
  });

  // Filter networks to only include those the user has accounts for
  // This prevents showing networks in the carousel that the user can't switch to
  // (e.g., accounts created before multi-chain derivation won't have BTC/ETH)
  const allNetworks = useMemo(() => {
    if (!activeAccount?.networksAccounts) return availableNetworks;

    const userNetworkIds = Object.keys(activeAccount.networksAccounts);
    return availableNetworks.filter((network) => userNetworkIds.includes(network.id));
  }, [availableNetworks, activeAccount?.networksAccounts]);

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
    // Surface unverified tokens only in developer mode; BE filters
    // unknown-only-tagged SPL entries by default.
    includeSpam: developerNetworks,
  });

  // Warm the chains the user is not looking at, so the first swipe of the
  // session lands on a number instead of a skeleton. One request per inactive
  // chain per app load — see the hook for why it is not per switch.
  usePrefetchBalances({
    account: activeAccount,
    networkIds: allNetworks.map((network) => network.id as NetworkId),
    activeNetworkId: (networkId ?? undefined) as NetworkId | undefined,
    pathIndex,
    includeSpam: developerNetworks,
  });

  // RQ handles refetch-on-focus via QueryClient defaults (refetchOnWindowFocus).

  // Clear switching network flag once new data has loaded
  useEffect(() => {
    if (!loading && switchingNetwork) {
      accountActions.clearSwitchingNetwork();
    }
  }, [loading, switchingNetwork, accountActions]);

  // Get transaction history for current account
  const address = activeBlockchainAccount?.getReceiveAddress() ?? '';
  const {
    transactions: historyTransactions,
    loading: transactionsLoading,
    loadingMore: transactionsLoadingMore,
    error: transactionsError,
    hasMore: transactionsHasMore,
    loadMore: transactionsLoadMore,
    refresh: transactionsRefresh,
  } = useTransactions({
    address,
    networkId: getTransactionNetworkId(networkId) as NetworkId,
    skip: !ready || !activeBlockchainAccount,
    account: activeBlockchainAccount,
  });

  // Create blockchain balances array for carousel
  // Maps available networks from useAvailableNetworks to BlockchainBalance objects
  const blockchainBalances: BlockchainBalance[] = useMemo(() => {
    return allNetworks.map((network) => {
      const blockchain = network.id.replace('-mainnet', '') as BlockchainId;
      const isActiveNetwork = network.id === networkId;

      let balanceData: {
        usdTotal: number | undefined;
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
          changePercent: showSkeleton ? undefined : changePercent,
          changeAmount: showSkeleton ? undefined : changeAmount,
          loading: showSkeleton,
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
        network: {
          id: network.id,
          name: network.name,
          blockchain,
        },
        ...balanceData,
      };
    });
  }, [allNetworks, networkId, usdTotal, changePercent, changeAmount, hasData]);

  // Get current blockchain type for TokenList styling
  const currentBlockchain = useMemo(() => {
    const activeBalance = blockchainBalances[activeBlockchainIndex];
    return activeBalance?.network.blockchain || 'solana';
  }, [activeBlockchainIndex, blockchainBalances]);

  // The beat between sink and float (owner, on-device): the incoming chain's
  // float waits out the outgoing chain's sink plus a short pause — but only
  // once a chain has actually switched. On the screen's first mount nothing
  // sinks, so a delay there would read as lag. Tracked with the render-time
  // setState pattern (not a ref: refs cannot be read during render).
  // A task disengaging is the same shape of event: the content really sank
  // when the task took the screen, so its return owes the beat too. Both
  // triggers feed one flag and one delay, so a chain switch that lands on a
  // task hand-back still waits exactly one beat instead of two.
  const [contentSwap, setContentSwap] = useState({
    chain: currentBlockchain,
    engaged: isTaskEngaged,
    hasPrior: false,
  });
  if (contentSwap.chain !== currentBlockchain || contentSwap.engaged !== isTaskEngaged) {
    setContentSwap({ chain: currentBlockchain, engaged: isTaskEngaged, hasPrior: true });
  }
  const contentFloatDelayMs = contentSwap.hasPrior ? FLOAT_DELAY_MS : 0;

  // BE drops unknown-only-tagged SPL tokens by default; developer mode opts
  // in via `includeSpam` on `useBalance` above. Trust the BE list as-is.
  const tokenListItems = useMemo(() => tokens.map(mapBalanceToToken), [tokens]);

  // Load Bitcoin chart data when user swipes to Bitcoin or changes period
  useEffect(() => {
    const loadBitcoinChartData = async () => {
      if (currentBlockchain !== 'bitcoin') return;

      setBitcoinDataLoading(true);
      setBitcoinChartError(false);
      try {
        const coinId = BLOCKCHAIN_TO_COINGECKO[currentBlockchain];
        const days = PERIOD_TO_DAYS[bitcoinChartPeriod];

        const chartResponse = await getMarketChart(coinId, days, currency);

        // Transform chart data to PriceDataPoint format
        if (chartResponse?.prices) {
          const priceData: PriceDataPoint[] = chartResponse.prices.map(([timestamp, price]) => ({
            timestamp,
            price,
          }));
          setBitcoinChartData(priceData);
        }
      } catch (error) {
        console.error('Failed to load Bitcoin chart data:', error);
        setBitcoinChartError(true);
      } finally {
        setBitcoinDataLoading(false);
      }
    };

    loadBitcoinChartData();
  }, [currentBlockchain, bitcoinChartPeriod, currency]);

  // Load Bitcoin coin info once when user swipes to Bitcoin
  useEffect(() => {
    const loadBitcoinCoinInfo = async () => {
      if (currentBlockchain !== 'bitcoin') return;
      if (bitcoinCoinInfo) return; // Already loaded

      try {
        const coinId = BLOCKCHAIN_TO_COINGECKO[currentBlockchain];
        const infoResponse = await getCoinInfo(coinId, currency);
        if (infoResponse) {
          setBitcoinCoinInfo(infoResponse);
        }
      } catch (error) {
        console.error('Failed to load Bitcoin coin info:', error);
      }
    };

    loadBitcoinCoinInfo();
  }, [currentBlockchain, bitcoinCoinInfo, currency]);

  // Load selected token chart data when token is selected or period changes
  // (classic endpoint by coingeckoId, contract-address fallback by mint;
  // null means "no chart" and keeps the chart section hidden without error)
  useEffect(() => {
    const loadSelectedTokenChartData = async () => {
      if (!selectedToken || !tokenSheetVisible) return;

      if (!selectedToken.coingeckoId && !selectedToken.address) return;

      setSelectedTokenLoading(true);
      setSelectedTokenChartError(false);
      try {
        const days = PERIOD_TO_DAYS[selectedTokenChartPeriod];
        const chartResponse = await getTokenMarketChart(
          { coingeckoId: selectedToken.coingeckoId ?? undefined, address: selectedToken.address },
          days,
          currency
        );

        if (chartResponse?.prices) {
          const priceData: PriceDataPoint[] = chartResponse.prices.map(([timestamp, price]) => ({
            timestamp,
            price,
          }));
          setSelectedTokenChartData(priceData);
        }
      } catch (error) {
        console.error('Failed to load token chart data:', error);
        setSelectedTokenChartError(true);
      } finally {
        setSelectedTokenLoading(false);
      }
    };

    loadSelectedTokenChartData();
  }, [selectedToken, selectedTokenChartPeriod, tokenSheetVisible, currency]);

  // Load selected token coin info when token is selected
  useEffect(() => {
    const loadSelectedTokenCoinInfo = async () => {
      if (!selectedToken || !tokenSheetVisible) return;

      if (!selectedToken.coingeckoId && !selectedToken.address) return;

      try {
        const infoResponse = await getTokenCoinInfo(
          { coingeckoId: selectedToken.coingeckoId ?? undefined, address: selectedToken.address },
          currency
        );
        if (infoResponse) {
          setSelectedTokenCoinInfo(infoResponse);

          setSelectedTokenMarketData(coinInfoToMarketData(infoResponse));
        }
      } catch (error) {
        console.error('Failed to load token coin info:', error);
      }
    };

    loadSelectedTokenCoinInfo();
  }, [selectedToken, tokenSheetVisible, currency]);

  // Handle chart period change
  const handleChartPeriodChange = useCallback((period: PriceChartPeriod) => {
    setBitcoinChartPeriod(period);
  }, []);

  // Transform CoinInfo to MarketData for TokenMarketData component
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
  const handleSendPress = useCallback(() => {
    setSendSheetVisible(true);
  }, []);

  const handleReceivePress = useCallback(() => {
    setReceiveSheetVisible(true);
  }, []);

  const handleReceiveSheetClose = useCallback(() => {
    setReceiveSheetVisible(false);
  }, []);

  const handleSendSheetClose = useCallback(() => {
    setSendSheetVisible(false);
  }, []);

  const handleSendSuccess = useCallback(
    (_txId: string) => {
      setSendSheetVisible(false);
      refresh();
    },
    [refresh]
  );

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

  const handleActivityPress = useCallback(() => {
    setTransactionHistoryVisible(true);
  }, []);

  const handleTokenPress = useCallback((token: Token) => {
    // Reset previous token data
    setSelectedTokenChartData([]);
    setSelectedTokenCoinInfo(null);
    setSelectedTokenMarketData(undefined);
    setSelectedTokenChartPeriod('1M');
    // Set selected token and show sheet
    setSelectedToken(token);
    setTokenSheetVisible(true);
  }, []);

  const handleTokenSheetClose = useCallback(() => {
    setTokenSheetVisible(false);
    // Clear selected token after animation
    setTimeout(() => {
      setSelectedToken(null);
    }, 300);
  }, []);

  const handleTransactionHistoryClose = useCallback(() => {
    setTransactionHistoryVisible(false);
  }, []);

  // Handler for tap on transaction. The detail is a step inside the activity
  // sheet, so the sheet owns the step; this only marks the touch.
  const handleTransactionPress = useCallback((_transaction: Transaction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Handler to view transaction in explorer (from the detail step)
  const handleViewExplorer = useCallback(
    (transaction: Transaction) => {
      const explorerUrl =
        networkId === 'solana-devnet'
          ? `https://solscan.io/tx/${transaction.id}?cluster=devnet`
          : `https://solscan.io/tx/${transaction.id}`;
      Linking.openURL(explorerUrl);
    },
    [networkId]
  );

  // Handler to share transaction (from the detail step)
  const handleShareTransaction = useCallback(
    async (transaction: Transaction) => {
      const explorerUrl =
        networkId === 'solana-devnet'
          ? `https://solscan.io/tx/${transaction.id}?cluster=devnet`
          : `https://solscan.io/tx/${transaction.id}`;
      try {
        await Share.share({
          message: t('transactions.share_message', 'Check out this transaction: {{url}}', {
            url: explorerUrl,
          }),
          url: explorerUrl,
        });
      } catch (error) {
        console.error('Failed to share transaction:', error);
      }
    },
    [networkId, t]
  );

  const handleSelectedTokenChartPeriodChange = useCallback((period: PriceChartPeriod) => {
    setSelectedTokenChartPeriod(period);
  }, []);

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
      void accountActions
        .changeNetwork(newNetworkId)
        .catch((error) => console.warn('[home] changeNetwork failed:', error));
    },
    [blockchainBalances, accountActions, activeAccount]
  );

  // Handle scroll to show/hide top fade gradient dynamically
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      // Fade in when scrolled down, fade out when at top
      const opacity = Math.min(offsetY / TOP_FADE_SCROLL_RANGE, 1);
      topFadeOpacity.setValue(opacity);
      scrollY.setValue(offsetY);
    },
    [topFadeOpacity, scrollY]
  );

  const handleBalanceBlockLayout = useCallback((event: LayoutChangeEvent) => {
    setBalanceBlockHeight(event.nativeEvent.layout.height);
  }, []);

  const handleSubTabsLayout = useCallback((event: LayoutChangeEvent) => {
    setSubTabsHeight(event.nativeEvent.layout.height);
  }, []);

  const subTabs = useMemo(
    () => [
      { key: 'portfolio', label: t('tabs.portfolio', 'Portfolio') },
      { key: 'nfts', label: t('tabs.nfts', 'NFTs') },
    ],
    [t]
  );

  // NFTs live on Solana only. Rather than hiding the tab on other chains, the
  // tap takes the balance home first — through the very same handler the page
  // dots use, so the chain-switch animation and the network change are the
  // ones the user already knows.
  const handleSubTabChange = useCallback(
    (key: string) => {
      if (key === 'nfts') {
        const solanaIndex = blockchainBalances.findIndex(
          (balance) => balance.network.blockchain === 'solana'
        );
        if (solanaIndex >= 0 && solanaIndex !== activeBlockchainIndex) {
          handleBlockchainChange('solana', solanaIndex);
        }
      }
      // Each sub-tab has its own scroll view, so the offsets the fade and the
      // sticky row read must start over with it.
      scrollY.setValue(0);
      topFadeOpacity.setValue(0);
      setActiveSubTab(key as SubTabKey);
    },
    [activeBlockchainIndex, blockchainBalances, handleBlockchainChange, scrollY, topFadeOpacity]
  );

  // CORE 16 lands in a later lote; the control renders and does nothing until
  // then, so the row's geometry is already the final one.
  const handlePortfolioVisibilityPress = useCallback(() => {}, []);

  // The FAB is a toggle: open the launcher, or close it from the same mark
  // it turned into.
  const handlePowerupsPress = useCallback(() => {
    setPowerupsVisible((visible) => !visible);
  }, []);

  const handlePowerupsClose = useCallback(() => {
    setPowerupsVisible(false);
  }, []);

  // The sticky sub-tab row rides the NFT grid's own scroll offset: it starts
  // directly under the balance block and stops once it reaches the chrome, so
  // the user can switch back without scrolling to the top. One scroll view,
  // no nesting.
  const subTabsTranslateY = useMemo(
    () =>
      balanceBlockHeight > 0
        ? scrollY.interpolate({
            inputRange: [0, balanceBlockHeight],
            outputRange: [balanceBlockHeight, 0],
            extrapolate: 'clamp',
          })
        : 0,
    [balanceBlockHeight, scrollY]
  );

  // The row only earns an opaque ground once it actually covers the grid;
  // before that it sits over open water and must not paint a band.
  const subTabsScrimOpacity = useMemo(
    () =>
      balanceBlockHeight > 0
        ? scrollY.interpolate({
            inputRange: [balanceBlockHeight * STICKY_SCRIM_START, balanceBlockHeight],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          })
        : 0,
    [balanceBlockHeight, scrollY]
  );

  // Memoize the empty component
  // IMPORTANT: This hook must be called BEFORE any early returns to follow React's Rules of Hooks
  // The list only renders this once the load settled (TokenList shows the
  // skeleton only while `balanceState` is 'loading'), so there is no loading
  // branch here. A failed load with nothing cached is an error state, never
  // "No tokens found" — PRODUCT.md keeps those two answers distinguishable.
  const ListEmptyComponent = useMemo(
    () =>
      balanceState === 'error' ? (
        <View style={styles.emptyState} testID="token-list-error">
          <Text style={styles.emptyStateText}>
            {t('wallet.tokens_load_error', "Your tokens couldn't be loaded right now.")}
          </Text>
          <TouchableOpacity
            onPress={refresh}
            accessibilityRole="button"
            testID="token-list-retry-button"
          >
            <Text style={styles.retryText}>{t('actions.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {t('wallet.no_tokens_found', 'No tokens found')}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {t(
              'wallet.tokens_empty_subtitle',
              'Your tokens will appear here once you receive some'
            )}
          </Text>
        </View>
      ),
    [balanceState, refresh, t]
  );

  // Loading state - wait for hook to be ready
  // Note: If we're on this screen, the GateContainer lock state has been
  // dismissed, which means unlock succeeded and accounts should be loaded
  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
        <Text style={styles.loadingText}>{t('wallet.loading_wallet', 'Loading wallet...')}</Text>
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

  // address is already defined above for useTransactions hook

  // The block above the content, shared by both sub-tabs. On Portfolio it is
  // pinned; on NFTs it is the grid's list header, so it scrolls away.
  const balanceBlock = (
    <BalanceHeader
      blockchains={blockchainBalances}
      hiddenBalance={hiddenBalance}
      onToggleVisibility={toggleHidden}
      onBlockchainChange={handleBlockchainChange}
      activeIndex={activeBlockchainIndex}
      showNetworkLabel={developerNetworks}
      onSendPress={handleSendPress}
      onReceivePress={handleReceivePress}
      onActivityPress={handleActivityPress}
      sendDisabled={isWatchOnlyAccount(activeAccount)}
    />
  );

  const subTabsRow = (
    <PortfolioSubTabs
      tabs={subTabs}
      activeKey={activeSubTab}
      onChange={handleSubTabChange}
      onVisibilityPress={handlePortfolioVisibilityPress}
    />
  );

  const topFade = (
    <Animated.View
      style={[styles.topFadeGradient, { opacity: topFadeOpacity }]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[colors.background.primary, 'transparent']}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );

  return (
    <View style={styles.container} testID="home-screen">
      {/* The balance, the sub-tabs, the content and the FAB are CONTENT, not
          chrome: when a task engages the shell they leave with the verb at
          full depth (the chrome's half depth is GateContainer's business, not
          theirs). Conditional render is the mechanism — the same one the
          swap's step changes use — so unmount plays the sink and remount plays
          the float. The wrapper sits inside the screen, which is itself a
          sibling of the mounted ground in `(tabs)/_layout.tsx`: the water
          never travels with it. */}
      {!isTaskEngaged && (
        <Reanimated.View
          testID="home-content"
          style={styles.content}
          entering={floatEntering(isReduceMotionEnabled, { delayMs: contentFloatDelayMs })}
          exiting={sinkExiting(isReduceMotionEnabled)}
        >
          {activeSubTab === 'portfolio' ? (
            <>
              {/* Portfolio pins the balance and the sub-tabs: only the assets
                  travel under them. */}
              <View style={[styles.pinnedHeader, { paddingTop: contentTopOffset }]}>
                {balanceBlock}
                <View style={styles.pinnedSubTabs}>{subTabsRow}</View>
              </View>

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
                  key={currentBlockchain}
                  style={styles.chainContent}
                  entering={floatEntering(isReduceMotionEnabled, { delayMs: contentFloatDelayMs })}
                  exiting={sinkExiting(isReduceMotionEnabled)}
                >
                  {currentBlockchain === 'bitcoin' ? (
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
                      <PriceChart
                        data={bitcoinChartData}
                        selectedPeriod={bitcoinChartPeriod}
                        onPeriodChange={handleChartPeriodChange}
                        loading={bitcoinDataLoading && bitcoinChartData.length === 0}
                        error={bitcoinChartError && bitcoinChartData.length === 0}
                        height={180}
                      />

                      {/* Bitcoin Token Item (non-pressable — detail is already shown inline) */}
                      {balanceState === 'loading' ? (
                        <TokenListSkeleton count={1} />
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
                          />
                        )
                      )}

                      {/* Market Data */}
                      <TokenMarketData
                        data={bitcoinMarketData}
                        symbol="BTC"
                        loading={bitcoinDataLoading && !bitcoinCoinInfo}
                      />

                      {/* About Section - at the end */}
                      <TokenAbout
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
                      blockchain={getBlockchainFromNetworkId(currentBlockchain)}
                    />
                  )}
                </Reanimated.View>
                {/* Top fade gradient - shows only when scrolled, fades in dynamically */}
                {topFade}
              </View>
            </>
          ) : (
            // NFTs: the grid owns the only scroll view. The balance rides
            // inside its list header and scrolls away; the sub-tab row is an
            // overlay driven by the same offset, so it pins under the chrome
            // instead of leaving with the balance.
            <View style={styles.listContainer}>
              <NftsTab
                // One top offset for both sub-tabs: NftsTab used to compute its
                // own and the balance jumped ~12dp on every switch.
                contentContainerStyle={[styles.tabGutter, { paddingTop: contentTopOffset }]}
                listHeader={
                  <View>
                    <View style={styles.nftBalanceBlock} onLayout={handleBalanceBlockLayout}>
                      {balanceBlock}
                    </View>
                    {/* Room the pinned sub-tab row occupies above the grid. */}
                    <View style={{ height: subTabsHeight }} />
                  </View>
                }
                onScroll={handleScroll}
                scrollEventThrottle={16}
              />
              {/* Until the balance block has reported its height the row has
                  no offset to ride, so it would paint its first frame directly
                  over the balance. It measures invisibly, then appears. */}
              <Animated.View
                testID="home-subtabs-sticky"
                pointerEvents={balanceBlockHeight > 0 ? 'auto' : 'none'}
                style={[
                  styles.stickySubTabs,
                  { top: contentTopOffset, transform: [{ translateY: subTabsTranslateY }] },
                  balanceBlockHeight === 0 && styles.stickySubTabsUnmeasured,
                ]}
                onLayout={handleSubTabsLayout}
              >
                <Animated.View
                  pointerEvents="none"
                  style={[styles.stickySubTabsScrim, { opacity: subTabsScrimOpacity }]}
                />
                {subTabsRow}
              </Animated.View>
              {topFade}
            </View>
          )}

          <PowerupsFab
            onPress={handlePowerupsPress}
            open={powerupsVisible}
            bottomOffset={floatingBottomOffset}
          />
        </Reanimated.View>
      )}

      {/* Token Information Sheet */}
      {selectedToken && (
        <TokenInformationSheet
          visible={tokenSheetVisible}
          onClose={handleTokenSheetClose}
          token={selectedToken}
          // networkId is the single chain source for sheet props — the
          // carousel index (currentBlockchain) can lag behind it during a
          // chain switch. Same rule as SendSheet below.
          blockchain={getBlockchainFromNetworkId(networkId ?? 'solana-mainnet')}
          chartData={selectedTokenChartData}
          chartPeriod={selectedTokenChartPeriod}
          onChartPeriodChange={handleSelectedTokenChartPeriodChange}
          coinInfo={selectedTokenCoinInfo}
          marketData={selectedTokenMarketData}
          loading={selectedTokenLoading && selectedTokenChartData.length === 0}
          chartError={selectedTokenChartError && selectedTokenChartData.length === 0}
        />
      )}

      {/* Receive Sheet */}
      <ReceiveSheet
        visible={receiveSheetVisible}
        onClose={handleReceiveSheetClose}
        address={address}
        // networkId is the single chain source for sheet props — `address`
        // already derives from it. Same rule as SendSheet below.
        blockchain={getBlockchainFromNetworkId(networkId ?? 'solana-mainnet')}
        onCopy={handleReceiveSheetCopy}
      />

      {/* Send Sheet */}
      <SendSheet
        visible={sendSheetVisible}
        onClose={handleSendSheetClose}
        tokens={tokens}
        // networkId is the single chain source here: `tokens` and `account`
        // already derive from it, and the carousel index can lag behind it
        // during a chain switch — mixing the two hands the sheet
        // cross-chain props.
        blockchain={getBlockchainFromNetworkId(networkId ?? 'solana-mainnet')}
        account={activeBlockchainAccount}
        onSuccess={handleSendSuccess}
        showUnverifiedTokens={developerNetworks}
      />

      {/* Transaction History Sheet */}
      <TransactionHistorySheet
        visible={transactionHistoryVisible}
        onClose={handleTransactionHistoryClose}
        transactions={historyTransactions as Transaction[]}
        loading={transactionsLoading}
        loadingMore={transactionsLoadingMore}
        hasMore={transactionsHasMore}
        onLoadMore={transactionsLoadMore}
        hiddenBalance={hiddenBalance}
        onTransactionPress={handleTransactionPress}
        error={transactionsError}
        onRetry={transactionsRefresh}
        onViewExplorer={handleViewExplorer}
        onShare={handleShareTransaction}
        developerMode={developerNetworks}
        networkId={networkId}
      />

      {/* Powerups launcher (POWERUPS 01) */}
      <PowerupsLauncherSheet
        visible={powerupsVisible}
        onClose={handlePowerupsClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: semantic.text.secondary,
    fontSize: fontSize.bodyLg,
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
  pinnedHeader: {
    paddingHorizontal: s(spacing.screenGutter),
    paddingBottom: vs(spacing.md),
  },
  pinnedSubTabs: {
    marginTop: vs(spacing.xl),
  },
  nftBalanceBlock: {
    paddingBottom: vs(spacing.xl),
  },
  stickySubTabs: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: s(spacing.screenGutter),
    paddingBottom: vs(spacing.sm),
    zIndex: 2,
  },
  // Measuring, not yet placed: the row must not paint over the balance.
  stickySubTabsUnmeasured: {
    opacity: 0,
  },
  stickySubTabsScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background.primary,
  },
  listContainer: {
    flex: 1,
  },
  chainContent: {
    flex: 1,
  },
  balanceErrorBanner: {
    marginHorizontal: s(spacing.screenGutter),
    marginBottom: vs(spacing.md),
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['5xl'],
    paddingHorizontal: spacing['2xl'],
    marginHorizontal: spacing.lg,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
  },
  emptyStateText: {
    fontSize: fontSize.bodyLg,
    fontFamily: fontFamilyNative.medium,
    fontWeight: '500',
    color: semantic.text.secondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: fontSize.base,
    color: colors.text.disabled,
    textAlign: 'center',
  },
  retryText: {
    fontSize: fontSize.base,
    fontFamily: fontFamilyNative.semiBold,
    color: colors.accent.primary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  // Bitcoin view styles
  bitcoinScrollView: {
    flex: 1,
  },
  bitcoinContent: {
    paddingTop: 0,
    paddingBottom: vs(componentSizes.tabBarScrollPadding),
    gap: vs(spacing.md),
  },
});
