import type { CSSProperties } from 'react';
import type { FactsCardPropsBase } from '@salmon/shared';

/** The DOM half of `FactsCardPropsBase`: the cross-platform contract plus a style. */
export interface FactsCardProps extends FactsCardPropsBase {
  style?: CSSProperties;
  className?: string;
}
