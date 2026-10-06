/**
 * useSwapScreenLogic — the Swap Powerup's screen state, shared by both twins:
 * the token the user pays with (held), the token they receive (the verified
 * catalogue, searchable), the amount with its fills, and the one control that
 * hands core a proposal. The build IS the quote: the numbers the user
 * confirms are the ones the backend returned for the bytes they sign, and
 * core refreshes them through `refresh` when the build expires.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import { USDC_MINT_BY_NETWORK } from '../../blockchain/solana/known-mints';
import { useAccountsContext } from '../../contexts/AccountsContext';
import { useCurrencyContext } from '../../contexts/CurrencyContext';
import { useRequestSignature } from '../../core/confirmation/SignatureRequestContext';
import {
  SignatureRequestCancelledError,
  type ConfirmationRow,
  type TransactionProposal,
} from '../../core/confirmation/types';
import { useAmountShortcuts, type UseAmountShortcutsResult } from '../../hooks/useAmountShortcuts';
import { useBalance } from '../../hooks/useBalance';
import { useFiatLine } from '../../hooks/useFiatLine';
import { useTokenCatalog } from '../../hooks/useTokenCatalog';
import { searchTokens } from '../../api/services/tokens';
import type { NetworkId, SolanaNetworkId } from '../../types/blockchain';
import type { CatalogToken, TokenMetadata } from '../../types/token';
import type { SendToken } from '../../types/ui/send-sheet';
import { SOL_CONSTANTS } from '../../utils/balance';
import { formatTokenAmount } from '../../utils/formatting';
import { getSolShortfall } from '../../utils/sol-fees';
import { describePowerupBuildError, type PowerupErrorMessage } from '../backend/errors';
import { toPowerupProposal } from '../backend/proposal';
import type { PowerupUnavailableReason } from '../backend/errors';
import { buildSwap, type BuildSwapFn, type SwapBuildEnvelope } from './api';
import { MAX_SLIPPAGE_BPS, SWAP_INSTRUCTIONS } from './expectation';
import { swapManifest } from './manifest';
import { useUnverifiedTokens } from '../../contexts/DeveloperModeContext';
import { getShortAddress } from '../../utils/address';

export const SWAP_NETWORK: SolanaNetworkId = 'solana-mainnet';
/** Above this the review carries a warning: the route moves the price. */
export const HIGH_PRICE_IMPACT_PCT = 3;

/** The swap route's own codes, over the shared table (`describePowerupBuildError`). */
export const SWAP_CODES: Record<string, string> = {
  unknown_mint: 'swap.errors.tokenNotSupported',
  token_not_supported: 'swap.errors.tokenNotSupported',
  slippage_exceeded: 'swap.errors.slippageExceeded',
  insufficient_funds: 'swap.errors.insufficientFunds',
  insufficient_sol: 'swap.errors.insufficientSol',
  swap_misconfigured: 'transaction.errors.networkBusy',
};

export interface SwapBlockerInput {
  /** The wallet's SOL, from the held list; `undefined` until the list arrives. */
  nativeSol: number | undefined;
}

/**
 * What stops the swap before it is asked for: too little SOL for the network
 * fee and the token accounts a swap opens. Neither provider sets a minimum
 * amount; a route that rounds to nothing comes back as the provider's own
 * refusal. The amount-versus-balance and same-token rules live in `canSubmit`.
 */
export function swapBlocker({ nativeSol }: SwapBlockerInput): PowerupErrorMessage | null {
  if (nativeSol !== undefined) {
    const shortfall = getSolShortfall({ nativeBalanceSol: nativeSol, isTokenTransfer: true });
    if (shortfall !== null) {
      return {
        key: 'swap.errors.insufficientSolFor',
        params: { amount: formatSolAmount(shortfall) },
      };
    }
  }
  return null;
}

/** Prints a small SOL amount plainly — 0.000005, never 5e-6. */
const formatSolAmount = (value: number): string =>
  value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');

/** A token as the two pickers and the rows read it: the Send shape, decimals included. */
export type SwapToken = SendToken & { decimals: number };

/**
 * The verified catalogue, in the picker's shape; a catalogue entry carries no
 * balance. The catalogue lists the wrapped-SOL mint as "WSOL"; the user
 * receives plain SOL there, so that entry wears SOL's own name and mark.
 */
export function toSwapToken(
  token: CatalogToken | TokenMetadata,
  { verified = true }: { verified?: boolean } = {}
): SwapToken {
  const native = token.address === SOL_CONSTANTS.ADDRESS;
  return {
    address: token.address,
    name: native ? SOL_CONSTANTS.NAME : (token.name ?? token.symbol),
    symbol: native ? SOL_CONSTANTS.SYMBOL : token.symbol,
    logo: native ? SOL_CONSTANTS.LOGO : token.logo,
    decimals: token.decimals,
    price: 'usdPrice' in token ? token.usdPrice : undefined,
    uiAmount: 0,
    // The verified catalogue vouches for its entries; a search result only
    // carries what the backend tagged it with.
    tags: verified ? ['verified'] : ((token as { tags?: string[] }).tags ?? []),
  };
}

const hasMeaningfulTags = (token: { tags?: string[] }): boolean =>
  (token.tags ?? []).some((tag) => tag !== 'unknown');

/** `"0.1"` with 9 decimals → `"100000000"`, exact, no floating point. */
export function toBaseUnits(amount: string, decimals: number): string {
  const [whole = '0', fraction = ''] = amount.trim().split('.');
  if (!/^\d*$/.test(whole) || !/^\d*$/.test(fraction)) return '';
  const padded = (fraction + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt((whole || '0') + padded).toString();
}

/** What the user asked for, to hold the build to. */
export interface SwapRequestFacts {
  payToken: SwapToken;
  receiveToken: SwapToken;
  amount: string;
}

/**
 * Refuses a build that is not the one the user asked for: another mint on
 * either side, another amount, other decimals (which would rescale every
 * number on the screen), a minimum above the quote, or a slippage past the
 * cap. The bytes are then never proposed, whatever the screen would say.
 */
export function assertEnvelopeMatches(
  envelope: SwapBuildEnvelope,
  { payToken, receiveToken, amount }: SwapRequestFacts
): void {
  const refuse = (why: string): never => {
    throw new Error(`swap build does not match the request: ${why}`);
  };
  if (envelope.input.mint !== payToken.address) refuse('input mint');
  if (envelope.output.mint !== receiveToken.address) refuse('output mint');
  if (envelope.input.decimals !== undefined && envelope.input.decimals !== payToken.decimals) {
    refuse('input decimals');
  }
  if (
    envelope.output.decimals !== undefined &&
    receiveToken.decimals > 0 &&
    envelope.output.decimals !== receiveToken.decimals
  ) {
    refuse('output decimals');
  }
  if (envelope.input.amount !== toBaseUnits(amount, payToken.decimals)) refuse('input amount');
  if (!/^\d+$/.test(envelope.output.amount) || !/^\d+$/.test(envelope.output.minAmount)) {
    refuse('output amount');
  }
  if (BigInt(envelope.output.minAmount) > BigInt(envelope.output.amount)) refuse('minimum');
  if (!(envelope.slippageBps >= 0 && envelope.slippageBps <= MAX_SLIPPAGE_BPS)) refuse('slippage');
}

/** SOL first, so the one token everyone receives is never buried in a list of 7000. */
export function sortNativeFirst(tokens: SwapToken[]): SwapToken[] {
  const index = tokens.findIndex((token) => token.address === SOL_CONSTANTS.ADDRESS);
  if (index <= 0) return tokens;
  return [tokens[index], ...tokens.slice(0, index), ...tokens.slice(index + 1)];
}

const uiAmountOf = (amount: string, decimals: number | undefined): number =>
  Number(amount) / 10 ** (decimals ?? 0);

const withSymbol = (value: number, symbol: string | undefined): string =>
  `${formatTokenAmount(value)} ${symbol ?? ''}`.trim();

const percent = (bps: number): string => `${(bps / 100).toString()}%`;

export interface SwapProposalContext {
  networkId: SolanaNetworkId;
  /** The user's display currency, from `useCurrencyContext`. */
  formatValue: (usd: number | null | undefined) => string;
  /** The tokens the user picked: the screen names and draws these, never what the backend says. */
  tokens?: { pay: SwapToken; receive: SwapToken };
  refresh?: () => Promise<TransactionProposal>;
}

/** Pure: what core renders for a built swap. Every string is already translated. */
export function buildSwapProposal(
  envelope: SwapBuildEnvelope,
  { networkId, formatValue, tokens, refresh }: SwapProposalContext
): TransactionProposal {
  // The key itself when i18n has nothing for it (tests, a build with the
  // namespace missing): a row with a key is readable, a row with nothing is not.
  const t = (key: string, options?: Record<string, unknown>): string => {
    const translated = i18n.t(key, options);
    return typeof translated === 'string' && translated.length > 0 ? translated : key;
  };
  const amountIn = uiAmountOf(envelope.input.amount, envelope.input.decimals);
  const amountOut = uiAmountOf(envelope.output.amount, envelope.output.decimals);
  const minOut = uiAmountOf(envelope.output.minAmount, envelope.output.decimals);
  // With the picked tokens in hand, the backend's names and marks are not consulted at all.
  const inSymbol = tokens ? tokens.pay.symbol : envelope.input.symbol;
  const outSymbol = tokens ? tokens.receive.symbol : envelope.output.symbol;
  const inLogo = tokens ? tokens.pay.logo : envelope.input.logo;
  const outLogo = tokens ? tokens.receive.logo : envelope.output.logo;
  const rate =
    amountIn > 0 ? `1 ${inSymbol ?? ''} ≈ ${withSymbol(amountOut / amountIn, outSymbol)}` : '';
  const fee = envelope.salmonFee;

  const rows: ConfirmationRow[] = [{ label: t('swap.review.rate'), value: rate }];
  if (fee) {
    rows.push({
      label: t('swap.review.salmonFee'),
      value: `${withSymbol(uiAmountOf(fee.amount, fee.decimals), fee.symbol)} (${percent(fee.bps)})`,
    });
  }
  if (envelope.routeFee?.bps) {
    rows.push({ label: t('swap.review.routeFee'), value: percent(envelope.routeFee.bps) });
  }
  rows.push({ label: t('swap.review.minReceived'), value: withSymbol(minOut, outSymbol) });

  const routeLabels = [...new Set(envelope.route.map((leg) => leg.label))].join(', ');
  const advancedRows: ConfirmationRow[] = [
    { label: t('swap.review.slippage'), value: percent(envelope.slippageBps) },
    {
      label: t('swap.review.priceImpact'),
      value: envelope.priceImpactPct === null ? '—' : `${envelope.priceImpactPct}%`,
    },
    { label: t('swap.review.route'), value: routeLabels || envelope.providerDisplayName },
    // The mints, so a lookalike symbol is never the whole story.
    { label: t('swap.review.payMint'), value: getShortAddress(envelope.input.mint, 6) ?? '' },
    { label: t('swap.review.receiveMint'), value: getShortAddress(envelope.output.mint, 6) ?? '' },
  ];

  const summary = `${withSymbol(amountIn, inSymbol)} → ${withSymbol(amountOut, outSymbol)}`;
  const highImpact =
    envelope.priceImpactPct !== null && envelope.priceImpactPct > HIGH_PRICE_IMPACT_PCT;

  return toPowerupProposal(
    { ...envelope, salmonFee: null, routeFee: null, contributor: envelope.contributor ?? null },
    {
      networkId,
      expect: { allowedPrograms: swapManifest.programs, allowedInstructions: SWAP_INSTRUCTIONS },
      refresh,
      pending: { kind: 'send', summary },
      display: {
        title: t('swap.review.title'),
        exchange: {
          send: {
            label: t('swap.review.youPay'),
            logo: inLogo,
            symbol: inSymbol ?? '',
            amount: withSymbol(amountIn, inSymbol),
            usdValue: envelope.inUsdValue === null ? undefined : formatValue(envelope.inUsdValue),
          },
          receive: {
            label: t('swap.review.youReceive'),
            logo: outLogo,
            symbol: outSymbol ?? '',
            amount: withSymbol(amountOut, outSymbol),
            usdValue: envelope.outUsdValue === null ? undefined : formatValue(envelope.outUsdValue),
            emphasis: true,
          },
        },
        rows,
        advancedRows,
        warning: highImpact
          ? {
              title: t('swap.review.highImpactTitle'),
              body: t('swap.review.highImpactBody', { percent: envelope.priceImpactPct }),
            }
          : undefined,
        receipt: { title: t('swap.complete'), rate, fee: fee ? percent(fee.bps) : undefined },
        pendingTitle: t('swap.pending'),
        pendingSubtitle: summary,
      },
    }
  );
}

export interface UseSwapScreenLogicParams {
  publicKey: string;
  networkId: string | null;
  onNavigateHome?: () => void;
  /** Test seam. */
  build?: BuildSwapFn;
}

/** One side of the exchange as a twin draws it: the chosen token and its picker. */
export interface SwapSideBinding {
  token: SwapToken | null;
  tokens: SwapToken[];
  loading: boolean;
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  select: (token: SendToken) => void;
  /** Remote search past the list in hand; the receive side only. */
  onSearch?: (query: string) => Promise<SendToken[]>;
  /** The row's second line: the balance for the pay side, the name for the receive side. */
  subtitle: string;
}

export interface UseSwapScreenLogicResult {
  pay: SwapSideBinding;
  receive: SwapSideBinding;
  amount: string;
  shortcuts: UseAmountShortcutsResult;
  /** The converted line under the amount, in the display currency. */
  fiatLine: string;
  canSubmit: boolean;
  isConfirming: boolean;
  error: PowerupErrorMessage | null;
  /** What stops the swap before it is asked for (SOL for the fee, a dust amount); the twin draws it as a warning. */
  blocker: PowerupErrorMessage | null;
  /** The backend refused this caller outright; the twin draws the state in place of the form. */
  unavailable: PowerupUnavailableReason | null;
  submit: () => Promise<void>;
}

export function useSwapScreenLogic({
  publicKey,
  networkId,
  onNavigateHome,
  build = buildSwap,
}: UseSwapScreenLogicParams): UseSwapScreenLogicResult {
  const { t } = useTranslation();
  const requestSignature = useRequestSignature();
  const showUnverifiedTokens = useUnverifiedTokens();
  const [, { formatValue }] = useCurrencyContext();
  const [{ activeBlockchainAccount }] = useAccountsContext();
  const solanaNetworkId = networkId === SWAP_NETWORK ? SWAP_NETWORK : undefined;

  // What the wallet holds, from the same query Home populated.
  const { tokens: held, loading: heldLoading } = useBalance({
    account: activeBlockchainAccount ?? undefined,
    networkId: (solanaNetworkId ?? undefined) as NetworkId | undefined,
    skip: !activeBlockchainAccount || !solanaNetworkId,
  });
  const payTokens = useMemo<SwapToken[]>(
    () =>
      held.map((item) => ({
        address: item.address,
        name: item.name,
        symbol: item.symbol,
        logo: item.logo,
        price: item.price,
        uiAmount: item.uiAmount,
        usdBalance: item.usdBalance,
        decimals: item.decimals,
        tags: ['verified'],
      })),
    [held]
  );

  // What can be received: the verified catalogue, searchable past it.
  const catalog = useTokenCatalog({ networkId: solanaNetworkId });
  const receiveTokens = useMemo(
    () => sortNativeFirst(catalog.tokens.map((token) => toSwapToken(token))),
    [catalog.tokens]
  );
  const onSearch = useCallback(
    async (query: string): Promise<SendToken[]> =>
      (await searchTokens(query, solanaNetworkId ?? SWAP_NETWORK))
        .filter((token) => showUnverifiedTokens || hasMeaningfulTags(token))
        .map((token) => toSwapToken(token, { verified: false })),
    [solanaNetworkId, showUnverifiedTokens]
  );

  const [payAddress, setPayAddress] = useState<string | null>(null);
  const [receiveAddress, setReceiveAddress] = useState<string | null>(null);
  const [pickedReceive, setPickedReceive] = useState<SwapToken | null>(null);
  const [payPickerOpen, setPayPickerOpen] = useState(false);
  const [receivePickerOpen, setReceivePickerOpen] = useState(false);
  const [amount, setAmountState] = useState('');
  const [error, setError] = useState<PowerupErrorMessage | null>(null);
  const [unavailable, setUnavailable] = useState<PowerupUnavailableReason | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Defaults once the lists arrive: pay with SOL when there is some, else the
  // first token with a balance; receive USDC.
  const usdcMint = solanaNetworkId ? USDC_MINT_BY_NETWORK[solanaNetworkId] : undefined;
  const payToken = useMemo(() => {
    if (payAddress) return payTokens.find((token) => token.address === payAddress) ?? null;
    const funded = payTokens.filter((token) => Number(token.uiAmount) > 0);
    return (
      funded.find((token) => token.address === SOL_CONSTANTS.ADDRESS) ??
      funded[0] ??
      payTokens[0] ??
      null
    );
  }, [payTokens, payAddress]);
  const receiveToken = useMemo(() => {
    const wanted = receiveAddress ?? usdcMint;
    if (pickedReceive && pickedReceive.address === wanted) return pickedReceive;
    return (
      receiveTokens.find((token) => token.address === wanted) ??
      payTokens.find((token) => token.address === wanted) ??
      null
    );
  }, [receiveTokens, payTokens, receiveAddress, usdcMint, pickedReceive]);

  const setAmount = useCallback((next: string) => {
    setAmountState(next);
    setError(null);
  }, []);

  const payBalance = payToken ? Number(payToken.uiAmount) : undefined;
  const shortcuts = useAmountShortcuts({
    balance: payBalance,
    decimals: payToken?.decimals,
    setAmount,
    maxLabel: t('general.max'),
  });
  const fiatLine = useFiatLine(amount, payToken?.price);

  // A new pair is a new quote: the amount stays, the last error does not.
  useEffect(() => setError(null), [payToken?.address, receiveToken?.address]);

  const selectPay = useCallback((token: SendToken) => {
    setPayAddress(token.address);
    setPayPickerOpen(false);
  }, []);
  const selectReceive = useCallback((token: SendToken) => {
    setReceiveAddress(token.address);
    setPickedReceive({ ...token, decimals: token.decimals ?? 0 });
    setReceivePickerOpen(false);
  }, []);

  const nativeSol = heldLoading
    ? undefined
    : (held.find((item) => item.address === SOL_CONSTANTS.ADDRESS)?.uiAmount ?? 0);
  const blocker = useMemo(() => swapBlocker({ nativeSol }), [nativeSol]);

  const numericAmount = parseFloat(amount);
  const canSubmit =
    !!solanaNetworkId &&
    !!payToken &&
    !!receiveToken &&
    payToken.address !== receiveToken.address &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= (payBalance ?? 0) &&
    blocker === null &&
    !isConfirming &&
    unavailable === null;

  const submit = useCallback(async () => {
    if (!canSubmit || !solanaNetworkId || !payToken || !receiveToken) return;
    setIsConfirming(true);
    setError(null);
    const params = {
      inputMint: payToken.address,
      outputMint: receiveToken.address,
      publicKey,
      uiAmount: amount,
    };
    const facts = { payToken, receiveToken, amount };
    const propose = async (): Promise<TransactionProposal> => {
      const envelope = await build(solanaNetworkId, params);
      assertEnvelopeMatches(envelope, facts);
      return buildSwapProposal(envelope, {
        networkId: solanaNetworkId,
        formatValue,
        tokens: { pay: payToken, receive: receiveToken },
        refresh: propose,
      });
    };
    try {
      // Resolves once the user has read core's receipt and closed it.
      await requestSignature(await propose());
      setAmountState('');
      onNavigateHome?.();
    } catch (caught) {
      if (!(caught instanceof SignatureRequestCancelledError)) {
        const failure = describePowerupBuildError(caught, {
          codes: SWAP_CODES,
          fallback: 'swap.errors.buildFailed',
        });
        if (failure.kind === 'unavailable') setUnavailable(failure.reason);
        else setError(failure.message);
      }
    } finally {
      setIsConfirming(false);
    }
  }, [
    canSubmit,
    solanaNetworkId,
    payToken,
    receiveToken,
    publicKey,
    amount,
    build,
    formatValue,
    requestSignature,
    onNavigateHome,
  ]);

  const paySubtitle = payToken
    ? t('swap.available', { amount: withSymbol(Number(payToken.uiAmount), payToken.symbol) })
    : '';

  return {
    pay: {
      token: payToken,
      tokens: payTokens,
      loading: heldLoading,
      pickerOpen: payPickerOpen,
      openPicker: () => setPayPickerOpen(true),
      closePicker: () => setPayPickerOpen(false),
      select: selectPay,
      subtitle: paySubtitle,
    },
    receive: {
      token: receiveToken,
      tokens: receiveTokens,
      loading: catalog.loading,
      pickerOpen: receivePickerOpen,
      openPicker: () => setReceivePickerOpen(true),
      closePicker: () => setReceivePickerOpen(false),
      select: selectReceive,
      onSearch,
      subtitle: receiveToken?.name ?? '',
    },
    amount,
    shortcuts,
    fiatLine,
    canSubmit,
    isConfirming,
    error,
    blocker,
    unavailable,
    submit,
  };
}
