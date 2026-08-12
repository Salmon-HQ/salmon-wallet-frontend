import type { ViewStyle } from 'react-native';
import type { TokenInformationSheetPropsBase } from '@salmon/shared';
import type { MarketData } from './TokenMarketData';

// Re-export CoinInfo for consumers
export type { CoinInfo } from '@salmon/shared';

/**
 * Props for the TokenInformationSheet component (React Native)
 */
export interface TokenInformationSheetProps extends Omit<
  TokenInformationSheetPropsBase<ViewStyle>,
  'marketData'
> {
  /** Market data (market cap, volume, etc.) */
  marketData: MarketData | undefined;
}
