/**
 * A build → the proposal core's confirmation renders. Pure: what the user
 * sees before signing is decided here once, for both twins, and is testable
 * without a screen.
 *
 * Every fee is its own line; the Salmon fee is never folded into the quote
 * (the backend already nets it out of `output.amount`, so the line names what
 * was taken). Attribution is the provider's own string, rendered verbatim.
 */
import i18n from 'i18next';
import type { TransactionProposal, ConfirmationRow } from '../../core/confirmation/types';
import { formatAmountWithSymbol, formatPercent } from '../../utils/formatting';
import type { SwapToken } from '../../types/swap';
import { SWAP_NETWORK_ID } from './types';
import type { SwapBuildResponse, SwapFeeLine } from './types';

export interface SwapProposalContext {
  inToken: SwapToken;
  outToken: SwapToken;
  /** The user's currency formatter, e.g. `~$84.65`; USD lines are omitted without it. */
  formatUsd?: (value: number) => string;
  /** A fresh build of the same intent, for when the quote expires on the screen. */
  refresh: () => Promise<TransactionProposal>;
}

/** Base units → display units. */
export function toDisplayAmount(amount: string, decimals: number): number {
  return Number(amount) / 10 ** decimals;
}

/** "0.0021 SOL (0.85%)" — the amount taken and the rate it corresponds to. */
export function formatFeeLine(fee: SwapFeeLine): string {
  const amount = formatAmountWithSymbol(toDisplayAmount(fee.amount, fee.decimals), fee.symbol);
  return `${amount} (${formatPercent(fee.bps / 100)})`;
}

/** The proposal's identity: a rebuild has a new `expiresAt` and new bytes. */
export function swapProposalId(build: SwapBuildResponse): string {
  return `${build.expiresAt}:${build.transaction.slice(0, 32)}`;
}

export function buildSwapProposal(
  build: SwapBuildResponse,
  { inToken, outToken, formatUsd, refresh }: SwapProposalContext
): TransactionProposal {
  const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
  const inAmount = toDisplayAmount(build.input.amount, build.input.decimals);
  const outAmount = toDisplayAmount(build.output.amount, build.output.decimals);
  const minAmount = toDisplayAmount(build.output.minAmount, build.output.decimals);
  const inLabel = formatAmountWithSymbol(inAmount, build.input.symbol);
  const outLabel = formatAmountWithSymbol(outAmount, build.output.symbol);
  const usd = (value: number | null) =>
    value != null && formatUsd ? formatUsd(value) : undefined;

  const rows: ConfirmationRow[] = [];
  if (build.salmonFee) {
    rows.push({ label: t('swap.review.salmonFee'), value: formatFeeLine(build.salmonFee) });
  }
  if (build.routeFee) {
    rows.push({ label: t('swap.review.routeFee'), value: formatFeeLine(build.routeFee) });
  }
  rows.push({
    label: t('swap.slippage_tolerance'),
    value: formatPercent(build.slippageBps / 100),
  });
  rows.push({
    label: t('swap.minimum_received'),
    value: formatAmountWithSymbol(minAmount, build.output.symbol),
    pending: true,
  });
  if (build.priceImpactPct != null) {
    rows.push({
      label: t('swap.review.totalPriceImpact'),
      value: formatPercent(build.priceImpactPct),
      pending: true,
    });
  }

  const advancedRows: ConfirmationRow[] = [
    { label: t('swap.review.provider'), value: build.providerDisplayName },
  ];
  if (build.route.length > 0) {
    advancedRows.push({
      label: t('swap.review.route'),
      value: build.route.map((leg) => leg.label).join(' → '),
      pending: true,
    });
  }

  return {
    id: swapProposalId(build),
    networkId: SWAP_NETWORK_ID,
    transaction: build.transaction,
    expiresAt: build.expiresAt,
    refresh,
    display: {
      title: t('swap.review.title'),
      exchange: {
        send: {
          label: t('swap.you_send'),
          logo: inToken.logo,
          symbol: build.input.symbol,
          amount: inLabel,
          usdValue: usd(build.inUsdValue),
        },
        receive: {
          label: t('swap.you_receive'),
          logo: outToken.logo,
          symbol: build.output.symbol,
          amount: outLabel,
          usdValue: usd(build.outUsdValue),
          pendingAmount: true,
          pendingUsdValue: true,
        },
      },
      rows,
      advancedRows,
      attribution: build.attribution,
      warning: {
        title: t('swap.review.pleaseNote'),
        body: t('swap.review.pleaseNoteText'),
      },
      pendingTitle: t('transaction.pendingSwap'),
      pendingSubtitle: `${inLabel} → ${outLabel}`,
    },
  };
}
