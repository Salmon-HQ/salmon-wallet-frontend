/** The card's derived strings and rows, once for both twins. */
import { formatPercent } from '../../utils/formatting';
import type { KaminoPosition } from './positions';

/** "23.28% of 92%" — the loan's ratio against the one that liquidates it. */
export function kaminoLtvParams(position: KaminoPosition, locale?: string) {
  return {
    ltv: formatPercent(position.loanToValue * 100, locale),
    liquidation: formatPercent(position.liquidationLtv * 100, locale),
  };
}

/** "SOL/BTC Market · Multiply", or the market alone when Kamino names no kind. */
export function kaminoPositionTitle(position: KaminoPosition): string {
  return position.kind ? `${position.marketName} · ${position.kind}` : position.marketName;
}

export interface KaminoPositionRow {
  key: string;
  label: string;
  value: string;
  valueTone?: 'primary' | 'success';
}

/** The four facts a loan card lists, in order, already translated and formatted. */
export function kaminoPositionRows(
  position: KaminoPosition,
  t: (key: string, params?: Record<string, unknown>) => string,
  formatUsd: (value: number) => string,
  locale?: string
): KaminoPositionRow[] {
  return [
    {
      key: 'deposited',
      label: t('kamino-positions.screen.deposited'),
      value: formatUsd(position.depositUsd),
    },
    {
      key: 'borrowed',
      label: t('kamino-positions.screen.borrowed'),
      value: formatUsd(position.borrowUsd),
    },
    {
      key: 'net',
      label: t('kamino-positions.screen.net_value'),
      value: formatUsd(position.netUsd),
      valueTone: position.netUsd > 0 ? 'success' : 'primary',
    },
    {
      key: 'ltv',
      label: t('kamino-positions.screen.ltv'),
      value: t('kamino-positions.screen.ltv_value', kaminoLtvParams(position, locale)),
    },
  ];
}

/**
 * What the tab shows right now, decided once for both twins: the wait, one
 * state block, or the position cards. Each twin renders the descriptor and
 * nothing else, so the two surfaces cannot drift into different words for
 * the same condition (`docs/POWERUPS-UI.md` §1.9).
 */
export type KaminoBody =
  | { kind: 'loading' }
  | {
      kind: 'state';
      /** Straight onto `StateBlock`; `onRetry` is the twin's, since it holds `refresh`. */
      props: {
        testID: string;
        tone: 'empty' | 'error';
        title: string;
        body: string;
        retryLabel?: string;
      };
      /** Whether the read can be tried again — an error can, an empty list cannot. */
      retryable: boolean;
    }
  | {
      kind: 'cards';
      cards: { id: string; testID: string; title: string; rows: KaminoPositionRow[] }[];
    };

export function describeKaminoBody(
  state: { positions: readonly KaminoPosition[]; loading: boolean; error: unknown },
  t: (key: string, params?: Record<string, unknown>) => string,
  formatUsd: (value: number) => string,
  locale?: string
): KaminoBody {
  if (state.loading) return { kind: 'loading' };
  if (state.error)
    return {
      kind: 'state',
      retryable: true,
      props: {
        testID: 'kamino-positions-error',
        tone: 'error',
        title: t('kamino-positions.screen.error_title'),
        body: t('kamino-positions.screen.error_body'),
        retryLabel: t('kamino-positions.screen.retry'),
      },
    };
  if (state.positions.length === 0)
    return {
      kind: 'state',
      retryable: false,
      props: {
        testID: 'kamino-positions-empty',
        tone: 'empty',
        title: t('kamino-positions.screen.empty_title'),
        body: t('kamino-positions.screen.empty_body'),
      },
    };
  return {
    kind: 'cards',
    cards: state.positions.map((position) => ({
      id: position.id,
      testID: `kamino-position-${position.id}`,
      title: kaminoPositionTitle(position),
      rows: kaminoPositionRows(position, t, formatUsd, locale),
    })),
  };
}
