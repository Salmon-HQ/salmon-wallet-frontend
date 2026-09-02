/**
 * SwapScreen - Token swap interface
 *
 * Displays:
 * - WalletHeader row: Account name, address, settings navigation
 * - SwapInputScreen: Solana token selection and amount input
 * - SwapReviewScreen: Quote review and confirmation
 *
 * Features:
 * - Jupiter same-chain Solana swaps
 * - Real-time quote fetching
 * - Token selection with search and pagination
 * - Multi-step flow (input -> review -> confirm)
 * - Transaction signing and execution
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  fontSize,
  mapToSwapToken,
  searchTokens,
  spacing,
  useAccountsContext,
  useJupiterTokenList,
  useMultiChainTokens,
  useSwap,
  type SwapQuote as SharedSwapQuote,
  type SolanaAccount,
  type SwapNetworkId,
  unifiedToSwapToken,
  type Semantic,
} from '@salmon/shared';
import { SwapScreen, type SwapQuote, type SwapToken } from '../../../src/components';
import { useTabChrome } from '../../../hooks/useTabChrome';
import { useThemedStyles } from '../../../src/theme/useThemedStyles';

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
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { headerChromeHeight } = useTabChrome();
  const router = useRouter();

  // Store the current quote from useSwap for execution
  const currentSharedQuoteRef = useRef<SharedSwapQuote | null>(null);

  // Get account state and actions from shared context
  const [accountState] = useAccountsContext();
  const { ready, activeAccount, activeBlockchainAccount, networkId } = accountState;

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

  // Multi-chain balances (kept for the future Ethereum surface); the swap
  // input/output tokens are Solana-only now that Jupiter is the only route.
  const {
    tokens: multiChainTokens,
    featuredTokens: topTokens,
    loading,
  } = useMultiChainTokens({
    activeAccount,
    skip: !ready || !activeAccount,
  });

  const swapTokens: SwapToken[] = useMemo(() => {
    return multiChainTokens.filter((t) => t.chain === 'solana').map(unifiedToSwapToken);
  }, [multiChainTokens]);

  const featuredTokens: SwapToken[] = useMemo(() => {
    return topTokens.filter((t) => t.chain === 'solana').map(unifiedToSwapToken);
  }, [topTokens]);

  // Full Jupiter verified token catalog (shared React Query hook)
  const { tokens: jupiterTokens } = useJupiterTokenList({ networkId: swapNetworkId });

  // Swap handlers - Now using real useSwap hook
  const handleGetQuote = useCallback(
    async (inToken: SwapToken, outToken: SwapToken, amount: string): Promise<SwapQuote> => {
      if (!activeBlockchainAccount) {
        throw new Error('swap.errors.noActiveAccount');
      }

      const inputAmount = parseFloat(amount);
      if (isNaN(inputAmount) || inputAmount <= 0) {
        throw new Error('swap.errors.invalidAmount');
      }

      // Get quote using the real swap hook
      const quote = await getSwapQuote({
        inputMint: inToken.address,
        outputMint: outToken.address,
        amount: inputAmount,
        inputDecimals: inToken.decimals,
      });

      if (!quote) {
        throw new Error(swapError || 'transaction.errors.noRoute');
      }

      // Store the shared quote for later execution
      currentSharedQuoteRef.current = quote;

      // Transform to UI format
      return transformQuoteForUI(quote, inToken, outToken, inputAmount);
    },
    [activeBlockchainAccount, getSwapQuote, swapError]
  );

  const handleSwap = useCallback(
    async (_quote: SwapQuote): Promise<{ txId: string }> => {
      if (!activeBlockchainAccount) {
        throw new Error('swap.errors.noActiveAccount');
      }

      if (!currentSharedQuoteRef.current) {
        throw new Error('swap.errors.noQuote');
      }

      // Verify hook's internal quote matches the displayed quote to prevent race conditions
      // The hook's executeSwap() uses its own internal state, which could diverge from the ref
      if (
        !swapQuote ||
        swapQuote.custom?.requestId !== currentSharedQuoteRef.current.custom?.requestId
      ) {
        throw new Error('transaction.errors.quoteExpired');
      }

      // Execute the swap using the real hook
      const result = await executeSwapHook();

      if (result.status === 'fail') {
        throw new Error(result.error || 'transaction.errors.generic');
      }

      // Clear the stored quote after successful execution
      currentSharedQuoteRef.current = null;

      return { txId: result.txId || '' };
    },
    [activeBlockchainAccount, executeSwapHook, swapQuote]
  );

  const handleSwapSuccess = useCallback(
    (_txId: string) => {
      resetSwap();
    },
    [resetSwap]
  );

  const handleNavigateHome = useCallback(() => {
    router.replace('/');
  }, [router]);

  const handleSwapError = useCallback(
    (error: Error) => {
      // Reset swap state; the form renders the classified message.
      resetSwap();
      console.error('Swap Failed:', error.message);
    },
    [resetSwap]
  );

  const handleSearchTokens = useCallback(
    async (query: string): Promise<SwapToken[]> => {
      const network = networkId === 'solana-devnet' ? 'solana-devnet' : 'solana-mainnet';
      try {
        const results = await searchTokens(query, network);
        return results.map((token) => mapToSwapToken(token));
      } catch (error) {
        console.error('Token search failed:', error);
        return [];
      }
    },
    [networkId]
  );

  // No account state
  if (!ready || !activeAccount || !activeBlockchainAccount) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('swap.errors.noAccount')}</Text>
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
          loading={loading}
          onGetQuote={handleGetQuote}
          onSwap={handleSwap}
          onSuccess={handleSwapSuccess}
          onError={handleSwapError}
          onSearchTokens={handleSearchTokens}
          initialInToken={swapTokens[0]}
          onNavigateHome={handleNavigateHome}
        />
      </View>
    </View>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
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
      color: t.text.secondary,
      fontSize: fontSize.bodyLg,
      marginTop: spacing.lg,
    },
  });
