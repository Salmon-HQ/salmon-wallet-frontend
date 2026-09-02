import type { CSSProperties } from 'react';
import type { MarketData, TokenMarketDataPropsBase } from '@salmon/shared';

// Re-export shared types for convenience
export type { MarketData };

/** The DOM half of `TokenMarketDataPropsBase`: the contract plus a style. */
export interface TokenMarketDataProps extends TokenMarketDataPropsBase {
  style?: CSSProperties;
  className?: string;
}
