import type { CSSProperties } from 'react';
import type { TokenBadgesSectionPropsBase } from '@salmon/shared';
import type { MarketData } from '../TokenMarketData';
import type { PriceChartPeriod, PriceDataPoint, Token, CoinInfo } from '@salmon/shared';

// Re-export CoinInfo for consumers
export type { CoinInfo } from '@salmon/shared';

/**
 * Props for TokenDetailContent — the token detail screen body, shared by the
 * pushed detail page and the Bitcoin home tab.
 */
export interface TokenDetailContentProps {
  /** Token to display. Undefined renders the token-row skeleton. */
  token?: Token;
  /** Blockchain type */
  blockchain?: 'solana' | 'bitcoin' | 'ethereum';
  /** Whether balances are masked */
  hiddenBalance?: boolean;
  /** Price chart data points */
  chartData: PriceDataPoint[];
  /** Selected chart period */
  chartPeriod: PriceChartPeriod;
  /** Callback when chart period changes */
  onChartPeriodChange: (period: PriceChartPeriod) => void;
  /** No price series has ever resolved — the only case that draws a skeleton */
  chartLoading?: boolean;
  /** Showing the previous period's series while the new one arrives */
  chartPending?: boolean;
  /** Whether loading the chart data failed */
  chartError?: boolean;
  /** Coin info from CoinGecko */
  coinInfo: CoinInfo | null;
  /** Market data (market cap, volume, etc.) */
  marketData: MarketData | undefined;
  /** Coin info has never resolved — skeletons the info sections, not the chart */
  infoLoading?: boolean;
  /** Horizontal padding of the container, which the chart bleeds out to */
  bleed?: number;
  /** Optional inline styles */
  style?: CSSProperties;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Props for the TokenDetailPage component (Web/Extension)
 */
export interface TokenDetailPageProps extends Omit<TokenDetailContentProps, 'bleed'> {
  /** Callback to navigate back */
  onBack: () => void;
}

/**
 * Props for the TokenBadgesSection component (Web/Extension)
 */
export interface TokenBadgesSectionProps extends TokenBadgesSectionPropsBase<CSSProperties> {
  /** Optional CSS class name */
  className?: string;
}
