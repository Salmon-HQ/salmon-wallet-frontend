/**
 * SwapScreen - Unified token swap and bridge interface
 *
 * Displays:
 * - GateContainer header: Account name, address, settings navigation
 * - SwapInputScreen: Multi-chain token selection and amount input
 * - SwapReviewScreen: Quote review and confirmation
 *
 * Features:
 * - Multi-chain support: tokens from Solana, Bitcoin, Ethereum
 * - Automatic mode detection:
 *   - Jupiter: Same-chain Solana swaps
 *   - StealthEX: Cross-chain bridges
 * - Real-time quote fetching
 * - Token selection with search and pagination
 * - Multi-step flow (input -> [recipient for bridge] -> review -> confirm)
 * - Transaction signing and execution
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  colors,
  fontSize,
  mapToSwapToken,
  searchTokens,
  spacing,
  useAccountsContext,
  useBridge,
  useJupiterTokenList,
  useMultiChainTokens,
  useSwap,
  type SwapQuote as SharedSwapQuote,
  type SolanaAccount,
  type SwapNetworkId,
  unifiedToSwapToken,
} from '@salmon/shared';
import {
  SwapScreen,
  type BridgeEstimateSimple,
  type BridgeExchangeSimple,
  type BridgeTokenSimple,
  type SwapQuote,
  type SwapToken,
} from '../../../src/components';
import { useTabChrome } from '../../../hooks/useTabChrome';

/**
 * Since SwapQuote now uses the backend structure directly,
 * we just need to cast it to the UI type (they're the same now)
 */
function transformQuoteForUI(
  quote: SharedSwapQuote,
  _inToken: SwapToken,
  _outToken: SwapToken,
  _inputAmount: number
): SwapQuote {
  // The UI components now expect the backend structure directly
  // SwapQuote from the UI components is the same as SharedSwapQuote from @salmon/shared
  return quote as unknown as SwapQuote;
}

export default function SwapScreenPage() {
  const { headerChromeHeight } = useTabChrome();
  const router = useRouter();

  // Store the current quote from useSwap for execution
  const currentSharedQuoteRef = useRef<SharedSwapQuote | null>(null);

  // Get account state and actions from shared context
  const [accountState] = useAccountsContext();
  const {
    ready,
    activeAccount,
    activeBlockchainAccount,
    networkId,
  } = accountState;

  // Convert networkId to SwapNetworkId format
  const swapNetworkId: SwapNetworkId = useMemo(() => {
    return networkId === 'solana-devnet' ? 'solana-devnet' : 'solana-mainnet';
  }, [networkId]);

  // Initialize useSwap hook with proper typing
  const {
    getQuote: getSwapQuote,
    executeSwap: executeSwapHook,
    quote: swapQuote,
    error: swapError,
    reset: resetSwap,
  } = useSwap({
    account: activeBlockchainAccount as SolanaAccount | undefined,
    networkId: swapNetworkId,
  });

  // Initialize useBridge hook
  const {
    getAvailableTokens: getBridgeAvailableTokens,
    getEstimate: getBridgeEstimate,
    createExchange: createBridgeExchange,
    getTransactionStatus: getBridgeTransactionStatus,
    reset: resetBridge,
  } = useBridge();

  // Get multi-chain tokens (SOL, BTC, ETH) from all user accounts
  const {
    tokens: multiChainTokens,
    featuredTokens: topTokens,
    loading,
  } = useMultiChainTokens({
    activeAccount,
    skip: !ready || !activeAccount,
  });

  // Convert unified tokens to SwapToken format (with chain info for auto-detection)
  const swapTokens: SwapToken[] = useMemo(() => {
    return multiChainTokens.map(unifiedToSwapToken);
  }, [multiChainTokens]);

  // Featured tokens (top 5 by USD value across all chains)
  const featuredTokens: SwapToken[] = useMemo(() => {
    return topTokens.map(unifiedToSwapToken);
  }, [topTokens]);

  // Resolve user's BTC address for bridge recipient pre-fill
  const defaultRecipientAddress = useMemo(() => {
    const btcAccounts = activeAccount?.networksAccounts?.['bitcoin-mainnet'];
    const btcAccount = btcAccounts?.find((a) => a !== null);
    return btcAccount?.getReceiveAddress() ?? '';
  }, [activeAccount]);

  // Full Jupiter verified token catalog (shared React Query hook)
  const { tokens: jupiterTokens } = useJupiterTokenList({ networkId: swapNetworkId });

  // Swap handlers - Now using real useSwap hook
  const handleGetQuote = useCallback(async (
    inToken: SwapToken,
    outToken: SwapToken,
    amount: string
  ): Promise<SwapQuote> => {
    if (!activeBlockchainAccount) {
      throw new Error('No active account');
    }

    const inputAmount = parseFloat(amount);
    if (isNaN(inputAmount) || inputAmount <= 0) {
      throw new Error('Invalid amount');
    }

    // Get quote using the real swap hook
    const quote = await getSwapQuote({
      inputMint: inToken.address,
      outputMint: outToken.address,
      amount: inputAmount,
      inputDecimals: inToken.decimals,
      slippageBps: 50, // 0.5% default slippage
    });

    if (!quote) {
      throw new Error(swapError || 'Failed to get swap quote. No route found.');
    }

    // Store the shared quote for later execution
    currentSharedQuoteRef.current = quote;

    // Transform to UI format
    return transformQuoteForUI(quote, inToken, outToken, inputAmount);
  }, [activeBlockchainAccount, getSwapQuote, swapError]);

  const handleSwap = useCallback(async (_quote: SwapQuote): Promise<{ txId: string }> => {
    if (!activeBlockchainAccount) {
      throw new Error('No active account');
    }

    if (!currentSharedQuoteRef.current) {
      throw new Error('No quote available. Please get a quote first.');
    }

    // Verify hook's internal quote matches the displayed quote to prevent race conditions
    // The hook's executeSwap() uses its own internal state, which could diverge from the ref
    if (!swapQuote || swapQuote.custom?.requestId !== currentSharedQuoteRef.current.custom?.requestId) {
      Alert.alert('Quote Expired', 'The quote has changed. Please try again.');
      return { txId: '' };
    }

    // Execute the swap using the real hook
    const result = await executeSwapHook();

    if (result.status === 'fail') {
      throw new Error(result.error || 'Swap execution failed');
    }

    // Clear the stored quote after successful execution
    currentSharedQuoteRef.current = null;

    return { txId: result.txId || '' };
  }, [activeBlockchainAccount, executeSwapHook, swapQuote]);

  const handleSwapSuccess = useCallback((_txId: string) => {
    resetSwap();
  }, [resetSwap]);

  const handleNavigateHome = useCallback(() => {
    router.replace('/');
  }, [router]);

  const handleSwapError = useCallback((error: Error) => {
    // Reset swap state; the form renders the classified message.
    resetSwap();
    console.error('Swap Failed:', error.message);
  }, [resetSwap]);

  const handleSearchTokens = useCallback(async (query: string): Promise<SwapToken[]> => {
    const network = networkId === 'solana-devnet' ? 'solana-devnet' : 'solana-mainnet';
    try {
      const results = await searchTokens(query, network);
      return results.map((token) => mapToSwapToken(token));
    } catch (error) {
      console.error('Token search failed:', error);
      return [];
    }
  }, [networkId]);

  // Bridge handlers - convert multi-chain tokens to bridge format
  const bridgeTokens: BridgeTokenSimple[] = useMemo(() => {
    return multiChainTokens.map((token) => ({
      symbol: token.symbol,
      name: token.name,
      logo: token.logo,
      network: token.chain, // Now includes actual chain (solana, bitcoin, ethereum)
      balance: token.balance,
      usdPrice: token.usdPrice,
    }));
  }, [multiChainTokens]);

  const bridgeFeaturedTokens: BridgeTokenSimple[] = useMemo(() => {
    return topTokens.map((token) => ({
      symbol: token.symbol,
      name: token.name,
      logo: token.logo,
      network: token.chain,
      balance: token.balance,
      usdPrice: token.usdPrice,
    }));
  }, [topTokens]);

  const handleGetAvailableTokens = useCallback(async (sourceSymbol: string): Promise<BridgeTokenSimple[]> => {
    try {
      const tokens = await getBridgeAvailableTokens(sourceSymbol);
      if (!tokens) return [];
      return tokens.map((t) => ({
        symbol: t.symbol,
        name: t.name,
        logo: t.logo,
        network: t.network,
      }));
    } catch (error) {
      console.error('Failed to get available bridge tokens:', error);
      return [];
    }
  }, [getBridgeAvailableTokens]);

  const handleGetBridgeEstimate = useCallback(async (
    symbolIn: string,
    symbolOut: string,
    amount: number,
    networkIn?: string,
    networkOut?: string
  ): Promise<BridgeEstimateSimple | null> => {
    const estimate = await getBridgeEstimate(symbolIn, symbolOut, amount, networkIn, networkOut);
    if (!estimate) return null;
    return {
      estimatedAmount: estimate.estimatedAmount,
      minAmount: estimate.minAmount,
      symbolIn: estimate.symbolIn,
      symbolOut: estimate.symbolOut,
    };
  }, [getBridgeEstimate]);

  const handleCreateBridgeExchange = useCallback(async (
    symbolIn: string,
    symbolOut: string,
    amount: number,
    addressTo: string,
    networkIn?: string,
    networkOut?: string
  ): Promise<BridgeExchangeSimple | null> => {
    try {
      const exchange = await createBridgeExchange(symbolIn, symbolOut, amount, addressTo, networkIn, networkOut);
      if (!exchange) return null;
      return {
        id: exchange.id,
        depositAddress: exchange.payinAddress,
        amountIn: exchange.amountExpectedFrom,
        amountOut: exchange.amountExpectedTo,
        symbolIn: exchange.currencyFrom,
        symbolOut: exchange.currencyTo,
        addressTo: exchange.payoutAddress,
        status: exchange.status,
      };
    } catch (error) {
      console.error('Failed to create bridge exchange:', error);
      return null;
    }
  }, [createBridgeExchange]);

  const handleGetBridgeTransactionStatus = useCallback(async (id: string) => {
    try {
      const transaction = await getBridgeTransactionStatus(id);
      if (!transaction) return null;
      return {
        status: transaction.status,
        payoutTxId: transaction.payoutHash,
      };
    } catch (error) {
      console.error('Failed to get bridge transaction status:', error);
      return null;
    }
  }, [getBridgeTransactionStatus]);

  const handleSendDeposit = useCallback(async (
    depositAddress: string,
    tokenAddress: string,
    amount: number,
  ): Promise<{ txId: string }> => {
    if (!activeBlockchainAccount) throw new Error('No active account');
    return activeBlockchainAccount.transfer(depositAddress, tokenAddress, amount);
  }, [activeBlockchainAccount]);

  const handleBridgeSuccess = useCallback((_exchange: BridgeExchangeSimple) => {
    resetBridge();
  }, [resetBridge]);

  const handleBridgeError = useCallback((error: Error) => {
    resetBridge();
    console.error('Bridge Failed:', error.message);
  }, [resetBridge]);

  // No account state
  if (!ready || !activeAccount || !activeBlockchainAccount) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No account found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Swap Content */}
      <View style={[styles.contentContainer, { marginTop: headerChromeHeight }]}>
        <SwapScreen
          tokens={swapTokens}
          featuredTokens={featuredTokens}
          jupiterTokens={jupiterTokens}
          defaultRecipientAddress={defaultRecipientAddress}
          loading={loading}
          onGetQuote={handleGetQuote}
          onSwap={handleSwap}
          onSuccess={handleSwapSuccess}
          onError={handleSwapError}
          onSearchTokens={handleSearchTokens}
          initialInToken={swapTokens[0]}
          // Bridge props
          bridgeTokens={bridgeTokens}
          bridgeFeaturedTokens={bridgeFeaturedTokens}
          onGetAvailableTokens={handleGetAvailableTokens}
          onGetBridgeEstimate={handleGetBridgeEstimate}
          onCreateBridgeExchange={handleCreateBridgeExchange}
          onGetBridgeTransactionStatus={handleGetBridgeTransactionStatus}
          onSendDeposit={handleSendDeposit}
          onBridgeSuccess={handleBridgeSuccess}
          onBridgeError={handleBridgeError}
          onNavigateHome={handleNavigateHome}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.text.muted,
    fontSize: fontSize.md,
    marginTop: spacing.lg,
  },
});
