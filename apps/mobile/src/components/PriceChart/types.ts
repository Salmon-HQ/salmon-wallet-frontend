import type { ViewStyle } from 'react-native';
import type { PriceChartPropsBase } from '@salmon/shared';

/**
 * Props for the PriceChart component (React Native)
 */
export interface PriceChartProps extends PriceChartPropsBase<ViewStyle> {
  /**
   * Mobile-only: bleed off the LEFT physical screen edge (escaping the
   * surface's left gutter) and stop one gutter short of the right one. Off by
   * default — only the home Bitcoin column asks for it.
   */
  bleed?: boolean;
}
