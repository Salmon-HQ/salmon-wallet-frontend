import type { PriceChartPeriod, PriceDataPoint } from '../index';

/**
 * Props for the PriceChart component (base - platform-agnostic)
 */
export interface PriceChartPropsBase<TStyle> {
  /** Price history data points */
  data: PriceDataPoint[];
  /** Currently selected time period */
  selectedPeriod: PriceChartPeriod;
  /** Callback when time period is changed */
  onPeriodChange: (period: PriceChartPeriod) => void;
  /** Whether the chart is in loading state */
  loading?: boolean;
  /** Whether loading the chart data failed (shows an error message in the empty slot) */
  error?: boolean;
  /** Custom line color (defaults to green for positive, red for negative) */
  color?: string;
  /** Chart height in pixels (default: 200) */
  height?: number;
  /** Optional custom styles for the container */
  style?: TStyle;
}
