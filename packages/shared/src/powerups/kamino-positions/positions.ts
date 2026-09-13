/**
 * What the Kamino Positions tab lists: one card per obligation, in USD, from
 * Kamino's own refreshed stats.
 *
 * ponytail: the card is the loan's totals, not its per-token legs. The API's
 * `deposits`/`borrows` maps come back empty and the raw `state` legs are in
 * reserve units without decimals; a per-token breakdown needs the market's
 * reserve metrics joined in. Add it when the totals stop being enough.
 */
import type { KaminoMarket, KaminoObligation } from './api';

export interface KaminoPosition {
  id: string;
  marketName: string;
  /** Kamino's loan-type name; absent when the API sends none. */
  kind?: string;
  depositUsd: number;
  borrowUsd: number;
  netUsd: number;
  /** Ratios, 0–1. */
  loanToValue: number;
  liquidationLtv: number;
}

export interface KaminoObligationsByMarket {
  market: KaminoMarket;
  obligations: KaminoObligation[];
}

const num = (value: string | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Largest net value first; a loan worth nothing on both sides is dropped. */
export function summarizeKaminoObligations(
  byMarket: KaminoObligationsByMarket[]
): KaminoPosition[] {
  return byMarket
    .flatMap(({ market, obligations }) =>
      obligations.map((obligation) => ({
        id: obligation.obligationAddress,
        marketName: market.name,
        kind: obligation.humanTag,
        depositUsd: num(obligation.refreshedStats?.userTotalDeposit),
        borrowUsd: num(obligation.refreshedStats?.userTotalBorrow),
        netUsd: num(obligation.refreshedStats?.netAccountValue),
        loanToValue: num(obligation.refreshedStats?.loanToValue),
        liquidationLtv: num(obligation.refreshedStats?.liquidationLtv),
      }))
    )
    .filter((position) => position.depositUsd > 0 || position.borrowUsd > 0)
    .sort((a, b) => b.netUsd - a.netUsd);
}
