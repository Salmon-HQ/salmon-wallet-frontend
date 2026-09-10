/**
 * useSwapScreenLogic — the Swap Powerup's screen state, shared by both twins.
 *
 * The Powerup owns the form (pair, amount, the quote it debounces) and the
 * receipt. It does NOT own review or signing: "Swap" hands core a proposal
 * through `requestSignature`, core renders the confirmation, signs and
 * broadcasts, and this hook receives a signature back — or a cancellation,
 * which just returns the user to the form (spec 027 §2).
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { SwapToken } from '../../types/swap';
import type { TokenSelectorToken } from '../../types/ui/token-selector';
import type { NetworkId } from '../../types/blockchain';
import {
  SignatureRequestCancelledError,
  type TransactionProposal,
} from '../../core/confirmation/types';
import { useRequestSignature } from '../../core/confirmation/SignatureRequestContext';
import { classifyTransactionError } from '../../utils/transaction-errors';
import { formatPercent } from '../../utils/formatting';
import { useSettleAfterTx, useSettleUntilChanged } from '../../query/invalidation';
import { usePendingTransactionsOptional } from '../../contexts/PendingTransactionsContext';
import { trackEvent, trackFirstSwapCompleted } from '../../analytics';
import { buildSwap as buildSwapApi } from './api';
import type { BuildSwapFn } from './api';
import { describeSwapBuildError } from './errors';
import { buildSwapProposal, toDisplayAmount } from './proposal';
import { SWAP_NETWORK_ID } from './types';
import type {
  SwapBuildResponse,
  SwapErrorMessage,
  SwapScreenStep,
  SwapSuccessSummary,
  SwapUnavailableReason,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const MIN_SWAP_USD = 1;
const QUOTE_DEBOUNCE_MS = 500;
const HIGH_PRICE_IMPACT_PCT = 3;

/**
 * Converts a build's raw output amount to a display amount.
 *
 * The build must carry its own decimals: a lookup miss on the backend sends
 * `undefined`, and a fallback to the token list's decimals silently formats
 * the amount with the WRONG token's scale on the screen where the user
 * decides to sign. Returning null makes the caller surface a quote error
 * instead of inventing a number.
 */
export function formatBuildOutAmount(build: SwapBuildResponse): string | null {
  const decimals = build.output?.decimals;
  const amount = Number(build.output?.amount);
  if (typeof decimals !== 'number' || !Number.isFinite(decimals)) return null;
  if (!Number.isFinite(amount)) return null;
  return toDisplayAmount(build.output.amount, decimals).toString();
}

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
  if (!current || !next) return current !== next;
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
// Params / result
// ============================================================================

export interface UseSwapScreenLogicParams {
  /** User's tokens for selection */
  tokens: SwapToken[];
  /** Featured tokens for quick selection */
  featuredTokens?: SwapToken[];
  /** The verified catalogue for the output side */
  catalogTokens?: SwapToken[];
  /** Whether tokens are still loading */
  loading?: boolean;
  /** The taker — fee payer and only signer. `null` while there is no account. */
  publicKey: string | null;
  /** The active network; the build endpoint serves `solana-mainnet` only. */
  networkId: string | null;
  onSearchTokens?: (query: string) => Promise<SwapToken[]>;
  initialInToken?: SwapToken;
  initialOutToken?: SwapToken;
  /** The user's currency formatter for USD lines, e.g. `~$84.65`. */
  formatUsd?: (value: number) => string;
  /** Called when the receipt is dismissed */
  onNavigateHome?: () => void;
  /** Test seam: the build call. Defaults to the Powerup's API service. */
  buildSwap?: BuildSwapFn;
}

export interface UseSwapScreenLogicResult {
  step: SwapScreenStep;
  /** Why the screen quotes nothing at all: not on mainnet, or the backend refused. */
  unavailable: 'network' | SwapUnavailableReason | null;
  /** The last swap failure, a translation key. Cleared when the user edits the amount. */
  swapError: SwapErrorMessage | null;
  inToken: SwapToken | null;
  outToken: SwapToken | null;
  inAmount: string;
  outAmount: string;
  build: SwapBuildResponse | null;
  isLoadingQuote: boolean;
  /** True from the swap press until core resolves or the user backs out. */
  isConfirming: boolean;
  showInTokenModal: boolean;
  showOutTokenModal: boolean;
  tokensLoading: boolean;
  successTxId: string | null;
  successSummary: SwapSuccessSummary | null;
  /** True while the receipt waits for the indexer to reflect the new balances. */
  settling: boolean;
  inUsdValue: number;
  canSwap: boolean;
  reviewWarning: SwapErrorMessage | null;
  priceImpact: number | null;
  /** The provider's attribution from the current build, e.g. "Powered by 0x". */
  attribution: string | null;
  outputTokens: SwapToken[];
  modalInTokens: (SwapToken & { mint: string; uiAmount: number })[];
  modalFeaturedTokens: (SwapToken & { mint: string; uiAmount: number })[];
  modalOutTokens: (SwapToken & { mint: string; uiAmount: number; network?: string })[];
  setInAmount: (v: string) => void;
  setShowInTokenModal: (v: boolean) => void;
  setShowOutTokenModal: (v: boolean) => void;
  handleInTokenSelect: (token: SwapToken) => void;
  handleOutTokenSelect: (token: SwapToken) => void;
  handleInTokenModalSelect: (token: TokenSelectorToken) => void;
  handleOutTokenModalSelect: (token: TokenSelectorToken) => void;
  handleSearchTokens: ((query: string) => Promise<TokenSelectorToken[]>) | undefined;
  /** Hand the current build to core's confirmation. */
  handleSwap: () => Promise<void>;
  handleSuccessContinue: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useSwapScreenLogic({
  tokens,
  featuredTokens = [],
  catalogTokens = [],
  loading = false,
  publicKey,
  networkId,
  onSearchTokens,
  initialInToken,
  initialOutToken,
  formatUsd,
  onNavigateHome,
  buildSwap = buildSwapApi,
}: UseSwapScreenLogicParams): UseSwapScreenLogicResult {
  const requestSignature = useRequestSignature();
  const settleAfterTx = useSettleAfterTx();
  const settleUntilChanged = useSettleUntilChanged();
  const pendingTransactions = usePendingTransactionsOptional();

  // ── State ──────────────────────────────────────────────────────────────

  const [step, setStep] = useState<SwapScreenStep>('input');
  const [refused, setRefused] = useState<SwapUnavailableReason | null>(null);
  const [swapError, setSwapError] = useState<SwapErrorMessage | null>(null);
  const [settling, setSettling] = useState(false);
  const [inToken, setInToken] = useState<SwapToken | null>(initialInToken || tokens[0] || null);
  const [outToken, setOutToken] = useState<SwapToken | null>(initialOutToken || null);
  const [inAmount, setInAmount] = useState('');
  const [outAmount, setOutAmount] = useState('');
  const [build, setBuild] = useState<SwapBuildResponse | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<SwapErrorMessage | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [successTxId, setSuccessTxId] = useState<string | null>(null);
  const [successSummary, setSuccessSummary] = useState<SwapSuccessSummary | null>(null);
  const [showInTokenModal, setShowInTokenModal] = useState(false);
  const [showOutTokenModal, setShowOutTokenModal] = useState(false);

  const quoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic sequence for builds. The debounce timer only cancels requests
  // that have not fired yet; once a fetch is in flight, a slow response can
  // land after the inputs changed and overwrite the newer build. Every new
  // request bumps the sequence, and responses whose ticket no longer matches
  // are discarded.
  const quoteSeqRef = useRef(0);

  const onMainnet = networkId === SWAP_NETWORK_ID;
  const unavailable: UseSwapScreenLogicResult['unavailable'] =
    refused ?? (onMainnet ? null : 'network');

  // ── Computed ───────────────────────────────────────────────────────────

  // The `inToken` state is captured at selection time; balance can become stale
  // if funds arrive while the user is on the swap screen. `inTokenLive` re-reads
  // the matching entry from the reactive `tokens` prop on every render.
  const inTokenLive = useMemo(
    () => (inToken ? (findMatchingToken(tokens, inToken) ?? inToken) : null),
    [inToken, tokens]
  );

  const inTokenPrice =
    tokens.find((t) => t.address === inToken?.address)?.usdPrice ?? inToken?.usdPrice;
  const inUsdValue = inTokenPrice && inAmount ? parseFloat(inAmount) * inTokenPrice : 0;

  const canSwap =
    unavailable === null &&
    !!publicKey &&
    !!inToken &&
    !!outToken &&
    !!inAmount &&
    parseFloat(inAmount) > 0 &&
    parseFloat(inAmount) <= (inTokenLive?.balance || 0) &&
    inUsdValue >= MIN_SWAP_USD &&
    !isLoadingQuote &&
    !isConfirming &&
    !quoteError &&
    !!build;

  const priceImpact: number | null = build?.priceImpactPct ?? null;

  const reviewWarning: SwapErrorMessage | null = (() => {
    if (!inToken || !inAmount || parseFloat(inAmount) <= 0) return null;
    if (parseFloat(inAmount) > (inTokenLive?.balance || 0))
      return 'swap.errors.insufficientBalance';
    if (inUsdValue > 0 && inUsdValue < MIN_SWAP_USD)
      return { key: 'swap.errors.minimumAmount', params: { amount: MIN_SWAP_USD.toFixed(2) } };
    if (quoteError) return quoteError;
    if (priceImpact != null && priceImpact > HIGH_PRICE_IMPACT_PCT)
      return 'swap.errors.highPriceImpact';
    return null;
  })();

  // ── Build fetching ─────────────────────────────────────────────────────

  const buildRef = useRef(buildSwap);
  useEffect(() => {
    buildRef.current = buildSwap;
  });

  const fetchBuild = useCallback(
    async (seq: number, inT: SwapToken, outT: SwapToken, amount: string, taker: string) => {
      try {
        const fetched = await buildRef.current({
          inputMint: inT.address,
          outputMint: outT.address,
          uiAmount: amount,
          publicKey: taker,
        });
        if (seq !== quoteSeqRef.current) return; // stale — a newer request owns the state
        const displayAmount = formatBuildOutAmount(fetched);
        if (displayAmount === null) {
          setBuild(null);
          setOutAmount('');
          setQuoteError('swap.errors.quoteFailed');
          return;
        }
        setBuild(fetched);
        setOutAmount(displayAmount);
        setQuoteError(null);
      } catch (error) {
        if (seq !== quoteSeqRef.current) return;
        const failure = describeSwapBuildError(error);
        if (failure.kind === 'unavailable') {
          // Fail closed: the screen stops quoting until it is remounted.
          setRefused(failure.reason);
          setQuoteError(null);
        } else {
          console.error('[useSwapScreenLogic] build failed:', error);
          setQuoteError(failure.message);
        }
        setOutAmount('');
      } finally {
        if (seq === quoteSeqRef.current) setIsLoadingQuote(false);
      }
    },
    []
  );

  useEffect(() => {
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    const seq = ++quoteSeqRef.current;

    setOutAmount('');
    setBuild(null);
    setQuoteError(null);
    setIsLoadingQuote(false);

    if (unavailable !== null || !publicKey) return;
    if (!inToken || !outToken || !inAmount || parseFloat(inAmount) <= 0) return;

    setIsLoadingQuote(true);
    quoteTimerRef.current = setTimeout(() => {
      void fetchBuild(seq, inToken, outToken, inAmount, publicKey);
    }, QUOTE_DEBOUNCE_MS);

    return () => {
      if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    };
  }, [inToken, outToken, inAmount, publicKey, unavailable, fetchBuild]);

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
      setBuild(null);
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

  // The confirmed pair, frozen for the receipt. Live form state keeps reacting
  // to token-list refreshes after the swap, so success rendering must never
  // read it. Taken from the proposal core actually signed, which may be a
  // rebuild of the form's build.
  const captureSuccessSummary = useCallback(
    (signed: SwapBuildResponse) => {
      setSuccessSummary({
        inAmount: toDisplayAmount(signed.input.amount, signed.input.decimals).toString(),
        inSymbol: signed.input.symbol,
        outAmount: toDisplayAmount(signed.output.amount, signed.output.decimals).toString(),
        outSymbol: signed.output.symbol,
        chain: inToken?.chain,
        networkId: inToken?.networkId,
        inLogo: inToken?.logo ?? undefined,
        outLogo: outToken?.logo ?? undefined,
        fee: signed.salmonFee ? formatPercent(signed.salmonFee.bps / 100) : undefined,
      });
    },
    [inToken, outToken]
  );

  const handleSwap = useCallback(async () => {
    if (!build || !inToken || !outToken || !publicKey || isConfirming) return;

    setIsConfirming(true);
    setSwapError(null);
    // Quotes stop while the confirmation is up: a fresh build there is the
    // proposal's own `refresh`, not the form's debounce.
    ++quoteSeqRef.current;

    // The build core signs: the form's, or the rebuild the confirmation asked
    // for once the quote expired.
    let signedBuild = build;
    const toProposal = (current: SwapBuildResponse): TransactionProposal =>
      buildSwapProposal(current, {
        inToken,
        outToken,
        formatUsd,
        refresh: async () => {
          const fresh = await buildRef.current({
            inputMint: inToken.address,
            outputMint: outToken.address,
            uiAmount: inAmount,
            publicKey,
          });
          signedBuild = fresh;
          return toProposal(fresh);
        },
      });

    try {
      const { signature } = await requestSignature(toProposal(build));
      setSuccessTxId(signature);
      // Hand the signature to the global pending store before any screen-owned
      // state moves: the pending entry is what reports the outcome to a user
      // who navigates away, locks, or kills the app mid-flight.
      pendingTransactions?.trackPendingTransaction({
        signature,
        kind: 'swap',
        networkId: SWAP_NETWORK_ID as NetworkId,
        submittedAt: Date.now(),
        summary: `${inAmount} ${inToken.symbol} → ${outAmount} ${outToken.symbol}`.trim(),
      });
      captureSuccessSummary(signedBuild);
      setStep('success');
      // Anonymous funnel event: no amounts, addresses or mints.
      trackEvent('swap_completed', { from_chain: 'solana', to_chain: 'solana', success: true });
      void trackFirstSwapCompleted();
      // This screen is now the one surface reporting this signature; the
      // banner withholds it until the release below.
      const releaseReport = pendingTransactions?.claimForegroundReport(signature);
      setSettling(true);
      settleUntilChanged({ networkId: SWAP_NETWORK_ID as NetworkId, kinds: ['balance', 'transactions'] })
        .catch((err) => {
          console.warn('[useSwapScreenLogic] settleUntilChanged failed:', err);
        })
        .finally(() => {
          setSettling(false);
          releaseReport?.();
        });
    } catch (error) {
      if (error instanceof SignatureRequestCancelledError) {
        // Backing out of the confirmation is not a failure: the form is as
        // they left it, and the quote is fetched again on the next edit.
        setBuild(null);
        setOutAmount('');
        setInAmount((amount) => amount);
      } else {
        console.error('[useSwapScreenLogic] swap failed:', error);
        trackEvent('swap_completed', { from_chain: 'solana', to_chain: 'solana', success: false });
        setSwapError(classifyTransactionError(error));
      }
    } finally {
      setIsConfirming(false);
    }
  }, [
    build,
    inToken,
    outToken,
    publicKey,
    isConfirming,
    inAmount,
    outAmount,
    formatUsd,
    requestSignature,
    pendingTransactions,
    captureSuccessSummary,
    settleUntilChanged,
  ]);

  const handleSuccessContinue = useCallback(() => {
    setStep('input');
    setInAmount('');
    setOutAmount('');
    setBuild(null);
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
    // The user's Solana balance tokens first (they have balance/price data),
    // then the catalogue tokens not already in the user's list.
    const userSolanaTokens = tokens.filter((t) => (t.chain || 'solana') === 'solana');
    const userAddresses = new Set(userSolanaTokens.map((t) => t.address.toLowerCase()));
    const remaining = catalogTokens.filter((t) => !userAddresses.has(t.address.toLowerCase()));
    return [...userSolanaTokens, ...remaining];
  }, [inToken, tokens, catalogTokens]);

  useEffect(() => {
    if (tokens.length === 0) {
      if (inToken !== null) setInToken(null);
      return;
    }
    if (!inToken) {
      const nextToken = findMatchingToken(tokens, initialInToken ?? null) ?? tokens[0] ?? null;
      if (nextToken) setInToken(nextToken);
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
      setBuild(null);
      return;
    }
    if (hasTokenSnapshotChanged(inToken, matchedToken)) setInToken(matchedToken);
  }, [initialInToken, inToken, tokens]);

  useEffect(() => {
    if (!outToken) return;
    const matchedToken = findMatchingToken(outputTokens, outToken);
    if (!matchedToken) {
      setOutToken(null);
      setOutAmount('');
      setBuild(null);
      return;
    }
    if (hasTokenSnapshotChanged(outToken, matchedToken)) setOutToken(matchedToken);
  }, [outToken, outputTokens]);

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

  const handleSearchTokens = onSearchTokens
    ? async (query: string): Promise<TokenSelectorToken[]> => {
        const results = await onSearchTokens(query);
        return results.map((t) => ({ ...t, mint: t.address, uiAmount: t.balance || 0 }));
      }
    : undefined;

  const modalInTokens = tokens.map((t) => ({ ...t, mint: t.address, uiAmount: t.balance || 0 }));
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

  return {
    step,
    unavailable,
    swapError,
    inToken,
    outToken,
    inAmount,
    outAmount,
    build,
    isLoadingQuote,
    isConfirming,
    showInTokenModal,
    showOutTokenModal,
    tokensLoading: loading,
    successTxId,
    successSummary,
    settling,
    inUsdValue,
    canSwap,
    reviewWarning,
    priceImpact,
    attribution: build?.attribution ?? null,
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
    handleSwap,
    handleSuccessContinue,
  };
}
