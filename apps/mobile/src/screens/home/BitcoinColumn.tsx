import React from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';
import type { BalanceLoadState, PriceChartPeriod } from '@salmon/shared';

import {
  AboutCard,
  MarketDataCard,
  PriceChart,
  SkeletonRow,
  TokenListItem,
} from '../../components';

import type { HomeStyles } from './homeStyles';
import type { HomeBitcoinMarket } from './useHomeBitcoinMarket';

interface BitcoinColumnProps {
  styles: HomeStyles;
  bitcoin: HomeBitcoinMarket;
  chartPeriod: PriceChartPeriod;
  onChartPeriodChange: (period: PriceChartPeriod) => void;
  balanceState: BalanceLoadState;
  hiddenBalance: boolean;
  /** What the list shows when the load failed with nothing cached. */
  ListEmptyComponent: React.ReactElement;
  bottomOffset: number;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

/**
 * Bitcoin inside Portfolio: chart, the one non-pressable token row, market
 * data and about — the chain has no asset-detail screen of its own.
 */
export function BitcoinColumn({
  styles,
  bitcoin,
  chartPeriod,
  onChartPeriodChange,
  balanceState,
  hiddenBalance,
  ListEmptyComponent,
  bottomOffset,
  onScroll,
}: BitcoinColumnProps): React.ReactElement {
  return (
    <ScrollView
      style={styles.bitcoinScrollView}
      contentContainerStyle={[
        styles.bitcoinContent,
        styles.tabGutter,
        { paddingBottom: bottomOffset },
      ]}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {/* Price Chart */}
      {/* The one card that does not sit inside the column's gutters: it runs
          off the left screen edge and stops a gutter short of the right. */}
      <PriceChart
        data={bitcoin.chartData}
        selectedPeriod={chartPeriod}
        onPeriodChange={onChartPeriodChange}
        loading={bitcoin.dataLoading && bitcoin.chartData.length === 0}
        error={bitcoin.chartError}
        height={180}
        bleed
      />

      {/* Bitcoin Token Item (non-pressable — detail is already shown inline) */}
      {balanceState === 'loading' ? (
        <SkeletonRow padding="lg" leadingSize={44} trailingWidth={50} />
      ) : balanceState === 'error' ? (
        /* A load that failed with nothing cached owes the user the error
           state and its retry, never an endless skeleton. */
        ListEmptyComponent
      ) : (
        bitcoin.token && (
          <TokenListItem
            token={bitcoin.token}
            hiddenBalance={hiddenBalance}
            blockchain="bitcoin"
            // The column already spaces its children by 20 (`gap`); the row's
            // own list margin would make it 40 under this one card.
            style={styles.bitcoinCard}
          />
        )
      )}

      {/* Market Data */}
      <MarketDataCard
        data={bitcoin.marketData}
        symbol="BTC"
        loading={bitcoin.dataLoading && !bitcoin.coinInfo}
      />

      {/* About Section - at the end */}
      <AboutCard
        description={bitcoin.coinInfo?.description}
        loading={bitcoin.dataLoading && !bitcoin.coinInfo}
      />
    </ScrollView>
  );
}
