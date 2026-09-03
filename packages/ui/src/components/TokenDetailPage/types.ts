import type { CSSProperties } from 'react';
import type { MarketData } from '../TokenMarketData';
import type { PriceChartPeriod, PriceDataPoint, Token, CoinInfo } from '@salmon/shared';

// Re-export CoinInfo for consumers
export type { CoinInfo } from '@salmon/shared';

/**
 * Props for TokenDetailContent — the token detail screen body, shared by the
 * pushed detail page and the Bitcoin home tab. The anatomy is mobile's
 * `app/(app)/token/[id].tsx`: balance block, performance (price, chart,
 * period change), market data card, about card.
 */
export interface TokenDetailContentProps {
  /** Token to display. Undefined renders the balance-block skeleton. */
  token?: Token;
  /** Which chain's asset this is — Bitcoin has no contract address to copy. */
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
  /** Coin info has never resolved — skeletons the info cards, not the chart */
  infoLoading?: boolean;
  /**
   * Horizontal padding of the container the chart bleeds out of on the left
   * (the curve runs off the screen edge and stops a gutter short of the right).
   */
  bleed?: number;
  /** Optional inline styles */
  style?: CSSProperties;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Props for the TokenDetailPage component (extension): the pushed form of the
 * screen — mobile's `token/[id]` route — with the kit header over the body.
 */
export interface TokenDetailPageProps extends Omit<TokenDetailContentProps, 'bleed' | 'token'> {
  /** The token the page is about — the header names it. */
  token: Token;
  /** Callback to navigate back */
  onBack: () => void;
}
