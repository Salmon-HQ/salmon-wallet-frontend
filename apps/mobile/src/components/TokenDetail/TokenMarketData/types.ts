import type { ViewStyle } from 'react-native';
import type { MarketData, TokenMarketDataPropsBase } from '@salmon/shared';

// Re-export shared types for convenience
export type { MarketData };

/**
 * Props for the TokenMarketData component (React Native)
 */
export interface TokenMarketDataProps extends TokenMarketDataPropsBase<ViewStyle> {}
