import type { CSSProperties } from 'react';
import type { PriceImpactBadgePropsBase } from '@salmon/shared';

export interface PriceImpactBadgeProps extends PriceImpactBadgePropsBase {
  style?: CSSProperties;
  className?: string;
}
