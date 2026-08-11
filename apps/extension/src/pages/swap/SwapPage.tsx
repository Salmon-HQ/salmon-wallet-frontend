/**
 * SwapPage - Token swap and bridge interface for extension
 *
 * Wrapper around SwapScreen from extension components.
 * Wires useSwap, useBridge, useMultiChainTokens hooks.
 */
import { useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  mapToSwapToken,
  searchTokens,
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
} from '../../components';

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

const LoadingContainer = styled(Box)({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  gap: spacing.lg,
});

const LoadingText = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.md,
});

// ============================================================================
// Component
// ============================================================================

interface SwapPageProps {
  onNavigateHome?: () => void;
}

export function SwapPage({ onNavigateHome }: SwapPageProps = {}) {
  const { t } = useTranslation();
  const currentSharedQuoteRef = useRef<SharedSwapQuote | null>(null);

  const [accountState] = useAccountsContext();
  const { ready, activeAccount, activeBlockchainAccount, networkId } = accountState;

  const swapNetworkId: SwapNetworkId = useMemo(() => {
    return networkId === 'solana-devnet' ? 'solana-devnet' : 'solana-mainnet';
  }, [networkId]);

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

  const {
    getAvailableTokens: getBridgeAvailableTokens,
    getEstimate: getBridgeEstimate,
    createExchange: createBridgeExchange,
    getTransactionStatus: getBridgeTransactionStatus,
    reset: resetBridge,
  } = useBridge();

  const {
    tokens: multiChainTokens,
    featuredTokens: topTokens,
    loading,
  } = useMultiChainTokens({
    activeAccount,
    skip: !ready || !activeAccount,
  });

  const swapTokens: SwapToken[] = useMemo(() => {
    return multiChainTokens.map(unifiedToSwapToken);
  }, [multiChainTokens]);

  const featuredTokens: SwapToken[] = useMemo(() => {
    return topTokens.map(unifiedToSwapToken);
  }, [topTokens]);

  // Resolve user's BTC address for bridge recipient pre-fill
  const defaultRecipientAddress = useMemo(() => {
    const btcAccounts = activeAccount?.networksAccounts?.['bitcoin-mainnet'];
    const btcAccount = btcAccounts?.find((a: unknown) => a !== null) as { getReceiveAddress(): string } | undefined;
    return btcAccount?.getReceiveAddress() ?? '';
  }, [activeAccount]);

  // Full Jupiter verified token catalog (shared React Query hook)
  const { tokens: jupiterTokens } = useJupiterTokenList({ networkId: swapNetworkId });

  // Swap handlers
  const handleGetQuote = useCallback(async (
    inToken: SwapToken,
    outToken: SwapToken,
    amount: string,
  ): Promise<SwapQuote> => {
    if (!activeBlockchainAccount) throw new Error('swap.errors.noActiveAccount');

    const inputAmount = parseFloat(amount);
    if (isNaN(inputAmount) || inputAmount <= 0) throw new Error('swap.errors.invalidAmount');

    const quote = await getSwapQuote({
      inputMint: inToken.address,
      outputMint: outToken.address,
      amount: inputAmount,
      inputDecimals: inToken.decimals,
      slippageBps: 50,
    });

    if (!quote) throw new Error(swapError || 'swap.errors.quoteFailed');

    currentSharedQuoteRef.current = quote;
    return quote as unknown as SwapQuote;
  }, [activeBlockchainAccount, getSwapQuote, swapError]);

  const handleSwap = useCallback(async (_quote: SwapQuote): Promise<{ txId: string }> => {
    if (!activeBlockchainAccount) throw new Error('swap.errors.noActiveAccount');
    if (!currentSharedQuoteRef.current) throw new Error('swap.errors.noQuote');

    // Verify hook's internal quote matches the displayed quote to prevent race conditions
    if (!swapQuote || swapQuote.custom?.requestId !== currentSharedQuoteRef.current.custom?.requestId) {
      throw new Error('transaction.errors.quoteExpired');
    }

    const result = await executeSwapHook();
    if (result.status === 'fail') throw new Error(result.error || 'transaction.errors.generic');

    currentSharedQuoteRef.current = null;
    return { txId: result.txId || '' };
  }, [activeBlockchainAccount, executeSwapHook, swapQuote]);

  const handleSwapSuccess = useCallback(() => {
    resetSwap();
  }, [resetSwap]);

  const handleSwapError = useCallback((error: Error) => {
    resetSwap();
    console.error('Swap Failed:', error.message);
  }, [resetSwap]);

  const handleSearchTokens = useCallback(async (query: string): Promise<SwapToken[]> => {
    const network = networkId === 'solana-devnet' ? 'solana-devnet' : 'solana-mainnet';
    try {
      const results = await searchTokens(query, network);
      return results.map((token) => mapToSwapToken(token));
    } catch {
      return [];
    }
  }, [networkId]);

  // Bridge handlers
  const bridgeTokens: BridgeTokenSimple[] = useMemo(() => {
    return multiChainTokens.map((token) => ({
      symbol: token.symbol,
      name: token.name,
      logo: token.logo,
      network: token.chain,
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
    } catch {
      return [];
    }
  }, [getBridgeAvailableTokens]);

  const handleGetBridgeEstimate = useCallback(async (
    symbolIn: string,
    symbolOut: string,
    amount: number,
    networkIn?: string,
    networkOut?: string,
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
    networkOut?: string,
  ): Promise<BridgeExchangeSimple | null> => {
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
  }, [createBridgeExchange]);

  const handleGetBridgeTransactionStatus = useCallback(async (id: string) => {
    try {
      const transaction = await getBridgeTransactionStatus(id);
      if (!transaction) return null;
      return {
        status: transaction.status,
        payoutTxId: transaction.payoutHash,
      };
    } catch {
      return null;
    }
  }, [getBridgeTransactionStatus]);

  const handleSendDeposit = useCallback(async (
    depositAddress: string,
    tokenAddress: string,
    amount: number,
  ): Promise<{ txId: string }> => {
    if (!activeBlockchainAccount) throw new Error('swap.errors.noActiveAccount');
    return activeBlockchainAccount.transfer(depositAddress, tokenAddress, amount);
  }, [activeBlockchainAccount]);

  const handleBridgeSuccess = useCallback((_exchange: BridgeExchangeSimple) => {
    resetBridge();
  }, [resetBridge]);

  const handleBridgeError = useCallback((error: Error) => {
    resetBridge();
    console.error('Bridge Failed:', error.message);
  }, [resetBridge]);

  if (!ready || !activeAccount || !activeBlockchainAccount) {
    return (
      <LoadingContainer>
        <LoadingText>{t('swap.errors.noAccount')}</LoadingText>
      </LoadingContainer>
    );
  }

  return (
    <Container>
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
        bridgeTokens={bridgeTokens}
        bridgeFeaturedTokens={bridgeFeaturedTokens}
        onGetAvailableTokens={handleGetAvailableTokens}
        onGetBridgeEstimate={handleGetBridgeEstimate}
        onCreateBridgeExchange={handleCreateBridgeExchange}
        onGetBridgeTransactionStatus={handleGetBridgeTransactionStatus}
        onSendDeposit={handleSendDeposit}
        onBridgeSuccess={handleBridgeSuccess}
        onBridgeError={handleBridgeError}
        onNavigateHome={onNavigateHome}
      />
    </Container>
  );
}
