/**
 * useSwapScreenLogic — shared hook for SwapScreen (mobile & extension).
 *
 * Extracts all duplicated state, effects, computed values, and handlers
 * so that platform components only provide JSX + platform-specific alerts.
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import i18n from 'i18next';
import type {
  SwapScreenProps,
  SwapToken,
  SwapQuote,
  SwapScreenStep,
  SwapErrorMessage,
  SwapSuccessSummary,
} from '../types/swap';
import type { TokenSelectorToken } from '../types/ui/token-selector';
import { classifyTransactionError } from '../utils/transaction-errors';
import { useSettleAfterTx, useSettleUntilChanged } from '../query/invalidation';
import { usePendingTransactionsOptional } from '../contexts/PendingTransactionsContext';
import type { NetworkId } from '../types/blockchain';

// ============================================================================
// Constants
// ============================================================================

const MIN_SWAP_USD = 1;
const QUOTE_DEBOUNCE_MS = 500;

/**
 * Converts a quote's raw output amount to a display amount.
 *
 * The quote must carry its own decimals. Falling back to the token list's
 * decimals looks harmless but is not: the backend fills `output.decimals` from
 * a server-side token lookup (`decimals: token?.decimals`), so a lookup miss
 * sends `undefined`, and the fallback silently formats the amount with the
 * WRONG token's scale — observed rendering 14.262397 SOL for a quote that was
 * really 0.014262181 SOL, a 1000x overstatement on the screen where the user
 * decides to sign. Returning null makes the caller surface a quote error
 * instead of inventing a number.
 */
export function formatQuoteOutAmount(quote: SwapQuote): string | null {
  const decimals = quote.output?.decimals;
  // Amounts arrive as strings from the quote provider, so coerce; decimals must
  // be a real number — that is the value we refuse to guess.
  const amount = Number(quote.output?.amount);
  if (typeof decimals !== 'number' || !Number.isFinite(decimals)) return null;
  if (!Number.isFinite(amount)) return null;
  return (amount / 10 ** decimals).toString();
}

// Jupiter quotes are valid for ~30s on mainnet; 15s gives the user a full read
// of the review screen without firing a stale-quote refresh mid-confirm.
const QUOTE_COUNTDOWN_SECONDS = 15;

function getSwapTokenKey(token: SwapToken | null | undefined): string | null {
  if (!token) return null;

  return [token.chain || '', token.networkId || '', token.address || '', token.symbol || ''].join(
    ':'
  );
}

function findMatchingToken(
  tokens: SwapToken[],
  target: SwapToken | null | undefined
): SwapToken | null {
  if (!target) return null;

  const targetKey = getSwapTokenKey(target);
  return (
    tokens.find((token) => getSwapTokenKey(token) === targetKey) ??
    tokens.find(
      (token) => token.address === target.address && (token.chain || '') === (target.chain || '')
    ) ??
    null
  );
}

function hasTokenSnapshotChanged(
  current: SwapToken | null | undefined,
  next: SwapToken | null | undefined
): boolean {
  if (!current || !next) {
    return current !== next;
  }

  return (
    current.name !== next.name ||
    current.symbol !== next.symbol ||
    current.logo !== next.logo ||
    current.balance !== next.balance ||
    current.usdPrice !== next.usdPrice ||
    current.decimals !== next.decimals ||
    current.networkId !== next.networkId
  );
}

// ============================================================================
// Internal sub-hooks
// ============================================================================

/**
 * Manages a countdown timer for quote expiration.
 * Starts when entering review step, stops when leaving or confirming.
 */
function useCountdownTimer({
  shouldRun,
  shouldReset,
}: {
  shouldRun: boolean;
  shouldReset: boolean;
}) {
  const [countdown, setCountdown] = useState(QUOTE_COUNTDOWN_SECONDS);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    clearCountdown();
    setCountdown(QUOTE_COUNTDOWN_SECONDS);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          countdownIntervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearCountdown]);

  useEffect(() => {
    if (shouldRun) {
      startCountdown();
    } else {
      clearCountdown();
      if (shouldReset) {
        setCountdown(QUOTE_COUNTDOWN_SECONDS);
      }
    }
    return clearCountdown;
  }, [shouldRun, shouldReset, startCountdown, clearCountdown]);

  return { countdown, startCountdown, clearCountdown };
}

// ============================================================================
// Hook options
// ============================================================================

export interface UseSwapScreenLogicParams<StyleType = unknown> extends SwapScreenProps<StyleType> {}

// ============================================================================
// Return type
// ============================================================================

export interface UseSwapScreenLogicResult {
  // State
  step: SwapScreenStep;
  /**
   * The last swap failure — a translation key, or a key plus its
   * interpolation params. Cleared when the user edits the amount or confirms
   * again. The form renders it inline.
   */
  swapError: SwapErrorMessage | null;
  inToken: SwapToken | null;
  outToken: SwapToken | null;
  inAmount: string;
  outAmount: string;
  quote: SwapQuote | null;
  isLoadingQuote: boolean;
  isConfirming: boolean;
  showInTokenModal: boolean;
  showOutTokenModal: boolean;
  tokensLoading: boolean;
  successTxId: string | null;
  /**
   * Snapshot of the confirmed pair, captured right before entering the
   * success step. Success screens must render from this instead of live
   * inToken/outToken/amount state, which the post-swap balance refresh can
   * mutate underneath the mounted screen. Null until a confirm succeeds;
   * cleared on continue.
   */
  successSummary: SwapSuccessSummary | null;
  /**
   * True while the swap is waiting for the indexer to reflect the new
   * balances. A success screen can gate its "Done" CTA on this.
   */
  settling: boolean;

  // Computed
  swapMode: 'jupiter' | null;
  inUsdValue: number;
  canReview: boolean;
  reviewWarning: SwapErrorMessage | null;
  priceImpact: number | null;
  outputTokens: SwapToken[];

  // Modal token lists (with mint/uiAmount for TokenSelectorModal compat)
  modalInTokens: (SwapToken & { mint: string; uiAmount: number })[];
  modalFeaturedTokens: (SwapToken & { mint: string; uiAmount: number })[];
  modalOutTokens: (SwapToken & { mint: string; uiAmount: number; network?: string })[];

  // Setters
  setInAmount: (v: string) => void;
  setShowInTokenModal: (v: boolean) => void;
  setShowOutTokenModal: (v: boolean) => void;

  // Handlers
  handleInTokenSelect: (token: SwapToken) => void;
  handleOutTokenSelect: (token: SwapToken) => void;
  handleInTokenModalSelect: (token: TokenSelectorToken) => void;
  handleOutTokenModalSelect: (token: TokenSelectorToken) => void;
  handleSearchTokens: ((query: string) => Promise<TokenSelectorToken[]>) | undefined;
  handleReview: () => void;
  handleBackFromReview: () => void;
  handleConfirmSwap: () => Promise<void>;
  handleConfirmOrRefresh: () => Promise<void>;
  handleSuccessContinue: () => void;
  swapConfirmLabel: string;
}

// ============================================================================
// Hook
// ============================================================================

export function useSwapScreenLogic<StyleType = unknown>({
  tokens,
  featuredTokens = [],
  loading = false,
  onGetQuote,
  onSwap,
  onSuccess,
  onError,
  onSearchTokens,
  initialInToken,
  initialOutToken,
  jupiterTokens = [],
  onNavigateHome,
}: UseSwapScreenLogicParams<StyleType>): UseSwapScreenLogicResult {
  const settleAfterTx = useSettleAfterTx();
  const settleUntilChanged = useSettleUntilChanged();
  const pendingTransactions = usePendingTransactionsOptional();
  // ── State ──────────────────────────────────────────────────────────────

  const [step, setStep] = useState<SwapScreenStep>('input');
  const [swapError, setSwapError] = useState<SwapErrorMessage | null>(null);
  const [settling, setSettling] = useState(false);
  const [inToken, setInToken] = useState<SwapToken | null>(initialInToken || tokens[0] || null);
  const [outToken, setOutToken] = useState<SwapToken | null>(initialOutToken || null);
  const [inAmount, setInAmount] = useState('');
  const [outAmount, setOutAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<SwapErrorMessage | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [successTxId, setSuccessTxId] = useState<string | null>(null);
  const [successSummary, setSuccessSummary] = useState<SwapSuccessSummary | null>(null);
  const [showInTokenModal, setShowInTokenModal] = useState(false);
  const [showOutTokenModal, setShowOutTokenModal] = useState(false);

  const quoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic sequence for quote requests. The debounce timer above only
  // cancels requests that have not fired yet; once a fetch is in flight, a
  // slow response can land after the inputs changed (or after a manual
  // refresh) and overwrite the newer quote. Every new request bumps the
  // sequence, and responses whose ticket no longer matches are discarded.
  const quoteSeqRef = useRef(0);
  const { countdown, startCountdown } = useCountdownTimer({
    shouldRun: step === 'review' && !isConfirming,
    shouldReset: step !== 'review',
  });

  // ── Computed ───────────────────────────────────────────────────────────

  const swapMode: 'jupiter' | null = useMemo(() => {
    if (!inToken || !outToken) return null;
    if (inToken.chain !== 'solana' || outToken.chain !== 'solana') return null;
    return 'jupiter';
  }, [inToken, outToken]);

  // The `inToken` state is captured at selection time; balance can become stale
  // if funds arrive while the user is on the swap screen. `inTokenLive` re-reads
  // the matching entry from the reactive `tokens` prop on every render so
  // balance-dependent validation always uses fresh data. Falls back to the
  // selected snapshot when no live entry exists (e.g. token not yet in list).
  const inTokenLive = useMemo(
    () => (inToken ? (findMatchingToken(tokens, inToken) ?? inToken) : null),
    [inToken, tokens]
  );

  const inTokenPrice =
    tokens.find((t) => t.address === inToken?.address)?.usdPrice ?? inToken?.usdPrice;
  const inUsdValue = inTokenPrice && inAmount ? parseFloat(inAmount) * inTokenPrice : 0;

  const canReview =
    swapMode === 'jupiter' &&
    !!inToken &&
    !!outToken &&
    !!inAmount &&
    parseFloat(inAmount) > 0 &&
    parseFloat(inAmount) <= (inTokenLive?.balance || 0) &&
    inUsdValue >= MIN_SWAP_USD &&
    !isLoadingQuote &&
    !quoteError &&
    !!quote;

  const reviewWarning: SwapErrorMessage | null = (() => {
    if (!inToken || !inAmount || parseFloat(inAmount) <= 0) return null;
    if (parseFloat(inAmount) > (inTokenLive?.balance || 0))
      return 'swap.errors.insufficientBalance';
    if (inUsdValue > 0 && inUsdValue < MIN_SWAP_USD)
      return { key: 'swap.errors.minimumAmount', params: { amount: MIN_SWAP_USD.toFixed(2) } };
    if (quoteError) return quoteError;
    if (quote?.custom?.priceImpact != null && quote.custom.priceImpact > 3)
      return 'swap.errors.highPriceImpact';
    return null;
  })();

  const priceImpact: number | null = quote?.custom?.priceImpact ?? null;

  // ── Effects ────────────────────────────────────────────────────────────

  // Stabilize callback ref (updated in an effect: react-hooks/refs forbids
  // ref writes during render; only read inside the debounced timer, which
  // fires after effects have run)
  const onGetQuoteRef = useRef(onGetQuote);
  useEffect(() => {
    onGetQuoteRef.current = onGetQuote;
  });

  // Fetch quote when input changes
  useEffect(() => {
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    // Any response still in flight belongs to older inputs: invalidate it.
    const seq = ++quoteSeqRef.current;

    setOutAmount('');
    setQuote(null);
    setQuoteError(null);
    // The invalidated request can no longer clear its own loading flag (its
    // finally is seq-guarded, and its debounce timer may never fire at all),
    // so this run owns the flag.
    setIsLoadingQuote(false);

    if (!inToken || !outToken || !inAmount || parseFloat(inAmount) <= 0) return;
    if (inToken.chain !== 'solana' || outToken.chain !== 'solana') return;

    setIsLoadingQuote(true);
    quoteTimerRef.current = setTimeout(async () => {
      try {
        const fetchedQuote = await onGetQuoteRef.current(inToken, outToken, inAmount);
        if (seq !== quoteSeqRef.current) return; // stale response — a newer request owns the state
        const displayAmount = formatQuoteOutAmount(fetchedQuote);
        if (displayAmount === null) {
          setQuote(null);
          setOutAmount('');
          setQuoteError('swap.errors.quoteFailed');
          return;
        }
        setQuote(fetchedQuote);
        setOutAmount(displayAmount);
        setQuoteError(null);
      } catch (error) {
        if (seq !== quoteSeqRef.current) return;
        console.error('Failed to fetch quote:', error);
        setQuoteError('swap.errors.quoteFailed');
        setOutAmount('');
      } finally {
        // A stale request must not clear the loading flag the newer one set.
        if (seq === quoteSeqRef.current) setIsLoadingQuote(false);
      }
    }, QUOTE_DEBOUNCE_MS);

    return () => {
      if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    };
  }, [inToken, outToken, inAmount]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleInTokenSelect = useCallback(
    (token: SwapToken) => {
      setInToken(token);
      setShowInTokenModal(false);
      if (outToken?.address === token.address && outToken?.chain === token.chain) {
        setOutToken(null);
      }
      setInAmount('');
      setOutAmount('');
      setQuote(null);
    },
    [outToken]
  );

  const handleOutTokenSelect = useCallback(
    (token: SwapToken) => {
      setOutToken(token);
      setShowOutTokenModal(false);
      if (inToken?.address === token.address && inToken?.chain === token.chain) {
        setInToken(null);
      }
    },
    [inToken]
  );

  // Modal-level handlers: convert TokenSelectorToken → SwapToken and delegate
  const handleInTokenModalSelect = useCallback(
    (token: TokenSelectorToken) => {
      const originalToken = tokens.find((t) => t.address === (token.mint || token.address));
      handleInTokenSelect({
        address: token.mint || token.address || '',
        symbol: token.symbol || '',
        name: token.name,
        decimals: originalToken?.decimals || 9,
        logo: token.logo,
        balance: token.uiAmount,
        usdPrice: originalToken?.usdPrice,
        chain: originalToken?.chain,
        networkId: originalToken?.networkId,
      });
    },
    [tokens, handleInTokenSelect]
  );

  const handleInAmountChange = useCallback((value: string) => {
    setSwapError(null);
    setInAmount(value);
  }, []);

  const handleReview = useCallback(() => {
    if (swapMode === 'jupiter' && quote) {
      setStep('review');
    }
  }, [swapMode, quote]);

  const handleBackFromReview = useCallback(() => {
    setStep('input');
  }, []);

  // Freeze the confirmed pair for the success screen. Live form state keeps
  // reacting to token-list refreshes after the swap (a fully-spent input token
  // drops out and the reselection effect falls back to tokens[0]), so success
  // rendering must never read it.
  const captureSuccessSummary = useCallback(() => {
    setSuccessSummary({
      inAmount,
      inSymbol: inToken?.symbol ?? '',
      outAmount,
      outSymbol: outToken?.symbol ?? '',
      chain: inToken?.chain,
      networkId: inToken?.networkId,
      inLogo: inToken?.logo ?? undefined,
      outLogo: outToken?.logo ?? undefined,
      feePercent: quote?.fee?.percent,
    });
  }, [inAmount, outAmount, inToken, outToken, quote]);

  const handleConfirmSwap = useCallback(async () => {
    if (!quote) return;

    setIsConfirming(true);
    setSwapError(null);
    try {
      const result = await onSwap(quote);
      setSuccessTxId(result.txId);
      // Hand the signature to the global pending store before any screen-owned
      // state moves. `step` and the settle await below both die with this
      // component; the pending entry is what reports the outcome to a user who
      // navigates away, locks, or kills the app mid-flight.
      pendingTransactions?.trackPendingTransaction({
        signature: String(result.txId),
        kind: 'swap',
        networkId: quote.networkId as NetworkId,
        submittedAt: Date.now(),
        summary:
          `${inAmount} ${inToken?.symbol ?? ''} → ${outAmount} ${outToken?.symbol ?? ''}`.trim(),
      });
      captureSuccessSummary();
      setStep('success');
      // This screen is now the one surface reporting this signature. The banner
      // withholds it until the release below, so the app cannot report
      // "processing" here and "confirmed" there at the same time.
      const releaseReport = pendingTransactions?.claimForegroundReport(String(result.txId));
      // Settle until the indexer reflects both token balances so the success
      // screen can dwell and return the user to fresh numbers. `settling`
      // drives the success-screen "Done" gate.
      setSettling(true);
      settleUntilChanged({
        networkId: quote.networkId as NetworkId,
        kinds: ['balance', 'transactions'],
      })
        .catch((err) => {
          console.warn('[useSwapScreenLogic] settleUntilChanged failed:', err);
        })
        .finally(() => {
          setSettling(false);
          releaseReport?.();
        });
      onSuccess?.(result.txId);
    } catch (error) {
      console.error('Swap failed:', error);
      setSwapError(classifyTransactionError(error));
      setStep('input');
      onError?.(error as Error);
    } finally {
      setIsConfirming(false);
    }
  }, [
    onError,
    onSuccess,
    onSwap,
    quote,
    settleUntilChanged,
    captureSuccessSummary,
    pendingTransactions,
    inAmount,
    outAmount,
    inToken,
    outToken,
  ]);

  const handleRefreshQuote = useCallback(async () => {
    if (isLoadingQuote) return;
    if (!inToken || !outToken || !inAmount || parseFloat(inAmount) <= 0) return;
    if (inToken.chain !== 'solana' || outToken.chain !== 'solana') return;

    // A manual refresh supersedes any debounced request still in flight.
    const seq = ++quoteSeqRef.current;
    setIsLoadingQuote(true);
    try {
      const fetchedQuote = await onGetQuoteRef.current(inToken, outToken, inAmount);
      if (seq !== quoteSeqRef.current) return;
      const displayAmount = formatQuoteOutAmount(fetchedQuote);
      if (displayAmount === null) {
        setQuote(null);
        setOutAmount('');
        setQuoteError('swap.errors.quoteFailed');
        return;
      }
      setQuote(fetchedQuote);
      setOutAmount(displayAmount);
      setQuoteError(null);
    } catch (error) {
      if (seq !== quoteSeqRef.current) return;
      console.error('Failed to refresh quote:', error);
      setQuoteError('swap.errors.quoteFailed');
    } finally {
      if (seq === quoteSeqRef.current) setIsLoadingQuote(false);
    }
    startCountdown();
  }, [isLoadingQuote, inToken, outToken, inAmount, startCountdown]);

  // The commit button names the operation. The countdown is interpolated, not
  // concatenated, so the whole label goes through translation.
  const swapConfirmLabel = useMemo(() => {
    if (countdown <= 0) {
      return i18n.t('swap.review.refreshQuote', { defaultValue: 'Refresh Quote' });
    }
    return i18n.t('swap.review.confirmCountdown', {
      seconds: countdown,
      defaultValue: 'Confirm ({{seconds}})',
    });
  }, [countdown]);

  const handleConfirmOrRefresh = useCallback(async () => {
    if (countdown <= 0) {
      await handleRefreshQuote();
    } else {
      await handleConfirmSwap();
    }
  }, [countdown, handleRefreshQuote, handleConfirmSwap]);

  const handleSuccessContinue = useCallback(() => {
    setStep('input');
    setInAmount('');
    setOutAmount('');
    setQuote(null);
    setSuccessTxId(null);
    setSuccessSummary(null);
    settleAfterTx({ kinds: ['balance', 'transactions'], settlementDelaysMs: [] }).catch(
      () => undefined
    );
    onNavigateHome?.();
  }, [settleAfterTx, onNavigateHome]);

  // ── Derived / memoised ─────────────────────────────────────────────────

  const outputTokens = useMemo(() => {
    if (!inToken) return tokens;

    // User's Solana balance tokens first (they have balance/price data),
    // then the Jupiter catalog tokens not already in the user's list.
    const userSolanaTokens = tokens.filter((t) => (t.chain || 'solana') === 'solana');
    const userAddresses = new Set(userSolanaTokens.map((t) => t.address.toLowerCase()));
    const remainingJupiter = jupiterTokens.filter(
      (t) => !userAddresses.has(t.address.toLowerCase())
    );

    return [...userSolanaTokens, ...remainingJupiter];
  }, [inToken, tokens, jupiterTokens]);

  useEffect(() => {
    if (tokens.length === 0) {
      if (inToken !== null) {
        setInToken(null);
      }
      return;
    }

    if (!inToken) {
      const nextToken = findMatchingToken(tokens, initialInToken ?? null) ?? tokens[0] ?? null;
      if (nextToken) {
        setInToken(nextToken);
      }
      return;
    }

    const matchedToken = findMatchingToken(tokens, inToken);
    if (!matchedToken) {
      const fallbackToken = findMatchingToken(tokens, initialInToken ?? null) ?? tokens[0] ?? null;
      if (fallbackToken && getSwapTokenKey(fallbackToken) !== getSwapTokenKey(inToken)) {
        setInToken(fallbackToken);
      }
      setInAmount('');
      setOutAmount('');
      setQuote(null);
      return;
    }

    if (hasTokenSnapshotChanged(inToken, matchedToken)) {
      setInToken(matchedToken);
    }
  }, [initialInToken, inToken, tokens]);

  useEffect(() => {
    if (!outToken) {
      return;
    }

    const matchedToken = findMatchingToken(outputTokens, outToken);
    if (!matchedToken) {
      setOutToken(null);
      setOutAmount('');
      setQuote(null);
      return;
    }

    if (hasTokenSnapshotChanged(outToken, matchedToken)) {
      setOutToken(matchedToken);
    }
  }, [outToken, outputTokens]);

  // Modal-level handler for output token (needs outputTokens, so defined after it)
  const handleOutTokenModalSelect = useCallback(
    (token: TokenSelectorToken) => {
      const originalToken = outputTokens.find(
        (t) => t.address === (token.mint || token.address) || t.symbol === token.symbol
      );
      handleOutTokenSelect({
        address: token.mint || token.address || '',
        symbol: token.symbol || '',
        name: token.name,
        decimals: originalToken?.decimals || 9,
        logo: token.logo,
        balance: token.uiAmount,
        usdPrice: originalToken?.usdPrice,
        chain: originalToken?.chain,
        networkId: originalToken?.networkId || token.network,
      });
    },
    [outputTokens, handleOutTokenSelect]
  );

  // Search wrapper: converts SwapToken[] → TokenSelectorToken[]
  const handleSearchTokens = onSearchTokens
    ? async (query: string): Promise<TokenSelectorToken[]> => {
        const results = await onSearchTokens(query);
        return results.map((t) => ({
          ...t,
          mint: t.address,
          uiAmount: t.balance || 0,
        }));
      }
    : undefined;

  const modalInTokens = tokens.map((t) => ({
    ...t,
    mint: t.address,
    uiAmount: t.balance || 0,
  }));

  const modalFeaturedTokens = featuredTokens.map((t) => ({
    ...t,
    mint: t.address,
    uiAmount: t.balance || 0,
  }));

  const modalOutTokens = outputTokens.map((t) => ({
    ...t,
    mint: t.address,
    uiAmount: t.balance || 0,
    network: t.networkId,
  }));

  // ── Return ─────────────────────────────────────────────────────────────

  return {
    step,
    swapError,
    inToken,
    outToken,
    inAmount,
    outAmount,
    quote,
    isLoadingQuote,
    isConfirming,
    showInTokenModal,
    showOutTokenModal,
    tokensLoading: loading,
    successTxId,
    successSummary,
    settling,

    swapMode,
    inUsdValue,
    canReview,
    reviewWarning,
    priceImpact,
    outputTokens,

    modalInTokens,
    modalFeaturedTokens,
    modalOutTokens,

    setInAmount: handleInAmountChange,
    setShowInTokenModal,
    setShowOutTokenModal,

    handleInTokenSelect,
    handleOutTokenSelect,
    handleInTokenModalSelect,
    handleOutTokenModalSelect,
    handleSearchTokens,
    handleReview,
    handleBackFromReview,
    handleConfirmSwap,
    handleConfirmOrRefresh,
    handleSuccessContinue,
    swapConfirmLabel,
  };
}
