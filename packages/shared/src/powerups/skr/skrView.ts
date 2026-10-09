/**
 * The SKR tab's figures, built once for both twins (spec 040): the stake card,
 * the daily estimate, the reward history and the program's total. Pure: the
 * hook hands it the translator, the user's currency and the date format.
 */
import type { SkrStakeResponse } from '../../api/services/staking';
import { getShortAddress } from '../../utils/address';
import { formatNumber, formatPercent } from '../../utils/formatting';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_PER_YEAR = 365;

export interface SkrViewDeps {
  t: (key: string, options?: Record<string, unknown>) => string;
  /** USD → the user's display currency. */
  formatValue: (usd: number | null | undefined) => string;
  formatDate: (ms: number) => string;
  now: number;
  locale?: string;
}

/** A figure and, when the price is known, its value in the user's currency. */
export interface SkrFigure {
  value: string;
  caption?: string;
}

export interface SkrGuardian {
  key: string;
  name: string;
  commission: string | null;
  active: boolean | null;
}

export interface SkrHistoryRow {
  key: string;
  date: string;
  value: string;
  caption?: string;
}

export interface SkrView {
  /** No SKR at all, staked or not. */
  empty: boolean;
  apy: string | null;
  staked: SkrFigure;
  earned: SkrFigure;
  available: SkrFigure;
  unstaking: { value: string; withdrawable: string } | null;
  guardians: SkrGuardian[];
  /** Staked × rate / 365: an estimate, shown as one; null without a rate. */
  perDay: SkrFigure | null;
  days: number | null;
  earnedTotal: string;
  /** Newest first; empty until the backend has two daily records. */
  history: SkrHistoryRow[];
  /** Everything staked in the program, whole SKR; null from an older backend. */
  totalStaked: number | null;
}

export function skrView(response: SkrStakeResponse, deps: SkrViewDeps): SkrView {
  const { t, formatValue, formatDate, now, locale } = deps;
  const ui = (base: bigint) => Number(base) / 10 ** response.decimals;
  const amount = (skr: number, sign = '') =>
    `${sign}${formatNumber(skr, { minimumFractionDigits: 2, maximumFractionDigits: 2 }, locale)}`;
  const worth = (skr: number) =>
    response.usdPrice === null ? undefined : formatValue(skr * response.usdPrice);
  const figure = (value: string, skr: number): SkrFigure => {
    const caption = worth(skr);
    return caption === undefined ? { value } : { value, caption: `≈ ${caption}` };
  };
  const sum = (pick: (p: SkrStakeResponse['positions'][number]) => string | undefined) =>
    response.positions.reduce((total, p) => total + BigInt(pick(p) ?? '0'), 0n);

  const liquid = BigInt(response.liquid);
  const staked = ui(sum((p) => p.staked));
  const earned = ui(sum((p) => p.earned));
  const unstaking = sum((p) => p.unstaking?.amount);
  const withdrawableAt = Math.max(
    0,
    ...response.positions.map((p) => p.unstaking?.withdrawableAt ?? 0)
  );
  const since = response.positions
    .map((p) => p.stakedSince)
    .filter((at): at is number => at !== null);

  const daily = response.apy === null ? 0 : (staked * response.apy) / DAYS_PER_YEAR;

  const guardians = new Map<string, SkrGuardian>();
  for (const { guardian } of response.positions) {
    guardians.set(guardian.pool, {
      key: guardian.pool,
      name: guardian.name ?? getShortAddress(guardian.pool) ?? guardian.pool,
      commission:
        guardian.commissionBps === null
          ? null
          : t('skr.guardian.commission', { value: `${guardian.commissionBps / 100}%` }),
      active: guardian.active,
    });
  }

  // Positions share the dates the backend recorded; one row per date.
  const byDate = new Map<number, bigint>();
  for (const position of response.positions) {
    for (const entry of position.history) {
      byDate.set(entry.at, (byDate.get(entry.at) ?? 0n) + BigInt(entry.earned));
    }
  }
  const history = [...byDate.entries()]
    .sort(([a], [b]) => b - a)
    .map(([at, base]): SkrHistoryRow => {
      const caption = worth(ui(base));
      return {
        key: `h-${at}`,
        date: formatDate(at),
        value: `${amount(ui(base), '+')} SKR`,
        ...(caption === undefined ? {} : { caption }),
      };
    });

  return {
    empty: liquid === 0n && response.positions.length === 0,
    apy: response.apy === null ? null : formatPercent(response.apy * 100, locale),
    staked: figure(amount(staked), staked),
    earned: figure(amount(earned, '+'), earned),
    available: figure(amount(ui(liquid)), ui(liquid)),
    unstaking:
      unstaking > 0n
        ? { value: amount(ui(unstaking)), withdrawable: formatDate(withdrawableAt) }
        : null,
    guardians: [...guardians.values()],
    perDay: daily > 0 ? figure(`≈ ${amount(daily, '+')}`, daily) : null,
    days: since.length > 0 ? Math.floor((now - Math.min(...since)) / DAY_MS) : null,
    earnedTotal: `${amount(earned, '+')} SKR`,
    history,
    totalStaked: response.totalStaked === undefined ? null : ui(BigInt(response.totalStaked)),
  };
}
