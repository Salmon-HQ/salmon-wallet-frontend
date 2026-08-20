/**
 * HomeScreen - Main wallet overview screen
 *
 * Displays:
 * - GateContainer header: Account name, address, settings navigation
 * - BalanceCardCarousel: Swipeable balance cards for multiple blockchains
 * - ActionButtonRow: Send, Receive, Activity buttons
 * - TokenList: List of token holdings
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
  getShortAddress,
  spacing,
  useAccountsContext,
  useAvailableNetworks,
  useBalance,
  usePrefetchBalances,
  useCurrencyContext,
  useTransactions,
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
  ActionButtonRow,
  BalanceCardCarousel,
  PriceChart,
  ReceiveSheet,
  SendSheet,
  SubAccountSelector,
  TokenAbout,
  TokenInformationSheet,
  TokenList,
  TokenListItem,
  TokenListSkeleton,
  TokenMarketData,
  TransactionDetailModal,
  TransactionHistorySheet,
  WarningNotice,
  depthParallaxScroll,
  type BlockchainBalance,
  type BlockchainId,
  type MarketData,
  type SubAccount,
  type Transaction,
} from '../../../src/components';
import { useDeveloperMode } from '../../../src/contexts/DeveloperModeContext';
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

export default function HomeScreen() {
  const { t } = useTranslation();
  const { scrollBottomPadding } = useTabChrome();
  const isReduceMotionEnabled = useReducedMotion();
  const [{ currency }] = useCurrencyContext();

  // Top fade gradient opacity - animated based on scroll position
  const topFadeOpacity = useRef(new Animated.Value(0)).current;

  // Active blockchain index for carousel
  const [activeBlockchainIndex, setActiveBlockchainIndex] = useState(0);

  // Sub-account switching state (for showing skeleton during switch)
  const [switchingSubAccount, setSwitchingSubAccount] = useState(false);
  const [pendingSubAccountIndex, setPendingSubAccountIndex] = useState<number | undefined>(
    undefined
  );

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

  // TransactionDetailModal state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

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
    setDetailModalVisible(false);
    setSelectedTransaction(null);
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

  // Sync carousel index with persisted networkId on mount / network change
  useEffect(() => {
    if (!networkId || allNetworks.length === 0) return;
    const idx = allNetworks.findIndex((n) => n.id === networkId);
    if (idx >= 0) {
      setActiveBlockchainIndex(idx);
    }
  }, [networkId, allNetworks]);

  // Get balance data for current network (active)
  const {
    tokens,
    usdTotal,
    changePercent,
    changeAmount,
    loading,
    refreshing,
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
  const [chainSwap, setChainSwap] = useState({ chain: currentBlockchain, hasPrior: false });
  if (chainSwap.chain !== currentBlockchain) {
    setChainSwap({ chain: currentBlockchain, hasPrior: true });
  }
  const chainFloatDelayMs = chainSwap.hasPrior ? FLOAT_DELAY_MS : 0;

  // BE drops unknown-only-tagged SPL tokens by default; developer mode opts
  // in via `includeSpam` on `useBalance` above. Trust the BE list as-is.
  const tokenListItems = useMemo(() => tokens.map(mapBalanceToToken), [tokens]);

  // Compute sub-accounts for the current network (for path index switching)
  const subAccounts = useMemo((): SubAccount[] => {
    if (!activeAccount || !networkId) return [];
    const networkAccounts = activeAccount.networksAccounts[networkId];
    if (!networkAccounts) return [];
    return networkAccounts
      .map((acc, idx) =>
        acc ? { index: idx, address: getShortAddress(acc.getReceiveAddress(), 4) ?? '' } : null
      )
      .filter((item): item is SubAccount => item !== null);
  }, [activeAccount, networkId]);

  // Debounce timer ref to prevent rapid sub-account switching from spamming API
  const subAccountChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubAccountChange = useCallback(
    (index: number) => {
      // Don't do anything if already on this account
      if (index === pathIndex) return;

      // Clear any pending change
      if (subAccountChangeTimerRef.current) {
        clearTimeout(subAccountChangeTimerRef.current);
      }

      // Immediately show switching state (activate skeletons)
      setSwitchingSubAccount(true);
      setPendingSubAccountIndex(index);

      // Debounce the change by 300ms to prevent API spam on rapid taps
      subAccountChangeTimerRef.current = setTimeout(() => {
        accountActions.changePathIndex(index);
        subAccountChangeTimerRef.current = null;
      }, 300);
    },
    [accountActions, pathIndex]
  );

  // Clear switching state when loading completes
  useEffect(() => {
    if (!loading && !refreshing && switchingSubAccount) {
      setSwitchingSubAccount(false);
      setPendingSubAccountIndex(undefined);
    }
  }, [loading, refreshing, switchingSubAccount]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (subAccountChangeTimerRef.current) {
        clearTimeout(subAccountChangeTimerRef.current);
      }
    };
  }, []);

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

  // Handler for tap on transaction — close history sheet, open detail modal
  const handleTransactionPress = useCallback((transaction: Transaction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTransaction(transaction);
    setTransactionHistoryVisible(false);
    // Wait for the history sheet Modal to unmount before opening the detail modal
    setTimeout(() => {
      setDetailModalVisible(true);
    }, 350);
  }, []);

  // Handler to close detail modal — re-open history sheet after
  const handleDetailModalClose = useCallback(() => {
    setDetailModalVisible(false);
    setTimeout(() => {
      setSelectedTransaction(null);
      setTransactionHistoryVisible(true);
    }, 350);
  }, []);

  // Handler to view transaction in explorer (from detail modal)
  const handleViewExplorer = useCallback(
    (transaction: Transaction) => {
      const explorerUrl =
        networkId === 'solana-devnet'
          ? `https://solscan.io/tx/${transaction.id}?cluster=devnet`
          : `https://solscan.io/tx/${transaction.id}`;
      Linking.openURL(explorerUrl);
      handleDetailModalClose();
    },
    [networkId, handleDetailModalClose]
  );

  // Handler to share transaction (from detail modal)
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
      setActiveBlockchainIndex(index);
      // Switch to the selected network
      const selectedBalance = blockchainBalances[index];
      if (selectedBalance) {
        const newNetworkId = selectedBalance.network.id;
        accountActions.changeNetwork(newNetworkId);
      }
    },
    [blockchainBalances, accountActions]
  );

  // Handle scroll to show/hide top fade gradient dynamically
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      // Fade in when scrolled down, fade out when at top
      const opacity = Math.min(offsetY / 30, 1); // Fully visible after 30px scroll
      topFadeOpacity.setValue(opacity);
      // The water column parallaxes against this list. Writing the shared
      // value is the only thing that crosses to the UI thread — the field's
      // own drift and the parallax transform both run there.
      depthParallaxScroll.value = offsetY;
    },
    [topFadeOpacity]
  );

  // Memoize the fixed header component (Balance Card + Action Buttons)
  // IMPORTANT: This hook must be called BEFORE any early returns to follow React's Rules of Hooks
  const FixedHeaderComponent = useMemo(
    () => (
      <View style={styles.fixedHeader}>
        {/* Balance Card Carousel */}
        <BalanceCardCarousel
          blockchains={blockchainBalances}
          hiddenBalance={hiddenBalance}
          onToggleVisibility={toggleHidden}
          onBlockchainChange={handleBlockchainChange}
          activeIndex={activeBlockchainIndex}
          showNetworkLabel={developerNetworks}
          style={styles.balanceCard}
        />

        {/* Action Buttons with 24px vertical spacing */}
        <ActionButtonRow
          onSendPress={handleSendPress}
          onReceivePress={handleReceivePress}
          onActivityPress={handleActivityPress}
          style={styles.actionRow}
        />
      </View>
    ),
    [
      blockchainBalances,
      hiddenBalance,
      toggleHidden,
      handleBlockchainChange,
      activeBlockchainIndex,
      developerNetworks,
      handleSendPress,
      handleReceivePress,
      handleActivityPress,
    ]
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
          <Text style={styles.emptyStateText}>{t('wallet.no_tokens_found', 'No tokens found')}</Text>
          <Text style={styles.emptyStateSubtext}>
            {t('wallet.tokens_empty_subtitle', 'Your tokens will appear here once you receive some')}
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

  return (
    <View style={styles.container} testID="home-screen">
      {/* Fixed Header: Balance Card + Action Buttons */}
      {FixedHeaderComponent}

      {/* Sub-account selector — only visible with 2+ derived accounts */}
      <SubAccountSelector
        accounts={subAccounts}
        activeIndex={pathIndex}
        onSelect={handleSubAccountChange}
        pendingIndex={pendingSubAccountIndex}
        style={styles.subAccountSelector}
      />

      {/* Partial-load failure: keep whatever data loaded visible;
          retry is pull-to-refresh on the token list. Only 'ready' carries
          data, so a total failure is left to the list's own error state
          rather than told "shown data may be incomplete" over nothing. */}
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
          Keyed by chain so switching chains swaps the whole container with
          the sink and the float: the outgoing chain's content sinks 12dp as
          its light goes, the incoming one floats up into place — the
          fade-through it upgrades, given the vertical the rest of the system
          already speaks. The frame above (balance card, chain selector) holds
          still; only the content travels. Under reduce motion both props are
          undefined and the swap stays instant. */}
      <View style={styles.listContainer}>
        <Reanimated.View
          key={currentBlockchain}
          style={styles.chainContent}
          entering={floatEntering(isReduceMotionEnabled, { delayMs: chainFloatDelayMs })}
          exiting={sinkExiting(isReduceMotionEnabled)}
        >
          {currentBlockchain === 'bitcoin' ? (
            // Bitcoin view with chart, about, and market data
            <ScrollView
              style={styles.bitcoinScrollView}
              contentContainerStyle={[
                styles.bitcoinContent,
                { paddingBottom: scrollBottomPadding },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {/* Price Chart */}
              <View style={styles.bitcoinSection}>
                <PriceChart
                  data={bitcoinChartData}
                  selectedPeriod={bitcoinChartPeriod}
                  onPeriodChange={handleChartPeriodChange}
                  loading={bitcoinDataLoading && bitcoinChartData.length === 0}
                  error={bitcoinChartError && bitcoinChartData.length === 0}
                  height={180}
                />
              </View>

              {/* Bitcoin Token Item (non-pressable — detail is already shown inline) */}
              {balanceState === 'loading' ? (
                <TokenListSkeleton count={1} />
              ) : balanceState === 'error' ? (
                /* A load that failed with nothing cached owes the user the
                   error state and its retry, never an endless skeleton. */
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
              <View style={styles.bitcoinSection}>
                <TokenMarketData
                  data={bitcoinMarketData}
                  symbol="BTC"
                  loading={bitcoinDataLoading && !bitcoinCoinInfo}
                />
              </View>

              {/* About Section - at the end */}
              <View style={styles.bitcoinSection}>
                <TokenAbout
                  description={bitcoinCoinInfo?.description}
                  loading={bitcoinDataLoading && !bitcoinCoinInfo}
                />
              </View>
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
              contentContainerStyle={[styles.listContent, { paddingBottom: scrollBottomPadding }]}
              blockchain={getBlockchainFromNetworkId(currentBlockchain)}
            />
          )}
        </Reanimated.View>
        {/* Top fade gradient - shows only when scrolled, fades in dynamically */}
        <Animated.View
          style={[styles.topFadeGradient, { opacity: topFadeOpacity }]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[colors.background.primary, 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

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
      />

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        visible={detailModalVisible}
        onClose={handleDetailModalClose}
        transaction={selectedTransaction}
        onViewExplorer={handleViewExplorer}
        onShare={handleShareTransaction}
        developerMode={developerNetworks}
        networkId={networkId}
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
  fixedHeader: {
    // Fixed header containing balance card and action buttons
  },
  subAccountSelector: {
    marginBottom: vs(spacing.md),
  },
  listContainer: {
    flex: 1,
  },
  chainContent: {
    flex: 1,
  },
  balanceErrorBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: vs(spacing.md),
  },
  listContent: {
    paddingTop: 0,
    paddingBottom: vs(componentSizes.tabBarScrollPadding),
  },
  balanceCard: {
    // Card now extends behind the header - no negative margin needed
    // The card's internal paddingTop handles the header offset
  },
  actionRow: {
    // 24px vertical spacing moved from ActionButtonRow to create space for card shadow
    marginTop: vs(spacing['2xl']), // Space for card shadow to be visible
    marginBottom: vs(spacing['2xl']), // Gap before token list
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
  bitcoinSection: {
    // gap is handled by bitcoinContent container
  },
});
