/**
 * The Bitcoin column of Home's Portfolio tab — the DOM twin of
 * `apps/mobile/src/screens/home/BitcoinColumn.tsx`, block for block: the
 * chart running off the left edge, Bitcoin's own row (not pressable — the
 * detail is already this column), the market data card and About last.
 * Bitcoin lives inside Portfolio because it has no asset-detail screen of
 * its own; it used to borrow the token detail page's content here, which
 * is a different surface (owner, 2026-09-17: same as mobile).
 */
import React from 'react';
import { spacing, type BalanceLoadState, type PriceChartPeriod } from '@salmon/shared';

import {
  PriceChart,
  SkeletonRow,
  TokenAbout,
  TokenListItem,
  TokenMarketData,
} from '../../components';
import type { HomeBitcoinMarketData } from './useHomeMarketData';

export interface BitcoinColumnProps {
  bitcoin: HomeBitcoinMarketData;
  chartPeriod: PriceChartPeriod;
  onChartPeriodChange: (period: PriceChartPeriod) => void;
  balanceState: BalanceLoadState;
  hiddenBalance: boolean;
  /** What the column shows in place of the row when the load failed with nothing cached. */
  listEmpty: React.ReactElement;
}

/** The chart escapes the column's left gutter and stops a gutter short of the right. */
const CHART_HEIGHT = 180;

export function BitcoinColumn({
  bitcoin,
  chartPeriod,
  onChartPeriodChange,
  balanceState,
  hiddenBalance,
  listEmpty,
}: BitcoinColumnProps): React.ReactElement {
  return (
    <div
      data-testid="bitcoin-column"
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.screenGutter }}
    >
      <PriceChart
        data={bitcoin.chartData}
        selectedPeriod={chartPeriod}
        onPeriodChange={onChartPeriodChange}
        loading={bitcoin.chartLoading && bitcoin.chartData.length === 0}
        pending={bitcoin.chartPending}
        error={!!bitcoin.error && bitcoin.chartData.length === 0}
        height={CHART_HEIGHT}
        style={{
          marginLeft: -spacing.screenGutter,
          width: `calc(100% + ${spacing.screenGutter}px)`,
        }}
      />

      {balanceState === 'loading' ? (
        <SkeletonRow padding="lg" leadingSize={44} trailingWidth={50} />
      ) : balanceState === 'error' ? (
        listEmpty
      ) : (
        bitcoin.token && (
          <TokenListItem token={bitcoin.token} hiddenBalance={hiddenBalance} blockchain="bitcoin" />
        )
      )}

      <TokenMarketData
        data={bitcoin.marketData}
        symbol="BTC"
        loading={bitcoin.infoLoading && !bitcoin.coinInfo}
      />

      <TokenAbout
        description={bitcoin.coinInfo?.description}
        loading={bitcoin.infoLoading && !bitcoin.coinInfo}
      />
    </div>
  );
}
