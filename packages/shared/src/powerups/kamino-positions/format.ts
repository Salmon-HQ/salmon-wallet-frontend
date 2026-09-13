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
