import type { CSSProperties } from 'react';
import type { PortfolioSubTabsPropsBase } from '@salmon/shared';

export type { PortfolioSubTab } from '@salmon/shared';

/** The DOM half of `PortfolioSubTabsPropsBase`: the cross-platform contract plus a style. */
export interface PortfolioSubTabsProps extends PortfolioSubTabsPropsBase {
  style?: CSSProperties;
  className?: string;
}
