import React, { useCallback, useMemo, useRef } from 'react';
import { styled } from '@salmon/ui';
import Box from '@mui/material/Box';
import {
  useAccountsContext,
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
import { SwapScreen, type SwapQuote, type SwapToken } from '@salmon/ui';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SwapTabProps {
  onNavigateHome?: () => void;
  /** Reports when the flow owns the screen (post-signature). */
  onFlowLockChange?: (locked: boolean) => void;
  /** Reports when the flow becomes a task (review onward) — see SwapScreen. */
  onTaskChange?: (isTask: boolean) => void;
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

export function SwapTab({
  onNavigateHome,
  onFlowLockChange,
  onTaskChange,
}: SwapTabProps): React.ReactElement {
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

  // Multi-chain tokens
  const {
    tokens: multiChainTokens,
    featuredTokens: topTokens,
    loading,
  } = useMultiChainTokens({
    activeAccount,
    skip: !ready || !activeAccount,
  });

  // Jupiter only swaps within Solana, so the selectable list is Solana-only.
  const swapTokens: SwapToken[] = useMemo(
    () => multiChainTokens.filter((t) => t.chain === 'solana').map(unifiedToSwapToken),
    [multiChainTokens]
  );
  const featuredTokens: SwapToken[] = useMemo(
    () => topTokens.filter((t) => t.chain === 'solana').map(unifiedToSwapToken),
    [topTokens]
  );

  // Jupiter token list (shared React Query hook)
  const { tokens: jupiterTokens } = useJupiterTokenList({ networkId: swapNetworkId });

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

  return (
    <Container>
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
        onNavigateHome={onNavigateHome}
        onFlowLockChange={onFlowLockChange}
        onTaskChange={onTaskChange}
      />
    </Container>
  );
}
