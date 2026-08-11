import type { CSSProperties } from 'react';
import type { TokenBadgesSectionPropsBase } from '@salmon/shared';
import type { MarketData } from '../TokenMarketData';
import type { PriceChartPeriod, PriceDataPoint, Token, CoinInfo } from '@salmon/shared';

// Re-export CoinInfo for consumers
export type { CoinInfo } from '@salmon/shared';

/**
 * Props for the TokenDetailPage component (Web/Extension)
 */
export interface TokenDetailPageProps {
  /** Token to display */
  token: Token;
  /** Blockchain type */
  blockchain?: 'solana' | 'bitcoin' | 'ethereum';
  /** Price chart data points */
  chartData: PriceDataPoint[];
  /** Selected chart period */
  chartPeriod: PriceChartPeriod;
  /** Callback when chart period changes */
  onChartPeriodChange: (period: PriceChartPeriod) => void;
  /** Coin info from CoinGecko */
  coinInfo: CoinInfo | null;
  /** Market data (market cap, volume, etc.) */
  marketData: MarketData | undefined;
  /** Whether data is loading */
  loading?: boolean;
  /** Whether loading the chart data failed */
  chartError?: boolean;
  /** Callback to navigate back */
  onBack: () => void;
  /** Optional inline styles */
  style?: CSSProperties;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Props for the TokenBadgesSection component (Web/Extension)
 */
export interface TokenBadgesSectionProps extends TokenBadgesSectionPropsBase<CSSProperties> {
  /** Optional CSS class name */
  className?: string;
}
