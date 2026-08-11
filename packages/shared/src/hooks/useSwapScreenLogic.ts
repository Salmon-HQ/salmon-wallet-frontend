/**
 * useSwapScreenLogic — shared hook for SwapScreen (mobile & extension).
 *
 * Extracts all duplicated state, effects, computed values, and handlers
 * so that platform components only provide JSX + platform-specific alerts.
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type {
  SwapScreenProps,
  SwapToken,
  SwapQuote,
  SwapScreenStep,
  SwapChainType,
  BridgeEstimateSimple,
  BridgeExchangeSimple,
  BridgeTransactionSimple,
} from '../types/swap';
import type { TokenSelectorToken } from '../types/ui/token-selector';
import type {
  BridgeChain,
  BridgeToken,
  BridgeEstimate,
} from '../types/ui/bridge-screen';
import type { NetworkId } from '../types/blockchain';
import { getSwapMode, validateAddress, getChainFromNetwork, toStealthExNetwork } from '../utils/swap';
import { classifyTransactionError } from '../utils/transaction-errors';
import { classifyBridgeError } from '../utils/bridge-errors';
import { getChainDisplayName } from '../utils/account';
import { KNOWN_DECIMALS, NATIVE_TOKEN_LOGOS } from '../utils/tokens';
import { getEnabledNetworkIds } from '../api/services/network';
import { useSettleAfterTx, useSettleUntilChanged } from '../query/invalidation';

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

// Jupiter quotes are valid for ~30s on mainnet but Stealthex bridges drift
// faster, so 15s gives the user a full read of the review screen without
// firing a stale-quote refresh in the middle of confirming.
const QUOTE_COUNTDOWN_SECONDS = 15;

function getSwapTokenKey(token: SwapToken | null | undefined): string | null {
  if (!token) return null;

  return [
    token.chain || '',
    token.networkId || '',
    token.address || '',
    token.symbol || '',
  ].join(':');
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
      (token) =>
        token.address === target.address &&
        (token.chain || '') === (target.chain || '')
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

export interface UseSwapScreenLogicParams<StyleType = unknown> extends SwapScreenProps<StyleType> {
  /**
   * Platform-specific callback invoked when a bridge exchange is created.
   * Mobile uses Alert.alert; extension uses window.alert.
   */
  onBridgeInitiated?: (exchange: BridgeExchangeSimple, inAmount: string, inSymbol: string, outSymbol: string) => void;
  /**
   * Invoked right after a bridge (StealthEX) exchange is created and the deposit
   * is sent. The app should register the exchange with the BridgeSettlement
   * provider so its minutes-long destination settlement is polled in the
   * background — the success screen must NOT block on it. Receives the exchange
   * plus the source/destination network and the destination payout address so
   * the app can build the pending record without reading hook state.
   */
  onBridgeExchangeCreated?: (
    exchange: BridgeExchangeSimple,
    context: {
      sourceNetworkId?: string;
      destNetworkId?: string;
      destinationAddress: string;
    },
  ) => void;
}

// ============================================================================
// Return type
// ============================================================================

export interface UseSwapScreenLogicResult {
  // State
  step: SwapScreenStep;
  /**
   * Translation key for the last swap or bridge failure, cleared when the user
   * edits the amount or confirms again. The form renders it inline.
   */
  swapError: string | null;
  inToken: SwapToken | null;
  outToken: SwapToken | null;
  inAmount: string;
  outAmount: string;
  quote: SwapQuote | null;
  bridgeEstimate: BridgeEstimateSimple | null;
  isLoadingQuote: boolean;
  isLoadingEstimate: boolean;
  isLoadingBridgeTokens: boolean;
  recipientAddress: string;
  addressError: string | null;
  isConfirming: boolean;
  showInTokenModal: boolean;
  showOutTokenModal: boolean;
  tokensLoading: boolean;
  successTxId: string | null;
  successExchange: BridgeExchangeSimple | null;
  depositTxId: string | null;
  bridgeTransaction: BridgeTransactionSimple | null;
  /**
   * True while a same-chain (Jupiter) swap is waiting for the indexer to
   * reflect the new balances. A success screen can gate its "Done" CTA on this.
   * Always false for the StealthEX bridge, whose minutes-long settlement is
   * tracked in the background instead of by blocking the screen.
   */
  settling: boolean;

  // Computed
  swapMode: 'jupiter' | 'stealthex' | null;
  inUsdValue: number;
  canReview: boolean;
  reviewWarning: string | null;
  priceImpact: number | null;
  outputTokens: SwapToken[];
  addressValidation: { valid: boolean; error: string | null };

  // Modal token lists (with mint/uiAmount for TokenSelectorModal compat)
  modalInTokens: (SwapToken & { mint: string; uiAmount: number })[];
  modalFeaturedTokens: (SwapToken & { mint: string; uiAmount: number })[];
  modalOutTokens: (SwapToken & { mint: string; uiAmount: number; network?: string })[];

  // Bridge type conversions
  bridgeTargetChain: BridgeChain | null;
  bridgeInToken: BridgeToken | null;
  bridgeOutToken: BridgeToken | null;
  bridgeEstimateForReview: BridgeEstimate | null;

  // Setters
  setInAmount: (v: string) => void;
  setRecipientAddress: (v: string) => void;
  setShowInTokenModal: (v: boolean) => void;
  setShowOutTokenModal: (v: boolean) => void;

  // Handlers
  handleInTokenSelect: (token: SwapToken) => void;
  handleOutTokenSelect: (token: SwapToken) => void;
  handleInTokenModalSelect: (token: TokenSelectorToken) => void;
  handleOutTokenModalSelect: (token: TokenSelectorToken) => void;
  handleSearchTokens: ((query: string) => Promise<TokenSelectorToken[]>) | undefined;
  handleReview: () => void;
  handleContinueToReview: () => void;
  handleBackFromRecipient: () => void;
  handleBackFromReview: () => void;
  handleConfirmSwap: () => Promise<void>;
  handleConfirmBridge: () => Promise<void>;
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
  defaultRecipientAddress,
  getReceiveAddressForChain,
  // Bridge props
  onGetAvailableTokens,
  onGetBridgeEstimate,
  onCreateBridgeExchange,
  onGetBridgeTransactionStatus,
  onBridgeSuccess,
  onBridgeError,
  onSendDeposit,
  // Platform-specific
  onBridgeInitiated: _onBridgeInitiated,
  onBridgeExchangeCreated,
  onNavigateHome,
}: UseSwapScreenLogicParams<StyleType>): UseSwapScreenLogicResult {
  const settleAfterTx = useSettleAfterTx();
  const settleUntilChanged = useSettleUntilChanged();
  // ── State ──────────────────────────────────────────────────────────────

  const [step, setStep] = useState<SwapScreenStep>('input');
  const [swapError, setSwapError] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);
  const [inToken, setInToken] = useState<SwapToken | null>(initialInToken || tokens[0] || null);
  const [outToken, setOutToken] = useState<SwapToken | null>(initialOutToken || null);
  const [availableOutTokens, setAvailableOutTokens] = useState<SwapToken[]>([]);
  const [inAmount, setInAmount] = useState('');
  const [outAmount, setOutAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [bridgeEstimate, setBridgeEstimate] = useState<BridgeEstimateSimple | null>(null);
  const [isLoadingEstimate, setIsLoadingEstimate] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState(defaultRecipientAddress || '');
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [successTxId, setSuccessTxId] = useState<string | null>(null);
  const [successExchange, setSuccessExchange] = useState<BridgeExchangeSimple | null>(null);
  const [depositTxId, setDepositTxId] = useState<string | null>(null);
  const [bridgeTransaction, setBridgeTransaction] = useState<BridgeTransactionSimple | null>(null);
  const [showInTokenModal, setShowInTokenModal] = useState(false);
  const [showOutTokenModal, setShowOutTokenModal] = useState(false);
  const [isLoadingBridgeTokens, setIsLoadingBridgeTokens] = useState(false);

  const quoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { countdown, startCountdown } = useCountdownTimer({
    shouldRun: step === 'review' && !isConfirming,
    shouldReset: step !== 'review',
  });

  // ── Computed ───────────────────────────────────────────────────────────

  const swapMode = useMemo(() => getSwapMode(inToken, outToken), [inToken, outToken]);

  // The `inToken` state is captured at selection time; balance can become stale
  // if funds arrive while the user is on the swap screen. `inTokenLive` re-reads
  // the matching entry from the reactive `tokens` prop on every render so
  // balance-dependent validation always uses fresh data. Falls back to the
  // selected snapshot when no live entry exists (e.g. token not yet in list).
  const inTokenLive = useMemo(
    () => (inToken ? findMatchingToken(tokens, inToken) ?? inToken : null),
    [inToken, tokens],
  );

  const inTokenPrice = tokens.find(t => t.address === inToken?.address)?.usdPrice ?? inToken?.usdPrice;
  const inUsdValue = inTokenPrice && inAmount
    ? parseFloat(inAmount) * inTokenPrice
    : 0;

  const targetChain: SwapChainType | null = outToken?.chain || null;
  const addressValidation = validateAddress(recipientAddress, targetChain);

  // Bridge auto-fill: when the user picks a cross-chain output, resolve the
  // wallet's own receive address for that chain instead of defaulting to the
  // BTC address. The effect only fires when `targetChain` or `swapMode`
  // change, so subsequent manual edits by the user are preserved until they
  // pick a different output chain. Callers MUST memoise
  // `getReceiveAddressForChain` (e.g. via `useCallback`) or the effect will
  // overwrite manual edits on every render.
  useEffect(() => {
    if (swapMode !== 'stealthex') return;
    if (!targetChain) return;
    if (!getReceiveAddressForChain) return;
    const resolved = getReceiveAddressForChain(targetChain) || '';
    setRecipientAddress(resolved);
  }, [swapMode, targetChain, getReceiveAddressForChain]);

  const canReviewJupiter =
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

  const canContinueToBridge =
    swapMode === 'stealthex' &&
    !!inToken &&
    !!outToken &&
    !!inAmount &&
    parseFloat(inAmount) > 0 &&
    parseFloat(inAmount) <= (inTokenLive?.balance || Infinity) &&
    !isLoadingEstimate &&
    !quoteError &&
    !!bridgeEstimate &&
    (!bridgeEstimate.minAmount || parseFloat(inAmount) >= bridgeEstimate.minAmount);

  const canReview = canReviewJupiter || canContinueToBridge;

  const reviewWarning: string | null = (() => {
    if (!inToken || !inAmount || parseFloat(inAmount) <= 0) return null;
    if (parseFloat(inAmount) > (inTokenLive?.balance || 0)) return 'Insufficient balance';
    if (inUsdValue > 0 && inUsdValue < MIN_SWAP_USD) return `Minimum swap amount is $${MIN_SWAP_USD.toFixed(2)} USD`;
    if (quoteError) return quoteError;
    if (quote?.custom?.priceImpact != null && quote.custom.priceImpact > 3)
      return 'High price impact! You may receive significantly less than expected.';
    return null;
  })();

  const priceImpact: number | null = quote?.custom?.priceImpact ?? null;

  // ── Effects ────────────────────────────────────────────────────────────

  // Load available output tokens when input token changes (for bridge)
  useEffect(() => {
    if (!inToken || !onGetAvailableTokens) return;

    const loadBridgeTokens = async () => {
      setIsLoadingBridgeTokens(true);
      try {
        const enabledNetworkIds = await getEnabledNetworkIds();
        // Backend resolves a canonical chain on each token (e.g. "bitcoin"),
        // so filter at the chain level — native cross-chain tokens carry
        // network=null but still expose a chain.
        const enabledChains = new Set(
          enabledNetworkIds.map((id) => id.split('-')[0]),
        );
        const available = await onGetAvailableTokens(inToken.symbol);
        const bridgeOutputTokens: SwapToken[] = [];
        for (const t of available) {
          // Prefer the chain field provided by the backend resource; fall
          // back to inference for older backends that did not expose it.
          const chain = t.chain ?? getChainFromNetwork(t.network ?? undefined, t.symbol);
          if (!chain) continue;
          if (enabledChains.size > 0 && !enabledChains.has(chain)) continue;
          bridgeOutputTokens.push({
            address: t.symbol,
            symbol: t.symbol,
            name: t.name,
            decimals: KNOWN_DECIMALS[t.symbol.toLowerCase()] ?? 8,
            logo: t.logo || NATIVE_TOKEN_LOGOS[t.symbol.toLowerCase()],
            chain,
            // Backend returns `network: null` for native cross-chain tokens
            // (e.g. SOL, BTC as output destinations). Synthesize the
            // canonical wallet network id from `chain` so downstream
            // consumers (review screen, recipient resolver) always see a
            // populated `networkId` and don't fall back to "Unknown".
            networkId: t.network ?? `${chain}-mainnet`,
          });
        }
        setAvailableOutTokens(bridgeOutputTokens);
      } catch (error) {
        console.error('Failed to load bridge tokens:', error);
        setAvailableOutTokens([]);
      } finally {
        setIsLoadingBridgeTokens(false);
      }
    };

    loadBridgeTokens();
  }, [inToken, onGetAvailableTokens]);

  // Stabilize callback refs
  const onGetQuoteRef = useRef(onGetQuote);
  onGetQuoteRef.current = onGetQuote;
  const onGetBridgeEstimateRef = useRef(onGetBridgeEstimate);
  onGetBridgeEstimateRef.current = onGetBridgeEstimate;

  // Fetch quote/estimate when input changes
  useEffect(() => {
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);

    setOutAmount('');
    setQuote(null);
    setBridgeEstimate(null);
    setBridgeTransaction(null);
    setQuoteError(null);

    if (!inToken || !outToken || !inAmount || parseFloat(inAmount) <= 0) return;

    const mode = getSwapMode(inToken, outToken);

    if (mode === 'jupiter') {
      setIsLoadingQuote(true);
      quoteTimerRef.current = setTimeout(async () => {
        try {
          const fetchedQuote = await onGetQuoteRef.current(inToken, outToken, inAmount);
          const displayAmount = formatQuoteOutAmount(fetchedQuote);
          if (displayAmount === null) {
            setQuote(null);
            setOutAmount('');
            setQuoteError('Failed to fetch quote');
            return;
          }
          setQuote(fetchedQuote);
          setOutAmount(displayAmount);
          setQuoteError(null);
        } catch (error) {
          console.error('Failed to fetch quote:', error);
          setQuoteError('Failed to fetch quote');
          setOutAmount('');
        } finally {
          setIsLoadingQuote(false);
        }
      }, QUOTE_DEBOUNCE_MS);
    } else if (mode === 'stealthex' && onGetBridgeEstimateRef.current) {
      setIsLoadingEstimate(true);
      quoteTimerRef.current = setTimeout(async () => {
        try {
          const estimate = await onGetBridgeEstimateRef.current!(
            inToken.symbol,
            outToken.symbol,
            parseFloat(inAmount),
            toStealthExNetwork(inToken.networkId || inToken.chain),
            toStealthExNetwork(outToken.networkId || outToken.chain)
          );
          if (estimate) {
            setBridgeEstimate(estimate);
            setOutAmount(estimate.estimatedAmount.toString());
          } else {
            setQuoteError('Failed to get swap estimate');
          }
        } catch (error) {
          console.warn('Failed to fetch estimate:', error);
          const message = error instanceof Error ? error.message : 'Failed to get swap estimate';
          setQuoteError(message);
          setOutAmount('');
        } finally {
          setIsLoadingEstimate(false);
        }
      }, QUOTE_DEBOUNCE_MS);
    }

    return () => {
      if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    };
  }, [inToken, outToken, inAmount]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleInTokenSelect = useCallback((token: SwapToken) => {
    setInToken(token);
    setShowInTokenModal(false);
    if (outToken?.address === token.address && outToken?.chain === token.chain) {
      setOutToken(null);
    }
    setInAmount('');
    setOutAmount('');
    setQuote(null);
    setBridgeEstimate(null);
  }, [outToken]);

  const handleOutTokenSelect = useCallback((token: SwapToken) => {
    setOutToken(token);
    setShowOutTokenModal(false);
    if (inToken?.address === token.address && inToken?.chain === token.chain) {
      setInToken(null);
    }
  }, [inToken]);

  // Modal-level handlers: convert TokenSelectorToken → SwapToken and delegate
  const handleInTokenModalSelect = useCallback((token: TokenSelectorToken) => {
    const originalToken = tokens.find(
      (t) => t.address === (token.mint || token.address)
    );
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
  }, [tokens, handleInTokenSelect]);

  const handleInAmountChange = useCallback((value: string) => {
    setSwapError(null);
    setInAmount(value);
  }, []);

  const handleReview = useCallback(() => {
    if (swapMode === 'jupiter' && quote) {
      setStep('review');
    } else if (swapMode === 'stealthex') {
      setStep('recipient');
    }
  }, [swapMode, quote]);

  const handleContinueToReview = useCallback(() => {
    if (addressValidation.valid) {
      setAddressError(null);
      setStep('review');
    } else {
      setAddressError(addressValidation.error || 'Invalid address');
    }
  }, [addressValidation]);

  const handleBackFromRecipient = useCallback(() => {
    setStep('input');
  }, []);

  const handleBackFromReview = useCallback(() => {
    if (swapMode === 'stealthex') {
      setStep('recipient');
    } else {
      setStep('input');
    }
  }, [swapMode]);

  const handleConfirmSwap = useCallback(async () => {
    if (!quote) return;

    setIsConfirming(true);
    setSwapError(null);
    try {
      const result = await onSwap(quote);
      setSuccessTxId(result.txId);
      setStep('success');
      // Jupiter is same-chain: settle until the indexer reflects both token
      // balances so the success screen can dwell and return the user to fresh
      // numbers. `settling` drives the success-screen "Done" gate.
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
  }, [onError, onSuccess, onSwap, quote, settleUntilChanged]);

  const handleConfirmBridge = useCallback(async () => {
    if (!inToken || !outToken || !inAmount || !recipientAddress || !onCreateBridgeExchange) return;

    setIsConfirming(true);
    setSwapError(null);
    try {
      const exchange = await onCreateBridgeExchange(
        inToken.symbol,
        outToken.symbol,
        parseFloat(inAmount),
        recipientAddress,
        toStealthExNetwork(inToken.networkId || inToken.chain),
        toStealthExNetwork(outToken.networkId || outToken.chain)
      );

      if (exchange) {
        // Send deposit to the exchange's deposit address
        if (onSendDeposit && exchange.depositAddress) {
          const { txId } = await onSendDeposit(
            exchange.depositAddress,
            inToken.address,
            parseFloat(inAmount)
          );
          setDepositTxId(txId);
        }
        if (onGetBridgeTransactionStatus) {
          const transaction = await onGetBridgeTransactionStatus(exchange.id);
          setBridgeTransaction(transaction);
        } else {
          setBridgeTransaction({ status: exchange.status });
        }
        setSuccessExchange(exchange);
        setStep('success');
        // Source-side settle only: the deposit has left the wallet, so the
        // source balance will drop within the indexer's lag. The DESTINATION
        // payout takes minutes — hand the exchange to the background poller
        // instead of blocking this screen.
        settleAfterTx({
          kinds: ['balance', 'transactions'],
        }).catch((err) => {
          console.warn('[useSwapScreenLogic] settleAfterTx failed:', err);
        });
        onBridgeExchangeCreated?.(exchange, {
          sourceNetworkId: inToken?.networkId,
          destNetworkId: outToken?.networkId,
          destinationAddress: recipientAddress,
        });
        onBridgeSuccess?.(exchange);
      } else {
        throw new Error('Failed to create bridge exchange');
      }
    } catch (error) {
      console.error('Bridge failed:', error);
      setSwapError(classifyBridgeError(error));
      setStep('input');
      onBridgeError?.(error as Error);
    } finally {
      setIsConfirming(false);
    }
  }, [inToken, outToken, inAmount, recipientAddress, onCreateBridgeExchange, onSendDeposit, onGetBridgeTransactionStatus, onBridgeSuccess, onBridgeExchangeCreated, onBridgeError, settleAfterTx]);

  const handleRefreshQuote = useCallback(async () => {
    if (isLoadingQuote || isLoadingEstimate) return;
    if (!inToken || !outToken || !inAmount || parseFloat(inAmount) <= 0) return;

    const mode = getSwapMode(inToken, outToken);
    if (mode === 'jupiter') {
      setIsLoadingQuote(true);
      try {
        const fetchedQuote = await onGetQuoteRef.current(inToken, outToken, inAmount);
        const displayAmount = formatQuoteOutAmount(fetchedQuote);
        if (displayAmount === null) {
          setQuote(null);
          setOutAmount('');
          setQuoteError('Failed to refresh quote');
          return;
        }
        setQuote(fetchedQuote);
        setOutAmount(displayAmount);
        setQuoteError(null);
      } catch (error) {
        console.error('Failed to refresh quote:', error);
        setQuoteError('Failed to refresh quote');
      } finally {
        setIsLoadingQuote(false);
      }
    } else if (mode === 'stealthex' && onGetBridgeEstimateRef.current) {
      setIsLoadingEstimate(true);
      try {
        const estimate = await onGetBridgeEstimateRef.current!(
          inToken.symbol, outToken.symbol, parseFloat(inAmount),
          toStealthExNetwork(inToken.networkId || inToken.chain),
          toStealthExNetwork(outToken.networkId || outToken.chain)
        );
        if (estimate) {
          setBridgeEstimate(estimate);
          setOutAmount(estimate.estimatedAmount.toString());
        }
      } catch (error) {
        console.warn('Failed to refresh estimate:', error);
      } finally {
        setIsLoadingEstimate(false);
      }
    }
    startCountdown();
  }, [isLoadingQuote, isLoadingEstimate, inToken, outToken, inAmount, startCountdown]);

  const swapConfirmLabel = useMemo(() => {
    if (countdown <= 0) return 'Refresh Quote';
    return `Confirm (${countdown})`;
  }, [countdown]);

  const handleConfirmOrRefresh = useCallback(async () => {
    if (countdown <= 0) {
      await handleRefreshQuote();
    } else if (swapMode === 'stealthex') {
      await handleConfirmBridge();
    } else {
      await handleConfirmSwap();
    }
  }, [countdown, swapMode, handleRefreshQuote, handleConfirmBridge, handleConfirmSwap]);

  const handleSuccessContinue = useCallback(() => {
    setStep('input');
    setInAmount('');
    setOutAmount('');
    setQuote(null);
    setRecipientAddress('');
    setBridgeEstimate(null);
    setSuccessTxId(null);
    setSuccessExchange(null);
    setDepositTxId(null);
    setBridgeTransaction(null);
    settleAfterTx({ kinds: ['balance', 'transactions'], settlementDelaysMs: [] }).catch(() => undefined);
    onNavigateHome?.();
  }, [settleAfterTx, onNavigateHome]);

  // ── Derived / memoised ─────────────────────────────────────────────────

  const outputTokens = useMemo(() => {
    if (!inToken) return tokens;

    const inChain = inToken.chain || 'solana';

    if (inChain === 'solana') {
      // 1. User's Solana balance tokens first (they have balance/price data)
      const userSolanaTokens = tokens.filter(t => (t.chain || 'solana') === 'solana');
      const userAddresses = new Set(userSolanaTokens.map(t => t.address.toLowerCase()));

      // 2. Jupiter catalog tokens not already in user's list
      const remainingJupiter = jupiterTokens.filter(t => !userAddresses.has(t.address.toLowerCase()));

      // 3. Only cross-chain bridge tokens (exclude Solana — Jupiter covers those)
      const crossChainBridgeTokens = availableOutTokens.filter(t => t.chain !== 'solana');

      return [...crossChainBridgeTokens, ...userSolanaTokens, ...remainingJupiter];
    } else {
      return availableOutTokens;
    }
  }, [inToken, tokens, jupiterTokens, availableOutTokens]);

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
      setBridgeEstimate(null);
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
      setBridgeEstimate(null);
      return;
    }

    if (hasTokenSnapshotChanged(outToken, matchedToken)) {
      setOutToken(matchedToken);
    }
  }, [outToken, outputTokens]);

  // Modal-level handler for output token (needs outputTokens, so defined after it)
  const handleOutTokenModalSelect = useCallback((token: TokenSelectorToken) => {
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
  }, [outputTokens, handleOutTokenSelect]);

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
    network: t.networkId || (t.chain === 'bitcoin' ? 'Bitcoin' : t.chain === 'ethereum' ? 'Ethereum' : undefined),
  }));

  const bridgeTargetChain: BridgeChain | null = outToken ? {
    id: outToken.networkId || outToken.chain || 'unknown',
    name: getChainDisplayName(outToken.chain),
    symbol: outToken.symbol,
    logo: outToken.logo,
  } : null;

  const bridgeInToken: BridgeToken | null = inToken ? {
    symbol: inToken.symbol,
    name: inToken.name || inToken.symbol,
    logo: inToken.logo,
    network: inToken.networkId,
    balance: inTokenLive?.balance ?? inToken.balance,
    usdPrice: inToken.usdPrice,
  } : null;

  const bridgeOutToken: BridgeToken | null = outToken ? {
    symbol: outToken.symbol,
    name: outToken.name || outToken.symbol,
    logo: outToken.logo,
    network: outToken.networkId,
  } : null;

  const bridgeEstimateForReview: BridgeEstimate | null = bridgeEstimate ? {
    estimatedAmount: bridgeEstimate.estimatedAmount,
    minAmount: bridgeEstimate.minAmount,
    symbolIn: bridgeEstimate.symbolIn,
    symbolOut: bridgeEstimate.symbolOut,
  } : null;

  // ── Return ─────────────────────────────────────────────────────────────

  return {
    step,
    swapError,
    inToken,
    outToken,
    inAmount,
    outAmount,
    quote,
    bridgeEstimate,
    isLoadingQuote,
    isLoadingEstimate,
    isLoadingBridgeTokens,
    recipientAddress,
    addressError,
    isConfirming,
    showInTokenModal,
    showOutTokenModal,
    tokensLoading: loading,
    successTxId,
    successExchange,
    depositTxId,
    bridgeTransaction,
    settling,

    swapMode,
    inUsdValue,
    canReview,
    reviewWarning,
    priceImpact,
    outputTokens,
    addressValidation,

    modalInTokens,
    modalFeaturedTokens,
    modalOutTokens,

    bridgeTargetChain,
    bridgeInToken,
    bridgeOutToken,
    bridgeEstimateForReview,

    setInAmount: handleInAmountChange,
    setRecipientAddress,
    setShowInTokenModal,
    setShowOutTokenModal,

    handleInTokenSelect,
    handleOutTokenSelect,
    handleInTokenModalSelect,
    handleOutTokenModalSelect,
    handleSearchTokens,
    handleReview,
    handleContinueToReview,
    handleBackFromRecipient,
    handleBackFromReview,
    handleConfirmSwap,
    handleConfirmBridge,
    handleConfirmOrRefresh,
    handleSuccessContinue,
    swapConfirmLabel,
  };
}
