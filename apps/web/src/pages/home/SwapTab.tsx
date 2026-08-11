import React, { useCallback, useMemo, useRef } from 'react';
import { styled } from '@salmon/ui';
import Box from '@mui/material/Box';
import {
  useAccountsContext,
  useBridge,
  useJupiterTokenList,
  useMultiChainTokens,
  useSwap,
  mapToSwapToken,
  searchTokens,
  unifiedToSwapToken,
  type SolanaAccount,
  type SwapNetworkId,
  type SwapQuote as SharedSwapQuote,
} from '@salmon/shared';
import {
  SwapScreen,
  type BridgeEstimateSimple,
  type BridgeExchangeSimple,
  type BridgeTokenSimple,
  type SwapQuote,
  type SwapToken,
} from '@salmon/ui';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SwapTabProps {
  onNavigateHome?: () => void;
}

// ---------------------------------------------------------------------------
// Styled
// ---------------------------------------------------------------------------

const Container = styled(Box)({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SwapTab({ onNavigateHome }: SwapTabProps): React.ReactElement {
  const currentSharedQuoteRef = useRef<SharedSwapQuote | null>(null);
  const [accountState] = useAccountsContext();
  const { ready, activeAccount, activeBlockchainAccount, networkId } = accountState;

  const swapNetworkId: SwapNetworkId = useMemo(() => {
    return networkId === 'solana-devnet' ? 'solana-devnet' : 'solana-mainnet';
  }, [networkId]);

  // Swap hook
  const {
    getQuote: getSwapQuote,
    executeSwap: executeSwapHook,
    quote: swapQuote,
    error: _swapError,
    reset: resetSwap,
  } = useSwap({
    account: activeBlockchainAccount as SolanaAccount | undefined,
    networkId: swapNetworkId,
  });

  // Bridge hook
  const {
    getAvailableTokens: getBridgeAvailableTokens,
    getEstimate: getBridgeEstimate,
    createExchange: createBridgeExchange,
    getTransactionStatus: getBridgeTransactionStatus,
    reset: resetBridge,
  } = useBridge();

  // Multi-chain tokens
  const {
    tokens: multiChainTokens,
    featuredTokens: topTokens,
    loading,
  } = useMultiChainTokens({
    activeAccount,
    skip: !ready || !activeAccount,
  });

  // Swap tokens
  const swapTokens: SwapToken[] = useMemo(() => multiChainTokens.map(unifiedToSwapToken), [multiChainTokens]);
  const featuredTokens: SwapToken[] = useMemo(() => topTokens.map(unifiedToSwapToken), [topTokens]);

  // Jupiter token list (shared React Query hook)
  const { tokens: jupiterTokens } = useJupiterTokenList({ networkId: swapNetworkId });

  // Default recipient address (BTC for bridges)
  const defaultRecipientAddress = useMemo(() => {
    const btcAccounts = activeAccount?.networksAccounts?.['bitcoin-mainnet'];
    const btcAccount = btcAccounts?.find((a) => a !== null) as { getReceiveAddress(): string } | undefined;
    return btcAccount?.getReceiveAddress() ?? '';
  }, [activeAccount]);

  // Bridge tokens
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

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------

  const handleGetQuote = useCallback(async (inToken: SwapToken, outToken: SwapToken, amount: string): Promise<SwapQuote> => {
    const quote = await getSwapQuote({
      inputMint: inToken.address,
      outputMint: outToken.address,
      amount: parseFloat(amount),
      inputDecimals: inToken.decimals,
      slippageBps: 50,
    });
    currentSharedQuoteRef.current = quote;
    return quote as unknown as SwapQuote;
  }, [getSwapQuote]);

  const handleSwap = useCallback(async (_quote: SwapQuote): Promise<{ txId: string }> => {
    if (!swapQuote || !currentSharedQuoteRef.current) {
      throw new Error('Quote expired: the quote has changed');
    }
    const result = await executeSwapHook();
    return { txId: result.txId || '' };
  }, [swapQuote, executeSwapHook]);

  const handleSwapSuccess = useCallback(() => resetSwap(), [resetSwap]);

  const handleSwapError = useCallback((error: Error) => {
    resetSwap();
    console.error('Swap Failed:', error.message);
  }, [resetSwap]);

  const handleSearchTokens = useCallback(async (query: string): Promise<SwapToken[]> => {
    const network = networkId === 'solana-devnet' ? 'solana-devnet' : 'solana-mainnet';
    const results = await searchTokens(query, network);
    return results.map((token) => mapToSwapToken(token));
  }, [networkId]);

  const handleGetAvailableTokens = useCallback(async (sourceSymbol: string): Promise<BridgeTokenSimple[]> => {
    const result = await getBridgeAvailableTokens(sourceSymbol);
    if (!result) return [];
    return result.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      logo: t.logo,
      network: t.network,
    }));
  }, [getBridgeAvailableTokens]);

  const handleGetBridgeEstimate = useCallback(async (
    symbolIn: string,
    symbolOut: string,
    amount: number,
    networkIn?: string,
    networkOut?: string,
  ): Promise<BridgeEstimateSimple | null> => {
    const result = await getBridgeEstimate(symbolIn, symbolOut, amount, networkIn, networkOut);
    if (!result) return null;
    return {
      estimatedAmount: result.estimatedAmount,
      minAmount: result.minAmount,
      symbolIn,
      symbolOut,
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
    const result = await createBridgeExchange(symbolIn, symbolOut, amount, addressTo, networkIn, networkOut);
    if (!result) return null;
    return {
      id: result.id,
      depositAddress: result.payinAddress,
      amountIn: amount,
      amountOut: result.amountExpectedTo,
      symbolIn,
      symbolOut,
      addressTo,
      status: result.status,
    };
  }, [createBridgeExchange]);

  const handleGetBridgeTransactionStatus = useCallback(async (id: string) => {
    const result = await getBridgeTransactionStatus(id);
    if (!result) return null;
    return {
      status: result.status,
      payoutTxId: result.payoutHash,
    };
  }, [getBridgeTransactionStatus]);

  const handleSendDeposit = useCallback(async (
    depositAddress: string,
    tokenAddress: string,
    amount: number,
  ): Promise<{ txId: string }> => {
    if (!activeBlockchainAccount) return { txId: '' };
    return activeBlockchainAccount.transfer(depositAddress, tokenAddress, amount);
  }, [activeBlockchainAccount]);

  const handleBridgeSuccess = useCallback(() => resetBridge(), [resetBridge]);

  const handleBridgeError = useCallback((error: Error) => {
    resetBridge();
    console.error('Bridge Failed:', error.message);
  }, [resetBridge]);

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
