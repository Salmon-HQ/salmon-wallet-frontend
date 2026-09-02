/**
 * SwapPage - Token swap interface for extension
 *
 * Wrapper around SwapScreen from extension components.
 * Wires useSwap, useMultiChainTokens hooks.
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
  useJupiterTokenList,
  useMultiChainTokens,
  useSwap,
  type SwapQuote as SharedSwapQuote,
  type SolanaAccount,
  type SwapNetworkId,
  unifiedToSwapToken,
} from '@salmon/shared';
import { SwapScreen, type SwapQuote, type SwapToken } from '../../components';

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
  fontSize: fontSize.bodyLg,
});

// ============================================================================
// Component
// ============================================================================

interface SwapPageProps {
  onNavigateHome?: () => void;
  /** Reports when the flow owns the screen (post-signature). */
  onFlowLockChange?: (locked: boolean) => void;
  /** Reports when the flow becomes a task (review onward) — see SwapScreen. */
  onTaskChange?: (isTask: boolean) => void;
}

export function SwapPage({ onNavigateHome, onFlowLockChange, onTaskChange }: SwapPageProps = {}) {
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
    tokens: multiChainTokens,
    featuredTokens: topTokens,
    loading,
  } = useMultiChainTokens({
    activeAccount,
    skip: !ready || !activeAccount,
  });

  // Jupiter only swaps within Solana, so the selectable list is Solana-only.
  const swapTokens: SwapToken[] = useMemo(() => {
    return multiChainTokens.filter((t) => t.chain === 'solana').map(unifiedToSwapToken);
  }, [multiChainTokens]);

  const featuredTokens: SwapToken[] = useMemo(() => {
    return topTokens.filter((t) => t.chain === 'solana').map(unifiedToSwapToken);
  }, [topTokens]);

  // Full Jupiter verified token catalog (shared React Query hook)
  const { tokens: jupiterTokens } = useJupiterTokenList({ networkId: swapNetworkId });

  // Swap handlers
  const handleGetQuote = useCallback(
    async (inToken: SwapToken, outToken: SwapToken, amount: string): Promise<SwapQuote> => {
      if (!activeBlockchainAccount) throw new Error('swap.errors.noActiveAccount');

      const inputAmount = parseFloat(amount);
      if (isNaN(inputAmount) || inputAmount <= 0) throw new Error('swap.errors.invalidAmount');

      const quote = await getSwapQuote({
        inputMint: inToken.address,
        outputMint: outToken.address,
        amount: inputAmount,
        inputDecimals: inToken.decimals,
      });

      if (!quote) throw new Error(swapError || 'swap.errors.quoteFailed');

      currentSharedQuoteRef.current = quote;
      return quote as unknown as SwapQuote;
    },
    [activeBlockchainAccount, getSwapQuote, swapError]
  );

  const handleSwap = useCallback(
    async (_quote: SwapQuote): Promise<{ txId: string }> => {
      if (!activeBlockchainAccount) throw new Error('swap.errors.noActiveAccount');
      if (!currentSharedQuoteRef.current) throw new Error('swap.errors.noQuote');

      // Verify hook's internal quote matches the displayed quote to prevent race conditions
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
    [activeBlockchainAccount, executeSwapHook, swapQuote]
  );

  const handleSwapSuccess = useCallback(() => {
    resetSwap();
  }, [resetSwap]);

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
      try {
        const results = await searchTokens(query, network);
        return results.map((token) => mapToSwapToken(token));
      } catch {
        return [];
      }
    },
    [networkId]
  );

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
