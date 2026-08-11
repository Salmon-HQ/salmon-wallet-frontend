import type { Token, PriceChartPeriod, PriceDataPoint, CoinInfo } from '../index';
import type { MarketData } from './token-market-data';

/**
 * Props for the TokenInformationSheet component (base - platform-agnostic)
 */
export interface TokenInformationSheetPropsBase<TStyle> {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Callback when the sheet is closed */
  onClose: () => void;
  /** Token data to display */
  token: Token;
  /** Blockchain type for styling */
  blockchain?: 'solana' | 'bitcoin' | 'ethereum';
  /** Chart price data points */
  chartData: PriceDataPoint[];
  /** Currently selected chart period */
  chartPeriod: PriceChartPeriod;
  /** Callback when chart period changes */
  onChartPeriodChange: (period: PriceChartPeriod) => void;
  /** Coin information (description, categories, etc.) */
  coinInfo: CoinInfo | null;
  /** Market data (market cap, volume, etc.) */
  marketData: MarketData | null;
  /** Whether data is loading */
  loading?: boolean;
  /** Whether loading the chart data failed */
  chartError?: boolean;
  /** Optional custom styles for the container */
  style?: TStyle;
}

/**
 * Props for the TokenBadgesSection component (base - platform-agnostic)
 */
export interface TokenBadgesSectionPropsBase<TStyle> {
  /** Array of token tags to display as badges */
  tags?: string[];
  /** Whether the component is in loading state */
  loading?: boolean;
  /** Optional custom styles for the container */
  style?: TStyle;
}
