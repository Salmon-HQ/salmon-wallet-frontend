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
  /** Reports when the flow owns the screen (post-signature). */
  onFlowLockChange?: (locked: boolean) => void;
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

export function SwapTab({ onNavigateHome, onFlowLockChange }: SwapTabProps): React.ReactElement {
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
  const swapTokens: SwapToken[] = useMemo(
    () => multiChainTokens.map(unifiedToSwapToken),
    [multiChainTokens]
  );
  const featuredTokens: SwapToken[] = useMemo(() => topTokens.map(unifiedToSwapToken), [topTokens]);

  // Jupiter token list (shared React Query hook)
  const { tokens: jupiterTokens } = useJupiterTokenList({ networkId: swapNetworkId });

  // Default recipient address (BTC for bridges)
  const defaultRecipientAddress = useMemo(() => {
    const btcAccounts = activeAccount?.networksAccounts?.['bitcoin-mainnet'];
    const btcAccount = btcAccounts?.find((a) => a !== null) as
      { getReceiveAddress(): string } | undefined;
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

  const handleGetQuote = useCallback(
    async (inToken: SwapToken, outToken: SwapToken, amount: string): Promise<SwapQuote> => {
      // Same guard rails mobile and the extension already had. Web was
      // quoting with no account and no amount validation.
      if (!activeBlockchainAccount) throw new Error('swap.errors.noActiveAccount');

      const inputAmount = parseFloat(amount);
      if (isNaN(inputAmount) || inputAmount <= 0) throw new Error('swap.errors.invalidAmount');

      const quote = await getSwapQuote({
        inputMint: inToken.address,
        outputMint: outToken.address,
        amount: inputAmount,
        inputDecimals: inToken.decimals,
      });

      if (!quote) throw new Error(_swapError || 'swap.errors.quoteFailed');

      currentSharedQuoteRef.current = quote;
      return quote as unknown as SwapQuote;
    },
    [activeBlockchainAccount, getSwapQuote, _swapError]
  );

  const handleSwap = useCallback(
    async (_quote: SwapQuote): Promise<{ txId: string }> => {
      if (!activeBlockchainAccount) throw new Error('swap.errors.noActiveAccount');
      if (!currentSharedQuoteRef.current) throw new Error('swap.errors.noQuote');

      // Race guard: the hook's internal quote must be the quote the user is
      // looking at, not merely some quote. Web checked only truthiness and
      // could sign against a mismatched quote.
      if (
        !swapQuote ||
        swapQuote.custom?.requestId !== currentSharedQuoteRef.current.custom?.requestId
      ) {
        throw new Error('transaction.errors.quoteExpired');
      }

      const result = await executeSwapHook();
      if (result.status === 'fail') throw new Error(result.error || 'transaction.errors.generic');

      currentSharedQuoteRef.current = null;
      return { txId: result.txId || '' };
    },
    [activeBlockchainAccount, swapQuote, executeSwapHook]
  );

  const handleSwapSuccess = useCallback(() => resetSwap(), [resetSwap]);

  const handleSwapError = useCallback(
    (error: Error) => {
      resetSwap();
      console.error('Swap Failed:', error.message);
    },
    [resetSwap]
  );

  const handleSearchTokens = useCallback(
    async (query: string): Promise<SwapToken[]> => {
      const network = networkId === 'solana-devnet' ? 'solana-devnet' : 'solana-mainnet';
      const results = await searchTokens(query, network);
      return results.map((token) => mapToSwapToken(token));
    },
    [networkId]
  );

  const handleGetAvailableTokens = useCallback(
    async (sourceSymbol: string): Promise<BridgeTokenSimple[]> => {
      const result = await getBridgeAvailableTokens(sourceSymbol);
      if (!result) return [];
      return result.map((t) => ({
        symbol: t.symbol,
        name: t.name,
        logo: t.logo,
        network: t.network,
      }));
    },
    [getBridgeAvailableTokens]
  );

  const handleGetBridgeEstimate = useCallback(
    async (
      symbolIn: string,
      symbolOut: string,
      amount: number,
      networkIn?: string,
      networkOut?: string
    ): Promise<BridgeEstimateSimple | null> => {
      const result = await getBridgeEstimate(symbolIn, symbolOut, amount, networkIn, networkOut);
      if (!result) return null;
      return {
        estimatedAmount: result.estimatedAmount,
        minAmount: result.minAmount,
        maxAmount: result.maxAmount ?? null,
        symbolIn,
        symbolOut,
      };
    },
    [getBridgeEstimate]
  );

  const handleCreateBridgeExchange = useCallback(
    async (
      symbolIn: string,
      symbolOut: string,
      amount: number,
      addressTo: string,
      networkIn?: string,
      networkOut?: string
    ): Promise<BridgeExchangeSimple | null> => {
      const result = await createBridgeExchange(
        symbolIn,
        symbolOut,
        amount,
        addressTo,
        networkIn,
        networkOut,
        // Refund address: the deposit is sent from the active account
        // (see onSendDeposit), so a failed exchange must come back there.
        activeBlockchainAccount?.getReceiveAddress()
      );
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
    },
    [createBridgeExchange, activeBlockchainAccount]
  );

  const handleGetBridgeTransactionStatus = useCallback(
    async (id: string) => {
      const result = await getBridgeTransactionStatus(id);
      if (!result) return null;
      return {
        status: result.status,
        payoutTxId: result.payoutHash,
      };
    },
    [getBridgeTransactionStatus]
  );

  const handleSendDeposit = useCallback(
    async (
      depositAddress: string,
      tokenAddress: string,
      amount: number
    ): Promise<{ txId: string }> => {
      if (!activeBlockchainAccount) return { txId: '' };
      return activeBlockchainAccount.transfer(depositAddress, tokenAddress, amount);
    },
    [activeBlockchainAccount]
  );

  const handleBridgeSuccess = useCallback(() => resetBridge(), [resetBridge]);

  const handleBridgeError = useCallback(
    (error: Error) => {
      resetBridge();
      console.error('Bridge Failed:', error.message);
    },
    [resetBridge]
  );

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
        onFlowLockChange={onFlowLockChange}
      />
    </Container>
  );
}
