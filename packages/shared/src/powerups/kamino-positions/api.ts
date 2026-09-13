/**
 * Kamino's public API, read directly — the read-only Powerup path (spec 029
 * §2.1): the manifest declares this host, nothing is signed, nothing moves.
 * Only what the screen draws is typed; the rest of the response is ignored.
 */
export const KAMINO_API = 'https://api.kamino.finance';

/** One lending market, as `GET /v2/kamino-market` lists them. */
export interface KaminoMarket {
  name: string;
  lendingMarket: string;
  isPrimary?: boolean;
  isCurated?: boolean;
}

/** One obligation (a loan account), as the per-market users endpoint returns it. */
export interface KaminoObligation {
  obligationAddress: string;
  /** "Vanilla", "Multiply", "Leverage", … — Kamino's own name for the loan type. */
  humanTag?: string;
  /** Decimal strings in USD, refreshed by Kamino at read time. */
  refreshedStats: {
    userTotalDeposit: string;
    userTotalBorrow: string;
    netAccountValue: string;
    loanToValue: string;
    liquidationLtv: string;
  };
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${KAMINO_API}${path}`);
  if (!response.ok) throw new Error(`Kamino ${response.status} on ${path}`);
  return (await response.json()) as T;
}

export function fetchKaminoMarkets(): Promise<KaminoMarket[]> {
  return getJson<KaminoMarket[]>('/v2/kamino-market');
}

export function fetchKaminoObligations(market: string, owner: string): Promise<KaminoObligation[]> {
  return getJson<KaminoObligation[]>(`/kamino-market/${market}/users/${owner}/obligations`);
}
