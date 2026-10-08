/**
 * The SKR tab's content, built once for both twins (spec 039): the facts of
 * the wallet's SKR and the rewards of each recorded period. Pure: the hook
 * hands it the translator, the user's currency and the date format.
 */
import type { SkrStakeResponse } from '../../api/services/staking';
import type { FactsCardRow } from '../../types/ui/facts-card';
import { getShortAddress } from '../../utils/address';
import { formatTokenAmountSignificant } from '../../utils/formatting';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SkrViewDeps {
  t: (key: string, options?: Record<string, unknown>) => string;
  /** USD → the user's display currency. */
  formatValue: (usd: number | null | undefined) => string;
  formatDate: (ms: number) => string;
  now: number;
}

export interface SkrView {
  /** No SKR at all, staked or not. */
  empty: boolean;
  summary: FactsCardRow[];
  /** Newest first; empty until the backend has two daily records. */
  history: FactsCardRow[];
}

export function skrView(response: SkrStakeResponse, deps: SkrViewDeps): SkrView {
  const { t, formatValue, formatDate, now } = deps;
  const ui = (base: bigint) => Number(base) / 10 ** response.decimals;
  const amount = (base: bigint, sign = '') => {
    const skr = `${sign}${formatTokenAmountSignificant(ui(base))} SKR`;
    return response.usdPrice === null
      ? skr
      : `${skr} · ${formatValue(ui(base) * response.usdPrice)}`;
  };
  const sum = (pick: (p: SkrStakeResponse['positions'][number]) => string) =>
    response.positions.reduce((total, p) => total + BigInt(pick(p)), 0n);

  const liquid = BigInt(response.liquid);
  const staked = sum((p) => p.staked);
  const unstaking = response.positions.reduce(
    (total, p) => total + BigInt(p.unstaking?.amount ?? '0'),
    0n
  );
  const withdrawableAt = Math.max(
    0,
    ...response.positions.map((p) => p.unstaking?.withdrawableAt ?? 0)
  );
  const since = response.positions
    .map((p) => p.stakedSince)
    .filter((at): at is number => at !== null);
  const [first] = response.positions;

  const summary: FactsCardRow[] = [
    {
      key: 'liquid',
      label: t('skr.facts.liquid'),
      value: `${formatTokenAmountSignificant(ui(liquid))} SKR`,
    },
  ];
  if (response.positions.length > 0 && first) {
    summary.push(
      { key: 'staked', label: t('skr.facts.staked'), value: amount(staked) },
      {
        key: 'earned',
        label: t('skr.facts.earned'),
        value: amount(
          sum((p) => p.earned),
          '+'
        ),
      }
    );
    if (response.apy !== null) {
      summary.push({
        key: 'apy',
        label: t('skr.facts.apy'),
        value: `${(response.apy * 100).toFixed(2)}%`,
      });
    }
    summary.push({
      key: 'guardian',
      label: t('skr.facts.guardian'),
      value: first.guardian.name ?? getShortAddress(first.guardian.pool) ?? first.guardian.pool,
    });
    if (first.guardian.commissionBps !== null) {
      summary.push({
        key: 'commission',
        label: t('skr.facts.commission'),
        value: `${first.guardian.commissionBps / 100}%`,
      });
    }
    if (unstaking > 0n) {
      summary.push(
        {
          key: 'unstaking',
          label: t('skr.facts.unstaking'),
          value: `${formatTokenAmountSignificant(ui(unstaking))} SKR`,
        },
        {
          key: 'withdrawable',
          label: t('skr.facts.withdrawable'),
          value: formatDate(withdrawableAt),
        }
      );
    }
    if (since.length > 0) {
      summary.push({
        key: 'since',
        label: t('skr.facts.since'),
        value: t('skr.facts.days', { count: Math.floor((now - Math.min(...since)) / DAY_MS) }),
      });
    }
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
    .map(([at, earned]) => ({ key: `h-${at}`, label: formatDate(at), value: amount(earned, '+') }));

  return { empty: liquid === 0n && response.positions.length === 0, summary, history };
}
